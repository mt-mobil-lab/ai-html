
        console.log("Uygulama beti yükleniyor..."); // Betik yüklenirken log
        // Sabitler
        const PASSWORD_123 = "123"; // Ana şifre
        const PASSWORD_1234 = "1234"; // İkinci şifre
        const APP_LOCAL_STORAGE_PREFIX = "myNotesApp_user_"; // Kullanıcıya özel anahtar öneki

        // Global değişkenler
        let currentUserIdentifier = null; // Şu anki kullanıcının tanımlayıcısı (şifreye bağlı)

        // DOM Elementleri
        const loginScreen = document.getElementById("login-screen");
        const appScreen = document.getElementById("app-screen");
        const passwordInput = document.getElementById("password-input");
        const loginBtn = document.getElementById("login-btn");
        const loginError = document.getElementById("login-error");
        const notesContainer = document.getElementById("notes-container");
        const noNotesMessage = document.getElementById("no-notes-message");
        const addNoteBtn = document.getElementById("add-note-btn");

        // Modallar
        const messageModal = document.getElementById("message-modal");
        const messageText = document.getElementById("message-text");
        const messageOkBtn = document.getElementById("message-ok-btn");

        // Yeni onay modalı elementleri
        const confirmModal = document.getElementById("confirm-modal");
        const confirmText = document.getElementById("confirm-text");
        const confirmYesBtn = document.getElementById("confirm-yes-btn");
        const confirmNoBtn = document.getElementById("confirm-no-btn");

        const noteTypeModal = document.getElementById("note-type-modal");
        const selectTextNoteBtn = document.getElementById("select-text-note");
        const selectListNoteBtn = document.getElementById("select-list-note");
        const closeNoteTypeModalBtn = document.getElementById("close-note-type-modal");

        const listTypeModal = document.getElementById("list-type-modal");
        const selectTaskListBtn = document.getElementById("select-task-list");
        const selectShoppingListBtn = document.getElementById("select-shopping-list");
        const closeListTypeModalBtn = document.getElementById("close-list-type-modal");

        const textNoteModal = document.getElementById("text-note-modal");
        const textNoteTitleInput = document.getElementById("text-note-title");
        const textNoteContentInput = document.getElementById("text-note-content");
        const saveTextNoteBtn = document.getElementById("save-text-note");
        const closeTextNoteModalBtn = document.getElementById("close-text-note-modal");

        const shoppingListModal = document.getElementById("shopping-list-modal");
        const shoppingListTitleInput = document.getElementById("shopping-list-title");
        const shoppingItemInput = document.getElementById("shopping-item-input");
        const addShoppingItemBtn = document.getElementById("add-shopping-item-btn");
        const shoppingItemsList = document.getElementById("shopping-items-list");
        const saveShoppingListBtn = document.getElementById("save-shopping-list");
        const closeShoppingListModalBtn = document.getElementById("close-shopping-list-modal");

        const taskListModal = document.getElementById("task-list-modal");
        const taskInput = document.getElementById("task-input");
        const taskTimeInput = document.getElementById("task-time-input");
        const addTaskItemToListBtn = document.getElementById("add-task-item-to-list-btn"); // Görevleri listeye ekleyen buton
        const taskItemsList = document.getElementById("task-items-list");
        const saveTaskListFinalBtn = document.getElementById("save-task-list-final-btn"); // Listeyi kaydedip modalı kapatan buton
        const closeTaskListModalFinalBtn = document.getElementById("close-task-list-modal-final-btn"); // Modal'ı kapatan buton

        // Uygulama Verisi
        let currentNotes = [];
        let editingNoteId = null; // Düzenlenen notun ID'si
        let tempNewNoteTasks = []; // Görev ekleme modalı açıkken geçici olarak yeni görevleri tutmak için

        // --- Yardımcı Fonksiyonlar ---

        /**
         * Rastgele bir ID oluşturur.
         * @returns {string} Benzersiz ID.
         */
        function generateUniqueId() {
            return '_' + Math.random().toString(36).substr(2, 9);
        }

        /**
         * Mesaj kutusu modalını gösterir.
         * @param {string} message - Gösterilecek mesaj.
         */
        function showMessage(message) {
            messageText.textContent = message;
            messageModal.classList.remove("hidden");
        }

        /**
         * Mesaj kutusu modalını gizler.
         */
        function hideMessage() {
            messageModal.classList.add("hidden");
        }

        /**
         * Onay modalını gösterir.
         * @param {string} message - Gösterilecek mesaj.
         * @returns {Promise<boolean>} Kullanıcının evet/hayır cevabı.
         */
        function showConfirm(message) {
            confirmText.textContent = message;
            confirmModal.classList.remove("hidden");

            return new Promise(resolve => {
                confirmYesBtn.onclick = () => {
                    confirmModal.classList.add("hidden");
                    resolve(true);
                };
                confirmNoBtn.onclick = () => {
                    confirmModal.classList.add("hidden");
                    resolve(false);
                };
            });
        }

        /**
         * Şu anki kullanıcıya özel Local Storage anahtarını döndürür.
         * @returns {string} Local Storage anahtarı.
         */
        function getNotesLocalStorageKey() {
            if (!currentUserIdentifier) {
                console.error("Hata: currentUserIdentifier tanımlanmamış. Not anahtarı oluşturulamıyor. Varsayılan anahtar kullanılıyor.");
                return APP_LOCAL_STORAGE_PREFIX + "default_error_state";
            }
            return APP_LOCAL_STORAGE_PREFIX + currentUserIdentifier;
        }

        /**
         * Notları Local Storage'a kaydeder.
         */
        function saveNotes() {
            try {
                const key = getNotesLocalStorageKey();
                localStorage.setItem(key, JSON.stringify(currentNotes));
                console.log(`Notlar başarıyla kaydedildi. Local Storage anahtarı: ${key}, İçerik:`, localStorage.getItem(key));
            } catch (e) {
                console.error("Notlar kaydedilirken bir hata oluştu:", e);
                showMessage("Notlar kaydedilirken bir hata oluştu. Lütfen tarayıcınızın depolama alanını kontrol edin.");
            }
            renderNotes(); // Notları kaydettikten sonra tekrar render et
        }

        /**
         * Notları Local Storage'dan yükler.
         */
        function loadNotes() {
            try {
                const key = getNotesLocalStorageKey();
                const storedNotes = localStorage.getItem(key);
                console.log(`Yerel depolamadan notlar yükleniyor. Anahtar: ${key}, Ham veri:`, storedNotes);
                if (storedNotes) {
                    currentNotes = JSON.parse(storedNotes);
                    console.log("Notlar başarıyla yüklendi. Yüklenen notlar:", currentNotes);
                } else {
                    currentNotes = [];
                    console.log(`Yerel depolamada '${key}' için not bulunamadı. Boş dizi başlatılıyor.`);
                }
            } catch (e) {
                console.error("Notlar yüklenirken bir hata oluştu:", e);
                showMessage("Notlar yüklenirken bir hata oluştu. Veriler bozuk olabilir.");
                currentNotes = []; // Reset to avoid further issues
            }
        }

        /**
         * Tüm notları ekranda render eder.
         */
        function renderNotes() {
            notesContainer.innerHTML = ""; // Mevcut notları temizle

            if (currentNotes.length === 0) {
                noNotesMessage.classList.remove("hidden");
                return;
            } else {
                noNotesMessage.classList.add("hidden");
            }

            currentNotes.forEach(note => {
                const noteCard = document.createElement("div");
                noteCard.className = "note-card p-6 flex flex-col relative group";
                noteCard.dataset.noteId = note.id;

                let contentHtml = "";
                if (note.type === "text") {
                    contentHtml = `
                        <h3 class="text-xl font-semibold text-gray-800 mb-3 break-words">${note.title || 'Başlıksız Not'}</h3>
                        <p class="text-gray-700 whitespace-pre-wrap break-words">${note.content}</p>
                    `;
                } else if (note.type === "shopping") {
                    contentHtml = `
                        <h3 class="text-xl font-semibold text-gray-800 mb-3 break-words">${note.title || 'Alışveriş Listesi'}</h3>
                        <ul class="space-y-2 text-gray-700">
                            ${note.items.map(item => `
                                <li class="flex items-center space-x-2 ${item.checked ? 'strikethrough' : ''}" data-item-text="${item.text}">
                                    <input type="checkbox" ${item.checked ? 'checked' : ''} class="form-checkbox h-5 w-5 text-indigo-600 rounded-md border-gray-300 focus:ring-indigo-500" onchange="toggleShoppingItem(event, '${note.id}')">
                                    <span>${item.text}</span>
                                </li>
                            `).join('')}
                        </ul>
                    `;
                } else if (note.type === "task") {
                    contentHtml = `
                        <h3 class="text-xl font-semibold text-gray-800 mb-3 break-words">Görev Listesi</h3>
                        <ul class="space-y-2 text-gray-700">
                            ${note.tasks.map(task => `
                                <li class="flex justify-between items-center w-full">
                                    <span class="flex-grow truncate mr-2">${task.task}</span>
                                    <span class="text-sm text-gray-500 flex-shrink-0">${task.time}</span>
                                </li>
                            `).join('')}
                        </ul>
                    `;
                }

                noteCard.innerHTML = `
                    ${contentHtml}
                    <button class="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onclick="deleteNote('${note.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button class="absolute bottom-2 right-2 p-2 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onclick="editNote('${note.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                `;
                notesContainer.appendChild(noteCard);
            });
        }

        /**
         * Belirli bir notu siler.
         * @param {string} id - Silinecek notun ID'si.
         */
        async function deleteNote(id) {
            const confirmed = await showConfirm("Bu notu silmek istediğinizden emin misiniz?");
            if (confirmed) {
                console.log(`Not siliniyor: ${id}`);
                currentNotes = currentNotes.filter(note => note.id !== id);
                saveNotes();
                console.log("Not silme işlemi tamamlandı ve kaydedildi.");
            }
        }

        /**
         * Alışveriş listesindeki öğenin durumunu değiştirir (tikli/tiksiz) ve listeyi günceller.
         * @param {Event} event - Checkbox change olayı.
         * @param {string} noteId - İlgili alışveriş notunun ID'si.
         */
        function toggleShoppingItem(event, noteId) {
            const noteIndex = currentNotes.findIndex(note => note.id === noteId);
            if (noteIndex === -1) return;

            const itemText = event.target.closest('li').dataset.itemText;
            const itemIndex = currentNotes[noteIndex].items.findIndex(item => item.text === itemText);

            if (itemIndex !== -1) {
                currentNotes[noteIndex].items[itemIndex].checked = event.target.checked;

                // Tikli öğeleri listenin sonuna taşı
                const checkedItems = currentNotes[noteIndex].items.filter(item => item.checked);
                const uncheckedItems = currentNotes[noteIndex].items.filter(item => !item.checked);
                currentNotes[noteIndex].items = uncheckedItems.concat(checkedItems);

                saveNotes(); // Değişikliği kaydet
            }
        }

        /**
         * Not düzenleme işlevi.
         * @param {string} id - Düzenlenecek notun ID'si.
         */
        function editNote(id) {
            editingNoteId = id;
            const noteToEdit = currentNotes.find(note => note.id === id);

            if (!noteToEdit) {
                showMessage("Düzenlenecek not bulunamadı.");
                return;
            }

            if (noteToEdit.type === "text") {
                textNoteTitleInput.value = noteToEdit.title || '';
                textNoteContentInput.value = noteToEdit.content;
                textNoteModal.classList.remove("hidden");
            } else if (noteToEdit.type === "shopping") {
                shoppingListTitleInput.value = noteToEdit.title || '';
                shoppingItemsList.innerHTML = ""; // Önceki öğeleri temizle
                noteToEdit.items.forEach(item => {
                    addShoppingItemToModal(item.text, item.checked);
                });
                shoppingListModal.classList.remove("hidden");
            } else if (noteToEdit.type === "task") {
                // Görev listesi düzenlenirken, mevcut görevleri moda içindeki listeye ekle
                tempNewNoteTasks = [...noteToEdit.tasks]; // Mevcut görevleri geçici diziye kopyala
                taskItemsList.innerHTML = ""; // Önceki öğeleri temizle
                tempNewNoteTasks.forEach(task => {
                    addTaskItemToModal(task.task, task.time);
                });
                taskListModal.classList.remove("hidden");
            }
        }

        // --- Event Listener'lar ---

        // Uygulama Başlangıcı
        document.addEventListener("DOMContentLoaded", initApp);
        messageOkBtn.addEventListener("click", hideMessage);

        // Login Ekranı
        loginBtn.addEventListener("click", () => {
            const enteredPassword = passwordInput.value.trim(); // Şifreyi trimle
            let userIdentifierToSet = null;

            if (enteredPassword === PASSWORD_123) {
                userIdentifierToSet = PASSWORD_123; // "123" şifresini doğrudan tanımlayıcı olarak kullan
            } else if (enteredPassword === PASSWORD_1234) {
                userIdentifierToSet = PASSWORD_1234; // "1234" şifresini doğrudan tanımlayıcı olarak kullan
            } else {
                // Diğer tüm şifreler için benzersiz, tutarlı bir tanımlayıcı oluştur
                // Şifrenin base64 kodlanmış halini kullanıyoruz.
                userIdentifierToSet = `custom_${btoa(enteredPassword)}`;
            }

            // Kullanıcıyı Local Storage'a kaydet ve uygulama ekranını göster
            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("lastLoggedInUserIdentifier", userIdentifierToSet); // Son giriş yapan kullanıcıyı kaydet
            currentUserIdentifier = userIdentifierToSet; // Global değişkeni ayarla

            loginScreen.classList.add("hidden");
            appScreen.classList.remove("hidden");
            loadNotes(); // Yeni kullanıcıya ait notları yükle
            renderNotes();
            console.log(`Giriş başarılı. Kullanıcı tanımlayıcısı: '${currentUserIdentifier}' olarak ayarlandı.`);
            loginError.classList.add("hidden"); // Hata mesajını gizle
            passwordInput.value = ""; // Şifre alanını temizle
        });

        // Enter tuşu ile giriş
        passwordInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                loginBtn.click();
            }
        });

        // Not Ekle Butonu
        addNoteBtn.addEventListener("click", () => {
            editingNoteId = null; // Yeni not eklendiğinde düzenleme modunu sıfırla
            tempNewNoteTasks = []; // Yeni görev listesi için geçici diziyi sıfırla
            noteTypeModal.classList.remove("hidden");
        });

        // Not Tipi Seçim Modalı
        selectTextNoteBtn.addEventListener("click", () => {
            noteTypeModal.classList.add("hidden");
            textNoteTitleInput.value = ''; // Başlığı temizle
            textNoteContentInput.value = ''; // İçeriği temizle
            textNoteModal.classList.remove("hidden");
        });

        selectListNoteBtn.addEventListener("click", () => {
            noteTypeModal.classList.add("hidden");
            listTypeModal.classList.remove("hidden");
        });

        closeNoteTypeModalBtn.addEventListener("click", () => {
            listTypeModal.classList.add("hidden"); // Liste tipi modalını kapat
            noteTypeModal.classList.add("hidden"); // Not tipi modalını kapat
        });


        // Liste Tipi Seçim Modalı
        selectTaskListBtn.addEventListener("click", () => {
            listTypeModal.classList.add("hidden");
            taskInput.value = ''; // Görevi temizle
            taskTimeInput.value = ''; // Saati temizle
            taskItemsList.innerHTML = ''; // Listeyi temizle
            tempNewNoteTasks = []; // Yeni görev listesi için geçici diziyi sıfırla
            taskListModal.classList.remove("hidden");
        });

        selectShoppingListBtn.addEventListener("click", () => {
            listTypeModal.classList.add("hidden");
            shoppingListTitleInput.value = ''; // Başlığı temizle
            shoppingItemInput.value = ''; // Öğeyi temizle
            shoppingItemsList.innerHTML = ''; // Listeyi temizle
            shoppingListModal.classList.remove("hidden");
        });

        closeListTypeModalBtn.addEventListener("click", () => {
            listTypeModal.classList.add("hidden");
        });

        // Metin Notu Modalı
        saveTextNoteBtn.addEventListener("click", () => {
            const title = textNoteTitleInput.value.trim();
            const content = textNoteContentInput.value.trim();

            if (!content) {
                showMessage("Metin notu içeriği boş olamaz.");
                return;
            }

            if (editingNoteId) {
                // Mevcut notu düzenle
                const noteIndex = currentNotes.findIndex(note => note.id === editingNoteId);
                if (noteIndex !== -1) {
                    currentNotes[noteIndex].title = title;
                    currentNotes[noteIndex].content = content;
                }
            } else {
                // Yeni not oluştur
                const newNote = {
                    id: generateUniqueId(),
                    type: "text",
                    title: title,
                    content: content
                };
                currentNotes.push(newNote);
            }
            saveNotes();
            textNoteModal.classList.add("hidden");
            showMessage("Metin notu başarıyla kaydedildi!");
        });

        closeTextNoteModalBtn.addEventListener("click", () => {
            textNoteModal.classList.add("hidden");
        });

        // Alışveriş Listesi Modalı
        addShoppingItemBtn.addEventListener("click", () => {
            const itemText = shoppingItemInput.value.trim();
            if (itemText) {
                addShoppingItemToModal(itemText, false);
                shoppingItemInput.value = "";
            } else {
                showMessage("Lütfen bir öğe girin.");
            }
        });

        /**
         * Alışveriş öğesini moda içindeki listeye ekler.
         * @param {string} text - Öğenin metni.
         * @param {boolean} checked - Öğenin tikli olup olmadığı.
         */
        function addShoppingItemToModal(text, checked) {
            const li = document.createElement("li");
            li.className = `flex items-center space-x-2 py-1 ${checked ? 'strikethrough' : ''}`;
            li.dataset.itemText = text; // Öğeyi güncellemek için metni sakla

            li.innerHTML = `
                <input type="checkbox" ${checked ? 'checked' : ''} class="form-checkbox h-5 w-5 text-indigo-600 rounded-md border-gray-300 focus:ring-indigo-500">
                <span>${text}</span>
                <button class="ml-auto text-red-400 hover:text-red-600" onclick="this.closest('li').remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            // Checkbox olay dinleyicisi ekle
            li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                if (e.target.checked) {
                    li.classList.add('strikethrough');
                    shoppingItemsList.appendChild(li); // Tikli öğeyi sona taşı
                } else {
                    li.classList.remove('strikethrough');
                    // Tiksiz öğeyi listenin başına veya uygun yere taşı (karmaşıklığı azaltmak için şimdilik sadece strikethrough kaldırıldı)
                }
            });
            shoppingItemsList.appendChild(li);
        }

        saveShoppingListBtn.addEventListener("click", () => {
            const title = shoppingListTitleInput.value.trim();
            const items = Array.from(shoppingItemsList.children).map(li => ({
                text: li.dataset.itemText,
                checked: li.querySelector('input[type="checkbox"]').checked
            }));

            if (editingNoteId) {
                // Mevcut notu düzenle
                const noteIndex = currentNotes.findIndex(note => note.id === editingNoteId);
                if (noteIndex !== -1) {
                    currentNotes[noteIndex].title = title;
                    currentNotes[noteIndex].items = items;
                }
            } else {
                // Yeni not oluştur
                const newNote = {
                    id: generateUniqueId(),
                    type: "shopping",
                    title: title,
                    items: items
                };
                currentNotes.push(newNote);
            }
            saveNotes();
            shoppingListModal.classList.add("hidden");
            showMessage("Alışveriş listesi başarıyla kaydedildi!");
        });

        closeShoppingListModalBtn.addEventListener("click", () => {
            shoppingListModal.classList.add("hidden");
        });

        // Görev Listesi Modalı
        addTaskItemToListBtn.addEventListener("click", () => {
            const taskText = taskInput.value.trim();
            const taskTime = taskTimeInput.value;

            if (taskText) {
                addTaskItemToModal(taskText, taskTime);
                tempNewNoteTasks.push({ task: taskText, time: taskTime }); // Geçici diziye ekle
                taskInput.value = "";
                taskTimeInput.value = "";
            } else {
                showMessage("Lütfen bir görev girin.");
            }
        });

        /**
         * Görev öğesini moda içindeki listeye ekler.
         * @param {string} task - Görev metni.
         * @param {string} time - Görev saati.
         */
        function addTaskItemToModal(task, time) {
            const li = document.createElement("li");
            li.className = "flex justify-between items-center py-1 w-full";
            li.innerHTML = `
                <span class="flex-grow truncate mr-2">${task}</span>
                <span class="text-sm text-gray-500 flex-shrink-0">${time}</span>
                <button class="ml-auto text-red-400 hover:text-red-600" onclick="this.closest('li').remove(); removeTaskFromTempList('${task}', '${time}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            taskItemsList.appendChild(li);
        }

        /**
         * Geçici listeden görevi kaldırır.
         * @param {string} taskText - Kaldırılacak görevin metni.
         * @param {string} taskTime - Kaldırılacak görevin saati.
         */
        function removeTaskFromTempList(taskText, taskTime) {
            tempNewNoteTasks = tempNewNoteTasks.filter(task => !(task.task === taskText && task.time === taskTime));
            console.log("Görev geçici listeden kaldırıldı:", tempNewNoteTasks);
        }


        saveTaskListFinalBtn.addEventListener("click", () => {
            if (tempNewNoteTasks.length === 0) {
                showMessage("Görev listesi boş olamaz. Lütfen en az bir görev ekleyin.");
                return;
            }

            if (editingNoteId) {
                // Mevcut notu düzenle
                const noteIndex = currentNotes.findIndex(note => note.id === editingNoteId);
                if (noteIndex !== -1) {
                    currentNotes[noteIndex].tasks = tempNewNoteTasks;
                }
            } else {
                // Yeni not oluştur
                const newNote = {
                    id: generateUniqueId(),
                    type: "task",
                    title: "Görev Listesi", // Varsayılan başlık
                    tasks: tempNewNoteTasks
                };
                currentNotes.push(newNote);
            }
            saveNotes();
            taskListModal.classList.add("hidden");
            showMessage("Görev listesi başarıyla kaydedildi!"); // Başarı mesajı
        });

        closeTaskListModalFinalBtn.addEventListener("click", () => {
            taskListModal.classList.add("hidden");
        });


        // --- Uygulama Başlatma ---
        function initApp() {
            console.log("initApp çalışıyor...");
            const loggedIn = localStorage.getItem("loggedIn");
            const lastLoggedInUserIdentifier = localStorage.getItem("lastLoggedInUserIdentifier"); // Son giriş yapan kullanıcıyı al

            console.log("Local Storage'daki 'loggedIn' durumu:", loggedIn);
            console.log("Local Storage'daki 'lastLoggedInUserIdentifier' durumu:", lastLoggedInUserIdentifier);

            if (loggedIn === "true" && lastLoggedInUserIdentifier) {
                currentUserIdentifier = lastLoggedInUserIdentifier; // Global değişkeni ayarla
                loginScreen.classList.add("hidden");
                appScreen.classList.remove("hidden");
                loadNotes(); // Son giriş yapan kullanıcıya ait notları yükle
                renderNotes();
                console.log(`Uygulama ekranı gösterildi ve notlar '${currentUserIdentifier}' için yüklendi.`);
            } else {
                // Eğer giriş yapılmamışsa veya son kullanıcı tanımlayıcısı yoksa, giriş ekranını göster
                currentUserIdentifier = null; // Kullanıcı tanımlayıcısını sıfırla
                loginScreen.classList.remove("hidden");
                appScreen.classList.add("hidden");
                console.log("Giriş ekranı gösterildi.");
            }
        }

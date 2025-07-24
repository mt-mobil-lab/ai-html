        // Firebase yapılandırması ve başlatılması (Firestore için)
        // Bu kısım, Firestore'a ihtiyaç duyulursa eklenecektir. Şimdilik localStorage kullanılıyor.

        // Canvas ortamı tarafından sağlanan global Firebase değişkenleri
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Firebase uygulaması ve servisleri
        let app, db, auth;
        let userId = 'anonymous'; // Varsayılan olarak anonim kullanıcı

        // Sahte hisse senedi verileri (Türk hisse senetlerini simüle ediyor)
        let allStocksData = [
            { symbol: 'THYAO', name: 'Türk Hava Yolları', price: 250.00, change: 0.00 },
            { symbol: 'ISCTR', name: 'İş Bankası C', price: 15.50, change: 0.00 },
            { symbol: 'GARAN', name: 'Garanti Bankası', price: 30.25, change: 0.00 },
            { symbol: 'TUPRS', name: 'Tüpraş', price: 160.75, change: 0.00 },
            { symbol: 'BIMAS', name: 'BİM Mağazaları', price: 320.10, change: 0.00 },
            { symbol: 'FROTO', name: 'Ford Otosan', price: 950.00, change: 0.00 },
            { symbol: 'KCHOL', name: 'Koç Holding', price: 180.50, change: 0.00 },
            { symbol: 'SAHOL', name: 'Sabancı Holding', price: 75.80, change: 0.00 },
            { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: 45.30, change: 0.00 },
            { symbol: 'SISE', name: 'Şişecam', price: 55.60, change: 0.00 },
            { symbol: 'ASELS', name: 'Aselsan', price: 70.00, change: 0.00 },
            { symbol: 'VESTL', name: 'Vestel', price: 28.90, change: 0.00 },
            { symbol: 'PGSUS', name: 'Pegasus', price: 800.00, change: 0.00 },
            { symbol: 'AKBNK', name: 'Akbank', price: 18.20, change: 0.00 },
            { symbol: 'YKBNK', name: 'Yapı Kredi Bankası', price: 12.10, change: 0.00 },
        ];

        let watchlist = []; // Takip listesindeki hisse sembollerini saklar
        let myStocks = []; // Sahip olunan hisseleri saklar: { symbol, lot, purchasePrice }

        let currentView = 'all-stocks'; // Mevcut görünüm: 'all-stocks', 'watchlist', 'my-stocks'
        let selectedStockForModal = null; // Modala aktarılacak hisse sembolü için kullanılır

        // DOM Elemanları
        const stockListContainer = document.getElementById('stock-list-container');
        const searchInput = document.getElementById('search-input');
        const allStocksBtn = document.getElementById('all-stocks-btn');
        const watchlistBtn = document.getElementById('watchlist-btn');
        const myStocksBtn = document.getElementById('my-stocks-btn');
        const addStockModal = document.getElementById('add-stock-modal');
        const closeModalButton = document.getElementById('close-modal-button');
        const modalStockSymbol = document.getElementById('modal-stock-symbol');
        const lotCountInput = document.getElementById('lot-count-input');
        const purchasePriceInput = document.getElementById('purchase-price-input');
        const confirmAddStockButton = document.getElementById('confirm-add-stock-button');
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');

        /**
         * Uygulamayı başlatır, verileri yerel depolamadan yükler
         * ve Firebase yapılandırması varsa Firebase'i kurar.
         */
        async function initializeApp() {
            console.log("Uygulama başlatılıyor...");
            try {
                loadDataFromLocalStorage(); // Verileri yerel depolamadan yükle
                // Verilerin başarıyla yüklendiğini gösteren mesajı sadece ilk yüklemede göster
                if (myStocks.length > 0 || watchlist.length > 0) {
                    showMessage("Veriler başarıyla yüklendi.", "success");
                }
            } catch (e) {
                console.error("initializeApp'da veri yükleme hatası:", e); // Daha spesifik hata günlüğü
                showMessage("Veriler yüklenirken bir hata oluştu. Yeni veri oluşturuluyor.", "error");
            }
            await setupFirebase(); // Firebase'i kur (varsa)
            setupTheme(); // Tema ayarlarını yap
            renderCurrentView(); // Başlangıç görünümünü render et
            startPriceSimulation(); // Fiyat simülasyonunu başlat
            console.log("Uygulama başlatma tamamlandı.");
        }

        /**
         * Firebase kimlik doğrulamasını ve Firestore'u kurar.
         */
        async function setupFirebase() {
            console.log("Firebase kurulumu başlatılıyor...");
            try {
                // Sadece firebaseConfig boş değilse başlat
                if (Object.keys(firebaseConfig).length > 0) {
                    // Firebase modüllerini dinamik olarak içe aktar
                    const { initializeApp: firebaseInitializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
                    const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
                    const { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, addDoc, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

                    app = firebaseInitializeApp(firebaseConfig);
                    db = getFirestore(app);
                    auth = getAuth(app);

                    // Özel token ile veya anonim olarak oturum aç
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                        console.log("Firebase: Özel token ile oturum açıldı.");
                    } else {
                        await signInAnonymously(auth);
                        console.log("Firebase: Anonim olarak oturum açıldı.");
                    }

                    // Kullanıcı kimlik doğrulama durumu değişikliklerini dinle
                    onAuthStateChanged(auth, (user) => {
                        if (user) {
                            userId = user.uid;
                            console.log("Firebase Kullanıcı Kimliği:", userId);
                            // userId'ye sahip olduğumuzda, Firestore'a yükleme/kaydetme potansiyeli var
                            // Bu uygulama için, istenildiği gibi localStorage'ı kullanmaya devam edeceğiz.
                        } else {
                            userId = crypto.randomUUID(); // Anonim veya kullanıcı yoksa yedek
                            console.log("Firebase Kullanıcı Kimliği (anonim/rastgele):", userId);
                        }
                    });
                } else {
                    console.warn("Firebase yapılandırması sağlanmadı. Veriler yalnızca localStorage'da saklanacaktır.");
                    // Firebase yapılandırılmamışsa rastgele UUID'ye geri dön
                    userId = crypto.randomUUID();
                }
            } catch (error) {
                console.error("Firebase başlatma başarısız oldu:", error);
                // Firebase başlatma başarısız olursa rastgele UUID'ye geri dön
                userId = crypto.randomUUID();
            }
            console.log("Firebase kurulumu tamamlandı.");
        }

        /**
         * Takip listesi ve hisselerim verilerini localStorage'dan yükler.
         */
        function loadDataFromLocalStorage() {
            console.log("localStorage'dan veri yükleniyor...");
            try {
                const storedWatchlist = localStorage.getItem('watchlist');
                const storedMyStocks = localStorage.getItem('myStocks');

                if (storedWatchlist) {
                    watchlist = JSON.parse(storedWatchlist);
                }
                if (storedMyStocks) {
                    myStocks = JSON.parse(storedMyStocks);
                }
                console.log("Yüklenen Takip Listesi:", watchlist);
                console.log("Yüklenen Hisselerim:", myStocks);
            } catch (e) {
                console.error("localStorage'dan veri yüklenirken hata:", e);
                watchlist = [];
                myStocks = [];
                throw e; // Hatanın initializeApp'e yayılmasını sağla
            }
            console.log("localStorage'dan veri yükleme tamamlandı.");
        }

        /**
         * Takip listesi ve hisselerim verilerini localStorage'a kaydeder.
         */
        function saveDataToLocalStorage() {
            console.log("localStorage'a veri kaydediliyor...");
            try {
                localStorage.setItem('watchlist', JSON.stringify(watchlist));
                localStorage.setItem('myStocks', JSON.stringify(myStocks));
                console.log("Kaydedilen Takip Listesi:", watchlist);
                console.log("Kaydedilen Hisselerim:", myStocks);
            } catch (e) {
                console.error("localStorage'a veri kaydedilirken hata:", e);
                showMessage("Veriler kaydedilirken bir hata oluştu.", "error");
            }
            console.log("localStorage'a veri kaydetme tamamlandı.");
        }

        /**
         * Tüm hisseler için fiyat değişikliklerini simüle eder.
         */
        function startPriceSimulation() {
            console.log("Fiyat simülasyonu başlatılıyor...");
            setInterval(() => {
                allStocksData.forEach(stock => {
                    const oldPrice = stock.price;
                    // Küçük bir rastgele değişiklik simüle et (-1% ila +1%)
                    const changePercentage = (Math.random() * 0.02 - 0.01); // -0.01 ila +0.01
                    stock.price = parseFloat((stock.price * (1 + changePercentage)).toFixed(2));
                    stock.change = parseFloat((stock.price - oldPrice).toFixed(2)); // Değişimi de doğru hesapla
                });
                // Fiyat değişikliklerini yansıtmak için mevcut görünümü yeniden render et
                renderCurrentView();
            }, 3000); // Her 3 saniyede bir güncelle
            console.log("Fiyat simülasyonu devam ediyor...");
        }

        /**
         * Tek bir hisse öğesini render eder.
         * @param {object} stock - Hisse nesnesi.
         * @param {string} type - 'all-stocks', 'watchlist' veya 'my-stocks'.
         * @param {number} [lotCount] - 'my-stocks' görünümü için lot adedi.
         * @param {number} [purchasePrice] - 'my-stocks' görünümü için alış fiyatı.
         */
        function renderStockItem(stock, type, lotCount = 0, purchasePrice = 0) {
            const stockDiv = document.createElement('div');
            // Hisse öğesine hover efekti eklendi
            stockDiv.className = 'stock-item cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700';

            // Fiyat değişimine göre renk sınıfı ve ok belirle
            const priceClass = stock.change >= 0 ? 'price-up' : 'price-down';
            const changeIndicator = stock.change >= 0 ? '▲' : '▼'; // Yukarı veya aşağı ok

            let profitLossText = '';
            // 'Hisselerim' görünümünde kar/zarar hesapla ve göster
            if (type === 'my-stocks' && lotCount > 0 && purchasePrice > 0) {
                const currentTotalValue = stock.price * lotCount;
                const purchaseTotalValue = purchasePrice * lotCount;
                const profitLoss = currentTotalValue - purchaseTotalValue;
                const profitLossClass = profitLoss >= 0 ? 'price-up' : 'price-down';
                profitLossText = `<span class="${profitLossClass} text-sm ml-2 font-medium">K/Z: ${profitLoss.toFixed(2)} TL)</span>`;
            }

            stockDiv.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-semibold text-lg">${stock.symbol}</span>
                    <span class="text-sm stock-name-text">${stock.name}</span> <!-- stock-name-text sınıfı eklendi -->
                </div>
                <div class="flex items-center">
                    <span class="text-lg font-bold ${priceClass}">${stock.price.toFixed(2)} TL</span>
                    <span class="text-sm ml-2 ${priceClass}">${changeIndicator} ${Math.abs(stock.change).toFixed(2)}</span>
                    ${profitLossText}
                    ${type === 'all-stocks' ? `<button class="ml-4 p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition duration-200 add-to-watchlist-btn" data-symbol="${stock.symbol}" title="Takip Listesine Ekle">+</button>` : ''}
                    ${type === 'watchlist' ? `<button class="ml-4 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition duration-200 remove-from-watchlist-btn" data-symbol="${stock.symbol}" title="Takip Listesinden Çıkar">-</button>` : ''}
                    ${type === 'my-stocks' ? `<button class="ml-4 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition duration-200 remove-from-my-stocks-btn" data-symbol="${stock.symbol}" title="Portföyden Çıkar">x</button>` : ''}
                </div>
            `;

            // Hisseye tıklama olayı - Sadece hisse öğesinin kendisine tıklama için
            stockDiv.addEventListener('click', (e) => {
                // Eğer tıklanan öğe bir buton değilse (yani hisse öğesinin kendisiyse)
                if (!e.target.closest('button')) {
                    if (type === 'all-stocks') {
                        showAddMyStockModal(stock.symbol);
                    } else if (type === 'watchlist') {
                        const existingMyStock = myStocks.find(s => s.symbol === stock.symbol);
                        if (existingMyStock) {
                            showAddMyStockModal(stock.symbol, existingMyStock.lot, existingMyStock.purchasePrice);
                        } else {
                            showAddMyStockModal(stock.symbol); // Takip listesindeki hisse portföyde yoksa yeni ekle
                        }
                    } else if (type === 'my-stocks') {
                        showMyStockDetails(stock.symbol, lotCount, purchasePrice);
                    }
                }
            });

            return stockDiv;
        }

        /**
         * Tüm hisseler listesini render eder.
         * @param {string} searchTerm - Hisseleri filtrelemek için isteğe bağlı arama terimi.
         */
        function renderAllStocks(searchTerm = '') {
            console.log("renderAllStocks çağrıldı, arama terimi:", searchTerm);
            stockListContainer.innerHTML = ''; // İçeriği temizle
            const filteredStocks = allStocksData.filter(stock =>
                stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                stock.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredStocks.length === 0) {
                stockListContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 mt-8">Hisse bulunamadı.</p>';
                return;
            }

            filteredStocks.forEach(stock => {
                stockListContainer.appendChild(renderStockItem(stock, 'all-stocks'));
            });

            // "Takip listesine ekle" butonları için olay dinleyicileri ekle
            document.querySelectorAll('.add-to-watchlist-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); // Hisse öğesi tıklamasını engelle
                    const symbol = e.target.dataset.symbol;
                    addToWatchlist(symbol);
                });
            });
            console.log("Tüm hisseler render edildi.");
        }

        /**
         * Kullanıcının takip listesini render eder.
         * @param {string} searchTerm - Hisseleri filtrelemek için isteğe bağlı arama terimi.
         */
        function renderWatchlist(searchTerm = '') {
            console.log("renderWatchlist çağrıldı, arama terimi:", searchTerm);
            stockListContainer.innerHTML = '';
            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            const filteredWatchlistSymbols = watchlist.filter(symbol => {
                const stock = allStocksData.find(s => s.symbol === symbol);
                if (stock) {
                    return symbol.toLowerCase().includes(lowerCaseSearchTerm) ||
                           stock.name.toLowerCase().includes(lowerCaseSearchTerm);
                }
                return false;
            });

            if (filteredWatchlistSymbols.length === 0) {
                stockListContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 mt-8">Takip listeniz boş veya aradığınız hisse bulunamadı. <br> "Tüm Hisseler" sayfasından hisse ekleyebilirsiniz.</p>';
                return;
            }

            filteredWatchlistSymbols.forEach(symbol => {
                const stock = allStocksData.find(s => s.symbol === symbol);
                if (stock) {
                    stockListContainer.appendChild(renderStockItem(stock, 'watchlist'));
                }
            });

            // "Takip listesinden çıkar" butonları için olay dinleyicileri ekle
            document.querySelectorAll('.remove-from-watchlist-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const symbol = e.target.dataset.symbol;
                    removeFromWatchlist(symbol);
                });
            });
            console.log("Takip listesi render edildi.");
        }

        /**
         * Kullanıcının sahip olduğu hisseleri render eder.
         * @param {string} searchTerm - Hisseleri filtrelemek için isteğe bağlı arama terimi.
         */
        function renderMyStocks(searchTerm = '') {
            stockListContainer.innerHTML = '';
            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            console.log("--- renderMyStocks Başlangıcı ---");
            console.log("Arama Terimi:", searchTerm);
            console.log("Mevcut myStocks (başlangıç):", JSON.parse(JSON.stringify(myStocks))); // Hata ayıklama için derin kopya

            const filteredMyStocks = myStocks.filter(myStock => {
                const correspondingStock = allStocksData.find(s => s.symbol === myStock.symbol);
                if (!correspondingStock) {
                    console.warn(`Hisse ${myStock.symbol} allStocksData içinde bulunamadı. Bu hisse filtrelenmeyecek.`);
                    return false; // allStocksData'da yoksa filtrele
                }

                const symbolMatch = myStock.symbol.toLowerCase().includes(lowerCaseSearchTerm);
                const nameMatch = correspondingStock.name.toLowerCase().includes(lowerCaseSearchTerm);
                const match = symbolMatch || nameMatch;

                console.log(`Hisse: ${myStock.symbol}, İsim: ${correspondingStock.name}`);
                console.log(`  Sembol Eşleşmesi (${myStock.symbol} vs ${lowerCaseSearchTerm}): ${symbolMatch}`);
                console.log(`  İsim Eşleşmesi (${correspondingStock.name} vs ${lowerCaseSearchTerm}): ${nameMatch}`);
                console.log(`  Genel Eşleşme: ${match}`);
                return match;
            });

            console.log("Filtrelenmiş myStocks (sonuç):", JSON.parse(JSON.stringify(filteredMyStocks)));

            if (filteredMyStocks.length === 0) {
                // Eğer myStocks boşsa ve arama yapılmıyorsa
                if (myStocks.length === 0 && searchTerm === '') {
                    stockListContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 mt-8">Hisseleriniz bulunmuyor. <br> "Tüm Hisseler" sayfasından bir hisseye tıklayıp lot ekleyerek portföyünüze ekleyebilirsiniz.</p>';
                }
                // Eğer myStocks doluysa ama arama sonucu boşsa
                else if (myStocks.length > 0 && searchTerm !== '') {
                    stockListContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 mt-8">Aradığınız hisse portföyünüzde bulunmuyor.</p>';
                }
                // Diğer boş senaryolar için yedek (örn. myStocks boş ve arama yapılıyor)
                else {
                    stockListContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 mt-8">Hisseleriniz bulunmuyor.</p>';
                }
                console.log("--- renderMyStocks Bitti (Boş Sonuç) ---");
                return;
            }

            filteredMyStocks.forEach(myStock => {
                const stock = allStocksData.find(s => s.symbol === myStock.symbol);
                if (stock) {
                    stockListContainer.appendChild(renderStockItem(stock, 'my-stocks', myStock.lot, myStock.purchasePrice));
                }
            });

            // "Portföyden çıkar" butonları için olay dinleyicileri ekle
            document.querySelectorAll('.remove-from-my-stocks-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const symbol = e.target.dataset.symbol;
                    removeFromMyStocks(symbol);
                });
            });
            console.log("--- renderMyStocks Bitti (Hisseler Render Edildi) ---");
        }

        /**
         * Bir hisseyi takip listesine ekler.
         * @param {string} symbol - Eklenecek hissenin sembolü.
         */
        function addToWatchlist(symbol) {
            if (!watchlist.includes(symbol)) {
                watchlist.push(symbol);
                saveDataToLocalStorage();
                if (currentView === 'all-stocks' || currentView === 'watchlist') {
                    renderCurrentView(); // Güncel durumu göstermek için yeniden render et
                }
                showMessage(`"${symbol}" takip listenize eklendi!`, "success");
            } else {
                showMessage(`"${symbol}" zaten takip listenizde.`);
            }
        }

        /**
         * Bir hisseyi takip listesinden çıkarır.
         * @param {string} symbol - Çıkarılacak hissenin sembolü.
         */
        function removeFromWatchlist(symbol) {
            watchlist = watchlist.filter(s => s !== symbol);
            saveDataToLocalStorage();
            if (currentView === 'watchlist') {
                renderWatchlist(searchInput.value); // Mevcut arama terimiyle takip listesini yeniden render et
            }
            showMessage(`"${symbol}" takip listenizden çıkarıldı.`);
        }

        /**
         * Bir hisseyi "Hisselerim" portföyünden çıkarır.
         * @param {string} symbol - Çıkarılacak hissenin sembolü.
         */
        function removeFromMyStocks(symbol) {
            myStocks = myStocks.filter(s => s.symbol !== symbol);
            saveDataToLocalStorage();
            if (currentView === 'my-stocks') {
                renderMyStocks(searchInput.value); // Mevcut arama terimiyle portföyü yeniden render et
            }
            showMessage(`"${symbol}" portföyünüzden çıkarıldı.`);
        }

        /**
         * "Hisselerim"e hisse eklemek/düzenlemek için modalı gösterir.
         * @param {string} symbol - Hisse sembolü.
         * @param {number} [lot] - Düzenleniyorsa mevcut lot adedi.
         * @param {number} [price] - Düzenleniyorsa mevcut alış fiyatı.
         */
        function showAddMyStockModal(symbol, lot = 1, price = 0) {
            selectedStockForModal = symbol;
            modalStockSymbol.textContent = symbol;
            lotCountInput.value = lot;
            purchasePriceInput.value = price.toFixed(2);
            addStockModal.style.display = 'flex'; // Ortalamak için flex kullan
            console.log(`Modal açıldı: ${symbol}, Lot: ${lot}, Fiyat: ${price}`);
        }

        /**
         * Hisse ekleme modalını gizler.
         */
        function hideAddStockModal() {
            addStockModal.style.display = 'none';
            selectedStockForModal = null;
            console.log("Modal kapatıldı.");
        }

        /**
         * Modal'dan "Hisselerim"e hisse ekleme/güncelleme işlemini yönetir.
         */
        function confirmAddMyStock() {
            const symbol = selectedStockForModal;
            const lot = parseInt(lotCountInput.value);
            const purchasePrice = parseFloat(purchasePriceInput.value);

            console.log(`Hisse ekleme/güncelleme onayı: Sembol: ${symbol}, Lot: ${lot}, Alış Fiyatı: ${purchasePrice}`);

            if (!symbol || isNaN(lot) || lot <= 0 || isNaN(purchasePrice) || purchasePrice < 0) {
                showMessage('Lütfen geçerli lot adedi ve alış fiyatı girin.', 'error');
                console.error("Geçersiz lot adedi veya alış fiyatı.");
                return;
            }

            const existingStockIndex = myStocks.findIndex(s => s.symbol === symbol);
            if (existingStockIndex !== -1) {
                // Mevcut hisseyi güncelle
                myStocks[existingStockIndex].lot = lot;
                myStocks[existingStockIndex].purchasePrice = purchasePrice;
                showMessage(`"${symbol}" hissesi güncellendi.`, "success"); // Başarılı güncelleme mesajı
                console.log(`Hisse güncellendi: ${symbol}`);
            } else {
                // Yeni hisse ekle
                myStocks.push({ symbol, lot, purchasePrice });
                showMessage(`"${symbol}" hissesi portföyünüze eklendi!`, "success"); // Başarılı ekleme mesajı
                console.log(`Hisse eklendi: ${symbol}`);
            }
            saveDataToLocalStorage();
            hideAddStockModal();
            renderCurrentView(); // Mevcut görünümü yeniden render et
        }

        /**
         * "Hisselerim"deki bir hissenin detaylarını gösterir (şu an sadece ekleme/düzenleme modalını açar).
         * @param {string} symbol - Hisse sembolü.
         * @param {number} lot - Lot adedi.
         * @param {number} price - Alış fiyatı.
         */
        function showMyStockDetails(symbol, lot, price) {
            console.log(`Hisse detayları gösteriliyor: ${symbol}, Lot: ${lot}, Fiyat: ${price}`);
            // Basitlik için, 'Hisselerim'deki bir hisseye tıklamak,
            // mevcut detaylarıyla önceden doldurulmuş modalı açacaktır.
            showAddMyStockModal(symbol, lot, price);
        }

        /**
         * Mevcut aktif görünümü (Tüm Hisseler, Takip Listem veya Hisselerim) render eder.
         */
        function renderCurrentView() {
            console.log(`Görünüm değiştiriliyor: ${currentView}`);
            const searchTerm = searchInput.value.trim();
            // Tüm butonların aktif durumunu sıfırla
            allStocksBtn.classList.remove('active');
            watchlistBtn.classList.remove('active');
            myStocksBtn.classList.remove('active');

            switch (currentView) {
                case 'all-stocks':
                    renderAllStocks(searchTerm);
                    allStocksBtn.classList.add('active');
                    break;
                case 'watchlist':
                    renderWatchlist(searchTerm);
                    watchlistBtn.classList.add('active');
                    break;
                case 'my-stocks':
                    renderMyStocks(searchTerm);
                    myStocksBtn.classList.add('active');
                    break;
            }
        }

        /**
         * Kullanıcıya geçici bir mesaj gösterir (alert yerine).
         * @param {string} message - Gösterilecek mesaj.
         * @param {string} type - Stil için 'success' veya 'error'.
         */
        function showMessage(message, type = 'success') {
            const messageDiv = document.createElement('div');
            messageDiv.className = `fixed top-4 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-lg text-white z-50 transition-all duration-300 ease-out transform ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
            messageDiv.textContent = message;
            document.body.appendChild(messageDiv);

            setTimeout(() => {
                messageDiv.remove();
            }, 3000); // Mesaj 3 saniye sonra kaybolur
        }

        /**
         * Tema ayarlarını yapar ve localStorage'dan tema tercihini yükler.
         */
        function setupTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
                if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    sunIcon.classList.add('hidden');
                    moonIcon.classList.remove('hidden');
                } else {
                    document.documentElement.classList.remove('dark');
                    sunIcon.classList.remove('hidden');
                    moonIcon.classList.add('hidden');
                }
            } else {
                // Varsayılan tema: açık
                document.documentElement.setAttribute('data-theme', 'light');
                document.documentElement.classList.remove('dark');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        }

        /**
         * Koyu ve açık mod arasında geçiş yapar.
         */
        function toggleDarkMode() {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                html.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                html.classList.add('dark');
                html.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
            console.log("Tema değiştirildi:", localStorage.getItem('theme'));
        }

        // Olay Dinleyicileri
        allStocksBtn.addEventListener('click', () => {
            currentView = 'all-stocks';
            searchInput.value = ''; // Görünüm değiştirirken arama çubuğunu temizle
            renderCurrentView();
        });

        watchlistBtn.addEventListener('click', () => {
            currentView = 'watchlist';
            searchInput.value = ''; // Görünüm değiştirirken arama çubuğunu temizle
            renderCurrentView();
        });

        myStocksBtn.addEventListener('click', () => {
            currentView = 'my-stocks';
            searchInput.value = ''; // Görünüm değiştirirken arama çubuğunu temizle
            renderCurrentView();
        });

        searchInput.addEventListener('input', () => {
            renderCurrentView(); // Mevcut arama terimiyle yeniden render et
        });

        closeModalButton.addEventListener('click', hideAddStockModal);
        confirmAddStockButton.addEventListener('click', confirmAddMyStock);
        darkModeToggle.addEventListener('click', toggleDarkMode); // Tema değiştirme butonu

        // Modal dışına tıklandığında modalı kapat
        window.addEventListener('click', (event) => {
            if (event.target === addStockModal) {
                hideAddStockModal();
            }
        });

        // DOM tamamen yüklendiğinde uygulamayı başlat
        window.onload = initializeApp;

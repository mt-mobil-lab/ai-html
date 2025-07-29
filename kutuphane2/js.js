      // DOM elementlerini seçme
        const bookCategoriesDiv = document.getElementById('book-categories');
        const searchInput = document.getElementById('search-input');
        const bookModal = document.getElementById('book-modal');
        const modalCloseButton = bookModal.querySelector('.modal-close');
        const pdfViewerDiv = document.getElementById('pdf-viewer'); // PDF görüntüleyici div'i
        const pdfLoadingMessage = document.getElementById('pdf-loading-message'); // Yükleme/hata mesajı

        // Kitap verileri (Bu kısmı kendi kitaplarınızla doldurabilirsiniz)
        // ÖNEMLİ NOT: PDF dosyalarının farklı bir sunucuda barındırılması durumunda,
        // o sunucunun CORS (Cross-Origin Resource Sharing) politikaları nedeniyle
        // PDF'ler yüklenemeyebilir. Bu durumda, PDF'lerinizi kendi web sunucunuzda
        // barındırmanız (veya CORS'a izin veren bir CDN kullanmanız) ve bu sunucunun
        // PDF'leri doğru MIME tipiyle (application/pdf) sunması gerekmektedir.
        // Yerel dosya yolları (file://) tarayıcı güvenlik kısıtlamaları nedeniyle çalışmayacaktır.
      
        /**
         * Kitapları kategori bazında gruplayıp ekranda gösterir.
         * @param {Array<Object>} books - Görüntülenecek kitapların listesi.
         */
        function displayBooks(books) {
            const categorizedBooks = {};
            books.forEach(book => {
                if (!categorizedBooks.hasOwnProperty(book.category)) {
                    categorizedBooks[book.category] = [];
                }
                categorizedBooks[book.category].push(book);
            });

            bookCategoriesDiv.innerHTML = '';

            for (const category in categorizedBooks) {
                const categoryDiv = document.createElement('div');
                categoryDiv.classList.add('category');

                const categoryTitle = document.createElement('h2');
                categoryTitle.classList.add('category-title');
                categoryTitle.textContent = category;
                categoryDiv.appendChild(categoryTitle);

                const bookListContainer = document.createElement('div');
                bookListContainer.classList.add('book-list-container');

                categorizedBooks[category].forEach(book => {
                    const bookItem = document.createElement('div');
                    bookItem.classList.add('book-item');
                    bookItem.addEventListener('click', () => openBookModal(book.pdf, book.title)); // Kitap başlığını da gönder

                    const bookCover = document.createElement('img');
                    bookCover.classList.add('book-cover');
                    bookCover.src = book.jpg;
                    bookCover.alt = book.title;
                    bookCover.onerror = function() {
                        this.onerror=null;
                        this.src='https://placehold.co/150x220/CCCCCC/666666?text=Kapak+Yok';
                    };
                    bookItem.appendChild(bookCover);

                    const bookTitle = document.createElement('p');
                    bookTitle.classList.add('book-title');
                    bookTitle.textContent = book.title;
                    bookItem.appendChild(bookTitle);

                    const bookAuthor = document.createElement('p');
                    bookAuthor.classList.add('book-author');
                    bookAuthor.textContent = book.author;
                    bookItem.appendChild(bookAuthor);

                    bookListContainer.appendChild(bookItem);
                });

                categoryDiv.appendChild(bookListContainer);
                bookCategoriesDiv.appendChild(categoryDiv);
            }
        }

        /**
         * Belirtilen PDF URL'si ile kitap okuma modalını açar.
         * @param {string} pdfUrl - Açılacak PDF dosyasının URL'si.
         * @param {string} bookTitle - Kitabın başlığı (FlowPaper'a gönderilecek).
         */
        function openBookModal(pdfUrl, bookTitle) {
            // Yükleme mesajını göster
            pdfLoadingMessage.textContent = 'PDF Yükleniyor...';
            pdfLoadingMessage.classList.remove('error');
            pdfLoadingMessage.style.display = 'block';

            // FlowPaper iframe URL'sini oluştur
            // Sizin verdiğiniz çalışan koddaki URL yapısını temel alıyoruz.
            // wp-hosted=1 parametresi, PDF URL'sinin sonuna eklenmeli ve sonra encode edilmeli.
            const flowpaperUrl = `https://flowpaper.com/flipbook/?pdf=${encodeURIComponent(pdfUrl + '?wp-hosted=1')}&title=${encodeURIComponent(bookTitle)}&header=&theme=&singlepage=&thumbs=1&modified=2409271052`;

            // iframe oluştur
            const iframe = document.createElement('iframe');
            iframe.title = "FlowPaper flipbook pdf viewer";
            iframe.width = "100%";
            iframe.style.height = "calc(100% - 19px)"; // CSS ile ayarlanacak
            iframe.scrolling = "no";
            iframe.className = "flowpaper-class"; // FlowPaper'ın kendi sınıfı
            iframe.frameBorder = "0";
            iframe.allowFullscreen = "true";
            iframe.setAttribute('lightbox', 'false');
            iframe.id = "flowpaper-flipbook-iframe"; // Benzersiz ID
            iframe.src = flowpaperUrl;
            iframe.seamless = "seamless";
            iframe.style.marginBottom = "0";
            iframe.style.display = "none"; // Başlangıçta gizli

            // FlowPaper logo div'ini oluştur
            const flowpaperLogoDiv = document.createElement('div');
            flowpaperLogoDiv.id = "flowpaper-logo-bottom";
            flowpaperLogoDiv.className = "flowpaper-logo-bg"; // CSS sınıfı
            flowpaperLogoDiv.style.display = "none"; // Başlangıçta gizli
            flowpaperLogoDiv.innerHTML = `
                <span style="height: 37px; padding-left: 6px;width:90%">
                    <a id="flowpaper-link" style="fill: #fff" alt="FlowPaper logotype" title="FlowPaper logotype" href="https://flowpaper.com" target="_blank">
                        <img decoding="async" alt="Publish PDF flipbooks online" style="height:17px;width:auto;margin-top:11px;" src="https://edebiyat-evi.com/wp-content/plugins/flowpaper-lite-pdf-flipbook/assets/flowpaper-logo.png" border="0">
                    </a>
                </span>
                <span style=" float: right; right: 0; font-size: 10px; white-space: nowrap; opacity:0.8">
                    <a href="https://flowpaper.com/flipbook-maker/" target="_new" style="text-decoration:none;border-bottom:none;">Created using FlowPaper Flipbook Maker &#8599;</a>
                </span>
            `;
            // İç div'i oluştur (FlowPaper'ın kendi yapısındaki gibi)
            const flowpaperInnerDiv = document.createElement('div');
            flowpaperInnerDiv.style.width = "100%";
            flowpaperInnerDiv.style.height = "100%"; // iframe ile aynı yükseklik
            flowpaperInnerDiv.style.marginBottom = "0";
            flowpaperInnerDiv.style.display = "block"; // Varsayılan olarak görünür
            flowpaperInnerDiv.appendChild(iframe);
            flowpaperInnerDiv.appendChild(flowpaperLogoDiv);


            // Önceki içeriği temizle ve yeni elementleri ekle
            pdfViewerDiv.innerHTML = '';
            pdfViewerDiv.appendChild(pdfLoadingMessage);
            pdfViewerDiv.appendChild(flowpaperInnerDiv); // İç div'i ekle

            // iframe yüklendiğinde veya hata oluştuğunda
            iframe.onload = function() {
                // Güvenlik kısıtlamaları nedeniyle iframe içeriğini doğrudan kontrol edemeyiz.
                // Sadece yükleme mesajını gizleyip iframe'i göstermek için bir zamanlayıcı kullanıyoruz.
                setTimeout(() => {
                    pdfLoadingMessage.style.display = 'none'; // Yükleme mesajını gizle
                    iframe.style.display = 'block'; // iframe'i göster
                    flowpaperLogoDiv.style.display = 'flex'; // Logo div'ini göster
                }, 2000); // 2 saniye sonra göster, FlowPaper'ın yüklenmesi için zaman tanı
            };

            // iframe yüklenemezse (örneğin ağ hatası)
            iframe.onerror = function() {
                pdfLoadingMessage.textContent = 'PDF yüklenirken bir ağ hatası oluştu. Lütfen bağlantınızı kontrol edin.';
                pdfLoadingMessage.classList.add('error');
                iframe.style.display = 'none';
                flowpaperLogoDiv.style.display = 'none';
                console.error('PDF yüklenirken ağ hatası.');
            };

            bookModal.style.display = 'block'; // Modalı görünür yap
            document.body.style.overflow = 'hidden'; // Arka plan kaydırmayı engelle
        }

        // Modal kapatma düğmesine olay dinleyici ekle
        modalCloseButton.addEventListener('click', () => {
            bookModal.style.display = 'none'; // Modalı gizle
            // Modal kapatıldığında iframe içeriğini temizle ve yükleme mesajını sıfırla
            pdfViewerDiv.innerHTML = `<p id="pdf-loading-message" class="pdf-load-message">PDF Yükleniyor...</p>`;
            document.body.style.overflow = ''; // Arka plan kaydırmayı tekrar etkinleştir
        });

        // Modal dışına tıklandığında modalı kapat
        window.addEventListener('click', (event) => {
            if (event.target == bookModal) {
                bookModal.style.display = 'none';
                pdfViewerDiv.innerHTML = `<p id="pdf-loading-message" class="pdf-load-message">PDF Yükleniyor...</p>`;
                document.body.style.overflow = '';
            }
        });

        // Arama kutusuna yazıldığında kitapları filtrele
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredBooks = booksData.filter(book =>
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                book.category.toLowerCase().includes(searchTerm)
            );
            displayBooks(filteredBooks); // Filtrelenmiş kitapları göster
        });

        // Sayfa yüklendiğinde tüm kitapları göster
        displayBooks(booksData);

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
            console.log("Fiyat simülasyonu 

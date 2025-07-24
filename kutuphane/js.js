   // Set the workerSrc for PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        // DOM Elements
        const bookCategoriesDiv = document.getElementById('bookCategories');
        const searchBar = document.getElementById('searchBar');
        const pdfViewerModal = document.getElementById('pdfViewerModal');
        const pdfCanvas = document.getElementById('pdfCanvas');
        const pdfLoadingSpinner = document.getElementById('pdfLoadingSpinner');
        const pdfCloseButton = document.getElementById('pdfCloseButton');

        let currentPdfDoc = null; // Current PDF document object
        let currentPageNum = 1;   // Current page number
        let renderingPage = false; // Flag to prevent multiple renders
        let zoomLevel = 1.0;      // Current zoom level, initialized to 1.0 (100%)
        const MAX_ZOOM = 2.0;     // Maximum zoom level
        const MIN_ZOOM = 1.0;     // Minimum zoom level

        // Variables for pinch-to-zoom and tap detection
        let initialPinchDistance = null;
        let isPinching = false;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoveX = 0;
        let touchMoveY = 0;
        let lastTapTime = 0;
        const TAP_THRESHOLD_MS = 200; // ms for a tap (to differentiate from long press/drag)
        const TAP_MOVE_THRESHOLD_PX = 10; // pixels for a tap vs drag (to differentiate from a small movement)

        // Function to add a new book (for demonstration/testing)
        // You can call this from the console or a form in a real application
        function addBook(title, category, pdfLink) {
            const newBook = {
                id: 'book' + (books.length + 1),
                title: title,
                category: category,
                pdfUrl: pdfLink,
                coverOverride: null
            };
            books.push(newBook);
            renderBooks(books); // Re-render the library
            console.log(`Kitap eklendi: ${title}`);
        }

        // Example usage: addBook('Yeni Kitap', 'Eğitim', 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');

        /**
         * Renders a specific page of a PDF document onto a given canvas.
         * The canvas is automatically resized to fit its parent container while maintaining aspect ratio,
         * and applies the current zoom level.
         * @param {Object} pdfDoc - The PDF document object.
         * @param {number} pageNum - The page number to render.
         * @param {HTMLCanvasElement} canvas - The canvas element to render on.
         * @param {number} currentZoom - The current zoom factor to apply.
         */
        async function renderPdfPage(pdfDoc, pageNum, canvas, currentZoom) {
            if (renderingPage) return; // Prevent concurrent rendering
            renderingPage = true;
            pdfLoadingSpinner.classList.remove('hidden'); // Show spinner

            try {
                const page = await pdfDoc.getPage(pageNum);
                // Get viewport at the desired zoom level
                const viewport = page.getViewport({ scale: currentZoom });
                const context = canvas.getContext('2d');

                // Adjust canvas size to fit container while maintaining aspect ratio
                const containerWidth = canvas.parentElement.clientWidth;
                const containerHeight = canvas.parentElement.clientHeight;

                const aspectRatio = viewport.width / viewport.height;
                let newWidth, newHeight;

                // Calculate dimensions to fit within container while respecting aspect ratio and zoom
                // This ensures the PDF scales appropriately within the viewer modal,
                // and the zoomLevel acts as an additional multiplier on top of this fitting.
                if (containerWidth / containerHeight > aspectRatio) {
                    newHeight = containerHeight;
                    newWidth = newHeight * aspectRatio;
                } else {
                    newWidth = containerWidth;
                    newHeight = newWidth / aspectRatio;
                }

                canvas.width = newWidth;
                canvas.height = newHeight;

                // Render PDF page into canvas context
                const renderContext = {
                    canvasContext: context,
                    // Use the calculated newWidth/newHeight for the viewport to ensure it fits and scales correctly
                    viewport: page.getViewport({ width: newWidth, height: newHeight })
                };
                await page.render(renderContext).promise;
            } catch (error) {
                console.error('PDF sayfası render edilirken hata oluştu:', error);
                // Optionally display an error message on the canvas
                const context = canvas.getContext('2d');
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = 'red';
                context.font = '16px Arial';
                context.textAlign = 'center';
                context.fillText('Hata: Sayfa yüklenemedi.', canvas.width / 2, canvas.height / 2);
            } finally {
                renderingPage = false;
                pdfLoadingSpinner.classList.add('hidden'); // Hide spinner
            }
        }

        // Function to open the PDF viewer
        async function openPdfViewer(book) {
            pdfViewerModal.style.display = 'flex';
            pdfLoadingSpinner.classList.remove('hidden'); // Show spinner for initial load

            // Reset zoom level when opening a new PDF
            zoomLevel = MIN_ZOOM;

            try {
                // Reset canvas styles before loading new PDF
                pdfCanvas.classList.remove('page-flip-effect', 'page-unflip-effect');
                pdfCanvas.style.transform = 'none';
                pdfCanvas.style.opacity = '1';

                currentPdfDoc = await pdfjsLib.getDocument(book.pdfUrl).promise;
                currentPageNum = 1;
                await renderPdfPage(currentPdfDoc, currentPageNum, pdfCanvas, zoomLevel);
            } catch (error) {
                console.error('PDF yüklenirken hata oluştu:', error);
                // Display error message in the viewer
                const context = pdfCanvas.getContext('2d');
                context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
                context.fillStyle = 'red';
                context.font = '24px Arial';
                context.textAlign = 'center';
                context.fillText('Hata: Kitap yüklenemedi.', pdfCanvas.width / 2, pdfCanvas.height / 2);
            } finally {
                pdfLoadingSpinner.classList.add('hidden'); // Hide spinner
            }
        }

        // Function to close the PDF viewer
        function closePdfViewer() {
            pdfViewerModal.style.display = 'none';
            currentPdfDoc = null;
            currentPageNum = 1;
            zoomLevel = MIN_ZOOM; // Reset zoom when closing
            // Clear canvas content
            const context = pdfCanvas.getContext('2d');
            context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
        }

        // Event listener for close button
        pdfCloseButton.addEventListener('click', closePdfViewer);

        // --- Mouse Click Event Listener for Page Navigation (for PC) ---
        pdfCanvas.addEventListener('click', async (e) => {
            // Only trigger if not pinching (for touch devices that might also send click events)
            if (isPinching || !currentPdfDoc || renderingPage) return;

            const rect = pdfCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left; // X coordinate relative to the canvas
            const canvasWidth = pdfCanvas.width;

            // Determine if click was on right half (next page) or left half (previous page)
            if (x > canvasWidth / 2) { // Click on the right half (next page)
                if (currentPageNum < currentPdfDoc.numPages) {
                    pdfCanvas.classList.remove('page-flip-effect'); // Remove other animation class
                    pdfCanvas.classList.add('page-unflip-effect'); // Apply "unflip" for next page (folds from left)

                    // Wait for the animation to complete before rendering the next page
                    setTimeout(async () => {
                        currentPageNum++;
                        await renderPdfPage(currentPdfDoc, currentPageNum, pdfCanvas, zoomLevel);
                        pdfCanvas.classList.remove('page-unflip-effect'); // Remove animation after new page renders
                        pdfCanvas.style.transform = 'none'; // Reset transform
                        pdfCanvas.style.opacity = '1'; // Reset opacity
                    }, 800); // Wait for the full animation duration (0.8s)
                }
            } else { // Click on the left half (previous page)
                if (currentPdfDoc && currentPageNum > 1) {
                    pdfCanvas.classList.remove('page-unflip-effect'); // Remove other animation class
                    pdfCanvas.classList.add('page-flip-effect'); // Apply "flip" for previous page (folds from right)

                    // Wait for the animation to complete before rendering the previous page
                    setTimeout(async () => {
                        currentPageNum--;
                        await renderPdfPage(currentPdfDoc, currentPageNum, pdfCanvas, zoomLevel);
                        pdfCanvas.classList.remove('page-flip-effect'); // Remove animation after new page renders
                        pdfCanvas.style.transform = 'none'; // Reset transform
                        pdfCanvas.style.opacity = '1'; // Reset opacity
                    }, 800); // Wait for the full animation duration (0.8s)
                }
            }
        });

        // --- Touch Event Listeners for Pinch-to-Zoom and Page Navigation ---
        pdfCanvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialPinchDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
                e.preventDefault(); // Prevent default browser zoom/scroll
            } else if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchMoveX = e.touches[0].clientX; // Initialize touchMoveX/Y for single touch
                touchMoveY = e.touches[0].clientY;
                lastTapTime = Date.now();
            }
        }, { passive: false }); // Use passive: false to allow preventDefault

        pdfCanvas.addEventListener('touchmove', async (e) => {
            if (isPinching && e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentPinchDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);

                if (initialPinchDistance) {
                    const zoomFactor = currentPinchDistance / initialPinchDistance;
                    let newZoomLevel = zoomLevel * zoomFactor;

                    // Clamp zoom level between MIN_ZOOM and MAX_ZOOM
                    newZoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoomLevel));

                    // Only re-render if zoom level has significantly changed to avoid excessive rendering
                    if (Math.abs(newZoomLevel - zoomLevel) > 0.01) {
                        zoomLevel = newZoomLevel;
                        await renderPdfPage(currentPdfDoc, currentPageNum, pdfCanvas, zoomLevel);
                    }
                    initialPinchDistance = currentPinchDistance; // Update initial for continuous zoom
                }
                e.preventDefault(); // Prevent default browser zoom/scroll
            } else if (e.touches.length === 1) {
                // Update current touch position for tap/drag detection
                touchMoveX = e.touches[0].clientX;
                touchMoveY = e.touches[0].clientY;
            }
        }, { passive: false }); // Use passive: false to allow preventDefault

        pdfCanvas.addEventListener('touchend', async (e) => {
            if (isPinching) {
                isPinching = false;
                initialPinchDistance = null;
                // If the user was pinching, we don't want to trigger a page turn.
                return;
            }

            // Check if it was a tap (minimal movement, short duration)
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            const tapDuration = Date.now() - lastTapTime;

            if (deltaX < TAP_MOVE_THRESHOLD_PX && deltaY < TAP_MOVE_THRESHOLD_PX && tapDuration < TAP_THRESHOLD_MS) {
                // It's a tap, trigger page navigation
                const rect = pdfCanvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const canvasWidth = pdfCanvas.width;

                if (x > canvasWidth / 2) { // Tap on the right half (next page)
                    if (currentPdfDoc && currentPageNum < currentPdfDoc.numPages && !renderingPage) {
                        pdfCanvas.classList.remove('page-flip-effect'); // Remove other animation class
                        pdfCanvas.classList.add('page-unflip-effect'); // Apply "unflip" for next page (folds from left)

                        // Wait for the animation to complete before rendering the next page
                        setTimeout(async () => {
                            currentPageNum++;
                            await renderPdfPage(currentPdfDoc, currentPageNum, pdfCanvas, zoomLevel);
                            pdfCanvas.classList.remove('page-unflip-effect'); // Remove animation after new page renders
                            pdfCanvas.style.transform = 'none'; // Reset transform
                            pdfCanvas.style.opacity = '1'; // Reset opacity
                        }, 800); // Wait for the full animation duration (0.8s)
                    }
                } else { // Tap on the left half (previous page)
                    if (currentPdfDoc && currentPageNum > 1 && !renderingPage) {
                        pdfCanvas.classList.remove('page-unflip-effect'); // Remove other animation class
                        pdfCanvas.classList.add('page-flip-effect'); // Apply "flip" for previous page (folds from right)

                        // Wait for the animation to complete before rendering the previous page
                        setTimeout(async () => {
                            currentPageNum--;
                            await renderPdfPage(currentPdfDoc, currentPageNum, pdfCanvas, zoomLevel);
                            pdfCanvas.classList.remove('page-flip-effect'); // Remove animation after new page renders
                            pdfCanvas.style.transform = 'none'; // Reset transform
                            pdfCanvas.style.opacity = '1'; // Reset opacity
                        }, 800); // Wait for the full animation duration (0.8s)
                    }
                }
            }
        });
        // --- End of Touch Event Listeners ---


        // Function to render all books grouped by category
        async function renderBooks(filteredBooks) {
            console.log('renderBooks called'); // For debugging duplicate category issue
            bookCategoriesDiv.innerHTML = ''; // Clear previous content

            const categories = {};
            filteredBooks.forEach(book => {
                if (!categories[book.category]) {
                    categories[book.category] = [];
                }
                categories[book.category].push(book);
            });

            for (const categoryName in categories) {
                const categorySection = document.createElement('div');
                categorySection.className = 'mb-8';
                categorySection.innerHTML = `
                    <h2 class="text-2xl font-semibold mb-4 text-gray-700">${categoryName}</h2>
                    <div class="flex overflow-x-auto space-x-6 pb-4 horizontal-scroll-container">
                        <!-- Books will be inserted here -->
                    </div>
                `;
                const booksContainer = categorySection.querySelector('.flex');

                for (const book of categories[categoryName]) {
                    const bookElement = document.createElement('div');
                    bookElement.className = 'flex-shrink-0 book-cover-container group'; // Added group for hover effects
                    bookElement.dataset.bookId = book.id; // Store book ID for reference

                    // Create a canvas for the PDF cover
                    const coverCanvas = document.createElement('canvas');
                    coverCanvas.className = 'book-cover';
                    coverCanvas.style.backgroundColor = '#f0f0f0'; // Placeholder background
                    bookElement.appendChild(coverCanvas);

                    // Add overlay for title (buttons are now hidden)
                    const overlayDiv = document.createElement('div');
                    overlayDiv.className = 'absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent text-white text-sm text-center rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300';
                    overlayDiv.textContent = book.title;
                    bookElement.appendChild(overlayDiv);

                    // Input for file upload (hidden)
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.style.display = 'none';
                    bookElement.appendChild(fileInput);

                    // Event listener for double-clicking the book cover to change it
                    bookElement.addEventListener('dblclick', (e) => {
                        e.stopPropagation(); // Prevent opening PDF viewer on double click
                        fileInput.click(); // Trigger file input
                    });

                    fileInput.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                // Update the book's coverOverride property
                                book.coverOverride = event.target.result;
                                // Display the new image directly
                                const imgElement = document.createElement('img');
                                imgElement.src = book.coverOverride;
                                imgElement.alt = book.title + ' Kapak';
                                // Remove existing canvas/img and append new img
                                if (coverCanvas.parentNode === bookElement) {
                                    bookElement.removeChild(coverCanvas);
                                }
                                const existingImg = bookElement.querySelector('.book-cover-override');
                                if (existingImg) {
                                    bookElement.removeChild(existingImg);
                                }
                                imgElement.classList.add('book-cover-override'); // Add a class for identification
                                bookElement.prepend(imgElement); // Add the image at the beginning
                            };
                            reader.readAsDataURL(file);
                        }
                    });

                    // Event listener to open PDF viewer (single click)
                    bookElement.addEventListener('click', (e) => {
                        // Prevent opening PDF viewer if it was a double click start
                        // Or if it was a file input click (though stopPropagation should handle that)
                        if (e.detail === 1) { // Check for single click
                            openPdfViewer(book);
                        }
                    });

                    booksContainer.appendChild(bookElement);

                    // Render PDF cover or use override
                    if (book.coverOverride) {
                        const imgElement = document.createElement('img');
                        imgElement.src = book.coverOverride;
                        imgElement.alt = book.title + ' Kapak';
                        imgElement.classList.add('book-cover-override');
                        bookElement.removeChild(coverCanvas); // Remove canvas if override exists
                        bookElement.prepend(imgElement);
                    } else {
                        try {
                            const pdfDoc = await pdfjsLib.getDocument(book.pdfUrl).promise;
                            // For cover, we don't apply zoom, always render at a base scale
                            await renderPdfPage(pdfDoc, 1, coverCanvas, 0.5);
                        } catch (error) {
                            console.error(`Kitap ${book.title} için kapak yüklenirken hata oluştu:`, error);
                            // Display a placeholder text on canvas if PDF fails to load
                            const context = coverCanvas.getContext('2d');
                            context.clearRect(0, 0, coverCanvas.width, coverCanvas.height);
                            context.fillStyle = '#ccc';
                            context.fillRect(0, 0, coverCanvas.width, coverCanvas.height);
                            context.fillStyle = '#666';
                            context.font = '12px Inter';
                            context.textAlign = 'center';
                            context.fillText('Kapak Yüklenemedi', coverCanvas.width / 2, coverCanvas.height / 2);
                        }
                    }
                }
                bookCategoriesDiv.appendChild(categorySection);
            }
        }

        // Initial render of books when DOM is fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            renderBooks(books);
        });

        // Search functionality
        searchBar.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredBooks = books.filter(book =>
                book.title.toLowerCase().includes(searchTerm)
            );
            renderBooks(filteredBooks);
        });

        // Handle window resize for PDF viewer canvas
        window.addEventListener('resize', () => {
            if (pdfViewerModal.style.display === 'flex' && currentPdfDoc) {
                // Re-render with current zoom level on resize
                renderPdfPage(currentPdfDoc, currentPageNum, pdfCanvas, zoomLevel);
            }
        });

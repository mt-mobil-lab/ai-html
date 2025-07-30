
        document.addEventListener('DOMContentLoaded', function() {
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');

            if (mobileMenuButton && mobileMenu) {
                mobileMenuButton.addEventListener('click', function() {
                    mobileMenu.classList.toggle('hidden');
                    mobileMenu.classList.toggle('active');
                });

                mobileMenu.querySelectorAll('a').forEach(link => {
                    link.addEventListener('click', function() {
                        if (!mobileMenu.classList.contains('hidden')) {
                            mobileMenu.classList.add('hidden');
                            mobileMenu.classList.remove('active');
                        }
                    });
                });
            }

            // Hero Slider functionality for manual scrolling and looping
            const heroImageCarousel = document.getElementById('hero-image-carousel');
            const slideItems = heroImageCarousel.querySelectorAll('.hero-slide-item');
            const dotsContainer = document.getElementById('slider-dots');
            const dots = dotsContainer.querySelectorAll('.dot');
            let currentSlideIndex = 0;
            let isScrolling = false; // Flag to prevent multiple scroll updates

            // Function to update active dot based on scroll position
            const updateDots = () => {
                const scrollLeft = heroImageCarousel.scrollLeft;
                const slideWidth = heroImageCarousel.clientWidth;

                // Calculate which slide is mostly visible, rounding to the nearest whole slide
                const newSlideIndex = Math.round(scrollLeft / slideWidth);

                if (newSlideIndex !== currentSlideIndex) {
                    // Remove active class from previous dot
                    if (dots[currentSlideIndex]) {
                        dots[currentSlideIndex].classList.remove('active');
                    }
                    // Add active class to new dot
                    if (dots[newSlideIndex]) {
                        dots[newSlideIndex].classList.add('active');
                    }
                    currentSlideIndex = newSlideIndex;
                }
            };

            // Function to handle looping at the end of the slider
            const handleLooping = () => {
                const scrollLeft = heroImageCarousel.scrollLeft;
                const slideWidth = heroImageCarousel.clientWidth;
                const maxScrollLeft = (slideItems.length - 1) * slideWidth;

                // If scrolled to the very end, jump back to the first slide
                // Use a small epsilon for floating point comparisons
                if (Math.abs(scrollLeft - maxScrollLeft) < 1) { // Check if at the last slide
                    heroImageCarousel.scrollTo({
                        left: 0,
                        behavior: 'auto' // Use 'auto' for instant jump, 'smooth' for visual transition
                    });
                    currentSlideIndex = 0; // Reset index for dots
                    updateDots(); // Update dots immediately
                }
            };

            // Event listener for scroll to update dots and handle looping
            heroImageCarousel.addEventListener('scroll', () => {
                if (!isScrolling) {
                    window.requestAnimationFrame(() => {
                        updateDots();
                        handleLooping();
                        isScrolling = false;
                    });
                    isScrolling = true;
                }
            });

            // Click listener for dots to scroll to specific slide
            dots.forEach(dot => {
                dot.addEventListener('click', function() {
                    const slideIndex = parseInt(this.dataset.slideIndex);
                    const scrollToX = slideIndex * heroImageCarousel.clientWidth;
                    heroImageCarousel.scrollTo({
                        left: scrollToX,
                        behavior: 'smooth'
                    });
                    // Manually update current slide index and dots after click
                    currentSlideIndex = slideIndex;
                    updateDots();
                });
            });

            // Initial update for the first slide on load
            updateDots();
        });

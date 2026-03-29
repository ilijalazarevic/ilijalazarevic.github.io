/**
 * Main JS — Personal Brand Website
 * No dependencies. ~180 lines.
 */
(function () {
  'use strict';

  /* ------------------------------------------
     Utility: throttle via requestAnimationFrame
     ------------------------------------------ */
  function rafThrottle(fn) {
    let ticking = false;
    return function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          fn();
          ticking = false;
        });
      }
    };
  }

  /* ------------------------------------------
     1. Sticky nav shrink + CTA reveal
     ------------------------------------------ */
  const header = document.getElementById('header');
  const hero = document.getElementById('hero');

  function updateHeader() {
    if (!hero) return;
    const heroBottom = hero.getBoundingClientRect().bottom;
    header.classList.toggle('header--shrunk', heroBottom <= 0);
  }

  window.addEventListener('scroll', rafThrottle(updateHeader), { passive: true });

  /* ------------------------------------------
     2. Smooth scrolling for anchor links
     ------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      // Close mobile nav if open
      closeMobileNav();

      const headerHeight = header.offsetHeight;
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ------------------------------------------
     3. Mobile nav toggle
     ------------------------------------------ */
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav');
  let focusableNavElements = [];
  let firstFocusable = null;
  let lastFocusable = null;

  function openMobileNav() {
    nav.classList.add('header__nav--open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');

    // Focus trapping setup
    focusableNavElements = nav.querySelectorAll('a, button');
    firstFocusable = focusableNavElements[0];
    lastFocusable = focusableNavElements[focusableNavElements.length - 1];

    if (firstFocusable) firstFocusable.focus();
  }

  function closeMobileNav() {
    nav.classList.remove('header__nav--open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
  }

  navToggle.addEventListener('click', function () {
    var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      closeMobileNav();
      navToggle.focus();
    }

    // Focus trapping within mobile nav
    if (e.key === 'Tab' && navToggle.getAttribute('aria-expanded') === 'true') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (navToggle.getAttribute('aria-expanded') === 'true' &&
        !nav.contains(e.target) &&
        !navToggle.contains(e.target)) {
      closeMobileNav();
    }
  });

  /* ------------------------------------------
     4. Recommendations carousel (fade + auto-scroll text)
     ------------------------------------------ */
  var carousel = document.querySelector('.carousel');
  var carouselTrack = document.querySelector('.carousel__track');
  var prevBtn = document.querySelector('.carousel__btn--prev');
  var nextBtn = document.querySelector('.carousel__btn--next');

  if (carouselTrack && prevBtn && nextBtn) {
    var cards = carouselTrack.querySelectorAll('.carousel__card');
    var currentIndex = 0;
    var autoAdvanceMs = (parseInt(carousel.dataset.autoAdvance) || 5) * 1000;
    var scrollPxPerSec = parseInt(carousel.dataset.textScrollSpeed) || 30;
    var pxPerFrame = scrollPxPerSec / 60;
    var advanceTimer = null;
    var scrollAnimId = null;
    var isPaused = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Initialize: first card active
    cards[0].classList.add('active');

    function getActiveQuote() {
      var activeCard = cards[currentIndex];
      return activeCard ? activeCard.querySelector('.testimonial__quote') : null;
    }

    function showCard(index) {
      cancelTextScroll();
      clearAdvanceTimer();

      // Clean up old card's quote
      var oldQuote = getActiveQuote();
      if (oldQuote) {
        oldQuote.classList.remove('no-overflow', 'scrolled-end');
        var oldInner = oldQuote.querySelector('.testimonial__quote-inner');
        if (oldInner) oldInner.style.transform = '';
      }

      cards[currentIndex].classList.remove('active');
      currentIndex = index;
      cards[currentIndex].classList.add('active');

      // Reset new card's quote and start auto-scroll
      var newQuote = getActiveQuote();
      if (newQuote) {
        var newInner = newQuote.querySelector('.testimonial__quote-inner');
        if (newInner) newInner.style.transform = '';
        newQuote.classList.remove('no-overflow', 'scrolled-end');
      }

      savedScrollOffset = 0;
      autoScrollText();
    }

    function next() {
      showCard((currentIndex + 1) % cards.length);
    }

    function prev() {
      showCard((currentIndex - 1 + cards.length) % cards.length);
    }

    function clearAdvanceTimer() {
      if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    }

    function scheduleAdvance() {
      clearAdvanceTimer();
      if (reducedMotion.matches || isPaused) return;
      advanceTimer = setTimeout(next, autoAdvanceMs);
    }

    var scrollDelayId = null;

    function cancelTextScroll() {
      if (scrollDelayId) { clearTimeout(scrollDelayId); scrollDelayId = null; }
      if (scrollAnimId) { cancelAnimationFrame(scrollAnimId); scrollAnimId = null; }
    }

    // Track current scroll offset per card so resume continues from where it paused
    var savedScrollOffset = 0;

    function pause() {
      isPaused = true;
      cancelTextScroll();
      clearAdvanceTimer();
    }

    function resume() {
      isPaused = false;
      autoScrollText(savedScrollOffset);
    }

    function autoScrollText(startOffset) {
      cancelTextScroll();
      if (reducedMotion.matches || isPaused) return;

      var quote = getActiveQuote();
      if (!quote) { scheduleAdvance(); return; }

      var inner = quote.querySelector('.testimonial__quote-inner');
      if (!inner) { scheduleAdvance(); return; }

      var maxScroll = inner.scrollHeight - quote.clientHeight;
      if (maxScroll <= 1) {
        quote.classList.add('no-overflow');
        scheduleAdvance();
        return;
      }

      var scrollOffset = startOffset || 0;
      savedScrollOffset = scrollOffset;

      // Delay before scrolling starts so user can read visible text
      if (scrollOffset === 0) {
        scrollDelayId = setTimeout(function () {
          scrollDelayId = null;
          if (isPaused) return;
          scrollAnimId = requestAnimationFrame(step);
        }, 3000);
        return;
      }

      function step() {
        if (isPaused) return;
        scrollOffset += pxPerFrame;
        savedScrollOffset = scrollOffset;

        if (scrollOffset >= maxScroll) {
          scrollOffset = maxScroll;
          savedScrollOffset = scrollOffset;
          inner.style.transform = 'translateY(-' + scrollOffset + 'px)';
          quote.classList.add('scrolled-end');
          scrollAnimId = null;
          scheduleAdvance();
          return;
        }

        inner.style.transform = 'translateY(-' + scrollOffset + 'px)';
        scrollAnimId = requestAnimationFrame(step);
      }

      scrollAnimId = requestAnimationFrame(step);
    }

    prevBtn.addEventListener('click', function () { prev(); });
    nextBtn.addEventListener('click', function () { next(); });

    // Desktop: hover to pause, leave to resume
    carouselTrack.addEventListener('mouseenter', pause);
    carouselTrack.addEventListener('mouseleave', resume);

    // Mobile: tap to pause, tap outside to resume
    carouselTrack.addEventListener('touchstart', function () {
      if (!isPaused) pause();
    }, { passive: true });

    document.addEventListener('touchstart', function (e) {
      if (isPaused && !carouselTrack.contains(e.target)) resume();
    }, { passive: true });

    // Mobile: swipe left/right to switch testimonials
    var swipeStartX = 0;
    var swipeStartY = 0;
    var swipeTracking = false;

    carouselTrack.addEventListener('touchstart', function (e) {
      var touch = e.touches[0];
      swipeStartX = touch.clientX;
      swipeStartY = touch.clientY;
      swipeTracking = true;
    }, { passive: true });

    carouselTrack.addEventListener('touchend', function (e) {
      if (!swipeTracking) return;
      swipeTracking = false;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - swipeStartX;
      var dy = touch.clientY - swipeStartY;
      // Only trigger if horizontal swipe > 50px and more horizontal than vertical
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) { next(); } else { prev(); }
      }
    }, { passive: true });

    // Kick off auto-scroll for the first card
    autoScrollText();
  }

  /* ------------------------------------------
     5. Filmstrip: JS-based scroll loop + drag
     ------------------------------------------ */
  var filmstripTrack = document.getElementById('filmstrip-track');

  if (filmstripTrack) {
    var filmstrip = filmstripTrack.closest('.filmstrip');
    var isDragging = false;
    var animationId = null;
    var paused = false;

    // Half the scroll width = width of the original (non-duplicated) items
    var halfScrollWidth = filmstripTrack.scrollWidth / 2;

    // Match the old 40s CSS animation speed: full half-width in 40s at ~60fps
    var pxPerFrame = halfScrollWidth / (40 * 60);

    // Start at a small offset so the <= 0 wrap condition doesn't fire on first frame
    filmstrip.scrollLeft = 1;

    // Recalculate dimensions on resize / orientation change
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        halfScrollWidth = filmstripTrack.scrollWidth / 2;
        pxPerFrame = halfScrollWidth / (40 * 60);
      }, 200);
    });

    function autoScroll() {
      if (!paused && !isDragging) {
        filmstrip.scrollLeft += pxPerFrame;
        // Seamless loop: wrap in both directions
        if (filmstrip.scrollLeft >= halfScrollWidth) {
          filmstrip.scrollLeft -= halfScrollWidth;
        } else if (filmstrip.scrollLeft < 1) {
          filmstrip.scrollLeft += halfScrollWidth;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    }

    function startAutoScroll() {
      if (!animationId) {
        animationId = requestAnimationFrame(autoScroll);
      }
    }

    function stopAutoScroll() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }

    // Pause on hover — only for devices that actually support hover (not touch)
    var canHover = window.matchMedia('(hover: hover)');
    if (canHover.matches) {
      filmstrip.addEventListener('mouseenter', function () {
        paused = true;
      });
      filmstrip.addEventListener('mouseleave', function () {
        if (!isDragging) {
          paused = false;
        }
      });
    }

    // Drag helpers
    var startX = 0;
    var dragScrollLeft = 0;

    function wrapScroll() {
      if (filmstrip.scrollLeft >= halfScrollWidth) {
        filmstrip.scrollLeft -= halfScrollWidth;
        dragScrollLeft = filmstrip.scrollLeft;
      } else if (filmstrip.scrollLeft < 1) {
        filmstrip.scrollLeft += halfScrollWidth;
        dragScrollLeft = filmstrip.scrollLeft;
      }
    }

    function endDrag() {
      isDragging = false;
      paused = false;
    }

    // Desktop: mouse-based drag
    filmstrip.addEventListener('mousedown', function (e) {
      isDragging = true;
      paused = true;
      startX = e.pageX - filmstrip.offsetLeft;
      dragScrollLeft = filmstrip.scrollLeft;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var x = e.pageX - filmstrip.offsetLeft;
      var walk = (x - startX) * 1.5;
      filmstrip.scrollLeft = dragScrollLeft - walk;
      wrapScroll();
    });

    document.addEventListener('mouseup', function () {
      if (isDragging) endDrag();
    });

    // Mobile: touch-based drag
    var touchStartX = 0;
    var touchStartY = 0;
    var touchLocked = false; // locked to horizontal drag

    filmstrip.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchLocked = false;
      isDragging = false;
      dragScrollLeft = filmstrip.scrollLeft;
      paused = true;
    }, { passive: true });

    filmstrip.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      var dx = t.clientX - touchStartX;
      var dy = t.clientY - touchStartY;

      // Determine direction on first significant move
      if (!touchLocked && !isDragging) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal — we take over
            touchLocked = true;
            isDragging = true;
            startX = t.clientX;
            dragScrollLeft = filmstrip.scrollLeft;
          } else {
            // Vertical — let browser scroll the page
            return;
          }
        } else {
          return;
        }
      }

      if (!touchLocked) return;

      e.preventDefault();
      var x = t.clientX;
      var walk = (x - startX) * 1.5;
      filmstrip.scrollLeft = dragScrollLeft - walk;
      wrapScroll();
    }, { passive: false });

    filmstrip.addEventListener('touchend', function () {
      endDrag();
    }, { passive: true });

    filmstrip.addEventListener('touchcancel', function () {
      endDrag();
    }, { passive: true });

    // Respect prefers-reduced-motion
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function handleReducedMotion(mq) {
      if (mq.matches) {
        paused = true;
      } else {
        paused = false;
      }
    }
    handleReducedMotion(motionQuery);
    motionQuery.addEventListener('change', handleReducedMotion);

    // Start the scroll loop
    startAutoScroll();
  }

  /* ------------------------------------------
     6. Video filter pills + pagination
     ------------------------------------------ */
  var PAGE_SIZE = 6;
  var filterPills = document.querySelectorAll('.filter-pill');
  var videoCards = document.querySelectorAll('.video-card');
  var moreBtn = document.getElementById('videos-more');
  var visibleCount = 0;

  function getMatchingCards(filter) {
    var matching = [];
    videoCards.forEach(function (card) {
      if (filter === 'all' || card.getAttribute('data-category') === filter) {
        matching.push(card);
      }
    });
    return matching;
  }

  function getActiveFilter() {
    var active = document.querySelector('.filter-pill--active');
    return active ? active.getAttribute('data-filter') : 'all';
  }

  function updateMoreButton(totalMatching) {
    if (!moreBtn) return;
    if (visibleCount >= totalMatching) {
      moreBtn.parentElement.setAttribute('hidden', '');
    } else {
      moreBtn.parentElement.removeAttribute('hidden');
    }
  }

  function applyFilter(filter) {
    visibleCount = 0;
    var matching = getMatchingCards(filter);

    videoCards.forEach(function (card) {
      var matches = filter === 'all' || card.getAttribute('data-category') === filter;
      if (!matches) {
        card.setAttribute('hidden', '');
        card.classList.remove('video-card--overflow');
      } else {
        card.removeAttribute('hidden');
        if (visibleCount < PAGE_SIZE) {
          card.classList.remove('video-card--overflow');
          visibleCount++;
        } else {
          card.classList.add('video-card--overflow');
        }
      }
    });

    updateMoreButton(matching.length);
  }

  function showMore() {
    var filter = getActiveFilter();
    var matching = getMatchingCards(filter);
    var revealed = 0;

    for (var i = 0; i < matching.length; i++) {
      if (matching[i].classList.contains('video-card--overflow')) {
        if (revealed < PAGE_SIZE) {
          matching[i].classList.remove('video-card--overflow');
          revealed++;
          visibleCount++;
        }
      }
    }

    updateMoreButton(matching.length);
  }

  filterPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var filter = this.getAttribute('data-filter');

      // Update active pill
      filterPills.forEach(function (p) {
        p.classList.remove('filter-pill--active');
        p.setAttribute('aria-pressed', 'false');
      });
      this.classList.add('filter-pill--active');
      this.setAttribute('aria-pressed', 'true');

      applyFilter(filter);
    });
  });

  if (moreBtn) {
    moreBtn.addEventListener('click', showMore);
  }

  // Initial load: apply default filter
  applyFilter('all');

  /* ------------------------------------------
     7. Lightbox
     ------------------------------------------ */
  var lightbox = document.getElementById('lightbox');
  var lightboxPlayer = lightbox ? lightbox.querySelector('.lightbox__player') : null;
  var lightboxTitle = lightbox ? lightbox.querySelector('.lightbox__title') : null;
  var lightboxClose = lightbox ? lightbox.querySelector('.lightbox__close') : null;
  var lightboxBackdrop = lightbox ? lightbox.querySelector('.lightbox__backdrop') : null;
  var lightboxOpener = null;

  function openLightbox(youtubeId, title, startTime) {
    if (!lightbox) return;
    var url = 'https://www.youtube-nocookie.com/embed/' + youtubeId + '?autoplay=1';
    if (startTime) url += '&start=' + startTime;
    lightboxPlayer.innerHTML = '<iframe src="' + url + '" allow="autoplay; encrypted-media" allowfullscreen title="' + title + '"></iframe>';
    lightboxTitle.textContent = title;
    lightbox.removeAttribute('hidden');
    // Force reflow for transition
    lightbox.offsetHeight;
    lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.setAttribute('hidden', '');
    lightboxPlayer.innerHTML = '';
    lightboxTitle.textContent = '';
    if (lightboxOpener) {
      lightboxOpener.focus();
      lightboxOpener = null;
    }
  }

  // Open on card click
  videoCards.forEach(function (card) {
    card.addEventListener('click', function () {
      lightboxOpener = this;
      var youtubeId = this.getAttribute('data-youtube-id');
      var title = this.getAttribute('data-title');
      var startTime = this.getAttribute('data-youtube-start');
      openLightbox(youtubeId, title, startTime);
    });
  });

  // Close handlers
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener('click', closeLightbox);
  }

  // Close on Escape + focus trap
  document.addEventListener('keydown', function (e) {
    if (!lightbox || lightbox.hasAttribute('hidden')) return;

    if (e.key === 'Escape') {
      closeLightbox();
      return;
    }

    // Focus trap within lightbox
    if (e.key === 'Tab') {
      var focusable = lightbox.querySelectorAll('button, iframe, [tabindex]');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
})();

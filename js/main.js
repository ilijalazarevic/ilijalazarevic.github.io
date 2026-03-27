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
        oldQuote.scrollTop = 0;
      }

      cards[currentIndex].classList.remove('active');
      currentIndex = index;
      cards[currentIndex].classList.add('active');

      // Reset new card's quote and start auto-scroll
      var newQuote = getActiveQuote();
      if (newQuote) {
        newQuote.scrollTop = 0;
        newQuote.classList.remove('no-overflow', 'scrolled-end');
      }

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

    function cancelTextScroll() {
      if (scrollAnimId) { cancelAnimationFrame(scrollAnimId); scrollAnimId = null; }
    }

    function pause() {
      isPaused = true;
      cancelTextScroll();
      clearAdvanceTimer();
    }

    function resume() {
      isPaused = false;
      autoScrollText();
    }

    function autoScrollText() {
      cancelTextScroll();
      if (reducedMotion.matches || isPaused) return;

      var quote = getActiveQuote();
      if (!quote) { scheduleAdvance(); return; }

      var hasOverflow = quote.scrollHeight > quote.clientHeight + 1;
      if (!hasOverflow) {
        quote.classList.add('no-overflow');
        scheduleAdvance();
        return;
      }

      function step() {
        if (isPaused) return;
        quote.scrollTop += pxPerFrame;

        if (quote.scrollTop + quote.clientHeight >= quote.scrollHeight - 1) {
          quote.classList.add('scrolled-end');
          scrollAnimId = null;
          scheduleAdvance();
          return;
        }

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

    function autoScroll() {
      if (!paused && !isDragging) {
        filmstrip.scrollLeft += pxPerFrame;
        // Seamless loop: wrap in both directions
        if (filmstrip.scrollLeft >= halfScrollWidth) {
          filmstrip.scrollLeft -= halfScrollWidth;
        } else if (filmstrip.scrollLeft <= 0) {
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

    // Pause on hover
    filmstrip.addEventListener('mouseenter', function () {
      paused = true;
    });

    filmstrip.addEventListener('mouseleave', function () {
      if (!isDragging) {
        paused = false;
      }
    });

    filmstrip.addEventListener('touchstart', function () {
      paused = true;
    }, { passive: true });

    filmstrip.addEventListener('touchend', function () {
      paused = false;
    });

    // Drag to scroll
    var startX = 0;
    var dragScrollLeft = 0;

    filmstrip.addEventListener('pointerdown', function (e) {
      isDragging = true;
      paused = true;
      startX = e.pageX - filmstrip.offsetLeft;
      dragScrollLeft = filmstrip.scrollLeft;
      filmstrip.setPointerCapture(e.pointerId);
    });

    filmstrip.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      e.preventDefault();
      var x = e.pageX - filmstrip.offsetLeft;
      var walk = (x - startX) * 1.5;
      filmstrip.scrollLeft = dragScrollLeft - walk;
      // Wrap around when dragging past boundaries
      if (filmstrip.scrollLeft >= halfScrollWidth) {
        filmstrip.scrollLeft -= halfScrollWidth;
        dragScrollLeft = filmstrip.scrollLeft;
        startX = x;
      } else if (filmstrip.scrollLeft <= 0) {
        filmstrip.scrollLeft += halfScrollWidth;
        dragScrollLeft = filmstrip.scrollLeft;
        startX = x;
      }
    });

    filmstrip.addEventListener('pointerup', function () {
      isDragging = false;
      paused = false;
    });

    filmstrip.addEventListener('pointercancel', function () {
      isDragging = false;
      paused = false;
    });

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

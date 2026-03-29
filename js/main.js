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
     ------------------------------------------
     Each testimonial card fades in one at a time. If the quote text
     is taller than the visible area, it auto-scrolls upward so the
     user can read the full text. After scrolling finishes (or if the
     text fits), the carousel waits a few seconds then advances to
     the next card.

     Flow per card:
       showCard → 3 s read delay → text scrolls up → scheduleAdvance
       → wait autoAdvanceMs → next card
     ------------------------------------------ */
  var carousel = document.querySelector('.carousel');
  var carouselTrack = document.querySelector('.carousel__track');
  var prevBtn = document.querySelector('.carousel__btn--prev');
  var nextBtn = document.querySelector('.carousel__btn--next');

  if (carouselTrack && prevBtn && nextBtn) {
    var cards = carouselTrack.querySelectorAll('.carousel__card');
    var currentIndex = 0;

    /* --- Timing config (data-attributes on .carousel, with defaults) --- */
    var autoAdvanceMs = (parseInt(carousel.dataset.autoAdvance) || 5) * 1000;  // delay after text finishes scrolling before moving to next card
    var scrollPxPerSec = parseInt(carousel.dataset.textScrollSpeed) || 30;     // how fast the quote text scrolls up
    var pxPerFrame = scrollPxPerSec / 60;  // converted to per-frame increment at ~60 fps

    /* --- State --- */
    var advanceTimer = null;   // setTimeout id for advancing to next card
    var scrollAnimId = null;   // requestAnimationFrame id for text scrolling
    var scrollDelayId = null;  // setTimeout id for the initial 3 s read delay
    var isPaused = false;      // true when user is interacting (hover / touch)
    var savedScrollOffset = 0; // how far the current quote has scrolled (px), so resume can continue from here
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Mark the first card as visible on load
    cards[0].classList.add('active');

    /* --- Helpers --- */

    // Returns the .testimonial__quote element inside the currently active card
    function getActiveQuote() {
      var activeCard = cards[currentIndex];
      return activeCard ? activeCard.querySelector('.testimonial__quote') : null;
    }

    // Transition to a specific card by index
    function showCard(index) {
      // Stop any in-progress scroll animation and pending advance timer
      cancelTextScroll();
      clearAdvanceTimer();

      // Reset the old card's quote position and CSS state
      var oldQuote = getActiveQuote();
      if (oldQuote) {
        oldQuote.classList.remove('no-overflow', 'scrolled-end');
        var oldInner = oldQuote.querySelector('.testimonial__quote-inner');
        if (oldInner) oldInner.style.transform = '';
      }

      // Swap active class: hide old card, show new one (CSS opacity transition)
      cards[currentIndex].classList.remove('active');
      currentIndex = index;
      cards[currentIndex].classList.add('active');

      // Reset the new card's quote so it starts from the top
      var newQuote = getActiveQuote();
      if (newQuote) {
        var newInner = newQuote.querySelector('.testimonial__quote-inner');
        if (newInner) newInner.style.transform = '';
        newQuote.classList.remove('no-overflow', 'scrolled-end');
      }

      // Begin the auto-scroll sequence for this card (3 s delay → scroll → advance)
      savedScrollOffset = 0;
      autoScrollText();
    }

    // Convenience wrappers for cycling through cards
    function next() {
      showCard((currentIndex + 1) % cards.length);
    }

    function prev() {
      showCard((currentIndex - 1 + cards.length) % cards.length);
    }

    // Cancel the pending "advance to next card" timer
    function clearAdvanceTimer() {
      if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    }

    // Schedule advancing to the next card after autoAdvanceMs
    function scheduleAdvance() {
      clearAdvanceTimer();
      if (reducedMotion.matches || isPaused) return;
      advanceTimer = setTimeout(next, autoAdvanceMs);
    }

    // Cancel both the initial read delay and the rAF scroll animation
    function cancelTextScroll() {
      if (scrollDelayId) { clearTimeout(scrollDelayId); scrollDelayId = null; }
      if (scrollAnimId) { cancelAnimationFrame(scrollAnimId); scrollAnimId = null; }
    }

    // Pause all carousel automation (text scroll + card advance)
    function pause() {
      isPaused = true;
      cancelTextScroll();
      clearAdvanceTimer();
    }

    // Resume from wherever we left off
    function resume() {
      isPaused = false;
      autoScrollText(savedScrollOffset);
    }

    /*
     * Core auto-scroll logic for the active quote text.
     *
     * 1. If text fits within the visible area → mark as no-overflow, schedule advance.
     * 2. If starting from offset 0 → wait 3 s (read delay) then begin scrolling.
     * 3. Otherwise → animate translateY upward at pxPerFrame per animation frame.
     * 4. When fully scrolled → mark as scrolled-end, schedule advance.
     *
     * startOffset: px offset to resume from (0 on first call, >0 when resuming after pause)
     */
    function autoScrollText(startOffset) {
      cancelTextScroll();
      if (reducedMotion.matches || isPaused) return;

      var quote = getActiveQuote();
      if (!quote) { scheduleAdvance(); return; }

      var inner = quote.querySelector('.testimonial__quote-inner');
      if (!inner) { scheduleAdvance(); return; }

      // How many px of text are hidden below the visible area
      var maxScroll = inner.scrollHeight - quote.clientHeight;
      if (maxScroll <= 1) {
        // All text is visible — no scrolling needed, just wait then advance
        quote.classList.add('no-overflow');
        scheduleAdvance();
        return;
      }

      var scrollOffset = startOffset || 0;
      savedScrollOffset = scrollOffset;

      // 3-second reading delay before scrolling begins (only on fresh start, not resume)
      if (scrollOffset === 0) {
        scrollDelayId = setTimeout(function () {
          scrollDelayId = null;
          if (isPaused) return;
          scrollAnimId = requestAnimationFrame(step);
        }, 3000);
        return;
      }

      // Animation frame callback: move text up by pxPerFrame each frame
      function step() {
        if (isPaused) return;
        scrollOffset += pxPerFrame;
        savedScrollOffset = scrollOffset;

        if (scrollOffset >= maxScroll) {
          // Reached the bottom — clamp, show end state, schedule next card
          scrollOffset = maxScroll;
          savedScrollOffset = scrollOffset;
          inner.style.transform = 'translateY(-' + scrollOffset + 'px)';
          quote.classList.add('scrolled-end');
          scrollAnimId = null;
          scheduleAdvance();
          return;
        }

        // Move text up by the accumulated offset
        inner.style.transform = 'translateY(-' + scrollOffset + 'px)';
        scrollAnimId = requestAnimationFrame(step);
      }

      scrollAnimId = requestAnimationFrame(step);
    }

    /* --- Navigation buttons --- */
    prevBtn.addEventListener('click', function () { prev(); });
    nextBtn.addEventListener('click', function () { next(); });

    /* --- Pause / resume on interaction ---
     *
     * Desktop: pause on hover, resume on leave.
     * Mobile:  pause on tap, resume on tap outside OR after swipe navigation.
     *
     * IMPORTANT: mouseenter/mouseleave are gated behind (hover: hover) media query
     * because iOS Safari fires synthetic mouseenter on touch, but may never fire
     * mouseleave — which would permanently pause the carousel.
     */
    var carouselCanHover = window.matchMedia('(hover: hover)');
    if (carouselCanHover.matches) {
      carouselTrack.addEventListener('mouseenter', pause);
      carouselTrack.addEventListener('mouseleave', resume);
    }

    // Mobile: tap carousel to pause, tap outside to resume
    carouselTrack.addEventListener('touchstart', function () {
      if (!isPaused) pause();
    }, { passive: true });

    document.addEventListener('touchstart', function (e) {
      if (isPaused && !carouselTrack.contains(e.target)) resume();
    }, { passive: true });

    /* --- Mobile: swipe left/right to switch testimonials --- */
    var swipeStartX = 0;
    var swipeStartY = 0;
    var swipeTracking = false;

    // Record finger position at start of touch
    carouselTrack.addEventListener('touchstart', function (e) {
      var touch = e.touches[0];
      swipeStartX = touch.clientX;
      swipeStartY = touch.clientY;
      swipeTracking = true;
    }, { passive: true });

    // On release, check if finger moved >50 px horizontally (and more horizontal than vertical)
    carouselTrack.addEventListener('touchend', function (e) {
      if (!swipeTracking) return;
      swipeTracking = false;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - swipeStartX;
      var dy = touch.clientY - swipeStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        // Swipe left → next card, swipe right → previous card
        if (dx < 0) { next(); } else { prev(); }
      }
    }, { passive: true });

    // Start the carousel on page load
    autoScrollText();
  }

  /* ------------------------------------------
     5. Filmstrip: JS-based scroll loop + drag
     ------------------------------------------
     The gallery is a horizontally-scrolling filmstrip of photos.
     The HTML contains the items twice (duplicated) so we can create a
     seamless infinite loop: when the position reaches the halfway point
     (= total width of the original set), we jump back to the start —
     the user never sees a seam because both halves are identical.

     We use CSS transform (translateX) on the track element instead of
     scrollLeft on the container. This is critical for iOS Safari, which
     does not reliably repaint programmatic scrollLeft changes made inside
     requestAnimationFrame — only user-gesture-driven scrollLeft updates
     are visually rendered. CSS transforms are GPU-composited and always
     repaint correctly on all platforms.

     A single `scrollPos` variable (float) tracks the current offset in px.
     Both auto-scroll and drag read/write this variable, then apply it via
     translateX. This avoids sub-pixel rounding issues with scrollLeft.

     Auto-scroll runs continuously via requestAnimationFrame.
     Users can also drag (desktop: mouse, mobile: touch) to scrub manually.
     ------------------------------------------ */
  var filmstripTrack = document.getElementById('filmstrip-track');

  if (filmstripTrack) {
    var filmstrip = filmstripTrack.closest('.filmstrip');
    var isDragging = false;   // true while user is actively dragging
    var animationId = null;   // rAF id for the auto-scroll loop
    var paused = false;       // true when auto-scroll should be paused (hover, touch, reduced-motion)

    // The track contains items twice for the seamless loop.
    // halfWidth = width of one copy = the wrap-around point.
    var halfWidth = filmstripTrack.scrollWidth / 2;

    // Scroll speed: traverse the full half-width in 40 seconds at ~60 fps
    var pxPerFrame = halfWidth / (40 * 60);

    // Current position in px — this is the single source of truth.
    // Both auto-scroll and drag update this, then applyTransform() renders it.
    var scrollPos = 0;

    // Apply the current scrollPos to the track via CSS transform
    function applyTransform() {
      filmstripTrack.style.transform = 'translateX(' + (-scrollPos) + 'px)';
    }

    // Keep scrollPos within [0, halfWidth) for seamless looping
    function wrapPos() {
      if (scrollPos >= halfWidth) scrollPos -= halfWidth;
      else if (scrollPos < 0) scrollPos += halfWidth;
    }

    // Recalculate dimensions when the viewport changes (resize / orientation)
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        halfWidth = filmstripTrack.scrollWidth / 2;
        pxPerFrame = halfWidth / (40 * 60);
        wrapPos();          // clamp in case new halfWidth is smaller
        applyTransform();
      }, 200);
    });

    /*
     * Auto-scroll loop — runs every animation frame.
     * When not paused/dragging, advances scrollPos by pxPerFrame each frame,
     * wraps around at halfWidth, and renders via translateX.
     */
    function autoScroll() {
      if (!paused && !isDragging) {
        scrollPos += pxPerFrame;
        wrapPos();
        applyTransform();
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

    /* --- Pause on hover (desktop only) ---
     * Gated behind (hover: hover) media query so iOS Safari's synthetic
     * mouseenter events (fired on touch) don't permanently pause the strip.
     */
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

    /* --- Drag state --- */
    var startX = 0;        // cursor/finger X when drag began
    var dragStartPos = 0;  // scrollPos when drag began

    // End any drag and resume auto-scroll
    function endDrag() {
      isDragging = false;
      paused = false;
    }

    /* --- Desktop: mouse-based drag ---
     * mousedown on filmstrip starts the drag; mousemove/mouseup are on
     * document so dragging continues even if the cursor leaves the filmstrip.
     *
     * Ghost-click guard: iOS Safari fires synthetic mouse events after touch
     * (touchstart → touchend → mousedown → mouseup). Without the timestamp
     * check, the synthetic mousedown would re-set isDragging/paused=true
     * right after touchend cleared them, permanently freezing auto-scroll.
     */
    var lastTouchTime = 0;  // timestamp of the most recent touchstart

    filmstrip.addEventListener('mousedown', function (e) {
      // Ignore synthetic mouse events fired by iOS Safari after a touch
      if (Date.now() - lastTouchTime < 800) return;

      isDragging = true;
      paused = true;
      startX = e.pageX;
      dragStartPos = scrollPos;
      e.preventDefault();  // prevent text selection while dragging
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      // Calculate how far the mouse moved and scroll proportionally
      // (1.5× multiplier makes the drag feel more responsive)
      var walk = (e.pageX - startX) * 1.5;
      scrollPos = dragStartPos - walk;
      wrapPos();
      applyTransform();
    });

    document.addEventListener('mouseup', function () {
      if (isDragging) endDrag();
    });

    /* --- Mobile: touch-based drag ---
     * Uses dedicated touch events instead of pointer events because
     * setPointerCapture is unreliable on iOS Safari (causes "sticky" drag).
     *
     * Direction detection: on first significant move (>8 px), we check
     * whether the gesture is horizontal or vertical. Horizontal → we take
     * over and drag the filmstrip. Vertical → we bail out so the browser
     * can scroll the page normally.
     */
    var touchStartX = 0;
    var touchStartY = 0;
    var touchLocked = false;  // once true, this gesture is a horizontal filmstrip drag

    filmstrip.addEventListener('touchstart', function (e) {
      lastTouchTime = Date.now();  // record for ghost-click guard
      var t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchLocked = false;
      isDragging = false;
      dragStartPos = scrollPos;
      paused = true;  // pause auto-scroll while finger is down
    }, { passive: true });

    filmstrip.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      var dx = t.clientX - touchStartX;
      var dy = t.clientY - touchStartY;

      // First significant move — decide direction
      if (!touchLocked && !isDragging) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal gesture — lock to filmstrip drag
            touchLocked = true;
            isDragging = true;
            startX = t.clientX;
            dragStartPos = scrollPos;
          } else {
            // Vertical gesture — let browser handle page scroll
            return;
          }
        } else {
          // Movement too small to classify — wait for more data
          return;
        }
      }

      if (!touchLocked) return;

      // Prevent vertical scroll while we're dragging horizontally
      e.preventDefault();
      var walk = (t.clientX - startX) * 1.5;
      scrollPos = dragStartPos - walk;
      wrapPos();
      applyTransform();
    }, { passive: false });  // passive: false required so preventDefault() works

    filmstrip.addEventListener('touchend', function () {
      endDrag();
    }, { passive: true });

    filmstrip.addEventListener('touchcancel', function () {
      endDrag();
    }, { passive: true });

    /* --- Respect prefers-reduced-motion --- */
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function handleReducedMotion(mq) {
      paused = mq.matches;
    }
    handleReducedMotion(motionQuery);
    motionQuery.addEventListener('change', handleReducedMotion);

    // Render initial position and start the auto-scroll loop
    applyTransform();
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

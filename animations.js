/* ============================================================
   El Mercado del Barrio — Animations
   Pure vanilla JS, no dependencies, mobile-friendly.
   ============================================================ */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Hero entrance (fires immediately on load) ── */
  function runHeroEntrance() {
    if (prefersReducedMotion) return;
    var els = document.querySelectorAll('.hero-enter');
    // small rAF to ensure styles are applied before transitioning
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.forEach(function (el) {
          el.classList.add('visible');
        });
      });
    });
  }

  /* ── Scroll-triggered fade-up via IntersectionObserver ── */
  function initScrollAnimations() {
    if (prefersReducedMotion) {
      // just make everything visible without animation
      document.querySelectorAll('.fade-up').forEach(function (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      // fallback: show everything
      document.querySelectorAll('.fade-up').forEach(function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // only animate once
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    document.querySelectorAll('.fade-up').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ── Stagger fade-up: wrap grid children automatically ── */
  function initStaggerGrids() {
    if (prefersReducedMotion) return;

    document.querySelectorAll('.stagger-children').forEach(function (grid) {
      Array.from(grid.children).forEach(function (child, i) {
        child.classList.add('fade-up');
        // extra inline delay on top of CSS stagger, for deeper grids
        if (i >= 6) {
          child.style.transitionDelay = (i * 80) + 'ms';
        }
      });
    });
  }

  /* ── Smooth nav highlight on scroll ── */
  function initNavHighlight() {
    var nav = document.querySelector('nav');
    if (!nav) return;

    var prevScrollY = window.scrollY;

    window.addEventListener('scroll', function () {
      var currentScrollY = window.scrollY;

      // add stronger bg when scrolled
      if (currentScrollY > 60) {
        nav.style.backgroundColor = 'rgba(24, 8, 8, 0.98)';
        nav.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
      } else {
        nav.style.backgroundColor = '';
        nav.style.boxShadow = '';
      }

      prevScrollY = currentScrollY;
    }, { passive: true });
  }

  /* ── Gold shimmer on section headings on hover ── */
  function initHeadingShimmer() {
    document.querySelectorAll('section h2').forEach(function (h) {
      h.style.transition = 'text-shadow 0.4s ease';
      h.addEventListener('mouseenter', function () {
        h.style.textShadow = '0 0 32px rgba(212,168,67,0.4)';
      });
      h.addEventListener('mouseleave', function () {
        h.style.textShadow = '';
      });
    });
  }

  /* ── Init all ── */
  function init() {
    runHeroEntrance();
    initStaggerGrids();
    initScrollAnimations();
    initNavHighlight();
    if (!prefersReducedMotion) initHeadingShimmer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

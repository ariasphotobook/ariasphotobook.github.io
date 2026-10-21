/**
 * Aria's Photobook — front-end behaviour
 * Mobile nav · subtle reveals · archive filters · photo lightbox
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initReveal();
    initArchiveFilters();
    initHomeSectionsScroll();
    initStoriesRoster();
    initPhotoLightbox();
  });

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    var label = toggle.querySelector('.nav-toggle-label');

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (label) label.textContent = open ? 'Close' : 'Menu';
    }

    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });
  }

  function initReveal() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(
      '.home-letter__media, .photo-card, .year-block'
    ));
    if (!nodes.length) return;

    function showAll() {
      nodes.forEach(function (el) { el.classList.add('is-visible'); });
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showAll();
      return;
    }

    nodes.forEach(function (el) { el.classList.add('fade-in'); });

    if (!('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        // Wait one frame so opacity:0 is painted before revealing
        requestAnimationFrame(function () {
          el.classList.add('is-visible');
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    // Paint fade-in (hidden) state before observing, or already-visible
    // nodes can jump straight to is-visible with no transition.
    requestAnimationFrame(function () {
      nodes.forEach(function (el) { io.observe(el); });
    });
  }

  function initHomeSectionsScroll() {
    var hero = document.querySelector('[data-home-hero]');
    var letter = document.querySelector('[data-home-letter]');
    if (!hero || !letter) return;

    var section = 'hero';
    var sectionLock = false;
    var leaveArmedAt = 0;
    var touchStartY = 0;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scrollBehavior = reduced ? 'auto' : 'smooth';

    function armLeave(delay) {
      leaveArmedAt = Date.now() + (delay || 450);
    }

    function canLeave() {
      return Date.now() >= leaveArmedAt;
    }

    function docTop(el) {
      return Math.round(window.scrollY + el.getBoundingClientRect().top);
    }

    function letterStart() {
      return docTop(letter);
    }

    function atLetterStart() {
      return window.scrollY <= letterStart() + 2;
    }

    function detectSection() {
      var mid = window.innerHeight * 0.5;
      var heroRect = hero.getBoundingClientRect();
      var letterRect = letter.getBoundingClientRect();

      if (Math.abs(heroRect.top) <= window.innerHeight * 0.35) return 'hero';
      if (letterRect.top <= mid && letterRect.bottom > mid) return 'letter';
      if (letterRect.bottom <= mid) return 'footer';
      if (heroRect.bottom > mid) return 'hero';
      return section;
    }

    function goTo(target) {
      if (sectionLock) return;
      sectionLock = true;
      section = target;

      var top = target === 'hero' ? 0 : letterStart();
      window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });

      window.setTimeout(function () {
        sectionLock = false;
        section = target;
        armLeave(400);
      }, reduced ? 50 : 800);
    }

    function onWheel(event) {
      if (sectionLock) {
        event.preventDefault();
        return;
      }

      section = detectSection();
      var dy = event.deltaY;
      if (dy === 0) return;

      // Hero stays snapped; only leave downward into the letter.
      if (section === 'hero') {
        event.preventDefault();
        if (dy > 0) goTo('letter');
        else if (window.scrollY > 2) goTo('hero');
        return;
      }

      // After the letter: free page scroll. Snap back only when leaving
      // upward from the very top of the letter section.
      if (dy < 0 && atLetterStart()) {
        event.preventDefault();
        if (canLeave()) goTo('hero');
      }
    }

    function onTouchStart(event) {
      if (!event.touches || !event.touches.length) return;
      touchStartY = event.touches[0].clientY;
    }

    function onTouchMove(event) {
      if (sectionLock || !event.touches || !event.touches.length) return;

      section = detectSection();
      var dy = touchStartY - event.touches[0].clientY;

      if (section === 'hero') {
        if (dy > 8) {
          event.preventDefault();
          goTo('letter');
        } else if (dy < -8 && window.scrollY > 2) {
          event.preventDefault();
          goTo('hero');
        }
        return;
      }

      if (dy < -8 && atLetterStart() && canLeave()) {
        event.preventDefault();
        goTo('hero');
      }
    }

    var scrollLink = document.querySelector('[data-home-scroll]');
    if (scrollLink) {
      scrollLink.addEventListener('click', function (event) {
        event.preventDefault();
        goTo('letter');
      });
    }

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    window.addEventListener('scroll', function () {
      if (!sectionLock) section = detectSection();
    }, { passive: true });

    section = detectSection();
  }

  function initStoriesRoster() {
    var page = document.querySelector('.stories-page');
    var hero = document.querySelector('[data-stories-hero]');
    var shelf = document.querySelector('[data-stories-shelf]');
    var root = document.querySelector('[data-stories-roster]');
    if (!page || !hero || !shelf) return;

    var rail = root ? root.querySelector('[data-story-rail]') : null;
    var pads = root
      ? Array.prototype.slice.call(root.querySelectorAll('[data-story-pad]'))
      : [];
    var items = root
      ? Array.prototype.slice.call(root.querySelectorAll('[data-story-item]'))
      : [];
    var shots = root
      ? Array.prototype.slice.call(root.querySelectorAll('[data-story-shot]'))
      : [];
    var activeIndex = -1;
    var ticking = false;
    var sectionLock = false;
    var section = 'hero';
    var leaveArmedAt = 0;
    var touchStartY = 0;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mobileQuery = window.matchMedia('(max-width: 720px)');
    var scrollBehavior = reduced ? 'auto' : 'smooth';
    var pageSize = 5;
    var currentPage = 0;
    var pagination = root ? root.querySelector('[data-stories-pagination]') : null;
    var pagePrev = pagination ? pagination.querySelector('[data-stories-page-prev]') : null;
    var pageNext = pagination ? pagination.querySelector('[data-stories-page-next]') : null;
    var pageCurrent = pagination ? pagination.querySelector('[data-stories-page-current]') : null;
    var pageTotal = pagination ? pagination.querySelector('[data-stories-page-total]') : null;

    function isMobile() {
      return mobileQuery.matches;
    }

    function totalPages() {
      return Math.max(1, Math.ceil(items.length / pageSize));
    }

    function syncMobilePage() {
      if (!items.length) {
        if (pagination) pagination.hidden = true;
        return;
      }

      if (!isMobile()) {
        items.forEach(function (item) {
          item.classList.remove('is-page-hidden');
        });
        if (pagination) pagination.hidden = true;
        return;
      }

      var pages = totalPages();
      if (currentPage > pages - 1) currentPage = pages - 1;
      if (currentPage < 0) currentPage = 0;

      items.forEach(function (item, index) {
        var page = Math.floor(index / pageSize);
        item.classList.toggle('is-page-hidden', page !== currentPage);
        item.classList.remove('is-page-last');
      });

      var visible = items.filter(function (item) {
        return !item.classList.contains('is-page-hidden');
      });
      if (visible.length) {
        visible[visible.length - 1].classList.add('is-page-last');
      }

      if (pagination) {
        pagination.hidden = pages <= 1;
        if (pageCurrent) pageCurrent.textContent = String(currentPage + 1);
        if (pageTotal) pageTotal.textContent = String(pages);
        if (pagePrev) pagePrev.disabled = currentPage <= 0;
        if (pageNext) pageNext.disabled = currentPage >= pages - 1;
      }
    }

    function goToPage(page, scrollShelf) {
      var pages = totalPages();
      var next = Math.max(0, Math.min(pages - 1, page));
      if (next === currentPage && !scrollShelf) {
        syncMobilePage();
        return;
      }
      currentPage = next;
      syncMobilePage();
      if (scrollShelf && shelf) {
        var top = Math.round(window.scrollY + shelf.getBoundingClientRect().top);
        window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
      }
    }

    function cssLengthToPx(value, fallback) {
      var raw = String(value || '').trim();
      var num = parseFloat(raw);
      if (!isFinite(num)) return fallback;
      if (raw.indexOf('rem') !== -1) {
        var rootSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
        return num * rootSize;
      }
      return num;
    }

    function clearItemMetrics() {
      items.forEach(function (item) {
        item.style.removeProperty('height');
        item.style.removeProperty('min-height');
        item.style.removeProperty('--roster-scale');
        item.style.removeProperty('--roster-opacity');
        item.classList.remove('is-outside');
      });
      pads.forEach(function (pad) {
        pad.style.removeProperty('height');
      });
    }

    function syncPads() {
      if (!rail || !items.length) return;
      if (isMobile()) {
        clearItemMetrics();
        return;
      }
      var styles = window.getComputedStyle(items[0]);
      var row = cssLengthToPx(styles.getPropertyValue('--roster-row'), 76);
      var rowActive = cssLengthToPx(styles.getPropertyValue('--roster-row-active'), 120);
      // Center against the taller active row so spacing stays predictable
      var padH = Math.max(0, (rail.clientHeight - rowActive) / 2);
      pads.forEach(function (pad) {
        pad.style.height = padH + 'px';
      });
      // Keep unselected rows locked to the same height
      items.forEach(function (item) {
        if (item.classList.contains('is-active')) {
          item.style.height = rowActive + 'px';
          item.style.minHeight = rowActive + 'px';
        } else {
          item.style.height = row + 'px';
          item.style.minHeight = row + 'px';
        }
      });
    }

    function setActive(index) {
      if (!items.length || index < 0 || index >= items.length || index === activeIndex) return;
      var prev = activeIndex;
      activeIndex = index;
      items.forEach(function (item, i) {
        item.classList.toggle('is-active', i === index);
      });
      shots.forEach(function (shot, i) {
        shot.classList.toggle('is-active', i === index);
      });
      syncPads();
      // Re-arm briefly when arriving at an edge title via list scroll
      if (index === 0 || index === items.length - 1) {
        if (prev !== index) armLeave(280);
      }
    }

    function updateRoster() {
      ticking = false;
      if (!rail || !items.length) return;

      if (isMobile()) {
        clearItemMetrics();
        if (activeIndex < 0) setActive(0);
        return;
      }

      var railRect = rail.getBoundingClientRect();
      var centerY = railRect.top + railRect.height / 2;
      var range = Math.max(railRect.height * 0.42, 140);
      var best = 0;
      var bestDist = Infinity;
      var mids = [];

      items.forEach(function (item, index) {
        var rect = item.getBoundingClientRect();
        var mid = rect.top + rect.height / 2;
        mids[index] = mid;
        var dist = Math.abs(mid - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });

      items.forEach(function (item, index) {
        var indexDist = Math.abs(index - best);
        // Only show selected + 2 above + 2 below
        if (indexDist > 2) {
          item.style.setProperty('--roster-scale', '0.3');
          item.style.setProperty('--roster-opacity', '0');
          item.classList.add('is-outside');
          return;
        }

        item.classList.remove('is-outside');
        var dist = Math.abs(mids[index] - centerY);
        var t = Math.min(dist / range, 1);
        var eased = t * t * (3 - 2 * t);
        var scale = 1 - eased * 0.68;
        var opacity = 1 - eased * 0.72;
        // Nudge immediate neighbors a touch smaller
        if (indexDist === 1) {
          scale *= 0.9;
        }
        if (indexDist === 2) {
          // Keep ±2 readable but clearly secondary
          scale = Math.min(scale, 0.55);
          opacity = Math.min(opacity, 0.32);
        }
        if (reduced) {
          if (indexDist === 0) {
            scale = 1;
            opacity = 1;
          } else if (indexDist === 1) {
            scale = 0.46;
            opacity = 0.35;
          } else {
            scale = 0.4;
            opacity = 0.28;
          }
        }
        item.style.setProperty('--roster-scale', scale.toFixed(3));
        item.style.setProperty('--roster-opacity', Math.max(opacity, 0.18).toFixed(3));
      });

      setActive(best);
    }

    function onRailScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateRoster);
    }

    function isFirstTitle() {
      return !items.length || activeIndex <= 0;
    }

    function isLastTitle() {
      return !items.length || activeIndex >= items.length - 1;
    }

    function detectSection() {
      var mid = window.innerHeight * 0.5;
      var heroRect = hero.getBoundingClientRect();
      var shelfRect = shelf.getBoundingClientRect();

      if (Math.abs(heroRect.top) <= window.innerHeight * 0.35) return 'hero';
      if (shelfRect.top <= mid && shelfRect.bottom > mid) return 'shelf';
      if (shelfRect.bottom <= mid) return 'footer';
      if (heroRect.bottom > mid) return 'hero';
      return section;
    }

    function docTop(el) {
      return Math.round(window.scrollY + el.getBoundingClientRect().top);
    }

    function shelfStart() {
      return docTop(shelf);
    }

    function atShelfStart() {
      return window.scrollY <= shelfStart() + 2;
    }

    function armLeave(delay) {
      leaveArmedAt = Date.now() + (delay || 450);
    }

    function canLeaveShelf() {
      return Date.now() >= leaveArmedAt;
    }

    function goTo(target) {
      if (sectionLock) return;
      sectionLock = true;
      section = target;

      var top = target === 'hero' ? 0 : shelfStart();

      window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });

      window.setTimeout(function () {
        sectionLock = false;
        section = target;
        if (target === 'shelf') {
          syncPads();
          updateRoster();
          armLeave(500);
        } else {
          armLeave(300);
        }
      }, reduced ? 50 : 800);
    }

    function onWheel(event) {
      if (sectionLock) {
        event.preventDefault();
        return;
      }

      section = detectSection();
      var dy = event.deltaY;
      if (dy === 0) return;

      if (section === 'hero') {
        event.preventDefault();
        if (dy > 0) goTo('shelf');
        else if (window.scrollY > 2) goTo('hero');
        return;
      }

      // Mobile shelf: free page scroll, snap back only from the top.
      if (isMobile()) {
        if (dy < 0 && atShelfStart()) {
          event.preventDefault();
          if (canLeaveShelf()) goTo('hero');
        }
        return;
      }

      if (section === 'shelf') {
        // First title + scroll up → back to hero
        if (dy < 0 && isFirstTitle()) {
          event.preventDefault();
          if (canLeaveShelf()) goTo('hero');
          return;
        }

        // Last title + scroll down → stay put
        if (dy > 0 && isLastTitle()) {
          event.preventDefault();
          return;
        }

        if (rail) {
          event.preventDefault();
          rail.scrollTop += dy;
          onRailScroll();
        }
        return;
      }

      // Below shelf (e.g. footer): scroll up returns to the list
      if (dy < 0) {
        event.preventDefault();
        if (canLeaveShelf()) goTo('shelf');
      }
    }

    function onTouchStart(event) {
      if (!event.touches || !event.touches.length) return;
      touchStartY = event.touches[0].clientY;
    }

    function onTouchMove(event) {
      if (!isMobile() || sectionLock || !event.touches || !event.touches.length) return;

      section = detectSection();
      var dy = touchStartY - event.touches[0].clientY;

      if (section === 'hero') {
        if (dy > 8) {
          event.preventDefault();
          goTo('shelf');
        } else if (dy < -8 && window.scrollY > 2) {
          event.preventDefault();
          goTo('hero');
        }
        return;
      }

      if (dy < -8 && atShelfStart() && canLeaveShelf()) {
        event.preventDefault();
        goTo('hero');
      }
    }

    function onResize() {
      syncPads();
      onRailScroll();
      syncMobilePage();
    }

    function onWindowScroll() {
      if (sectionLock) return;
      section = detectSection();
    }

    if (rail) {
      rail.addEventListener('scroll', onRailScroll, { passive: true });
    }
    if (pagePrev) {
      pagePrev.addEventListener('click', function () {
        goToPage(currentPage - 1, true);
      });
    }
    if (pageNext) {
      pageNext.addEventListener('click', function () {
        goToPage(currentPage + 1, true);
      });
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', onResize);
    } else if (typeof mobileQuery.addListener === 'function') {
      mobileQuery.addListener(onResize);
    }

    syncPads();
    if (items.length) setActive(0);
    syncMobilePage();
    window.requestAnimationFrame(function () {
      syncPads();
      if (rail && !isMobile()) rail.scrollTop = 0;
      updateRoster();
      syncMobilePage();
      section = detectSection();
    });
  }

  function initArchiveFilters() {
    var root = document.querySelector('[data-archive-root]');
    if (!root) return;

    var countEl = root.querySelector('[data-archive-count]');
    var emptyEl = root.querySelector('[data-archive-empty]');
    var resetBtn = root.querySelector('[data-filter-reset]');
    var viewAllWrap = root.querySelector('[data-archive-view-all]');
    var viewAllBtn = root.querySelector('[data-view-all-photos]');
    var dropdowns = Array.prototype.slice.call(root.querySelectorAll('[data-filter-dropdown]'));
    var state = { year: '', place: '', tag: '' };

    if (resetBtn) {
      resetBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        resetFilters();
      });
    }

    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        resetFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    dropdowns.forEach(function (dropdown) {
      var key = dropdown.getAttribute('data-filter-dropdown');
      var trigger = dropdown.querySelector('.filter-dropdown__trigger');
      var menu = dropdown.querySelector('.filter-dropdown__menu');
      var labelEl = dropdown.querySelector('[data-filter-label]');
      if (!trigger || !menu || !labelEl) return;

      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        var willOpen = !dropdown.classList.contains('is-open');
        closeAllDropdowns();
        if (willOpen) openDropdown(dropdown, trigger, menu);
      });

      menu.querySelectorAll('.filter-dropdown__option').forEach(function (option) {
        option.addEventListener('click', function (event) {
          event.stopPropagation();
          selectFilterOption(key, option.getAttribute('data-value') || '');
          closeAllDropdowns();
          applyFilters();
          syncUrl();
        });
      });
    });

    root.querySelectorAll('[data-filter-year]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var year = btn.getAttribute('data-filter-year') || '';
        if (!year) return;
        selectFilterOption('year', year);
        closeAllDropdowns();
        applyFilters();
        syncUrl();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    document.addEventListener('click', function () {
      closeAllDropdowns();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAllDropdowns();
    });

    readUrl();
    applyFilters();
    syncUrl();
    root.classList.add('is-ready');

    var mobileQuery = window.matchMedia('(max-width: 720px)');
    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', applyFilters);
    } else if (typeof mobileQuery.addListener === 'function') {
      mobileQuery.addListener(applyFilters);
    }

    function openDropdown(dropdown, trigger, menu) {
      dropdown.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
    }

    function closeAllDropdowns() {
      dropdowns.forEach(function (dropdown) {
        var trigger = dropdown.querySelector('.filter-dropdown__trigger');
        var menu = dropdown.querySelector('.filter-dropdown__menu');
        dropdown.classList.remove('is-open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (menu) menu.hidden = true;
      });
    }

    function resetFilters() {
      state.year = '';
      state.place = '';
      state.tag = '';

      dropdowns.forEach(function (dropdown) {
        resetDropdownUI(dropdown);
      });

      closeAllDropdowns();
      applyFilters();
      syncUrl();
    }

    function resetDropdownUI(dropdown) {
      var labelEl = dropdown.querySelector('[data-filter-label]');
      var options = dropdown.querySelectorAll('.filter-dropdown__option');
      var allOption = dropdown.querySelector('.filter-dropdown__option[data-value=""]');
      var defaultLabel = allOption
        ? (allOption.getAttribute('data-label') || '')
        : '';

      if (labelEl) labelEl.textContent = defaultLabel;
      dropdown.classList.remove('has-value');
      options.forEach(function (btn) {
        btn.classList.toggle('is-active', btn === allOption);
      });
    }

    function selectFilterOption(key, value) {
      var dropdown = root.querySelector('[data-filter-dropdown="' + key + '"]');
      if (!dropdown) return;

      var options = dropdown.querySelectorAll('.filter-dropdown__option');
      var option = null;
      for (var i = 0; i < options.length; i += 1) {
        if ((options[i].getAttribute('data-value') || '') === value) {
          option = options[i];
          break;
        }
      }
      if (!option) return;

      var labelEl = dropdown.querySelector('[data-filter-label]');
      var label = option.getAttribute('data-label') || value;
      state[key] = value;
      if (labelEl) labelEl.textContent = label;
      dropdown.classList.toggle('has-value', !!value);
      options.forEach(function (btn) {
        btn.classList.toggle('is-active', btn === option);
      });
    }

    function applyFilters() {
      var items = Array.prototype.slice.call(root.querySelectorAll('.photo-grid__item'));
      pruneInvalidSelections(items);
      updateOptionVisibility(items);

      var visibleTotal = 0;
      var hasActiveFilter = !!(state.year || state.place || state.tag);
      var isMobile = window.matchMedia('(max-width: 720px)').matches;
      var rowLimit = hasActiveFilter ? Infinity : (isMobile ? 2 : 4);

      root.querySelectorAll('[data-year-block]').forEach(function (block) {
        var matchCount = 0;
        var shownInRow = 0;
        var blockItems = block.querySelectorAll('.photo-grid__item');

        blockItems.forEach(function (item) {
          var match = matchesFilters(item);
          item.classList.toggle('is-filtered-out', !match);
          item.classList.remove('is-row-overflow');

          if (!match) return;

          matchCount += 1;
          if (shownInRow < rowLimit) {
            shownInRow += 1;
          } else {
            item.classList.add('is-row-overflow');
          }
        });

        block.classList.toggle('is-filtered-out', matchCount === 0);
        visibleTotal += matchCount;

        var yearCount = block.querySelector('[data-year-count]');
        if (yearCount) {
          yearCount.textContent =
            matchCount + ' photograph' + (matchCount === 1 ? '' : 's');
        }

        var moreWrap = block.querySelector('.year-block__more');
        if (moreWrap) {
          // Only in the default one-row preview, when a year still has more photos.
          moreWrap.hidden = hasActiveFilter || matchCount <= rowLimit;
        }
      });

      if (countEl) {
        countEl.textContent =
          visibleTotal + ' photograph' + (visibleTotal === 1 ? '' : 's');
      }

      if (emptyEl) {
        emptyEl.hidden = visibleTotal > 0;
      }

      if (viewAllWrap) {
        viewAllWrap.hidden = !hasActiveFilter || visibleTotal === 0;
      }
    }

    function matchesFilters(item) {
      return itemMatchesPartial(item, null);
    }

    function itemMatchesPartial(item, ignoreKey) {
      if (ignoreKey !== 'year' && state.year && item.getAttribute('data-year') !== state.year) {
        return false;
      }

      if (ignoreKey !== 'place' && state.place) {
        if ((item.getAttribute('data-place') || '') !== state.place) return false;
      }

      if (ignoreKey !== 'tag' && state.tag) {
        var tags = (item.getAttribute('data-tags') || '').split('|').filter(Boolean);
        if (tags.indexOf(state.tag) === -1) return false;
      }

      return true;
    }

    function collectAvailable(items, key) {
      var available = Object.create(null);

      items.forEach(function (item) {
        if (!itemMatchesPartial(item, key)) return;

        if (key === 'year') {
          var year = item.getAttribute('data-year');
          if (year) available[year] = true;
          return;
        }

        if (key === 'place') {
          var place = item.getAttribute('data-place');
          if (place) available[place] = true;
          return;
        }

        if (key === 'tag') {
          (item.getAttribute('data-tags') || '').split('|').filter(Boolean).forEach(function (tag) {
            available[tag] = true;
          });
        }
      });

      return available;
    }

    function pruneInvalidSelections(items) {
      ['year', 'place', 'tag'].forEach(function (key) {
        if (!state[key]) return;
        var available = collectAvailable(items, key);
        if (available[state[key]]) return;

        state[key] = '';
        var dropdown = root.querySelector('[data-filter-dropdown="' + key + '"]');
        if (dropdown) resetDropdownUI(dropdown);
      });
    }

    function updateOptionVisibility(items) {
      ['year', 'place', 'tag'].forEach(function (key) {
        var available = collectAvailable(items, key);
        var dropdown = root.querySelector('[data-filter-dropdown="' + key + '"]');
        if (!dropdown) return;

        dropdown.querySelectorAll('.filter-dropdown__option').forEach(function (option) {
          var value = option.getAttribute('data-value') || '';
          var row = option.parentElement;
          if (!row) return;
          // Always keep the "All" option visible.
          row.hidden = !!(value && !available[value]);
        });
      });
    }

    function syncUrl() {
      if (!window.history || !window.history.replaceState) return;
      var params = new URLSearchParams(window.location.search);
      ['year', 'place', 'tag'].forEach(function (key) {
        if (state[key]) params.set(key, state[key]);
        else params.delete(key);
      });
      var query = params.toString();
      var next = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
      window.history.replaceState(null, '', next);
    }

    function readUrl() {
      var params = new URLSearchParams(window.location.search);
      ['year', 'place', 'tag'].forEach(function (key) {
        var value = params.get(key) || '';
        if (!value) return;
        var dropdown = root.querySelector('[data-filter-dropdown="' + key + '"]');
        if (!dropdown) return;

        var option = null;
        var options = dropdown.querySelectorAll('.filter-dropdown__option');
        for (var i = 0; i < options.length; i += 1) {
          if (options[i].getAttribute('data-value') === value) {
            option = options[i];
            break;
          }
        }
        if (!option) return;

        state[key] = value;
        var labelEl = dropdown.querySelector('[data-filter-label]');
        if (labelEl) labelEl.textContent = option.getAttribute('data-label') || value;
        dropdown.classList.add('has-value');
        options.forEach(function (btn) {
          btn.classList.toggle('is-active', btn === option);
        });
      });
    }
  }

  function initPhotoLightbox() {
    // Homepage keeps full-page navigation into photograph detail pages.
    if (document.body.classList.contains('is-home') || document.body.classList.contains('layout-index')) return;

    var root = document.getElementById('photo-lightbox');
    var panel = root && root.querySelector('.photo-lightbox__panel');
    var content = document.getElementById('photo-lightbox-content');
    if (!root || !panel || !content) return;

    var cache = Object.create(null);
    var open = false;
    var lastFocus = null;
    var requestId = 0;

    function statusHtml(message) {
      return '<p class="photo-lightbox__status">' + message + '</p>';
    }

    document.addEventListener('click', function (event) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      var closeEl = event.target.closest('[data-lightbox-close]');
      if (closeEl && root.contains(closeEl)) {
        event.preventDefault();
        closeLightbox();
        return;
      }

      var trigger = event.target.closest('a[href]');
      if (!trigger || trigger.closest('.photo-lightbox')) return;
      if (!isPhotoPageLink(trigger)) return;

      event.preventDefault();
      openLightbox(trigger.href);
    });

    document.addEventListener('keydown', function (event) {
      if (!open || event.key !== 'Escape') return;
      event.preventDefault();
      closeLightbox();
    });

    function openLightbox(url) {
      var absolute = toAbsoluteUrl(url);
      if (!absolute) return;

      lastFocus = document.activeElement;
      open = true;
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      root.classList.add('is-loading');
      content.innerHTML = statusHtml('Loading');
      panel.focus({ preventScroll: true });

      var id = ++requestId;

      loadPhotoPage(absolute).then(function (html) {
        if (id !== requestId) return;
        root.classList.remove('is-loading');
        content.innerHTML = html || statusHtml('Unable to load photograph');
        if (!html) return;
        adaptLightboxNav(absolute);
        var scroll = root.querySelector('.photo-lightbox__scroll');
        if (scroll) scroll.scrollTop = 0;
      }).catch(function () {
        if (id !== requestId) return;
        root.classList.remove('is-loading');
        content.innerHTML = statusHtml('Unable to load photograph');
      });
    }

    function closeLightbox() {
      if (!open) return;
      requestId += 1;
      open = false;
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
      root.classList.remove('is-loading');
      document.body.classList.remove('lightbox-open');
      content.innerHTML = '';
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
      }
      lastFocus = null;
    }

    function loadPhotoPage(url) {
      if (cache[url]) return Promise.resolve(cache[url]);

      return fetch(url, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('fetch failed');
          return res.text();
        })
        .then(function (text) {
          var article = new DOMParser().parseFromString(text, 'text/html').querySelector('.photo-page');
          if (!article) throw new Error('missing photo page');
          cache[url] = article.outerHTML;
          return cache[url];
        });
    }

    function adaptLightboxNav(photoUrl) {
      var nav = content.querySelector('.photo-nav');
      if (!nav) return;
      nav.innerHTML =
        '<a class="photo-nav__open" href="' + photoUrl + '">View Full Page</a>';
    }

    function toAbsoluteUrl(href) {
      try {
        return new URL(href, window.location.href).href;
      } catch (err) {
        return '';
      }
    }

    function isPhotoPageLink(anchor) {
      var href = anchor.getAttribute('href');
      if (!href || href.charAt(0) === '#') return false;
      try {
        var path = new URL(href, window.location.href).pathname;
        return /\/photos\/[^/]+\/?$/.test(path) || /\/photos\/[^/]+\/index\.html$/.test(path);
      } catch (err) {
        return false;
      }
    }
  }
})();

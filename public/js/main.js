(function () {
  'use strict';

  // Header gets a shadow once you scroll
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Service tabs
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.svc-tabs [role="tab"]'));
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
      if (k === 'ArrowLeft' || k === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });

  // "Ask about ..." links tick that service in the quote form
  document.querySelectorAll('[data-pick]').forEach(function (a) {
    a.addEventListener('click', function () {
      var box = document.querySelector('.chips input[value="' + a.getAttribute('data-pick') + '"]');
      if (box) box.checked = true;
    });
  });

  // Before / after
  var frame = document.querySelector('.ba-frame');
  var tag = document.querySelector('.ba-tag');
  document.querySelectorAll('.ba-switch button').forEach(function (b) {
    b.addEventListener('click', function () {
      var show = b.getAttribute('data-show');
      frame.setAttribute('data-state', show);
      tag.textContent = show === 'before' ? 'Before' : 'After';
      document.querySelectorAll('.ba-switch button').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
    });
  });

  // Highlight the current season
  var m = new Date().getMonth();
  document.querySelectorAll('.season').forEach(function (s) {
    if (s.getAttribute('data-months').split(',').map(Number).indexOf(m) !== -1) s.classList.add('is-now');
  });

  // Gallery lightbox
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('img');
  document.querySelectorAll('.g-item').forEach(function (b) {
    b.addEventListener('click', function () {
      var img = b.querySelector('img');
      lbImg.src = img.src; lbImg.alt = img.alt;
      if (lb.showModal) lb.showModal(); else window.open(img.src);
    });
  });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-close')) lb.close(); });

  // Fade sections up as they scroll in
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Replay the mower
  document.getElementById('replay').addEventListener('click', function (e) {
    e.stopPropagation();
    if (window.ShoffsMower) window.ShoffsMower.play();
  });

  // Quote form (demo: nothing is sent)
  var form = document.getElementById('quote-form');
  var status = document.getElementById('quote-status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.name.value.trim();
    var contact = form.contact.value.trim();
    if (!name || !contact) {
      status.textContent = 'Add your name and a phone number or email so Sean can get back to you.';
      status.className = 'form-status err';
      return;
    }
    status.textContent = 'Thanks, ' + name.split(' ')[0] + '. This is a demo site, so nothing was sent. On the real site, this goes straight to Sean.';
    status.className = 'form-status ok';
    form.reset();
  });
})();

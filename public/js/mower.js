/* Intro: a push mower mows a green tint off the page, row by row, top to bottom.
   The finished page sits underneath the whole time, so when the last row is cut there's nothing left to load.
   Plays once per browser tab (sessionStorage). Skipped for reduced motion.
   Click, tap, scroll or any key skips it. window.ShoffsMower.play() replays it.
   Debug: ?mow forces it to play, ?mowat=1.5 draws that moment and holds it. */
(function () {
  'use strict';

  var KEY = 'shoffs-mowed';
  var TINT = 'rgba(78, 128, 48, 0.58)';          // keep in step with .intro-pending #mow-intro in style.css
  var STRIPE = ['rgba(168, 205, 120, 0.16)', 'rgba(38, 74, 22, 0.12)']; // fresh-cut light / dark stripes
  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var freezeAt = params.has('mowat') ? parseFloat(params.get('mowat')) : null;

  function seen() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function markSeen() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }

  /* ---------- the mower: flat, top-down, facing +x; the deck is 100 units wide ---------- */

  var BOUNDS = { x: -196, y: -70, w: 264, h: 140 };
  var DECK = new Path2D('M-44,-50 L8,-50 C38,-50 58,-30 58,0 C58,30 38,50 8,50 L-44,50 Q-52,50 -52,42 L-52,-42 Q-52,-50 -44,-50 Z');
  var BAG = new Path2D('M-54,-30 L-106,-32 Q-118,-32 -118,-20 L-118,20 Q-118,32 -106,32 L-54,30 Z');
  var HANDLE = [[-46, 38], [-178, 43], [-186, 35], [-186, -35], [-178, -43], [-46, -38]];
  var CHARCOAL = '#2E3033', RED = '#B81D24';

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }
  function line(g, pts) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  }

  function makeMower(scale) {
    var c = document.createElement('canvas');
    c.width = Math.ceil(BOUNDS.w * scale); c.height = Math.ceil(BOUNDS.h * scale);
    var g = c.getContext('2d');
    g.scale(scale, scale); g.translate(-BOUNDS.x, -BOUNDS.y);
    g.lineCap = 'round'; g.lineJoin = 'round';

    // one soft shadow under the whole mower
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.28)'; g.shadowBlur = 8 * scale; g.shadowOffsetX = 3 * scale; g.shadowOffsetY = 5 * scale;
    g.fillStyle = '#000';
    g.fill(DECK); g.fill(BAG);
    rr(g, 10, -61, 32, 11, 5); g.fill(); rr(g, 10, 50, 32, 11, 5); g.fill();
    rr(g, -54, -62, 40, 12, 5); g.fill(); rr(g, -54, 50, 40, 12, 5); g.fill();
    line(g, HANDLE); g.lineWidth = 4; g.strokeStyle = '#000'; g.stroke();
    g.restore();

    // wheels
    g.fillStyle = '#222326';
    rr(g, 10, -61, 32, 11, 5); g.fill(); rr(g, 10, 50, 32, 11, 5); g.fill();
    rr(g, -54, -62, 40, 12, 5); g.fill(); rr(g, -54, 50, 40, 12, 5); g.fill();

    // grass bag and handle
    g.fillStyle = '#44474c'; g.fill(BAG);
    g.strokeStyle = CHARCOAL; g.lineWidth = 2.5; g.stroke(BAG);
    line(g, HANDLE); g.strokeStyle = '#1d1e21'; g.lineWidth = 4; g.stroke();
    line(g, [[-186, 25], [-186, -25]]); g.lineWidth = 7; g.strokeStyle = '#111214'; g.stroke();

    // deck: flat brand red with a darker rim
    g.fillStyle = RED; g.fill(DECK);
    g.save(); g.clip(DECK);
    g.lineWidth = 4; g.strokeStyle = '#9a171d'; g.stroke(DECK);
    g.restore();

    // engine
    g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fillStyle = CHARCOAL; g.fill();
    g.beginPath(); g.arc(0, 0, 19, 0, Math.PI * 2); g.fillStyle = '#3c3f44'; g.fill();
    g.strokeStyle = CHARCOAL; g.lineWidth = 1.6;
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8;
      g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); g.stroke();
    }
    g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fillStyle = '#5a5e64'; g.fill();
    return c;
  }

  /* ---------- a faint grass grain inside the green wash (seamless tile, device pixels) ---------- */

  function grassTile(dpr) {
    var size = Math.round(220 * dpr);
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    g.lineCap = 'round';
    var colors = ['rgba(28,58,14,0.18)', 'rgba(40,78,22,0.15)', 'rgba(150,196,104,0.15)', 'rgba(184,220,140,0.11)'];
    var n = Math.round(3200 * dpr * dpr);
    for (var i = 0; i < n; i++) {
      var x = Math.random() * size, y = Math.random() * size;
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      var l = (2.5 + Math.random() * 5) * dpr;
      var ex = Math.cos(a) * l, ey = Math.sin(a) * l, bend = (Math.random() - 0.5) * 2 * dpr;
      g.strokeStyle = colors[i % colors.length];
      g.lineWidth = (0.7 + Math.random() * 0.7) * dpr;
      // repeat strokes that cross an edge so the tile wraps without seams
      var xs = [0], ys = [0], m = l + 2;
      if (x < m) xs.push(size); if (x > size - m) xs.push(-size);
      if (y < m) ys.push(size); if (y > size - m) ys.push(-size);
      g.beginPath();
      for (var xi = 0; xi < xs.length; xi++) for (var yi = 0; yi < ys.length; yi++) {
        var bx = x + xs[xi], by = y + ys[yi];
        g.moveTo(bx, by); g.quadraticCurveTo(bx + ex / 2 + bend, by + ey / 2, bx + ex, by + ey);
      }
      g.stroke();
    }
    return c;
  }

  /* ---------- the intro ---------- */

  var running = null;

  function play() {
    if (running) return;

    var wrap = document.getElementById('mow-intro');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'mow-intro'; document.body.appendChild(wrap); }
    wrap.innerHTML = ''; wrap.className = '';
    root.classList.add('intro-playing', 'no-rise');
    root.classList.remove('intro-done');
    var W = wrap.clientWidth || window.innerWidth, H = wrap.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function layer() {
      var c = document.createElement('canvas');
      c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr);
      var g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { c: c, g: g };
    }
    var view = layer();
    view.c.style.width = W + 'px'; view.c.style.height = H + 'px';
    view.c.setAttribute('aria-hidden', 'true');
    wrap.appendChild(view.c);
    var skipBtn = document.createElement('button');
    skipBtn.type = 'button'; skipBtn.className = 'mow-skip'; skipBtn.textContent = 'Skip';
    wrap.appendChild(skipBtn);
    wrap.style.background = 'transparent';

    var tint = layer();                    // uncut: a flat green wash
    tint.g.fillStyle = TINT; tint.g.fillRect(0, 0, W, H);
    tint.g.fillStyle = tint.g.createPattern(grassTile(dpr), 'repeat');
    if (tint.g.fillStyle.setTransform) tint.g.fillStyle.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    tint.g.fillRect(0, 0, W, H);
    var fresh = layer();                   // grass just mowed: keeps its look, then slowly fades to show the page

    // rows sized to the screen; the mower is a bit narrower than a row's height times 1.05
    var target = Math.max(110, Math.min(190, Math.min(W, H) * 0.25));
    var rows = Math.max(4, Math.round(H / target));
    var rowH = H / rows;
    var s = rowH * 1.05 / 100;            // px per mower unit
    var r = rowH / 2;                      // turning radius
    var sprite = makeMower(s * dpr);

    // path: serpentine rows with U-turns just past each edge
    var front = 58 * s, rear = 52 * s, tail = 196 * s;
    var segs = [], total = 0;
    for (var i = 0; i < rows; i++) {
      var y = rowH * (i + 0.5), ltr = i % 2 === 0, last = i === rows - 1;
      var xs = i === 0 ? -front - 4 : (ltr ? -rear : W + rear);
      var xe = ltr ? W + rear + (last ? tail : 0) : -rear - (last ? tail : 0);
      segs.push({ line: true, x0: xs, y: y, x1: xe, len: Math.abs(xe - xs), start: total, row: i }); total += Math.abs(xe - xs);
      if (!last) { segs.push({ line: false, cx: xe, cy: y + r, right: ltr, len: Math.PI * r, start: total, row: i }); total += Math.PI * r; }
    }
    function poseAt(d) {
      d = Math.max(0, Math.min(total - 0.001, d));
      for (var k = 0; k < segs.length; k++) {
        var sg = segs[k];
        if (d <= sg.start + sg.len) {
          var u = (d - sg.start) / sg.len;
          if (sg.line) return { x: sg.x0 + (sg.x1 - sg.x0) * u, y: sg.y, a: sg.x1 > sg.x0 ? 0 : Math.PI, row: sg.row };
          var th = u * Math.PI;
          if (sg.right) return { x: sg.cx + r * Math.sin(th), y: sg.cy - r * Math.cos(th), a: th, row: sg.row };
          return { x: sg.cx - r * Math.sin(th), y: sg.cy - r * Math.cos(th), a: Math.PI - th, row: sg.row };
        }
      }
      return { x: 0, y: 0, a: 0, row: rows - 1 };
    }
    function cutPath(g, p) {
      var ca = Math.cos(p.a), sa = Math.sin(p.a);
      g.beginPath();
      [[-42, -52.5], [48, -52.5], [48, 52.5], [-42, 52.5]].forEach(function (q, k) {
        var x = p.x + (q[0] * ca - q[1] * sa) * s, y = p.y + (q[0] * sa + q[1] * ca) * s;
        if (k) g.lineTo(x, y); else g.moveTo(x, y);
      });
      g.closePath();
    }

    var duration = Math.max(4.6, Math.min(6.2, 3.2 + rows * 0.38)); // seconds of mowing
    var speed = total / duration;
    var hold = 0.3;
    var lastD = 0, lastT = null, t0 = null, done = false, raf = 0, endAt = null;

    function step(now) {
      if (done) return false;
      if (t0 === null) { t0 = now; lastT = now; }
      var t = (now - t0) / 1000;
      if (freezeAt !== null) t = Math.min(t, freezeAt);
      var dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
      lastT = now;

      var mt = Math.max(0, t - hold);
      var d = Math.min(total, mt < 0.4 ? speed * mt * mt / 0.8 : speed * (mt - 0.2));  // ease in, then steady
      var p = poseAt(d);

      // cut along the path since the last frame
      tint.g.globalCompositeOperation = 'destination-out';
      tint.g.fillStyle = '#000';
      var steps = Math.max(1, Math.ceil((d - lastD) / 5));
      for (var k = 1; k <= steps; k++) {
        var q = poseAt(lastD + (d - lastD) * k / steps);
        // hand the mowed strip over to the fading layer, then take it off the standing grass
        fresh.g.save();
        cutPath(fresh.g, q); fresh.g.clip();
        fresh.g.drawImage(tint.c, 0, 0, W, H);
        fresh.g.fillStyle = STRIPE[q.row % 2];
        fresh.g.fillRect(0, 0, W, H);
        fresh.g.restore();
        cutPath(tint.g, q); tint.g.fill();
      }
      tint.g.globalCompositeOperation = 'source-over';
      fresh.g.globalCompositeOperation = 'destination-out';
      fresh.g.fillStyle = 'rgba(0,0,0,' + (1 - Math.exp(-dt / 0.75)) + ')';   // slow reveal
      fresh.g.fillRect(0, 0, W, H);
      fresh.g.globalCompositeOperation = 'source-over';
      lastD = d;

      var g = view.g;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, view.c.width, view.c.height);
      g.drawImage(fresh.c, 0, 0);
      g.drawImage(tint.c, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.save();
      g.translate(p.x, p.y); g.rotate(p.a); g.scale(s, s);
      g.drawImage(sprite, BOUNDS.x, BOUNDS.y, BOUNDS.w, BOUNDS.h);
      g.restore();

      // once the mower has left, let the last stripes fade, then step aside
      if (d >= total) {
        if (endAt === null) endAt = t;
        if (t - endAt > 1.8) { finish(false); return false; }   // let the last rows fade out
      }
    }

    function frame(now) {
      try { if (step(now) !== false) raf = requestAnimationFrame(frame); }
      catch (err) { finish(true); }
    }

    function finish(skipped) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      markSeen();
      ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.removeEventListener(ev, onSkip, true); });
      window.removeEventListener('resize', onSkip);
      wrap.classList.add('mow-out');
      root.classList.remove('intro-playing');
      root.classList.add('intro-done');
      setTimeout(function () { wrap.remove(); running = null; }, 550);
    }
    function onSkip(e) {
      if (e && e.type === 'keydown' && /^(Shift|Meta|Alt|Control)$/.test(e.key)) return;
      if (e && e.type === 'click') { e.preventDefault(); e.stopPropagation(); }
      finish(true);
    }

    running = { finish: finish };
    if (freezeAt !== null) {
      for (var ft = 0; ft <= freezeAt * 1000; ft += 1000 / 60) step(ft);
      return;
    }
    ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, onSkip, { capture: true, passive: ev !== 'click' }); });
    window.addEventListener('resize', onSkip);
    raf = requestAnimationFrame(frame);
  }

  window.ShoffsMower = { play: function () { window.scrollTo(0, 0); play(); } };

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (root.classList.contains('intro-pending') && !reduce && (!seen() || params.has('mow'))) {
    root.classList.remove('intro-pending');
    play();
  } else {
    root.classList.remove('intro-pending');
    root.classList.add('intro-done');
  }
})();

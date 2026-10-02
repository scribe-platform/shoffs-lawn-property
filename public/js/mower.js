/* Intro: a push mower mows the grass off the page, row by row, top to bottom.
   Plays once per browser tab (sessionStorage). Skipped for reduced motion.
   Click, tap, scroll or any key skips it. window.ShoffsMower.play() replays it.
   Debug: ?mow forces it to play, ?mowat=1.5 draws that moment and holds it. */
(function () {
  'use strict';

  var KEY = 'shoffs-mowed';
  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var freezeAt = params.has('mowat') ? parseFloat(params.get('mowat')) : null;

  function seen() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function markSeen() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* ---------- grass textures (drawn at device pixels so they stay sharp) ---------- */

  function strokes(g, n, size, len, wid, colors, bias, spread) {
    g.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var x = Math.random() * size, y = Math.random() * size;
      var a = bias + (Math.random() - 0.5) * spread;
      var l = rand(len[0], len[1]);
      g.strokeStyle = pick(colors);
      g.lineWidth = rand(wid[0], wid[1]);
      var mx = Math.cos(a) * l * 0.5 + rand(-1, 1), my = Math.sin(a) * l * 0.5 + rand(-1, 1);
      var ex = Math.cos(a) * l, ey = Math.sin(a) * l;
      var m = l + 2;
      var xs = [0], ys = [0];
      if (x < m) xs.push(size); if (x > size - m) xs.push(-size);
      if (y < m) ys.push(size); if (y > size - m) ys.push(-size);
      g.beginPath();
      for (var xi = 0; xi < xs.length; xi++) for (var yi = 0; yi < ys.length; yi++) {
        var bx = x + xs[xi], by = y + ys[yi];
        g.moveTo(bx, by);
        g.quadraticCurveTo(bx + mx, by + my, bx + ex, by + ey);
      }
      g.stroke();
    }
  }

  // Seamless tile (strokes() wraps anything that crosses an edge)
  function tile(px, paint) {
    var c = document.createElement('canvas');
    c.width = c.height = px;
    paint(c.getContext('2d'), px);
    return c;
  }

  function tallTile(dpr) {
    var px = Math.round(384 * dpr), k = dpr, n = dpr * dpr;
    return tile(px, function (g, s) {
      g.fillStyle = '#26401a'; g.fillRect(0, 0, s, s);
      strokes(g, 9000 * n, s, [3 * k, 7 * k], [0.9 * k, 1.6 * k], ['#1a2e12', '#203816', '#1d3314', '#24401a'], -1.2, 3.2);
      strokes(g, 11000 * n, s, [3 * k, 8 * k], [0.8 * k, 1.4 * k], ['#33561f', '#3a6024', '#2f5120', '#416a27', '#36591f'], -1.1, 2.6);
      strokes(g, 6500 * n, s, [2.5 * k, 6 * k], [0.7 * k, 1.1 * k], ['#4f7c2d', '#5a8834', '#638f38', '#4a7429', '#6d9a40'], -1.0, 2.2);
      strokes(g, 1400 * n, s, [2 * k, 4.5 * k], [0.6 * k, 0.9 * k], ['#7fa94c', '#89b356', '#93b85d'], -0.9, 1.6);
    });
  }

  function cutTile(dpr, light) {
    var px = Math.round(256 * dpr), k = dpr, n = dpr * dpr;
    return tile(px, function (g, s) {
      g.fillStyle = light ? '#5b8a33' : '#40672a'; g.fillRect(0, 0, s, s);
      var base = light ? ['#527e2e', '#5f8f36', '#6a9a3c', '#4d7a2b'] : ['#3a5f26', '#44692b', '#355823', '#4b7230'];
      var hi = light ? ['#7eaa4c', '#88b356', '#76a245'] : ['#557d33', '#5e8638'];
      strokes(g, 9000 * n, s, [1.4 * k, 3 * k], [0.6 * k, 1.1 * k], base, 0, 0.9);
      strokes(g, 2600 * n, s, [1.2 * k, 2.4 * k], [0.5 * k, 0.9 * k], hi, 0, 0.9);
    });
  }

  function makeGrass(W, H, dpr) {
    var c = document.createElement('canvas');
    c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr);
    var g = c.getContext('2d');
    g.fillStyle = g.createPattern(tallTile(dpr), 'repeat');
    g.fillRect(0, 0, c.width, c.height);
    // broad light and shade so the tile never reads as a repeat
    for (var i = 0; i < 26; i++) {
      var x = rand(0, c.width), y = rand(0, c.height), r = rand(160, 420) * dpr;
      var rg = g.createRadialGradient(x, y, 0, x, y, r);
      var light = Math.random() < 0.45;
      rg.addColorStop(0, light ? 'rgba(150,185,90,0.10)' : 'rgba(5,20,5,0.16)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
  }

  /* ---------- the mower: top-down 21" push mower, facing +x, deck is 100 units wide ---------- */

  var BOUNDS = { x: -262, y: -78, w: 336, h: 156 };
  var DECK = new Path2D('M-46,-50 L8,-50 C38,-50 60,-30 60,0 C60,30 38,50 8,50 L-46,50 Q-54,50 -54,42 L-54,-42 Q-54,-50 -46,-50 Z');
  var HANDLE = [[-48, 40], [-150, 44], [-236, 46], [-246, 38], [-246, -38], [-236, -46], [-150, -44], [-48, -40]];

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }
  function lin(g, x0, y0, x1, y1, stops) {
    var gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    return gr;
  }
  function rad(g, x0, y0, r0, x1, y1, r1, stops) {
    var gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    return gr;
  }
  function polyline(g, pts) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  }
  // round tube lit from the top-left
  function tube(g, pts, w, dark, mid, shine) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    polyline(g, pts); g.strokeStyle = dark; g.lineWidth = w; g.stroke();
    g.save(); g.translate(-w * 0.12, -w * 0.12);
    polyline(g, pts); g.strokeStyle = mid; g.lineWidth = w * 0.6; g.stroke();
    g.translate(-w * 0.1, -w * 0.1);
    polyline(g, pts); g.strokeStyle = shine; g.lineWidth = w * 0.18; g.stroke();
    g.restore();
  }
  function sprite(scale, draw) {
    var c = document.createElement('canvas');
    c.width = Math.ceil(BOUNDS.w * scale); c.height = Math.ceil(BOUNDS.h * scale);
    var g = c.getContext('2d');
    g.scale(scale, scale); g.translate(-BOUNDS.x, -BOUNDS.y);
    draw(g, scale);
    return c;
  }

  // Soft shadows cast onto the grass. Two parts: the deck sits low, the handle sits high.
  function shadowSprites(scale) {
    function blurred(fill) {
      return sprite(scale, function (g, sc) {
        g.save();
        g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 9 * sc; g.shadowOffsetX = 2000 * sc;
        g.translate(-2000, 0);
        fill(g);
        g.restore();
      });
    }
    return {
      deck: blurred(function (g) {
        g.fillStyle = '#000'; g.fill(DECK);
        rr(g, -58, -63, 46, 13, 6); g.fill(); rr(g, -58, 50, 46, 13, 6); g.fill();
        rr(g, 8, -61, 36, 12, 6); g.fill(); rr(g, 8, 49, 36, 12, 6); g.fill();
        g.fill(new Path2D('M-56,-33 L-118,-36 Q-134,-36 -136,-22 L-137,22 Q-134,36 -118,36 L-56,33 Z'));
      }),
      handle: blurred(function (g) {
        g.strokeStyle = '#000'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
        polyline(g, HANDLE); g.stroke();
        g.lineWidth = 8; polyline(g, [[-246, 28], [-246, -28]]); g.stroke();
      })
    };
  }

  function bodySprite(scale) {
    return sprite(scale, function (g, sc) {
      // grass catcher bag behind the deck, between the handle tubes
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 6 * sc; g.shadowOffsetX = 2 * sc; g.shadowOffsetY = 3 * sc;
      var BAG = new Path2D('M-56,-33 L-118,-36 Q-134,-36 -136,-22 L-137,22 Q-134,36 -118,36 L-56,33 Z');
      g.fillStyle = '#26292c'; g.fill(BAG);
      g.restore();
      g.save();
      g.clip(BAG);
      g.fillStyle = lin(g, 0, -36, 0, 36, [[0, '#3c4044'], [0.4, '#2c2f33'], [1, '#17191b']]);
      g.fillRect(-140, -40, 90, 80);
      // fabric grain
      for (var gx = 0; gx < 700; gx++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.12)';
        g.fillRect(rand(-140, -50), rand(-40, 40), 0.7, 0.7);
      }
      // soft folds where the bag sags
      [[-120, 0.28], [-98, 0.2], [-76, 0.16]].forEach(function (f) {
        g.fillStyle = lin(g, f[0] - 7, 0, f[0] + 7, 0, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,' + f[1] + ')'], [1, 'rgba(0,0,0,0)']]);
        g.fillRect(f[0] - 7, -40, 14, 80);
        g.fillStyle = lin(g, f[0] - 14, 0, f[0] - 4, 0, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.06)']]);
        g.fillRect(f[0] - 14, -40, 10, 80);
      });
      g.restore();
      // rigid top frame and carry handle
      tube(g, [[-58, -33], [-118, -36], [-130, -32], [-136, -22], [-137, 22], [-130, 32], [-118, 36], [-58, 33]], 2.4, '#0e0f11', '#2a2d31', 'rgba(255,255,255,0.22)');
      tube(g, [[-92, -12], [-92, 12]], 3.2, '#0e0f11', '#2a2d31', 'rgba(255,255,255,0.25)');

      // rear trail shield
      rr(g, -58, -34, 6, 68, 2); g.fillStyle = '#16171a'; g.fill();

      // painted steel deck
      g.save();
      g.fillStyle = lin(g, -54, -50, 40, 50, [[0, '#cf2c33'], [0.5, '#b81d24'], [1, '#86141a']]);
      g.fill(DECK);
      g.clip(DECK);
      g.fillStyle = rad(g, -18, -40, 4, -18, -40, 90, [[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(-60, -60, 130, 120);
      // rolled edge: light on the top-left, dark on the bottom-right
      g.lineWidth = 5;
      g.strokeStyle = lin(g, -40, -50, 40, 50, [[0, 'rgba(255,255,255,0.28)'], [0.5, 'rgba(255,255,255,0.04)'], [1, 'rgba(0,0,0,0.35)']]);
      g.stroke(DECK);
      g.restore();
      g.save();
      g.translate(9, 0); g.scale(0.8, 0.8); g.translate(-9, 0);
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(0,0,0,0.16)'; g.stroke(DECK);
      g.translate(-0.8, -0.8); g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,255,255,0.14)'; g.stroke(DECK);
      g.restore();

      // height-adjust levers
      [[-34, -46], [-34, 46], [26, -45], [26, 45]].forEach(function (p) {
        g.save(); g.translate(p[0], p[1]);
        rr(g, -7, -2, 14, 4, 2);
        g.fillStyle = lin(g, 0, -2, 0, 2, [[0, '#d5d8db'], [1, '#7c8187']]); g.fill();
        g.beginPath(); g.arc(-7, 0, 2.4, 0, Math.PI * 2); g.fillStyle = '#1b1c1f'; g.fill();
        g.restore();
      });

      // handle brackets
      [[-49, -40], [-49, 40]].forEach(function (p) {
        rr(g, p[0] - 6, p[1] - 4, 12, 8, 2);
        g.fillStyle = lin(g, 0, p[1] - 4, 0, p[1] + 4, [[0, '#2e3134'], [1, '#141517']]); g.fill();
      });

      // engine base
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 5 * sc; g.shadowOffsetX = 1.5 * sc; g.shadowOffsetY = 2.5 * sc;
      g.beginPath(); g.arc(0, 0, 33, 0, Math.PI * 2);
      g.fillStyle = '#1a1b1e'; g.fill();
      g.restore();
      // muffler heat shield (rear right)
      rr(g, -32, 14, 20, 15, 4);
      g.fillStyle = lin(g, -32, 14, -12, 29, [[0, '#e1e3e5'], [0.45, '#a3a8ad'], [1, '#5f646a']]); g.fill();
      g.fillStyle = 'rgba(25,25,28,0.75)';
      for (var hx = 0; hx < 5; hx++) for (var hy = 0; hy < 3; hy++) { g.beginPath(); g.arc(-28.5 + hx * 3.4, 17.6 + hy * 3.8, 0.8, 0, Math.PI * 2); g.fill(); }
      // fuel tank (front left) and cap
      g.beginPath(); g.moveTo(10, -33); g.quadraticCurveTo(34, -34, 36, -14); g.quadraticCurveTo(30, -8, 20, -10); g.quadraticCurveTo(8, -14, 10, -33); g.closePath();
      g.fillStyle = lin(g, 10, -34, 34, -8, [[0, '#3a3d41'], [1, '#1b1c1f']]); g.fill();
      g.beginPath(); g.arc(24, -22, 6, 0, Math.PI * 2);
      g.fillStyle = rad(g, 22.5, -23.5, 0.5, 24, -22, 6, [[0, '#4a4d52'], [1, '#121315']]); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 0.6;
      for (var f = 0; f < 12; f++) { var fa = f * Math.PI / 6; g.beginPath(); g.moveTo(24 + Math.cos(fa) * 4.2, -22 + Math.sin(fa) * 4.2); g.lineTo(24 + Math.cos(fa) * 5.8, -22 + Math.sin(fa) * 5.8); g.stroke(); }
      // air filter (front right)
      rr(g, 16, 8, 20, 22, 5);
      g.fillStyle = lin(g, 16, 8, 36, 30, [[0, '#34373b'], [1, '#17181b']]); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 0.8;
      for (var a = 0; a < 5; a++) { g.beginPath(); g.moveTo(19.5 + a * 3.3, 11); g.lineTo(19.5 + a * 3.3, 27); g.stroke(); }
      // oil dipstick (yellow, rear left)
      g.beginPath(); g.arc(-25, -21, 3.2, 0, Math.PI * 2);
      g.strokeStyle = '#e2b21c'; g.lineWidth = 1.8; g.stroke();
      // recoil starter shroud with a fine vent ring
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 4 * sc; g.shadowOffsetX = 1 * sc; g.shadowOffsetY = 2 * sc;
      g.beginPath(); g.arc(-2, 0, 23, 0, Math.PI * 2);
      g.fillStyle = rad(g, -9, -8, 2, -2, 0, 24, [[0, '#46494e'], [0.7, '#202226'], [1, '#141518']]); g.fill();
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1.1;
      for (var v = 0; v < 40; v++) {
        var va = v * Math.PI / 20;
        g.beginPath(); g.moveTo(-2 + Math.cos(va) * 11, Math.sin(va) * 11); g.lineTo(-2 + Math.cos(va) * 19, Math.sin(va) * 19); g.stroke();
      }
      g.beginPath(); g.arc(-2, 0, 21.5, 0, Math.PI * 2);
      g.strokeStyle = lin(g, -20, -20, 16, 20, [[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]); g.lineWidth = 1; g.stroke();
      g.beginPath(); g.arc(-2, 0, 9, 0, Math.PI * 2);
      g.fillStyle = rad(g, -4.5, -2.5, 0.5, -2, 0, 9, [[0, '#6b6f75'], [0.6, '#33363a'], [1, '#1d1f22']]); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; g.stroke();

      // handle: throttle cable, black powder-coated tubes, folding knobs, foam grip, bail bar
      g.beginPath(); g.moveTo(-232, 36); g.bezierCurveTo(-180, 52, -90, 44, -30, 22);
      g.strokeStyle = 'rgba(10,10,12,0.9)'; g.lineWidth = 1.1; g.stroke();
      tube(g, HANDLE, 4.6, '#0f1012', '#26292d', 'rgba(255,255,255,0.32)');
      [[-150, -48], [-150, 48]].forEach(function (p) {
        g.beginPath(); g.arc(p[0], p[1], 4.2, 0, Math.PI * 2);
        g.fillStyle = rad(g, p[0] - 1.5, p[1] - 1.5, 0.5, p[0], p[1], 5, [[0, '#4a4d52'], [1, '#111214']]); g.fill();
      });
      tube(g, [[-246, 30], [-246, -30]], 8, '#0b0b0c', '#202225', 'rgba(255,255,255,0.12)');
      tube(g, [[-232, 44], [-238, 34], [-238, -34], [-232, -44]], 2.6, '#6d7277', '#b9bec3', 'rgba(255,255,255,0.8)');
    });
  }

  function drawWheel(g, x, y, len, wid, roll) {
    g.save(); g.translate(x, y);
    rr(g, -len / 2, -wid / 2, len, wid, wid * 0.45);
    g.fillStyle = lin(g, 0, -wid / 2, 0, wid / 2, [[0, '#18191b'], [0.35, '#34373a'], [0.6, '#232527'], [1, '#0c0c0d']]);
    g.fill();
    g.save(); g.clip();
    // tread blocks roll past as the wheel turns
    var step = 3.6, off = ((roll % step) + step) % step;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    for (var tx = -len / 2 - step + off; tx < len / 2 + step; tx += step) g.fillRect(tx, -wid / 2, 1.3, wid);
    g.fillStyle = lin(g, -len / 2, 0, len / 2, 0, [[0, 'rgba(0,0,0,0.55)'], [0.25, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
    g.fillRect(-len / 2, -wid / 2, len, wid);
    g.restore();
    g.restore();
  }

  /* ---------- the intro ---------- */

  var running = null;

  function play() {
    if (running) return;

    var wrap = document.getElementById('mow-intro');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'mow-intro'; document.body.appendChild(wrap); }
    wrap.innerHTML = ''; wrap.className = '';
    root.classList.add('intro-playing');
    root.classList.remove('intro-done');
    var W = wrap.clientWidth || window.innerWidth, H = wrap.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var cv = document.createElement('canvas');
    cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.setAttribute('aria-hidden', 'true');
    wrap.appendChild(cv);
    var skipBtn = document.createElement('button');
    skipBtn.type = 'button'; skipBtn.className = 'mow-skip'; skipBtn.textContent = 'Skip';
    wrap.appendChild(skipBtn);
    var ctx = cv.getContext('2d');

    // rows sized to the screen: a phone gets a smaller mower and more passes
    var target = Math.max(105, Math.min(200, Math.min(W, H) * 0.27));
    var rows = Math.max(3, Math.round(H / target));
    var rowH = H / rows;
    var s = rowH * 1.08 / 100;            // px per mower unit (cut width = 108% of a row)
    var r = rowH / 2;                      // turning radius

    var work = makeGrass(W, H, dpr);      // grass still standing
    var wg = work.getContext('2d');
    wg.setTransform(dpr, 0, 0, dpr, 0, 0);
    var fresh = document.createElement('canvas');    // just-cut stripes that fade away
    fresh.width = work.width; fresh.height = work.height;
    var fg = fresh.getContext('2d');
    fg.setTransform(dpr, 0, 0, dpr, 0, 0);
    var unscale = new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]);
    var pats = [cutTile(dpr, true), cutTile(dpr, false)].map(function (t) {
      var p = fg.createPattern(t, 'repeat'); if (p.setTransform) p.setTransform(unscale); return p;
    });
    var body = bodySprite(s * dpr);
    var shadows = shadowSprites(s * dpr);

    // path: serpentine rows with U-turns just past each edge
    var front = 60 * s, rear = 54 * s, tail = 262 * s;
    var segs = [], total = 0;
    function addLine(x0, y0, x1, row) {
      var len = Math.abs(x1 - x0);
      segs.push({ type: 'line', x0: x0, y0: y0, x1: x1, len: len, start: total, row: row });
      total += len;
    }
    function addTurn(cx, cy, right, row) {
      var len = Math.PI * r;
      segs.push({ type: 'turn', cx: cx, cy: cy, right: right, len: len, start: total, row: row });
      total += len;
    }
    for (var i = 0; i < rows; i++) {
      var y = rowH * (i + 0.5), ltr = i % 2 === 0, last = i === rows - 1;
      var xs = i === 0 ? -front - 4 : (ltr ? -rear : W + rear);
      var xe = ltr ? W + rear + (last ? tail : 0) : -rear - (last ? tail : 0);
      addLine(xs, y, xe, i);
      if (!last) addTurn(xe, y + r, ltr, i);
    }

    function poseAt(d) {
      d = Math.max(0, Math.min(total - 0.001, d));
      for (var k = 0; k < segs.length; k++) {
        var sg = segs[k];
        if (d <= sg.start + sg.len) {
          var u = (d - sg.start) / sg.len;
          if (sg.type === 'line') return { x: sg.x0 + (sg.x1 - sg.x0) * u, y: sg.y0, a: sg.x1 > sg.x0 ? 0 : Math.PI, row: sg.row };
          var th = u * Math.PI;
          if (sg.right) return { x: sg.cx + r * Math.sin(th), y: sg.cy - r * Math.cos(th), a: th, row: sg.row };
          return { x: sg.cx - r * Math.sin(th), y: sg.cy - r * Math.cos(th), a: Math.PI - th, row: sg.row };
        }
      }
      return { x: 0, y: 0, a: 0, row: rows - 1 };
    }

    // the strip the blade cuts at a pose
    function cutPath(g, p) {
      var ca = Math.cos(p.a), sa = Math.sin(p.a);
      g.beginPath();
      [[-44, -54], [50, -54], [50, 54], [-44, 54]].forEach(function (q, k) {
        var x = p.x + (q[0] * ca - q[1] * sa) * s, y = p.y + (q[0] * sa + q[1] * ca) * s;
        if (k) g.lineTo(x, y); else g.moveTo(x, y);
      });
      g.closePath();
    }

    var duration = Math.max(3.6, Math.min(5.2, 2.6 + rows * 0.32)); // seconds of mowing
    var speed = total / duration;
    var hold = 0.35;                       // a beat of untouched grass first
    var clippings = [];
    var lastD = 0, lastT = null, t0 = null, done = false, raf = 0;
    var clipColors = ['#4f7c2d', '#5a8834', '#6d9a40', '#3f6726', '#7fa94c', '#86ad55'];

    // a light spill of clippings from under the deck edges
    function emit(p, dt) {
      if (p.x < -60 || p.x > W + 60) return;
      var n = Math.round(dt * 160);
      var ca = Math.cos(p.a), sa = Math.sin(p.a);
      for (var k = 0; k < n; k++) {
        var side = Math.random() < 0.5 ? -1 : 1;
        var lx = rand(-50, 30), ly = side * rand(50, 56);
        var dir = p.a + side * Math.PI / 2 + rand(-0.5, 0.5);
        var sp = rand(20, 90) * (s / 1.6);
        clippings.push({
          x: p.x + (lx * ca - ly * sa) * s, y: p.y + (lx * sa + ly * ca) * s,
          vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp,
          rot: rand(0, Math.PI), vr: rand(-6, 6), life: 0, max: rand(0.25, 0.55),
          l: rand(1.4, 3) * Math.min(1.3, s / 1.4), c: pick(clipColors)
        });
      }
    }

    function step(now) {
      if (done) return false;
      if (t0 === null) { t0 = now; lastT = now; }
      var t = (now - t0) / 1000;
      if (freezeAt !== null) t = Math.min(t, freezeAt);
      var dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
      lastT = now;

      var mt = Math.max(0, t - hold);
      var d = mt < 0.5 ? speed * (mt * mt) : speed * (mt - 0.25);   // ease in, then steady
      d = Math.min(total, d);
      var p = poseAt(d);

      // cut along the path since the last frame
      wg.globalCompositeOperation = 'destination-out';
      wg.fillStyle = '#000';
      var steps = Math.max(1, Math.ceil((d - lastD) / 5));
      for (var k = 1; k <= steps; k++) {
        var q = poseAt(lastD + (d - lastD) * k / steps);
        cutPath(wg, q); wg.fill();
        fg.fillStyle = pats[q.row % 2];
        cutPath(fg, q); fg.fill();
      }
      wg.globalCompositeOperation = 'source-over';
      // fresh stripes fade, letting the page come through
      fg.globalCompositeOperation = 'destination-out';
      fg.fillStyle = 'rgba(0,0,0,' + (1 - Math.exp(-dt / 0.6)) + ')';
      fg.fillRect(0, 0, W, H);
      fg.globalCompositeOperation = 'source-over';
      if (d > lastD) emit(p, dt);
      lastD = d;

      // compose: cut stripes, then standing grass casting a soft shadow onto them
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(fresh, 0, 0);
      ctx.globalAlpha = 0.93;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 5 * dpr; ctx.shadowOffsetX = 1.5 * dpr; ctx.shadowOffsetY = 2.5 * dpr;
      ctx.drawImage(work, 0, 0);
      ctx.shadowColor = 'transparent';
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // shadows (light from the top-left, so the offset stays put while the mower turns)
      var B = BOUNDS;
      function place(img, ox, oy, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x + ox * s, p.y + oy * s); ctx.rotate(p.a); ctx.scale(s, s);
        ctx.drawImage(img, B.x, B.y, B.w, B.h);
        ctx.restore();
      }
      place(shadows.deck, 4, 6, 0.42);
      place(shadows.handle, 14, 20, 0.28);

      // mower
      var jx = Math.sin(now * 0.09) * 0.25, jy = Math.cos(now * 0.117) * 0.25; // engine idle shake
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(s, s);
      var roll = d / s;
      drawWheel(ctx, 26, -55, 34, 10, roll);
      drawWheel(ctx, 26, 55, 34, 10, roll);
      drawWheel(ctx, -35, -56.5, 44, 11.5, roll * 0.78);
      drawWheel(ctx, -35, 56.5, 44, 11.5, roll * 0.78);
      ctx.translate(jx, jy);
      ctx.drawImage(body, B.x, B.y, B.w, B.h);
      ctx.restore();

      // clippings fly out of the chute and settle
      for (var c2 = clippings.length - 1; c2 >= 0; c2--) {
        var cl = clippings[c2]; cl.life += dt;
        if (cl.life > cl.max) { clippings.splice(c2, 1); continue; }
        var drag = Math.exp(-dt * 5);
        cl.vx *= drag; cl.vy *= drag; cl.x += cl.vx * dt; cl.y += cl.vy * dt; cl.rot += cl.vr * dt * drag;
        var lu = cl.life / cl.max;
        ctx.save();
        ctx.globalAlpha = lu < 0.6 ? 0.95 : 0.95 * (1 - lu) / 0.4;
        ctx.translate(cl.x, cl.y); ctx.rotate(cl.rot);
        ctx.fillStyle = cl.c;
        ctx.fillRect(-cl.l / 2, -0.5, cl.l, 1);
        ctx.restore();
      }

      if (d >= total && clippings.length === 0) { finish(false); return false; }
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
      setTimeout(function () { wrap.remove(); running = null; }, skipped ? 450 : 650);
    }
    function onSkip(e) {
      if (e && e.type === 'keydown' && /^(Shift|Meta|Alt|Control)$/.test(e.key)) return;
      if (e && e.type === 'click') { e.preventDefault(); e.stopPropagation(); }
      finish(true);
    }

    running = { finish: finish };
    if (freezeAt !== null) {
      // debug: draw that exact moment and hold it
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

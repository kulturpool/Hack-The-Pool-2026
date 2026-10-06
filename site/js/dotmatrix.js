/* Dot-Matrix-Wortmarke
   Rendert "HACK THE POOL" als leuchtende Punktmatrix, frei nach dem Titel aus "Hackers".
   Die Punkte fliegen beim Start zusammen, weichen dem Mauszeiger aus und zerstreuen sich beim Scrollen.
   new DotMatrix(canvas, { box, lines }) → .state { assemble, scatter }, .assemble(dur), .burst(), .setActive(bool), .setTurbo(bool) */
(function () {
  "use strict";

  function makeSprite() {
    var s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    var g = c.getContext("2d");
    function blob(x, color, a) {
      var r = g.createRadialGradient(x, 32, 0, x, 32, 30);
      r.addColorStop(0, color.replace("A", a));
      r.addColorStop(0.35, color.replace("A", a * 0.45));
      r.addColorStop(1, color.replace("A", 0));
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    }
    g.globalCompositeOperation = "lighter";
    blob(29, "rgba(61,242,255,A)", 0.55);
    blob(35, "rgba(255,43,209,A)", 0.55);
    blob(32, "rgba(150,100,255,A)", 0.6);
    var core = g.createRadialGradient(32, 32, 0, 32, 32, 13);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(0.55, "rgba(250,245,255,1)");
    core.addColorStop(1, "rgba(220,200,255,0)");
    g.fillStyle = core; g.fillRect(0, 0, s, s);
    return c;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function DotMatrix(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.box = opts.box || canvas.parentElement;
    this.ctx = canvas.getContext("2d");
    this.sprite = makeSprite();
    this.state = { assemble: opts.assembled ? 1.5 : 0, scatter: 0 };
    this.dots = [];
    this.mouse = { x: -1e4, y: -1e4 };
    this.active = true;
    this.turbo = opts.turbo !== false;
    this.running = false;
    this.t = 0;
    this.glitch = { until: 0, y0: 0, y1: 0, dx: 0, next: 3000 };
    var self = this;
    this._frame = function (now) { self.raf = requestAnimationFrame(self._frame); self.render(now); };
    window.addEventListener("pointermove", function (e) {
      var r = self.canvas.getBoundingClientRect();
      self.mouse.x = e.clientX - r.left; self.mouse.y = e.clientY - r.top;
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () { self.mouse.x = self.mouse.y = -1e4; });
    this.layout();
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var w = self.box.clientWidth; if (Math.abs(w - self.W) > 2 || window.innerHeight !== self.vh) self.layout(true); }, 140);
    });
  }

  DotMatrix.prototype.layout = function (keep) {
    var W = this.box.clientWidth, vh = window.innerHeight;
    this.W = W; this.vh = vh;
    var stacked = W / vh < 2.05 || W < 720;
    var lines = stacked ? ["HACK THE", "POOL"] : ["HACK THE POOL"];
    var m = document.createElement("canvas").getContext("2d");
    var family = "Anybody, 'Arial Black', Impact, sans-serif";
    function setFont(ctx, px) {
      ctx.font = "900 " + px + "px " + family;
      if ("fontStretch" in ctx) ctx.fontStretch = "expanded";
    }
    setFont(m, 100);
    var cap = m.measureText("H").actualBoundingBoxAscent / 100 || 0.72;
    var metrics = lines.map(function (l) {
      var mm = m.measureText(l);
      var left = mm.actualBoundingBoxLeft || 0, right = mm.actualBoundingBoxRight || mm.width;
      return { text: l, w: left + right, left: left };
    });
    var sizes = metrics.map(function (mt) { return 100 * W / mt.w; });
    var gapRatio = 0.11;
    var total = sizes.reduce(function (a, s) { return a + s * cap; }, 0) + (lines.length - 1) * sizes[0] * cap * gapRatio;
    var maxTotal = vh * (stacked ? (W < 720 ? 0.36 : 0.47) : 0.3);
    var k = total > maxTotal ? maxTotal / total : 1;
    sizes = sizes.map(function (s) { return s * k; });

    var pitch = Math.max(4, Math.round(Math.min.apply(null, sizes) * cap / 11.5));
    var gap = Math.round(sizes[0] * cap * gapRatio);
    var H = Math.ceil(sizes.reduce(function (a, s) { return a + s * cap; }, 0) + gap * (lines.length - 1));
    this.H = H; this.pitch = pitch;

    var padX = Math.round(Math.min(180, window.innerWidth * 0.12));
    var padY = Math.round(Math.min(220, vh * 0.22));
    this.padX = padX; this.padY = padY;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.box.style.height = H + "px";
    var cw = W + padX * 2, ch = H + padY * 2;
    var c = this.canvas;
    c.style.position = "absolute";
    c.style.left = -padX + "px"; c.style.top = -padY + "px";
    c.style.width = cw + "px"; c.style.height = ch + "px";
    c.style.pointerEvents = "none";
    c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);

    // Text in eine Maske zeichnen und abtasten
    var off = document.createElement("canvas");
    off.width = Math.ceil(W); off.height = Math.max(1, H);
    var o = off.getContext("2d");
    o.fillStyle = "#fff";
    var y = 0;
    lines.forEach(function (l, i) {
      setFont(o, sizes[i]);
      y += sizes[i] * cap;
      o.fillText(l, metrics[i].left * sizes[i] / 100, y);
      y += gap;
    });
    var data = o.getImageData(0, 0, off.width, off.height).data, ow = off.width, oh = off.height;
    function a(x, yy) { x = x | 0; yy = yy | 0; if (x < 0 || yy < 0 || x >= ow || yy >= oh) return 0; return data[(yy * ow + x) * 4 + 3] / 255; }

    var old = keep ? this.dots : null;
    var dots = [], q = pitch * 0.28;
    for (var gy = pitch / 2; gy < H; gy += pitch) {
      for (var gx = pitch / 2; gx < W; gx += pitch) {
        var cov = (a(gx, gy) * 2 + a(gx - q, gy - q) + a(gx + q, gy - q) + a(gx - q, gy + q) + a(gx + q, gy + q)) / 6;
        if (cov < 0.22) continue;
        var ang = Math.random() * Math.PI * 2, dist = 0.6 + Math.random() * 1.4;
        dots.push({
          tx: gx + padX, ty: gy + padY,
          r: pitch * 0.5 * (0.62 + 0.38 * cov),
          sx: padX + W / 2 + Math.cos(ang) * W * 0.7 * dist,
          sy: padY + H / 2 + Math.sin(ang) * (H + padY) * dist,
          vx: (gx - W / 2) * (0.8 + Math.random() * 1.6) + (Math.random() - 0.5) * 260,
          vy: (gy - H / 2) * (1.2 + Math.random() * 2.5) - Math.random() * 380,
          delay: (gx / W) * 0.7 + Math.random() * 0.3,
          ph: Math.random() * 6.283, sp: 0.6 + Math.random() * 1.6,
          dead: Math.random() < 0.025,
          ox: 0, oy: 0
        });
      }
    }
    this.dots = dots;
    if (old && !this.running) this.render(performance.now());
    if (!this.running) this.render(performance.now());
  };

  DotMatrix.prototype.render = function (now) {
    var ctx = this.ctx, dpr = this.dpr, S = this.state, dots = this.dots, sprite = this.sprite;
    var cw = this.canvas.width / dpr, ch = this.canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = "lighter";
    var t = now || 0, A = S.assemble * 1.45, sc = S.scatter;
    var mx = this.mouse.x, my = this.mouse.y, R = Math.max(70, this.pitch * 9), R2 = R * R;
    var band = ((t * 0.00022) % 1.7) - 0.35;
    var W = this.W, padX = this.padX, still = !this.turbo;
    var g = this.glitch;
    if (!still && t > g.next) {
      g.until = t + 90 + Math.random() * 120;
      g.y0 = this.padY + Math.random() * this.H; g.y1 = g.y0 + this.pitch * (1 + Math.random() * 4);
      g.dx = (Math.random() < 0.5 ? -1 : 1) * this.pitch * (1 + Math.random() * 3);
      g.next = t + 2600 + Math.random() * 4200;
    }
    var glitching = t < g.until;
    for (var i = 0, n = dots.length; i < n; i++) {
      var d = dots[i];
      var k = clamp((A - d.delay) / 0.45, 0, 1);
      if (k <= 0) continue;
      k = 1 - (1 - k) * (1 - k) * (1 - k);
      var x = d.sx + (d.tx - d.sx) * k, y = d.sy + (d.ty - d.sy) * k;
      if (sc > 0) { x += d.vx * sc; y += d.vy * sc; }
      if (glitching && d.ty > g.y0 && d.ty < g.y1) x += g.dx;
      if (!still) {
        var dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy, txo = 0, tyo = 0;
        if (d2 < R2) {
          var dist = Math.sqrt(d2) || 1, f = 1 - dist / R;
          f = f * f * this.pitch * 3.2;
          txo = dx / dist * f; tyo = dy / dist * f;
        }
        d.ox += (txo - d.ox) * 0.16; d.oy += (tyo - d.oy) * 0.16;
        x += d.ox; y += d.oy;
      }
      var b = still ? 0.95 : 0.8 + 0.2 * Math.sin(t * 0.0021 * d.sp + d.ph);
      if (!still) {
        var bx = (d.tx - padX) / W - band;
        if (bx > -0.07 && bx < 0.07) b += (1 - Math.abs(bx) / 0.07) * 0.75;
        if (d.dead && ((t / 700 + d.ph) % 6) < 0.6) b *= 0.2;
      }
      var alpha = (b > 1 ? 1 : b) * (1 - sc * 0.92) * (0.35 + 0.65 * k);
      if (alpha <= 0.01) continue;
      var size = d.r * 4.6 * (0.92 + 0.16 * (b > 1 ? 1 : b));
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  DotMatrix.prototype.start = function () {
    if (this.running || !this.active) return;
    this.running = true;
    this.raf = requestAnimationFrame(this._frame);
  };
  DotMatrix.prototype.stop = function () {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.render(performance.now());
  };
  DotMatrix.prototype.setActive = function (on) {
    this.active = !!on;
    if (this.active && (this.turbo || this.state.assemble < 1.4)) this.start(); else this.stop();
  };
  DotMatrix.prototype.setTurbo = function (on) {
    this.turbo = !!on;
    if (this.turbo) this.start(); else { this.state.assemble = 1.5; this.stop(); }
  };
  DotMatrix.prototype.assemble = function (duration) {
    var self = this;
    this.start();
    if (!window.gsap) { this.state.assemble = 1.5; return null; }
    return window.gsap.fromTo(this.state, { assemble: 0 }, {
      assemble: 1.5, duration: duration || 2.4, ease: "power2.inOut",
      onComplete: function () { if (!self.turbo) self.stop(); }
    });
  };
  DotMatrix.prototype.burst = function () {
    if (!window.gsap || !this.turbo) return;
    window.gsap.timeline()
      .to(this.state, { scatter: 0.12, duration: 0.14, ease: "power2.out" })
      .to(this.state, { scatter: 0, duration: 1.1, ease: "elastic.out(1, 0.45)" });
  };

  window.DotMatrix = DotMatrix;
})();

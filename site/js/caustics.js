/* Pool-Licht
   Wasser-Kaustiken für das Finale: animierte Voronoi-Kanten mit Domain-Warp, als reines Licht
   (mix-blend-mode: screen) über dem Pool-Video, gerendert in halber Auflösung. API: window.Caustics.setActive(bool), .setTurbo(bool) */
(function () {
  "use strict";
  var canvas = document.querySelector(".finale__water");
  var stub = { setActive: function () {}, setTurbo: function () {} };
  if (!canvas) { window.Caustics = stub; return; }
  var gl = null;
  try { gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
  if (!gl) { window.Caustics = stub; return; }

  var VS = "attribute vec2 aP; void main() { gl_Position = vec4(aP, 0.0, 1.0); }";
  var FS = [
    "precision mediump float;",
    "uniform vec2 uRes; uniform float uTime;",
    "vec2 hash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }",
    "float cells(vec2 p, float t) {",
    "  vec2 n = floor(p), f = fract(p);",
    "  float d1 = 8.0, d2 = 8.0;",
    "  for (int j = -1; j <= 1; j++) {",
    "    for (int i = -1; i <= 1; i++) {",
    "      vec2 g = vec2(float(i), float(j));",
    "      vec2 o = 0.5 + 0.42 * sin(t + 6.2831 * hash2(n + g));",
    "      float d = length(g + o - f);",
    "      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }",
    "    }",
    "  }",
    "  return d2 - d1;",
    "}",
    "void main() {",
    "  vec2 q = gl_FragCoord.xy / uRes;",
    "  vec2 p = gl_FragCoord.xy / uRes.y * 3.6;",
    "  float t = uTime * 0.42;",
    "  p += 0.24 * vec2(sin(p.y * 1.3 + t), cos(p.x * 1.1 - t * 0.8));",
    "  float e1 = cells(p, t);",
    "  float e2 = cells(p * 1.8 + 3.1, t * 1.3);",
    "  float c = pow(1.0 - smoothstep(0.0, 0.17, e1), 2.4) * 0.85 + pow(1.0 - smoothstep(0.0, 0.1, e2), 2.0) * 0.4;",
    "  float depth = 0.25 + 0.75 * q.y;",
    "  vec3 col = c * mix(vec3(0.12, 0.75, 1.0), vec3(0.8, 1.0, 1.0), c) * depth * 0.75;",
    "  float rays = 0.07 * (0.5 + 0.5 * sin(q.x * 16.0 + sin(q.x * 6.0 + t) * 2.0 + t * 0.7)) * q.y * q.y;",
    "  col += vec3(0.3, 0.75, 1.0) * rays;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog, uRes, uTime;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) { window.Caustics = stub; return; }

  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aP = gl.getAttribLocation(prog, "aP");
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  uRes = gl.getUniformLocation(prog, "uRes");
  uTime = gl.getUniformLocation(prog, "uTime");

  var W = 0, H = 0, t = 4.2, last = 0, raf = 0, running = false;
  var active = false, turbo = document.documentElement.dataset.motion !== "calm";

  function resize() {
    var scale = 0.5;
    var w = Math.max(2, Math.round(canvas.clientWidth * scale)), h = Math.max(2, Math.round(canvas.clientHeight * scale));
    if (w === W && h === H) return;
    W = w; H = h; canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    draw();
  }
  function draw() {
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    t += Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    draw();
  }
  function update() {
    var should = active && turbo && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }

  resize();
  window.addEventListener("resize", function () { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
  document.addEventListener("visibilitychange", update);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { active = entries[0].isIntersecting; if (active) resize(); update(); }, { rootMargin: "100px" }).observe(canvas);
  }

  window.Caustics = {
    setActive: function (on) { active = !!on; update(); },
    setTurbo: function (on) { turbo = !!on; update(); }
  };
})();

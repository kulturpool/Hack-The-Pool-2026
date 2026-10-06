/* Stadt aus Text
   Ein Flug durch gläserne Datentürme, frei nach der Gibson aus "Hackers" (1995).
   Die Türme tragen Texturen aus EDM- und SPARQL-Fragmenten und, sobald geladen,
   echten Objekttiteln aus dem Kulturpool. Reines WebGL 1, keine Bibliothek.
   API: window.City.setTitles(list), .boost(velocity), .warp(seconds), .setActive(bool), .setTurbo(bool) */
(function () {
  "use strict";

  var stub = { setTitles: noop, boost: noop, warp: noop, setActive: noop, setTurbo: noop, ready: false };
  function noop() {}

  var canvas = document.getElementById("city");
  if (!canvas) { window.City = stub; return; }

  var gl = null;
  try {
    gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  } catch (e) { gl = null; }
  if (!gl) { document.documentElement.classList.add("no-webgl"); window.City = stub; return; }

  var LEN = 240;            // Korridorlänge, Vielfaches der Bodenkachel
  var TILE = 24;            // Bodenkachel in Welteinheiten
  var FAR = 150;
  var COLS = 8, ROWS = 4, ATLAS = 2048, PW = ATLAS / COLS, PH = ATLAS / ROWS;

  var TOKENS = [
    "edm:ProvidedCHO", "ore:Aggregation", "edm:aggregatedCHO", "dc:creator", "dc:title", "dcterms:created",
    "edm:dataProvider", "edm:isShownBy", "edm:isShownAt", "skos:prefLabel", "owl:sameAs", "dc:subject",
    "gnd:118540238", "wd:Q1741", "wd:Q40", "?cho a edm:ProvidedCHO .", "SELECT ?s ?p ?o", "FILTER(ISIRI(?x))",
    "SERVICE wikidata", "LIMIT 100", "GROUP BY ?creator", "ORDER BY DESC(?n)", "id.kulturpool.at/",
    "/v2/search?q=*", "/v2/similar?on=image", "vector_distance 0.0861", "mediaTypes:=image", "iiif manifest",
    "geonames:2761369", "iconclass 25H", "dcterms:spatial", "edm:rights CC BY", "CC0 1.0", "PFP person",
    "FEDERATED QUERY", "NIGHTLY DUMP", "full_records.tar.gz", "lookup.kulturpool.ai", "HUMAN IN THE LOOP"
  ];
  var HEADS = ["STATUS REPORT", "CONFIRM", "INITIATE", "ACCESS", "GARBAGE", "RESEARCH", "PROVIDED CHO", "AGGREGATION",
    "FEDERATED", "SIMILAR", "VECTORS", "OVERRIDE", "GRAPH", "LOOKUP", "DUMP 03:00", "CURIOSITY", "THE POOL"];
  var titles = [];

  function rnd(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, a) { return a[(r() * a.length) | 0]; }
  function hex(r, n) { var s = ""; for (var i = 0; i < n; i++) s += "0123456789ABCDEF"[(r() * 16) | 0]; return s; }

  /* ---------- Texturen ---------- */

  var atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = atlasCanvas.height = ATLAS;
  var ac = atlasCanvas.getContext("2d");
  var MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

  function drawPanel(i) {
    var r = rnd(i * 7919 + 17);
    var x0 = (i % COLS) * PW, y0 = Math.floor(i / COLS) * PH, pad = 12, w = PW - pad * 2;
    ac.save();
    ac.beginPath(); ac.rect(x0, y0, PW, PH); ac.clip();
    ac.fillStyle = "#000"; ac.fillRect(x0, y0, PW, PH);
    ac.fillStyle = "rgba(70,150,255,0.05)"; ac.fillRect(x0 + 5, y0 + 5, PW - 10, PH - 10);
    var y = y0 + pad, bottom = y0 + PH - pad;
    while (y < bottom - 14) {
      var k = r();
      if (k < 0.11) {
        var hw = w * (0.45 + r() * 0.55);
        ac.fillStyle = "rgba(185,240,255,0.9)"; ac.fillRect(x0 + pad, y, hw, 17);
        ac.fillStyle = "#000"; ac.font = "600 11px " + MONO; ac.fillText(pick(r, HEADS), x0 + pad + 6, y + 12.5);
        ac.beginPath(); ac.moveTo(x0 + pad + hw + 6, y + 2); ac.lineTo(x0 + pad + hw + 14, y + 8.5); ac.lineTo(x0 + pad + hw + 6, y + 15);
        ac.fillStyle = "rgba(185,240,255,0.9)"; ac.fill();
        y += 24;
      } else if (k < 0.19) {
        var n = 9 + ((r() * 12) | 0), bw = w / n;
        for (var b = 0; b < n; b++) {
          var bh = 3 + r() * 28;
          ac.fillStyle = r() < 0.14 ? "rgba(255,80,220,0.85)" : "rgba(140,230,255,0.75)";
          ac.fillRect(x0 + pad + b * bw, y + 30 - bh, bw - 2, bh);
        }
        y += 40;
      } else if (k < 0.27) {
        var bh2 = 24 + r() * 34;
        ac.strokeStyle = "rgba(150,230,255,0.75)"; ac.lineWidth = 1;
        ac.strokeRect(x0 + pad + 0.5, y + 0.5, w - 1, bh2);
        ac.fillStyle = "rgba(205,245,255,0.95)"; ac.font = "500 10px " + MONO;
        ac.fillText(pick(r, TOKENS).toUpperCase(), x0 + pad + 7, y + 15);
        if (bh2 > 40) ac.fillText(hex(r, 12), x0 + pad + 7, y + 31);
        y += bh2 + 9;
      } else if (k < 0.33) {
        y += 12 + r() * 34;
      } else {
        var lines = 2 + ((r() * 6) | 0);
        var size = r() < 0.18 ? 13 : (r() < 0.55 ? 10 : 9);
        ac.font = (r() < 0.3 ? "600 " : "400 ") + size + "px " + MONO;
        for (var l = 0; l < lines && y < bottom - size; l++) {
          var c = r(), s;
          if (c < 0.38 && titles.length) s = pick(r, titles);
          else if (c < 0.62) s = pick(r, TOKENS);
          else if (c < 0.82) s = hex(r, 8) + "-" + hex(r, 4) + "  " + ((r() * 9999) | 0);
          else s = pick(r, TOKENS) + " " + hex(r, 4);
          var a = (0.5 + r() * 0.5).toFixed(2), cc = r();
          ac.fillStyle = cc < 0.07 ? "rgba(255,90,225," + a + ")" : (cc < 0.16 ? "rgba(255,255,255," + a + ")" : "rgba(150,235,255," + a + ")");
          ac.fillText(String(s).toUpperCase().slice(0, 34), x0 + pad + (r() < 0.3 ? 14 : 0), y + size);
          y += size + 4;
        }
        y += 7;
      }
    }
    ac.restore();
  }

  function drawAtlas() { for (var i = 0; i < COLS * ROWS; i++) drawPanel(i); }

  function drawFloor() {
    var S = 1024, c = document.createElement("canvas");
    c.width = c.height = S;
    var g = c.getContext("2d"), r = rnd(4242);
    g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
    g.lineCap = "square"; g.lineJoin = "miter";
    function trace(pts, color, width, blur) {
      g.save();
      g.strokeStyle = color; g.lineWidth = width; g.shadowColor = color; g.shadowBlur = blur;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.stroke(); g.restore();
    }
    // Längsbusse: nahtlos in Flugrichtung, mit 45°-Versätzen wie auf einer Platine
    for (var k = 0; k < 10; k++) {
      var x = 70 + k * 95 + (r() * 30 - 15), pts = [[x, -24]], y = 0;
      while (true) {
        y += 70 + r() * 170;
        var j = (r() < 0.5 ? -1 : 1) * (18 + r() * 30), run = 30 + r() * 70;
        if (y + Math.abs(j) * 2 + run > S - 30) break;
        pts.push([x, y], [x + j, y + Math.abs(j)], [x + j, y + Math.abs(j) + run], [x, y + Math.abs(j) * 2 + run]);
        y += Math.abs(j) * 2 + run;
      }
      pts.push([x, S + 24]);
      var col = r() < 0.3 ? "rgba(148,102,255,0.95)" : "rgba(255,43,209,0.95)";
      trace(pts, col, r() < 0.3 ? 3 : 2, 14);
      if (r() < 0.5) trace(pts.map(function (p) { return [p[0] + 9, p[1]]; }), col, 1.4, 8);
    }
    // Querleitungen mit Lötpunkten
    for (var m = 0; m < 28; m++) {
      var yy = 30 + r() * (S - 90), xa = 30 + r() * (S - 300), len = 50 + r() * 200;
      var col2 = r() < 0.45 ? "rgba(61,242,255,0.8)" : "rgba(255,43,209,0.85)";
      trace([[xa, yy], [xa + len, yy], [xa + len + 18, yy + 18]], col2, 1.5, 8);
      g.save(); g.fillStyle = col2; g.shadowColor = col2; g.shadowBlur = 10;
      g.fillRect(xa - 4, yy - 4, 8, 8); g.fillRect(xa + len + 14, yy + 14, 8, 8); g.restore();
    }
    // Chips
    for (var q = 0; q < 6; q++) {
      var cx = 70 + r() * (S - 240), cy = 70 + r() * (S - 240), cw = 40 + r() * 60, ch = 30 + r() * 50;
      g.save(); g.strokeStyle = "rgba(160,120,255,0.7)"; g.lineWidth = 1.5; g.shadowBlur = 6; g.shadowColor = "rgba(160,120,255,0.9)";
      g.strokeRect(cx, cy, cw, ch); g.fillStyle = "rgba(160,120,255,0.65)";
      for (var p = 3; p < cw - 3; p += 8) { g.fillRect(cx + p, cy - 7, 3, 5); g.fillRect(cx + p, cy + ch + 2, 3, 5); }
      g.restore();
    }
    return c;
  }

  /* ---------- Shader ---------- */

  var VS_TOWER = [
    "attribute vec3 aPos; attribute vec2 aCenter; attribute vec2 aUV; attribute vec2 aSize; attribute vec3 aInfo;",
    "uniform mat4 uProj; uniform mat4 uView; uniform float uCamZ; uniform float uLen;",
    "varying vec2 vUV; varying vec2 vSize; varying vec3 vInfo; varying float vDepth;",
    "void main() {",
    "  float rel = mod(aCenter.y - uCamZ, uLen);",
    "  float z = uCamZ + rel - uLen + 6.0;",
    "  vec4 vp = uView * vec4(aCenter.x + aPos.x, aPos.y, z + aPos.z, 1.0);",
    "  vDepth = -vp.z; vUV = aUV; vSize = aSize; vInfo = aInfo;",
    "  gl_Position = uProj * vp;",
    "}"
  ].join("\n");

  var FS_TOWER = [
    "precision mediump float;",
    "uniform sampler2D uAtlas; uniform float uTime; uniform float uFar; uniform vec3 uColA; uniform vec3 uColB; uniform float uGain;",
    "varying vec2 vUV; varying vec2 vSize; varying vec3 vInfo; varying float vDepth;",
    "void main() {",
    "  vec3 tint = mix(uColA, uColB, vInfo.y);",
    "  float e = min(min(vUV.x, vSize.x - vUV.x), min(vUV.y, vSize.y - vUV.y));",
    "  float edge = exp(-e * 7.0) * 0.75 + exp(-e * 38.0) * 0.6;",
    "  vec3 txt = vec3(0.0);",
    "  if (vInfo.x >= 0.0) {",
    "    vec2 l = fract(vUV / vec2(5.0, 10.0));",
    "    vec2 cell = vec2(mod(vInfo.x, 8.0), floor(vInfo.x / 8.0));",
    "    txt = texture2D(uAtlas, (cell + vec2(l.x, 1.0 - l.y)) / vec2(8.0, 4.0)).rgb;",
    "    float band = 1.0 - clamp(abs(fract(vUV.y * 0.045 - uTime * 0.11 + vInfo.z) - 0.5) * 7.0, 0.0, 1.0);",
    "    txt *= 0.72 + 0.75 * band;",
    "  }",
    "  float flick = 0.9 + 0.1 * sin(uTime * (2.0 + vInfo.z * 5.0) + vInfo.z * 50.0);",
    "  vec3 col = txt * mix(vec3(1.0), tint, 0.4) * 1.3 * flick + tint * 0.028 + edge * mix(tint, vec3(1.0), 0.3);",
    "  float fog = smoothstep(uFar, uFar * 0.18, vDepth) * smoothstep(0.4, 5.0, vDepth);",
    "  gl_FragColor = vec4(col * fog * uGain, 1.0);",
    "}"
  ].join("\n");

  var VS_FLOOR = [
    "attribute vec2 aXZ;",
    "uniform mat4 uProj; uniform mat4 uView; uniform float uCamZ;",
    "varying vec2 vWorld; varying float vDepth;",
    "void main() {",
    "  vec3 w = vec3(aXZ.x, 0.0, aXZ.y + uCamZ);",
    "  vec4 vp = uView * vec4(w, 1.0);",
    "  vWorld = w.xz; vDepth = -vp.z;",
    "  gl_Position = uProj * vp;",
    "}"
  ].join("\n");

  var FS_FLOOR = [
    "precision mediump float;",
    "uniform sampler2D uFloor; uniform float uTime; uniform float uFar; uniform float uTile; uniform float uGain;",
    "varying vec2 vWorld; varying float vDepth;",
    "void main() {",
    "  vec3 tex = texture2D(uFloor, vWorld / uTile).rgb;",
    "  float pulse = pow(0.5 + 0.5 * sin(vWorld.y * 0.28797933 + uTime * 3.0), 12.0);",
    "  float center = 1.0 - smoothstep(5.0, 34.0, abs(vWorld.x));",
    "  float fog = smoothstep(uFar, uFar * 0.12, vDepth);",
    "  vec3 col = tex * (0.5 + 1.1 * pulse) * (0.3 + 0.7 * center);",
    "  gl_FragColor = vec4(col * fog * uGain, 1.0);",
    "}"
  ].join("\n");

  var VS_SKY = "attribute vec2 aP; void main() { gl_Position = vec4(aP, 0.0, 1.0); }";
  var FS_SKY = [
    "precision mediump float;",
    "uniform vec2 uRes; uniform float uHorizon; uniform float uGain;",
    "void main() {",
    "  vec2 p = gl_FragCoord.xy / uRes;",
    "  vec2 d = vec2((p.x - 0.5) * uRes.x / uRes.y, p.y - uHorizon);",
    "  float g = exp(-dot(d * vec2(1.6, 4.0), d * vec2(1.6, 4.0)) * 3.0);",
    "  vec3 col = vec3(0.024, 0.02, 0.043) + vec3(0.16, 0.08, 0.36) * g + vec3(0.1, 0.4, 0.55) * exp(-dot(d, d) * 90.0) * 0.6;",
    "  gl_FragColor = vec4(col * mix(0.6, 1.0, uGain), 1.0);",
    "}"
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var info = { p: p, a: {}, u: {} };
    var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES), nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, n;
    for (i = 0; i < na; i++) { n = gl.getActiveAttrib(p, i).name; info.a[n] = gl.getAttribLocation(p, n); }
    for (i = 0; i < nu; i++) { n = gl.getActiveUniform(p, i).name; info.u[n] = gl.getUniformLocation(p, n); }
    return info;
  }

  /* ---------- Geometrie ---------- */

  function buildTowers() {
    var r = rnd(1995), T = [];
    function add(x, z, w, d, h, tint) { T.push({ x: x, z: z, w: w, d: d, h: h, tint: tint, cell: (r() * 32) | 0, seed: r() }); }
    [-1, 1].forEach(function (side) {
      var z = 0;
      while (z < LEN - 4) {
        var w = 3 + r() * 4, d = 3 + r() * 5, h = 7 + r() * 27;
        add(side * (6.4 + r() * 1.8 + w / 2), -(z + d / 2), w, d, h, r() < 0.28 ? 1 : 0);
        z += d + 1.4 + r() * 4.8;
      }
      z = r() * 6;
      while (z < LEN - 6) {
        var w2 = 4 + r() * 6, d2 = 4 + r() * 7, h2 = 16 + r() * 42;
        add(side * (15.5 + r() * 7 + w2 / 2), -(z + d2 / 2), w2, d2, h2, r() < 0.4 ? 1 : 0);
        z += d2 + 2 + r() * 8;
      }
      z = r() * 10;
      while (z < LEN - 10) {
        var w3 = 6 + r() * 8, d3 = 6 + r() * 8, h3 = 30 + r() * 50;
        add(side * (32 + r() * 12 + w3 / 2), -(z + d3 / 2), w3, d3, h3, r() < 0.55 ? 1 : 0);
        z += d3 + 4 + r() * 14;
      }
    });
    return T;
  }

  function towerBuffers(T) {
    var v = [], idx = [], n = 0;
    function face(t, corners, uvs, size, cell) {
      for (var i = 0; i < 4; i++) {
        var c = corners[i];
        v.push(c[0], c[1], c[2], t.x, t.z, uvs[i][0], uvs[i][1], size[0], size[1], cell, t.tint, t.seed);
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
      n += 4;
    }
    T.forEach(function (t) {
      var w = t.w / 2, d = t.d / 2, h = t.h;
      face(t, [[-w, 0, d], [w, 0, d], [w, h, d], [-w, h, d]], [[0, 0], [t.w, 0], [t.w, h], [0, h]], [t.w, h], t.cell);
      face(t, [[w, 0, -d], [-w, 0, -d], [-w, h, -d], [w, h, -d]], [[0, 0], [t.w, 0], [t.w, h], [0, h]], [t.w, h], (t.cell + 9) % 32);
      face(t, [[w, 0, d], [w, 0, -d], [w, h, -d], [w, h, d]], [[0, 0], [t.d, 0], [t.d, h], [0, h]], [t.d, h], (t.cell + 5) % 32);
      face(t, [[-w, 0, -d], [-w, 0, d], [-w, h, d], [-w, h, -d]], [[0, 0], [t.d, 0], [t.d, h], [0, h]], [t.d, h], (t.cell + 13) % 32);
      face(t, [[-w, h, d], [w, h, d], [w, h, -d], [-w, h, -d]], [[0, 0], [t.w, 0], [t.w, t.d], [0, t.d]], [t.w, t.d], -1);
    });
    return { v: new Float32Array(v), i: new Uint16Array(idx) };
  }

  /* ---------- Mathe ---------- */

  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  }
  function lookAt(out, e, c, up) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz);
    zx /= l; zy /= l; zz /= l;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
    out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
    out[15] = 1;
    return out;
  }

  /* ---------- Setup ---------- */

  var progTower, progFloor, progSky, towerVBO, towerIBO, towerCount, floorVBO, skyVBO, atlasTex, floorTex;

  function texture(src, repeat) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    var aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  }

  function setup() {
    progTower = program(VS_TOWER, FS_TOWER);
    progFloor = program(VS_FLOOR, FS_FLOOR);
    progSky = program(VS_SKY, FS_SKY);

    var tb = towerBuffers(buildTowers());
    towerVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, towerVBO); gl.bufferData(gl.ARRAY_BUFFER, tb.v, gl.STATIC_DRAW);
    towerIBO = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, towerIBO); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tb.i, gl.STATIC_DRAW);
    towerCount = tb.i.length;

    floorVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, floorVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-90, 8, 90, 8, 90, -LEN, -90, 8, 90, -LEN, -90, -LEN]), gl.STATIC_DRAW);
    skyVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, skyVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    drawAtlas();
    atlasTex = texture(atlasCanvas, false);
    floorTex = texture(drawFloor(), true);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  }

  /* ---------- Zustand ---------- */

  var proj = new Float32Array(16), view = new Float32Array(16);
  var W = 0, H = 0, dpr = 1;
  var camZ = 0, speed = 0, boostTarget = 0, boostV = 0, warpUntil = 0, warpV = 0;
  var yaw = 0, pitch = -0.05, ptrX = 0, ptrY = 0;
  var active = true, turbo = document.documentElement.dataset.motion !== "calm";
  var running = false, raf = 0, last = 0, clock = 0, gain = 0.8, lastDraw = 0;
  var COL_A = [0.34, 0.92, 1.0], COL_B = [0.62, 0.42, 1.0];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.5);
    var w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    if (w === W && h === H) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    var aspect = W / H;
    perspective(proj, (aspect < 1 ? 74 : 62) * Math.PI / 180, aspect, 0.1, 400);
    if (!running) draw();
  }

  function draw() {
    var t = clock;
    var ex = Math.sin(t * 0.21) * 0.35, ey = 2.5 + Math.sin(t * 0.47) * 0.07;
    var e = [ex, ey, camZ];
    var c = [ex + Math.sin(yaw), ey + Math.sin(pitch), camZ - Math.cos(yaw)];
    lookAt(view, e, c, [Math.sin(t * 0.09) * 0.025, 1, 0]);

    gl.clearColor(0.024, 0.02, 0.043, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);

    // Himmel
    gl.useProgram(progSky.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyVBO);
    gl.enableVertexAttribArray(progSky.a.aP);
    gl.vertexAttribPointer(progSky.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(progSky.u.uRes, W, H);
    gl.uniform1f(progSky.u.uHorizon, 0.5 - pitch * 0.83);
    gl.uniform1f(progSky.u.uGain, gain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(progSky.a.aP);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Boden
    gl.useProgram(progFloor.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, floorVBO);
    gl.enableVertexAttribArray(progFloor.a.aXZ);
    gl.vertexAttribPointer(progFloor.a.aXZ, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(progFloor.u.uProj, false, proj);
    gl.uniformMatrix4fv(progFloor.u.uView, false, view);
    gl.uniform1f(progFloor.u.uCamZ, camZ);
    gl.uniform1f(progFloor.u.uTime, t);
    gl.uniform1f(progFloor.u.uFar, FAR);
    gl.uniform1f(progFloor.u.uTile, TILE);
    gl.uniform1f(progFloor.u.uGain, gain);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, floorTex);
    gl.uniform1i(progFloor.u.uFloor, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(progFloor.a.aXZ);

    // Türme
    var P = progTower, stride = 12 * 4;
    gl.useProgram(P.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, towerVBO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, towerIBO);
    var layout = [["aPos", 3, 0], ["aCenter", 2, 3], ["aUV", 2, 5], ["aSize", 2, 7], ["aInfo", 3, 9]];
    layout.forEach(function (l) {
      var loc = P.a[l[0]];
      if (loc === undefined || loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, l[1], gl.FLOAT, false, stride, l[2] * 4);
    });
    gl.uniformMatrix4fv(P.u.uProj, false, proj);
    gl.uniformMatrix4fv(P.u.uView, false, view);
    gl.uniform1f(P.u.uCamZ, camZ);
    gl.uniform1f(P.u.uLen, LEN);
    gl.uniform1f(P.u.uTime, t);
    gl.uniform1f(P.u.uFar, FAR);
    gl.uniform1f(P.u.uGain, gain);
    gl.uniform3fv(P.u.uColA, COL_A);
    gl.uniform3fv(P.u.uColB, COL_B);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(P.u.uAtlas, 0);
    gl.drawElements(gl.TRIANGLES, towerCount, gl.UNSIGNED_SHORT, 0);
    layout.forEach(function (l) { var loc = P.a[l[0]]; if (loc !== undefined && loc >= 0) gl.disableVertexAttribArray(loc); });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    // gedimmt reichen 30 fps
    var dim = parseFloat(canvas.style.opacity || "1") < 0.5;
    if (dim && now - lastDraw < 32) return;
    lastDraw = now;

    clock += dt;
    boostV += (boostTarget - boostV) * Math.min(1, dt * 3);
    boostTarget *= Math.pow(0.08, dt);
    var warp = now < warpUntil ? warpV : 0;
    speed += ((1.7 + boostV + warp) - speed) * Math.min(1, dt * 2.5);
    camZ -= speed * dt;
    if (camZ < -LEN) camZ += LEN;

    yaw += ((ptrX * 0.09 + Math.sin(clock * 0.11) * 0.035) - yaw) * Math.min(1, dt * 2);
    pitch += ((-0.055 - ptrY * 0.045) - pitch) * Math.min(1, dt * 2);
    draw();
  }

  function start() {
    if (running || !active || !turbo || document.hidden) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false; cancelAnimationFrame(raf);
  }

  try { setup(); } catch (err) {
    document.documentElement.classList.add("no-webgl");
    window.City = stub;
    if (window.console) console.warn("[city]", err);
    return;
  }

  resize();
  clock = 12.3; camZ = -37;
  draw();

  window.addEventListener("resize", function () { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
  window.addEventListener("pointermove", function (e) {
    ptrX = (e.clientX / window.innerWidth) * 2 - 1;
    ptrY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); stop(); document.documentElement.classList.add("no-webgl"); });

  // Schrift abwarten, dann Texturen mit Plex Mono neu zeichnen
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load("600 11px 'IBM Plex Mono'"), new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
      drawAtlas();
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, atlasCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      if (!running) draw();
    });
  }

  window.City = {
    ready: true,
    setTitles: function (list) {
      titles = (list || []).filter(Boolean).map(function (s) { return String(s).replace(/\s+/g, " ").trim(); }).slice(0, 80);
      var job = function () {
        drawAtlas();
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, atlasCanvas);
        gl.generateMipmap(gl.TEXTURE_2D);
        if (!running) draw();
      };
      if (window.requestIdleCallback) requestIdleCallback(job, { timeout: 1500 }); else setTimeout(job, 60);
    },
    boost: function (velocity) { boostTarget = Math.max(boostTarget, Math.min(36, Math.abs(velocity || 0) / 90)); },
    warp: function (seconds) { warpUntil = performance.now() + (seconds || 2) * 1000; warpV = 70; start(); },
    setActive: function (on) { active = !!on; if (active) start(); else stop(); },
    setTurbo: function (on) { turbo = !!on; if (turbo) start(); else { stop(); draw(); } }
  };

  start();
})();

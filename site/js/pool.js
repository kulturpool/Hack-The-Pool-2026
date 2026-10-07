/* Kleiner Client für die Kulturpool-API (ohne Key, ohne Rate Limits).
   window.Pool.search(q, opts), .similar(id, n), .stats(), .centuries(buckets), .ping(), .sparqlPing(), .doc(hit) */
(function () {
  "use strict";
  var API = "https://api.kulturpool.at";
  var SPARQL = "https://sparql.kulturpool.at/query";
  var FIELDS = "uuid,id,title,dataProvider,previewImage,url,date";

  function qs(o) {
    return Object.keys(o).filter(function (k) { return o[k] !== undefined && o[k] !== null && o[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(o[k]); }).join("&");
  }

  function get(url, timeout, accept) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, timeout || 9000) : 0;
    var t0 = performance.now();
    return fetch(url, { signal: ctl ? ctl.signal : undefined, headers: { Accept: accept || "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) { if (j && typeof j === "object") j.__ms = Math.round(performance.now() - t0); clearTimeout(timer); return j; },
            function (e) { clearTimeout(timer); throw e; });
  }

  function clean(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (/^\[.*\]$/.test(s)) s = s.slice(1, -1);
    return s || "Ohne Titel";
  }

  window.Pool = {
    api: API,
    search: function (q, opts) {
      opts = opts || {};
      return get(API + "/v2/search?" + qs({
        q: q || "*", per_page: opts.perPage || 12, page: opts.page || 1,
        filter_by: opts.images ? "mediaTypes:=image" : null, include_fields: FIELDS
      }));
    },
    similar: function (id, n) {
      return get(API + "/v2/similar?" + qs({ id: id, on: "image", per_page: n || 12 }));
    },
    stats: function () {
      return get(API + "/v2/search?" + qs({
        q: "*", per_page: 1, include_fields: "uuid", max_facet_values: 300,
        facet_by: "dataProvider,edmType,imageColor,edmRightsReusePolicy,hasIiifManifest,edmRightsName,imageOrientation,dcType"
      }), 15000);
    },
    // Objekte pro Jahrhundert, gezählt über Bereichsfilter auf dateMin (Unix-Sekunden)
    centuries: function (buckets) {
      var ts = function (y) { return Math.floor(Date.UTC(y, 0, 1) / 1000); };
      return Promise.all(buckets.map(function (b) {
        var f = b.from === null ? "dateMin:<" + ts(b.to) : "dateMin:[" + ts(b.from) + ".." + (ts(b.to) - 1) + "]";
        return get(API + "/v2/search?" + qs({ q: "*", per_page: 1, include_fields: "uuid", filter_by: f }), 15000)
          .then(function (j) { return { label: b.label, short: b.short, n: j.found || 0 }; });
      }));
    },
    ping: function () {
      var t0 = performance.now();
      return get(API + "/v2/search?" + qs({ q: "ping", per_page: 1, include_fields: "uuid" }), 8000)
        .then(function () { return Math.round(performance.now() - t0); });
    },
    sparqlPing: function () {
      var t0 = performance.now();
      return get(SPARQL + "?" + qs({ query: "ASK { ?s ?p ?o }" }), 9000, "application/sparql-results+json")
        .then(function () { return Math.round(performance.now() - t0); });
    },
    doc: function (hit) {
      var d = (hit && hit.document) || hit || {};
      var id = d.uuid || d.id;
      return {
        id: id,
        title: clean(d.title),
        provider: d.dataProvider || "",
        img: d.previewImage || "",
        url: d.url || ("https://kulturpool.at/objekte/" + id),
        date: Array.isArray(d.date) ? d.date[0] : (d.date || ""),
        dist: hit && typeof hit.vector_distance === "number" ? hit.vector_distance : null
      };
    }
  };
})();

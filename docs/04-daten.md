# 04 · Daten & APIs

## Kulturpool API

**[api.kulturpool.at/reference](https://api.kulturpool.at/reference/)**

Suche, Objekte, Ähnlichkeit, Institutionen, Inhalte — Endpunkte, Parameter und Beispiele stehen in der Referenz. Kein API-Key nötig, keine Rate Limits.

## Was außerhalb der API-Doku liegt

**SPARQL** — Endpunkt `https://sparql.kulturpool.at/query`, Editor unter [sparql.kulturpool.at](https://sparql.kulturpool.at/). Die Daten liegen im Europeana Data Model vor.

**Nightly Dumps** — [`s3.kpool.at/nightly/full_records.tar.gz`](https://s3.kpool.at/nightly/full_records.tar.gz), Vollabzug, täglich aktualisiert. Für alles, was lokal schneller geht als über die API.

**Wikidata-Lookup** — [lookup.kulturpool.ai](https://lookup.kulturpool.ai/), Ergebnisse des KI-gestützten Harmonisierungsprojekts. Grundlage der [Verification-Quest](03-quests.md#verification) und mit Vorsicht zu genießen, genau das ist der Punkt.

**Externe Graphen** für Federated Queries — [Wikidata](https://query.wikidata.org/sparql), [GND](https://lobid.org/gnd/api) ([Reconciliation](https://reconcile.gnd.network)), [GeoNames](https://www.geonames.org/export/), [Iconclass](https://iconclass.org/help/lod), [Europeana](https://api.europeana.eu/console/sparql/), PFP des ACDH.

**Werkzeuge** — [edmlib](https://pypi.org/project/edmlib/) für das Europeana Data Model, [qEndpoint](https://github.com/the-qa-company/qEndpoint) für einen lokalen Wikidata-Triplestore.

**LLM-Zugang** — Token-Kontingente für [OpenRouter](https://openrouter.ai/) und [Replicate](https://replicate.com/) sowie Zugang zum [DHInfra GPU-Cluster](https://www.dhinfra.at/gpu-cluster/). Zugangsdaten gibt es am ersten Tag vor Ort.

---

[← Quests](03-quests.md) · [Übersicht](../README.md) · [Weiter: Queries →](05-queries.md)

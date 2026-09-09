# 04 · Daten & APIs

Alle Zugänge auf einen Blick. Was hier steht, ist offen zugänglich — kein API-Key nötig, keine Rate Limits (Ausnahme: Bild-Upload bei der Ähnlichkeitssuche).

## Kulturpool API

**Basis:** `https://api.kulturpool.at` · [Dokumentation](https://api.kulturpool.at/reference) · [OpenAPI-Spec](https://api.kulturpool.at/openapi.json)

| Endpunkt | Zweck |
|---|---|
| `GET /v2/search` | Volltextsuche über Digitalisate, redaktionelle Inhalte und Institutionen, mit Facetten |
| `GET /v2/search/federated` | Suche über mehrere Sammlungen in einem Request |
| `GET /v2/similar` | Ähnlichkeitssuche über Text-Vektoren |
| `POST /v2/similar/image` | Ähnlichkeitssuche über Bild-Vektoren (Upload) |
| `GET /v2/object` | Einzelobjekt inkl. voller Metadaten |
| `GET /institutions` | Datenliefernde Institutionen |
| `GET /content` | Redaktionelle Inhalte |

## SPARQL

**Endpunkt:** `https://sparql.kulturpool.at/query` · **Editor (YASGUI):** [sparql.kulturpool.at](https://sparql.kulturpool.at/)

Die Kulturpool-Daten liegen im [Europeana Data Model](https://pro.europeana.eu/page/edm-documentation) vor. Der Editor bringt bereits ein Federated-Query-Beispiel gegen Wikidata und GND mit. Weitere Abfragen sammeln wir in [05 · Queries](05-queries.md).

## Dumps

**Vollabzug, täglich aktualisiert:** [`s3.kpool.at/nightly/full_records.tar.gz`](https://s3.kpool.at/nightly/full_records.tar.gz)

Für alles, was lokal schneller geht als über die API — Statistik, Data-Quality-Analysen, eigene Indizes.

## Wikidata-Lookup

**[lookup.kulturpool.ai](https://lookup.kulturpool.ai/)**

Ergebnisse des KI-gestützten Harmonisierungsprojekts: Freitext-Felder wurden gegen Wikidata rekonziliiert, ein LLM hat die Kandidaten bewertet. Grundlage der [Verification-Quest](03-quests.md#verification) — und mit Vorsicht zu genießen, genau das ist der Punkt.

## Externe Graphen für Federated Queries

- [Wikidata Query Service](https://query.wikidata.org/sparql)
- [GND / lobid](https://lobid.org/gnd/api) · [Reconciliation](https://reconcile.gnd.network)
- [GeoNames](https://www.geonames.org/export/)
- [Iconclass](https://iconclass.org/help/lod)
- [Europeana SPARQL](https://api.europeana.eu/console/sparql/)
- Prosopographische Plattform Österreich (PFP) des ACDH — [Projektseite](https://www.oeaw.ac.at/de/acdh/forschung/dh-forschung-infrastruktur/aktivitaeten/dh-datenmodellierung/pfp-prosopographische-plattform-oesterreich)

## Werkzeuge

- [edmlib](https://pypi.org/project/edmlib/) — Python-Library für das Europeana Data Model
- [qEndpoint](https://github.com/the-qa-company/qEndpoint) — lokaler Wikidata-Triplestore, [Docker-Image](https://hub.docker.com/r/qacompany/qendpoint-wikidata)

## LLM-Zugang

Token-Kontingente für [OpenRouter](https://openrouter.ai/) und [Replicate](https://replicate.com/) sowie Zugang zum [DHInfra GPU-Cluster](https://www.dhinfra.at/gpu-cluster/) stehen für die Veranstaltung bereit. Die Zugangsdaten werden am ersten Tag vor Ort ausgegeben — sie gehören **nicht** ins Repo.

---

[← Quests](03-quests.md) · [Übersicht](../README.md) · [Weiter: Queries →](05-queries.md)

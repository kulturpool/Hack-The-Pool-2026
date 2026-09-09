# 05 · Queries

Sammelstelle für alles Abfragbare: SPARQL, API-Calls, Filterausdrücke, Tricks.

![Swordfish](gifs/swordfish-hack.gif)

## SPARQL

Endpunkt `https://sparql.kulturpool.at/query`, Editor unter [sparql.kulturpool.at](https://sparql.kulturpool.at/). Der Editor öffnet mit einem lauffähigen Federated-Query-Beispiel gegen Wikidata und GND — guter Ausgangspunkt zum Umbauen.

*Sammlung folgt.*

## REST-API

Basis `https://api.kulturpool.at`, [Referenz](https://api.kulturpool.at/reference/).

### Suche mit Facetten

```bash
curl -G https://api.kulturpool.at/v2/search \
  --data-urlencode "q=Gletscher" \
  --data-urlencode "facet_by=dataProvider" \
  --data-urlencode "per_page=5"
```

### Nach Institution filtern

```bash
curl -G https://api.kulturpool.at/v2/search \
  --data-urlencode "q=Porträt" \
  --data-urlencode "filter_by=dataProvider:=Österreichische Nationalbibliothek"
```

### Ähnliche Objekte

`on=metadata` sucht über Textvektoren, `on=image` über Bildvektoren.

```bash
curl "https://api.kulturpool.at/v2/similar?id=<UUID>&on=image&per_page=10"
```

Die UUID steht im Suchergebnis unter `hits[].document.id`.

## Beitragen

Neue Query? Rein damit — passender Abschnitt, kurze Überschrift, ein bis zwei Sätze was sie tut und wofür sie gut ist, dann der Codeblock. Lauffähig halten, Platzhalter als `<UUID>` markieren.

---

[← Daten & APIs](04-daten.md) · [Übersicht](../README.md) · [Weiter: Beispiele →](06-beispiele.md)

# 05 · Queries

Sammelstelle für alles Abfragbare: SPARQL, API-Calls, Filterausdrücke, Tricks. Unten stehen die Starter — der Rest kommt von uns allen.

![Swordfish](gifs/swordfish-hack.gif)

## SPARQL

Endpunkt `https://sparql.kulturpool.at/query`, Editor unter [sparql.kulturpool.at](https://sparql.kulturpool.at/).

### Objekte mit Titel

```sparql
PREFIX edm: <http://www.europeana.eu/schemas/edm/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>

SELECT ?cho ?title WHERE {
  ?cho a edm:ProvidedCHO ;
       dc:title ?title .
}
LIMIT 10
```

### Federated gegen Wikidata

Der YASGUI-Editor öffnet mit einem lauffähigen Beispiel im Tab *Kulturpool|Wikidata|GND*: Objekte ab 1920 mit GND-Creator, angereichert über den Wikidata-Service. Guter Ausgangspunkt zum Umbauen — Jahresfilter, Ergebnisfenster und die abgefragten Wikidata-Properties sind im Query kommentiert.

Muster für eigene Federated Queries:

```sparql
SERVICE <https://query.wikidata.org/sparql> {
  ?wdEntity wdtn:P227 ?gndUri .   # P227 = GND-ID
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
}
```

## REST-API

Basis `https://api.kulturpool.at`, [Referenz](https://api.kulturpool.at/reference).

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

Neue Query? Rein damit — passender Abschnitt, kurze Überschrift, ein bis zwei Sätze was sie tut und wofür sie gut ist, dann der Codeblock. Lauffähig halten, Platzhalter als `<UUID>` markieren, keine Keys.

---

[← Daten & APIs](04-daten.md) · [Übersicht](../README.md) · [Weiter: Beispiele →](06-beispiele.md)

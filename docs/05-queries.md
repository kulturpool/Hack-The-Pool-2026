# 05 · Queries

Sammelstelle für alles Abfragbare: SPARQL, API-Calls, Filterausdrücke, Tricks.

![Swordfish](gifs/swordfish-hack.gif)

## SPARQL

Endpunkt `https://sparql.kulturpool.at/query`, Editor unter [sparql.kulturpool.at](https://sparql.kulturpool.at/). Der Editor öffnet mit einem lauffähigen Federated-Query-Beispiel gegen Wikidata und GND — guter Ausgangspunkt zum Umbauen.

### Verbinde GND-Referenzen im Kulturpool mit Wikidata

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX edm:  <http://www.europeana.eu/schemas/edm/>
PREFIX ore: <http://www.openarchives.org/ore/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?cho ?title ?gndCreator ?wikidataObject ?wikidataSubjectLabel ?wikidataEntityLabel ?wikidataObjectLabel WHERE {
  {
    SELECT ?cho ?title ?gndCreator WHERE {
      ?cho dc:creator ?gndCreator .
      ?cho dc:title ?title .
      ?aggregation edm:aggregatedCHO ?cho .
      ?cho a edm:ProvidedCHO .
      ?cho dcterms:created ?created .
  	  
      FILTER(ISIRI(?gndCreator)) .
  	  FILTER(STRSTARTS(str(?gndCreator), "https://d-nb.info/gnd/")) .
      FILTER(xsd:integer(SUBSTR(STR(?created), 1, 4)) >= 1920) .
    }
    GROUP BY ?cho ?title ?gndCreator
    OFFSET 123
    LIMIT 10
  }
  .
  {
  	SERVICE <https://query.wikidata.org/sparql> {
      ?wikidataSubject <http://www.wikidata.org/prop/direct-normalized/P227> ?gndCreator .
      ?wikidataSubject ?wikidataPredicate ?wikidataObject .
      { ?wikidataEntity wikibase:directClaim ?wikidataPredicate } UNION { ?wikidataEntity wikibase:claim ?wikidataPredicate }
      FILTER(strstarts(str(?wikidataObject), "http://www.wikidata.org/entity/Q"))
      
      # Wikidata Label Service
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de" . }
      OPTIONAL { ?wikidataSubjectLabel a <urn:something> } # Hack to bind label to outer scope
      OPTIONAL { ?wikidataEntityLabel a <urn:something> } # Hack to bind label to outer scope
      OPTIONAL { ?wikidataObjectLabel a <urn:something> } # Hack to bind label to outer scope
  	}
  }
}
LIMIT 50
```

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

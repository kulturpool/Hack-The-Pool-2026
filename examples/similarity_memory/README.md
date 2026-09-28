# Similarity Memory

A standalone memory game based on visual similarity results from the Kulturpool API. 

## Concept

Before starting, the player can select either a 12-card board with six pairs or a 24-card board with twelve pairs. Unlike conventional memory, a pair does not contain two identical images. Each pair consists of:

1. A randomly selected Kulturpool object with an image.
2. A visually similar object selected from its top similarity results.

The player reveals two cards at a time and tries to find the six API-generated pairs.

## Files

- `index.html`: Page structure and card template
- `script.js`: API adapter, pair generation, and game logic
- `style.css`: Responsive card-flip design
- `README.md`: Project documentation

## Run locally

Open the `index.html` file in your web-browser.

## API configuration

```js
const API = {
  baseUrl: "https://api.kulturpool.at",
  searchPath: "/v2/search",
  similarPath: "/v2/similar",
  similarityMode: "image",
  searchPageSize: 50,
  randomPageCount: 20,
  similarityPoolSize: 40,
};
```

The public Kulturpool documentation confirms that search results contain a `uuid`, and that the similarity API can find visually similar objects. The exact similarity request is isolated in `visuallySimilar()` so endpoint or parameter changes only need to be made in one place.

Expected similarity request shape in this sample:

```text
GET /v2/similar?id=<KULTURPOOL_UUID>&type=image&limit=30
```

If the live API reference uses different names, update `similarPath` and the three query parameters inside `visuallySimilar()`.

## Game configuration

```js
const GAME = {
  pairCount: 6,
  partnerCandidatePool: 12,
  previewDuration: 900,
  mismatchDuration: 1100,
  generationAttemptsPerPair: 8,
};
```

- `pairCount`: Number of pairs. The supplied grid is designed for six.
- `partnerCandidatePool`: A partner is chosen randomly from this many top visual-similarity results.
- `previewDuration`: Initial face-up preview in milliseconds.
- `mismatchDuration`: How long an incorrect selection remains visible.
- `generationAttemptsPerPair`: Retries when duplicates or incomplete results prevent a pair.

## Pair generation

The game creates each pair independently. It tracks all object IDs already used so that an object cannot appear in two different pairs. Partners are randomly drawn from the top similarity results to keep successive boards varied.

The relationship is intentionally asymmetric for game purposes: the selected partner appeared in the reference object's visual-similarity results. The project does not assume that both objects would necessarily rank each other equally.

## Scoring

- Correct pair: +100 points
- Incorrect attempt: -10 points, never below zero
- Completion bonus: up to 300 points, reduced by 20 for every attempt beyond the minimum six

## Design limitation

Different objects on the same board may also look similar even when they were not generated as a pair. The game accepts only the six pair assignments created during board generation. This is a deliberate game rule, not a claim that other combinations are visually unrelated.

## Browser notes

- JavaScript is required.
- No credentials are stored in the project.
- If deployment produces a CORS error, an allowed server-side proxy is needed. A proxy is not included so the sample remains a four-file static project.


## Board size

Use the **Cards** selector in the toolbar to switch between:

- 12 cards forming 6 pairs
- 24 cards forming 12 pairs

Changing the selection immediately generates a new board. The 24-card layout uses six columns on wide screens, four on medium screens, and two on small screens. Pair counters, completion checks, and the efficiency bonus automatically adapt to the selected board size.

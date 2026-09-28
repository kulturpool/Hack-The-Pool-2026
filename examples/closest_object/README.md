# Closest Object

A minimal browser game as an example for the hackathon: one Kulturpool object is shown as the reference, followed by six candidates. The player guesses which candidate has the highest image-embedding similarity according to the Kulturpool API.

## Files

- `index.html` renders the game.
- `script.js` calls the API, normalizes responses, and runs the game logic.
- `style.css` contains the responsive visual design.
- `README.md` documents setup and adaptation.

## Run locally

Open the `index.html` in your browser to start and play the game.


## API configuration

The API settings are grouped at the top of `script.js`:

```js
const API = {
  baseUrl: "https://api.kulturpool.at",
  searchPath: "/v2/search",
  similarPath: "/v2/similar",
  similarityMode: "image",
  candidateCount: 6,
  poolSize: 40,
};
```

The public Kulturpool documentation confirms that search results contain a `uuid`, and that the similarity API can find visually similar objects. The exact similarity request is isolated in `visuallySimilar()` so endpoint or parameter changes only need to be made in one place.

Expected similarity request shape in this sample:

```text
GET /v2/similar?id=<KULTURPOOL_UUID>&type=image&limit=30
```

If the live API reference uses different names, update `similarPath` and the three query parameters inside `visuallySimilar()`.

## Expected response handling

The small `asArray()` and `normalize()` adapters accept several common JSON shapes (`hits`, `results`, `items`, or `data`) and common property names for IDs, images, titles, providers, and similarity scores. Once you inspect a real response, you can simplify those helpers to the exact schema.

## Game logic

1. Search for a broad random term and choose an object with an image.
2. Request visually similar objects for its `uuid`.
3. Rank results by the similarity value supplied by the API.
4. Keep the top result as the correct answer.
5. Choose five additional ranked results as distractors and shuffle all six.
6. Reveal the API similarity score after the player answers.

## Notes

- No API key is included.
- If the browser reports a CORS error, use a small server-side proxy for deployment. That would add a server file, so it is intentionally outside this four-file version.
- For a production version, add retries, request cancellation, analytics consent, and more explicit image-rights information.
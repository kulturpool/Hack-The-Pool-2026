# Culture Chain

A standalone visual-similarity game based on the Kulturpool API.

## Game concept

The application pre-generates a route through visually similar cultural heritage objects:

```text
Start → hidden step → hidden step → hidden step → target
```

The player sees the starting object and target, but not the hidden route. At every move, six visually similar objects are offered. One option continues the pre-generated route while the player remains on it. Alternative routes may also reach the target.

The player wins by reaching the target within a set amount of moves. A **Go back one move** button lets the player undo the latest step. Going back removes that object from the journey, restores one move, and reloads the choices for the previous object.

## Files

- `index.html`: Interface and templates
- `script.js`: API adapter, route generation, state, and game logic
- `style.css`: Responsive design
- `README.md`: Setup and customization notes

## Run locally

Open the `index.html` in your web-browser to start and play the game.

## API configuration

The API settings are at the top of `script.js`:

```js
const API = {
  baseUrl: "https://api.kulturpool.at",
  searchPath: "/v2/search",
  similarPath: "/v2/similar",
  similarityMode: "image",
  searchPageSize: 50,
  randomPageCount: 20,
  similarityPoolSize: 50,
  choiceCount: 6,
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
  hiddenRouteSteps: 4,
  maximumMoves: 6,
  routeCandidatePool: 20,
  generationAttempts: 4,
};
```

- `hiddenRouteSteps`: Number of links used to create the target.
- `maximumMoves`: Number of moves available to the player.
- `routeCandidatePool`: Each hidden step is randomly selected from this many top similarity results.
- `generationAttempts`: Number of fresh starts attempted if route generation encounters a dead end.

## Route generation

1. A random starting object with an image is selected.
2. Similar objects are requested for the start.
3. One random object from the first 20 results becomes the next hidden step.
4. The process repeats four times.
5. The last object becomes the visible target.
6. The route is retained in memory but is not shown to the player.

## Solvability behavior

While the player remains on the generated route, the next route object is included among the six choices. If the player takes another branch, the application continues with the similarity results of that selected object. Reaching the target through that alternative branch is possible but not guaranteed.

Visited objects are excluded from later choices to prevent loops.

## Scoring

The score is awarded only when the target is reached:

```text
100 base points + 50 points for every unused move
```

## Browser notes

- The application requires JavaScript.
- No credentials are stored in the project.
- If deployment produces a CORS error, the API request must be routed through an allowed server-side proxy. A proxy is intentionally not included so the project remains a four-file static prototype.

## Revealing the correct route

If the player reaches the move limit or encounters a dead end, the result panel displays a **Show correct route** button. Selecting it reveals the full pre-generated route from the start object to the target. The route remains hidden after a successful challenge.

The revealed route represents the guaranteed route generated at the beginning of that challenge. It is not necessarily the only route through the similarity network.

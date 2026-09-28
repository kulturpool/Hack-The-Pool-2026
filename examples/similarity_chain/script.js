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

const GAME = {
  hiddenRouteSteps: 6,
  maximumMoves: 10,
  routeCandidatePool: 30,
  generationAttempts: 4,
};

const state = {
  currentObject: null,
  targetObject: null,
  hiddenRoute: [],
  chain: [],
  visitedIds: new Set(),
  movesUsed: 0,
  score: 0,
  locked: false,
};

const el = {
  game: document.querySelector("#game"),
  result: document.querySelector("#result"),
  status: document.querySelector("#status"),
  moves: document.querySelector("#moves"),
  score: document.querySelector("#score"),
  newGame: document.querySelector("#new-game"),
  backMove: document.querySelector("#back-move"),
  playAgain: document.querySelector("#play-again"),
  showRoute: document.querySelector("#show-route"),
  correctRoutePanel: document.querySelector("#correct-route-panel"),
  correctRoute: document.querySelector("#correct-route"),
  currentImage: document.querySelector("#current-image"),
  currentTitle: document.querySelector("#current-title"),
  currentProvider: document.querySelector("#current-provider"),
  targetImage: document.querySelector("#target-image"),
  targetTitle: document.querySelector("#target-title"),
  targetProvider: document.querySelector("#target-provider"),
  choices: document.querySelector("#choices"),
  chain: document.querySelector("#chain"),
  template: document.querySelector("#choice-template"),
  resultTitle: document.querySelector("#result-title"),
  resultCopy: document.querySelector("#result-copy"),
};

const searchTerms = [
  "kunst", "wien", "natur", "portrait", "architektur", "geschichte",
  "musik", "landschaft", "tier", "pflanze", "fotografie", "zeichnung",
  "gemälde", "skulptur", "textil", "keramik", "glas", "metall", "holz",
  "plakat", "wissenschaft", "technik", "reise", "stadt", 
  "museum", "mode", "alltag", "dorf", "berg", "fluss", 
  "garten", "kirche", "schloss", "person", "familie", "arbeit", "fest", 
  "sport", "theater", "film", "religion", "mythologie",
];

const pick = items => items[Math.floor(Math.random() * items.length)];
const randomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function apiUrl(path, params) {
  const url = new URL(path, API.baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json();
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.hits ?? payload?.results ?? payload?.items ?? payload?.data ?? [];
}

function text(value, fallback = "Untitled object") {
  if (Array.isArray(value)) return text(value[0], fallback);
  if (value && typeof value === "object") {
    return text(value.en ?? value.de ?? value.value ?? value.label, fallback);
  }
  return String(value || fallback);
}

function imageUrl(item) {
  const media = Array.isArray(item?.media) ? item.media : [];
  const mediaImage = media.find(entry =>
    String(entry?.content_type || entry?.type || "").startsWith("image")
  );
  return item?.image || item?.image_url || item?.thumbnail || item?.preview ||
    item?.isShownBy?.id || item?.isShownBy || mediaImage?.url || null;
}

function similarityValue(item) {
  const containers = [item, item?.document, item?.object, item?.metadata, item?._source];
  const keys = [
    "similarity", "similarity_score", "similarityScore", "score", "_score",
    "cosine_similarity", "cosineSimilarity"
  ];
  for (const container of containers) {
    if (!container || typeof container !== "object") continue;
    for (const key of keys) {
      const value = Number(container[key]);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

function normalize(item, apiRank = null) {
  const source = item?.document ?? item?.object ?? item?.metadata ?? item?._source ?? item;
  return {
    id: source?.uuid ?? source?.id ?? item?.uuid ?? item?.id,
    title: text(source?.title ?? source?.name ?? source?.label),
    provider: text(source?.dataProvider ?? source?.provider ?? source?.institution, "Kulturpool"),
    image: imageUrl(source) ?? imageUrl(item),
    similarity: similarityValue(item),
    apiRank,
  };
}

async function randomReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const payload = await getJson(apiUrl(API.searchPath, {
      q: pick(searchTerms),
      per_page: API.searchPageSize,
      page: randomInteger(1, API.randomPageCount),
    }));
    const usable = asArray(payload).map(normalize).filter(item => item.id && item.image);
    if (usable.length) return pick(usable);
  }
  throw new Error("Could not find a starting object with an image.");
}

async function visuallySimilar(referenceId) {
  const payload = await getJson(apiUrl(API.similarPath, {
    id: referenceId,
    type: API.similarityMode,
    limit: API.similarityPoolSize,
  }));
  const results = asArray(payload)
    .map((item, index) => normalize(item, index + 1))
    .filter(item => item.id && item.image && item.id !== referenceId);

  const allScored = results.length > 0 && results.every(item => Number.isFinite(item.similarity));
  return allScored
    ? results.sort((a, b) => b.similarity - a.similarity)
    : results;
}

async function generateHiddenRoute(start) {
  const route = [start];
  let current = start;

  for (let step = 0; step < GAME.hiddenRouteSteps; step += 1) {
    const similar = await visuallySimilar(current.id);
    const unused = similar.filter(item => !route.some(routeItem => routeItem.id === item.id));
    const pool = unused.slice(0, GAME.routeCandidatePool);
    if (!pool.length) throw new Error("The generated route reached a dead end.");
    current = pick(pool);
    route.push(current);
  }
  return route;
}

async function createChallenge() {
  setBusy(true);
  el.game.hidden = true;
  el.result.hidden = true;
  el.showRoute.hidden = true;
  el.correctRoutePanel.hidden = true;
  el.correctRoute.replaceChildren();
  setStatus("Generating a reachable similarity route…");

  try {
    let route = null;
    for (let attempt = 0; attempt < GAME.generationAttempts && !route; attempt += 1) {
      try {
        route = await generateHiddenRoute(await randomReference());
      } catch (error) {
        console.warn("Route generation attempt failed", error);
      }
    }
    if (!route) throw new Error("Could not generate a complete route. Try a new challenge.");

    state.hiddenRoute = route;
    state.currentObject = route[0];
    state.targetObject = route.at(-1);
    state.chain = [route[0]];
    state.visitedIds = new Set([route[0].id]);
    state.movesUsed = 0;
    state.score = 0;

    renderFixedObjects();
    renderChain();
    updateCounters();
    el.game.hidden = false;
    await loadNextChoices();
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
}

function requiredRouteStep(similarObjects) {
  const index = state.hiddenRoute.findIndex(item => item.id === state.currentObject.id);
  if (index < 0 || index >= state.hiddenRoute.length - 1) return null;
  const requiredId = state.hiddenRoute[index + 1].id;
  return similarObjects.find(item => item.id === requiredId) ?? state.hiddenRoute[index + 1];
}

function chooseOptions(similarObjects) {
  const available = similarObjects.filter(item => !state.visitedIds.has(item.id));
  const required = requiredRouteStep(available);
  const randomPool = available.filter(item => !required || item.id !== required.id);
  const count = required ? API.choiceCount - 1 : API.choiceCount;
  const options = shuffle(randomPool).slice(0, count);
  if (required) options.push(required);
  if (options.length < API.choiceCount) {
    throw new Error("Not enough unvisited objects are available for the next move.");
  }
  return shuffle(options);
}

async function loadNextChoices() {
  state.locked = true;
  setStatus("Finding possible next steps…");
  try {
    const similar = await visuallySimilar(state.currentObject.id);
    renderChoices(chooseOptions(similar));
    setStatus("Choose the next object in your chain.");
  } catch (error) {
    finishChallenge(false, error.message);
  } finally {
    state.locked = false;
    updateCounters();
  }
}

async function goBackOneMove() {
  if (state.locked || state.chain.length <= 1) return;

  state.locked = true;
  setStatus("Returning to the previous object…");

  const removedObject = state.chain.pop();
  state.visitedIds.delete(removedObject.id);
  state.movesUsed = Math.max(0, state.movesUsed - 1);
  state.currentObject = state.chain.at(-1);

  renderFixedObjects();
  renderChain();
  updateCounters();

  await loadNextChoices();
}

async function selectObject(object) {
  if (state.locked) return;
  state.locked = true;
  state.movesUsed += 1;
  state.currentObject = object;
  state.chain.push(object);
  state.visitedIds.add(object.id);
  renderFixedObjects();
  renderChain();
  updateCounters();

  if (object.id === state.targetObject.id) {
    state.score = 100 + (GAME.maximumMoves - state.movesUsed) * 50;
    updateCounters();
    finishChallenge(true, `You reached the target in ${state.movesUsed} moves.`);
    return;
  }
  if (state.movesUsed >= GAME.maximumMoves) {
    finishChallenge(false, "You used all available moves before reaching the target.");
    return;
  }
  await loadNextChoices();
}

function renderFixedObjects() {
  displayObject(state.currentObject, el.currentImage, el.currentTitle, el.currentProvider, "Current object");
  displayObject(state.targetObject, el.targetImage, el.targetTitle, el.targetProvider, "Target object");
}

function displayObject(object, image, title, provider, prefix) {
  image.src = object.image;
  image.alt = `${prefix}: ${object.title}`;
  title.textContent = object.title;
  provider.textContent = object.provider;
}

function renderChoices(options) {
  el.choices.replaceChildren();
  options.forEach(object => {
    const fragment = el.template.content.cloneNode(true);
    const button = fragment.querySelector("button");
    const image = fragment.querySelector("img");
    image.src = object.image;
    image.alt = object.title;
    fragment.querySelector(".choice-title").textContent = object.title;
    fragment.querySelector(".choice-provider").textContent = object.provider;
    button.addEventListener("click", () => selectObject(object));
    el.choices.append(fragment);
  });
}

function renderRoute(objects, container, markTarget = false) {
  container.replaceChildren();

  objects.forEach((object, index) => {
    const step = document.createElement("div");
    step.className = "chain-step";

    const image = document.createElement("img");
    image.src = object.image;
    image.alt = object.title;

    const label = document.createElement("span");
    const isFinalTarget = markTarget && index === objects.length - 1;
    label.textContent = index === 0 ? "Start" : isFinalTarget ? "Target" : `Step ${index}`;

    const title = document.createElement("small");
    title.textContent = object.title;

    step.append(image, label, title);
    container.append(step);

    if (index < objects.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "chain-arrow";
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      container.append(arrow);
    }
  });
}

function renderChain() {
  renderRoute(state.chain, el.chain);
}

function showCorrectRoute() {
  renderRoute(state.hiddenRoute, el.correctRoute, true);
  el.correctRoutePanel.hidden = false;
  el.showRoute.hidden = true;
  el.correctRoutePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function finishChallenge(won, message) {
  state.locked = true;
  el.choices.replaceChildren();
  el.resultTitle.textContent = won ? "Target reached!" : "Challenge ended";
  el.resultCopy.textContent = won ? `${message} Your score is ${state.score}.` : message;
  el.result.classList.toggle("success", won);
  el.showRoute.hidden = won;
  el.correctRoutePanel.hidden = true;
  el.correctRoute.replaceChildren();
  el.result.hidden = false;
  el.backMove.disabled = true;
  setStatus(won ? "Route complete." : "You can now reveal the pre-generated route.", !won);
}

function updateCounters() {
  el.moves.textContent = `${state.movesUsed} / ${GAME.maximumMoves}`;
  el.score.textContent = state.score;
  el.backMove.disabled = state.locked || state.chain.length <= 1;
}

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("error", isError);
}

function setBusy(busy) {
  state.locked = busy;
  el.newGame.disabled = busy;
  el.playAgain.disabled = busy;
  el.backMove.disabled = busy || state.chain.length <= 1;
}

el.newGame.addEventListener("click", createChallenge);
el.backMove.addEventListener("click", goBackOneMove);
el.showRoute.addEventListener("click", showCorrectRoute);
el.playAgain.addEventListener("click", createChallenge);
createChallenge();

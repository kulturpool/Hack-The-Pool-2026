const API = {
  baseUrl: "https://api.kulturpool.at",
  searchPath: "/v2/search",
  similarPath: "/v2/similar",
  similarityMode: "image",
  searchPageSize: 50,
  randomPageCount: 20,
  similarityPoolSize: 40,
};

const GAME = {
  pairCount: 6,
  partnerCandidatePool: 12,
  previewDuration: 900,
  mismatchDuration: 1100,
  generationAttemptsPerPair: 8,
};

const state = {
  cards: [],
  firstCard: null,
  secondCard: null,
  pairsFound: 0,
  attempts: 0,
  score: 0,
  locked: false,
};

const el = {
  game: document.querySelector("#game"),
  board: document.querySelector("#board"),
  status: document.querySelector("#status"),
  pairsFound: document.querySelector("#pairs-found"),
  attempts: document.querySelector("#attempts"),
  score: document.querySelector("#score"),
  newGame: document.querySelector("#new-game"),
  cardCount: document.querySelector("#card-count"),
  result: document.querySelector("#result"),
  resultCopy: document.querySelector("#result-copy"),
  playAgain: document.querySelector("#play-again"),
  template: document.querySelector("#card-template"),
};

const searchTerms = [
  "kunst", "wien", "natur", "portrait", "architektur", "geschichte",
  "musik", "landschaft", "tier", "pflanze", "fotografie", "zeichnung",
  "gemälde", "skulptur", "textil", "keramik", "glas", "metall", "holz",
  "plakat", "karte", "buch", "wissenschaft", "technik", "reise", "stadt"
];

const pick = items => items[Math.floor(Math.random() * items.length)];
const randomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

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
    id: String(source?.uuid ?? source?.id ?? item?.uuid ?? item?.id ?? ""),
    title: text(source?.title ?? source?.name ?? source?.label),
    provider: text(source?.dataProvider ?? source?.provider ?? source?.institution, "Kulturpool"),
    image: imageUrl(source) ?? imageUrl(item),
    similarity: similarityValue(item),
    apiRank,
  };
}

async function randomReference(excludedIds) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const payload = await getJson(apiUrl(API.searchPath, {
      q: pick(searchTerms),
      per_page: API.searchPageSize,
      page: randomInteger(1, API.randomPageCount),
    }));
    const usable = asArray(payload)
      .map(normalize)
      .filter(item => item.id && item.image && !excludedIds.has(item.id));
    if (usable.length) return pick(usable);
  }
  throw new Error("Could not find another reference object with an image.");
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
  return allScored ? results.sort((a, b) => b.similarity - a.similarity) : results;
}

async function generatePair(pairId, usedIds) {
  for (let attempt = 0; attempt < GAME.generationAttemptsPerPair; attempt += 1) {
    const reference = await randomReference(usedIds);
    const similar = await visuallySimilar(reference.id);
    const possiblePartners = similar
      .slice(0, GAME.partnerCandidatePool)
      .filter(item => !usedIds.has(item.id));

    if (!possiblePartners.length) continue;

    const partner = pick(possiblePartners);
    usedIds.add(reference.id);
    usedIds.add(partner.id);

    return [
      { ...reference, pairId, role: "reference" },
      { ...partner, pairId, role: "partner" },
    ];
  }
  throw new Error(`Could not generate pair ${pairId + 1}.`);
}

function selectedPairCount() {
  return Number(el.cardCount.value) / 2;
}

async function generateDeck() {
  const pairCount = selectedPairCount();
  const usedIds = new Set();
  const cards = [];

  for (let pairId = 0; pairId < pairCount; pairId += 1) {
    setStatus(`Creating similarity pair ${pairId + 1} of ${pairCount}…`);
    cards.push(...await generatePair(pairId, usedIds));
  }

  return shuffle(cards).map((card, index) => ({ ...card, cardId: `card-${index}` }));
}

async function createGame() {
  setBusy(true);
  el.game.hidden = true;
  el.result.hidden = true;
  el.board.replaceChildren();
  resetState();
  setStatus("Preparing visual similarity pairs…");

  try {
    state.cards = await generateDeck();
    renderBoard();
    updateCounters();
    el.game.hidden = false;
    setStatus("Memorize the cards, then find the six similarity pairs.");
    await previewCards();
    setStatus("Choose two cards that you think are visually related.");
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
}

function resetState() {
  state.cards = [];
  state.firstCard = null;
  state.secondCard = null;
  state.pairsFound = 0;
  state.attempts = 0;
  state.score = 0;
  state.locked = false;
}

function renderBoard() {
  state.cards.forEach(card => {
    const fragment = el.template.content.cloneNode(true);
    const button = fragment.querySelector("button");
    const image = fragment.querySelector("img");
    button.dataset.cardId = card.cardId;
    button.dataset.pairId = card.pairId;
    image.src = card.image;
    image.alt = card.title;
    fragment.querySelector(".card-title").textContent = card.title;
    fragment.querySelector(".card-provider").textContent = card.provider;
    button.addEventListener("click", () => selectCard(button, card));
    el.board.append(fragment);
  });
}

async function previewCards() {
  state.locked = true;
  const cards = [...el.board.querySelectorAll(".memory-card")];
  cards.forEach(card => card.classList.add("flipped"));
  await pause(GAME.previewDuration);
  cards.forEach(card => card.classList.remove("flipped"));
  state.locked = false;
}

async function selectCard(button, card) {
  if (state.locked || button.disabled || button.classList.contains("flipped")) return;
  button.classList.add("flipped");
  button.setAttribute("aria-label", card.title);

  if (!state.firstCard) {
    state.firstCard = { button, card };
    return;
  }

  state.secondCard = { button, card };
  state.attempts += 1;
  state.locked = true;
  updateCounters();

  if (state.firstCard.card.pairId === state.secondCard.card.pairId) {
    await handleMatch();
  } else {
    await handleMismatch();
  }
}

async function handleMatch() {
  const { firstCard, secondCard } = state;
  firstCard.button.classList.add("matched");
  secondCard.button.classList.add("matched");
  firstCard.button.disabled = true;
  secondCard.button.disabled = true;
  state.pairsFound += 1;
  state.score += 100;
  setStatus("Match found. These objects were paired using visual similarity.");
  clearSelection();
  updateCounters();

  if (state.pairsFound === selectedPairCount()) {
    finishGame();
  }
}

async function handleMismatch() {
  const { firstCard, secondCard } = state;
  firstCard.button.classList.add("mismatch");
  secondCard.button.classList.add("mismatch");
  state.score = Math.max(0, state.score - 10);
  setStatus("Those cards belong to different similarity pairs.");
  await pause(GAME.mismatchDuration);
  firstCard.button.classList.remove("flipped", "mismatch");
  secondCard.button.classList.remove("flipped", "mismatch");
  firstCard.button.setAttribute("aria-label", "Hidden card");
  secondCard.button.setAttribute("aria-label", "Hidden card");
  clearSelection();
  updateCounters();
}

function clearSelection() {
  state.firstCard = null;
  state.secondCard = null;
  state.locked = false;
}

function finishGame() {
  const pairCount = selectedPairCount();
  const maximumBonus = pairCount * 50;
  const efficiencyBonus = Math.max(0, maximumBonus - (state.attempts - pairCount) * 20);
  state.score += efficiencyBonus;
  updateCounters();
  el.resultCopy.textContent = `You found all ${pairCount} pairs in ${state.attempts} attempts. Final score: ${state.score}.`;
  el.result.hidden = false;
  setStatus("All similarity pairs found.");
  el.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateCounters() {
  el.pairsFound.textContent = `${state.pairsFound} / ${selectedPairCount()}`;
  el.attempts.textContent = state.attempts;
  el.score.textContent = state.score;
}

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("error", isError);
}

function setBusy(busy) {
  state.locked = busy;
  el.newGame.disabled = busy;
  el.playAgain.disabled = busy;
  el.cardCount.disabled = busy;
}

el.newGame.addEventListener("click", createGame);
el.cardCount.addEventListener("change", createGame);
el.playAgain.addEventListener("click", createGame);
createGame();

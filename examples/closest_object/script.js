const API = {
  baseUrl: "https://api.kulturpool.at",
  searchPath: "/v2/search",
  similarPath: "/v2/similar",
  similarityMode: "image",
  candidateCount: 6,
  similarityPoolSize: 50,
  poolSize: 50,

  randomPageCount: 20,
  recentReferenceLimit: 30
};

const state = { score: 0, round: 0, locked: false };
const recentReferenceIds = [];
const el = {
  game: document.querySelector("#game"),
  status: document.querySelector("#status"),
  score: document.querySelector("#score"),
  round: document.querySelector("#round"),
  newRound: document.querySelector("#new-round"),
  referenceImage: document.querySelector("#reference-image"),
  referenceTitle: document.querySelector("#reference-title"),
  referenceProvider: document.querySelector("#reference-provider"),
  choices: document.querySelector("#choices"),
  template: document.querySelector("#choice-template"),
};

const searchTerms = [
  "kunst", "wien", "natur", "portrait", "architektur", "geschichte",
  "musik", "landschaft", "tier", "pflanze", "fotografie", "zeichnung",
  "gemälde", "skulptur", "textil", "keramik", "glas", "metall", "holz",
  "plakat", "karte", "buch", "wissenschaft", "technik", "reise", "stadt", 
  "museum", "mode", "handschrift", "alltag", "dorf", "berg", "fluss", 
  "garten", "kirche", "schloss", "person", "familie", "arbeit", "fest", 
  "sport", "theater", "film", "literatur", "religion", "mythologie",
];

const pick = items => items[Math.floor(Math.random() * items.length)];

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
  if (value && typeof value === "object") return text(value.en ?? value.de ?? value.value ?? value.label, fallback);
  return String(value || fallback);
}

function imageUrl(item) {
  const media = Array.isArray(item?.media) ? item.media : [];
  const mediaImage = media.find(entry => String(entry?.content_type || entry?.type || "").startsWith("image"));
  return item?.image || item?.image_url || item?.thumbnail || item?.preview || item?.isShownBy?.id || item?.isShownBy || mediaImage?.url || null;
}

function similarityValue(item) {
  // Do not use `|| 0`: a missing field must stay missing. The API may place
  // the score at the top level or inside a result/document wrapper.
  const containers = [item, item?.document, item?.object, item?.metadata, item?._source];
  const similarityKeys = ["similarity", "similarity_score", "similarityScore", "score", "_score", "cosine_similarity", "cosineSimilarity"];

  for (const container of containers) {
    if (!container || typeof container !== "object") continue;
    for (const key of similarityKeys) {
      const value = Number(container[key]);
      if (Number.isFinite(value)) return value;
    }
  }

  // A distance is the inverse kind of measure: lower is better. Keep it
  // separately so that we do not accidentally present it as similarity.
  for (const container of containers) {
    const value = Number(container?.distance);
    if (Number.isFinite(value)) return { distance: value };
  }
  return null;
}

function normalize(item, apiRank = null) {
  const source = item?.document ?? item?.object ?? item?.metadata ?? item?._source ?? item;
  const measure = similarityValue(item);
  return {
    id: source?.uuid ?? source?.id ?? item?.uuid ?? item?.id,
    title: text(source?.title ?? source?.name ?? source?.label),
    provider: text(source?.dataProvider ?? source?.provider ?? source?.institution, "Kulturpool"),
    image: imageUrl(source) ?? imageUrl(item),
    similarity: typeof measure === "number" ? measure : null,
    distance: measure && typeof measure === "object" ? measure.distance : null,
    apiRank,
    isAnswer: false,
    raw: item,
  };
}

function randomInteger(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function rememberReference(id) {
  recentReferenceIds.push(id);

  if (
    recentReferenceIds.length >
    API.recentReferenceLimit
  ) {
    recentReferenceIds.shift();
  }
}

function wasRecentlyUsed(id) {
  return recentReferenceIds.includes(id);
}

async function randomReference() {
  const maximumAttempts = 5;

  for (
    let attempt = 0;
    attempt < maximumAttempts;
    attempt += 1
  ) {
    const searchTerm = pick(randomTerms);

    const randomPage = randomInteger(
      1,
      API.randomPageCount
    );

    const payload = await getJson(
      apiUrl(API.searchPath, {
        q: searchTerm,
        per_page: API.poolSize,
        page: randomPage
      })
    );

    const usable = asArray(payload)
      .map(normalize)
      .filter(item =>
        item.id &&
        item.image &&
        !wasRecentlyUsed(item.id)
      );

    if (usable.length > 0) {
      const reference = pick(usable);

      rememberReference(reference.id);

      console.debug(
        "Selected reference object",
        {
          searchTerm,
          randomPage,
          reference
        }
      );

      return reference;
    }
  }

  throw new Error(
    "Could not find a new reference object after several attempts."
  );
}

async function visuallySimilar(referenceId) {
  // The API-specific request is intentionally isolated here. If the reference
  // uses different parameter names, only change this URL construction.
  const payload = await getJson(apiUrl(API.similarPath, {
    id: referenceId,
    type: API.similarityMode,
    limit: API.similarityPoolSize,
  }));
  const results = asArray(payload);
  console.debug("Kulturpool similarity response", payload);
  return results
    .map((item, index) => normalize(item, index + 1))
    .filter(item => item.id && item.image && item.id !== referenceId);
}

function shuffle(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function chooseCandidates(ranked) {
  if (ranked.length < API.candidateCount) {
    throw new Error(
      "Not enough visually similar objects were returned."
    );
  }

  // Sort by similarity when numeric scores are available.
  // Otherwise, preserve the ranking returned by the API.
  const allScored = ranked.every(item =>
    Number.isFinite(item.similarity)
  );

  const ordered = allScored
    ? [...ranked].sort(
        (a, b) => b.similarity - a.similarity
      )
    : [...ranked];

  // The most similar object remains the correct answer.
  const answer = {
    ...ordered[0],
    isAnswer: true
  };

  // Randomly select five distractors from a larger group
  // of highly similar objects.
  const distractorPool = ordered.slice(
    1,
    API.similarityPoolSize
  );

  const distractorCount = API.candidateCount - 1;

  if (distractorPool.length < distractorCount) {
    throw new Error(
      "The similarity pool is too small for six choices."
    );
  }

  const distractors = shuffle(distractorPool).slice(
    0,
    distractorCount
  );

  // Randomize the position of the correct answer.
  return shuffle([
    answer,
    ...distractors
  ]);
}

function render(reference, candidates) {
  el.referenceImage.src = reference.image;
  el.referenceImage.alt = `Reference: ${reference.title}`;
  el.referenceTitle.textContent = reference.title;
  el.referenceProvider.textContent = reference.provider;
  el.choices.replaceChildren();

  const winner = candidates.find(item => item.isAnswer);
  candidates.forEach(item => {
    const fragment = el.template.content.cloneNode(true);
    const button = fragment.querySelector("button");
    const image = fragment.querySelector("img");
    image.src = item.image;
    image.alt = item.title;
    button.dataset.objectId = item.id;
    fragment.querySelector(".choice-title").textContent = item.title;
    button.addEventListener("click", () => reveal(button, item, winner));
    el.choices.append(fragment);
  });
}

function reveal(selectedButton, selected, winner) {
  if (state.locked) return;
  state.locked = true;
  const correct = selected.id === winner.id;
  if (correct) state.score += 1;
  el.score.textContent = state.score;

  [...el.choices.children].forEach(button => {
    button.disabled = true;
    const matching = button.dataset.objectId === String(winner.id);
    if (matching) button.classList.add("correct");
    if (button === selectedButton && !correct) button.classList.add("wrong");
    if (button === selectedButton || matching) {
      const item = matching ? winner : selected;
      const metric = Number.isFinite(item.similarity)
        ? `similarity ${item.similarity.toFixed(3)}`
        : Number.isFinite(item.distance)
          ? `distance ${item.distance.toFixed(3)}`
          : `API rank #${item.apiRank}`;
      button.querySelector(".choice-result").textContent = matching
        ? `Closest match · ${metric}`
        : `Your choice · ${metric}`;
    }
  });
  setStatus(correct ? "Correct! You found the closest visual match." : "Not quite. The closest match is highlighted.");
}

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("error", isError);
}

async function startRound() {
  state.locked = true;
  el.newRound.disabled = true;
  el.game.hidden = true;
  setStatus("Finding a reference object and its visual neighbours…");
  try {
    const reference = await randomReference();
    const ranked = await visuallySimilar(reference.id);
    const candidates = chooseCandidates(ranked);
    render(reference, candidates);
    state.round += 1;
    el.round.textContent = state.round;
    state.locked = false;
    el.game.hidden = false;
    setStatus("Choose one of the six objects.");
  } catch (error) {
    console.error(error);
    setStatus(`${error.message} Check the endpoint settings at the top of script.js and the browser console.`, true);
  } finally {
    el.newRound.disabled = false;
  }
}

el.newRound.addEventListener("click", startRound);
startRound();
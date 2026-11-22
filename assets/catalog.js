const availableTopics = ["수학", "국어", "사회", "미술", "체육", "음악", "실과·안전", "학급 운영", "교사 업무", "바이브코딩", "놀이·생활", "기타"];
const topics = availableTopics.filter(topic => apps.some(app => app.topics.includes(topic)));
const creators = ["엽쌤스쿨", "찰떡쌤"];
const byId = new Map(apps.map(app => [app.id, app]));
const favoriteKey = "yeoptteok-school-favorites";
const hosted = location.protocol === "https:" || location.protocol === "http:";

const search = document.querySelector("#search");
const clear = document.querySelector("#clear");
const cards = document.querySelector("#cards");
const results = document.querySelector("#results");
const empty = document.querySelector("#empty");
const reset = document.querySelector("#reset");
const template = document.querySelector("#card-template");
const detail = document.querySelector("#detail");
const topicSelect = document.querySelector("#topics");
const creatorFilters = document.querySelector("#creators");
const favoriteFilter = document.querySelector("#favorite-filter");
const favoriteStatus = document.querySelector("#favorite-status");
const copyButton = document.querySelector("#copy-link");
const copyTeacher = document.querySelector("#copy-teacher");
const copyStudent = document.querySelector("#copy-student");
const studentShare = document.querySelector("#student-share");
const studentQR = document.querySelector("#student-qr");
const qrPanel = document.querySelector("#student-qr-panel");
const quickApps = document.querySelector("#quick-apps");
const quickList = document.querySelector("#quick-list");
const emptyActions = document.querySelector("#empty-actions");
// IDs already used in older catalogs keep resolving even after titles change.
const appAliases = new Map([
  ["physical", "sweat-expedition"],
  ["ys-reading", "reading-forest"]
]);
const pinKey = "yeoptteok-school-quick-pins";
const quickDialog = document.querySelector("#quick-dialog");
const quickForm = document.querySelector("#quick-form");
const quickSlots = [...quickForm.querySelectorAll("select")];
const quickStatus = document.querySelector("#quick-status");
const missingApp = document.querySelector("#missing-app");
const copyStatus = document.querySelector("#copy-status");
const copyValue = document.querySelector("#copy-value");

let fallbackParams = null;
let detailApp = null;
let detailOpener = null;
let favorites = readFavorites();
let pinnedApps = readPins();

function normalizedWords(text) {
  return text.normalize("NFKC").toLocaleLowerCase("ko").match(/[\p{L}\p{N}]+/gu) ?? [];
}

function compact(text) {
  return normalizedWords(text).join("");
}

const appIndex = apps.map(app => ({
  app,
  title: compact(app.title),
  fields: [app.title, app.creator, app.desc, app.access, ...app.topics, ...app.keys, ...(app.tags || [])].map(compact)
}));

function matchingPriority(entry, words, query) {
  if (!query) return 0;
  if (entry.title === query) return 4;
  if (entry.title.startsWith(query)) return 3;
  if (entry.title.includes(query)) return 2;
  if (entry.fields.some(field => field.includes(query))) return 1;
  return words.every(word => entry.fields.some(field => field.includes(word))) ? 0 : -1;
}

function paramsNow() {
  return fallbackParams ?? new URLSearchParams(location.search);
}

function setParams(changes, method = "pushState") {
  const url = new URL(location.href);
  if (fallbackParams) url.search = fallbackParams.toString();
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.search === location.search && !fallbackParams) return;
  try {
    history[method](null, "", url);
    fallbackParams = null;
  } catch {
    fallbackParams = url.searchParams;
  }
}

function readFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(favoriteKey) || "[]");
    return new Set(Array.isArray(stored) ? stored.filter(id => byId.has(id)) : []);
  } catch {
    return new Set();
  }
}

function readPins() {
  try {
    const value = JSON.parse(localStorage.getItem(pinKey) || "[]");
    return Array.isArray(value) ? [...new Set(value)].filter(id => favorites.has(id)).slice(0, 3) : [];
  } catch {
    return [];
  }
}

function setStar(button, app) {
  const saved = favorites.has(app.id);
  button.textContent = saved ? "★" : "☆";
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", app.title + " 즐겨찾기");
  button.title = saved ? "즐겨찾기 해제" : "즐겨찾기 추가";
}

function updateFavorite(button, app) {
  const wasSaved = favorites.delete(app.id);
  if (!wasSaved) favorites.add(app.id);
  const oldPins = pinnedApps;
  if (wasSaved) pinnedApps = pinnedApps.filter(id => id !== app.id);
  let message = app.title + (wasSaved ? " 즐겨찾기를 해제했습니다." : " 즐겨찾기에 추가했습니다.");
  try {
    localStorage.setItem(favoriteKey, JSON.stringify([...favorites]));
    if (pinnedApps.length !== oldPins.length) localStorage.setItem(pinKey, JSON.stringify(pinnedApps));
  } catch {
    message += " 현재 탭에서만 적용됩니다.";
  }
  if (paramsNow().get("saved") === "1" && wasSaved) {
    update();
    favoriteFilter.focus();
  } else {
    setStar(button, app);
  }
  renderQuickApps();
  favoriteStatus.textContent = message;
}

function renderQuickApps() {
  const shown = pinnedApps.length ? pinnedApps : [...favorites].reverse().slice(0, 3);
  const savedApps = shown.map(id => byId.get(id));
  quickApps.hidden = savedApps.length === 0;
  quickList.replaceChildren(...savedApps.map(app => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    configureLink(link, app);
    link.textContent = app.title;
    item.append(link);
    return item;
  }));
}

document.querySelector("#quick-edit").addEventListener("click", () => {
  quickStatus.textContent = "";
  const options = [...favorites].map(id => byId.get(id))
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));
  quickSlots.forEach((slot, i) => {
    slot.replaceChildren(new Option("선택 안 함", ""), ...options.map(app => new Option(app.title, app.id)));
    slot.value = pinnedApps[i] || "";
  });
  quickDialog.showModal();
});
document.querySelector("#quick-close").addEventListener("click", () => quickDialog.close());
quickForm.addEventListener("submit", event => {
  event.preventDefault();
  const selected = quickSlots.map(slot => slot.value).filter(Boolean);
  if (new Set(selected).size !== selected.length) {
    quickStatus.textContent = "한 앱은 한 번만 고를 수 있어요.";
    return;
  }
  pinnedApps = selected.filter(id => favorites.has(id));
  try {
    localStorage.setItem(pinKey, JSON.stringify(pinnedApps));
    favoriteStatus.textContent = pinnedApps.length ? "고정 순서를 저장했습니다." : "최근 즐겨찾기 순서로 돌아갔습니다.";
  } catch {
    favoriteStatus.textContent = "고정 순서는 현재 탭에서만 적용됩니다.";
  }
  renderQuickApps();
  quickDialog.close();
});

function configureLink(link, app) {
  const label = app.install ? "Windows 설치 안내" : "앱 열기";
  link.href = app.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;
  link.setAttribute("aria-label", app.title + " " + label + ", 외부 사이트 새 탭");
  link.title = "외부 사이트에서 열립니다";
}

function makeCard(app) {
  const card = template.content.firstElementChild.cloneNode(true);
  const preview = card.querySelector(".card-preview");
  if (thumbnails[app.id]) {
    const img = new Image();
    img.src = thumbnails[app.id];
    img.alt = "";
    img.width = 84;
    img.height = 50;
    img.loading = "lazy";
    img.decoding = "async";
    preview.classList.add("has-photo");
    preview.append(img);
  } else {
    preview.style.setProperty("--art-bg", app.palette[0]);
    preview.style.setProperty("--art-ink", app.palette[1]);
    preview.textContent = app.icon;
  }
  card.querySelector(".topic").textContent = app.topics[0];
  card.querySelector(".creator").textContent = app.creator;
  card.querySelector("h3").textContent = app.title;
  card.querySelector(".desc").textContent = app.desc;
  const guidanceTags = card.querySelector(".guidance-tags");
  if (app.tags?.length) {
    guidanceTags.hidden = false;
    for (const title of app.tags) {
      const tag = document.createElement("span");
      tag.className = "guidance-tag";
      tag.textContent = title;
      guidanceTags.append(tag);
    }
  }
  const linkNotice = card.querySelector(".link-notice");
  const linkResult = app.linkAudit?.result;
  linkNotice.hidden = !["moved", "review"].includes(linkResult);
  linkNotice.textContent = linkResult === "moved" ? "주소 변경" : "접속 확인 중";
  const access = card.querySelector(".access");
  const requirements = app.access.split(" · ").filter(part => part !== "웹앱");
  access.hidden = requirements.length === 0;
  access.textContent = requirements.join(" · ");
  configureLink(card.querySelector("a"), app);

  const star = card.querySelector(".star");
  setStar(star, app);
  star.addEventListener("click", () => updateFavorite(star, app));
  const opener = card.querySelector(".card-actions button");
  opener.setAttribute("aria-label", app.title + " 활용 보기");
  opener.addEventListener("click", () => {
    detailOpener = opener;
    setParams({ app: app.id });
    displayDetail(app);
  });
  return card;
}

function displayDetail(app) {
  if (detailApp === app && detail.open) return;
  detailApp = app;
  document.querySelector("#detail-meta").textContent = app.creator + " · " + app.topics.join(" · ");
  document.querySelector("#detail-title").textContent = app.title;
  document.querySelector("#detail-desc").textContent = app.desc;
  document.querySelector("#detail-access").textContent = app.note;
  document.querySelector("#detail-tip").textContent = app.tip;
  configureLink(document.querySelector("#detail-link"), app);
  const steps = app.steps || [];
  document.querySelector("#detail-steps-label").hidden = steps.length === 0;
  document.querySelector("#detail-steps-block").hidden = steps.length === 0;
  document.querySelector("#detail-steps").replaceChildren(...steps.map(text => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));

  const check = app.linkAudit;
  const results = { checked: "원본 화면 확인", moved: "새 원본 주소 확인", review: "접속 확인 중" };
  document.querySelector("#detail-link-check").textContent = check
    ? [
        "최근 점검 " + check.checkedAt + " · " + (results[check.result] || "확인 전"),
        "마지막 정상 확인 " + (check.lastSuccessAt || "기록 없음"),
        check.note
      ].filter(Boolean).join(" / ")
    : "접속 점검 기록 없음";

  const shortcuts = app.shortcuts || [];
  document.querySelector("#detail-shortcuts").hidden = shortcuts.length === 0;
  document.querySelector("#shortcut-links").replaceChildren(...shortcuts.map(shortcut => {
    const link = document.createElement("a");
    link.className = "secondary";
    link.href = shortcut.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = shortcut.label;
    link.setAttribute("aria-label", shortcut.label + ", 외부 사이트 새 탭");
    if (shortcut.note) {
      const note = document.createElement("span");
      note.className = "shortcut-note";
      note.textContent = " (" + shortcut.note + ")";
      link.append(note);
      link.setAttribute("aria-label", shortcut.label + ", " + shortcut.note + ", 외부 사이트 새 탭");
    }
    return link;
  }));
  copyButton.hidden = !hosted;
  studentShare.hidden = !studentQRs[app.id];
  qrPanel.open = false;
  if (studentQRs[app.id]) {
    document.querySelector("#student-note").textContent = app.studentNote;
    studentQR.src = studentQRs[app.id];
    studentQR.alt = app.title + " 원본 주소로 연결하는 QR 코드";
  } else {
    studentQR.removeAttribute("src");
    studentQR.alt = "";
  }
  copyStatus.textContent = "";
  copyValue.hidden = true;
  if (!detail.open) detail.showModal();
}

function shareURL(app) {
  if (!hosted) return app.url;
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("app", app.id);
  return url.href;
}

function teacherMessage(app) {
  const guide = ["[엽떡스쿨] " + app.title, app.desc, "이용 안내 — " + app.note];
  if (app.steps?.length) {
    guide.push("처음 쓰는 순서", ...app.steps.map((step, i) => (i + 1) + ". " + step));
  }
  guide.push("활용 예시 — " + app.tip);
  if (hosted) guide.push("상세 안내 — " + shareURL(app));
  guide.push("원본 앱 — " + app.url);
  return guide.join("\n");
}

async function copySharedText(app, value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    if (detailApp !== app) return;
    copyValue.hidden = true;
    copyStatus.textContent = successMessage;
  } catch {
    if (detailApp !== app) return;
    copyValue.value = value;
    copyValue.hidden = false;
    copyStatus.textContent = "아래 내용을 선택해 복사하세요.";
    copyValue.focus();
    copyValue.select();
  }
}

copyButton.addEventListener("click", () => {
  if (detailApp) copySharedText(detailApp, shareURL(detailApp), "상세 링크를 복사했습니다.");
});
copyTeacher.addEventListener("click", () => {
  if (detailApp) copySharedText(detailApp, teacherMessage(detailApp), "교사용 안내를 복사했습니다.");
});
copyStudent.addEventListener("click", () => {
  if (detailApp && studentQRs[detailApp.id]) {
    copySharedText(detailApp, detailApp.url, "학생용 링크를 복사했습니다.");
  }
});

function matchesFilters(entry, filters) {
  const app = entry.app;
  return (!filters.topic || app.topics.includes(filters.topic))
    && (!filters.creator || app.creator === filters.creator)
    && (!filters.savedOnly || favorites.has(app.id));
}

function showSearchRecovery(queryMatches, filters, query) {
  const suggestions = [
    { key: "creator", value: "", label: "모든 제작자에서 다시 검색" },
    { key: "topic", value: "", label: "모든 주제에서 다시 검색" },
    { key: "savedOnly", value: false, label: "즐겨찾기 밖에서도 검색" }
  ].filter(({ key, value }) => filters[key]
    && queryMatches.some(entry => matchesFilters(entry, { ...filters, [key]: value })));

  if (!suggestions.length && queryMatches.length) {
    suggestions.push({ key: "all", label: "필터를 풀고 다시 검색" });
  }
  if (!suggestions.length && query) {
    suggestions.push({ key: "q", label: "검색어만 지우기" });
  }

  emptyActions.replaceChildren(...suggestions.map(({ key, label }) => {
    const button = document.createElement("button");
    button.className = "secondary";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      const changes = key === "all" ? { creator: "", topic: "", saved: "" }
        : { [key === "savedOnly" ? "saved" : key]: "" };
      setParams(changes);
      update();
      search.focus();
    });
    return button;
  }));
}

function update() {
  const params = paramsNow();
  const q = params.get("q") || "";
  const topic = topics.includes(params.get("topic")) ? params.get("topic") : "";
  const creator = creators.includes(params.get("creator")) ? params.get("creator") : "";
  const savedOnly = params.get("saved") === "1";
  if (search.value !== q) search.value = q;
  clear.hidden = q.length === 0;
  topicSelect.value = topic;
  favoriteFilter.setAttribute("aria-pressed", String(savedOnly));
  for (const button of creatorFilters.children) {
    button.setAttribute("aria-pressed", String(button.dataset.value === creator));
  }

  const words = normalizedWords(q);
  const query = words.join("");
  const filters = { topic, creator, savedOnly };
  const queryMatches = appIndex
    .map(entry => ({ app: entry.app, priority: matchingPriority(entry, words, query) }))
    .filter(entry => entry.priority >= 0);
  const shown = queryMatches.filter(entry => matchesFilters(entry, filters))
    .sort((a, b) => b.priority - a.priority);
  cards.replaceChildren(...shown.map(({ app }) => makeCard(app)));

  results.textContent = [creator, topic, savedOnly ? "즐겨찾기" : "", shown.length + "개"].filter(Boolean).join(" · ");
  reset.hidden = !q && !topic && !creator && !savedOnly;
  empty.hidden = shown.length > 0;
  if (shown.length === 0) {
    document.querySelector("#empty-message").textContent = savedOnly && favorites.size === 0
      ? "아직 즐겨찾기한 앱이 없어요. 앱 카드의 별을 눌러 추가해 보세요."
      : "조건에 맞는 앱이 없어요.";
    showSearchRecovery(queryMatches, filters, q);
  } else {
    emptyActions.replaceChildren();
  }

  const requestedId = params.get("app");
  const app = byId.get(requestedId) || byId.get(appAliases.get(requestedId));
  missingApp.hidden = !requestedId || Boolean(app);
  if (app) displayDetail(app);
  else if (detail.open) detail.close();
}

for (const creator of ["", ...creators]) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter";
  button.dataset.value = creator;
  button.textContent = creator || "전체";
  const count = document.createElement("span");
  count.className = "filter-count";
  count.textContent = String(creator ? apps.filter(app => app.creator === creator).length : apps.length);
  button.append(" ", count);
  button.addEventListener("click", () => {
    setParams({ creator });
    update();
  });
  creatorFilters.append(button);
}
topicSelect.add(new Option("주제 선택", ""));
for (const topic of topics) topicSelect.add(new Option(topic, topic));

topicSelect.addEventListener("change", () => {
  setParams({ topic: topicSelect.value });
  update();
});
favoriteFilter.addEventListener("click", () => {
  const saved = paramsNow().get("saved") === "1" ? "" : "1";
  setParams({ saved });
  update();
});
function applySearch() {
  setParams({ q: search.value }, "replaceState");
  update();
}
search.addEventListener("input", event => {
  if (!event.isComposing) applySearch();
});
search.addEventListener("compositionend", applySearch);
clear.addEventListener("click", () => {
  setParams({ q: "" });
  update();
  search.focus();
});
reset.addEventListener("click", () => {
  setParams({ q: "", topic: "", creator: "", saved: "" });
  update();
  search.focus();
});
document.querySelector("#back-to-catalog").addEventListener("click", () => {
  setParams({ app: "", q: "", topic: "", creator: "", saved: "" }, "replaceState");
  update();
  search.focus();
});
function closeAppDetail() {
  setParams({ app: "" }, "replaceState");
  detail.close();
}
document.querySelector("#close").addEventListener("click", closeAppDetail);
detail.addEventListener("cancel", event => {
  event.preventDefault();
  closeAppDetail();
});
detail.addEventListener("close", () => {
  if (detail.open) return;
  detailApp = null;
  if (detailOpener?.isConnected) detailOpener.focus();
  detailOpener = null;
});
detail.addEventListener("click", event => {
  if (event.target !== detail) return;
  const box = detail.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeAppDetail();
});
window.addEventListener("popstate", update);
window.addEventListener("storage", event => {
  if (event.key !== favoriteKey && event.key !== pinKey && event.key !== null) return;
  favorites = readFavorites();
  pinnedApps = readPins();
  renderQuickApps();
  update();
});
renderQuickApps();
update();

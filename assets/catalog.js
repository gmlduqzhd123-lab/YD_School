const availableTopics = ["수학", "국어", "사회", "미술", "체육", "음악", "실과·안전", "학급 운영", "교사 업무", "바이브코딩", "놀이·생활", "기타"];
const topics = availableTopics.filter(topic => apps.some(app => app.topics.includes(topic)));
const creators = ["엽쌤스쿨", "찰떡쌤"];
const byId = new Map(apps.map(app => [app.id, app]));
const clearFilters = { creator: "", topic: "", saved: "", student: "" };
const favoriteKey = "yeoptteok-school-favorites";
const lessonPrefix = "yeoptteok-school-lesson:";
const hosted = location.protocol === "https:" || location.protocol === "http:";

const search = document.querySelector("#search");
const catalog = document.querySelector("#catalog");
const clear = document.querySelector("#clear");
const cards = document.querySelector("#cards");
const results = document.querySelector("#results");
const empty = document.querySelector("#empty");
const emptyMessage = document.querySelector("#empty-message");
const activeFilters = document.querySelector("#active-filters");
const mobileSearch = matchMedia("(max-width: 580px), (pointer: coarse)");
const reset = document.querySelector("#reset");
const template = document.querySelector("#card-template");
const detail = document.querySelector("#detail");
const detailPreview = document.querySelector("#detail-preview");
const detailThumbnail = document.querySelector("#detail-thumbnail");
const detailFavorite = document.querySelector("#detail-favorite");
const previewDialog = document.querySelector("#preview-dialog");
const previewTitle = document.querySelector("#preview-title");
const previewStage = document.querySelector("#preview-stage");
const previewCanvas = document.querySelector("#preview-canvas");
const previewNavigation = document.querySelector("#preview-navigation");
const previewPrevious = document.querySelector("#preview-previous");
const previewNext = document.querySelector("#preview-next");
const previewPosition = document.querySelector("#preview-position");
const previewStatus = document.querySelector("#preview-status");
const previewZoom = document.querySelector("#preview-zoom");
const previewLink = document.querySelector("#preview-link");
const previewShare = document.querySelector("#preview-share");
const previewHelp = document.querySelector("#preview-help");
const previewPointers = new Map();
const previewPreloads = new Map();
const topicSelect = document.querySelector("#topics");
const creatorFilters = document.querySelector("#creators");
const filterToggle = document.querySelector("#filter-toggle");
const filterCount = document.querySelector("#filter-count");
const studentFilter = document.querySelector("#student-filter");
const situationSearch = document.querySelector("#situation-search");
const favoriteFilter = document.querySelector("#favorite-filter");
const favoriteStatus = document.querySelector("#favorite-status");
const copyButton = document.querySelector("#copy-link");
const copyTeacher = document.querySelector("#copy-teacher");
const copyStudent = document.querySelector("#copy-student");
const copyStudentGuide = document.querySelector("#copy-student-guide");
const copyOriginal = document.querySelector("#copy-original");
const sendTeacher = document.querySelector("#send-teacher");
const sendStudent = document.querySelector("#send-student");
const shareDialog = document.querySelector("#share-dialog");
const shareStatuses = shareDialog.querySelectorAll(".copy-state");
const studentShare = document.querySelector("#student-share");
const openStudent = document.querySelector("#open-student");
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
const lessonDialog = document.querySelector("#lesson-bundles-dialog");
const lessonListView = document.querySelector("#lesson-list-view");
const lessonList = document.querySelector("#lesson-list");
const lessonEmpty = document.querySelector("#lesson-empty");
const lessonCreate = document.querySelector("#lesson-create");
const lessonBrowse = document.querySelector("#lesson-browse");
const lessonListStatus = document.querySelector("#lesson-list-status");
const lessonEditor = document.querySelector("#lesson-editor");
const lessonName = document.querySelector("#lesson-name");
const lessonApp = document.querySelector("#lesson-app");
const lessonAdd = document.querySelector("#lesson-add");
const lessonOrder = document.querySelector("#lesson-order");
const lessonEditorStatus = document.querySelector("#lesson-editor-status");
const lessonRowTemplate = document.querySelector("#lesson-row-template");
const missingApp = document.querySelector("#missing-app");
const copyValue = document.querySelector("#copy-value");

let fallbackParams = null;
let detailApp = null;
let detailOpener = null;
let catalogResults = [];
let previewResults = [];
let previewIndex = -1;
let previewImage = previewCanvas.firstElementChild;
let previewOpener = null;
let previewScale = 1;
let previewPinch = null;
let previewSwipe = null;
let sharedApp = null;
let shareRequest = 0;
let favorites = readFavorites();
let pinnedApps = readPins();
let editingLesson = null;
let draftLessonApps = [];

function normalizedWords(text) {
  return text.normalize("NFKC").toLocaleLowerCase("ko").match(/[\p{L}\p{N}]+/gu) ?? [];
}

function compact(text) {
  return normalizedWords(text).join("");
}

const appIndex = apps.map(app => {
  const situations = classroomSituations
    .filter(situation => situation.appIds.includes(app.id))
    .flatMap(situation => [situation.label, ...situation.keywords]);
  const studentKeywords = studentURL(app)
    ? ["학생용 링크", "학생 링크", "학생 공유", "학생에게 공유"]
    : [];
  return {
    app,
    title: compact(app.title),
    fields: [
      app.title, app.creator, app.desc, app.access, ...app.topics, ...app.keys, ...(app.tags || []),
      ...accessLabels(app), ...situations, ...studentKeywords
    ].map(compact)
  };
});

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
  button.textContent = saved ? "★ 즐겨찾기" : "☆ 즐겨찾기";
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
  setStar(button, app);
  if (paramsNow().get("saved") === "1" && wasSaved) update();
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

function readLessonBundle(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (!saved || typeof saved.name !== "string" || !saved.name.trim() || !Array.isArray(saved.appIds)) return null;
    return {
      id: key.slice(lessonPrefix.length),
      name: saved.name,
      appIds: [...new Set(saved.appIds)].filter(id => byId.has(id)),
      createdAt: Number.isFinite(saved.createdAt) ? saved.createdAt : 0
    };
  } catch {
    return null;
  }
}

function readLessonBundles() {
  try {
    return Object.keys(localStorage).filter(key => key.startsWith(lessonPrefix))
      .map(readLessonBundle).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function renderLessonList(openId = lessonList.querySelector("details[open]")?.dataset.id) {
  const lessons = readLessonBundles();
  lessonCreate.hidden = favorites.size === 0;
  lessonBrowse.hidden = favorites.size > 0;
  lessonEmpty.hidden = lessons.length > 0 && favorites.size > 0;
  lessonEmpty.textContent = favorites.size > 0
    ? "즐겨찾기한 앱을 골라 수업 순서대로 묶어보세요."
    : "앱의 활용 보기에서 즐겨찾기에 추가하면 새 묶음을 만들 수 있어요.";
  lessonList.replaceChildren(...lessons.map(lesson => {
    const bundle = document.createElement("details");
    bundle.className = "lesson-bundle";
    bundle.dataset.id = lesson.id;
    bundle.open = lesson.id === (openId ?? lessons[0]?.id);
    const summary = document.createElement("summary");
    summary.append(lesson.name);
    const count = document.createElement("span");
    count.className = "lesson-count";
    count.textContent = `앱 ${lesson.appIds.length}개`;
    summary.append(" ", count);

    const body = document.createElement("div");
    body.className = "lesson-bundle-body";
    const order = document.createElement("ol");
    order.className = "lesson-order";
    order.setAttribute("aria-label", "실행 순서");
    for (const id of lesson.appIds) {
      const app = byId.get(id);
      const item = document.createElement("li");
      const link = document.createElement("a");
      configureLink(link, app);
      link.textContent = app.install ? `${app.title} · 설치 안내` : app.title;
      item.append(link);
      order.append(item);
    }
    if (lesson.appIds.length) body.append(order);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "편집";
    edit.setAttribute("aria-label", `${lesson.name} 편집`);
    edit.addEventListener("click", () => openLessonEditor(lesson));
    body.append(edit);
    bundle.append(summary, body);
    return bundle;
  }));
}

function renderLessonChoices() {
  const selected = lessonApp.value;
  const choices = [...favorites].filter(id => !draftLessonApps.includes(id)).map(id => byId.get(id))
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));
  lessonApp.replaceChildren(new Option(choices.length ? "앱 선택" : "추가할 즐겨찾기 앱 없음", ""),
    ...choices.map(app => new Option(app.title, app.id)));
  lessonApp.disabled = choices.length === 0;
  lessonApp.value = choices.some(app => app.id === selected) ? selected : "";
  lessonAdd.disabled = !lessonApp.value;
}

function renderLessonOrder() {
  renderLessonChoices();
  lessonOrder.replaceChildren(...draftLessonApps.map((id, index) => {
    const row = lessonRowTemplate.content.firstElementChild.cloneNode(true);
    const title = byId.get(id).title;
    row.dataset.appId = id;
    row.querySelector(".lesson-app-title").textContent = title;
    for (const button of row.querySelectorAll("button")) {
      button.setAttribute("aria-label", `${title} ${button.textContent}`);
    }
    row.querySelector('[data-lesson-action="up"]').disabled = index === 0;
    row.querySelector('[data-lesson-action="down"]').disabled = index === draftLessonApps.length - 1;
    return row;
  }));
}

function openLessonEditor(lesson = null) {
  editingLesson = lesson;
  draftLessonApps = lesson ? [...lesson.appIds] : [];
  lessonName.value = lesson?.name ?? "";
  lessonEditorStatus.textContent = "";
  lessonListView.hidden = true;
  lessonEditor.hidden = false;
  lessonApp.value = "";
  renderLessonOrder();
  lessonDialog.scrollTop = 0;
  lessonName.focus();
}

function closeLessonEditor(openId, message = "") {
  lessonEditor.hidden = true;
  lessonListView.hidden = false;
  renderLessonList(openId);
  lessonListStatus.textContent = message;
  lessonDialog.scrollTop = 0;
  const target = lessonList.querySelector("details[open] summary") || (favorites.size ? lessonCreate : lessonBrowse);
  target.focus({ preventScroll: true });
}

document.querySelector("#lesson-bundles-open").addEventListener("click", () => {
  lessonEditor.hidden = true;
  lessonListView.hidden = false;
  lessonListStatus.textContent = "";
  renderLessonList();
  lessonDialog.showModal();
  lessonDialog.scrollTop = 0;
});
document.querySelector("#lesson-bundles-close").addEventListener("click", () => lessonDialog.close());
lessonBrowse.addEventListener("click", () => lessonDialog.close());
lessonCreate.addEventListener("click", () => openLessonEditor());
document.querySelector("#lesson-cancel").addEventListener("click", () => closeLessonEditor(editingLesson?.id));
lessonApp.addEventListener("change", () => { lessonAdd.disabled = !lessonApp.value; });
lessonAdd.addEventListener("click", () => {
  const id = lessonApp.value;
  if (!favorites.has(id) || draftLessonApps.includes(id)) return;
  draftLessonApps.push(id);
  lessonEditorStatus.textContent = "";
  renderLessonOrder();
  (lessonApp.disabled ? lessonOrder.lastElementChild.querySelector("button:enabled") : lessonApp).focus({ preventScroll: true });
});
lessonOrder.addEventListener("click", event => {
  const button = event.target.closest("button[data-lesson-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.lessonAction;
  const index = draftLessonApps.indexOf(button.closest("li").dataset.appId);
  let destination = index;
  if (action === "remove") {
    draftLessonApps.splice(index, 1);
    destination = Math.min(index, draftLessonApps.length - 1);
  } else {
    destination += action === "up" ? -1 : 1;
    [draftLessonApps[index], draftLessonApps[destination]] = [draftLessonApps[destination], draftLessonApps[index]];
  }
  lessonEditorStatus.textContent = "";
  renderLessonOrder();
  const row = lessonOrder.children[destination];
  const target = row?.querySelector(`[data-lesson-action="${action}"]:enabled`) || row?.querySelector("button:enabled") || lessonApp;
  target.focus({ preventScroll: true });
});
lessonEditor.addEventListener("submit", event => {
  event.preventDefault();
  const name = lessonName.value.trim();
  if (!name) {
    lessonEditorStatus.textContent = "묶음 이름을 입력하세요.";
    lessonName.focus();
    return;
  }
  if (!draftLessonApps.length) {
    lessonEditorStatus.textContent = "실행할 앱을 하나 이상 추가하세요.";
    lessonApp.focus();
    return;
  }
  const id = editingLesson?.id ?? crypto.randomUUID();
  const createdAt = editingLesson?.createdAt ?? Date.now();
  try {
    localStorage.setItem(lessonPrefix + id, JSON.stringify({ name, appIds: draftLessonApps, createdAt }));
  } catch {
    lessonEditorStatus.textContent = "브라우저 저장 공간을 사용할 수 없어 묶음을 저장하지 못했어요.";
    return;
  }
  closeLessonEditor(id, "수업 묶음을 저장했습니다.");
});

function configureLink(link, app, label = app.install ? "Windows 설치 안내" : "앱 열기") {
  const destination = app.install && label === "앱 열기" ? "Windows 설치 안내 새 탭" : "외부 사이트 새 탭";
  link.href = app.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;
  link.setAttribute("aria-label", app.title + " " + label + ", " + destination);
  link.title = app.install ? "Windows 설치 안내가 열립니다" : "외부 사이트에서 열립니다";
}

function accessLabels(app) {
  const labels = app.access.split(" · ").filter(label => label !== "웹앱");
  const studentCondition = studentShortcut(app)?.note;
  if (studentCondition) labels.push(studentCondition);
  return [...new Set(labels)];
}

function makeCard(app) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector("h3").textContent = app.title;
  card.querySelector(".desc").textContent = app.desc;
  configureLink(card.querySelector(".card-actions .primary"), app, "앱 열기");

  const opener = card.querySelector(".card-detail");
  opener.setAttribute("aria-label", app.title + " 활용 보기");
  opener.addEventListener("click", () => {
    detailOpener = opener;
    setParams({ app: app.id });
    displayDetail(app);
  });
  const share = card.querySelector(".card-share");
  share.setAttribute("aria-label", app.title + " 공유");
  share.addEventListener("click", () => openShare(app));
  return card;
}

function previewCenter() {
  const box = previewStage.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function previewImagePoint(point) {
  const box = previewImage.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (point.x - box.left) / box.width)),
    y: Math.max(0, Math.min(1, (point.y - box.top) / box.height))
  };
}

function updatePreviewZoomControls() {
  const zoomed = previewScale > 1;
  previewStage.tabIndex = zoomed ? 0 : -1;
  const label = previewScale >= 2 ? "화면에 맞추기" : "2배 확대";
  if (previewZoom.textContent !== label) previewZoom.textContent = label;
  const hint = zoomed ? "한 손가락으로 이미지 이동" : previewResults.length > 1
    ? "좌우로 밀어 앱 이동 · 두 손가락 확대"
    : "두 손가락으로 확대·축소";
  if (previewHelp.textContent !== hint) previewHelp.textContent = hint;
}

function setPreviewScale(value, point, imagePoint) {
  previewScale = Math.max(1, Math.min(3, value));
  const zoomed = previewScale > 1;
  if (zoomed && !point) {
    point = previewCenter();
    imagePoint = previewImagePoint(point);
  }

  const box = previewStage.getBoundingClientRect();
  const width = box.width - 2 * previewStage.clientLeft;
  const height = box.height - 2 * previewStage.clientTop;
  const fitWidth = Math.min(width, height * previewImage.naturalWidth / previewImage.naturalHeight);
  previewImage.style.width = `${Math.floor(fitWidth * previewScale)}px`;
  updatePreviewZoomControls();

  if (!zoomed) {
    previewStage.scrollTo(0, 0);
    return;
  }
  // Keep the same image point under the fingers as the image changes size.
  const scaled = previewImage.getBoundingClientRect();
  previewStage.scrollBy(scaled.left + imagePoint.x * scaled.width - point.x,
    scaled.top + imagePoint.y * scaled.height - point.y);
}

function previewTouchPair() {
  const [first, second] = previewPointers.values();
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    distance: Math.hypot(first.x - second.x, first.y - second.y)
  };
}

previewStage.addEventListener("pointerdown", event => {
  if (event.pointerType !== "touch" || previewZoom.disabled || previewPointers.size >= 2) return;
  previewStage.setPointerCapture(event.pointerId);
  const point = { x: event.clientX, y: event.clientY };
  previewPointers.set(event.pointerId, point);
  previewSwipe = previewPointers.size === 1 && previewScale === 1 ? point : null;
  if (previewPointers.size === 2) {
    const pair = previewTouchPair();
    previewPinch = { scale: previewScale, distance: Math.max(1, pair.distance), imagePoint: previewImagePoint(pair) };
  }
});

previewStage.addEventListener("pointermove", event => {
  const previous = previewPointers.get(event.pointerId);
  if (!previous) return;
  const position = { x: event.clientX, y: event.clientY };
  previewPointers.set(event.pointerId, position);
  if (previewPinch) {
    const pair = previewTouchPair();
    setPreviewScale(previewPinch.scale * pair.distance / previewPinch.distance, pair, previewPinch.imagePoint);
  } else if (previewScale > 1) {
    previewStage.scrollBy(previous.x - position.x, previous.y - position.y);
  }
});

for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  previewStage.addEventListener(type, event => {
    if (!previewPointers.delete(event.pointerId)) return;
    const start = previewSwipe;
    previewPinch = null;
    previewSwipe = null;
    if (type !== "pointerup" || !start || previewScale !== 1) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const threshold = Math.max(48, Math.min(80, previewStage.clientWidth * .16));
    if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.35) movePreview(dx < 0 ? 1 : -1);
  });
}

new ResizeObserver(() => {
  if (previewDialog.open && !previewCanvas.hidden) setPreviewScale(previewScale);
}).observe(previewStage, { box: "border-box" });

function showPreview(app, trigger) {
  previewOpener = trigger;
  const index = catalogResults.indexOf(app);
  previewResults = index < 0 ? [app] : catalogResults;
  previewIndex = Math.max(0, index);
  previewDialog.showModal();
  displayPreview();
}

function movePreview(offset) {
  const nextIndex = previewIndex + offset;
  if (nextIndex < 0 || nextIndex >= previewResults.length) return;
  previewIndex = nextIndex;
  displayPreview();
}

function previewSource(app) {
  return `./assets/previews-hd/${app.id}.webp`;
}

function preloadPreviewNeighbors(sources) {
  for (const [source, image] of previewPreloads) {
    if (sources.includes(source)) continue;
    image.removeAttribute("src");
    previewPreloads.delete(source);
  }
  for (const source of sources) {
    if (previewPreloads.has(source)) continue;
    const image = new Image();
    image.fetchPriority = "low";
    image.src = source;
    previewPreloads.set(source, image);
    image.decode().catch(() => {});
  }
}

function displayPreview() {
  const app = previewResults[previewIndex];
  const active = document.activeElement;
  previewNavigation.hidden = previewResults.length < 2;
  previewPosition.textContent = `${previewIndex + 1} / ${previewResults.length}`;
  previewPrevious.disabled = previewIndex === 0;
  previewNext.disabled = previewIndex === previewResults.length - 1;
  if (active === previewPrevious && previewPrevious.disabled) previewNext.focus({ preventScroll: true });
  if (active === previewNext && previewNext.disabled) previewPrevious.focus({ preventScroll: true });

  previewTitle.textContent = app.title + " 미리보기";
  configureLink(previewLink, app);
  previewShare.onclick = () => {
    previewShare.focus({ preventScroll: true });
    openShare(app);
  };
  previewStatus.textContent = "고해상도 미리보기를 불러오는 중…";
  previewStatus.hidden = false;
  previewCanvas.hidden = true;
  previewStage.scrollTo(0, 0);
  previewPointers.clear();
  previewPinch = null;
  previewSwipe = null;
  previewScale = 1;
  updatePreviewZoomControls();
  previewZoom.disabled = true;

  const source = previewSource(app);
  const neighbors = [previewResults[previewIndex - 1], previewResults[previewIndex + 1]]
    .filter(Boolean).map(previewSource);
  const image = previewPreloads.get(source) ?? new Image();
  previewPreloads.delete(source);
  image.id = "preview-image";
  image.alt = app.title + " 앱 화면";
  image.draggable = false;
  image.fetchPriority = "high";
  let fallback = thumbnails[app.id];
  image.onload = () => {
    if (!previewDialog.open || previewImage !== image) return;
    image.onload = null;
    image.onerror = null;
    previewCanvas.hidden = false;
    setPreviewScale(1);
    previewZoom.disabled = false;
    previewStatus.hidden = Boolean(fallback);
  };
  image.onerror = () => {
    if (!previewDialog.open || previewImage !== image) return;
    if (fallback) {
      previewStatus.textContent = "고해상도 이미지를 불러오지 못해 기본 미리보기를 표시합니다.";
      image.src = fallback;
      fallback = null;
      return;
    }
    previewStatus.textContent = "미리보기 이미지를 불러오지 못했습니다.";
  };

  const previousSource = previewImage.getAttribute("src");
  previewImage.onload = null;
  previewImage.onerror = null;
  if (neighbors.includes(previousSource)) {
    previewImage.fetchPriority = "low";
    previewPreloads.set(previousSource, previewImage);
  } else {
    previewImage.removeAttribute("src");
  }
  previewCanvas.replaceChildren(image);
  previewImage = image;
  if (!image.hasAttribute("src")) image.src = source;
  else if (image.complete) {
    if (image.naturalWidth) image.onload();
    else image.onerror();
  }
  preloadPreviewNeighbors(neighbors);
}

previewPrevious.addEventListener("click", () => movePreview(-1));
previewNext.addEventListener("click", () => movePreview(1));
previewDialog.addEventListener("keydown", event => {
  if (previewScale > 1 || previewResults.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  movePreview(event.key === "ArrowLeft" ? -1 : 1);
});
previewZoom.addEventListener("click", () => setPreviewScale(previewScale >= 2 ? 1 : 2));
document.querySelector("#preview-close").addEventListener("click", () => previewDialog.close());
previewDialog.addEventListener("close", () => {
  if (previewDialog.open) return;
  previewShare.onclick = null;
  previewImage.onload = null;
  previewImage.onerror = null;
  previewImage.removeAttribute("src");
  preloadPreviewNeighbors([]);
  previewResults = [];
  previewIndex = -1;
  previewPointers.clear();
  previewPinch = null;
  previewSwipe = null;
  if (previewOpener?.isConnected) previewOpener.focus({ preventScroll: true });
  previewOpener = null;
});

function displayDetail(app) {
  setStar(detailFavorite, app);
  if (detailApp === app && detail.open) return;
  detailApp = app;
  document.querySelector("#detail-meta").textContent = app.creator + " · " + app.topics.join(" · ");
  document.querySelector("#detail-title").textContent = app.title;
  document.querySelector("#detail-desc").textContent = app.desc;
  document.querySelector("#detail-requirements").textContent = accessLabels(app).join(" · ") || app.access;
  document.querySelector("#detail-access").textContent = app.note;
  document.querySelector("#detail-tip").textContent = app.tip;
  configureLink(document.querySelector("#detail-link"), app);
  const thumbnail = thumbnails[app.id];
  detailThumbnail.hidden = !thumbnail;
  if (thumbnail) detailThumbnail.src = thumbnail;
  else detailThumbnail.removeAttribute("src");
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

  const shortcuts = app.shortcuts?.filter(shortcut => !shortcut.student) || [];
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
  detail.scrollTop = 0;
  if (!detail.open) detail.showModal();
}

document.querySelector("#detail-share").addEventListener("click", () => {
  if (detailApp) openShare(detailApp);
});
detailThumbnail.addEventListener("error", () => { detailThumbnail.hidden = true; });
detailPreview.addEventListener("click", () => {
  if (detailApp) showPreview(detailApp, detailPreview);
});
detailFavorite.addEventListener("click", () => {
  if (detailApp) updateFavorite(detailFavorite, detailApp);
});

function studentShortcut(app) {
  return app.shortcuts?.find(shortcut => shortcut.student);
}

function studentURL(app) {
  if (!app.studentNote) return null;
  return studentShortcut(app)?.url || app.url;
}

function openShare(app) {
  const studentLink = studentURL(app);
  sharedApp = app;
  shareRequest++;
  document.querySelector("#share-app-name").textContent = app.title;
  document.querySelector("#student-note").textContent = app.studentNote || "";
  studentShare.hidden = !studentLink;
  if (studentLink) openStudent.href = studentLink;
  else openStudent.removeAttribute("href");
  document.querySelector("#original-share").hidden = app.url === studentLink;
  copyButton.hidden = !hosted;
  sendTeacher.hidden = !canSend({ url: shareURL(app) });
  sendStudent.hidden = !studentLink || !canSend({ url: studentLink });

  const qr = studentQRs[app.id];
  qrPanel.open = false;
  qrPanel.hidden = !qr;
  if (qr) {
    studentQR.src = qr;
    studentQR.alt = app.title + " 학생용 링크 QR 코드";
  } else {
    studentQR.removeAttribute("src");
    studentQR.alt = "";
  }
  clearShareFeedback();
  shareDialog.showModal();
  shareDialog.scrollTop = 0;
}

document.querySelector("#share-close").addEventListener("click", () => shareDialog.close());

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

function clearShareFeedback() {
  for (const status of shareStatuses) status.textContent = "";
  copyValue.hidden = true;
}

function activeShareStatus(button) {
  clearShareFeedback();
  return button.closest(".share-panel").querySelector(".copy-state");
}

async function copySharedText(button, value, successMessage) {
  const status = activeShareStatus(button);
  const request = ++shareRequest;
  try {
    await navigator.clipboard.writeText(value);
    if (!shareDialog.open || request !== shareRequest) return;
    status.textContent = successMessage;
  } catch {
    if (!shareDialog.open || request !== shareRequest) return;
    copyValue.value = value;
    copyValue.hidden = false;
    status.textContent = "아래 내용을 선택해 복사하세요.";
    status.after(copyValue);
    copyValue.focus();
    copyValue.select();
  }
}

function canSend(data) {
  return typeof navigator.share === "function" && (navigator.canShare?.(data) ?? true);
}

async function sendSharedLink(button, data) {
  const status = activeShareStatus(button);
  const request = ++shareRequest;
  try {
    await navigator.share(data);
  } catch (error) {
    if (!shareDialog.open || request !== shareRequest || error.name === "AbortError") return;
    status.textContent = "공유 메뉴를 열 수 없어요. 복사 버튼을 이용해 주세요.";
  }
}

copyButton.addEventListener("click", () => {
  copySharedText(copyButton, shareURL(sharedApp), "상세 링크를 복사했습니다.");
});
copyTeacher.addEventListener("click", () => {
  copySharedText(copyTeacher, teacherMessage(sharedApp), "교사용 안내를 복사했습니다.");
});
copyStudent.addEventListener("click", () => {
  copySharedText(copyStudent, studentURL(sharedApp), "학생용 링크를 복사했습니다.");
});
copyStudentGuide.addEventListener("click", () => {
  const guide = [`[${sharedApp.title}]`, sharedApp.studentNote, studentURL(sharedApp)].join("\n");
  copySharedText(copyStudentGuide, guide, "학생용 안내와 링크를 복사했습니다.");
});
copyOriginal.addEventListener("click", () => {
  copySharedText(copyOriginal, sharedApp.url, "원본 앱 주소를 복사했습니다.");
});
sendTeacher.addEventListener("click", () => {
  sendSharedLink(sendTeacher, { title: sharedApp.title, text: sharedApp.desc, url: shareURL(sharedApp) });
});
sendStudent.addEventListener("click", () => {
  sendSharedLink(sendStudent, { title: sharedApp.title, text: sharedApp.studentNote, url: studentURL(sharedApp) });
});

function matchesFilters(entry, filters) {
  const app = entry.app;
  return (!filters.topic || app.topics.includes(filters.topic))
    && (!filters.creator || app.creator === filters.creator)
    && (!filters.studentOnly || Boolean(studentURL(app)))
    && (!filters.savedOnly || favorites.has(app.id));
}

function relatedTopicSuggestions(query, filters) {
  const text = compact(query);
  if (!text) return [];
  return topics.filter(topic => {
    const keywords = [topic, ...(relatedTopicKeywords[topic] || [])];
    return keywords.some(keyword => text.includes(compact(keyword)))
      && appIndex.some(entry => matchesFilters(entry, { ...filters, topic }));
  }).slice(0, 2).map(topic => ({ label: topic + " 앱 보기", changes: { q: "", topic } }));
}

function renderActiveFilters(active) {
  activeFilters.hidden = active.length === 0;
  activeFilters.replaceChildren(...active.map(({ param, label }, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter";
    button.textContent = `${label} ×`;
    button.setAttribute("aria-label", `${label} 필터 해제`);
    button.addEventListener("click", () => {
      setParams({ [param]: "" });
      update();
      const target = activeFilters.children[index] || activeFilters.lastElementChild || results;
      target.focus({ preventScroll: true });
    });
    return button;
  }));
}

function filterRecoverySuggestions(queryMatches, filters, active) {
  const groups = new Map();
  for (const entry of queryMatches) {
    const blocked = active.filter(({ key }) => !matchesFilters(entry, { [key]: filters[key] }));
    if (!blocked.length) continue;
    const signature = blocked.map(({ param }) => param).join(",");
    const group = groups.get(signature);
    if (group) group.count++;
    else groups.set(signature, { blocked, count: 1 });
  }
  const ranked = [...groups.values()].sort((a, b) => a.blocked.length - b.blocked.length || b.count - a.count);
  return ranked.filter(({ blocked }) => blocked.length === ranked[0].blocked.length).slice(0, 3).map(({ blocked, count }) => ({
    label: `${blocked.map(({ label }) => label).join("·")} 조건 해제 (앱 ${count}개)`,
    changes: Object.fromEntries(blocked.map(({ param }) => [param, ""]))
  }));
}

function revealResults() {
  const target = empty.hidden ? results : emptyMessage;
  const viewport = window.visualViewport;
  const keyboardMayBeOpen = viewport && viewport.height < window.innerHeight - 80;
  target.focus({ preventScroll: true });
  if (!mobileSearch.matches) return;

  const show = () => {
    if (document.activeElement === target) target.scrollIntoView({ block: "start", behavior: "instant" });
  };
  requestAnimationFrame(show);
  if (keyboardMayBeOpen) {
    const controller = new AbortController();
    viewport.addEventListener("resize", show, { signal: controller.signal });
    setTimeout(() => controller.abort(), 550);
  }
}

function showSearchRecovery(queryMatches, filters, active, query) {
  const suggestions = filterRecoverySuggestions(queryMatches, filters, active);
  if (!queryMatches.length && query) {
    suggestions.push(...relatedTopicSuggestions(query, filters));
  }
  if (!suggestions.length && query) suggestions.push({ label: "검색어만 지우기", changes: { q: "" } });

  emptyActions.replaceChildren(...suggestions.map(({ label, changes }) => {
    const button = document.createElement("button");
    button.className = "secondary";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      setParams(changes);
      update();
      revealResults();
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
  const studentOnly = params.get("student") === "1";
  const filterTotal = Number(Boolean(creator)) + Number(Boolean(topic));
  if (search.value !== q) search.value = q;
  clear.hidden = q.length === 0;
  catalog.classList.toggle("is-filtering", Boolean(q.trim() || filterTotal || studentOnly));
  filterCount.textContent = filterTotal ? " " + filterTotal : "";
  topicSelect.value = topic;
  studentFilter.setAttribute("aria-pressed", String(studentOnly));
  favoriteFilter.setAttribute("aria-pressed", String(savedOnly));
  for (const button of creatorFilters.children) {
    button.setAttribute("aria-pressed", String(button.dataset.value === creator));
  }

  const words = normalizedWords(q);
  const query = words.join("");
  for (const button of situationSearch.children) {
    button.setAttribute("aria-pressed", String(button.dataset.query === query));
  }
  const filters = { topic, creator, savedOnly, studentOnly };
  const active = [
    { key: "creator", param: "creator", label: creator },
    { key: "topic", param: "topic", label: topic },
    { key: "studentOnly", param: "student", label: "학생 링크" },
    { key: "savedOnly", param: "saved", label: "즐겨찾기" }
  ].filter(({ key }) => filters[key]);
  const queryMatches = appIndex
    .map(entry => ({ app: entry.app, priority: matchingPriority(entry, words, query) }))
    .filter(entry => entry.priority >= 0);
  const shown = queryMatches.filter(entry => matchesFilters(entry, filters))
    .sort((a, b) => b.priority - a.priority);
  catalogResults = shown.map(({ app }) => app);
  cards.replaceChildren(...catalogResults.map(makeCard));

  results.textContent = `앱 ${shown.length}개`;
  renderActiveFilters(active);
  reset.hidden = !q && !topic && !creator && !savedOnly && !studentOnly;
  empty.hidden = shown.length > 0;
  if (shown.length === 0) {
    emptyMessage.textContent = savedOnly && favorites.size === 0
      ? "아직 즐겨찾기한 앱이 없어요. 활용 보기에서 즐겨찾기에 추가해 보세요."
      : "조건에 맞는 앱이 없어요.";
    showSearchRecovery(queryMatches, filters, active, q);
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
topicSelect.add(new Option("모든 주제", ""));
for (const topic of topics) topicSelect.add(new Option(topic, topic));

for (const { label } of classroomSituations.filter(situation => situation.quickSearch)) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter";
  button.dataset.query = compact(label);
  button.textContent = label;
  button.addEventListener("click", () => {
    const selected = button.getAttribute("aria-pressed") === "true";
    setParams({ q: selected ? "" : label });
    update();
  });
  situationSearch.append(button);
}

filterToggle.addEventListener("click", () => {
  const expanded = filterToggle.getAttribute("aria-expanded") === "true";
  filterToggle.setAttribute("aria-expanded", String(!expanded));
});
topicSelect.addEventListener("change", () => {
  setParams({ topic: topicSelect.value });
  update();
});
studentFilter.addEventListener("click", () => {
  const student = paramsNow().get("student") === "1" ? "" : "1";
  setParams({ student });
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
document.querySelector("#search-form").addEventListener("submit", event => {
  event.preventDefault();
  applySearch();
  filterToggle.setAttribute("aria-expanded", "false");
  if (mobileSearch.matches) revealResults();
  else search.blur();
});
clear.addEventListener("click", () => {
  setParams({ q: "" });
  update();
  search.focus();
});
reset.addEventListener("click", () => {
  setParams({ q: "", ...clearFilters });
  update();
  search.focus();
});
document.querySelector("#back-to-catalog").addEventListener("click", () => {
  setParams({ app: "", q: "", ...clearFilters }, "replaceState");
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
  if (detailOpener) (detailOpener.isConnected ? detailOpener : favoriteFilter).focus();
  detailOpener = null;
});
function closeOnBackdrop(dialog, close) {
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
  });
}

closeOnBackdrop(detail, closeAppDetail);
closeOnBackdrop(previewDialog, () => previewDialog.close());
const developerDialog = document.querySelector("#developer-dialog");
document.querySelector("#developer-open").addEventListener("click", () => developerDialog.showModal());
closeOnBackdrop(developerDialog, () => developerDialog.close());
window.addEventListener("popstate", () => {
  if (shareDialog.open) shareDialog.close();
  if (previewDialog.open) previewDialog.close();
  update();
});
window.addEventListener("storage", event => {
  if (event.key?.startsWith(lessonPrefix)) {
    if (lessonDialog.open && lessonEditor.hidden) renderLessonList();
    return;
  }
  if (event.key !== favoriteKey && event.key !== pinKey && event.key !== null) return;
  favorites = readFavorites();
  pinnedApps = readPins();
  renderQuickApps();
  if (lessonDialog.open) {
    if (lessonEditor.hidden) renderLessonList();
    else renderLessonChoices();
  }
  update();
});
renderQuickApps();
update();

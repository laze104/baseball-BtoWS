// =============================================
// create.js : 선수 만들기 화면 (선택 상자 채우기, 학교 검색, 시작 카드 덱)
// =============================================

function fillSelect(select, items) {
  select.innerHTML = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.textContent = item;
    select.appendChild(option);
  }
}

function updateOptionsByType() {
  const type = typeSelect.value;
  fillSelect(positionSelect, POSITIONS[type]);
  fillSelect(styleSelect, Object.keys(STYLES[type]));
}

// 고등학교 목록: 이름·권역으로 검색할 수 있음 (가나다순)
const LEVEL_LABEL = { 3: "전통 강호", 2: "강팀", 1: "중위권", 0: "약체" };
const sortedSchools = [...HIGH_SCHOOLS].sort((a, b) => a.name.localeCompare(b.name, "ko"));

function fillSchools(keyword) {
  const k = (keyword || "").trim();
  const list = sortedSchools.filter((sc) => !k || sc.name.includes(k) || hsRegion(sc.name).includes(k));
  const before = schoolSelect.value;
  schoolSelect.innerHTML = "";
  for (const sc of list) {
    const option = document.createElement("option");
    option.value = sc.name;
    option.textContent = `${sc.name} · ${hsRegion(sc.name)} · ${LEVEL_LABEL[sc.level]}`;
    schoolSelect.appendChild(option);
  }
  if (list.some((sc) => sc.name === before)) schoolSelect.value = before;
  $("school-count").textContent = k ? `(${list.length}개 검색됨)` : `(${HIGH_SCHOOLS.length}개 학교)`;
}
fillSchools("");
$("school-search").addEventListener("input", (event) => fillSchools(event.target.value));
updateOptionsByType();
typeSelect.addEventListener("change", updateOptionsByType);

// ---------------------------------------------
// 시작 카드 덱
// ---------------------------------------------

// 선수 만들기 화면의 서포트 카드 (cards.js)
function renderDeckPicker() {
  $("deck-box").innerHTML = deckPickerHtml();
  $("number").value = randomInt(1, 99);
}
$("deck-box").addEventListener("change", (event) => {
  const picked = pickedDeck();
  if (picked.length > DECK_SIZE) event.target.checked = false;
  $("deck-count").textContent = pickedDeck().length;
});
renderDeckPicker();

// =============================================
// player-view.js : 선수 화면 (탭, 능력치, 집중 훈련 고르기, 포지션 변경)
// =============================================

// ---------------------------------------------
// 1. 탭
// ---------------------------------------------

// 통산 기록·연감·순위는 '기록' 탭 아래 하위 탭으로 묶음
const RECORD_SUBTABS = ["record", "analysis", "almanac", "rank"];
let lastRecordSub = "record";

function setTab(name) {
  if (name === "records") name = lastRecordSub; // 기록 탭 누르면 마지막으로 본 하위 탭
  const inRecords = RECORD_SUBTABS.includes(name);
  if (inRecords) lastRecordSub = name;
  for (const button of document.querySelectorAll("#tabs button")) {
    button.classList.toggle("active", button.dataset.tab === (inRecords ? "records" : name));
  }
  $("subtabs").hidden = !inRecords; // 하위 탭은 기록 탭일 때만
  for (const button of document.querySelectorAll("#subtabs button")) {
    button.classList.toggle("active", button.dataset.tab === name);
  }
  for (const tab of document.querySelectorAll(".tab")) {
    tab.hidden = tab.id !== `tab-${name}`;
  }
}

$("tabs").addEventListener("click", (event) => {
  if (event.target.dataset.tab) setTab(event.target.dataset.tab);
});
$("subtabs").addEventListener("click", (event) => {
  if (event.target.dataset.tab) setTab(event.target.dataset.tab);
});

// ---------------------------------------------
// 2. 화면 그리기
// ---------------------------------------------

function ovrClass(ovr) {
  if (ovr >= 70) return "ovr legend";
  if (ovr >= 60) return "ovr high";
  return "ovr";
}

function statListHtml(title, stats, statNames, ovr, gains) {
  let html = `<h3>${title} <span class="${ovrClass(ovr)}">OVR ${ovr}</span></h3><ul class="stats">`;
  for (const [key, label] of Object.entries(statNames)) {
    const value = stats[key];
    const gain = gains[key] || 0;
    let gainHtml = "";
    if (gain > 0) gainHtml = `<span class="gain">+${gain}</span>`;
    if (gain < 0) gainHtml = `<span class="loss">${gain}</span>`;
    html += `<li><span>${label}</span><span class="bar" style="--v:${value}"></span><b>${value}${gainHtml}</b></li>`;
  }
  return html + "</ul>";
}

function stageText(player) {
  if (player.league === "HS") {
    return player.age >= 19 ? `${player.school} 졸업` : `${player.school} ${player.age - 15}학년`;
  }
  if (player.league === "COLLEGE") {
    return player.age >= 23 ? `${player.college} 졸업` : `${player.college} ${player.age - 18}학년`;
  }
  return `${LEAGUES[player.league].name} · ${player.team}`;
}

function showPlayer(player) {
  currentPlayer = player;
  const gains = player.lastReport ? player.lastReport.gains : {};
  const ovrs = getOvrs(player);

  const fame = player.fame || 0;
  $("player-header").innerHTML = `
    <h2>${player.number !== undefined ? `<span class="jersey">${player.number}</span>` : ""}${player.name}${player.nickname ? ` <span class="nick">'${player.nickname}'</span>` : ""} <small>${koreanAge(player.age)}세 · ${player.position} · ${player.hand}</small></h2>
    <p class="stage">${gameYear(player)}년 · ${stageText(player)}<span>💰 ${fmtMoney(player.money)}</span></p>
    <p class="badges"><span class="${fame >= 30 ? "good" : fame <= -10 ? "bad" : ""}">팬 여론 ${fameLabel(fame)} (${fame})</span>${
      isFranchiseHere(player) ? `<span class="star">★ ${player.team} 프랜차이즈 스타</span>` : ""
    }${militaryBadge(player)}${player.married ? "<span>💍 기혼</span>" : player.dating ? "<span>💕 열애 중</span>" : ""}${
      player.kids ? `<span>👶 자녀 ${player.kids}</span>` : ""
    }${player.pet ? "<span>🐶 반려견</span>" : ""}${player.trainee ? "<span>육성선수 출신</span>" : ""}</p>${chantHtml(player)}`;

  let card = "";
  const [pos1, pos2] = player.position.split(" 겸 ");
  if (fogWidth(player)) {
    // 아마추어: 스카우트 리포트 범위로만 보여줌 (saber.js)
    if (ovrs.bat !== null) card += fogStatListHtml(player, "타자 능력치", BATTER_STATS, pos2 || pos1, gains);
    if (ovrs.pit !== null) card += fogStatListHtml(player, "투수 능력치", PITCHER_STATS, pos1, gains);
    card += fogNote(player);
  } else {
    if (ovrs.bat !== null) card += statListHtml("타자 능력치", player.stats, BATTER_STATS, ovrs.bat, gains);
    if (ovrs.pit !== null) card += statListHtml("투수 능력치", player.stats, PITCHER_STATS, ovrs.pit, gains);
  }
  // 지난 메일은 메일 탭에서 봄. 성장유형·숨은 특성은 끝까지 비밀
  $("player-card").innerHTML = deckHtml(player) + upcomingMilesHtml(player) + scoutHtml(player) + card;

  showFocusChoices(player);
  showPositionPanel(player);
  showChoice(player);
  if (player.cur)
    $("tab-result").innerHTML = phaseProgressHtml(player); // 시즌 진행 중 (phases.js)
  else showSeasonResult(player.lastReport);
  showBoard(player, player.lastReport);
  showAnalysis(player); // 분석실 (analysis.js)
  showNews(player); // 뉴스 탭 (news.js)
  showRecord(player);
  showStandings(player); // 역대 순위 (standings-tab.js)
  showAlmanac(player); // 연감 (almanac.js)
  showNemesis(player); // 숙적 카드 (nemesis.js)
  showLocker(player); // 동료 탭 (locker.js)
  showMail(player); // 메일 탭 (mail.js)
  showMoney(player);
  showAchievements($("tab-ach"));
  showSideFeed(player); // PC 오른쪽 피드 (layout.js)

  retireButton.hidden = player.age < 33 || !!player.cur; // 시즌 중엔 은퇴 버튼 숨김
  createScreen.hidden = true;
  retiredScreen.hidden = true;
  playerScreen.hidden = false;
}

// 집중 능력치 체크박스 (지난 시즌 선택을 기억함)
function showFocusChoices(player) {
  const last = player.lastFocus || [];
  focusList.innerHTML = "";
  for (const [key, label] of Object.entries(getStatNames(player.type))) {
    const checked = last.includes(key) ? "checked" : "";
    focusList.innerHTML += `<label><input type="checkbox" value="${key}" ${checked}>${label}</label>`;
  }
  refreshSeasonButton();
}

// 시즌 진행 버튼: 집중 능력치 2개 + 남은 선택지가 없어야 눌림
// 4구간 시즌 중이면 집중 훈련은 캠프 때 고른 걸로 감 (phases.js)
function refreshSeasonButton() {
  const p = currentPlayer;
  const waiting = p && p.pendingChoice;
  const inSeason = !!(p && p.cur);
  seasonPanel.classList.toggle("in-season", inSeason);
  $("phase-panel").innerHTML = inSeason
    ? phaseStepsHtml(p.phase) +
      `<p class="small">집중 훈련: ${(p.cur.focusKeys || []).map((k) => getStatNames(p.type)[k]).join(", ")} · 캠프 때 고른 대로 시즌 끝까지 가요</p>`
    : "";
  seasonButton.disabled = waiting || (!inSeason && getCheckedFocus().length !== 2);
  seasonButton.textContent = waiting ? "선택지를 먼저 골라 주세요" : p ? phaseButtonText(p) : "시즌 진행";
}

function getCheckedFocus() {
  return Array.from(focusList.querySelectorAll("input:checked")).map((input) => input.value);
}

focusList.addEventListener("change", (event) => {
  if (getCheckedFocus().length > 2) event.target.checked = false;
  refreshSeasonButton();
});

function militaryBadge(player) {
  const m = player.military;
  if (m === "done") return "<span>🎖️ 군필</span>";
  if (m === "exempt") return "<span>🎖️ 병역 특례</span>";
  if (m && m.left) return `<span>🪖 복무 중 (남은 ${m.left}년)</span>`;
  if (player.age >= 23 && player.league !== "HS") return "<span>🪖 미필</span>";
  return "";
}

// 포지션 변경 (비시즌마다 1번)
function showPositionPanel(player) {
  const box = $("position-panel");
  if (isServing(player)) {
    box.innerHTML = "";
    return;
  }
  let html = `<details><summary>포지션 변경 <small>(지금: ${player.position} · 비시즌마다 1번)</small></summary><ul class="positions">`;
  for (const pos of positionOptions(player)) {
    const block = positionBlock(player, pos);
    const ovr = ovrAt(player, pos);
    html += `<li><span>${pos}</span><b class="${ovrClass(ovr)}">${fogOvrText(player, ovr, pos)}</b>
      <button data-pos="${pos}" ${block ? "disabled" : ""}>${block || "바꾸기"}</button></li>`;
  }
  html += `</ul><p class="small">새 수비 위치는 첫 시즌 적응 기간(컨디션 -2)이 있어요. 지명타자는 수비 능력치가 OVR에서 빠지지만 WAR 보정이 낮아요.</p></details>`;
  html += meetingHtml(player);
  if (canRetireNational(player)) {
    html += `<p class="national-retire">🇰🇷 국가대표 ${player.awards["국가대표"]}회 <button class="secondary" data-nretire="1">국가대표 은퇴 선언</button></p>`;
  } else if (player.nationalRetired) {
    html += `<p class="national-retire small">🇰🇷 국가대표 은퇴 (${player.awards["국가대표"] || 0}회 출전)</p>`;
  }
  box.innerHTML = html;
}

$("position-panel").addEventListener("click", (event) => {
  if (event.target.dataset.wish) {
    openMeetingTalk(currentPlayer, event.target.dataset.wish); // 1대1 대화 팝업 (talk.js)
    return;
  }
  if (event.target.dataset.nretire) {
    if (!confirm("국가대표에서 은퇴할까요? 앞으로 대표팀에 뽑히지 않아요.")) return;
    const line = retireNational(currentPlayer);
    addReaction(currentPlayer, currentPlayer.lastReport, [line], FAN.nationalRetire, {});
    savePlayer(currentPlayer);
    showPlayer(currentPlayer);
    showBigMoments([{ tone: "good", kicker: "국가대표 은퇴", title: "🇰🇷 태극마크 반납", lines: [line] }]);
    return;
  }
  const pos = event.target.dataset.pos;
  if (!pos) return;
  if (!confirm(`${currentPlayer.position} → ${pos}(으)로 바꿀까요?`)) return;
  const line = changePosition(currentPlayer, pos, false);
  addReaction(currentPlayer, currentPlayer.lastReport, [line], pos === "지명타자" ? FAN.dh : FAN.position, {});
  savePlayer(currentPlayer);
  showPlayer(currentPlayer);
  $("position-panel").querySelector("details").open = true;
});

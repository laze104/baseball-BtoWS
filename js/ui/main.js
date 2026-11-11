// =============================================
// main.js : 화면과 버튼 동작
// (규칙은 career.js, 시뮬레이션은 sim.js, 돈은 money.js,
//  국가대표는 national.js, 기사·댓글은 feed.js에 있음)
// =============================================

const SAVE_KEY = "baseball-save"; // localStorage에 저장할 때 쓰는 이름

const createScreen = $("create-screen");
const playerScreen = $("player-screen");
const retiredScreen = $("retired-screen");
const form = $("create-form");
const typeSelect = $("type");
const positionSelect = $("position");
const schoolSelect = $("school");
const styleSelect = $("style");
const focusList = $("focus-list");
const seasonPanel = $("season-panel");
const seasonButton = $("season-button");
const retireButton = $("retire-button");
const choicePanel = $("choice-panel");

let currentPlayer = null; // 지금 플레이 중인 선수

// ---------------------------------------------
// 1. 선택 상자(select) 채우기
// ---------------------------------------------

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
// 2. 선수 만들기
// ---------------------------------------------

function getStatKeys(type) {
  if (type === "batter") return Object.keys(BATTER_STATS);
  if (type === "pitcher") return Object.keys(PITCHER_STATS);
  return [...Object.keys(BATTER_STATS), ...Object.keys(PITCHER_STATS)];
}

function getStatNames(type) {
  if (type === "batter") return BATTER_STATS;
  if (type === "pitcher") return PITCHER_STATS;
  return { ...BATTER_STATS, ...PITCHER_STATS };
}

// 스타일 가중치대로 능력치 포인트를 나눠줌
function rollStats(type, styleName) {
  const keys = getStatKeys(type);
  const bonus = STYLES[type][styleName];

  // 타고난 재능: 선수마다 총합이 START_TOTAL ± 30 사이에서 달라짐
  let total = START_TOTAL + randomInt(-30, 30);
  if (type === "twoway") total = Math.round(total * 1.6); // 이도류: 14개 능력치라 총량을 조금 더 줌

  const weights = keys.map((key) => bonus[key] || 1);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  const stats = {};
  keys.forEach((key, i) => {
    const base = (total * weights[i]) / weightSum;
    const value = Math.round(base) + randomInt(-20, 20); // 능력치마다 ±20 흔들기
    stats[key] = Math.max(1, Math.min(99, value));
  });
  return stats;
}

// 포지션에 맞춰 OVR(종합 능력치)을 계산함
function calcOvr(stats, statNames, position) {
  const focus = POSITION_FOCUS[position] || [];
  let total = 0;
  let count = 0;
  for (const key of Object.keys(statNames)) {
    if (position === "지명타자" && (key === "defense" || key === "arm")) continue; // 지명타자는 수비 능력치 제외
    const weight = focus.includes(key) ? 2 : 1;
    total += stats[key] * weight;
    count += weight;
  }
  return Math.round(total / count);
}

function createPlayer(info) {
  const player = { ...info, age: 16, season: 1, stats: rollStats(info.type, info.style) };
  return initCareer(player);
}

// ---------------------------------------------
// 3. 탭
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
// 4. 화면 그리기
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
  showStandings(player); // 역대 순위 (extra.js)
  showAlmanac(player); // 연감 (almanac.js)
  showNemesis(player); // 숙적 카드 (nemesis.js)
  showLocker(player); // 동료 탭 (locker.js)
  showMail(player); // 메일 탭 (mail.js)
  showMoney(player);
  showAchievements($("tab-ach"));

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

// 선택지별 팬 반응 댓글 묶음
function reactionPool(key, option, player) {
  const side = sidePool(key, option, player); // 몸·딜레마·라커룸·논란 등 (flow.js)
  if (side) return side;
  if (key === "fa" || key === "agent") return FAN.contract;
  if (key === "press") return pressPool(player.lastPressTone); // 기자회견 답변 말투별 (press.js)
  if (key === "clutch") return player.lastClutch ? FAN.clutchGood : FAN.clutchBad;
  if (key === "draftSign") return option.id === "college" ? FAN.college : FAN.draft;
  if (key === "undrafted" && option.id === "COLLEGE") return FAN.college;
  if (key === "collegePick") return FAN.college;
  if (key === "managerTalk" || key === "closerOffer") return FAN.good;
  if (key === "posting") {
    if (option.id === "stay") return FAN.good;
    return player.pendingChoice && player.pendingChoice.key === "postingOffer" ? FAN.posting : FAN.postingFail;
  }
  if (key === "postingOffer" || key === "overseasOffer") return option.offer ? FAN.posting : FAN.good;
  if (key === "national") return option.id === "join" ? FAN.national : FAN.nationalSkip;
  if (key === "military") return option.id === "delay" ? FAN.good : FAN.military;
  if (key === "life") return option.mood === "bad" ? FAN.lifeBad : FAN.lifeGood;
  if (key === "position") return option.id === "accept" ? FAN.position : FAN.good;
  if (key === "mlbDirect") return option.id === "go" ? FAN.mlbDirect : FAN.good;
  return FAN.good;
}

// 진로 선택지 (드래프트 미지명, FA 제안, 국가대표 등)
function showChoice(player) {
  const choice = player.pendingChoice;
  choicePanel.hidden = !choice;
  seasonPanel.hidden = !!choice;
  if (!choice) return;
  if (choice.key === "clutch") {
    // 결정적 순간은 중계 화면처럼 (broadcast.js)
    if (prepClutch(player, choice)) savePlayer(player);
    choicePanel.innerHTML = clutchBoardHtml(player, choice);
  } else {
    choicePanel.innerHTML = mailboxHtml(player); // 메일함 형식 (mail.js)
  }
  for (const option of choice.options) {
    const button = document.createElement("button");
    button.className = "choice";
    button.innerHTML = option.detail ? `${option.label}<small>${option.detail}</small>` : option.label;
    button.addEventListener("click", () => {
      const key = choice.key;
      const awardsBefore = player.lastReport ? player.lastReport.awards.length : 0;
      logMail(player, choice, option); // 답장한 메일 보관 (mail.js)
      const cur = player.cur ? player.cur.report : null;
      const bigBefore = cur && cur.bigMoments ? cur.bigMoments.length : 0;
      const news = resolveChoice(player, option.id);
      const moments = choiceBigMoments(player, choice, option, news, awardsBefore);
      moments.push(...takeArbMoment(player)); // 연봉조정 판정 (contract.js)
      if (cur && cur.bigMoments && cur.bigMoments.length > bigBefore) moments.push(...cur.bigMoments.splice(bigBefore)); // 시즌 중 트레이드 같은 건 바로 보여줌
      moments.push(...memeAfterClutch(player, choice, news)); // 밈 생기기·뒤집기 (meme.js)
      if (!player.retired) news.push(...fandomMove(player, null)); // FA·트레이드로 팀 옮겼으면 팬심 (fandom.js)
      if (!player.retired) news.push(...checkAchievements(player).map((n) => `🏅 업적 달성: ${n}`));
      if (player.retired) {
        localStorage.removeItem(SAVE_KEY);
        showRetired(player);
        return;
      }
      addReaction(player, player.cur ? player.cur.report : player.lastReport, news, reactionPool(key, option, player), {
        team: player.team,
        nick: player.nickname || "",
      });
      savePlayer(player);
      showPlayer(player);
      showBigMoments(moments);
    });
    choicePanel.appendChild(button);
  }
}

// ---------- 시즌 결과 탭 ----------
function batRecordHtml(b) {
  return `<table><tr><th>경기</th><th>타율</th><th>홈런</th><th>타점</th><th>득점</th><th>도루</th></tr>
    <tr><td>${b.G}</td><td>${fmtRate(b.AVG)}</td><td>${b.HR}</td><td>${b.RBI}</td><td>${b.R}</td><td>${b.SB}</td></tr>
    <tr><th>출루율</th><th>장타율</th><th>OPS</th><th>볼넷</th><th>삼진</th><th>WAR</th></tr>
    <tr><td>${fmtRate(b.OBP)}</td><td>${fmtRate(b.SLG)}</td><td>${fmtRate(b.OPS)}</td><td>${b.BB}</td><td>${b.K}</td><td>${b.WAR}</td></tr>
    ${
      b.BABIP !== undefined
        ? `<tr><th>BABIP</th><th>안타</th><th>2루타</th><th>실책</th><th>수비율</th><th>${b.SBA ? "도루저지" : "타석"}</th></tr>
    <tr><td>${fmtRate(b.BABIP)}</td><td>${b.H}</td><td>${b.D}</td><td>${b.CH ? b.E : "-"}</td><td>${b.CH ? fmtRate(b.FPCT) : "-"}</td><td>${b.SBA ? `${fmtRate(b.CS / b.SBA)}` : b.PA}</td></tr>`
        : ""
    }${batSaberRow(b)}</table>`;
}

function pitRecordHtml(p) {
  return `<table><tr><th>경기</th><th>승</th><th>패</th><th>홀드</th><th>세이브</th><th>이닝</th></tr>
    <tr><td>${p.G}</td><td>${p.W}</td><td>${p.L}</td><td>${p.HLD}</td><td>${p.SV}</td><td>${fmtInnings(p.outs)}</td></tr>
    <tr><th>평균자책</th><th>탈삼진</th><th>볼넷</th><th>피홈런</th><th>WHIP</th><th>WAR</th></tr>
    <tr><td>${p.ERA.toFixed(2)}</td><td>${p.K}</td><td>${p.BB}</td><td>${p.HR}</td><td>${p.WHIP.toFixed(2)}</td><td>${p.WAR}</td></tr>
    ${
      p.BABIP !== undefined
        ? `<tr><th>피BABIP</th><th>피안타</th><th>실점</th><th>자책</th><th>실책</th><th>K/9</th></tr>
    <tr><td>${fmtRate(p.BABIP)}</td><td>${p.H}</td><td>${p.R}</td><td>${p.ER}</td><td>${p.CH ? p.E : "-"}</td><td>${p.outs ? ((p.K * 27) / p.outs).toFixed(1) : "-"}</td></tr>`
        : ""
    }${pitSaberRow(p)}</table>`;
}

function showSeasonResult(report) {
  const box = $("tab-result");
  if (!report) {
    box.innerHTML = "<p class='empty'>아직 치른 시즌이 없어요.</p>";
    return;
  }
  let html = `<h3>${report.year}년 (${koreanAge(report.age)}세) 시즌 <small>${LEAGUES[report.league].name} · ${report.team}</small></h3>`;

  if (report.standing) {
    const s = report.standing;
    const ps = s.seed
      ? ` <span class="ps">${s.psLabel} 진출${report.league === "KBO" ? "" : ` · ${s.seed}번 시드`}</span>`
      : s.psLabel
        ? ` <span class="ps out">${s.psLabel} 탈락</span>`
        : "";
    html += `<p class="standing">${s.group ? `${s.group} ` : ""}<b>${s.rank}위</b> / ${s.teams}팀 · ${s.w}승 ${s.l}패${ps}</p>`;
  }
  if (report.events.length) html += `<p class="chips">${report.events.map((e) => `<span>${e}</span>`).join("")}</p>`;
  if (report.hsLeague) html += hsLeagueHtml(report.hsLeague);
  if (report.hsTournaments) html += hsTournamentHtml(report.hsTournaments);
  if (report.collegeCups) html += hsTournamentHtml(report.collegeCups, "대학 전국대회 성적");
  if (report.standing && report.standing.table) html += standingTableHtml(report);
  if (report.standing && report.standing.monthly) html += monthlyChartHtml(report);
  if (report.half1)
    html += `<p class="small">전반기 ${report.half1.rank}위 (${report.half1.w}승 ${report.half1.l}패) → 최종 ${report.standing ? report.standing.rank + "위" : "-"}</p>`;
  if (report.bat) html += `<h4>타격 <small>${report.bat.role}</small></h4>` + batRecordHtml(report.bat);
  if (report.pit) html += `<h4>투구 <small>${report.pit.role}</small></h4>` + pitRecordHtml(report.pit);
  html += seasonGoalsHtml(report); // 캠프 때 세운 목표 (phases.js)
  if (report.monthlyMvp && report.monthlyMvp.length)
    html += `<p class="chips awards">${report.monthlyMvp.map((m) => `<span>🗓️ ${m}월 ${report.league === "MLB" ? "이달의 선수" : "월간 MVP"}</span>`).join("")}</p>`;
  html += raceChartHtml(report); // 홈런왕·탈삼진왕 레이스 (charts.js)
  html += trackingHtml(report); // 트래킹 데이터 (broadcast.js)
  html += nemesisResultHtml(report); // 숙적 맞대결 (nemesis.js)
  if (report.ranks) {
    html += `<h4>리그 순위</h4><p class="chips">${report.ranks
      .map((r) => `<span class="${r.rank <= 3 ? "top" : ""}">${r.label} ${r.rank > 30 ? "30위 밖" : r.rank + "위"}</span>`)
      .join("")}</p>`;
  }
  if (report.national) html += `<p>🇰🇷 ${report.national.name}: <b>${report.national.result}</b></p>`;
  if (report.awards.length) html += `<p class="chips awards">${report.awards.map((a) => awardChip(a)).join("")}</p>`;
  if (report.postseason) html += postseasonHtml(report);
  if (report.races) html += racesHtml(report);
  if (report.allStar)
    html += `<p class="small">⭐ 올스타 선정${report.allStar.fanPick ? " (팬 투표 1위!)" : ""}${report.allStar.mvp ? " · 미스터 올스타 (올스타전 MVP)" : ""}</p>`;
  if (report.salary) html += `<p class="small">올해 연봉 ${fmtMoney(report.salary)} 수령</p>`;
  if (report.newAchievements && report.newAchievements.length) {
    html += `<p class="chips awards">${report.newAchievements.map((a) => `<span>🏅 업적: ${a}</span>`).join("")}</p>`;
  }
  if (report.fameChange) html += `<p class="small">팬 여론 ${report.fameChange > 0 ? "+" : ""}${report.fameChange}</p>`;
  if (report.rival) {
    const r = report.rival;
    html += `<div class="rival-box"><h4>⚔️ 라이벌 ${r.name} <small>${LEAGUES[r.league].name} · ${r.team} · OVR ${r.ovr}</small></h4>
      <p>${r.line} · WAR ${r.WAR}${report.bat || report.pit ? ` <span class="${report.WAR >= r.WAR ? "win" : "lose"}">(나 ${report.WAR} → ${report.WAR >= r.WAR ? "승" : "패"})</span>` : ""}</p>
      ${r.awards.length ? `<p class="chips">${r.awards.map((a) => `<span>${a}</span>`).join("")}</p>` : ""}</div>`;
  }
  // 제목 누르면 뉴스 탭 기사로 (news.js)
  html += `<div class="news"><h4>뉴스 <small>(제목을 누르면 기사 본문)</small></h4>${report.news.map((n, i) => (isArticle(n) ? `<p class="news-link" onclick="openArticle(${i})">📰 ${n}</p>` : `<p>📰 ${n}</p>`)).join("")}</div>`;
  html += `<button class="secondary" onclick="setTab('board')">팬 반응 보러 가기 💬</button>`;
  html += `<button onclick="setTab('train')">다음 시즌 준비하기 ⚾</button>`;
  box.innerHTML = html;
}

// 고교 전국대회 성적표
function hsLeagueHtml(list) {
  return `<h4>주말리그 <small>(${list[0].region}권)</small></h4><ul class="hs-cups">${list
    .map(
      (x) =>
        `<li><span>${x.half}</span><b class="${x.rank === 1 ? "gold" : x.qualified ? "good" : ""}">${x.rank}위 / ${x.size}팀 · ${x.w}승 ${x.l}패${x.qualified ? " · 본선 진출" : ""}</b></li>`,
    )
    .join(
      "",
    )}</ul><p class="small">전반기 상위 절반은 황금사자기·청룡기, 후반기 상위 절반은 대통령배 본선에 나가요. 이마트배·봉황대기는 모든 학교가 참가해요.</p>`;
}

function hsTournamentHtml(list, title) {
  const cls = (r) => (r === "우승" ? "gold" : r === "준우승" || r === "4강" || r === "결승 진출" ? "good" : r === "8강" ? "mid" : "");
  return `<h4>${title || "전국대회 성적"}</h4><ul class="hs-cups">${list
    .map((t) => `<li><span>${t.name}</span><b class="${cls(t.result)}">${t.result === "결승 진출" ? "결승 (결정적 순간!)" : t.result}</b></li>`)
    .join("")}</ul>`;
}

// 월별 순위 그래프 (SVG): 우리 팀은 굵은 금색 선, 다른 팀은 흐린 회색 선
function monthlyChartHtml(report) {
  const s = report.standing;
  const m = s.monthly;
  const n = m.months.length;
  const N = s.teams;
  const W = 340,
    H = 200,
    L = 34,
    R = 64,
    T = 12,
    B = 26;
  const x = (i) => L + (i * (W - L - R)) / (n - 1);
  const y = (rank) => T + ((rank - 1) * (H - T - B)) / (N - 1);
  let svg = `<svg class="rank-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="월별 팀 순위">`;
  // 가로 눈금선 (순위마다)
  for (let r = 1; r <= N; r++) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(r)}" y2="${y(r)}" class="grid"/>`;
    if (r === 1 || r === N || r % 5 === 0) svg += `<text x="${L - 6}" y="${y(r) + 4}" text-anchor="end" class="axis">${r}위</text>`;
  }
  m.months.forEach((mon, i) => (svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="axis">${mon}월</text>`));
  // 다른 팀들
  for (const [team, ranks] of Object.entries(m.ranks)) {
    if (team === report.team) continue;
    const pts = ranks.map((r, i) => `${x(i)},${y(r)}`).join(" ");
    svg += `<polyline points="${pts}" class="other"><title>${team}: 최종 ${ranks[n - 1]}위</title></polyline>`;
  }
  // 우리 팀
  const mine = m.ranks[report.team];
  svg += `<polyline points="${mine.map((r, i) => `${x(i)},${y(r)}`).join(" ")}" class="mine"/>`;
  mine.forEach((r, i) => {
    const tip = `${m.months[i]}월: ${r}위 (누적 ${m.wins[report.team][i]}승)`;
    svg += `<circle cx="${x(i)}" cy="${y(r)}" r="4.5" class="dot"/><circle cx="${x(i)}" cy="${y(r)}" r="12" class="hit"><title>${tip}</title></circle>`;
  });
  svg += `<text x="${x(n - 1) + 10}" y="${y(mine[n - 1]) + 4}" class="end">최종 ${mine[n - 1]}위</text></svg>`;

  let html = `<h4>월별 순위</h4><p class="legend"><span class="sw mine"></span>${report.team} <span class="sw other"></span>다른 팀 <small>(점을 누르면 그달 성적)</small></p>${svg}`;
  html += `<p class="small">${m.months.map((mon, i) => `${mon}월 ${mine[i]}위`).join(" → ")}</p>`;

  // 내 월별 성적 막대
  const my = s.myMonthly;
  if (my) {
    const max = Math.max(...my.values);
    html += `<h4>${my.label}</h4><div class="month-bars">${my.values
      .map(
        (v, i) =>
          `<div><span class="val">${my.isBat ? fmtRate(v) : v.toFixed(2)}</span><span class="bar-v" style="height:${Math.round((v / max) * 60) + 4}px"></span><span class="mon">${m.months[i]}월</span></div>`,
      )
      .join("")}</div>`;
  }
  return html;
}

// ---------- 반응 탭 (커뮤니티 댓글창) ----------
function commentHtml(c, best) {
  const who = c.ip ? `${c.nick}<span class="ip">(${c.ip})</span>` : `<b class="fixed">${c.nick}</b>${c.lv ? `<span class="lv">Lv.${c.lv}</span>` : ""}`;
  return `<li class="${best ? "best" : ""}">
    <div class="c-head">${best ? `<span class="best-tag">${c.lv ? "포텐" : "BEST"}</span>` : ""}${who}<span class="c-time">${c.time}</span></div>
    <div class="c-body">${c.text}</div>
    <div class="c-foot"><span class="up">▲ ${c.likes}</span><span class="down">▼ ${c.dislikes}</span></div>
    ${!best && c.replies && c.replies.length ? `<ul class="replies">${c.replies.map((r) => `<li><div class="c-head">${r.ip ? `${r.nick}<span class="ip">(${r.ip})</span>` : `<b class="fixed">${r.nick}</b>`}${r.op ? '<span class="op">글쓴이</span>' : ""}<span class="c-time">${r.time}</span></div><div class="c-body">${r.text}</div></li>`).join("")}</ul>` : ""}
  </li>`;
}

function showBoard(player, report) {
  const box = $("tab-board");
  if (!report || !report.comments) {
    box.innerHTML = "<p class='empty'>아직 반응이 없어요.</p>";
    return;
  }
  const comments = report.comments;
  const best = [...comments]
    .filter((c) => c.likes >= 50)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 2);
  const views = 1000 + comments.length * randomInt(300, 900);
  // 갤러리형(dc) / 커뮤형(fm) 게시판 (news.js applySkin)
  const fm = report.skin === "fm";
  const post = report.post || { title: report.news[0], body: "이번 시즌 어떻게 봄?" };
  const link = report.news[0] ? `<p class="post-link" onclick="openArticle(0)">📰 [기사] ${report.news[0]}</p>` : "";
  let html = fandomHtml(player) + memeHtml(player) + `<div class="board ${fm ? "fm" : ""}">`; // 팬심·밈 (fandom.js, meme.js)
  html += `
    <div class="board-title">${fm ? "⚾ 야구 게시판 <small>인기글</small>" : "⚾ 야구 갤러리 <small>개념글</small>"}</div>
    <div class="post">
      <div class="post-title">${post.title}</div>
      <div class="post-meta">${post.author ? (post.author.lv ? `${post.author.nick} <span class="lv">Lv.${post.author.lv}</span>` : `ㅇㅇ(${post.author.ip})`) : "ㅇㅇ"} · 조회 ${views.toLocaleString()} · 추천 ${randomInt(10, 300)} · 댓글 ${comments.length}</div>
      <div class="post-body"><p>${post.body}</p>${link}</div>
    </div>
    <div class="comment-count">전체 댓글 <b>${comments.length}</b>개</div>
    <ul class="comments">${best.map((c) => commentHtml(c, true)).join("")}${comments.map((c) => commentHtml(c, false)).join("")}</ul>
  </div>`;
  box.innerHTML = html;
}

// ---------- 통산 기록 탭 (네이버 스탯창 스타일) ----------
// 예전 저장 데이터엔 BABIP·수비 기록이 없어서 "-"로 표시함
const dash = (v, f) => (v === undefined || v === null || Number.isNaN(v) ? "-" : f ? f(v) : v);
const csRate = (b) => (b.SBA ? `${fmtRate(b.CS / b.SBA)} (${b.CS}/${b.SBA})` : "-");

function batRow(label, team, b, cls, showCS) {
  const fpct = b.FPCT !== undefined && b.FPCT !== null ? b.FPCT : b.CH ? (b.CH - b.E) / b.CH : null;
  return `<tr class="${cls || ""}"><td class="sticky">${label}</td><td>${team}</td><td>${b.G}</td><td>${fmtRate(b.AVG)}</td><td>${b.PA}</td><td>${b.AB}</td>
    <td>${b.R}</td><td>${b.H}</td><td>${b.D}</td><td>${b.T}</td><td>${b.HR}</td><td>${b.RBI}</td><td>${b.SB}</td><td>${b.BB}</td><td>${b.K}</td>
    <td>${fmtRate(b.OBP)}</td><td>${fmtRate(b.SLG)}</td><td>${fmtRate(b.OPS)}</td><td>${dash(b.BABIP !== undefined ? b.BABIP : b.AB ? babip(b) : undefined, fmtRate)}</td><td>${b.WAR}</td>${batSaberCells(b)}
    <td>${b.CH ? b.E : "-"}</td><td>${dash(fpct, fmtRate)}</td>${showCS ? `<td>${csRate(b)}</td>` : ""}</tr>`;
}

function pitRow(label, team, p, cls) {
  const pb = p.BABIP !== undefined ? p.BABIP : p.outs ? pitBabip(p) : undefined;
  return `<tr class="${cls || ""}"><td class="sticky">${label}</td><td>${team}</td><td>${p.G}</td><td>${p.GS}</td><td>${p.W}</td><td>${p.L}</td>
    <td>${p.SV}</td><td>${p.HLD}</td><td>${fmtInnings(p.outs)}</td><td>${p.H}</td><td>${p.HR}</td><td>${p.BB}</td><td>${p.K}</td>
    <td>${p.R}</td><td>${p.ER}</td><td>${p.ERA.toFixed(2)}</td><td>${p.WHIP.toFixed(2)}</td><td>${dash(pb, fmtRate)}</td><td>${p.WAR}</td>${pitSaberCells(p)}
    <td>${p.CH ? p.E : "-"}</td><td>${p.CH ? fmtRate((p.CH - p.E) / p.CH) : "-"}</td></tr>`;
}

const BAT_HEAD = (showCS) => `<tr><th class="sticky">연도</th><th>팀</th><th>경기</th><th>타율</th><th>타석</th><th>타수</th>
  <th>득점</th><th>안타</th><th>2타</th><th>3타</th><th>홈런</th><th>타점</th><th>도루</th><th>볼넷</th><th>삼진</th><th>출루율</th><th>장타율</th><th>OPS</th><th>BABIP</th><th>WAR</th><th>wRC+</th><th>K%</th><th>BB%</th>
  <th>실책</th><th>수비율</th>${showCS ? "<th>도루저지율</th>" : ""}</tr>`;
const PIT_HEAD = `<tr><th class="sticky">연도</th><th>팀</th><th>경기</th><th>선발</th><th>승</th><th>패</th>
  <th>세이브</th><th>홀드</th><th>이닝</th><th>피안타</th><th>피홈런</th><th>볼넷</th><th>삼진</th><th>실점</th><th>자책</th><th>평균자책</th><th>WHIP</th><th>피BABIP</th><th>WAR</th><th>FIP</th><th>K%</th><th>BB%</th><th>실책</th><th>수비율</th></tr>`;

// 통산 합계를 표 한 줄 모양으로
function totalsAsBat(t) {
  return {
    G: t.G,
    AVG: t.AVG,
    PA: t.PA,
    AB: t.AB,
    R: t.R,
    H: t.H,
    D: t.D,
    T: t.T,
    HR: t.HR,
    RBI: t.RBI,
    SB: t.SB,
    BB: t.BB,
    K: t.K,
    OBP: t.OBP,
    SLG: t.SLG,
    OPS: t.OPS,
    WAR: t.WAR,
    BABIP: t.BABIP,
    CH: t.CH,
    E: t.E,
    FPCT: t.FPCT,
    SBA: t.SBA,
    CS: t.CS,
    wRC: t.wRC,
  };
}
function totalsAsPit(t) {
  return {
    G: t.pG,
    GS: t.GS,
    W: t.W,
    L: t.L,
    SV: t.SV,
    HLD: t.HLD,
    outs: t.outs,
    H: t.pH,
    HR: t.pHR,
    BB: t.pBB,
    K: t.pK,
    R: t.pR,
    ER: t.ER,
    ERA: t.ERA,
    WHIP: t.WHIP,
    WAR: t.WAR,
    BABIP: t.pBABIP,
    CH: t.pCH,
    E: t.pE,
    FIP: t.FIP,
  };
}

function showRecord(player) {
  $("tab-record").innerHTML = careerChartsHtml(player) + recordHtml(player); // 커리어 그래프 (charts.js)
}

// ---------------------------------------------
// 4구간 시즌 (phases.js)
// ---------------------------------------------
function phaseStep(player) {
  if (!player.cur) {
    openCamp(player);
    return;
  }
  if (player.phase === "half2") {
    const report = finishPhased(player);
    player.lastReport = report;
    const shown = report.toastShown || 0;
    savePlayer(player);
    showPlayer(player);
    setTab("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
    showBigMoments(seasonBigMoments(report));
    showToasts((report.toasts || []).slice(shown));
    return;
  }
  if (player.phase === "camp") playFirstHalf(player);
  else playSecondHalf(player);
  afterPhase(player);
}

// 구간 끝날 때마다: 새로 생긴 토스트·큰 알림만 보여줌
function afterPhase(player) {
  const r = player.cur.report;
  const toasts = (r.toasts || []).slice(r.toastShown || 0);
  r.toastShown = (r.toasts || []).length;
  const moments = (r.bigMoments || []).splice(0); // 시즌 끝 화면에서 또 안 나오게 꺼냄
  savePlayer(player);
  showPlayer(player);
  setTab("result");
  window.scrollTo({ top: 0, behavior: "smooth" });
  showBigMoments(moments);
  showToasts(toasts);
}

// 스프링캠프 창: 프로그램 하나 + 시즌 목표 3개
function openCamp(player) {
  if (getCheckedFocus().length !== 2) return;
  const d = campDraft(player);
  savePlayer(player);
  const modal = $("camp-modal");
  const progs = campPrograms(player)
    .map(
      (c, i) =>
        `<label class="camp-prog"><input type="radio" name="camp-prog" value="${c.id}" ${i === 0 ? "checked" : ""}><b>${c.icon} ${c.label}</b><small>${c.detail}</small></label>`,
    )
    .join("");
  const goals = d.goals
    .map(
      (g, i) =>
        `<label class="camp-goal ${g.kind}"><input type="checkbox" value="${i}"><b>${g.label}</b><small>${g.kind === "chal" ? "도전 · 달성하면 인기 +4" : "현실 · 달성하면 인기 +2"}</small></label>`,
    )
    .join("");
  modal.querySelector(".camp-body").innerHTML = `<h3>🌴 ${gameYear(player)}년 스프링캠프 <small>${player.team}</small></h3>
    ${d.expect ? `<p class="expect">🏢 구단 목표: <b>${d.expect.label}</b> <small>${d.expect.desc}</small></p>` : ""}
    <p class="small">📊 데이터팀 예상: ${projectionLine(d.pj)}</p>
    <h4>캠프 프로그램 <small>하나만</small></h4><div class="camp-progs">${progs}</div>
    <h4>올 시즌 목표 <small>3개 고르기 · <span id="camp-count">0</span>/3</small></h4><div class="camp-goals">${goals}</div>
    <p class="small">캠프 끝나고 연습경기를 치러요. 연습경기 성적은 감독이 봐요 (개막 컨디션·면담에 반영).</p>`;
  $("camp-go").disabled = true;
  modal.hidden = false;
}

$("camp-modal").addEventListener("change", (event) => {
  const boxes = [...$("camp-modal").querySelectorAll(".camp-goals input:checked")];
  if (boxes.length > 3) event.target.checked = false;
  const n = $("camp-modal").querySelectorAll(".camp-goals input:checked").length;
  $("camp-count").textContent = n;
  $("camp-go").disabled = n !== 3;
});

$("camp-cancel").addEventListener("click", () => {
  $("camp-modal").hidden = true;
});

$("camp-go").addEventListener("click", () => {
  const modal = $("camp-modal");
  const prog = modal.querySelector("input[name=camp-prog]:checked");
  const goals = [...modal.querySelectorAll(".camp-goals input:checked")].map((x) => Number(x.value));
  if (!prog || goals.length !== 3) return;
  modal.hidden = true;
  startCamp(currentPlayer, getCheckedFocus(), prog.value, goals);
  afterPhase(currentPlayer);
});

// 분석실 '훈련 탭에서 체크하기'
$("tab-analysis").addEventListener("click", (event) => {
  const key = event.target.dataset.focus;
  if (!key || !currentPlayer) return;
  if (currentPlayer.cur) {
    alert("시즌 중이라 집중 훈련은 다음 스프링캠프 때 바꿀 수 있어요.");
    return;
  }
  const boxes = [...focusList.querySelectorAll("input")];
  const target = boxes.find((b) => b.value === key);
  if (!target) return;
  if (!target.checked) {
    const on = boxes.filter((b) => b.checked);
    if (on.length >= 2) on[on.length - 1].checked = false;
    target.checked = true;
  }
  refreshSeasonButton();
  setTab("train");
});

// 시즌별·통산 기록표 (기록 탭과 은퇴 화면에서 같이 씀)
// 상 이름표: 금메달은 금색, 은메달은 은색, 동메달은 동색
function awardChip(name, text) {
  const t = text || name;
  if (name.includes("은메달")) return `<span class="silver">🥈 ${t}</span>`;
  if (name.includes("동메달")) return `<span class="bronze">🥉 ${t}</span>`;
  if (name.includes("금메달")) return `<span>🥇 ${t}</span>`;
  return `<span>🏆 ${t}</span>`;
}

function recordHtml(player, noRival) {
  if (!player.history.length) return "<p class='empty'>아직 기록이 없어요.</p>";
  const short = (t) => t.split(" ")[0];
  const teamName = (h) =>
    isAmateur(h.league) ? h.team : `${h.tradedFrom ? `${short(h.tradedFrom)}→` : ""}${short(h.team)}${h.league === "KBO2" ? "(2군)" : ""}`;
  const leaguesPlayed = [...new Set(player.history.map((h) => h.league))].filter((l) => TOP_LEAGUES.includes(l));
  let html = "";

  const ps = psTotals(player); // 포스트시즌 통산 (extra.js)
  if (player.history.some((h) => h.bat)) {
    const showCS = player.history.some((h) => h.bat && h.bat.SBA) || (player.position || "").includes("포수");
    html += `<h4>타격 기록</h4><div class="scroll"><table class="stat-table">${BAT_HEAD(showCS)}`;
    for (const h of player.history) if (h.bat) html += batRow(h.year || h.age, teamName(h), h.bat, isAmateur(h.league) ? "amateur" : "", showCS);
    for (const lg of leaguesPlayed) html += batRow(`${LEAGUES[lg].name} 통산`, "", totalsAsBat(careerTotals(player, [lg])), "total", showCS);
    html += batRow("통산(고교 제외)", "", totalsAsBat(careerTotals(player)), "total", showCS);
    if (ps && ps.PA) html += batRow("🍂 포스트시즌 통산", "", totalsAsBat(ps), "total ps-row", showCS);
    html += "</table></div>";
  }
  if (player.history.some((h) => h.pit)) {
    html += `<h4>투구 기록</h4><div class="scroll"><table class="stat-table">${PIT_HEAD}`;
    for (const h of player.history) if (h.pit) html += pitRow(h.year || h.age, teamName(h), h.pit, isAmateur(h.league) ? "amateur" : "");
    for (const lg of leaguesPlayed) html += pitRow(`${LEAGUES[lg].name} 통산`, "", totalsAsPit(careerTotals(player, [lg])), "total");
    html += pitRow("통산(고교 제외)", "", totalsAsPit(careerTotals(player)), "total");
    if (ps && ps.outs) html += pitRow("🍂 포스트시즌 통산", "", totalsAsPit(ps), "total ps-row");
    html += "</table></div>";
  }
  html += nationalRecordHtml(player); // 국가대표 기록 (extra.js)
  html += `<p class="small">회색 줄은 고교·아마추어 기록이라 통산에서 빠져요. 표는 옆으로 밀어서 볼 수 있어요. ${SABER_NOTE}</p>`;

  const awardList = Object.entries(player.awards);
  html += `<h4>수상 경력</h4>${awardList.length ? `<p class="chips awards">${awardList.map(([k, v]) => awardChip(k, `${k} ${v}회`)).join("")}</p>` : "<p class='small'>아직 없어요.</p>"}`;
  if (player.nicknames && player.nicknames.length) {
    html += `<h4>얻은 별명</h4><p class="chips">${player.nicknames.map((n) => `<span>${n}</span>`).join("")}</p>`;
  }
  if (!noRival) html += rivalCompareHtml(player); // 은퇴 화면에서는 라이벌 비교를 뺌
  return html;
}

// 나 vs 라이벌 통산 비교표
function rivalCompareHtml(player) {
  const r = player.rival;
  if (!r) return "";
  const rs = rivalSummary(r);
  const me = careerTotals(player);
  const rows = [
    ["소속", player.team, r.retired ? "은퇴" : r.team],
    ["최고 OVR", fogWidth(player) ? "?" : player.bestOvr, fogWidth(player) ? "?" : r.bestOvr],
    ["통산 WAR", me.WAR, rs.WAR],
    ["MVP", countAward(player, "MVP"), rs.MVP],
    ["우승", countAward(player, "시리즈 우승"), rs.champs],
  ];
  let html = `<h4>⚔️ 라이벌 비교 <small>${r.school} 출신 ${r.position} ${r.name}</small></h4><table class="rival-table"><tr><th></th><th>나</th><th>${r.name}</th></tr>`;
  for (const [label, a, b] of rows) html += `<tr><td>${label}</td><td>${a}</td><td>${b}</td></tr>`;
  return html + "</table>";
}

// ---------- 재산 탭 ----------
function showMoney(player) {
  const box = $("tab-money");
  const c = player.contract;
  let html = `<div class="money-top"><span>보유 자산</span><b>${fmtMoney(player.money)}</b></div>`;
  if (c) {
    html += `<p>계약: ${c.team} (${LEAGUES[c.league] ? LEAGUES[c.league].name : ""}) · 연봉 <b>${fmtMoney(c.salary)}</b>`;
    if (c.isFA) html += ` · ${c.total ? `총액 ${fmtMoney(c.total)} · ` : ""}남은 기간 ${c.years}년`;
    html += "</p>";
  } else {
    html += "<p>아직 아마추어라 수입이 없어요.</p>";
  }
  html += serviceHtml(player);
  html += agentHtml(player); // 에이전트 (agent.js)
  html += `<p class="small">연봉의 65%가 저축돼요 (세금·생활비 제외). 가격은 ${gameYear(player)}년 물가 기준이에요.</p>`;

  html += shopHtml(player);
  box.innerHTML = html;
}

$("tab-money").addEventListener("click", (event) => {
  if (event.target.dataset.fireAgent) {
    if (!confirm(`${currentPlayer.agent.name}와 에이전트 계약을 끝낼까요? 지금 계약 수수료는 계약이 끝날 때까지 계속 나가요.`)) return;
    const line = `${currentPlayer.name}, ${currentPlayer.agent.name}와 결별`;
    currentPlayer.agent = null;
    addReaction(currentPlayer, currentPlayer.lastReport, [line], FAN.contract, {});
    savePlayer(currentPlayer);
    showPlayer(currentPlayer);
    setTab("money");
    return;
  }
  const hire = event.target.dataset.hire;
  if (hire) {
    const years = Number(event.target.dataset.years);
    const item = SHOP_ITEMS.find((i) => i.id === hire);
    const fee = serviceFee(currentPlayer, item, years);
    if (!confirm(`${item.name}와 ${years}년 계약할까요? 해마다 ${fmtMoney(fee)}씩 나가요 (올해 분은 지금 결제).`)) return;
    if (hireService(currentPlayer, hire, years)) {
      const line = `${currentPlayer.name}, ${item.name}와 ${years}년 계약… 몸 관리에 진심`;
      addReaction(currentPlayer, currentPlayer.lastReport, [line], FAN.shopping, { item: item.name });
      savePlayer(currentPlayer);
      showPlayer(currentPlayer);
      setTab("money");
    }
    return;
  }
  const id = event.target.dataset.buy;
  if (!id) return;
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!confirm(`${item.name}을(를) ${fmtMoney(itemPrice(currentPlayer, item))}에 살까요?`)) return;
  if (buyItem(currentPlayer, id)) {
    const line = fillText(NEWS.special.shopping, currentPlayer, { item: item.name });
    addReaction(currentPlayer, currentPlayer.lastReport, [line], FAN.shopping, { item: item.name });
    savePlayer(currentPlayer);
    showPlayer(currentPlayer);
    setTab("money");
  }
});

// FA·포스팅·서비스타임 현황 (실제 규정)
function serviceHtml(player) {
  if (isAmateur(player.league)) return "";
  const s = player.kboService || 0;
  let html = `<div class="service"><h4>FA·해외 진출 현황</h4><p>KBO 1군 등록 <b>${s}시즌</b> (${player.collegeGrad ? "대졸" : "고졸"} FA 기준 ${kboFaNeeded(player)}시즌)`;
  const left = seasonsToFa(player);
  html += left > 0 ? ` · FA까지 <b>${left}시즌</b>` : " · <b>FA 자격 있음</b>";
  html += `</p><p>포스팅: ${s >= FA_RULES.posting ? "자격 있음 (구단 동의 필요)" : `1군 ${FA_RULES.posting}시즌부터 (${FA_RULES.posting - s}시즌 남음)`}`;
  if (player.faCount) html += ` · FA 계약 ${player.faCount}회`;
  html += "</p>";
  if (player.mlbService)
    html += `<p>MLB 서비스타임 <b>${player.mlbService}년</b> · ${player.mlbService >= 6 ? "FA 가능" : player.mlbService >= 3 ? "연봉조정 대상" : "연봉조정 전"}</p>`;
  if (player.kboRights) html += `<p class="small">KBO 복귀 시 보류권: ${player.kboRights}</p>`;
  html += `<p class="small">1군 등록일수 145일(시즌의 약 78%)을 채운 해만 1시즌으로 쳐요. 2군·상무·해외 기간은 빠져요. FA 계약 뒤 다시 FA가 되려면 1군 4시즌이 필요해요.</p></div>`;
  return html;
}

// ---------- 업적 도감 ----------
function showAchievements(box) {
  const got = loadAchievements();
  const done = ACHIEVEMENTS.filter((a) => got[a.id]).length;
  let html = `<p class="ach-count">달성 <b>${done}</b> / ${ACHIEVEMENTS.length} <small>(모든 선수 합산, 이 브라우저에 저장)</small></p>`;
  const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
  for (const g of groups) {
    html += `<h4>${g}</h4><ul class="ach">`;
    for (const a of ACHIEVEMENTS.filter((x) => x.group === g)) {
      const info = got[a.id];
      html += `<li class="${info ? "on" : ""}"><b>${info ? "🏅" : "🔒"} ${a.name}</b><small>${a.desc}</small>${info ? `<small class="by">${info.year}년 · ${info.by}</small>` : ""}</li>`;
    }
    html += "</ul>";
  }
  box.innerHTML = html;
}

// 명예의 전당 표
function hofHallHtml() {
  const hall = loadHof();
  if (!hall.length) return "<p class='small'>아직 헌액된 선수가 없어요. 첫 번째 주인공이 돼 보세요.</p>";
  let html = "<table><tr><th>헌액</th><th>이름</th><th>득표</th><th>WAR</th><th>MVP</th></tr>";
  for (const h of [...hall].sort((a, b) => b.pct - a.pct)) {
    html += `<tr><td>${h.year}</td><td>${h.name}${h.nickname ? ` <small>'${h.nickname}'</small>` : ""}</td><td>${h.pct}%</td><td>${h.WAR}</td><td>${h.MVP}</td></tr>`;
  }
  return html + "</table>";
}

// ---------- 은퇴 화면 ----------
function showRetired(player) {
  const t = careerTotals(player);
  const awardList =
    Object.entries(player.awards)
      .map(([k, v]) => `${k} ${v}회`)
      .join(", ") || "없음";
  let html = `<h2>${player.name} 은퇴</h2>
    <p>${player.school} 출신 · ${gameYear(player)}년 ${koreanAge(player.age)}세 은퇴 · 최고 OVR ${player.bestOvr}</p>
    <p>통산 WAR <b>${t.WAR}</b> · 모은 재산 <b>${fmtMoney(player.money)}</b> · FA로 번 돈 <b>${player.faDeals ? `${fmtMoney(player.faEarned)} (${player.faDeals}번 계약)` : "없음"}</b>${player.agentFees ? ` · 에이전트 수수료 ${fmtMoney(player.agentFees)}` : ""}</p>
    ${player.nickname ? `<p>별명: '${player.nickname}' · 팬 여론 ${fameLabel(player.fame || 0)}</p>` : ""}
    ${player.retireNews ? `<p>📰 ${player.retireNews}</p>` : ""}
    ${player.myManagers && player.myManagers.length ? `<p>함께한 감독: ${player.myManagers.join(", ")}</p>` : ""}`;
  if (t.AB) html += `<p>타격: 타율 ${fmtRate(t.AVG)} · ${t.HR}홈런 · ${t.RBI}타점 · OPS ${fmtRate(t.OPS)}</p>`;
  if (t.outs) html += `<p>투구: ${t.W}승 ${t.L}패 ${t.SV}세이브 ${t.HLD}홀드 · 평균자책 ${t.ERA.toFixed(2)} · ${t.pK}탈삼진</p>`;
  html += `<p>수상: ${awardList}</p>`;
  html += `<details class="retire-record" open><summary>📊 시즌별·통산 기록</summary>${recordHtml(player)}</details>`;
  $("retire-summary").innerHTML = html;

  const ranking = loadRanking();
  let table = "<table><tr><th>#</th><th>이름</th><th>통산 WAR</th><th>MVP</th><th>우승</th><th>재산</th></tr>";
  ranking.slice(0, 10).forEach((r, i) => {
    const me = r.name === player.name && r.WAR === careerTotals(player).WAR;
    table += `<tr class="rank-row${me ? " mine" : ""}" data-rank="${i}"><td>${i + 1}</td><td>${r.name}${r.banned ? " ⛔" : ""}${r.history ? " 🔍" : ""}</td><td><b>${r.WAR}</b></td><td>${r.MVP}</td><td>${r.champs}</td><td>${r.money !== undefined ? fmtMoney(r.money) : "-"}</td></tr>`;
  });
  $("ranking").innerHTML = table + `</table><p class="small">선수 이름을 누르면 통산 기록을 볼 수 있어요.</p><div id="ranking-detail"></div>`;

  // 명예의 전당 투표 결과
  const hof = player.hof;
  if (hof && hof.banned) {
    $("hof-result").innerHTML = `<h3>명예의 전당 투표</h3><p>⛔ 승부조작으로 영구 제명돼서 후보 자격이 없어요.</p>`;
  } else if (hof && hof.eligible === false) {
    $("hof-result").innerHTML = `<h3>명예의 전당 투표</h3><p>프로 ${hof.proYears}시즌이라 후보 자격(프로 10시즌)이 없어요.</p>`;
  } else if (hof) {
    const bars = hof.ballots
      .map(
        (b) =>
          `<div class="ballot"><span>${b.year}</span><span class="vbar"><i style="width:${b.pct}%" class="${b.pct >= 75 ? "in" : ""}"></i><em></em></span><b>${b.pct}%</b></div>`,
      )
      .join("");
    const verdict = hof.inducted
      ? `🏛️ <b>${hof.ballot === 1 ? "첫 투표에서" : `${hof.ballot}번째 투표에서`} 명예의 전당 헌액!</b>`
      : hof.dropped
        ? "득표율 5% 미만으로 후보에서 빠졌어요."
        : "10번의 투표에서 끝내 75%를 넘지 못했어요.";
    $("hof-result").innerHTML = `<h3>명예의 전당 투표 <small>(은퇴 5년 뒤부터, 75% 이상 헌액)</small></h3><p>${verdict}</p><div class="ballots">${bars}</div>`;
  }
  $("hof-hall").innerHTML = hofHallHtml();
  showAchievements($("ach-retired"));

  createScreen.hidden = true;
  playerScreen.hidden = true;
  retiredScreen.hidden = false;
}

// ---------------------------------------------
// 5. 저장 / 불러오기
// ---------------------------------------------

function savePlayer(player) {
  if (!saveJSON(SAVE_KEY, player)) console.warn("저장 실패: 브라우저 저장 공간 확인 필요");
}

function loadPlayer() {
  const player = loadJSON(SAVE_KEY, null);
  if (!player) return null;
  if (!player.season) player.season = 1;
  initCareer(player);
  // 예전 버전 저장 데이터: 댓글 형식이 달라서 새로 만듦
  if (player.lastReport && !player.lastReport.comments) player.lastReport = null;
  return player;
}

// ---------------------------------------------
// 6. 버튼 연결
// ---------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const player = createPlayer({
    name: $("name").value.trim(),
    type: typeSelect.value,
    position: positionSelect.value,
    hand: $("hand").value,
    school: schoolSelect.value,
    style: styleSelect.value,
  });
  // 등번호, 서포트 카드
  const num = parseInt($("number").value, 10);
  player.number = Number.isNaN(num) ? randomInt(1, 99) : clamp(num, 0, 99);
  player.wantNumber = player.number;
  player.numberLog = [{ team: player.team, num: player.number }];
  setDeck(player, pickedDeck());
  savePlayer(player);
  showPlayer(player);
  setTab("train");
});

seasonButton.addEventListener("click", () => {
  if (currentPlayer.pendingChoice) {
    // 혹시 모를 경우 한 번 더 막음
    choicePanel.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (usesPhases(currentPlayer)) {
    phaseStep(currentPlayer); // 스프링캠프 → 전반기 → 후반기 → 가을야구
    return;
  }
  const report = runSeason(currentPlayer, getCheckedFocus());
  currentPlayer.lastReport = report;
  savePlayer(currentPlayer);
  showPlayer(currentPlayer);
  setTab("result");
  window.scrollTo({ top: 0, behavior: "smooth" });
  showBigMoments(seasonBigMoments(report)); // 수상하면 큰 화면으로
  showToasts(report.toasts); // 작은 기록은 토스트 (effects.js)
});

retireButton.addEventListener("click", () => {
  if (!confirm("정말 은퇴할까요? 기록이 랭킹에 올라가요.")) return;
  retirePlayer(currentPlayer);
  localStorage.removeItem(SAVE_KEY);
  showRetired(currentPlayer);
});

$("reset-button").addEventListener("click", () => {
  if (!confirm("정말 처음부터 다시 할까요? 지금 선수는 사라져요.")) return;
  localStorage.removeItem(SAVE_KEY);
  playerScreen.hidden = true;
  renderDeckPicker();
  createScreen.hidden = false;
});

$("new-player-button").addEventListener("click", () => {
  retiredScreen.hidden = true;
  renderDeckPicker(); // 방금 은퇴한 선수가 레전드 카드로 나올 수 있음
  createScreen.hidden = false;
});

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

// 시작할 때 저장된 선수가 있으면 바로 보여줌
const saved = loadPlayer();
if (saved) showPlayer(saved);

// ---------------------------------------------
// 7. 순위표, 쇼핑, 큰 화면 알림
// ---------------------------------------------

// 지구(리그)별 최종 순위표
function standingTableHtml(report) {
  const s = report.standing;
  const top = s.table[0];
  let html = `<h4>${s.group || LEAGUES[report.league].name} 최종 순위</h4><table class="standings"><tr><th>순위</th><th>팀</th><th>승</th><th>패</th><th>승률</th><th>게임차</th></tr>`;
  s.table.forEach((t, i) => {
    const gb = (top.w - t.w + (t.l - top.l)) / 2;
    const cls = [t.team === report.team ? "mine" : "", t.seed ? "in" : ""].join(" ");
    html += `<tr class="${cls}"><td>${i + 1}</td><td>${t.team}${t.seed ? ` <small class="seed">PS${report.league === "KBO" ? "" : " " + t.seed}</small>` : ""}</td><td>${t.w}</td><td>${t.l}</td><td>${(t.w / (t.w + t.l)).toFixed(3).slice(1)}</td><td>${gb ? gb.toFixed(1) : "-"}</td></tr>`;
  });
  html += "</table>";
  if (report.league === "MLB") html += `<p class="small">MLB: 리그마다 지구 우승 3팀 + 와일드카드 3팀이 포스트시즌에 나가요.</p>`;
  if (report.league === "NPB") html += `<p class="small">NPB: 리그마다 1~3위가 클라이맥스 시리즈에 나가요.</p>`;
  if (report.league === "ABL") html += `<p class="small">호주리그: 11월~1월 겨울 리그, 팀당 40경기. 1~4위가 플레이오프에 나가 클랙스턴 실드를 다퉈요.</p>`;
  return html;
}

// 쇼핑: 분류별, 전담 스태프는 1·3·5년 계약
function shopHtml(player) {
  let html = "<h4>쇼핑</h4>";
  const cats = [...new Set(SHOP_ITEMS.map((i) => i.cat))];
  for (const cat of cats) {
    html += `<h5 class="shop-cat">${cat}</h5><ul class="shop">`;
    for (const item of SHOP_ITEMS.filter((i) => i.cat === cat)) {
      if (item.service) {
        const s = player.services[item.id];
        let right;
        if (s) {
          right = `<span class="owned-tag">계약 중 · 남은 ${s.left}년 · 연 ${fmtMoney(s.fee)}</span>`;
        } else {
          right = SERVICE_YEARS.map((y) => {
            const fee = serviceFee(player, item, y.years);
            return `<button data-hire="${item.id}" data-years="${y.years}" ${player.money >= fee ? "" : "disabled"}>${y.years}년<small>연 ${fmtMoney(fee)}</small></button>`;
          }).join("");
        }
        html += `<li class="${s ? "owned" : ""}"><div><b>${item.name}</b><small>${item.desc} · 해마다 비용이 나가요</small></div><div class="years">${right}</div></li>`;
      } else {
        const price = itemPrice(player, item);
        const owned = hasItem(player, item.id);
        const canBuy = !owned && player.money >= price;
        const fame = item.fame ? ` · 팬 여론 ${item.fame > 0 ? "+" : ""}${item.fame}` : "";
        html += `<li class="${owned ? "owned" : ""}"><div><b>${item.name}</b><small>${item.desc}${fame}</small></div>
          <button data-buy="${item.id}" ${canBuy ? "" : "disabled"}>${owned ? "보유 중" : fmtMoney(price)}</button></li>`;
      }
    }
    html += "</ul>";
  }
  html += `<p class="small">전담 스태프는 계약할 때 첫해 비용을 내고, 시즌이 끝날 때마다 다음 해 비용이 빠져나가요. 3년 계약은 5%, 5년 계약은 10% 할인.</p>`;
  return html;
}

// 선택지를 고른 뒤 큰 화면으로 보여줄 것
function choiceBigMoments(player, choice, option, news, awardsBefore) {
  const list = [];
  if (choice.key === "clutch") {
    const ok = player.lastClutch;
    const r = player.lastReport;
    const newAwards = r ? r.awards.slice(awardsBefore) : [];
    // 텍스트 중계: 상대가 숙적이면 그 선수로 (broadcast.js, nemesis.js)
    const title = ok ? "⚡ 성공!" : "💥 실패…";
    let pbp = null;
    let box = null;
    try {
      const nem = choice.opp ? (choice.opp.nemId ? (player.nemeses || []).find((n) => n.id === choice.opp.nemId) : null) : clutchNemesis(player, choice.side);
      pbp = legendCommentary(player, choice, buildPbp(player, choice, option.id, ok, nem), ok); // 명예의 전당 해설 (living.js)
      box = buildBoxScore(player, choice, option.id, ok); // 박스스코어 (boxscore.js)
      news.push(...clutchNemesisResult(player, nem, ok, choice));
      saveHighlight(player, choice, ok, title, pbp, box);
    } catch (e) {
      console.error("중계 만들기 실패 (broadcast.js / nemesis.js 확인)", e); // 중계가 깨져도 결과 팝업은 뜨게
    }
    list.push({
      tone: ok ? "gold" : "bad",
      kicker: `결정적 순간 · ${choice.stage}`,
      title,
      pbp,
      box,
      lines: news.slice(),
      awards: newAwards,
    });
  } else if (choice.key === "press" && player.lastPress) {
    const acc = player.lastPress;
    player.lastPress = null;
    list.push({
      tone: acc.fame >= 0 ? "good" : "bad",
      kicker: choice.kind === "sign" ? `입단 기자회견 · ${player.team}` : "시즌 결산 기자회견",
      title: "🎤 기자회견 끝",
      lines: pressSummary(acc),
    });
  } else if (choice.key === "agent" && option.id !== "self") {
    list.push({
      tone: "gold",
      kicker: "에이전트 계약",
      title: `🕴️ ${player.agent.name}`,
      lines: [player.agent.boss, `수수료 ${Math.round(player.agent.rate * 100)}% · 지금부터 FA 협상을 맡아요`],
    });
  } else if (choice.key === "mlbDirect" && option.id === "go") {
    list.push({ tone: "gold", kicker: "미국 직행", title: `🇺🇸 ${choice.org} 입단!`, lines: news });
  } else if (choice.key === "fa" && option.offer && option.offer.mega) {
    const o = option.offer;
    list.push({
      tone: "gold",
      kicker: "초대형 계약",
      title: `💰 ${o.team} ${o.years}년 ${fmtMoney(o.total)}!`,
      lines: [`연봉 ${fmtMoney(o.salary)} × ${o.years}년`, ...news],
    });
  } else if (choice.key === "fa" && option.offer && option.offer.veteran) {
    const o = option.offer;
    list.push({
      tone: "gold",
      kicker: `${koreanAge(player.age)}세의 해외 도전`,
      title: `${o.league === "MLB" ? "🇺🇸" : "🇯🇵"} ${o.team} 입단!`,
      lines: [`${LEAGUES[o.league].name} ${o.years === 2 ? "1+1년" : "1년"} 계약`, ...news],
    });
  } else if (choice.key === "collegePick") {
    list.push({ tone: "good", kicker: "대학 진학", title: `🎓 ${option.id} 입학!`, lines: news });
  } else if (choice.key === "national" && option.id === "nretire") {
    list.push({ tone: "good", kicker: "국가대표 은퇴", title: "🇰🇷 태극마크 반납", lines: news });
  }
  return list;
}

// 큰 화면 알림: 여러 개면 확인을 누를 때마다 다음 것
let bigQueue = [];
function showBigMoments(list) {
  if (!list || !list.length) return;
  bigQueue.push(...list);
  if ($("big-modal").hidden) nextBigMoment();
}

// 텍스트 중계(pbp)가 있으면 한 줄씩 나오고 결과는 마지막에 공개됨
const PBP_STEP = 0.9; // 줄 사이 간격 (초)
let pbpTimer = null;
function nextBigMoment() {
  const modal = $("big-modal");
  // 중계 도중 누르면 닫지 않고 끝까지 바로 보여줌
  if (modal.classList.contains("playing")) {
    clearTimeout(pbpTimer);
    modal.className = `${modal.dataset.tone} pbp-mode skip`;
    return;
  }
  const m = bigQueue.shift();
  if (!m) {
    modal.hidden = true;
    return;
  }
  const pbp = m.pbp && m.pbp.length ? m.pbp : null;
  // 중계 중엔 테두리 색으로 결과가 새지 않게 중립색
  modal.dataset.tone = m.tone || "gold";
  modal.className = (pbp ? "pbp-mode playing" : m.tone || "gold") + (m.cls ? ` ${m.cls}` : ""); // 세레머니 크기 (ceremony.js)
  const late = pbp ? `animation-delay:${(pbp.length * PBP_STEP).toFixed(1)}s` : "";
  modal.querySelector(".big-kicker").textContent = m.kicker || "";
  const title = modal.querySelector(".big-title");
  title.textContent = m.title;
  title.className = "big-title" + (pbp ? " late" : "");
  title.style.cssText = late;
  let body = "";
  if (pbp) body += `<div class="pbp">${pbp.map((l, i) => `<p style="animation-delay:${(i * PBP_STEP).toFixed(1)}s">${l}</p>`).join("")}</div>`;
  let after = "";
  if (m.html) body += m.html; // 카운트업·꽃가루 (ceremony.js)
  if (m.box) after += boxScoreHtml(m.box);
  if (m.awards && m.awards.length) after += `<p class="big-awards">${m.awards.map((a) => awardChip(a)).join("")}</p>`;
  if (m.lines && m.lines.length) after += m.lines.map((l) => `<p>${l}</p>`).join("");
  body += pbp ? `<div class="late" style="${late}">${after}</div>` : after;
  modal.querySelector(".big-body").innerHTML = body;
  $("big-close").textContent = pbp ? "결과 바로 보기" : "확인";
  if (pbp) {
    pbpTimer = setTimeout(
      () => {
        modal.className = `${modal.dataset.tone} pbp-mode`;
        $("big-close").textContent = "확인";
      },
      pbp.length * PBP_STEP * 1000 + 400,
    );
  }
  modal.hidden = false;
  runCountUps(modal); // 숫자 올라가는 연출 (effects.js)
}

$("big-close").addEventListener("click", () => {
  const wasPlaying = $("big-modal").classList.contains("playing");
  nextBigMoment();
  if (wasPlaying) $("big-close").textContent = "확인";
});
$("big-modal").addEventListener("click", (event) => {
  if (event.target.id === "big-modal") nextBigMoment(); // 바깥을 눌러도 닫힘
});

// 스카우트 평가: 드래프트 점수 = OVR + 학교(강호 +9 / 강팀 +6 / 중위권 +3) + 시즌 WAR x1.5(최대 8) + 전국대회(최대 4)
function scoutHtml(player) {
  const o = draftOutlook(player);
  if (!o) return "";
  const gap = o.score - o.line;
  let verdict = o.round ? `<b class="good">지명권 · 예상 ${o.round}라운드</b>` : `<b class="bad">지명 기준까지 ${-gap}점</b>`;
  let scoreText = `<b>${o.score}</b>`;
  const fog = fogDraft(player, o); // 아마추어는 범위로만 (saber.js)
  if (fog) {
    scoreText = `<b>${fog.lo}~${fog.hi}</b>`;
    verdict = fog.lo >= o.line ? `<b class="good">지명권 유력</b>` : fog.hi < o.line ? `<b class="bad">지명 기준 미달</b>` : `<b>지명 경계선</b>`;
  }
  return `<div class="scout"><h4>🔍 스카우트 평가 <small>(지난 시즌 기준)</small></h4>
    <p>드래프트 점수 ${scoreText} / 지명 기준 ${o.line} · ${verdict}${o.mlb ? ' · <b class="gold">MLB 스카우트 관심</b>' : ""}</p>
    <p class="small">점수 = OVR + ${player.league === "HS" ? "학교 수준 + 전국대회 성적 + " : "대학 검증 +3 + 대학 대회 성적 + "}시즌 WAR. OVR ${o.sure} 이상이면 점수와 상관없이 지명돼요. 확률이 아니라 이 기준으로 정해져요.</p></div>`;
}

// 포스트시즌 경기 결과
const PS_NAMES = {
  KBO: { 4: "와일드카드", 3: "준플레이오프", 2: "플레이오프", 1: "한국시리즈" },
  NPB: { 3: "CS 퍼스트", 2: "CS 파이널", 1: "재팬시리즈" },
  MLB: { 4: "와일드카드 시리즈", 3: "디비전 시리즈", 2: "챔피언십 시리즈", 1: "월드시리즈" },
  ABL: { 2: "준결승 시리즈", 1: "챔피언십 시리즈" },
};
function postseasonHtml(report) {
  const names = PS_NAMES[report.league] || {};
  return `<h4>포스트시즌</h4><p class="chips">${report.postseason
    .map(
      (g) =>
        `<span class="${g.won && !g.pending ? "top" : ""}">${names[g.round] || g.round + "라운드"} ${g.pending ? "⚡ 결정적 순간!" : g.won ? "승리" : "탈락"}</span>`,
    )
    .join("")}</p>${psStatHtml(report)}`;
}

// 수상 레이스: 내 점수 vs 수상 기준
function racesHtml(report) {
  const fmt = (r, v) => (r.unit === "ops" ? fmtRate(v) : v);
  let html = `<h4>수상 레이스 <small>(기준을 넘으면 수상)</small></h4><table class="races"><tr><th>상</th><th>내 점수</th><th>기준</th><th>결과</th></tr>`;
  for (const r of report.races) {
    html += `<tr><td>${r.award}</td><td>${fmt(r, r.mine)}</td><td>${fmt(r, r.need)}</td><td class="${r.won ? "won" : "lost"}">${r.won ? "수상" : "-"}</td></tr>`;
  }
  html += "</table>";
  if (report.impact !== undefined)
    html += `<p class="small">MVP 점수 = WAR + 타이틀 + 굵직한 기록(40-40, 3관왕) + 팀 성적 + 인기. 올스타 = WAR + 인기 + 팬 투표(구단 팬덤 + 팀 성적${report.fanVote !== undefined ? `, 올해 ${report.fanVote >= 0 ? "+" : ""}${report.fanVote}` : ""}). 골든글러브는 포지션별 WAR, 실버슬러거는 OPS, 수비상은 수비 능력치로 봐요.</p>`;
  return html;
}

// 감독 면담 패널 (비시즌마다 1번)
function meetingHtml(player) {
  if (isAmateur(player.league) || isServing(player)) return "";
  const now = [];
  if (player.role === "closer") now.push("마무리 맡기로 함");
  if (player.lineup === "leadoff") now.push("1번 타자");
  if (player.lineup === "cleanup") now.push("4번 타자");
  if (player.lineup === "pinch") now.push("대타 요원");
  if (player.starterPromise && !player.lineup) now.push("주전 약속");
  if (player.captainTeam === player.team) now.push("주장");
  if (player.restPlan === player.team) now.push("체력 관리");
  if (player.trustTeam === player.team && player.managerTrust) now.push(`감독 신뢰 ${player.managerTrust}/3`);
  if (player.campWish) now.push(`캠프 경쟁 예정: ${MEETING_WISHES.find((w) => w.id === player.campWish.id).short}`);
  const m = managerOf(player);
  const st = MANAGER_STYLES[m.style];
  let html = `<details class="meeting"><summary>🗣️ 감독 면담 <small>(비시즌마다 1번${now.length ? ` · 지금: ${now.join(", ")}` : ""})</small></summary>
    <p class="manager"><b>${managerTitle(player)}</b> · ${st.name}${m.since ? ` · ${Math.max(1, gameYear(player) - m.since + 1)}년째` : ""}<small>${m.note ? `${m.note} · ` : ""}${st.desc}</small></p>
    ${player.league === "KBO" ? managerBoardHtml(player, gameYear(player)) : ""}`;
  if (!canMeetManager(player)) {
    html += `<p class="small">이번 비시즌 면담은 끝났어요. 다음 시즌이 끝나면 다시 찾아갈 수 있어요.</p></details>`;
    return html;
  }
  const wishes = meetingWishes(player);
  if (!wishes.length) return html + `<p class="small">지금은 따로 요청할 게 없어요.</p></details>`;
  html += `<ul class="positions">${wishes.map((w) => `<li><span>${w.label}<small>${w.hint}</small></span><button data-wish="${w.id}">말해 보기</button></li>`).join("")}</ul>`;
  html += `<p class="small">감독은 실력, 최근 성적, 팀 내 입지를 보고 판단해요. 수락이 아니면 스프링캠프 경쟁으로 넘어가거나 거절될 수 있어요.</p></details>`;
  return html;
}

// 역대 랭킹에서 선수를 누르면 그 선수의 시즌별·통산 기록
$("ranking").addEventListener("click", (event) => {
  const row = event.target.closest(".rank-row");
  if (!row) return;
  const r = loadRanking()[Number(row.dataset.rank)];
  const box = $("ranking-detail");
  if (!r) return;
  if (box.dataset.open === row.dataset.rank) {
    box.innerHTML = "";
    box.dataset.open = "";
    return;
  } // 한 번 더 누르면 닫기
  box.dataset.open = row.dataset.rank;
  if (!r.history) {
    box.innerHTML = `<p class="small">${r.name}: 예전 버전에서 은퇴한 선수라 시즌별 기록이 없어요.</p>`;
    return;
  }
  const past = { history: r.history, awards: r.awards || {}, nicknames: r.nicknames || [] };
  box.innerHTML = `<div class="rank-detail"><h4>${r.name}${r.nickname ? ` '${r.nickname}'` : ""} <small>${r.school || ""} · 통산 WAR ${r.WAR}${r.hof ? " · 🏛️ 명예의 전당" : ""}</small></h4>${recordHtml(past, true)}</div>`;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
});

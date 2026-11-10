// =============================================
// boxscore.js : 수싸움 + 결정적 순간 박스스코어
// 1. 상대 성향 메모 (전력분석) → 맞는 선택이면 +12%p, 상극이면 -8%p
//    기본은 능력치, 수싸움은 보너스. 선택지 옆 가능성 표시는 능력치 기준 그대로
// 2. 결과 나오면 상황 글 보고 이닝별 점수판 만들어서 보여줌 (명장면에도 저장)
// =============================================

// 타자 쪽 새 선택지: 상대 주무기 노려치기
CLUTCH_OPTIONS.bat.push({ id: "breakball", label: "주무기 변화구를 노린다", stat: "contact", base: -0.02 });

// 상대 성향. good = 잘 먹히는 선택, bad = 상극
const CLUTCH_TENDS = {
  bat: [
    { id: "fbFirst", memo: (o) => `${o.name}: 초구 직구 비율 71%. 카운트 잡으러 한가운데 근처로 들어오는 공이 많음`, good: "first", bad: "wait" },
    { id: "wild", memo: (o) => `${o.name}: 오늘 볼넷 3개, 투구수 많음. 제구 흔들리는 중`, good: "wait", bad: "first" },
    { id: "putaway", memo: (o) => `${o.name}: 2스트라이크 이후 ${o.pitch || "변화구"} 비율 80%. 결정구는 거의 그거`, good: "breakball", bad: "big" },
    { id: "tired", memo: (o) => `${o.name}: 투구수 35개 넘김, 직구 구속 3km/h 떨어짐. 공이 높게 뜨는 중`, good: "big", bad: "breakball" },
  ],
  pit: [
    { id: "hacker", memo: (o) => `${o.name}: 초구부터 휘두르는 스타일. 존 밖 유인구에 배트가 자주 나옴`, good: "edge", bad: "big" },
    { id: "fbHitter", memo: (o) => `${o.name}: 직구 타율 .352, 변화구 타율 .198`, good: "break", bad: "heat" },
    { id: "slowBat", memo: (o) => `${o.name}: 최근 10경기 타율 .171. 배트 스피드 떨어져서 빠른 공에 늦음`, good: "heat", bad: "edge" },
    { id: "patient", memo: (o) => `${o.name}: 리그 볼넷 1위. 공 오래 보고 볼은 절대 안 건드림`, good: "big", bad: "edge" },
  ],
};

// 선택지에 실제로 있는 것만 성향 후보로
function pickTend(side, opts) {
  const ids = opts.map((o) => o.id);
  const list = CLUTCH_TENDS[side].filter((t) => ids.includes(t.good) && ids.includes(t.bad));
  return list.length ? pick(list).id : null;
}

function tendOf(choice) {
  return choice && choice.tend ? CLUTCH_TENDS[choice.side].find((t) => t.id === choice.tend) : null;
}

// 수싸움 보너스 (resolveClutch 에서 성공 확률에 더함)
function tendBonus(choice, optionId) {
  const t = tendOf(choice);
  if (!t) return 0;
  return optionId === t.good ? 0.12 : optionId === t.bad ? -0.08 : 0;
}

function tendMemoHtml(choice) {
  const t = tendOf(choice);
  if (!t) return "";
  return `<p class="cb-memo">📋 전력분석 메모<br>${t.memo(choice.opp || { name: "상대" })}</p>`;
}

// 중계 마지막 줄 앞에 수싸움 결과 한 줄
function tendPbpLine(choice, optionId, ok) {
  const t = tendOf(choice);
  if (!t) return null;
  if (optionId === t.good) return ok ? "🧠 전력분석 메모 그대로! 노림수가 통했어요." : "🧠 노림수는 맞았는데… 이번엔 상대가 한 수 위였어요.";
  if (optionId === t.bad) return ok ? "😮 상대 성향을 거슬렀는데도 힘으로 이겨냈어요!" : "📋 메모와 반대로 간 게 독이 됐어요.";
  return null;
}

// ---------------------------------------------
// 2. 박스스코어
// ---------------------------------------------
// 상황 글 → 그 순간 우리 팀 기준 점수 차 (+ 리드 / - 뒤짐)
function situationLead(text, bat) {
  const t = text || "";
  if (t.includes("사이클링")) return randomInt(2, 5);
  if (t.includes("노히트노런")) return randomInt(1, 4);
  if (t.includes("동점 주자") || t.includes("지고 있") || t.includes("필승조")) return -1;
  if (t.includes("두 점 차 리드")) return 2;
  if (t.includes("한 점 차 리드") || t.includes("1점 차") || t.includes("호투") || t.includes("무너지고")) return 1;
  if (t.includes("동점") || t.includes("0-0") || t.includes("연장") || t.includes("끝내기")) return 0;
  return bat ? -1 : 1;
}

// 앞 이닝에 점수 흩뿌리기
function spreadRuns(total, innings) {
  const arr = Array(innings).fill(0);
  for (let i = 0; i < total; i++) arr[randomInt(0, innings - 1)]++;
  return arr;
}

function buildBoxScore(player, choice, optionId, ok) {
  const sit = choice.situation || "";
  const bat = choice.side === "bat";
  const cycle = sit.includes("사이클링");
  const nohit = sit.includes("노히트노런");
  const s = parseSituation(sit);
  const inns = [...sit.matchAll(/(\d+)회/g)]; // "7회까지 호투, 8회 위기" → 마지막 숫자
  const inn = inns.length ? Number(inns[inns.length - 1][1]) : 9;
  // 초/말 안 써 있으면: 타자는 말(홈 공격), 투수는 초(홈 수비)
  // 사이클은 원정 9회초 마지막 타석으로
  const half = cycle ? "초" : (sit.match(/\d+회(초|말)/) || [])[1] || (bat ? "말" : "초");
  const meHome = bat ? half === "말" : half === "초";
  const lr = player.lastReport;
  const lg = (lr && lr.league) || player.league;
  const myTeam = lg === "HS" ? player.school : (lr && lr.team) || player.team;
  const oppTeam = (choice.opp && choice.opp.team) || otherTeam(player, lg);
  const win = cycle || nohit ? true : ok; // 사이클·노히트는 경기는 이기는 흐름

  // 그 순간까지 점수
  const lead = situationLead(sit, bat);
  const low = nohit ? 0 : sit.includes("1실점") ? 1 : randomInt(0, 3);
  const me0 = lead >= 0 ? low + lead : low;
  const op0 = nohit ? 0 : lead >= 0 ? low : low - lead;
  const away = { team: meHome ? oppTeam : myTeam, me: !meHome, runs: [] };
  const home = { team: meHome ? myTeam : oppTeam, me: meHome, runs: [] };
  const mine = meHome ? home : away;
  const theirs = meHome ? away : home;
  // 지금 이닝 전까지 (초 공격팀은 지금 이닝 전, 말이면 원정팀은 지금 이닝 초까지 끝남)
  const awayDone = half === "말" ? inn : inn - 1;
  const homeDone = inn - 1;
  // 연장이면 점수는 9회까지만 (9회 끝나고 동점이어야 연장)
  const spread = (total, done) =>
    spreadRuns(total, Math.max(1, Math.min(done, 9)))
      .concat(Array(Math.max(0, done - 9)).fill(0))
      .slice(0, done);
  away.runs = spread(meHome ? op0 : me0, awayDone);
  home.runs = spread(meHome ? me0 : op0, homeDone);

  // 결정적 순간에 난 점수
  const batting = half === "초" ? away : home;
  const runners = s.bases.filter(Boolean).length;
  const sum = (t) => t.runs.reduce((a, b) => a + (b === "X" ? 0 : b), 0);
  let evRuns = 0;
  if (bat) {
    if (ok) {
      if (cycle) evRuns = runners;
      else if (optionId === "big") evRuns = runners + 1;
      else evRuns = Math.max(1, Math.min(runners || 1, 1 - lead + (half === "초" ? randomInt(0, 1) : 0)));
      if (!cycle && half === "말" && inn >= 9 && optionId !== "big") evRuns = Math.max(1, 1 - lead); // 끝내기는 이기는 점수까지만
      if (half === "말" && inn < 9 && evRuns < 1 - lead) evRuns = 1 - lead;
      if (half === "초" && evRuns < 1 - lead) evRuns = 1 - lead;
    }
  } else if (!ok && !nohit) {
    evRuns = optionId === "big" ? Math.max(runners + 1, lead + 1) : lead + 1;
  }
  batting.runs.push(evRuns);
  let hits = { me: 0, opp: 0 };
  if (nohit && !ok) hits.opp = 1;

  // 남은 이닝: 이기는 팀만 가끔 추가점, 9회 이후 동점이면 연장
  const winner = win ? mine : theirs;
  const loser = win ? theirs : mine;
  let curInn = inn;
  let curHalf = half;
  const leads = (t) => sum(t) > sum(t === home ? away : home);
  for (let guard = 0; guard < 12; guard++) {
    // 말 끝났거나 홈팀이 앞선 채 9회 이상 말 차례면 끝
    if (curHalf === "말") {
      if (curInn >= 9 && sum(home) !== sum(away)) break;
      curInn++;
      curHalf = "초";
      const r = away === winner ? (sum(away) <= sum(home) ? sum(home) - sum(away) + 1 : Math.random() < 0.2 ? 1 : 0) : 0;
      away.runs.push(r);
      continue;
    }
    // 초가 끝남 → 말
    curHalf = "말";
    if (curInn >= 9 && leads(home)) {
      home.runs.push("X");
      break;
    }
    let r = 0;
    if (home === winner) {
      if (curInn >= 9)
        r = sum(away) - sum(home) + 1 > 0 ? sum(away) - sum(home) + 1 : 0; // 끝내기
      else r = Math.random() < 0.2 ? 1 : 0;
      if (curInn < 9 && sum(home) + r <= sum(away) && curInn === 8) r = sum(away) - sum(home) + 1;
    }
    home.runs.push(r);
    if (curInn >= 9 && leads(home)) break;
  }
  // 혹시 결과가 뉴스랑 어긋나면 마지막 공격에 점수 보정
  if (sum(winner) <= sum(loser)) {
    const idx = winner.runs.length - 1;
    winner.runs[idx] = (winner.runs[idx] === "X" ? 0 : winner.runs[idx]) + sum(loser) - sum(winner) + 1;
  }
  for (const t of [away, home]) {
    t.R = sum(t);
    t.H = t.R + randomInt(2, 6) + (t === mine && cycle ? 3 : 0);
    t.E = Math.random() < 0.3 ? 1 : 0;
  }
  if (nohit) theirs.H = hits.opp;
  if (nohit) theirs.E = 0;

  // 내 기록 한 줄
  let line;
  if (bat) {
    const ab = randomInt(4, 5);
    const h = cycle ? (ok ? 4 : 3) : ok ? randomInt(1, 2) : randomInt(0, 1);
    const rbi = ok ? evRuns : 0;
    line = `${player.name} ${ab}타수 ${h}안타${rbi ? ` ${rbi}타점` : ""}${ok && optionId === "big" ? " 1홈런" : ""}${cycle && ok ? " (사이클링 히트)" : ""}${!ok ? ` · 결정적 찬스 ${optionId === "big" ? "삼진" : "범타"}` : ""}`;
  } else {
    const starter = nohit || sit.includes("호투");
    const outs = nohit ? 27 - (ok ? 0 : 1) : starter ? 22 + randomInt(0, 2) : randomInt(1, 4);
    const er = (starter ? op0 : 0) + (ok ? 0 : evRuns);
    const k = Math.min(outs, starter ? randomInt(6, 12) : randomInt(0, 3));
    const ip = `${Math.floor(outs / 3) || ""}${["", "⅓", "⅔"][outs % 3]}`;
    line = `${player.name} ${ip}이닝 ${nohit && ok ? "무피안타" : ""}${er ? ` ${er}실점` : " 무실점"} ${k}삼진${ok && !starter ? " · 위기 탈출" : ""}${!ok && !nohit ? " · 결승점 허용" : ""}`;
  }
  const last = Math.max(away.runs.length, home.runs.length, 9);
  return { away, home, last, line, win, stage: choice.stage };
}

function boxScoreHtml(box) {
  if (!box) return "";
  const cols = Array.from({ length: box.last }, (_, i) => i + 1);
  const row = (t) =>
    `<tr class="${t.me ? "me" : ""}"><th>${shortTeam(t.team)}</th>${cols.map((i) => `<td>${t.runs[i - 1] === undefined ? "" : t.runs[i - 1]}</td>`).join("")}<td class="r">${t.R}</td><td>${t.H}</td><td>${t.E}</td></tr>`;
  return `<div class="boxscore"><table><tr><th></th>${cols.map((i) => `<th>${i}</th>`).join("")}<th class="r">R</th><th>H</th><th>E</th></tr>${row(box.away)}${row(box.home)}</table><p class="box-line">${box.line}</p></div>`;
}

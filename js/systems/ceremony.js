// =============================================
// ceremony.js : 마일스톤 세레머니 + 기념구 앨범
// 시즌 전후 통산을 비교해서 이번 시즌에 넘은 기록을 찾음
// 기록 목록은 almanac.js MILESTONES 그대로 씀
// 작은 기록 = 토스트, 큰 기록 = 큰 팝업, 역대급 = 꽃가루 + 구단 기념식
// =============================================

// 이 숫자 이상이면 큰 팝업 / 역대급
const CEREMONY_BIG = { H: 1000, HR: 200, RBI: 1000, SB: 200, W: 100, pK: 1500, SV: 200, HLD: 100 };
const CEREMONY_LEGEND = { H: 2500, HR: 400, RBI: 1500, SB: 400, W: 150, pK: 2500, SV: 300, HLD: 150 };

// 통산 키 → 시즌 기록에서 찾는 곳
const CEREMONY_SRC = {
  H: ["bat", "H"],
  HR: ["bat", "HR"],
  RBI: ["bat", "RBI"],
  SB: ["bat", "SB"],
  W: ["pit", "W"],
  pK: ["pit", "K"],
  SV: ["pit", "SV"],
  HLD: ["pit", "HLD"],
};

const CEREMONY_TITLE = {
  H: (s) => `통산 ${s}안타`,
  HR: (s) => `통산 ${s}호 홈런`,
  RBI: (s) => `통산 ${s}타점`,
  SB: (s) => `통산 ${s}도루`,
  W: (s) => `통산 ${s}승`,
  pK: (s) => `통산 ${s}탈삼진`,
  SV: (s) => `통산 ${s}세이브`,
  HLD: (s) => `통산 ${s}홀드`,
};

// 프로 첫 기록 (big: true면 팝업, 아니면 토스트)
const FIRST_BALLS = [
  { key: "H", label: "프로 첫 안타", big: false },
  { key: "HR", label: "프로 첫 홈런", big: true },
  { key: "pK", label: "프로 첫 탈삼진", big: false },
  { key: "W", label: "프로 첫 승", big: true },
  { key: "SV", label: "프로 첫 세이브", big: true },
];

// 그 순간 한 줄 묘사 ({opp} = 상대 선수)
const CEREMONY_SCENE = {
  H: ["{opp}의 직구를 받아쳐 깨끗한 중전 안타", "{opp}의 초구를 밀어쳐 우중간 안타", "3유간을 꿰뚫는 땅볼 안타"],
  HR: ["{opp}의 슬라이더를 받아쳐 좌측 담장 밖으로", "{opp}의 한가운데 직구를 그대로 걷어올려 중월 홈런", "풀카운트 승부 끝에 {opp}에게 우월 홈런"],
  RBI: ["주자를 불러들이는 적시타", "희생플라이로 3루 주자를 홈에", "2사 만루에서 싹쓸이 2루타"],
  SB: ["{opp}의 견제를 뚫고 2루 도루 성공", "초구에 바로 스타트, 여유 있게 세이프", "3루까지 훔치는 과감한 주루"],
  W: ["7이닝 무실점 호투로 승리투수", "6이닝 2실점 퀄리티스타트로 승리", "타선 도움 받으며 5이닝 버티고 승리"],
  pK: ["{opp}를 바깥쪽 슬라이더로 헛스윙 삼진", "{opp}를 몸쪽 꽉 찬 직구로 루킹 삼진", "{opp}를 떨어지는 포크로 헛스윙 삼진"],
  SV: ["9회 1점 차, 마지막 타자 {opp}를 땅볼로 잡고 세이브", "9회 2사 만루 위기에서 {opp}를 삼진 처리하고 세이브", "삼자범퇴로 경기 끝"],
  HLD: ["8회 1사 만루 위기를 병살로 지워냄", "7회 등판해 {opp}를 삼진으로 돌려세우고 홀드", "1이닝 깔끔하게 막고 홀드"],
};

const DEFAULT_MONTHS = { KBO: [3, 4, 5, 6, 7, 8, 9], NPB: [3, 4, 5, 6, 7, 8, 9], MLB: [3, 4, 5, 6, 7, 8, 9], KBO2: [3, 4, 5, 6, 7, 8, 9], ABL: [11, 12, 1] };

function ceremonyTier(key, step) {
  if (step >= CEREMONY_LEGEND[key]) return 3;
  if (step >= CEREMONY_BIG[key]) return 2;
  return 1;
}

// 시즌 몇 번째 기록이었는지로 날짜 추정 (정확한 날짜 데이터는 없음)
function ceremonyDate(report, frac) {
  const months = (report.standing && report.standing.monthly && report.standing.monthly.months) || DEFAULT_MONTHS[report.league] || [4, 5, 6, 7, 8, 9];
  const i = clamp(Math.floor(frac * months.length), 0, months.length - 1);
  const m = months[i];
  const day = m === 3 ? randomInt(22, 31) : randomInt(1, 28);
  return `${m}월 ${day}일`;
}

// 상대 선수: 숙적이 있으면 숙적 중에서 (서사가 이어짐)
function ceremonyOpponent(player, report, key) {
  const wantType = CEREMONY_SRC[key][0] === "bat" ? "pitcher" : "batter";
  const nems = (player.nemeses || []).filter((n) => n.league === report.league && n.type === wantType && n.status === "active" && n.team !== report.team);
  if (nems.length && Math.random() < 0.6) {
    const n = pick(nems);
    return { name: n.name, team: n.team, nemesis: true };
  }
  return { name: fakeName(report.league), team: otherTeam(player, report.league), nemesis: false };
}

function ceremonyInning(key) {
  if (key === "W") return "";
  if (key === "SV") return "9회";
  if (key === "HLD") return pick(["7회", "8회"]);
  return `${randomInt(1, 9)}회`; // 주자 상황은 장면 문장에 맡김 (안 겹치게)
}

function initBalls(player) {
  if (!player.balls) player.balls = [];
  if (!player.nearMiss) player.nearMiss = {};
}

function addBall(player, ball) {
  initBalls(player);
  if (player.balls.some((b) => b.id === ball.id)) return false;
  player.balls.push(ball);
  return true;
}

// 시즌 끝: 이번 시즌에 넘은 기록 찾기 (runSeason → afterSeason)
function ceremonySeason(player, report) {
  initBalls(player);
  if (isAmateur(report.league) || (!report.bat && !report.pit)) return;
  const after = careerTotals(player);
  const before = careerTotals({ history: player.history.slice(0, -1) });
  report.bigMoments = report.bigMoments || [];
  report.toasts = report.toasts || [];
  const sides = [];
  if (report.bat) sides.push("bat");
  if (report.pit) sides.push("pit");

  // 프로 첫 기록
  for (const f of FIRST_BALLS) {
    const side = CEREMONY_SRC[f.key][0];
    if (!sides.includes(side)) continue;
    if ((before[f.key] || 0) === 0 && (after[f.key] || 0) > 0) {
      const opp = ceremonyOpponent(player, report, f.key);
      const date = ceremonyDate(report, Math.random() * 0.4);
      const scene = fillScene(f.key, opp);
      addBall(player, { id: `first-${f.key}`, label: f.label, year: report.year, team: report.team, date, opp: opp.name });
      if (f.big) {
        report.bigMoments.push({
          tone: "good",
          cls: "ceremony tier1",
          kicker: `${report.year}년 ${date} · ${opp.team}전`,
          title: `⚾ ${f.label}!`,
          html: ballHtml(f.label),
          lines: [scene, "기념구는 기념구 앨범에 보관됐어요"],
        });
      } else {
        report.toasts.push({ icon: "⚾", text: `${f.label}! ${date} ${opp.team}전` });
      }
    }
  }

  // 마일스톤
  for (const side of sides) {
    for (const m of MILESTONES[side]) {
      const b = before[m.key] || 0;
      const a = after[m.key] || 0;
      const seasonVal = a - b;
      for (const step of m.steps) {
        if (!(b < step && a >= step)) continue;
        const tier = ceremonyTier(m.key, step);
        const frac = seasonVal ? (step - b) / seasonVal : 0.5;
        const date = ceremonyDate(report, frac);
        const opp = ceremonyOpponent(player, report, m.key);
        const title = CEREMONY_TITLE[m.key](step);
        const inning = ceremonyInning(m.key);
        const scene = `${date} ${opp.team}전${inning ? `, ${inning}` : ""}. ${fillScene(m.key, opp)}`;
        const near = player.nearMiss[`${m.key}-${step}`];
        addBall(player, { id: `${m.key}-${step}`, label: title, year: report.year, team: report.team, date, opp: opp.name, tier });
        report.news.push(`${player.name}, ${title} 달성${tier === 3 ? "… 리그 역사에 이름 새김" : ""}`);
        if (tier === 1) {
          report.toasts.push({ icon: "🎯", text: `${title}! ${date} ${opp.team}전` });
          continue;
        }
        const lines = [scene];
        if (opp.nemesis) lines.push(`상대는 숙적 ${opp.name}. 또 이 선수였어요`);
        if (near) lines.push(`작년 ${near}개 남기고 멈췄던 그 기록`);
        if (tier === 3) {
          lines.push(`${report.team}이 경기 전 기념식을 열어 줬어요 (팬 여론 +2)`);
          changeFame(player, 2);
        }
        lines.push("기념구는 기념구 앨범에 보관됐어요");
        report.bigMoments.push({
          tone: "gold",
          cls: `ceremony tier${tier}`,
          kicker: `${report.year}년 · ${LEAGUES[report.league].name} · 프로 통산`,
          title: `🎉 ${title}!`,
          html: countHtml(step, m.label) + (tier === 3 ? confettiHtml() : ""),
          lines,
        });
        delete player.nearMiss[`${m.key}-${step}`];
      }
    }
  }

  // 우승 공
  const champ = report.awards.find((a) => a.includes("시리즈 우승"));
  if (champ) {
    const n = player.balls.filter((x) => x.id.startsWith("champ-")).length + 1;
    addBall(player, {
      id: `champ-${report.year}`,
      label: `${champ}${n > 1 ? ` (${n}번째)` : ""}`,
      year: report.year,
      team: report.team,
      date: "가을",
      opp: "",
    });
  }

  // 아깝게 못 넘김: 다음 시즌 예고 + 기사
  for (const side of sides) {
    for (const m of MILESTONES[side]) {
      const a = after[m.key] || 0;
      const next = m.steps.find((s) => a < s);
      if (!next) continue;
      const left = next - a;
      if (a > 0 && left <= Math.max(2, Math.round(next * 0.01))) {
        player.nearMiss[`${m.key}-${next}`] = left;
        report.news.push(`${player.name}, ${CEREMONY_TITLE[m.key](next)}까지 ${left}개 남기고 시즌 마감… "내년 개막전에서"`);
      }
    }
  }
  if (report.bigMoments.some((x) => x.cls && x.cls.startsWith("ceremony"))) moreComments(player, report, FAN.milestone, 3);
}

function fillScene(key, opp) {
  return pick(CEREMONY_SCENE[key]).replace("{opp}", opp.name);
}

// 숫자 카운트업 (effects.js runCountUps가 돌림)
function countHtml(to, label) {
  return `<div class="count-ball"><span class="flying-ball">⚾</span><b data-count="${to}">0</b><small>${label}</small></div>`;
}

function ballHtml(label) {
  return `<div class="count-ball"><span class="flying-ball">⚾</span><small>${label} 기념구</small></div>`;
}

function confettiHtml() {
  const colors = ["#e8b931", "#ff8a80", "#7fd38f", "#8ab4ff", "#ffffff"];
  let html = '<div class="confetti">';
  for (let i = 0; i < 28; i++) {
    html += `<i style="left:${randomInt(0, 100)}%;background:${pick(colors)};animation-delay:${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(1.8 + Math.random()).toFixed(2)}s"></i>`;
  }
  return html + "</div>";
}

// 훈련 탭: 다가오는 기록 (지난 시즌 페이스면 이번에 넘을 수 있는 것)
function upcomingMilesHtml(player) {
  if (isAmateur(player.league)) return "";
  const t = careerTotals(player);
  const last = [...player.history].reverse().find((h) => !isAmateur(h.league));
  if (!last) return "";
  const items = [];
  for (const side of ["bat", "pit"]) {
    if (!last[side]) continue;
    for (const m of MILESTONES[side]) {
      const v = t[m.key] || 0;
      const next = m.steps.find((s) => v < s);
      if (!next) continue;
      const pace = last[side][CEREMONY_SRC[m.key][1]] || 0;
      if (pace > 0 && next - v <= pace) items.push(`${CEREMONY_TITLE[m.key](next)}까지 <b>${next - v}</b>`);
    }
  }
  if (!items.length) return "";
  return `<p class="upcoming">🎯 다가오는 기념구: ${items.join(" · ")}</p>`;
}

// 연감 탭: 기념구 앨범 (빈칸은 ?)
function ballAlbumHtml(player) {
  initBalls(player);
  const got = Object.fromEntries(player.balls.map((b) => [b.id, b]));
  const slots = [];
  const sides = [];
  if (player.type !== "pitcher") sides.push("bat");
  if (player.type !== "batter") sides.push("pit");
  const t = careerTotals(player);
  for (const f of FIRST_BALLS) if (sides.includes(CEREMONY_SRC[f.key][0])) slots.push({ id: `first-${f.key}`, label: f.label, reached: (t[f.key] || 0) > 0 });
  for (const side of sides) {
    for (const m of MILESTONES[side]) {
      // 딴 것 + 바로 다음 하나까지만 보여줌 (나머지는 비밀)
      const v = t[m.key] || 0;
      for (const s of m.steps) {
        slots.push({ id: `${m.key}-${s}`, label: CEREMONY_TITLE[m.key](s), reached: v >= s });
        if (v < s) break;
      }
    }
  }
  const champs = player.balls.filter((b) => b.id.startsWith("champ-"));
  for (const c of champs) slots.push({ id: c.id, label: c.label });
  if (!champs.length) slots.push({ id: "champ-none", label: "우승 공" });
  // 예전 버전 저장 데이터는 공이 없어도 이미 넘은 기록이면 칸을 채움
  const done = slots.filter((s) => got[s.id] || s.reached).length;
  let html = `<h4>⚾ 기념구 앨범 <small>${done} / ${slots.length}</small></h4><ul class="ball-album">`;
  for (const s of slots) {
    const b = got[s.id];
    html += b
      ? `<li class="on${b.tier === 3 ? " legend" : b.tier === 2 ? " big" : ""}"><span>⚾</span><b>${b.label}</b><small>${b.year} ${b.date || ""}${b.opp ? ` · vs ${b.opp}` : ""}</small></li>`
      : s.reached
        ? `<li class="on"><span>⚾</span><b>${s.label}</b><small>앨범 생기기 전 달성</small></li>`
        : `<li><span>?</span><b>${s.label}</b><small>아직</small></li>`;
  }
  return html + "</ul>";
}

FAN.milestone = [
  "와 {name} 기념구 저거 얼마냐",
  "역사의 한 페이지 ㄷㄷ",
  "이 기록 직관한 사람 부럽다",
  "{name} 이제 레전드 소리 들어도 됨",
  "기념구 잡은 관중 로또 맞았네",
  "꾸준함이 이렇게 무섭다",
  "이건 박수 쳐줘야지 인정",
  "구단 굿즈 나오면 산다 ㅋㅋ",
  "다음 목표 바로 가자",
];

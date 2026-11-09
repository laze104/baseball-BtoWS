// =============================================
// nemesis.js : v16 네메시스 숙적 (차별화 기획서 S1)
// - 1군 리그(KBO·NPB·MLB)마다 숙적 후보 8명
// - 해마다 나와의 맞대결 기록 (타석, 안타, 홈런, 삼진, 볼넷)
// - 관계 단계: 모름 → 신경 쓰임 → 앙숙 → 존중하는 사이
// - 결정적 순간에 진 숙적은 복수 다짐 → 다음 시즌 나 상대로만 집중력 UP
// - 숙적의 인생: 이적, 우리 팀 합류(어제의 적), 은퇴 편지, 감독 부임
// - 커뮤 밈, 숙적 카드
// 기존 동갑 라이벌(story.js)은 그대로 둠
// =============================================

const NEMESIS_STAGES = ["모름", "신경 쓰임", "앙숙", "존중하는 사이"];

const NEMESIS_MEMES = [
  "{nem} 나오면 {name} 눈빛부터 달라짐 ㅋㅋ",
  "오늘도 {name} vs {nem} 우주리그 시작",
  "{nem} 상대로는 언제나 진심 모드",
  "{nem} 등판 예고 뜨면 {name} 전날 잠 못 잔다던데",
  "둘이 붙으면 시청률 2배임",
  "{nem} 이름만 들어도 {name} 팬들 혈압 오름",
];

const NEMESIS_MEMORY_POOL = {
  domBat: ["{year}년 {nem} 상대 {H}안타 {HR}홈런 폭격", "{year}년 {nem} 공을 담장 밖으로 {HR}번 보냄"],
  domPit: ["{year}년 {nem|을} {K}번 돌려세움", "{year}년 {nem} 상대 피안타 {H}개로 꽁꽁 묶음"],
  lostBat: ["{year}년 {nem}에게 삼진 {K}개 굴욕", "{year}년 {nem} 상대 {PA}타석 {H}안타 침묵"],
  lostPit: ["{year}년 {nem}에게 홈런 {HR}방 허용", "{year}년 {nem}에게 안타 {H}개 두들겨 맞음"],
};

function initNemesis(player) {
  if (!player.nemeses) player.nemeses = [];
}

// 이 리그 숙적 후보 만들기 (처음 1군 왔을 때 한 번)
function makeNemeses(player, league) {
  const level = LEAGUES[league].level;
  const list = [];
  const myBat = player.type !== "pitcher";
  const myPit = player.type !== "batter";
  for (let i = 0; i < 8; i++) {
    // 나는 타자 → 상대는 투수. 이도류면 반반
    const type = myBat && myPit ? (i % 2 ? "batter" : "pitcher") : myBat ? "pitcher" : "batter";
    const pos = type === "pitcher" ? pick(["선발", "선발", "불펜", "마무리"]) : pick(["1루수", "2루수", "3루수", "유격수", "외야수", "포수", "지명타자"]);
    list.push({
      id: `${league}-${player.season}-${i}`,
      name: fakeName(league),
      league, type, pos,
      team: otherTeam(player, league),
      age: clamp(player.age + randomInt(-4, 4), 19, 36),
      ovr: level + randomInt(-4, 8),
      stage: 0,
      tot: { PA: 0, H: 0, HR: 0, K: 0, BB: 0 },
      log: [],
      memory: "",
      revenge: false,
      status: "active", // active, teammate, retired, manager
      since: gameYear(player),
    });
  }
  player.nemeses.push(...list);
}

const nemName = (n) => n.name;

// 시즌마다: 맞대결 시뮬 (career.js runSeason에서 순위 정한 뒤 부름)
function nemesisSeason(player, report) {
  initNemesis(player);
  const lg = report.league;
  if (!TOP_LEAGUES.includes(lg) || (!report.bat && !report.pit)) return;
  if (!player.nemeses.some((n) => n.league === lg)) makeNemeses(player, lg);
  const level = LEAGUES[lg].level;
  const active = player.nemeses.filter((n) => n.league === lg && n.status === "active" && n.team !== report.team);
  // 한 시즌에 붙는 숙적은 3~5명 (같은 리그라도 매번 만나진 않음)
  const faced = [...active].sort(() => Math.random() - 0.5).slice(0, randomInt(3, 5));
  report.nemesis = [];
  for (const n of faced) {
    const vsBat = n.type === "pitcher"; // 상대가 투수면 나는 타석에 섬
    const mine = vsBat ? report.bat : report.pit;
    if (!mine) continue;
    const r = matchup(mine, vsBat, n, level);
    for (const k of Object.keys(n.tot)) n.tot[k] += r[k];
    n.log.push({ year: report.year, ...r });
    if (n.log.length > 12) n.log.shift();
    if (n.revenge) r.revenge = true;
    n.revenge = false; // 복수 다짐은 한 시즌만
    updateStage(player, n, r, vsBat, report);
    report.nemesis.push({ name: n.name, team: n.team, stage: n.stage, vsBat, ...r });
  }
  if (!report.nemesis.length) delete report.nemesis;
}

// 맞대결 한 시즌: 내 시즌 비율 기록에 상대 실력 차이를 섞음
function matchup(mine, vsBat, n, level) {
  const PA = randomInt(9, 18);
  const edge = (n.ovr - level) * 0.012 + (n.revenge ? 0.08 : 0); // 상대가 잘할수록, 복수심 있으면 나한테 불리
  let hit, hr, k, bb;
  if (vsBat) {
    hit = mine.AB ? mine.H / mine.PA : 0.24;
    hr = mine.PA ? mine.HR / mine.PA : 0.02;
    k = mine.PA ? mine.K / mine.PA : 0.2;
    bb = mine.PA ? mine.BB / mine.PA : 0.08;
    hit *= 1 - edge; hr *= 1 - edge * 1.5; k *= 1 + edge * 1.5;
  } else {
    const bf = Math.max(1, mine.outs + mine.H + mine.BB);
    hit = mine.H / bf; hr = mine.HR / bf; k = mine.K / bf; bb = mine.BB / bf;
    hit *= 1 + edge; hr *= 1 + edge * 1.5; k *= 1 - edge * 1.5;
  }
  const r = { PA, H: 0, HR: 0, K: 0, BB: 0 };
  for (let i = 0; i < PA; i++) {
    const x = Math.random();
    if (x < hr) { r.HR++; r.H++; }
    else if (x < hit) r.H++;
    else if (x < hit + bb) r.BB++;
    else if (x < hit + bb + k) r.K++;
  }
  return r;
}

// 관계 단계 바꾸기 + 기억에 남은 장면
function updateStage(player, n, r, vsBat, report) {
  const ab = Math.max(1, r.PA - r.BB);
  const avg = r.H / ab;
  const vals = { nem: n.name, year: report.year, ...r };
  // 내가 압도: 타자면 고타율+홈런, 투수면 삼진 많고 안타 적게
  const iWon = vsBat ? (avg >= 0.4 && r.HR >= 1) || r.HR >= 3 : r.K >= 6 && avg <= 0.18;
  const iLost = vsBat ? avg <= 0.12 && r.K >= 4 : r.HR >= 3 || (avg >= 0.4 && r.HR >= 1);
  if (iWon) n.memory = fillText(pick(NEMESIS_MEMORY_POOL[vsBat ? "domBat" : "domPit"]), player, vals);
  if (iLost) n.memory = fillText(pick(NEMESIS_MEMORY_POOL[vsBat ? "lostBat" : "lostPit"]), player, vals);
  const before = n.stage;
  if (n.stage === 0 && n.tot.PA >= 15) n.stage = 1;
  if (iWon || iLost) n.sparks = (n.sparks || 0) + 1;
  // 크게 이기거나 진 시즌이 두 번은 쌓여야 앙숙 (결정적 순간은 바로 앙숙)
  if (n.stage === 1 && n.sparks >= 2 && n.log.length >= 3) n.stage = 2;
  if (n.stage === 2) {
    n.feud = (n.feud || 0) + 1;
    if (n.feud >= 4 && n.tot.PA >= 60 && player.age >= 30) n.stage = 3;
  }
  if (n.stage === 2 && before < 2) {
    n.meme = pick(NEMESIS_MEMES);
    report.news.push(`${player.name} vs ${n.name}, 새로운 앙숙 탄생… "${n.memory || "만나면 불꽃"}"`);
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({ tone: "bad", kicker: "숙적 등장", title: `⚔️ ${n.name}`, lines: [`${n.team} ${n.pos}`, n.memory || "만날 때마다 불꽃이 튀어요", "관계: 앙숙"] });
  }
  if (n.stage === 3 && before < 3) {
    report.news.push(`${player.name}·${n.name}, 십 년 앙숙에서 서로 인정하는 사이로`);
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({ tone: "good", kicker: "숙적과의 관계", title: `🤝 ${n.name}`, lines: ["앙숙 → 존중하는 사이", `통산 맞대결 ${n.tot.PA}타석`] });
  }
}

// 결정적 순간 상대를 숙적 중에서 고름 (중계 상대 이름에 씀)
function clutchNemesis(player, side) {
  initNemesis(player);
  const lr = player.lastReport;
  const lg = lr ? lr.league : player.league;
  const want = side === "bat" ? "pitcher" : "batter";
  const list = player.nemeses.filter((n) => n.league === lg && n.status === "active" && n.type === want && n.team !== player.team);
  if (!list.length) return null;
  // 관계가 깊을수록 잘 걸림
  const deep = list.filter((n) => n.stage >= 1);
  if (deep.length && Math.random() < 0.7) return pick(deep);
  return Math.random() < 0.5 ? pick(list) : null;
}

// 결정적 순간 결과를 숙적이 기억함
function clutchNemesisResult(player, n, ok, choice) {
  if (!n) return [];
  const year = player.lastReport ? player.lastReport.year : gameYear(player);
  const news = [];
  if (ok) {
    n.revenge = true;
    n.memory = `${year}년 ${choice.stage}, ${player.name}에게 무너짐`;
    n.stage = Math.max(n.stage, 2);
    if (!n.meme) n.meme = pick(NEMESIS_MEMES);
    news.push(`${n.name} "다음엔 절대 안 진다"… ${player.name}에게 복수 다짐`);
  } else {
    n.memory = `${year}년 ${choice.stage}, ${n.name}에게 당함`;
    n.stage = Math.max(n.stage, 1);
    news.push(`${n.name}, ${player.name} 상대 승리 후 "내가 한 수 위"`);
  }
  return news;
}

// 시즌 뒤 숙적들의 인생 (career.js에서 시즌 마지막에 부름)
function nemesisLife(player, report) {
  initNemesis(player);
  const year = report.year;
  report.bigMoments = report.bigMoments || [];
  for (const n of player.nemeses) {
    if (n.status === "manager") continue;
    if (n.status === "retired") {
      // 은퇴한 숙적은 몇 년 뒤 감독으로 돌아옴
      if (n.managerYear && year >= n.managerYear && n.stage >= 2 && !player.retired && n.league === player.league) {
        n.status = "manager";
        n.team = otherTeam(player, n.league);
        report.news.push(`${n.name}, ${n.team} 감독 부임… "이제는 벤치에서 ${player.name}${josaOf(player.name, "을")} 상대한다"`);
        report.bigMoments.push({ tone: "bad", kicker: "숙적의 귀환", title: `🧢 ${n.name} 감독`, lines: [`${n.team} 신임 감독`, `현역 시절 맞대결 ${n.tot.PA}타석`, n.memory || ""] });
      }
      continue;
    }
    n.age++;
    // 나이 따라 실력 변화
    n.ovr += n.age <= 27 ? randomInt(0, 2) : n.age <= 31 ? randomInt(-1, 1) : randomInt(-3, 0);
    // 은퇴
    if ((n.age >= 37 && Math.random() < 0.3) || n.age >= 41 || n.ovr < LEAGUES[n.league].level - 12) {
      n.status = "retired";
      n.retiredYear = year;
      if (n.stage >= 2 && Math.random() < 0.6) n.managerYear = year + randomInt(3, 7);
      if (n.stage >= 2) {
        const letter = n.stage === 3 ? `"너 때문에 여기까지 왔다. 고마웠다, ${player.name}."` : `"끝내 너를 못 넘었네. 그래도 덕분에 버텼다."`;
        report.news.push(`${n.name} 은퇴… ${player.name}에게 남긴 한마디 ${letter}`);
        report.bigMoments.push({ tone: "good", kicker: "숙적의 은퇴", title: `📨 ${n.name}의 편지`, lines: [letter, `통산 맞대결 ${n.tot.PA}타석 · 안타 ${n.tot.H} · 홈런 ${n.tot.HR} · 삼진 ${n.tot.K}`] });
      }
      continue;
    }
    // 이적 (8%). 관계 있는 숙적은 가끔 우리 팀으로 옴
    if (n.status === "active" && Math.random() < 0.08) {
      const toUs = n.stage >= 1 && n.league === player.league && Math.random() < 0.3 && !player.retired;
      const from = n.team;
      n.team = toUs ? player.team : otherTeam(player, n.league);
      if (toUs) {
        n.status = "teammate";
        report.news.push(`어제의 적이 오늘의 동료로… ${n.name}, ${player.team} 합류`);
        pushChoice(player, nemesisTeammateChoice(player, n, from));
      }
    } else if (n.status === "teammate" && n.team !== player.team) {
      n.status = "active"; // 내가 팀을 옮기면 다시 적
    }
  }
}

function nemesisTeammateChoice(player, n, from) {
  return {
    key: "nemesisMate",
    nemId: n.id,
    text: `🤝 어제의 적! ${from}에서 뛰던 숙적 ${n.name}이(가) ${player.team}에 왔어요. 첫 훈련날 라커룸에서 마주쳤어요.`,
    options: [
      { id: "shake", label: "먼저 손을 내민다", detail: "팬 여론 ↑ · 관계가 존중하는 사이로" },
      { id: "cold", label: "\"여기선 내가 에이스다\" 기싸움", detail: "다음 시즌 컨디션 ↑ · 팬 여론 조금 ↓" },
    ],
  };
}

function resolveNemesisMate(player, choice, option) {
  const n = (player.nemeses || []).find((x) => x.id === choice.nemId);
  if (!n) return [];
  if (option.id === "shake") {
    n.stage = 3;
    changeFame(player, 4);
    return [`${player.name}, 숙적 ${n.name}에게 먼저 악수… "이제 한 팀이다"`];
  }
  player.nextMod = (player.nextMod || 0) + 1;
  changeFame(player, -2);
  return [`${player.name}·${n.name}, 한 팀 돼서도 기싸움 "자리는 실력으로"`];
}

// 숙적 밈 댓글: 앙숙이랑 붙은 시즌에 커뮤에 섞임
function nemesisMemes(player, report) {
  if (!report.nemesis) return;
  const hot = report.nemesis.map((x) => (player.nemeses || []).find((n) => n.name === x.name)).filter((n) => n && n.stage >= 2 && n.meme);
  if (!hot.length) return;
  const n = pick(hot);
  addReaction(player, report, [], [fillText(n.meme, player, { nem: n.name })], { nem: n.name });
}

// 숙적 탭
function showNemesis(player) {
  const box = $("tab-nemesis");
  if (!box) return;
  initNemesis(player);
  const list = player.nemeses.filter((n) => n.tot.PA > 0 || n.stage > 0).sort((a, b) => b.stage - a.stage || b.tot.PA - a.tot.PA);
  if (!list.length) {
    box.innerHTML = "<p class='empty'>아직 숙적이 없어요. KBO·NPB·MLB 1군에서 뛰면 자주 만나는 상대가 생겨요.</p>";
    return;
  }
  let html = `<p class="small">1군에서 자주 붙는 상대들이에요. 많이 만나고, 크게 이기거나 지면 관계가 깊어져요.</p><div class="nem-cards">`;
  for (const n of list) {
    const ab = Math.max(1, n.tot.PA - n.tot.BB);
    const vsBat = n.type === "pitcher";
    const status = { active: n.team, teammate: `${n.team} (지금 동료)`, retired: `은퇴 (${n.retiredYear})`, manager: `${n.team} 감독` }[n.status];
    html += `<div class="nem-card stage${n.stage}">
      <div class="nem-head"><b>${n.name}</b><span class="nem-stage">${NEMESIS_STAGES[n.stage]}</span></div>
      <p class="small">${LEAGUES[n.league].name} · ${status} · ${n.pos}${n.revenge ? " · 🔥 복수 다짐" : ""}</p>
      <p class="nem-line">${vsBat ? "나(타자)" : "나(투수)"} vs ${n.name}: ${n.tot.PA}타석 ${n.tot.H}안타 ${n.tot.HR}홈런 ${n.tot.K}삼진 ${n.tot.BB}볼넷 · ${vsBat ? "타율" : "피안타율"} <b>${fmtRate(n.tot.H / ab)}</b></p>
      ${n.memory ? `<p class="nem-memory">“${n.memory}”</p>` : ""}
      ${n.log.length ? `<p class="small">${n.log.slice(-5).map((l) => `${l.year}: ${l.H}/${l.PA - l.BB}${l.HR ? ` ${l.HR}HR` : ""}`).join(" · ")}</p>` : ""}
    </div>`;
  }
  box.innerHTML = html + "</div>";
}

// 시즌 결과 탭 한 줄씩
function nemesisResultHtml(report) {
  if (!report.nemesis || !report.nemesis.length) return "";
  return `<h4>⚔️ 숙적 맞대결</h4><ul class="nem-rows">${report.nemesis.map((x) => `<li><span>${x.name} <small>${x.team.split(" ")[0]} · ${NEMESIS_STAGES[x.stage]}${x.revenge ? " · 복수전" : ""}</small></span><b>${x.PA}타석 ${x.H}안타 ${x.HR}홈런 ${x.K}삼진</b></li>`).join("")}</ul>`;
}

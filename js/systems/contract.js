// =============================================
// contract.js : 계약서 디테일
// - 조항: 옵트아웃, 트레이드 거부권, 인센티브, 해외 진출 보장
// - 역할 약속: 주전 보장 / 선발 로테이션 / 마무리 / 경쟁 → 안 지키면 불만 메일
// - 에이전트 성향: 신사형(한빛) / 공격형(스톤) / 데이터형(넘버스)
// - 연봉조정 청문회: MLB 3~5년차, KBO는 연봉 차이 클 때 (KBO는 선수가 거의 못 이김)
// =============================================

const CLAUSES = {
  optOut: { icon: "🚪", label: "옵트아웃", desc: "정해진 해가 끝나면 남은 계약 버리고 FA 다시 나갈 수 있음" },
  noTrade: { icon: "🛡️", label: "트레이드 거부권", desc: "내 동의 없이 트레이드 못 함" },
  incentive: { icon: "🎁", label: "인센티브", desc: "기준 넘으면 연말 보너스" },
  overseas: { icon: "✈️", label: "해외 진출 보장", desc: "해외 구단 제안 오면 구단이 무조건 풀어줌" },
};

const ROLE_PROMISES = {
  starter: { label: "주전 보장", check: (r) => !!(r.bat && /주전/.test(r.bat.role)) },
  rotation: { label: "선발 로테이션 보장", check: (r) => !!(r.pit && /선발 로테이션/.test(r.pit.role)) },
  closer: { label: "마무리 보장", check: (r) => !!(r.pit && /마무리/.test(r.pit.role)) },
  compete: { label: "경쟁 (보장 없음)", check: () => true },
};

function hasClause(player, id) {
  const c = player.contract;
  return !!(c && c.clauses && c.clauses.some((x) => x.id === id) && c.team === player.team);
}

function clauseOf(player, id) {
  const c = player.contract;
  return c && c.clauses ? c.clauses.find((x) => x.id === id) : null;
}

// ---------------------------------------------
// 1. FA 제안에 조항·역할 붙이기 (extra.js buildFaChoice 에서 부름)
// ---------------------------------------------
function attachClauses(player, o) {
  if (o.clauses) return o;
  const style = agentStyle(player);
  const war = recentWar(player);
  const lv = LEAGUES[o.league] ? LEAGUES[o.league].level : 60;
  const ovr = getOvrs(player).best;
  const push = style === "aggressive" ? 0.2 : 0;
  const list = [];
  if (o.years >= 4 && war >= 3 && Math.random() < 0.3 + push) list.push({ id: "optOut", after: o.years >= 6 ? 3 : 2 });
  if ((player.age >= 30 || o.mega || isFranchiseHere(player)) && Math.random() < 0.25 + push + (o.mega ? 0.4 : 0)) list.push({ id: "noTrade" });
  const incChance = (o.league === "KBO" ? 0.6 : 0.35) + (style === "data" ? 0.3 : 0);
  if (Math.random() < incChance) {
    const target = Math.max(1.5, Math.round(Math.max(war, 1.5) * 0.9 * 2) / 2);
    list.push({ id: "incentive", war: target, pay: Math.round(o.salary * (0.12 + Math.random() * 0.1)) });
  }
  if (o.league === "KBO" && player.age <= 30 && ovr >= LEAGUES.KBO.level + 2 && Math.random() < 0.3 + push) list.push({ id: "overseas" });
  o.clauses = list;
  o.role = offerRole(player, o, ovr, lv);
  return o;
}

// 구단이 약속하는 역할: 실력이 리그 수준보다 확실히 높아야 보장해 줌
function offerRole(player, o, ovr, lv) {
  const sure = ovr >= lv + (o.need ? -1 : 1) || o.mega;
  if (!sure) return "compete";
  if (player.type === "pitcher") {
    if (player.position.startsWith("선발")) return "rotation";
    return player.role === "closer" || o.need === "마무리" ? "closer" : "compete";
  }
  return "starter";
}

function clauseTags(o) {
  const tags = (o.clauses || []).map((c) => {
    const k = CLAUSES[c.id];
    if (c.id === "optOut") return `${k.icon} ${c.after}년 후 옵트아웃`;
    if (c.id === "incentive") return `${k.icon} WAR ${c.war}↑ 보너스 ${fmtMoney(c.pay)}`;
    return `${k.icon} ${k.label}`;
  });
  if (o.role && o.role !== "compete") tags.unshift(`📋 ${ROLE_PROMISES[o.role].label}`);
  return tags.length ? `<br>${tags.join(" · ")}` : "";
}

// 계약 확정 직후 (career.js resolveChoice fa)
function applyContractTerms(player, o, oldTeam, stayed) {
  const news = [];
  const c = player.contract;
  c.clauses = (o.clauses || []).map((x) => ({ ...x }));
  c.length = o.years;
  c.role = o.role || "compete";
  player.promiseTeam = o.team; // world.js resolveCampWish 가 팀 바뀌면 약속 지움
  if (c.role === "starter") player.starterPromise = true;
  if (c.role === "closer") player.role = "closer";
  player.promise = c.role !== "compete" ? { team: o.team, role: c.role, since: gameYear(player) + 1, complained: 0 } : null;
  const names = c.clauses.map((x) => CLAUSES[x.id].label);
  if (c.role !== "compete") names.unshift(ROLE_PROMISES[c.role].label);
  if (names.length) news.push(`계약서 세부 조항: ${names.join(", ")}`);
  // 에이전트 성향
  const style = agentStyle(player);
  if (style === "aggressive" && !stayed && oldTeam) {
    changeTeamFans(player, oldTeam, -4);
    news.push(`${player.agent.boss}, "시장 가치대로 받았을 뿐"… 친정 팬들 "에이전트가 다 뺏어갔다" 부글부글`);
  } else if (style === "gentle" && !stayed && oldTeam) {
    changeTeamFans(player, oldTeam, 3);
    news.push(`${player.agent.boss}, 원소속팀에 먼저 감사 인사… "${oldTeam}과 끝까지 예의 지켰다"`);
  } else if (style === "data") {
    news.push(`${player.agent.name}, 협상장에 80쪽짜리 분석 자료 들고 와… "숫자가 말해 준다"`);
  }
  return news;
}

// ---------------------------------------------
// 2. 시즌 끝 계약 처리 (career.js moveCareer 에서 years 줄인 뒤)
// ---------------------------------------------
function contractYearEnd(player, report) {
  const c = player.contract;
  if (!c || !c.clauses) return;
  const opt = c.clauses.find((x) => x.id === "optOut");
  if (opt && c.length && c.years > 0 && c.length - c.years === opt.after && c.team === player.team) {
    const war = recentWar(player);
    const left = fmtMoney(c.salary * c.years);
    pushChoice(player, {
      key: "optOut",
      mailFrom: player.agent ? player.agent.name : "구단 운영팀",
      mailSubject: "[옵트아웃] 권리 행사 마감 안내",
      text: `🚪 계약서의 옵트아웃 시점이에요. 남은 ${c.years}년 ${left}을 그대로 받을지, 계약을 깨고 FA 시장에 다시 나갈지 정해야 해요. 최근 WAR ${war.toFixed(1)}${war >= 4 ? " · 시장 반응 뜨거울 듯" : war < 2 ? " · 시장이 차가울 수도" : ""}`,
      options: [
        { id: "out", label: "옵트아웃! FA 다시 나간다", detail: `남은 ${left} 포기 · 더 큰 계약 노림` },
        { id: "keep", label: "남은 계약 그대로 간다", detail: "안정 · 팀 팬심 조금 ↑" },
      ],
    });
  }
}

function resolveOptOut(player, choice, option) {
  if (option.id === "keep") {
    changeTeamFans(player, player.team, 3);
    return [`${player.name}, 옵트아웃 안 쓴다… "${player.team}에서 계약 끝까지 뛰겠다"`];
  }
  player.contract.years = 0;
  player.contract.clauses = [];
  player.optedOut = true;
  pushChoiceFirst(player, faChoice(player, "🚪 옵트아웃을 행사했어요. 남은 계약을 버리고 FA 시장에 다시 나왔어요."));
  return [`[속보] ${player.name}, 옵트아웃 행사… FA 시장 재진입`];
}

// 인센티브: 연봉 받을 때 같이 (money.js payday)
function payIncentive(player, report) {
  const inc = clauseOf(player, "incentive");
  if (!inc || !report || report.team !== player.contract.team) return 0;
  if ((report.WAR || 0) < inc.war) return 0;
  report.news.push(`${player.name}, 계약서 인센티브 달성 (WAR ${inc.war} 이상)… 보너스 ${fmtMoney(inc.pay)} 수령`);
  return inc.pay;
}

// 해외 진출 보장이면 포스팅 동의 확정 (rules.js consentChance)
function overseasClauseOk(player) {
  return hasClause(player, "overseas");
}

// ---------------------------------------------
// 3. 역할 약속 어기면 (phases.js 전반기 끝)
// ---------------------------------------------
function checkRolePromise(player, ctx) {
  const pr = player.promise;
  const r = ctx.report;
  if (!pr || pr.team !== player.team || r.team !== player.team) return;
  if (gameYear(player) < pr.since) return;
  if (ROLE_PROMISES[pr.role].check(r)) return;
  if (r.injury && r.injury.games >= 20) return; // 다쳐서 밀린 건 내 사정
  const label = ROLE_PROMISES[pr.role].label;
  const now = (r.bat && r.bat.role) || (r.pit && r.pit.role) || "벤치";
  const m = managerOf(player);
  pushChoice(player, {
    key: "promiseBroken",
    mailFrom: player.agent ? player.agent.name : "매니지먼트",
    mailSubject: "계약 때 약속이랑 다르잖아요",
    text: `📋 계약할 때 구단이 '${label}'을 약속했는데 지금 역할은 '${now}'예요.${pr.complained ? " 벌써 두 번째예요." : ""} ${m.anonymous ? "코칭스태프" : m.name + " 감독"}은 "실력으로 보여 주면 된다"는 입장이래요. 어떻게 할까요?`,
    options: [
      { id: "meet", label: "감독실 찾아가서 따진다", detail: "약속 지켜 달라고 정면으로 · 감독 신뢰에 따라 결과 갈림" },
      {
        id: "agent",
        label: player.agent ? `${player.agent.boss}에게 구단과 얘기하라고 한다` : "구단 프런트에 정식 항의",
        detail: "프런트 압박 · 지켜질 가능성 ↑, 감독과 사이 ↓",
      },
      { id: "trade", label: "차라리 트레이드 요청", detail: "기회 주는 팀으로 · 팬심 ↓" },
      { id: "endure", label: "참고 실력으로 증명한다", detail: "후반기 독기 (컨디션 +1) · 아무 일 없음" },
    ],
  });
  pr.complained++;
}

function resolvePromiseBroken(player, choice, option) {
  const ctx = player.cur;
  const news = [];
  player.lastPromise = "bad";
  const m = managerOf(player);
  const who = m.anonymous ? "코칭스태프" : `${m.name} 감독`;
  const trust = player.trustTeam === player.team ? player.managerTrust || 0 : 0;
  const restore = () => {
    if (player.promise.role === "starter") player.starterPromise = true;
    if (player.promise.role === "closer") player.role = "closer";
    if (ctx) ctx.partMod = (ctx.partMod || 0) + 1;
  };
  if (option.id === "meet") {
    if (Math.random() < clamp(0.4 + trust * 0.08 + (player.fame || 0) / 300, 0.15, 0.85)) {
      restore();
      player.lastPromise = "ok";
      news.push(`${who} "내가 약속한 거 맞다"… ${player.name}, 후반기 ${ROLE_PROMISES[player.promise.role].label} 복귀`);
    } else {
      player.morale = clamp((player.morale || 0) - 2, -10, 10);
      news.push(`${player.name}, 감독실 면담 뒤 표정 굳어… ${who} "기용은 내가 정한다"`);
    }
  } else if (option.id === "agent") {
    restore();
    player.lastPromise = "ok";
    if (player.trustTeam === player.team) player.managerTrust = Math.max(-3, (player.managerTrust || 0) - 1);
    else {
      player.trustTeam = player.team;
      player.managerTrust = -1;
    }
    news.push(`${player.name} 측, 구단에 "계약 조건 이행" 공식 요청… 프런트가 현장에 전달`);
  } else if (option.id === "trade") {
    changeTeamFans(player, player.team, -5);
    if (ctx && DEADLINE_LEAGUES.includes(player.league) && Math.random() < 0.55) {
      const from = player.team;
      const res = doTrade(player, ctx.report, "mid");
      ctx.report.team = res.to;
      ctx.report.tradedFrom = from;
      player.promise = null;
      news.push(`[트레이드] ${player.name}, 출전 기회 찾아 ${from} → ${res.to}`);
    } else news.push(`${player.name}, 트레이드 요청했지만 구단 "보낼 생각 없다"`);
  } else {
    if (ctx) ctx.partMod = (ctx.partMod || 0) + 1;
    news.push(`${player.name}, 말 대신 배트로… "기회 오면 잡겠다"`);
  }
  return news;
}

// ---------------------------------------------
// 4. 에이전트 성향
// ---------------------------------------------
function agentStyle(player) {
  const a = player.agent ? AGENCIES[player.agent.id] : null;
  return a ? a.style : null;
}

// ---------------------------------------------
// 5. 연봉조정 청문회
// - MLB: 3~5년차. 선수·구단이 금액 하나씩 내고 조정위원 3명이 둘 중 하나 고름 (중간 없음)
// - KBO: 연봉조정위원회. 역사상 선수가 이긴 적이 손에 꼽음
// - 대부분은 청문회 전에 합의함
// ---------------------------------------------
const ARB_ARGS = {
  war: { label: "📈 WAR·세이버 지표", hint: (s) => `WAR ${s.war.toFixed(1)}`, power: (s) => clamp(s.war / (s.line * 0.55), 0, 2) },
  rate: {
    label: "⚾ 시즌 성적 (OPS·평균자책)",
    hint: (s) => s.rateText,
    power: (s) => clamp(s.rate, 0, 2),
  },
  comps: { label: "📑 비슷한 연차 선수 연봉 비교", hint: (s) => `비교 선수 ${s.comps}명 확보`, power: (s) => clamp(0.5 + s.comps * 0.15, 0, 2) },
  durable: { label: "🩹 출장 경기·내구성", hint: (s) => `${s.games}경기 (${Math.round(s.share * 100)}%)`, power: (s) => clamp(s.share * 2 - 0.4, 0, 2) },
  clutch: { label: "🔥 결정적 순간 활약", hint: (s) => `클러치 능력 ${s.clutch >= 0 ? "+" : ""}${s.clutch}`, power: (s) => clamp(1 + s.clutch / 8, 0, 2) },
  team: { label: "🏟️ 팀 성적 기여·리더십", hint: (s) => `팀 ${s.rank}위`, power: (s) => clamp(1.6 - s.rankPos * 1.4, 0, 2) },
};

const ARB_CLUB = [
  { id: "injury", counter: "durable", line: '구단 측: "출장 경기가 모자랐습니다. 몸이 1년을 버틸지 의문입니다."', weak: (s) => s.share < 0.75 },
  { id: "small", counter: "rate", line: '구단 측: "표본이 작은 성적입니다. 운이 따랐던 시즌이에요."', weak: (s) => s.babipLuck },
  { id: "clutch", counter: "clutch", line: '구단 측: "중요한 순간엔 약했습니다. 득점권 기록 보시죠."', weak: (s) => s.clutch < 0 },
  { id: "team", counter: "team", line: '구단 측: "팀은 하위권이었습니다. 개인 기록이 승리로 이어지지 않았어요."', weak: (s) => s.rankPos > 0.6 },
  { id: "market", counter: "comps", line: '구단 측: "요구액은 같은 연차 최고 수준입니다. 시장가를 벗어났어요."', weak: () => true },
  { id: "war", counter: "war", line: '구단 측: "수비·주루까지 보면 실제 가치는 더 낮습니다."', weak: (s) => s.war < s.line * 0.5 },
];

function arbStats(player) {
  const r = player.lastReport || { WAR: 0, awards: [] };
  const lg = player.league;
  const env = LEAGUE_ENV[lg] || { ops: 0.72, era: 4.3 };
  const games = LEAGUES[lg].games;
  const s = { war: r.WAR || 0, line: AWARD_LINE[lg] ? AWARD_LINE[lg].war : 6, clutch: (player.stats.clutch || 50) - LEAGUES[lg].level };
  s.clutch = clamp(Math.round(s.clutch / 2), -9, 9);
  if (r.bat && r.bat.PA >= (r.pit ? 9999 : 50)) {
    s.rate = r.bat.OPS / env.ops;
    s.rateText = `OPS ${fmtRate(r.bat.OPS)} (리그 평균 ${fmtRate(env.ops)})`;
    s.games = r.bat.G;
    s.share = r.bat.G / games;
    s.babipLuck = r.bat.BABIP !== undefined && r.bat.BABIP > 0.34;
  } else if (r.pit) {
    s.rate = env.era / Math.max(1, r.pit.ERA);
    s.rateText = `평균자책 ${r.pit.ERA.toFixed(2)} (리그 평균 ${env.era.toFixed(2)})`;
    s.games = r.pit.G;
    s.share = r.pit.GS ? r.pit.GS / (games / 5.3) : r.pit.G / (games * 0.42);
    s.babipLuck = r.pit.BABIP !== undefined && r.pit.BABIP < 0.27;
  } else {
    s.rate = 0.8;
    s.rateText = "기록 부족";
    s.games = 0;
    s.share = 0;
  }
  s.share = clamp(s.share, 0, 1);
  s.comps = randomInt(1, 4) + (agentStyle(player) === "data" ? 3 : 0);
  const st = r.standing;
  s.rank = st ? st.rank : "-";
  s.rankPos = st && st.teams > 1 ? (st.rank - 1) / (st.teams - 1) : 0.5;
  return s;
}

// 구단 제시액과 내 요구액
function arbFigures(player, clubSalary) {
  const war = (player.lastReport && player.lastReport.WAR) || 0;
  const gap = 1.25 + clamp(war / 20, 0, 0.3) + (agentStyle(player) === "aggressive" ? 0.1 : 0);
  return { club: clubSalary, ask: Math.round(clubSalary * gap) };
}

// MLB: rules.js mlbContractEnd 에서 연봉조정 대상이면 부름
// KBO: moveCareer 에서 negotiateSalary 뒤에 부름
function maybeArbitration(player, report, kind) {
  const c = player.contract;
  if (!c) return;
  if (kind === "kbo" && (report.WAR < 3.5 || Math.random() > 0.3)) return; // 대부분은 그냥 도장 찍음
  if (kind === "mlb" && Math.random() > 0.5) return; // 반은 금액 교환 전에 합의
  const fig = arbFigures(player, c.salary);
  const lgName = kind === "kbo" ? "KBO 연봉조정위원회" : "MLB 연봉조정위원회";
  pushChoice(player, {
    key: "arbStart",
    kind,
    fig,
    mailFrom: player.agent ? player.agent.name : "구단 운영팀",
    mailSubject: `[연봉 협상] 구단 ${fmtMoney(fig.club)} vs 요구 ${fmtMoney(fig.ask)}`,
    text: `💼 연봉 협상이 틀어졌어요. 구단은 ${fmtMoney(fig.club)}, 우리는 ${fmtMoney(fig.ask)}. 이대로면 ${lgName} 청문회예요. 조정위원은 두 금액 중 하나만 골라요 (중간 없음).${kind === "kbo" ? " KBO 청문회는 역대로 선수가 이긴 적이 거의 없어요." : " 청문회에선 구단이 내 단점을 대놓고 늘어놓아요."}`,
    options: [
      { id: "sign", label: "구단 제시액에 사인", detail: `${fmtMoney(fig.club)} · 구단과 관계 그대로` },
      {
        id: "settle",
        label: "중간에서 합의 시도",
        detail: `${fmtMoney(Math.round((fig.club + fig.ask) / 2))} 근처 · ${kind === "kbo" ? "구단이 받아줄지 반반" : "대부분 여기서 끝남"}`,
      },
      { id: "hearing", label: "청문회 간다", detail: "3번의 공방 · 이기면 요구액 전부, 지면 구단 제시액 · 끝나고 서먹함" },
    ],
  });
}

function arbRoundChoice(player, arb) {
  const s = arb.stats;
  const club = arb.clubArgs[arb.round];
  const ids = shuffle(Object.keys(ARB_ARGS).filter((k) => !arb.used.includes(k))).slice(0, 3);
  if (!ids.includes(club.counter) && !arb.used.includes(club.counter) && Math.random() < 0.7) ids[randomInt(0, ids.length - 1)] = club.counter;
  return {
    key: "arbRound",
    arb,
    mailFrom: "연봉조정위원회",
    mailSubject: `청문회 ${arb.round + 1}라운드`,
    text: `⚖️ 청문회 ${arb.round + 1}/3 · ${club.line}${arb.round ? ` (지금까지 분위기: ${arb.score >= arb.round * 1.1 ? "우리 쪽" : arb.score >= arb.round * 0.7 ? "팽팽" : "구단 쪽"})` : ""} 무엇으로 반박할까요?`,
    options: ids.map((k) => ({ id: k, label: ARB_ARGS[k].label, detail: `근거: ${ARB_ARGS[k].hint(s)}` })),
  };
}

function resolveArb(player, choice, option) {
  const news = [];
  player.lastArb = null;
  if (choice.key === "arbStart") {
    const fig = choice.fig;
    if (option.id === "sign") {
      player.contract.salary = fig.club;
      player.lastArb = "settle";
      return [`${player.name}, 구단 제시액 ${fmtMoney(fig.club)}에 사인… 연봉 협상 마무리`];
    }
    if (option.id === "settle") {
      const ok = choice.kind === "kbo" ? Math.random() < 0.5 : Math.random() < 0.85;
      if (ok) {
        player.contract.salary = Math.round((fig.club + fig.ask) / 2);
        player.lastArb = "settle";
        return [`${player.name}, 청문회 앞두고 극적 합의… 연봉 ${fmtMoney(player.contract.salary)}`];
      }
      news.push(`구단 "합의 없다"… ${player.name}, 연봉조정 청문회로`);
    }
    const s = arbStats(player);
    const weak = ARB_CLUB.filter((c) => c.weak(s));
    const clubArgs = shuffle(weak).slice(0, 3);
    while (clubArgs.length < 3) clubArgs.push(pick(ARB_CLUB.filter((c) => !clubArgs.includes(c))));
    const arb = { kind: choice.kind, fig, stats: s, clubArgs, round: 0, score: 0, used: [], log: [] };
    pushChoiceFirst(player, arbRoundChoice(player, arb));
    news.push(`${player.name}, 연봉조정 청문회 출석… 구단 ${fmtMoney(fig.club)} vs 선수 ${fmtMoney(fig.ask)}`);
    return news;
  }
  // 공방 한 라운드
  const arb = { ...choice.arb, used: [...choice.arb.used, option.id], log: [...choice.arb.log] };
  const club = arb.clubArgs[arb.round];
  let pts = ARB_ARGS[option.id].power(arb.stats);
  if (option.id === club.counter) pts += 0.6; // 정확히 받아침
  if (pts < 0.7) pts -= 0.3; // 근거가 약하면 역공당함
  arb.score += pts;
  arb.log.push(pts >= 1.3 ? "조정위원들이 고개를 끄덕임" : pts >= 0.8 ? "팽팽" : "구단 변호인이 바로 반박함");
  news.push(`청문회 ${arb.round + 1}라운드: ${ARB_ARGS[option.id].label.replace(/^\S+ /, "")} → ${arb.log[arb.log.length - 1]}`);
  arb.round++;
  if (arb.round < 3) {
    pushChoiceFirst(player, arbRoundChoice(player, arb));
    return news;
  }
  // 판정
  const base = arb.kind === "kbo" ? 0.18 : 0.45;
  const p = clamp(base + (arb.score - 3) * 0.17 + (agentStyle(player) === "data" ? 0.06 : 0), 0.04, 0.9);
  const win = Math.random() < p;
  player.contract.salary = win ? arb.fig.ask : arb.fig.club;
  player.morale = clamp((player.morale || 0) - 1, -10, 10); // 청문회에서 단점 들은 건 남음
  player.arbHearings = (player.arbHearings || 0) + 1;
  if (win) {
    player.arbWins = (player.arbWins || 0) + 1;
    changeFame(player, 3);
    news.push(
      arb.kind === "kbo"
        ? `[이변] ${player.name}, KBO 연봉조정 청문회 승리! 연봉 ${fmtMoney(arb.fig.ask)}… "역대 손에 꼽는 선수 승리"`
        : `${player.name}, 연봉조정 청문회 승리… 요구액 ${fmtMoney(arb.fig.ask)} 그대로`,
    );
  } else {
    news.push(`${player.name}, 연봉조정 청문회 패배… 구단 제시액 ${fmtMoney(arb.fig.club)}`);
  }
  player.arbMoment = {
    tone: win ? "gold" : "bad",
    kicker: "연봉조정 청문회 판정",
    title: win ? "⚖️ 선수 승리!" : "⚖️ 구단 승리",
    lines: [`구단 ${fmtMoney(arb.fig.club)} vs 선수 ${fmtMoney(arb.fig.ask)}`, ...arb.log.map((l, i) => `${i + 1}라운드: ${l}`)],
  };
  player.lastArb = win ? "win" : "lose";
  return news;
}

ACHIEVEMENTS.push(
  { id: "arbWin", group: "커리어", name: "숫자로 이긴 남자", desc: "연봉조정 청문회 승리", check: (p) => (p.arbWins || 0) >= 1 },
  { id: "optOut", group: "커리어", name: "판을 다시 깐다", desc: "옵트아웃 행사", check: (p) => !!p.optedOut },
);

Object.assign(FAN, {
  arbWin: ["청문회 이긴 거 실화냐 ㄷㄷ", "구단 자료 털렸네 ㅋㅋ", "숫자 앞에 장사 없다", "연봉 깎으려다 역관광"],
  arbLose: ["구단이 단점 줄줄이 읊었다던데 기분 좋겠냐", "청문회는 원래 구단이 이김", "내년에 보여주면 됨", "섭섭하겠다 ㄹㅇ"],
  arbSettle: ["깔끔하게 합의 굿", "청문회 안 가서 다행", "서로 한 발씩 양보했네"],
  optOut: ["옵트아웃 ㄷㄷ 자신감 미쳤다", "더 큰 계약 노린다 이거지", "남은 돈 버리고 나가는 배짱", "시장에서 얼마 받나 보자"],
  promiseOk: ["약속은 지켜야지", "감독이 한발 물러섰네", "자리 찾았다 이제 보여줘라"],
  promiseBad: ["구단이 약속 안 지킨 거면 문제지", "실력으로 보여주면 됨", "감독이랑 틀어진 거 아님?", "분위기 안 좋다…"],
});

// 연봉조정 판정은 큰 화면으로 (main.js choiceBigMoments 앞에서 꺼냄)
function takeArbMoment(player) {
  const m = player.arbMoment;
  player.arbMoment = null;
  return m ? [m] : [];
}

// =============================================
// fa.js : FA 협상 테이블
// 팀 사정(부족한 자리) + 더 기다리기 + 직접 협상
// FA 제안 금액 계산은 core/money.js, 자격 규정은 core/rules.js, 에이전트는 agent.js
// =============================================

// 비시즌마다 팀별로 부족한 자리가 생김 (35% 팀이 하나씩)
function teamNeeds(player) {
  if (player.needsSeason !== player.season || !player.needs) {
    player.needsSeason = player.season;
    player.needs = {};
    for (const team of [...TEAMS.KBO, ...TEAMS.NPB, ...TEAMS.MLB]) {
      if (Math.random() < 0.35) player.needs[team] = pick(TEAM_NEEDS).id;
    }
  }
  return player.needs;
}

function needFor(player, team) {
  const id = teamNeeds(player)[team];
  const need = TEAM_NEEDS.find((n) => n.id === id);
  return need && need.match(player.position, player.type) ? need : null;
}

// 내 포지션이 급한 팀은 금액·기간을 더 줌. 안 불렀던 KBO 팀도 달려듦
function applyNeeds(player, offers) {
  for (const o of offers) {
    const need = needFor(player, o.team);
    if (!need || o.mega) continue;
    o.need = need.label;
    boostOffer(o, 1.15 + Math.random() * 0.1, player.age <= 33 ? 1 : 0);
  }
  const ovr = getOvrs(player).best;
  const isKboFa = player.league === "KBO" || player.league === "KBO2";
  if (isKboFa && ovr >= LEAGUES.KBO.level - 6) {
    const extra = TEAMS.KBO.filter((t) => !offers.some((o) => o.team === t) && needFor(player, t)).slice(0, 2);
    for (const team of extra) {
      const o = makeOffer(player, "KBO", team, 1.2 + Math.random() * 0.1);
      o.need = needFor(player, team).label;
      offers.push(o);
    }
  }
  return offers.sort((a, b) => b.total - a.total).slice(0, 7);
}

function boostOffer(o, factor, addYears) {
  o.years = Math.min(o.years + (addYears || 0), o.mega ? 12 : 6);
  o.salary = Math.round(o.salary * factor);
  o.bonus = Math.round(o.bonus * factor);
  o.total = o.salary * o.years + o.bonus;
}

function offerLabel(player, o) {
  const back = o.league === "KBO" && ["MLB", "NPB", "MILB"].includes(player.league) && player.age >= 31;
  return `${back ? "🏠 " : ""}${o.team} (${LEAGUES[o.league].name})`;
}

function offerDetail(player, o) {
  const back = o.league === "KBO" && ["MLB", "NPB", "MILB"].includes(player.league) && player.age >= 31;
  return `${faPathTags(o)}${o.agentFound ? "🕴️ 에이전트가 물어온 제안 · " : ""}${o.need ? `🔥 ${o.need} 급구 · ` : ""}${back ? "KBO 복귀 · " : ""}${o.mega ? "💰 메가 계약 · " : ""}${o.veteran ? (o.years === 2 ? "1+1년 (베테랑 단기 계약) · " : "1년 단기 계약 · ") : ""}${o.years}년 총액 ${fmtMoney(o.total)}${o.bonus ? ` · 계약금 ${fmtMoney(o.bonus)}` : ""} · 연봉 ${fmtMoney(o.salary)}${o.change ? ` · ${o.change}` : ""}${clauseTags(o)}`; // 조항·역할 (contract.js)
}

// 협상 가능한 팀: 원소속팀, 내 자리가 급한 팀
function negotiable(player, o) {
  if (agentNegotiable(player, o)) return true; // 에이전트 있으면 모든 구단과 협상 (agent.js)
  return !o.negotiated && !o.mega && (o.team === player.team || !!o.need);
}

// 협상 테이블 버튼 (FA 선택지 아래에 붙음)
function faTableOptions(player, offers, table) {
  const opts = [];
  if (table.waits < 2)
    opts.push({ id: "wait", label: "⏳ 시장 더 지켜보기", detail: `제안이 오를 수도, 다른 FA를 잡고 빠질 수도 있어요 · 남은 기회 ${2 - table.waits}번` });
  if (offers.some((o) => negotiable(player, o)))
    opts.push({
      id: "negotiate",
      label: "🤝 협상 테이블",
      detail: player.agent ? `${player.agent.name}가 모든 구단과 조건 담판` : "원소속팀이나 나를 꼭 원하는 팀과 직접 조건 담판",
    });
  return opts;
}

// 기다리기: 시장 상황 따라 오르거나 내리거나 사라짐
function waitMarket(player, offers) {
  const war = recentWar(player);
  const trend = (war >= 4 ? 0.05 : war < 1.5 ? -0.06 : 0) - (player.age >= 33 ? 0.04 : 0);
  const lines = [];
  const next = [];
  for (const o of offers) {
    const r = Math.random();
    if (!o.need && o.team !== player.team && r < agentWithdraw(player)) {
      // 에이전트 있으면 덜 빠짐
      lines.push(`${o.team}, 다른 FA와 계약하며 철수`);
      continue;
    }
    const f = clamp(1 + trend + gauss() * 0.04 + (o.need ? 0.06 : 0), 0.8, 1.25);
    const n = { ...o, change: f >= 1.02 ? "▲ 조건 올림" : f <= 0.98 ? "▼ 조건 내림" : "" };
    boostOffer(n, f, 0);
    if (Math.abs(f - 1) >= 0.05) lines.push(`${o.team} ${f > 1 ? "제안 올림" : "제안 깎음"} (${f > 1 ? "+" : ""}${Math.round((f - 1) * 100)}%)`);
    next.push(n);
  }
  // 늦게 뛰어드는 팀
  const isKboFa = player.league === "KBO" || player.league === "KBO2";
  if (isKboFa && Math.random() < 0.35) {
    const late = TEAMS.KBO.filter((t) => !next.some((o) => o.team === t) && needFor(player, t));
    if (late.length) {
      const team = pick(late);
      const o = makeOffer(player, "KBO", team, 1.1 + Math.random() * 0.2);
      o.need = needFor(player, team).label;
      o.change = "🆕 새로 뛰어듦";
      next.push(o);
      lines.push(`${team}, 뒤늦게 영입전 참전!`);
    }
  }
  if (!next.length) {
    next.push(coldOffer(player, offers));
    lines.push("FA 시장, 차갑게 식었다");
  }
  return { offers: next.sort((a, b) => b.total - a.total), lines };
}

// 제안이 하나도 안 남으면: 마지막 제안을 깎아서 다시 받거나, 새로 하나 받음 (85%)
function coldOffer(player, offers) {
  const base = offers.length ? offers[offers.length - 1] : generateOffers(player)[0];
  const n = { ...base, change: "▼ 시장이 식음" };
  boostOffer(n, 0.85, 0);
  return n;
}

// 직접 협상 성공 확률: 급한 팀일수록, 원소속팀 프랜차이즈면, 인기 많을수록
function negoChance(player, o) {
  let c = 0.4 + (o.need ? 0.2 : 0) + (o.team === player.team && isFranchiseHere(player) ? 0.15 : 0);
  c += (player.fame || 0) / 250 + (recentWar(player) - 2.5) * 0.04;
  c += agentNegoBonus(player); // 에이전트 협상력
  c += fanNegoBonus(player, o.team); // 원소속팀 팬심 (fandom.js)
  return clamp(c, 0.15, 0.85);
}

function faNegoChoice(player, choice) {
  const offers = choice.options.filter((x) => x.offer).map((x) => x.offer);
  return {
    key: "faNego",
    reason: choice.reason,
    table: choice.table,
    offers,
    text: "🤝 협상 테이블. 어느 팀과 담판 지을까요? 욕심내면 판이 깨질 수도 있어요.",
    options: [
      ...offers
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => negotiable(player, o))
        .map(({ o, i }) => ({
          id: `nego${i}`,
          label: `${o.team}에 조건 올려 달라고 하기`,
          detail: `${o.need ? `${o.need} 급구 · ` : o.team === player.team ? "원소속팀 · " : ""}성공 가능성 ${chanceLabel(negoChance(player, o))}`,
        })),
      { id: "back", label: "협상 안 하고 돌아가기" },
    ],
  };
}

// FA 선택지 (money.js faChoice가 이걸 씀)
function buildFaChoice(player, reason, offers, table) {
  markFaPaths(player, offers); // 💰 최고액 / 🏆 우승 전력 / 🏠 고향 팀 (dilemma.js)
  for (const o of offers) attachClauses(player, o); // 옵트아웃·거부권·인센티브·역할 (contract.js)
  const options = offers.map((o, i) => ({ id: `offer${i}`, label: offerLabel(player, o), detail: offerDetail(player, o), offer: o }));
  if (player.league === "KBO" || player.league === "KBO2") {
    options.push({ id: "nofile", label: "FA 신청 안 하고 잔류", detail: "원소속팀과 1년 연봉 계약 · FA 자격은 유지돼요" });
  }
  options.push(...faTableOptions(player, offers, table));
  if (player.age >= 33) options.push({ id: "retire", label: "여기서 은퇴한다" });
  const needs = offers.filter((o) => o.need);
  const head =
    needs.length && !table.waits && !table.negos ? `🔥 ${[...new Set(needs.map((o) => o.need))].join("·")}이(가) 급한 팀이 적극적으로 나섰어요. ` : "";
  return { key: "fa", text: head + reason, reason, table, options };
}

// resolveChoice에서 부름: 기다리기, 협상
function resolveFaTable(player, choice, id) {
  const offers = choice.options.filter((x) => x.offer).map((x) => x.offer);
  const table = { ...(choice.table || { waits: 0, negos: 0 }) };
  if (id === "wait") {
    table.waits++;
    const { offers: next, lines } = waitMarket(player, offers);
    const text = `⏳ 시장을 ${table.waits}주 더 지켜봤어요. ${lines.slice(0, 3).join(" / ")}`;
    pushChoiceFirst(player, buildFaChoice(player, text, next, table));
    return [`${player.name}, FA 시장 장기전… "서두르지 않겠다"`, ...lines.slice(0, 2)];
  }
  pushChoiceFirst(player, faNegoChoice(player, { ...choice, table }));
  return [`${player.name} 측, 구단들과 협상 테이블 차렸다`];
}

function resolveFaNego(player, choice, option) {
  const offers = choice.offers.map((o) => ({ ...o }));
  const table = { ...choice.table, negos: (choice.table.negos || 0) + 1 };
  if (option.id === "back") {
    pushChoiceFirst(player, buildFaChoice(player, choice.reason, offers, table));
    return [];
  }
  const i = Number(option.id.replace("nego", ""));
  const o = offers[i];
  o.negotiated = true;
  let line;
  if (Math.random() < negoChance(player, o)) {
    boostOffer(o, 1.1 + Math.random() * 0.1, o.need && o.years < 6 && player.age <= 34 ? 1 : 0);
    o.change = "🤝 협상 성공";
    player.negoWin = true;
    line = `${o.team}, ${player.name} 요구 수용! 조건 올렸다 (${o.years}년 ${fmtMoney(o.total)})`;
  } else if (Math.random() < 0.3 && o.team !== player.team) {
    offers.splice(i, 1);
    if (!offers.length) offers.push(coldOffer(player, [o]));
    line = `${o.team}, "이 이상은 어렵다" 협상 결렬… 제안 철회`;
  } else {
    o.change = "협상 결렬 (조건 그대로)";
    line = `${o.team}, "이게 최선" 버티기`;
  }
  pushChoiceFirst(player, buildFaChoice(player, `🤝 ${line}`, offers, table));
  return [line];
}

// FA로 번 돈 (은퇴 화면용)
function recordFaDeal(player, o) {
  player.faEarned = (player.faEarned || 0) + o.total;
  player.faDeals = (player.faDeals || 0) + 1;
  memeFaSigned(player, o); // 먹튀 감시 (meme.js)
}

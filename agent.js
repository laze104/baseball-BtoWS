// =============================================
// agent.js : v16 FA 에이전트
// - FA 대박 예감 선수한테 에이전시가 먼저 찾아옴
// - 국내 에이전시: 수수료 3%, 조건 조금 올려줌
// - 대형 에이전시: 수수료 5% (KBO 공인 에이전트 수수료 상한 5% 참고), 조건 크게 올리고 해외 구단 연결
// - 수수료는 에이전트가 맺은 계약의 계약금·연봉에서 떼감
// - 이름은 가상 회사임. 바꾸려면 AGENCIES만 고치면 됨
// =============================================

const AGENCIES = {
  local: {
    id: "local", name: "한빛 스포츠 매니지먼트", boss: "한정훈 대표", rate: 0.03,
    boost: [1.04, 1.08], nego: 0.12, withdraw: 0.15,
    pitch: "\"구단들 사정은 제가 제일 잘 압니다. 원소속팀이랑도 얼굴 붉히지 않게 정리해 드릴게요.\"",
    desc: "수수료 3% · 제안 +4~8% · 모든 구단과 협상 가능 · 협상 성공률 조금 ↑",
  },
  big: {
    id: "big", name: "스톤 스포츠 그룹", boss: "마크 스톤 대표", rate: 0.05,
    boost: [1.08, 1.15], nego: 0.22, withdraw: 0.1, mega: true,
    pitch: "\"시장 최고 대우가 아니면 사인하지 마세요. 메이저리그 구단들 전화번호는 제가 다 갖고 있습니다.\"",
    desc: "수수료 5% · 제안 +8~15% · 해외 구단 연결 · 메가 계약도 협상 · 협상 성공률 크게 ↑",
  },
};

// FA 대박 예감: 최근 성적 압도적이거나, 해외에서 주목하거나, 몸값이 큼
function faBigShot(player) {
  if (player.age > 34) return false;
  if (overseasBuzz(player)) return true;
  if (recentWar(player) >= 4) return true;
  if (player.league === "MLB" && recentWar(player) >= 3) return true;
  return marketValue(player, "KBO") >= 150000 * priceIndex(player); // 연 15억 이상
}

// 해외 갈 만한 선수인지 (대형 에이전시가 관심 가짐)
function overseasTalent(player) {
  return ["MLB", "NPB"].includes(player.league) || getOvrs(player).best >= 66 || !!overseasBuzz(player);
}

// money.js faChoice 맨 앞에서 부름: 에이전트 영입 제안을 먼저 보여줌
function agentPitch(player, reason) {
  if (player.agent || player.agentAsked === player.season || !faBigShot(player)) return null;
  player.agentAsked = player.season;
  const opts = [];
  const big = overseasTalent(player);
  const show = big ? [AGENCIES.big, AGENCIES.local] : [AGENCIES.local];
  for (const a of show) opts.push({ id: a.id, label: `🕴️ ${a.name}와 계약`, detail: a.desc });
  opts.push({ id: "self", label: "혼자 협상한다", detail: "수수료 없음 · 지금처럼 원소속팀·급한 팀과만 직접 협상" });
  const lead = big ? AGENCIES.big : AGENCIES.local;
  return {
    key: "agent",
    reason,
    text: `🕴️ FA 대박 예감! 계약 소식이 돌자 ${lead.name} ${lead.boss}가 찾아왔어요. ${lead.pitch}`,
    options: opts,
  };
}

function resolveAgent(player, choice, option) {
  const news = [];
  if (option.id !== "self") {
    const a = AGENCIES[option.id];
    player.agent = { id: a.id, name: a.name, boss: a.boss, rate: a.rate, since: gameYear(player) };
    news.push(`${player.name}, ${a.name}와 에이전트 계약… FA 시장 '큰손' 등장`);
  } else {
    news.push(`${player.name}, 에이전트 없이 FA 협상 "직접 하겠다"`);
  }
  pushChoiceFirst(player, faChoice(player, choice.reason)); // 이번엔 에이전트 질문 없이 FA 제안
  return news;
}

function agentOf(player) {
  return player.agent ? AGENCIES[player.agent.id] : null;
}

// 에이전트가 있으면 제안을 올리고, 구단 하나를 더 데려옴
function agentBoost(player, offers) {
  const a = agentOf(player);
  if (!a) return offers;
  for (const o of offers) {
    if (o.mega && !a.mega) continue;
    boostOffer(o, a.boost[0] + Math.random() * (a.boost[1] - a.boost[0]), 0);
    o.agent = true;
  }
  const ovr = getOvrs(player).best;
  if (a.id === "big") {
    // 해외 구단 연결: MLB 제안이 없으면 하나 물어옴 (실력이 좀 모자라도)
    if (!offers.some((o) => o.league === "MLB") && (ovr >= 64 || overseasBuzz(player))) {
      const o = makeOffer(player, "MLB", pick(TEAMS.MLB.filter((t) => t !== player.team)), 0.95);
      o.agentFound = true;
      offers.push(o);
    }
    // 메가 계약 문턱을 조금 낮춤 (MLB에서 WAR 4.5 이상, 만 31세 이하)
    const mlbLv = LEAGUES.MLB.level;
    if (!offers.some((o) => o.mega) && player.league === "MLB" && player.age <= 31 && recentWar(player) >= 4.5 && ovr >= mlbLv + 3) {
      const years = clamp(11 - Math.max(0, player.age - 26), 7, 11);
      const salary = Math.round(Math.min(6000000 * priceIndex(player), marketValue(player, "MLB") * 1.1));
      offers.push({ league: "MLB", team: pick(RICH_TEAMS.filter((t) => t !== player.team)), years, total: salary * years, bonus: 0, salary, mega: true, agentFound: true });
    }
  } else if ((player.league === "KBO" || player.league === "KBO2") && offers.filter((o) => o.league === "KBO").length < 3) {
    const team = pick(TEAMS.KBO.filter((t) => !offers.some((o) => o.team === t)));
    if (team) {
      const o = makeOffer(player, "KBO", team, 1.05);
      o.agentFound = true;
      offers.push(o);
    }
  }
  return offers.sort((x, y) => y.total - x.total).slice(0, 7);
}

function agentLine(player) {
  const a = agentOf(player);
  return a ? `🕴️ ${a.name} ${a.boss}가 협상 중이에요 (수수료 ${Math.round(a.rate * 100)}%). ` : "";
}

// 협상 가능한 구단: 에이전트 있으면 전부 (메가 계약은 대형 에이전시만)
function agentNegotiable(player, o) {
  const a = agentOf(player);
  return !!a && !o.negotiated && (!o.mega || a.mega);
}

function agentNegoBonus(player) {
  const a = agentOf(player);
  return a ? a.nego : 0;
}

function agentWithdraw(player) {
  const a = agentOf(player);
  return a ? a.withdraw : 0.22;
}

// 수수료: 계약할 때 계약서에 적어 두고, 돈 들어올 때마다 뗌
function agentRate(player) {
  return player.agent ? player.agent.rate : 0;
}

function payAgent(player, amount, rate) {
  if (!rate) return amount;
  const fee = Math.round(amount * rate);
  player.agentFees = (player.agentFees || 0) + fee;
  return amount - fee;
}

// 재산 탭
function agentHtml(player) {
  if (!player.agent) return "";
  const c = player.contract;
  return `<p class="small">🕴️ 에이전트: ${player.agent.name} (${player.agent.boss}) · 수수료 ${Math.round(player.agent.rate * 100)}%${c && c.agentRate ? " · 지금 계약에 적용 중" : ""} · 지금까지 낸 수수료 ${fmtMoney(player.agentFees || 0)} <button class="secondary small-btn" data-fire-agent="1">계약 해지</button></p>`;
}

// =============================================
// extension.js : 비FA 다년계약·연장 계약 (4구간 시즌, 전반기 끝)
// KBO: FA까지 1~3시즌 남은 잘하는 선수한테 구단이 먼저 다년계약 제안 (FA 시장 가기 전에 묶어 둠)
// MLB: 서비스타임 2~5년 선수 연장 / NPB: 외국인 선수 다년 재계약
// 지금 도장 (안정) / FA까지 기다림 (내 몸값에 베팅) / 에이전트가 더 올려 달라 (반반)
// =============================================

function extensionCheck(player, ctx) {
  const lg = player.league;
  if (!["KBO", "MLB", "NPB"].includes(lg) || player.age > 32) return false;
  if (player.extOfferYear && gameYear(player) - player.extOfferYear < 2) return false;
  if ((ctx.inj && ctx.inj.left > 0) || ctx.down || ctx.slump) return false;
  const c = player.contract;
  if (!c) return false;
  if (lg === "KBO") {
    const left = seasonsToFa(player);
    if (c.isFA || left < 1 || left > 3) return false;
  } else if (lg === "MLB") {
    const sv = player.mlbService || 0;
    if (sv < 2 || sv > 5 || c.years > 1) return false;
  } else if (c.years > 1) return false;
  const pace = ctx.report.WAR * 2;
  const good = pace >= 3 || (pace >= 2 && recentWar(player) >= 3);
  if (!good || Math.random() >= (isFranchiseHere(player) ? 0.6 : 0.35)) return false;
  const offer = extensionOffer(player);
  player.extOfferYear = gameYear(player);
  const what = lg === "KBO" ? "비FA 다년계약" : lg === "MLB" ? "연장 계약" : "다년 재계약";
  const faNote =
    lg === "KBO"
      ? `FA까지 1군 ${seasonsToFa(player)}시즌 남았어요. 지금 도장 찍으면 FA 대박은 없지만 다쳐도 돈은 보장돼요.`
      : lg === "MLB"
        ? `FA까지 서비스타임 ${6 - (player.mlbService || 0)}년. 연봉조정 몇 해를 건너뛰고 한 번에 받는 거예요.`
        : "외국인 선수라 1년짜리 재계약이 보통인데, 다년을 준다는 건 큰 신뢰예요.";
  pushChoice(player, {
    key: "extension",
    mailFrom: `${player.team} 단장실`,
    mailSubject: `[대외비] ${what} 제안`,
    offer,
    text: `✍️ ${player.team}${josaOf(player.team, "이")} 전반기 활약을 보고 먼저 ${what}${josaOf(what, "을")} 내밀었어요.<br><b>올해 포함 ${offer.years}년 총액 ${fmtMoney(offer.total)}</b>${offer.bonus ? ` (계약금 ${fmtMoney(offer.bonus)})` : ""}<br>${faNote}`,
    options: [
      { id: "sign", label: "도장 찍는다", detail: "안정 · 팀 팬심 ↑ · 프랜차이즈 쪽으로 한 걸음" },
      { id: "wait", label: "FA까지 기다리겠다 (내 몸값에 베팅)", detail: "지금 계약 그대로 · 잘하면 FA 때 더 받음, 다치면 끝" },
      { id: "push", label: "에이전트: 조금만 더 올려 달라", detail: "반반 · 통하면 더 받고, 안 되면 구단이 제안 철회" },
    ],
  });
  return true;
}

// 제안 금액: 시장가에서 할인 (안정을 사는 값)
function extensionOffer(player) {
  const lg = player.league;
  const years = lg === "KBO" ? randomInt(4, 6) : lg === "MLB" ? randomInt(5, 8) : randomInt(2, 3);
  const disc = lg === "MLB" ? 0.7 + Math.random() * 0.1 : 0.78 + Math.random() * 0.1;
  const annual = marketValue(player, lg) * disc;
  const total = Math.round(annual * years);
  const bonus = lg === "MLB" ? 0 : Math.round(total * (0.2 + Math.random() * 0.1));
  return { league: lg, team: player.team, years, total, bonus };
}

function signExtension(player, o) {
  const rate = agentRate(player); // agent.js
  player.contract = { ...makeContract(o.league, o.team, o.years, o.total, o.bonus), isFA: true, ext: true, agentRate: rate };
  addMoney(player, payAgent(player, o.bonus, rate));
  player.extSigned = (player.extSigned || 0) + 1;
  changeTeamFans(player, player.team, 4);
  recordFaDeal(player, o); // 커리어 총액 (extra.js)
}

function resolveExtension(player, choice, option) {
  const o = choice.offer;
  const id = option.id;
  player.lastExt = id;
  const what = o.league === "KBO" ? "비FA 다년계약" : "연장 계약";
  if (id === "sign") {
    signExtension(player, o);
    return [`[오피셜] ${player.name}, ${player.team}${josaOf(player.team, "과")} ${o.years}년 총액 ${fmtMoney(o.total)} ${what}`];
  }
  if (id === "wait") {
    player.betOnSelf = gameYear(player);
    return [`${player.name}, ${player.team} ${what} 제안 고사… "FA 시장에서 평가받겠다"`];
  }
  if (Math.random() < 0.5) {
    const up = { ...o, total: Math.round(o.total * 1.12), bonus: Math.round(o.bonus * 1.12) };
    signExtension(player, up);
    player.lastExt = "pushOk";
    return [`[오피셜] ${player.name}, 줄다리기 끝에 ${up.years}년 총액 ${fmtMoney(up.total)} ${what}… 처음 제안보다 12% 올라`];
  }
  player.lastExt = "pushFail";
  changeTeamFans(player, player.team, -2);
  return [`${player.name}·${player.team} ${what} 협상 결렬… 구단 "시즌 뒤 다시 얘기하자"`];
}

Object.assign(MAIL_SENDERS, {
  extension: { from: "단장실", icon: "✍️", subject: "다년계약 제안" },
});

Object.assign(FAN, {
  extSign: ["종신 가자!!", "구단 일 잘한다 ㅠㅠ", "이 돈이면 개이득 계약", "프랜차이즈 스타 예약"],
  extWait: ["FA 대박 노리는구나", "솔직히 맞는 선택일 수도", "떠날 각 재는 거 아니냐", "다치면 어쩌려고 ㄷㄷ"],
  extPushOk: ["에이전트 일 잘하네 ㅋㅋ", "몸값 제대로 받았다", "구단이 한발 물러섰네"],
  extPushFail: ["욕심부리다 결렬 ㅋㅋ", "에이전트가 문제다", "FA 때 보자"],
});

function extensionPool(player) {
  return { sign: FAN.extSign, wait: FAN.extWait, pushOk: FAN.extPushOk, pushFail: FAN.extPushFail }[player.lastExt];
}

ACHIEVEMENTS.push({ id: "extension", group: "커리어", name: "미리 묶어 둔 선수", desc: "비FA 다년계약·연장 계약", check: (p) => (p.extSigned || 0) >= 1 });

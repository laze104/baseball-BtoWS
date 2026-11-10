// =============================================
// fandom.js : 팀별 팬심, 여론이 실제 힘을 가짐
// 전체 여론(player.fame)이랑 팀 팬심(player.teamFans[팀])은 따로 돎
// 팀 팬심이 연봉 협상, 감독 신뢰, 트레이드 확률, 올스타 투표, FA 원소속팀 의지에 들어감
// 라이벌 팀으로 FA 가면 원소속 팬심 폭락 + 친정 방문 경기 야유
// =============================================

// 라이벌 구단 (게임 설정, 서로 짝)
const RIVAL_TEAMS = {
  "LG 트윈스": "두산 베어스",
  "두산 베어스": "LG 트윈스",
  "롯데 자이언츠": "NC 다이노스",
  "NC 다이노스": "롯데 자이언츠",
  "KIA 타이거즈": "삼성 라이온즈",
  "삼성 라이온즈": "KIA 타이거즈",
  "요미우리 자이언츠": "한신 타이거스",
  "한신 타이거스": "요미우리 자이언츠",
  "뉴욕 양키스": "보스턴 레드삭스",
  "보스턴 레드삭스": "뉴욕 양키스",
  "LA 다저스": "샌프란시스코 자이언츠",
  "샌프란시스코 자이언츠": "LA 다저스",
};

const FAN_LEAGUES = ["KBO", "KBO2", "NPB", "MLB"];

function teamFanOf(player, team) {
  return (player.teamFans || {})[team] || 0;
}

const NO_FAN_TEAMS = ["사회복무요원", "상무 피닉스"]; // 군 복무 중 소속

function changeTeamFans(player, team, amount) {
  if (!team || NO_FAN_TEAMS.includes(team)) return;
  if (!player.teamFans) player.teamFans = {};
  player.teamFans[team] = clamp(Math.round(teamFanOf(player, team) + amount), -100, 100);
}

function teamFanLabel(v) {
  if (v >= 60) return "우리 팀의 심장";
  if (v >= 30) return "든든한 우리 편";
  if (v >= 0) return "지켜보는 중";
  if (v >= -30) return "불만 쌓이는 중";
  return "등 돌림";
}

// ---------- 다른 시스템에 들어가는 값 ----------

// 트레이드 확률 배수 (extra.js maybeMidTrade·maybeAfterTrade)
function fanTradeMul(player) {
  const f = teamFanOf(player, player.team);
  if (f >= 40) return 0.5; // 팬들이 들고 일어나서 못 보냄
  if (f >= 20) return 0.75;
  if (f <= -30) return 1.6; // 팬들도 보내라는 분위기
  return 1;
}

// 감독 면담 점수 (world.js managerScore)
function fanManagerBonus(player) {
  return clamp(teamFanOf(player, player.team) / 40, -1, 1);
}

// FA 협상 성공 확률 (extra.js negoChance) : 원소속팀 팬심이 높으면 구단도 더 맞춰 줌
function fanNegoBonus(player, team) {
  return team === player.team ? clamp(teamFanOf(player, team) / 300, -0.1, 0.2) : 0;
}

// FA 원소속팀 제안 금액 배수 (money.js generateOffers)
function fanStayFactor(player) {
  return 1 + clamp(teamFanOf(player, player.team) / 400, -0.1, 0.25);
}

// 올스타 팬 투표 (world.js allStar)
function fanVoteBonus(player, team) {
  return clamp(teamFanOf(player, team) / 50, -0.5, 1.5);
}

// ---------- 시즌마다 ----------
function fandomSeason(player, report) {
  if (!FAN_LEAGUES.includes(report.league) || NO_FAN_TEAMS.includes(report.team)) {
    fandomMove(player, report);
    return;
  } // 아마추어·군 복무·독립리그는 팬심 없음
  const team = report.team;
  // 성적 → 팀 팬심
  let d = clamp(report.WAR * 2, -4, 10);
  if (report.WAR < 0) d -= 3;
  if (isFranchiseHere(player)) d += 2;
  if (report.awards.some((a) => a.includes("시리즈 우승"))) d += 12;
  changeTeamFans(player, team, d);
  // 오래 있으면 정이 듦, 안 보이면 조금씩 잊음
  for (const t of Object.keys(player.teamFans || {})) {
    if (t !== team && teamFanOf(player, t) > 0) changeTeamFans(player, t, -2);
    if (t !== team && teamFanOf(player, t) < -10) changeTeamFans(player, t, 3); // 미움도 조금씩 옅어짐
  }
  booGame(player, report);
  fandomMove(player, report);
}

// 팀 옮겼으면 (시즌 끝 / 선택지 고른 뒤 둘 다 부름)
function fandomMove(player, report) {
  // 군 복무(상무·사회복무)·독립리그에 있는 동안엔 원래 팀을 기억함
  if (!FAN_LEAGUES.includes(player.league) || isServing(player)) return [];
  if (!player.fanTeam) {
    player.fanTeam = player.team;
    return [];
  }
  if (player.fanTeam === player.team) return [];
  const from = player.fanTeam;
  const to = player.team;
  player.fanTeam = to;
  const news = [];
  if (!TEAMS.KBO.concat(TEAMS.NPB, TEAMS.MLB).includes(from)) return news;
  const trade = player.moveKind === "trade";
  player.moveKind = null;
  const leagueOf = (tm) => ["KBO", "NPB", "MLB"].find((lg) => TEAMS[lg].includes(tm));
  const overseas = leagueOf(from) !== leagueOf(to); // 리그가 바뀌었으면 해외 진출·복귀
  const fans = teamFanOf(player, from);
  let drop;
  if (trade) {
    drop = -3; // 트레이드는 본인 탓이 아니라서 아쉬움 정도
    news.push(`${from} 팬들 "${player.name} 보내는 거 실화냐"… 구단 성토`);
  } else if (overseas) {
    drop = fans > 0 ? 5 : 0; // 해외 진출은 응원
    news.push(`${from} 팬들, ${player.name} 해외 진출에 "가서 보여줘라"`);
  } else if (RIVAL_TEAMS[from] === to) {
    drop = -(Math.max(0, fans) + 55); // 쌓인 정만큼 더 미워함
    player.booFrom = { team: from, left: 3 };
    news.push(`[충격] ${player.name}, 라이벌 ${to}로… ${from} 팬들 유니폼 화형식`);
  } else {
    drop = fans >= 30 ? -(fans + 25) : -10; // 프랜차이즈급이 떠나면 서운함 폭발
    if (fans >= 30) player.booFrom = { team: from, left: 2 };
    news.push(`${from} 팬들 "${player.name}, 잘 가라"… ${fans >= 30 ? "서운함 폭발" : "담담한 반응"}`);
  }
  // 이적설에 "여기서 은퇴한다"고 했던 팀이면 배신 (sns.js)
  if (!trade && !overseas && player.loyalVow === from) {
    drop -= 20;
    player.loyalVow = null;
    news.push(`"여기서 은퇴하겠다"던 ${player.name}… ${from} 팬들 "말이나 말지"`);
    addMeme(player, "betray", { team: from });
  }
  changeTeamFans(player, from, drop);
  // 새 팀 팬은 기대 반 의심 반
  if (teamFanOf(player, to) === 0) changeTeamFans(player, to, isFranchiseHere(player) ? 10 : 5);
  if (report) report.news.push(...news);
  return news;
}

// 친정 방문 경기 야유
function booGame(player, report) {
  const b = player.booFrom;
  if (!b || b.left <= 0) return;
  if (!TEAMS[report.league] || !TEAMS[report.league].includes(b.team)) {
    b.left = 0;
    return;
  }
  b.left -= 1;
  if (teamFanOf(player, b.team) > -20) return;
  const nerve = player.type === "pitcher" ? player.stats.mental : player.stats.clutch;
  const calm = nerve >= LEAGUES[report.league].level + 10;
  report.bigMoments = report.bigMoments || [];
  if (calm) {
    changeFame(player, 2);
    changeTeamFans(player, b.team, 8);
    report.news.push(`${player.name}, 친정 ${b.team} 원정서 쏟아진 야유에도 맹활약… 끝나고 관중석에 고개 숙여 인사`);
    report.bigMoments.push({
      tone: "good",
      kicker: `친정 방문 경기 · ${b.team} 원정`,
      title: "📣 야유를 박수로",
      lines: ["첫 타석부터 야유가 쏟아졌지만 흔들리지 않았어요", "경기 끝나고 옛 팬들한테 인사하자 박수가 나왔어요 (옛 팀 팬심 +8)"],
    });
  } else {
    player.nextMod = (player.nextMod || 0) - 1;
    report.news.push(`${player.name}, 친정 ${b.team} 원정서 야유 폭탄… 4타수 무안타 침묵`);
    report.bigMoments.push({
      tone: "bad",
      kicker: `친정 방문 경기 · ${b.team} 원정`,
      title: "📣 야유 폭탄",
      lines: ["이름이 불리자마자 야유가 쏟아졌어요", "멘탈이 흔들렸어요 (다음 시즌 컨디션 -1)"],
    });
  }
  moreComments(player, report, FAN.boo, 2);
}

// 반응 탭 위쪽 팬심 패널
function fandomHtml(player) {
  const fans = player.teamFans || {};
  const teams = Object.keys(fans)
    .filter((t) => t !== player.team && fans[t] !== 0)
    .sort((a, b) => fans[b] - fans[a]);
  if (isAmateur(player.league) && !teams.length) return "";
  const me = teamFanOf(player, player.team);
  const bar = (v) =>
    `<span class="fanbar"><i style="left:50%;width:${Math.abs(v) / 2}%;${v < 0 ? "transform:translateX(-100%);background:#c0504d" : ""}"></i></span>`;
  let html = `<div class="fandom"><p class="fd-head">📣 팬심 <small>전체 여론 ${fameLabel(player.fame || 0)} (${player.fame || 0})</small></p>`;
  if (!isAmateur(player.league)) html += `<p class="fd-row mine"><span>${player.team}</span>${bar(me)}<b>${me}</b><small>${teamFanLabel(me)}</small></p>`;
  for (const t of teams.slice(0, 4)) html += `<p class="fd-row"><span>${t}</span>${bar(fans[t])}<b>${fans[t]}</b><small>${teamFanLabel(fans[t])}</small></p>`;
  const rival = RIVAL_TEAMS[player.team];
  if (rival && me >= 30) html += `<p class="small">⚔️ ${rival} 팬들한테는 공공의 적이에요. 잘할수록 더 미워해요.</p>`;
  html += `<p class="small">팀 팬심이 높으면 트레이드가 덜 되고, 연봉 협상·올스타 투표·감독 면담에 유리해요.</p></div>`;
  return html;
}

FAN.boo = [
  "야유하는 거 이해는 간다",
  "배신자한테 박수는 없다",
  "그래도 우리 팀 시절 생각하면 좀 짠하네",
  "야유 들으면서 저렇게 치면 인정이지",
  "친정 오니까 기분 어떠냐 ㅋㅋ",
  "다음 방문 때도 각오해라",
];

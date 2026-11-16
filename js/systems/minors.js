// =============================================
// minors.js : 고졸 MLB 직행과 마이너리그
// =============================================

const DOLLAR = 0.14; // 1달러 = 1,400원 = 0.14만원

function maybeMlbDirect(player, report) {
  const ovr = getOvrs(player).best;
  // 고교 최대어만 미국 구단이 직접 데려감: 능력치 60 이상 + 드래프트 점수 72 이상
  if (ovr < 60 || draftScore(player, report) < 72) return;
  const org = pick(TEAMS.MLB);
  const dollars = clamp(Math.round((ovr - 55) * 12 + (draftScore(player, report) - 72) * 5), 50, 200); // 만 달러 (실제 한국 고교 유망주: 약 50만~150만 달러)
  const bonus = Math.round(dollars * 10000 * DOLLAR * priceIndex(player));
  report.specials.push({ key: "mlbScout", team: org });
  pushChoiceFirst(player, {
    key: "mlbDirect",
    org,
    bonus,
    text: `🇺🇸 ${org} 스카우트가 직접 찾아왔어요! 졸업하자마자 미국으로 오라는 제안이에요. 마이너리그 ${MILB_AFFILIATE[org]}에서 시작해요.`,
    options: [
      { id: "go", label: `${org}와 계약 (미국 직행)`, detail: `계약금 ${fmtMoney(bonus)} · 마이너리그부터 · 실패하면 KBO 복귀까지 2년 유예` },
      { id: "stay", label: "국내에 남는다", detail: "KBO 드래프트·대학 진학 중에서 고를 수 있어요" },
    ],
  });
}

function resolveMlbDirect(player, choice, option) {
  if (option.id !== "go") return [`${player.name}, ${choice.org} 제안 거절… "한국에서 먼저 증명하겠다"`];
  // 국내 진로 선택지는 없앰
  const domestic = ["draftSign", "undrafted"];
  player.choiceQueue = player.choiceQueue.filter((c) => !domestic.includes(c.key));
  if (player.pendingChoice && domestic.includes(player.pendingChoice.key)) nextChoice(player);
  player.league = "MILB";
  player.mlbOrg = choice.org;
  player.team = MILB_AFFILIATE[choice.org];
  player.milbYears = 0;
  player.overseasAmateur = true;
  player.contract = makeContract("MILB", player.team, 1, minSalary("MILB", player), 0);
  addMoney(player, choice.bonus);
  return [`[단독] ${player.name}, ${choice.org} 입단! 계약금 ${fmtMoney(choice.bonus)}`, `${player.name}, "꿈의 무대에서 살아남겠다"… ${player.team}에서 첫발`];
}

// 마이너리그 시즌이 끝날 때
function milbTick(player, report) {
  player.milbYears = (player.milbYears || 0) + 1;
  const ovr = getOvrs(player).best;
  const mlbLevel = LEAGUES.MLB.level;
  if (ovr >= mlbLevel - 4 || (ovr >= mlbLevel - 7 && report.WAR >= 4 && Math.random() < 0.5) || callupStuck(player, report)) {
    player.league = "MLB";
    player.team = player.mlbOrg;
    player.contract = makeContract("MLB", player.team, 1, minSalary("MLB", player), 0);
    report.specials.push({ key: "mlbCallup", team: player.team });
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({
      tone: "gold",
      kicker: "THE SHOW",
      title: "⚾ 메이저리그 콜업!",
      lines: [`${player.team} 26인 로스터 합류`, `마이너리그 ${player.milbYears}시즌 만의 꿈`],
    });
    return;
  }
  if (player.age >= 25 && player.milbYears >= 4 && ovr < mlbLevel - 10) {
    report.specials.push({ key: "milbRelease", team: player.team });
    player.overseasReturn = true;
    pushChoice(player, {
      key: "undrafted",
      text: `${player.mlbOrg} 구단이 방출을 통보했어요. 해외 직행 선수는 KBO 복귀까지 2년을 기다려야 해서, 독립리그나 호주에서 버티다 드래프트에 다시 나가야 해요.`,
      options: [
        { id: "INDIE", label: "국내 독립리그에서 KBO 재도전" },
        { id: "ABL", label: "호주리그에서 감 유지" },
        { id: "retire", label: "야구를 그만둔다" },
      ],
    });
  }
}

// ---------------------------------------------
// 기사·댓글 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  mlbScout: "[단독] {team} 스카우트, 고교 졸업반 {name}에 러브콜",
  mlbCallup: "{name}, 드디어 메이저리그 콜업! {team} 데뷔 임박",
  milbRelease: "{name}, {team}에서 방출… 아메리칸 드림 일단 멈춤",
});

Object.assign(FAN, {
  mlbDirect: ["고졸 미국 직행 ㄷㄷ", "마이너는 버스 10시간 탄다던데 버텨라", "KBO 거치고 가지 아깝다", "잘되면 전설, 안되면 복귀 2년 유예… 도박이네"],
  mlbCall: ["드디어 빅리그 ㅠㅠ", "마이너 버스 생활 끝!", "메이저 데뷔전 무조건 본다", "고졸 직행 성공 사례 나오나"],
});

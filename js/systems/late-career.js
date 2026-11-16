// =============================================
// late-career.js : 커리어 말년
// 성적 좋으면 나이 상관없이 계속 뜀 (최대 만 47세). 팀이 없으면 입단 테스트로 현역 연장
// =============================================

function mustRetireNow(player, report, ovr) {
  if (player.age >= 49) return true;
  // 군 복무 시즌은 경기 기록이 없어서 성적으로 판단 안 함
  if (["SOCIAL", "SANGMU"].includes(report.league) && report.WAR <= 0) return false;
  const isPro = PRO_LEAGUES.includes(player.league);
  const kbo = LEAGUES.KBO.level;
  const futures = LEAGUES.KBO2.level;
  // 1군에서 WAR 1.5 이상이거나 OVR이 KBO 평균 이상이면 나이 상관없이 계속 뜀
  const stillGood = (TOP_LEAGUES.includes(report.league) && report.WAR >= 1.5) || ovr >= kbo;
  if (player.age >= 42 && !stillGood) return true;
  if (isPro && ovr < 45 && player.age >= 30 && report.WAR < 1) return true;
  // 독립·호주리그: 프로 2군 수준도 안 되고 성적도 별로일 때만
  if ((player.league === "INDIE" || player.league === "ABL") && player.age >= 28) {
    if (ovr < futures + 3 && report.WAR < 1.5) return true;
    if (player.age >= 36 && !stillGood) return true;
  }
  return false;
}

// 독립·호주리그에서 2군보다 확실히 잘하면 나이 많아도 육성 선수로 데려감
function indieScout(player, report) {
  if (!["INDIE", "ABL"].includes(player.league) || player.age < 26) return;
  if (getOvrs(player).best < LEAGUES.KBO2.level + 4 || Math.random() >= 0.35) return;
  const team = player.kboRights || pick(TEAMS.KBO);
  player.kboRights = null;
  player.league = "KBO2";
  player.team = team;
  player.trainee = true;
  player.contract = makeContract("KBO2", team, 1, minSalary("KBO2", player), 0);
  report.specials.push({ key: "trainee", team });
}

function forcedRetireChoice(player) {
  const ovr = getOvrs(player).best;
  const options = [{ id: "retire", label: "은퇴하기" }];
  if (player.age <= 44 && ovr >= 38 && (player.extended || 0) < 2) {
    options.push({
      id: "extend",
      label: "현역 연장 (입단 테스트)",
      detail: `테스트 통과하면 퓨처스 육성 선수, 아니면 독립리그에서 다시 · 통과 가능성 ${chanceLabel(tryoutChance(player))}`,
    });
  }
  // 입단 테스트가 안 되면 이유를 같이 보여줌
  let text = "더 이상 불러주는 팀이 없어요. 유니폼을 벗을까요, 아니면 입단 테스트라도 받아 볼까요?";
  if (options.length === 1) {
    const why =
      (player.extended || 0) >= 2
        ? "입단 테스트 기회 2번을 이미 다 썼어요"
        : player.age > 44
          ? `${koreanAge(player.age)}세라 입단 테스트를 받아 주는 팀이 없어요 (만 44세까지)`
          : `OVR ${ovr}로는 입단 테스트 자격이 안 돼요 (OVR 38 이상)`;
    text = `더 이상 불러주는 팀이 없어요. ${why}. 이제 유니폼을 벗을 시간이에요.`;
  }
  return { key: "forcedRetire", text, options };
}

function tryoutChance(player) {
  const ovr = getOvrs(player).best;
  return clamp(0.3 + (ovr - LEAGUES.KBO2.level) * 0.04, 0.1, 0.85);
}

function resolveExtend(player) {
  player.extended = (player.extended || 0) + 1;
  changeFame(player, 3);
  const pass = Math.random() < tryoutChance(player);
  if (pass) {
    const team = player.kboRights || pick(TEAMS.KBO);
    player.kboRights = null;
    player.league = "KBO2";
    player.team = team;
    player.contract = makeContract("KBO2", team, 1, minSalary("KBO2", player), 0);
    player.tryoutPassed = true;
    return [fillText(NEWS.special.extend, player, {}), `${player.name}, ${team} 입단 테스트 합격! 육성 선수로 다시 시작`];
  }
  player.league = "INDIE";
  player.team = pick(TEAMS.INDIE);
  player.contract = makeContract("INDIE", player.team, 1, minSalary("INDIE", player), 0);
  return [fillText(NEWS.special.extend, player, {}), `${player.name}, 테스트는 떨어졌지만 독립리그 ${player.team}에서 공 계속 던진다`];
}

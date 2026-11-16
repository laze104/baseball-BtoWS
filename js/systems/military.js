// =============================================
// military.js : 병역 (상무 / 사회복무 / 메달 특례)
// =============================================

const SERVICE_LEAGUES = ["SANGMU", "SOCIAL"];

function isServing(player) {
  return SERVICE_LEAGUES.includes(player.league);
}

// player.military: 없음(아직 안 감) / "done"(다녀옴) / "exempt"(면제)
//                  / { left, prev } (복무 중)

// 시즌이 끝난 뒤 입대 시기인지 확인
function checkMilitary(player, report) {
  if (player.retired || player.military || isAmateur(player.league) || isServing(player)) return;
  if (player.age < 23) return;
  const pending = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
  if (pending.some((c) => c.key === "forcedRetire" || c.key === "military")) return;
  // 해외(MLB·마이너리그)에서 뛰면 국외 체류로 입대를 계속 미룰 수 있음 (최지만 케이스)
  // 게임에서는 만 36세까지 자동으로 연기됨. 국내(KBO 등)로 돌아오면 그때 가야 함
  const abroad = ["MLB", "MILB"].includes(player.league);
  if (abroad && player.age < ABROAD_DEFER_AGE) {
    if (player.age >= 28 && !player.abroadDefer) {
      player.abroadDefer = true;
      report.events.push("입대 연기 (국외 체류)");
      report.specials.push({ key: "abroadDefer" });
    }
    return;
  }
  const mustGo = player.age >= 28;
  // FA 협상 중이면 이번엔 묻지 않음 (28세는 예외)
  if (!mustGo && pending.some((c) => c.key === "fa")) return;

  const options = [];
  const ovr = getOvrs(player).best;
  if (PRO_LEAGUES.includes(player.league) && ovr >= LEAGUES.KBO.level - 8 && player.age <= 28) {
    // 상무는 지원 나이 제한이 있음
    options.push({ id: "SANGMU", label: "상무 입대", detail: "2년간 퓨처스리그에서 경기 출전 · 군 급여만 받아요" });
  }
  options.push({ id: "SOCIAL", label: "사회복무요원", detail: "2년간 경기 없음 · 퇴근 후 개인 훈련만 (능력치 하락 위험)" });
  if (!mustGo) {
    options.push({ id: "delay", label: "입대 미루기", detail: `아시안게임 금메달·올림픽 메달이면 면제! ${koreanAge(28)}세엔 꼭 가야 해요` });
  }
  pushChoice(player, {
    key: "military",
    text: mustGo
      ? player.abroadDefer
        ? abroad
          ? `${koreanAge(player.age)}세, 국외 체류 연기도 끝났어요. 이제는 입대해야 해요.`
          : `국내로 돌아와서 국외 체류 연기가 끝났어요. ${koreanAge(player.age)}세, 이제 입대해야 해요.`
        : `${koreanAge(player.age)}세, 더는 입대를 미룰 수 없어요. 어디로 갈까요?`
      : `${koreanAge(player.age)}세, 병역 문제를 정할 때가 됐어요. 지금 다녀올까요?`,
    options,
  });
}

const ABROAD_DEFER_AGE = 37; // 만 37세가 되면 국외 체류 연기도 끝남

// 입대
function enlist(player, unit) {
  player.military = {
    left: 2,
    prev: { league: player.league, team: player.team, contract: player.contract },
  };
  player.league = unit;
  player.team = unit === "SANGMU" ? "상무 피닉스" : "사회복무요원";
  player.contract = makeContract(unit, player.team, 2, minSalary(unit, player) * 2, 0);
  if (unit === "SOCIAL" && player.nationalPlan) player.nationalPlan = null; // 대표팀 합류 무산
}

// 복무 중 한 시즌이 끝날 때
function serviceTick(player, report) {
  const m = player.military;
  m.left--;
  if (m.left > 0) return;
  player.league = m.prev.league;
  player.team = m.prev.team;
  player.contract = m.prev.contract;
  player.military = "done";
  report.specials.push({ key: "discharge", team: player.team });
}

// 아시안게임 금메달, 올림픽 메달 → 병역 특례
function grantExemption(player, report, award) {
  if (player.military === "done" || player.military === "exempt") return;
  if (player.military && player.military.left) {
    player.military.left = 1; // 복무 중이면 이번 시즌 끝나고 조기 전역
  } else {
    player.military = "exempt";
  }
  report.specials.push({ key: "exempt", award });
  report.events.push("병역 특례");
}

// 사회복무 시즌: 경기는 없고 개인 훈련만
function serviceSeason(player, focusKeys) {
  const report = {
    age: player.age,
    year: gameYear(player),
    league: player.league,
    team: player.team,
    events: ["사회복무"],
    specials: [{ key: "service" }],
    awards: [],
    bat: null,
    pit: null,
    WAR: 0,
  };
  player.nationalPlan = null;
  player.teamFocus = false;
  player.nextMod = 0;

  // 성장: 훈련한 능력치는 조금 오르고, 나머지는 떨어지기 쉬움
  const base = baseGrowth(player.age);
  const gains = {};
  for (const key of Object.keys(player.stats)) {
    let growth = focusKeys.includes(key) ? randomInt(0, 2) : Math.random() < 0.45 ? -1 : 0;
    if (base < 0) growth += base * (0.5 + Math.random());
    const before = player.stats[key];
    player.stats[key] = clamp(Math.round(before + growth), 1, 99);
    gains[key] = player.stats[key] - before;
  }
  report.gains = gains;
  player.lastFocus = focusKeys;
  rivalSeason(player, report);

  report.salary = payday(player);
  player.leagueSeasons[player.league] = (player.leagueSeasons[player.league] || 0) + 1;
  player.history.push({
    season: player.season,
    age: player.age,
    year: report.year,
    league: player.league,
    team: player.team,
    bat: null,
    pit: null,
    WAR: 0,
    awards: [],
    events: report.events.slice(),
  });

  player.age += 1;
  player.season += 1;
  moveCareer(player, report);
  callNationalTeam(player, report);
  buildFeed(player, report);
  afterSeasonStory(player, report);
  return report;
}

// ---------------------------------------------
// 기사 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  enlist: '{name}, {unit} 입대… "더 단단해져서 돌아오겠다"',
  discharge: '{name} 전역! {team} 복귀 "이제 야구만 보고 달린다"',
  exempt: "{name}, {award}로 병역 특례… 야구 인생에 날개 달았다",
  abroadDefer: "{name}, 국외 체류 연장으로 입대 연기… 국내 복귀 전까지 병역 미뤄",
  service: "{name}, 사회복무요원으로 성실히 근무 중… 퇴근 후 개인 훈련",
});

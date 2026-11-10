// =============================================
// story.js : 야구 밖의 이야기들
// 1. 병역 (상무 / 사회복무 / 메달 특례)
// 2. 라이벌 (같은 해에 태어난 경쟁자)
// 3. 별명 (커뮤니티가 붙여주는 별명)
// 4. 인터뷰·사생활과 팬 여론(fame)
// =============================================

// 이름에 pattern이 들어간 상을 몇 번 받았는지 (예: "MVP", "메달")
function countAward(player, pattern) {
  return Object.entries(player.awards || {})
    .filter(([name]) => name.includes(pattern))
    .reduce((sum, [, count]) => sum + count, 0);
}

// 새 기사 제목들
Object.assign(NEWS.special, {
  enlist: '{name}, {unit} 입대… "더 단단해져서 돌아오겠다"',
  discharge: '{name} 전역! {team} 복귀 "이제 야구만 보고 달린다"',
  exempt: "{name}, {award}로 병역 특례… 야구 인생에 날개 달았다",
  abroadDefer: "{name}, 국외 체류 연장으로 입대 연기… 국내 복귀 전까지 병역 미뤄",
  service: "{name}, 사회복무요원으로 성실히 근무 중… 퇴근 후 개인 훈련",
  nickname: "팬들이 붙여준 별명 '{nick}'… {name}의 반응은?",
  rivalWin: "동갑내기 라이벌 대결, 올해는 {name}의 판정승… {rival|은} {rivalLine}",
  rivalLose: "라이벌 {rival}, {rivalLine}… {name} 자존심 상했다",
  rivalMove: "{name}의 라이벌 {rival}, {rivalTeam} 행 확정",
  rivalRetire: "{name}의 평생 라이벌 {rival}, 은퇴 선언",
});

const SERVICE_LEAGUES = ["SANGMU", "SOCIAL"];

function isServing(player) {
  return SERVICE_LEAGUES.includes(player.league);
}

// =============================================
// 1. 병역
// player.military: 없음(아직 안 감) / "done"(다녀옴) / "exempt"(면제)
//                  / { left, prev } (복무 중)
// =============================================

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

// =============================================
// 2. 라이벌
// =============================================

function createRival(player) {
  const type = player.type === "twoway" ? pick(["batter", "pitcher"]) : player.type;
  const schools = HIGH_SCHOOLS.filter((s) => s.level >= 2 && s.name !== player.school);
  const style = pick(Object.keys(STYLES[type]));
  const rival = {
    name: pick(RIVAL_NAMES.filter((n) => n !== player.name)),
    type,
    position: pick(POSITIONS[type]),
    style,
    school: pick(schools).name,
    age: player.age,
    league: "HS",
    owned: [],
    awards: {},
    history: [],
    retired: false,
    growthType: rollGrowthType(),
  };
  rival.team = rival.school;
  // 라이벌은 처음부터 조금 더 재능 있는 선수임
  rival.stats = rollStats(type, style);
  for (const key of Object.keys(rival.stats)) rival.stats[key] = clamp(rival.stats[key] + 3, 1, 99);
  // 이미 프로에 간 예전 저장 데이터: 라이벌도 비슷한 실력으로 프로에서 시작
  if (player.age >= 19) {
    for (const key of Object.keys(rival.stats)) {
      if (player.stats[key] !== undefined) rival.stats[key] = clamp(player.stats[key] + randomInt(-5, 5), 1, 99);
    }
    rival.league = getOvrs(rival).best >= LEAGUES.KBO.level - 3 ? "KBO" : "KBO2";
    rival.team = pick(TEAMS.KBO);
  }
  rival.bestOvr = getOvrs(rival).best;
  return rival;
}

// 라이벌 기록 한 줄 요약
function rivalLine(rec, isBatter) {
  if (!rec || !rec.G) return "부상으로 시즌 아웃";
  if (isBatter) return `타율 ${fmtRate(rec.AVG)} ${rec.HR}홈런 OPS ${fmtRate(rec.OPS)}`;
  if (rec.SV >= 10) return `${rec.SV}세이브 평균자책 ${rec.ERA.toFixed(2)}`;
  return `${rec.W}승 ${rec.L}패 평균자책 ${rec.ERA.toFixed(2)}`;
}

function rivalSeason(player, report) {
  const r = player.rival;
  if (!r || r.retired) return;
  const league = LEAGUES[r.league];
  const ovr = getOvrs(r).best;
  const injured = Math.random() < 0.08 ? 0.5 : 1;
  const mod = randomInt(-4, 4);

  let rec;
  if (r.type === "batter") {
    const plan = batterPlan(r, ovr);
    rec = simBattingSeason(r.stats, league.level, Math.round(plan.games * injured), plan.pa, mod, r.position, LEAGUE_ENV[r.league]);
  } else {
    const plan = pitcherPlan(r, ovr);
    rec = simPitchingSeason(r.stats, league.level, plan.role, Math.round(plan.games * injured), mod, LEAGUE_ENV[r.league]);
  }
  const line = rivalLine(rec, r.type === "batter");

  // 라이벌 수상과 우승 (간단하게)
  const awards = [];
  if (AWARD_LINE[r.league] && rec.WAR >= AWARD_LINE[r.league].war * 0.9 && Math.random() < 0.5) awards.push(`${r.league} MVP`);
  if (CHAMPIONSHIP[r.league] && Math.random() < 0.1) awards.push(CHAMPIONSHIP[r.league]);
  for (const a of awards) r.awards[a] = (r.awards[a] || 0) + 1;

  r.history.push({ year: report.year, age: r.age, league: r.league, team: r.team, WAR: rec.WAR, line, awards });

  // 성장: 포지션 핵심 능력치 2개를 훈련함
  const keys = Object.keys(r.stats);
  const focus = pickMany(POSITION_FOCUS[r.position] || keys, 2);
  growPlayer(r, focus, { WAR: rec.WAR, events: [] });
  r.age += 1;
  r.bestOvr = Math.max(r.bestOvr, getOvrs(r).best);

  report.rival = { name: r.name, league: r.league, team: r.team, line, WAR: rec.WAR, ovr, awards };

  // 나와 비교 (나도 경기에 나갔을 때만)
  const myWar = report.WAR || 0;
  if (report.bat || report.pit) {
    const diff = myWar - rec.WAR;
    if (r.league === player.league || Math.abs(diff) >= 1.5) {
      report.specials.push({ key: diff >= 0 ? "rivalWin" : "rivalLose", rival: r.name, rivalLine: line });
    }
  }
  moveRival(player, r, report);
}

function moveRival(player, r, report) {
  const ovr = getOvrs(r).best;
  const from = r.league;
  if (r.league === "HS" && r.age >= 19) {
    if (ovr + randomInt(0, 8) >= 52) {
      r.league = "KBO2";
      r.team = pick(TEAMS.KBO);
    } else {
      r.league = "INDIE";
      r.team = pick(TEAMS.INDIE);
    }
  } else if (r.league === "INDIE") {
    if (ovr >= 50 && r.age <= 25) {
      r.league = "KBO2";
      r.team = pick(TEAMS.KBO);
    }
  } else if (r.league === "KBO2") {
    if (ovr >= LEAGUES.KBO.level - 3) r.league = "KBO";
  } else if (r.league === "KBO") {
    if (ovr < LEAGUES.KBO.level - 10) r.league = "KBO2";
    else if (r.age >= 27 && ovr >= 72 && Math.random() < 0.35) {
      r.league = "MLB";
      r.team = pick(TEAMS.MLB);
    } else if (r.age >= 27 && ovr >= 67 && Math.random() < 0.25) {
      r.league = "NPB";
      r.team = pick(TEAMS.NPB);
    }
  } else if (r.league === "NPB" || r.league === "MLB") {
    if (ovr < LEAGUES[r.league].level - 10) {
      r.league = "KBO";
      r.team = pick(TEAMS.KBO);
    }
  }
  if (r.league !== from && (r.league === "MLB" || r.league === "NPB" || (from === "HS" && r.league === "KBO2"))) {
    report.specials.push({ key: "rivalMove", rival: r.name, rivalTeam: r.team });
  }

  const mustRetire = r.age >= 41 || (r.age >= 37 && ovr < 55) || (r.age >= 30 && ovr < 42) || (r.league === "INDIE" && r.age >= 27);
  if (mustRetire) {
    r.retired = true;
    report.specials.push({ key: "rivalRetire", rival: r.name });
  }
}

// 라이벌 통산 요약
function rivalSummary(r) {
  const pro = r.history.filter((h) => h.league !== "HS");
  return {
    WAR: round(
      pro.reduce((s, h) => s + h.WAR, 0),
      1,
    ),
    MVP: countAward(r, "MVP"),
    champs: countAward(r, "시리즈 우승"),
  };
}

// =============================================
// 3. 별명
// =============================================
function updateNickname(player, report) {
  const index = NICKNAME_RULES.findIndex((rule) => rule.when(player, report));
  if (index < 0) return;
  const nick = fillText(NICKNAME_RULES[index].nick, player, {});
  if (nick === player.nickname) return;
  // 이미 별명이 있으면 더 강한(위쪽) 별명이거나 반반 확률로만 바뀜
  const current = NICKNAME_RULES.findIndex((rule) => fillText(rule.nick, player, {}) === player.nickname);
  if (player.nickname && current >= 0 && index > current && Math.random() < 0.5) return;
  player.nickname = nick;
  player.nicknames = [...new Set([...(player.nicknames || []), nick])];
  report.specials.push({ key: "nickname", nick });
}

// =============================================
// 4. 팬 여론(fame)과 인터뷰·사생활
// fame: -100(공공의 적) ~ 100(국민 스타)
// =============================================
function changeFame(player, amount) {
  player.fame = clamp(Math.round((player.fame || 0) + amount), -100, 100);
}

function fameLabel(fame) {
  if (fame >= 60) return "국민 스타";
  if (fame >= 30) return "인기 선수";
  if (fame >= -10) return "보통";
  if (fame >= -40) return "비호감";
  return "공공의 적";
}

// 시즌 성적이 여론에 주는 영향
function seasonFame(player, report) {
  const before = player.fame || 0;
  if (!isAmateur(report.league)) {
    // 팬덤이 큰 팀은 잘하면 더 뜨겁고, 못하면 더 차가움
    const fan = 0.7 + teamFandom(report.team) * 0.12; // 1 → 0.82배, 5 → 1.3배
    if (report.grade === "great") changeFame(player, 6 * fan);
    else if (report.grade === "good") changeFame(player, 2 * fan);
    else if (report.grade === "bad") changeFame(player, -4 * fan);
  }
  changeFame(player, Math.min(report.awards.length * 2, 8));
  // 시간이 지나면 여론은 조금씩 잊힘
  player.fame = Math.round(player.fame * 0.95);
  report.fameChange = player.fame - before;
}

// 시즌 뒤 40% 확률로 인터뷰·사생활 이벤트
function maybeLifeEvent(player, report) {
  if (player.retired) return;
  const pending = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
  if (pending.some((c) => c.key === "forcedRetire")) return;
  // 인터뷰는 자주(45%), 사생활 이벤트는 가끔(25%) / 한 비시즌에 하나만
  const eligible = LIFE_EVENTS.filter((ev) => ev.when(player, report));
  const interviews = eligible.filter((ev) => ev.interview);
  const others = eligible.filter((ev) => !ev.interview);
  let ev = null;
  // 덜 본 이벤트가 먼저 나옴
  const seen = player.eventLog || (player.eventLog = {});
  const fresh = (list) => {
    const min = Math.min(...list.map((e) => seen[e.id] || 0));
    return pick(list.filter((e) => (seen[e.id] || 0) === min));
  };
  // 연애·결혼은 따로 챙김: 연애 중(만 26세+)이면 비시즌마다 40%로 결혼 이야기, 솔로면 15%로 새 인연
  const marriage = eligible.find((e) => e.id === "marriage");
  const dating = eligible.find((e) => e.id === "dating");
  if (marriage && Math.random() < 0.4) ev = marriage;
  else if (dating && Math.random() < 0.15) ev = dating;
  else if (interviews.length && Math.random() < 0.4) ev = fresh(interviews);
  else if (others.length && Math.random() < 0.5) ev = fresh(others);
  if (!ev) return;
  seen[ev.id] = (seen[ev.id] || 0) + 1;
  const idx = priceIndex(player);
  const extra = { rival: player.rival ? player.rival.name : "", event: report.national ? report.national.name : "" };
  pushChoice(player, {
    key: "life",
    eventId: ev.id,
    text: (ev.interview ? "🎤 " : "") + fillText(ev.text, player, extra),
    options: ev.options.map((o) => {
      const hints = [];
      if (o.money) hints.push(`수입 ${fmtMoney(o.money * idx)}`);
      if (o.cost) hints.push(`비용 ${fmtMoney(o.cost * idx)}`);
      if (o.stats) {
        const parts = Object.entries(o.stats)
          .filter(([k]) => player.stats[k] !== undefined)
          .map(([k, v]) => `${BATTER_STATS[k] || PITCHER_STATS[k]} ${v > 0 ? "+" : ""}${v}`);
        if (parts.length) hints.push(parts.join(", "));
      }
      if (o.nextMod > 0) hints.push("다음 시즌 컨디션 ↑");
      if (o.moneyRate) hints.push(`약 ${fmtMoney(-player.money * o.moneyRate)}`);
      if (o.nextMod < 0) hints.push("다음 시즌 컨디션 ↓");
      return { ...o, detail: hints.join(" · ") };
    }),
  });
}

function resolveLifeChoice(player, choice, option) {
  const news = [];
  const fame = option.fame === "random" ? randomInt(-15, 20) : option.fame || 0;
  changeFame(player, fame);
  if (option.money) addMoney(player, option.money * priceIndex(player));
  if (option.cost) player.money -= Math.round(option.cost * priceIndex(player));
  if (option.stats) {
    for (const [k, v] of Object.entries(option.stats)) {
      if (player.stats[k] !== undefined) player.stats[k] = clamp(player.stats[k] + v, 1, 99);
    }
  }
  if (option.flag === "kids") player.kids = (player.kids || 0) + 1;
  if (option.flag === "pet") player.pet = true;
  if (option.moneyRate) player.money += Math.round(player.money * option.moneyRate);
  if (option.mental) {
    const key = player.stats.mental !== undefined ? "mental" : "clutch";
    player.stats[key] = clamp(player.stats[key] + option.mental, 1, 99);
  }
  if (option.nextMod) player.nextMod = (player.nextMod || 0) + option.nextMod;
  if (option.flag === "dating") player.dating = true;
  if (option.flag === "married") {
    player.married = true;
    player.dating = false;
  }
  if (option.news) news.push(fillText(option.news, player, { rival: player.rival ? player.rival.name : "" }));
  news.push(`팬 여론 ${fame >= 0 ? "+" : ""}${fame} → ${player.fame} (${fameLabel(player.fame)})`);
  return news;
}

// story 선택지 처리 (career.js의 resolveChoice에서 부름)
function resolveStoryChoice(player, choice, option) {
  if (choice.key === "life") return resolveLifeChoice(player, choice, option);
  if (choice.key === "position") return resolvePositionChoice(player, choice, option);
  if (choice.key === "clutch") return resolveClutch(player, choice, option);
  if (RULE_CHOICES.includes(choice.key)) return resolveRulesChoice(player, choice, option); // rules.js
  if (choice.key === "military") {
    if (option.id === "delay") return [`${player.name}, 입대 연기… "아직 할 일이 남았다"`];
    enlist(player, option.id);
    changeFame(player, 3);
    return [fillText(NEWS.special.enlist, player, { unit: option.id === "SANGMU" ? "국군체육부대(상무)" : "사회복무요원으로" })];
  }
  return [];
}

// 시즌이 끝난 뒤 이야기 정리 (기사 만든 다음)
function afterSeasonStory(player, report) {
  seasonFame(player, report);
  maybeClutch(player, report); // 결정적 순간은 맨 앞에 보여줌 (우승 여부는 선택 뒤에 공개)
  report.newAchievements = checkAchievements(player); // 업적 도감 (legacy.js)
  maybePositionOffer(player, report);
  rotateManagers(player, report); // 감독 교체 (world.js)
  maybeManagerTalk(player, report); // 감독의 대타 제안 (world.js)
  maybeLifeEvent(player, report);
}

// =============================================
// 5. 프랜차이즈 스타
// 한 팀에서 6시즌 이상 + 그 팀에서 WAR 12 이상 → 프랜차이즈 스타
// 원소속팀이 FA 때 훨씬 많이 주고, 연봉 협상도 유리함
// =============================================
Object.assign(NEWS.special, {
  franchise: "{name}, 이제는 {team}의 얼굴… 명실상부 프랜차이즈 스타",
  franchiseLeave: "{team}의 심장이 떠났다… 프랜차이즈 스타 {name} 이적 충격",
  homecoming: "돌아온 프랜차이즈 스타! {name}, 친정 {team} 복귀",
  retiredNumber: "{team}, {name}의 등번호 {num}번 영구결번 결정",
  position: "{name}, {from}에서 {to}(으)로 포지션 변경",
});

Object.assign(FAN, {
  franchise: ["이 팀은 {name} 없으면 안 됨", "평생 우리 팀에 있어라", "유니폼 마킹은 무조건 {name}", "구단은 얘 잡는 데 돈 아끼지 마라"],
  franchiseLeave: ["배신감 든다 진짜", "유니폼 버려야 하나…", "돈 따라 갔네", "그래도 고마웠다… 근데 서운하다"],
  homecoming: ["돌아와줘서 고맙다 ㅠㅠ", "역시 여기가 집이지", "친정 복귀 미쳤다"],
  position: ["포지션 바꾼 거 신의 한 수 될 듯", "새 포지션 적응 잘하길", "이 결정은 좀 걱정된다", "감독 판단 믿어본다"],
  dh: ["이제 방망이에만 집중하자", "수비 부담 덜었으니 홈런 기대함", "지명타자도 잘하면 레전드지"],
});

NICKNAME_RULES.splice(3, 0, { nick: "{team}의 심장", when: (p) => p.franchise && p.franchise === p.team });

// 지금 팀에서 연속으로 뛴 시즌 수와 WAR (군 복무는 건너뜀)
function teamTenure(player, team) {
  let seasons = 0;
  let war = 0;
  for (let i = player.history.length - 1; i >= 0; i--) {
    const h = player.history[i];
    if (SERVICE_LEAGUES.includes(h.league)) continue;
    if (h.team !== team) break;
    seasons++;
    war += h.WAR;
  }
  return { seasons, war: round(war, 1) };
}

function isFranchiseHere(player) {
  return !!player.franchise && player.franchise === player.team;
}

function checkFranchise(player, report) {
  if (!PRO_LEAGUES.includes(player.league) || isFranchiseHere(player)) return;
  const t = teamTenure(player, player.team);
  if (t.seasons >= 6 && t.war >= 12) {
    player.franchise = player.team;
    changeFame(player, 10);
    report.specials.push({ key: "franchise" });
  }
}

// FA 계약 직후: 프랜차이즈 스타의 이적·복귀 반응
function franchiseMoveNews(player, oldTeam) {
  if (!player.franchise) return null;
  if (oldTeam === player.franchise && player.team !== oldTeam && player.league === "KBO") {
    changeFame(player, -15);
    return { line: fillText(NEWS.special.franchiseLeave, player, { team: oldTeam }), pool: FAN.franchiseLeave };
  }
  if (player.team === player.franchise && oldTeam !== player.team) {
    changeFame(player, 10);
    return { line: fillText(NEWS.special.homecoming, player, {}), pool: FAN.homecoming };
  }
  return null;
}

// 은퇴할 때: 프랜차이즈 스타는 영구결번
function retireStory(player) {
  if (!player.franchise) return null;
  const war = player.history.filter((h) => h.team === player.franchise).reduce((s, h) => s + h.WAR, 0);
  if (war < 25) return null;
  const award = `영구결번 (${player.franchise})`;
  player.awards[award] = 1;
  return fillText(NEWS.special.retiredNumber, player, { team: player.franchise });
}

// =============================================
// 6. 포지션 변경
// - 훈련 탭에서 비시즌마다 1번 직접 바꿀 수 있음
// - 나이·팀 사정에 따라 감독이 먼저 제안하기도 함
// =============================================
const DH = "지명타자";
POSITION_FOCUS[DH] = ["contact", "power"];
const HARD_POSITIONS = ["포수", "유격수"]; // 수비 55 이상만 갈 수 있음

// 이 선수가 갈 수 있는 포지션 목록
function positionOptions(player) {
  if (player.type === "batter") return [...POSITIONS.batter, DH];
  if (player.type === "pitcher") return POSITIONS.pitcher;
  return POSITIONS.twoway;
}

// 포지션을 바꾸면 OVR이 얼마가 될지
function ovrAt(player, position) {
  return getOvrs({ ...player, position }).best;
}

// 바꿀 수 없는 이유 (없으면 "")
function positionBlock(player, position) {
  if (position === player.position) return "지금 포지션";
  if (player.positionChangedAt === player.season) return "이번 비시즌엔 이미 바꿨어요";
  if (HARD_POSITIONS.includes(position) && (player.stats.defense || 0) < 55) return "수비 55 이상 필요";
  return "";
}

function changePosition(player, position, byTeam) {
  const from = player.position;
  player.position = position;
  player.positionChangedAt = player.season;
  // 지명타자가 아닌 새 수비 위치는 한 시즌 적응 기간 (팀이 부탁한 경우는 지원을 받아 괜찮음)
  player.positionAdjust = position !== DH && !byTeam;
  return fillText(NEWS.special.position, player, { from, to: position });
}

// 감독·코치의 포지션 제안 (시즌 뒤 가끔)
function maybePositionOffer(player, report) {
  if (player.retired || isAmateur(player.league) || isServing(player) || player.type === "twoway") return;
  const pending = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
  if (pending.some((c) => c.key === "forcedRetire" || c.key === "position")) return;
  const ovr = getOvrs(player).best;
  let offer = null;

  if (player.type === "batter") {
    const glove = (player.stats.defense + player.stats.arm) / 2;
    if (player.position !== DH && player.age >= 32 && (glove < 55 || Math.random() < 0.35)) {
      offer = {
        to: DH,
        text: `${koreanAge(player.age)}세, 수비 범위가 예전 같지 않아요. 감독이 지명타자 전향을 제안해요. (지명타자는 수비 능력치가 OVR에서 빠지지만 WAR 보정이 낮아요)`,
      };
    } else if (player.position !== DH && Math.random() < 0.08) {
      const choices = POSITIONS.batter.filter((p) => p !== player.position && !(HARD_POSITIONS.includes(p) && player.stats.defense < 55));
      const to = pick(choices);
      offer = { to, byTeam: true, text: `팀 주전 ${to}가 부상과 이적으로 빠졌어요. 감독이 "네가 ${to}를 맡아줄 수 있겠나?"라고 묻네요.` };
    }
  } else if (player.type === "pitcher") {
    const stamina = player.stats.stamina;
    if (player.position === "선발" && (player.age >= 33 || stamina < 45) && Math.random() < 0.5) {
      offer = { to: "불펜", text: "체력이 예전 같지 않아요. 코치진이 불펜(필승조·마무리) 전환을 제안해요." };
    } else if (player.position === "불펜" && stamina >= 60 && ovr >= LEAGUES[player.league].level && Math.random() < 0.3) {
      offer = { to: "선발", byTeam: true, text: "선발 로테이션에 구멍이 났어요. 감독이 선발 전환을 부탁해요." };
    }
  }
  if (!offer) return;
  const now = getOvrs(player).best;
  const next = ovrAt(player, offer.to);
  pushChoice(player, {
    key: "position",
    to: offer.to,
    byTeam: !!offer.byTeam,
    text: offer.text,
    options: [
      { id: "accept", label: `${offer.to}(으)로 바꾼다`, detail: `OVR ${now} → ${next}${offer.byTeam ? " · 감독 신뢰 UP" : ""}` },
      { id: "decline", label: `${player.position} 그대로`, detail: offer.byTeam ? "팀 사정 외면… 여론 조금 ↓" : "지금 자리에서 버텨본다" },
    ],
  });
}

function resolvePositionChoice(player, choice, option) {
  if (option.id === "decline") {
    if (choice.byTeam) changeFame(player, -3);
    return [`${player.name}, 포지션 변경 제안 고사 "지금 자리에서 증명하겠다"`];
  }
  const line = changePosition(player, choice.to, choice.byTeam);
  if (choice.byTeam) {
    changeFame(player, 5);
    player.nextMod = (player.nextMod || 0) + 1;
  }
  // 이번 비시즌에 또 바꿀 수 있도록 (제안은 별개)
  player.positionChangedAt = null;
  return [line];
}

// 시즌 기록이 끝나고 기사 쓰기 전에
function beforeFeedStory(player, report) {
  checkFranchise(player, report);
  updateNickname(player, report);
}

// =============================================
// 7. 인터뷰 (자주 열림)
// =============================================
for (const ev of LIFE_EVENTS) if (ev.id.startsWith("interview")) ev.interview = true;

LIFE_EVENTS.push(
  {
    id: "mediaDay",
    interview: true,
    when: (p) => !isAmateur(p.league) && !isServing(p),
    text: "시즌 개막 미디어데이. 기자가 올 시즌 목표를 물어요.",
    options: [
      { id: "a", label: '"개인 기록보다 팀 우승이 먼저입니다"', fame: 5, news: '{name} "개인 기록보다 팀"… 미디어데이 모범 답안', mood: "good" },
      { id: "b", label: '"올해 MVP는 제 겁니다"', fame: -3, nextMod: 1, news: "{name}, 미디어데이 MVP 선언… 자신감인가 허세인가", mood: "bad" },
      { id: "c", label: '"다치지 않고 풀시즌 뛰는 게 목표예요"', fame: 2, news: '{name} "목표는 풀타임" 담담한 각오', mood: "good" },
    ],
  },
  {
    id: "rivalQ",
    interview: true,
    when: (p) => p.rival && !p.rival.retired && !isAmateur(p.league),
    text: "기자가 동갑내기 라이벌 {rival}에 대해 물어요.",
    options: [
      { id: "a", label: '"정말 존경하는 선수예요"', fame: 5, news: '{name} "{rival|은} 존경하는 친구"… 훈훈한 라이벌', mood: "good" },
      { id: "b", label: '"솔직히 제가 한 수 위죠"', fame: "random", nextMod: 1, news: '{name}, 라이벌 {rival} 공개 도발 "내가 한 수 위"', mood: "bad" },
      { id: "c", label: '"남 신경 쓸 시간 없어요"', fame: 0, news: '{name} "라이벌? 신경 안 쓴다"', mood: "good" },
    ],
  },
  {
    id: "faQ",
    interview: true,
    when: (p) =>
      p.league === "KBO" &&
      ((p.contract && p.contract.isFA && p.contract.years === 1) || (p.contract && !p.contract.isFA && (p.kboService || 0) === kboFaNeeded(p) - 1)),
    text: 'FA를 1년 앞두고 기자가 묻습니다. "내년 거취는요?"',
    options: [
      { id: "a", label: '"이 팀에서 끝까지 뛰고 싶어요"', fame: 8, news: '{name} "{team}에서 은퇴하고 싶다"… 팬심 저격', mood: "good" },
      { id: "b", label: '"모든 가능성을 열어두겠습니다"', fame: -4, news: '{name} "모든 가능성 열어둔다"… 이적 시사?', mood: "bad" },
      { id: "c", label: '"해외 도전도 생각하고 있어요"', fame: 2, news: "{name}, 해외 진출 의지 공개", mood: "good" },
    ],
  },
  {
    id: "nationalQ",
    interview: true,
    when: (p, r) => !!r.national,
    text: "{event}를 마치고 돌아온 공항 인터뷰.",
    options: [
      { id: "a", label: '"태극마크는 언제나 영광입니다"', fame: 6, news: '{name} "태극마크는 영광"… 귀국 소감', mood: "good" },
      { id: "b", label: '"솔직히 많이 피곤하네요"', fame: -4, news: '{name} "대표팀 피곤했다" 솔직 발언 논란', mood: "bad" },
    ],
  },
  {
    id: "veteranQ",
    interview: true,
    when: (p) => p.age >= 34 && !isAmateur(p.league),
    text: "베테랑이 된 당신에게 기자가 은퇴 시점을 물어요.",
    options: [
      { id: "a", label: '"몸이 허락하는 한 계속 뜁니다"', fame: 3, mental: 1, news: '{name} "몸이 허락하는 한 현역"', mood: "good" },
      { id: "b", label: '"후배들에게 길을 열어줄 때가 오겠죠"', fame: 6, news: '{name} "후배들 위해 물러날 때도 생각"… 품격 있는 베테랑', mood: "good" },
    ],
  },
  {
    id: "hsQ",
    interview: true,
    when: (p, r) => p.league === "HS" && r.grade === "great",
    text: "고교 유망주로 주목받으며 첫 언론 인터뷰를 해요. 롤모델을 묻네요.",
    options: [
      { id: "a", label: '"우리 학교 선배님들이요"', fame: 4, news: '{school} {name} "선배님들처럼 되고 싶다"', mood: "good" },
      { id: "b", label: '"메이저리그 슈퍼스타요!"', fame: 2, news: '고교 유망주 {name} "꿈은 메이저리그"', mood: "good" },
    ],
  },
);

// =============================================
// 8. 해외 진출 기사·댓글 (규칙은 rules.js)
// =============================================
Object.assign(NEWS.special, {
  postingFail: "{name}, {league} 포스팅 무응찰… {team} 잔류",
  postingWin: "{name}, 포스팅 성공! {team|과} {years}년 총액 {total} 계약",
});

function chanceLabel(p) {
  if (p >= 0.6) return "높음";
  if (p >= 0.35) return "보통";
  if (p >= 0.15) return "낮음";
  return "매우 낮음";
}

// 선택지를 맨 앞에 끼워 넣기 (결정적 순간처럼 바로 보여줘야 할 때)
function pushChoiceFirst(player, choice) {
  if (player.pendingChoice) player.choiceQueue.unshift(player.pendingChoice);
  player.pendingChoice = choice;
}

// =============================================
// 9. 고교 전국대회 (매년 5개 대회)
// =============================================
const HS_TOURNAMENTS = ["이마트배", "황금사자기", "청룡기", "대통령배", "봉황대기"];

// 우리 팀 전력: 학교 수준 + 내 실력 + 내 활약 (0.5 = 평균적인 팀)
function amateurStrength(player, report, level) {
  const ovr = getOvrs(player).best;
  const base = LEAGUES[player.league].level;
  return 0.5 + 0.07 * (level - 2) + clamp((ovr - base - 10) * 0.004, -0.05, 0.1) + clamp(report.WAR * 0.015, -0.03, 0.06);
}

// 탈락한 라운드 이름 (rounds = 우승까지 경기 수, i = 몇 번째 경기에서 졌는지)
function cupRoundName(rounds, i) {
  const fromEnd = rounds - 1 - i;
  return ["준우승", "4강", "8강", "16강", "32강"][fromEnd] || `${i + 1}회전 탈락`;
}

// 토너먼트 하나: 라운드가 올라갈수록 상대가 강해짐
function playCup(cup, strength, rounds) {
  for (let i = 0; i < rounds; i++) {
    const opp = 0.45 + (i / rounds) * 0.1 + (Math.random() - 0.5) * 0.12;
    const pWin = clamp(0.5 + (strength - opp) * 2, 0.12, 0.92);
    if (Math.random() >= pWin) return { wins: i, result: cupRoundName(rounds, i) };
  }
  return { wins: rounds, result: "우승" };
}

// 주말리그: 권역 학교들끼리 풀리그
function weekendLeague(player, strength, half) {
  const region = Object.keys(HS_REGIONS).find((r) => HS_REGIONS[r].includes(player.school)) || "서울";
  const schools = HS_REGIONS[region];
  const power = (name) => {
    if (name === player.school) return strength;
    const sc = HIGH_SCHOOLS.find((x) => x.name === name);
    return 0.5 + 0.07 * ((sc ? sc.level : 1) - 2) + (Math.random() - 0.5) * 0.1;
  };
  const p = Object.fromEntries(schools.map((n) => [n, power(n)]));
  const rec = Object.fromEntries(schools.map((n) => [n, { w: 0, l: 0 }]));
  for (let i = 0; i < schools.length; i++) {
    for (let j = i + 1; j < schools.length; j++) {
      const a = schools[i],
        b = schools[j];
      if (Math.random() < clamp(0.5 + (p[a] - p[b]) * 2, 0.1, 0.9)) {
        rec[a].w++;
        rec[b].l++;
      } else {
        rec[b].w++;
        rec[a].l++;
      }
    }
  }
  const order = [...schools].sort((a, b) => rec[b].w - rec[a].w || p[b] - p[a]);
  const rank = order.indexOf(player.school) + 1;
  return { half, region, rank, size: schools.length, w: rec[player.school].w, l: rec[player.school].l, qualified: rank <= Math.ceil(schools.length / 2) };
}

function playHsTournaments(player, report) {
  const school = HIGH_SCHOOLS.find((s) => s.name === player.school);
  const level = school ? school.level : 1;
  const strength = amateurStrength(player, report, level);
  report.hsLeague = [weekendLeague(player, strength, "전반기"), weekendLeague(player, strength, "후반기")];
  report.hsTournaments = [];
  HS_CUPS.forEach((cup, i) => {
    const name = cup.name;
    const lg = cup.qualify ? report.hsLeague.find((x) => x.half === cup.qualify) : null;
    if (lg && !lg.qualified) {
      report.hsTournaments.push({ name, result: "본선 진출 실패" });
      return;
    }
    const { result } = playCup(cup, strength, cup.rounds);
    report.hsTournaments.push({ name, result });
  });
  holdLastFinal(report, report.hsTournaments);
  for (const t of report.hsTournaments) {
    if (t.result !== "우승") continue;
    const award = `${t.name} 우승`;
    player.awards[award] = (player.awards[award] || 0) + 1;
    report.awards.push(award);
    report.specials.push({ key: "champion", award });
  }
}

// 그 해 마지막으로 오른 결승은 결과를 숨겨 두고, 내가 결정적 순간에서 직접 정함
// (그보다 앞선 대회 우승은 이미 끝난 일이라 그대로 보여줌)
function holdLastFinal(report, cups) {
  for (let i = cups.length - 1; i >= 0; i--) {
    if (cups[i].result === "우승" || cups[i].result === "준우승") {
      cups[i].result = "결승 진출";
      report.cupFinal = cups[i].name;
      return;
    }
  }
}

// 대학 대회: U-리그 왕중왕전(조 1~5위만), 전국대학야구선수권, 대통령기
function playCollegeTournaments(player, report) {
  const strength = amateurStrength(player, report, player.collegeTier || 2);
  const seed = report.standing ? report.standing.seed : 0;
  report.collegeCups = [];
  for (const cup of COLLEGE_CUPS) {
    if (cup.qualify && !seed) {
      report.collegeCups.push({ name: cup.name, result: "본선 진출 실패" });
      continue;
    }
    const { result } = playCup(cup, strength + (cup.qualify ? (6 - seed) * 0.01 : 0), cup.rounds);
    report.collegeCups.push({ name: cup.name, result });
  }
  holdLastFinal(report, report.collegeCups);
  for (const t of report.collegeCups) {
    if (t.result !== "우승") continue;
    const award = `${t.name} 우승`;
    player.awards[award] = (player.awards[award] || 0) + 1;
    report.awards.push(award);
    report.specials.push({ key: "champion", award });
  }
}

function hsTitles(player) {
  return HS_TOURNAMENTS.reduce((sum, name) => sum + (player.awards[`${name} 우승`] || 0), 0);
}

{
  const rule = NICKNAME_RULES.find((r) => r.nick === "{school}의 자랑");
  if (rule) rule.when = (p) => p.league === "HS" && hsTitles(p) >= 2;
}

// =============================================
// 10. 결정적 순간 (없는 시즌도 있음)
// =============================================
Object.assign(FAN, {
  clutchGood: ["소름 돋았다 진짜", "이게 스타지", "{name} 클러치 미쳤다", "오늘 야구 본 사람 승리자", "하이라이트 100번 돌려봄"],
  clutchBad: ["그걸 왜 거기서…", "새가슴 인증", "중요할 때 꼭 이러더라", "괜찮아 다음에 잘하면 돼", "오늘은 잠 못 잘 듯"],
});

// 끝난 시즌에 이미 들어간 기록에 상을 더함
function lateAward(player, name) {
  player.awards[name] = (player.awards[name] || 0) + 1;
  const h = player.history[player.history.length - 1];
  if (h && !h.awards.includes(name)) h.awards.push(name);
  const r = player.lastReport;
  if (r && h && r.year === h.year && !r.awards.includes(name)) r.awards.push(name);
}

const CLUTCH_OPTIONS = {
  bat: [
    { id: "first", label: "초구부터 노린다", stat: "contact", base: 0 },
    { id: "wait", label: "끝까지 공을 본다", stat: "eye", base: 0.05 },
    { id: "big", label: "한 방을 노린다 (홈런 스윙)", stat: "power", base: -0.12, big: true },
  ],
  pit: [
    { id: "heat", label: "직구로 정면 승부", stat: "velocity", base: 0 },
    { id: "break", label: "결정구 변화구", stat: "breaking", base: 0 },
    { id: "edge", label: "구석구석 제구", stat: "control", base: 0.03 },
    { id: "big", label: "가운데로 꽂는다 (삼진 아니면 장타)", stat: "stuff", base: -0.12, big: true },
  ],
};

function clutchChance(player, side, opt, level) {
  const stat = player.stats[opt.stat] || 50;
  const nerve = side === "bat" ? player.stats.clutch : player.stats.mental;
  const analyst = hasItem(player, "analyst") ? 0.05 : 0; // 개인 전력분석관
  return clamp(0.42 + (stat - level) / 50 + ((nerve || 50) - 50) / 120 + opt.base + analyst, 0.08, 0.9);
}

function maybeClutch(player, report) {
  if (player.retired || (!report.bat && !report.pit)) return;
  const lg = report.league;
  let moment = null;

  if (report.cupFinal) {
    moment = { kind: "hsFinal", stage: `${report.cupFinal} 결승` };
  } else if (CHAMPIONSHIP[lg] && PS_ROUNDS[lg] && report.standing && report.standing.seed) {
    const fin = FINAL_SERIES[lg];
    const champion = report.awards.includes(CHAMPIONSHIP[lg]);
    const ps = report.postseason || [];
    const last = ps[ps.length - 1];
    const lostFinal = last && last.round === 1 && !last.won;
    // 우승이 걸린 경기: 7전 4선승제면 4~7차전 중 하나 (7차전까지 가는 건 드묾)
    const need = (fin.bo + 1) / 2;
    const n = pick(champion ? fin.win : fin.lose);
    const stage = fin.bo === 1 ? `${fin.name} (단판)` : `${fin.name} ${n}차전`;
    const note = fin.bo === 1 ? "단판 승부, 이기면 우승" : n === fin.bo ? `운명의 ${n}차전` : `시리즈 ${need - 1}승 ${n - need}패, 이기면 우승`;
    if (champion) {
      // 우승한 해는 무조건 우승 결정 경기를 내가 직접 치름 (선택하기 전까지 우승은 비밀)
      moment = { kind: "seriesHero", stage, series: fin.name, note };
      holdChampion(player, report, CHAMPIONSHIP[lg]);
    } else if (lostFinal && Math.random() < 0.5) {
      moment = { kind: "game7", stage, series: fin.name, note };
    }
    if (last && moment) last.pending = true;
  }
  if (!moment && PRO_LEAGUES.concat(["HS", "COLLEGE"]).includes(lg) && Math.random() < 0.25) {
    moment = { kind: "regular", stage: "정규시즌 분수령" };
  }
  if (!moment) return;

  const side = report.bat && report.pit ? pick(["bat", "pit"]) : report.bat ? "bat" : "pit";
  const level = LEAGUES[lg].level;
  let situation;
  if (moment.kind === "regular") {
    // 노히트노런·사이클링 히트는 정말 드묾 (KBO 역사에서 손에 꼽을 정도)
    // 리그 수준보다 한참 잘하는 선발 투수 / 타자에게만, 그것도 시즌에 1~2% 정도로 찾아옴
    const gap = (getOvrs(player)[side === "bat" ? "bat" : "pit"] || 0) - level;
    const starter = report.pit && report.pit.role && report.pit.role.includes("선발");
    if (side === "pit" && starter && Math.random() < clamp((gap - 4) * 0.002, 0, 0.02)) {
      situation = "노히트노런까지 아웃카운트 하나! 상대 4번 타자예요.";
    } else if (side === "bat" && Math.random() < clamp((gap - 4) * 0.002, 0, 0.02)) {
      situation = "사이클링 히트까지 3루타 하나! 마지막 타석이에요.";
    } else {
      situation =
        side === "bat"
          ? pick([
              "9회말 2사 1·2루, 한 점 차로 지고 있어요.",
              "연장 11회말 무사 3루, 끝내기 찬스예요.",
              "8회말 1사 만루, 동점 주자가 3루에 있어요.",
              "순위 싸움 맞대결, 0-0 9회말 선두 타자예요.",
            ])
          : pick([
              "1점 차 9회 2사 만루, 풀카운트예요.",
              "순위 싸움 맞대결, 8회 무사 2·3루 위기예요.",
              "7회까지 1실점 호투, 8회 1사 1·3루 위기예요.",
              "연장 10회 2사 2루, 상대 중심 타선이에요.",
            ]);
    }
  } else {
    const head = moment.note ? `${moment.note}. ` : "";
    situation =
      head +
      (side === "bat"
        ? pick([
            "9회말 2사 2·3루, 한 점 차로 지고 있어요. 타석에 당신이 섭니다.",
            "8회초 1사 만루, 동점 상황이에요.",
            "연장 10회말 1사 2루, 끝내기 찬스예요.",
            "7회 2사 1·3루, 상대 에이스가 내려가고 필승조가 올라왔어요.",
            "0-0으로 맞선 9회초, 선두 타자로 나섭니다.",
          ])
        : pick([
            "9회 2사 만루, 한 점 차 리드. 마운드에 당신이 섭니다.",
            "8회 무사 1·2루, 두 점 차 리드에서 등판해요.",
            "연장 11회 1사 3루, 상대 중심 타선이에요.",
            "6회 1사 2·3루, 선발이 무너지고 급히 올라왔어요.",
            "9회 선두 타자 볼넷, 한 점 차 리드예요.",
          ]));
  }
  const opts = CLUTCH_OPTIONS[side].filter((o) => player.stats[o.stat] !== undefined);
  pushChoiceFirst(player, {
    key: "clutch",
    tend: pickTend(side, opts), // 상대 성향 (boxscore.js 수싸움)
    kind: moment.kind,
    stage: moment.stage,
    side,
    level,
    situation,
    text: `⚡ 결정적 순간! [${moment.stage}] ${situation} 어떻게 할까요?`,
    options: opts.map((o) => ({
      id: o.id,
      label: o.label,
      detail: `${o.big ? "성공하면 대박, 실패하면 역적 · " : ""}성공 가능성 ${chanceLabel(clutchChance(player, side, o, level))}`,
    })),
  });
}

function pendingFinal(r) {
  const cups = r ? r.hsTournaments || r.collegeCups : null;
  return cups ? cups.find((x) => x.result === "결승 진출") : null;
}

function resolveClutch(player, choice, option) {
  const opt = CLUTCH_OPTIONS[choice.side].find((o) => o.id === option.id);
  // 기본은 능력치, 상대 성향 읽으면 보너스 (boxscore.js)
  // 숨긴 부상 안고 뛰면 -10%p (dilemma.js)
  const success = Math.random() < clutchChance(player, choice.side, opt, choice.level) + tendBonus(choice, option.id) - (choice.pain ? 0.1 : 0);
  player.lastClutch = success;
  // 포스트시즌 마지막 시리즈 결과 확정
  const lr = player.lastReport;
  const lastPs = lr && lr.postseason ? lr.postseason[lr.postseason.length - 1] : null;
  if (lastPs && lastPs.pending) {
    lastPs.pending = false;
    lastPs.won = success;
  }
  const news = [];
  const nerve = choice.side === "bat" ? "clutch" : "mental";
  const r = player.lastReport;

  if (success) {
    changeFame(player, opt.big ? 10 : 6);
    if (player.stats[nerve] !== undefined) player.stats[nerve] = clamp(player.stats[nerve] + 1, 1, 99);
    const hero =
      choice.side === "bat"
        ? opt.big
          ? `${player.name}, ${choice.stage} 끝내기 홈런! 경기장이 뒤집혔다`
          : `${player.name}, ${choice.stage} 결승타! 해결사 본능`
        : opt.big
          ? `${player.name}, ${choice.stage} 삼구삼진으로 경기 끝! 포효`
          : `${player.name}, ${choice.stage} 위기 탈출… 마운드의 수호신`;
    if (choice.situation.includes("사이클링")) news.push(`${player.name}, 마지막 타석 3루타! 사이클링 히트 완성`);
    else if (choice.situation.includes("노히트노런")) news.push(`${player.name}, 마지막 타자 삼진! 노히트노런 달성`);
    else news.push(hero);
    if (choice.kind === "hsFinal") {
      const t = pendingFinal(r);
      const name = choice.stage.replace(" 결승", "");
      if (t) t.result = "우승";
      lateAward(player, `${name} 우승`);
      news.push(`${r && r.collegeCups ? r.team : player.school}, ${name} 우승!`);
    } else if (choice.kind === "game7") {
      lateAward(player, CHAMPIONSHIP[player.history[player.history.length - 1].league]);
      news.push(`${player.team}, ${choice.stage}에서 우승 확정! ${player.name} 우승 반지 품었다`);
    } else if (choice.kind === "seriesHero") {
      lateAward(player, CHAMPIONSHIP[player.history[player.history.length - 1].league]);
      lateAward(player, `${choice.series || choice.stage.replace(" 우승 결정전", "")} 최우수선수`);
      news.push(`${player.team} 우승! ${player.name}, 시리즈 최우수선수까지`);
    } else if (choice.situation.includes("사이클링")) {
      lateAward(player, "사이클링 히트");
    } else if (choice.situation.includes("노히트노런")) {
      lateAward(player, "노히트노런");
    }
  } else {
    changeFame(player, opt.big ? -6 : -3);
    news.push(
      choice.side === "bat"
        ? `${choice.stage}, ${player.name} ${opt.big ? "헛스윙 삼진" : "범타"}… 고개 숙였다`
        : `${choice.stage}, ${player.name} ${opt.big ? "통한의 끝내기 피홈런" : "결승점 허용"}… 아쉬움 삼켰다`,
    );
    if (choice.kind === "hsFinal") {
      const t = pendingFinal(r);
      if (t) t.result = "준우승";
      news.push(`${r && r.collegeCups ? r.team : player.school}, ${choice.stage.replace(" 결승", "")} 준우승`);
    } else if (choice.kind === "game7" || choice.kind === "seriesHero") {
      news.push(`${player.team}, ${choice.series || choice.stage.replace(" 우승 결정전", "")} 준우승`);
    }
  }
  return news;
}

// =============================================
// 11. 월별 순위 (그래프용)
// =============================================
const SEASON_MONTHS = [4, 5, 6, 7, 8, 9];

function addMonthlyStandings(standing, games, report) {
  // 호주리그는 겨울(11~1월) 리그, 대학 U-리그는 4~5월 조별리그
  const MONTHS = report.league === "ABL" ? [11, 12, 1] : report.league === "COLLEGE" ? [4, 5] : SEASON_MONTHS;
  const n = MONTHS.length;
  const perMonth = games / n;
  const order = standing.table.map((t) => t.team);
  const wins = {};
  for (const t of standing.table) {
    const pct = t.w / games;
    // 달마다 승률이 출렁이지만 시즌 합계는 실제 성적과 같음
    const shares = MONTHS.map(() => clamp(pct + (Math.random() + Math.random() - 1) * 0.18, 0.15, 0.85) * perMonth);
    const scale = t.w / shares.reduce((s, x) => s + x, 0);
    let acc = 0;
    wins[t.team] = shares.map((x) => Math.round((acc += x * scale)));
    wins[t.team][n - 1] = t.w;
  }
  const ranks = {};
  order.forEach((t) => (ranks[t] = []));
  for (let m = 0; m < n; m++) {
    const sorted = [...order].sort((a, b) => wins[b][m] - wins[a][m] || order.indexOf(a) - order.indexOf(b));
    sorted.forEach((t, i) => ranks[t].push(i + 1));
  }
  standing.monthly = { months: MONTHS, ranks, wins, perMonth: Math.round(perMonth) };

  // 내 월별 성적 (타율 또는 평균자책)
  const rec = report.bat || report.pit;
  if (rec && rec.G) {
    const isBat = !!report.bat;
    const base = isBat ? rec.AVG : rec.ERA;
    // 계절 특성 있으면 그 시기에 몰아서 잘함 (extra.js makeSplits)
    const sp = report.splits && report.splits.f.length === n ? report.splits.f : null;
    const f = sp || MONTHS.map(() => 0.7 + Math.random() * 0.6);
    const mean = f.reduce((s, x) => s + x, 0) / n;
    const value = (x) => (sp && !isBat ? base / x : (base * x) / mean);
    standing.myMonthly = { label: isBat ? "월별 타율" : "월별 평균자책", isBat, values: f.map(value) };
  }
}

// 결정적 순간을 고르기 전까지 우승 소식을 숨김 (시즌 결과·기사·기록에서 잠시 빼기)
function holdChampion(player, report, name) {
  const i = report.awards.indexOf(name);
  if (i >= 0) report.awards.splice(i, 1);
  if (player.awards[name] > 1) player.awards[name]--;
  else delete player.awards[name];
  const h = player.history[player.history.length - 1];
  if (h) h.awards = h.awards.filter((a, k) => a !== name || k !== h.awards.indexOf(name));
  report.specials = report.specials.filter((sp) => !(sp.key === "champion" && sp.award === name));
  if (report.news) report.news = report.news.filter((n) => !n.includes(name));
}

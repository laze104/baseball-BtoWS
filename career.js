// =============================================
// career.js : 시즌 하나를 진행하고 커리어를 이어가는 규칙
// (국가대표 → 이벤트 → 시뮬레이션 → 순위·수상 → 성장 → 연봉 → 다음 단계)
// =============================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const TOP_LEAGUES = ["KBO", "NPB", "MLB"];
const PRO_LEAGUES = ["KBO2", "KBO", "NPB", "MLB"];

// 리그 순위 1위 기준선 (이 값이면 대략 리그 1위)
const AWARD_LINE = {
  KBO: { war: 7, hr: 33, avg: 0.34, rbi: 110, ops: 0.98, sb: 40, w: 16, k: 180, sv: 36, hld: 30, era: 2.6 },
  NPB: { war: 7, hr: 33, avg: 0.33, rbi: 100, ops: 0.95, sb: 35, w: 15, k: 180, sv: 38, hld: 35, era: 2.3 },
  MLB: { war: 8, hr: 42, avg: 0.325, rbi: 115, ops: 1.0, sb: 45, w: 17, k: 230, sv: 40, hld: 32, era: 2.6 },
};

// 예전 저장 데이터나 새 선수에 커리어 정보를 채워줘요
function initCareer(player) {
  if (!player.league) player.league = "HS";
  if (!player.team) player.team = player.school;
  if (!player.history) player.history = [];
  if (!player.awards) player.awards = {};
  if (player.proSeasons === undefined) player.proSeasons = 0;
  if (player.bestOvr === undefined) player.bestOvr = getOvrs(player).best;
  if (player.retired === undefined) player.retired = false;
  if (player.pendingChoice === undefined) player.pendingChoice = null;
  if (!player.choiceQueue) player.choiceQueue = [];
  if (!player.leagueSeasons) player.leagueSeasons = {};
  if (player.money === undefined) player.money = 0;
  if (!player.owned) player.owned = [];
  if (player.fame === undefined) player.fame = 0;
  if (!player.rival) player.rival = createRival(player);
  initRules(player);   // 1군 등록 시즌 등 (rules.js)
  initLegacy(player);  // 성장유형 (legacy.js)
  initWorld(player);   // 숨은 특성, 전담 스태프 계약 (world.js)
  if (!player.contract && !isAmateur(player.league)) {
    player.contract = makeContract(player.league, player.team, 1, minSalary(player.league, player), 0);
  }
  return player;
}

// 선택지가 여러 개 생기면 줄 세워서 하나씩 보여줘요
function pushChoice(player, choice) {
  if (!player.pendingChoice) player.pendingChoice = choice;
  else player.choiceQueue.push(choice);
}

function nextChoice(player) {
  player.pendingChoice = player.choiceQueue.shift() || null;
}

// 타자 OVR, 투수 OVR, 둘 중 높은 값
function getOvrs(player) {
  const [first, second] = player.position.split(" 겸 ");
  const result = { bat: null, pit: null };
  if (player.type === "batter") result.bat = calcOvr(player.stats, BATTER_STATS, first);
  if (player.type === "pitcher") result.pit = calcOvr(player.stats, PITCHER_STATS, first);
  if (player.type === "twoway") {
    result.pit = calcOvr(player.stats, PITCHER_STATS, first);
    result.bat = calcOvr(player.stats, BATTER_STATS, second);
  }
  result.best = Math.max(result.bat || 0, result.pit || 0);
  return result;
}

// ---------------------------------------------
// 1. 출전 계획
// ---------------------------------------------
function batterPlan(player, ovr) {
  const league = LEAGUES[player.league];
  const share = player.type === "twoway" ? 0.75 : 1;
  if (isAmateur(player.league)) {
    // 야구 명문대는 주전 경쟁이 치열해서 1~2학년 때는 벤치일 수도 있어요
    if (collegeBench(player, ovr)) return { label: "백업", games: Math.round(18 * share), pa: 2.8 };
    return { label: "주전", games: Math.round(30 * share), pa: 4.3 };
  }
  let starterLine = player.league === "KBO" || TOP_LEAGUES.includes(player.league) ? league.level - 2 : league.level - 8;
  if (player.starterPromise) starterLine -= 3; // 감독이 주전을 약속했어요 (면담)
  if (ovr >= starterLine) {
    // 1번 타자는 타석이 많고, 4번 타자는 주자 있을 때 타석이 많아요
    if (player.lineup === "leadoff") return { label: "주전 · 1번 타자", games: Math.round(league.games * 0.95 * share), pa: 4.6 };
    if (player.lineup === "cleanup") return { label: "주전 · 4번 타자", games: Math.round(league.games * 0.95 * share), pa: 4.3 };
    return { label: "주전", games: Math.round(league.games * 0.93 * share), pa: 4.2 };
  }
  // 대타 요원: 경기는 많이 나가지만 타석은 경기당 1번 남짓
  if (player.lineup === "pinch") return { label: "백업 · 대타 요원", games: Math.round(league.games * 0.7 * share), pa: 1.3 };
  return { label: "백업", games: Math.round(league.games * 0.55 * share), pa: 2.6 };
}

function pitcherPlan(player, ovr) {
  const league = LEAGUES[player.league];
  const share = player.type === "twoway" ? 0.75 : 1;
  const isStarter = player.position.startsWith("선발");
  if (isAmateur(player.league)) {
    if (collegeBench(player, ovr)) return { label: "백업", role: "setup", games: 8 };
    return isStarter ? { label: "선발", role: "starter", games: 10 } : { label: "불펜", role: "setup", games: 15 };
  }
  const regular = ovr >= league.level - 2;
  if (isStarter) {
    const starts = regular ? Math.round(league.games / 5.3) : Math.round(league.games / 12);
    return { label: regular ? "선발 로테이션" : "대체 선발", role: "starter", games: Math.round(starts * share) };
  }
  // 마무리: 실력이 압도적이거나, 면담에서 마무리를 맡기로 했다면 (리그 수준 +2 이상일 때)
  if (ovr >= league.level + 6 || (player.role === "closer" && (ovr >= league.level + 2 || player.closerOffer))) {
    return { label: "마무리", role: "closer", games: Math.round(league.games * 0.42 * share) };
  }
  return { label: regular ? "필승조" : "추격조", role: "setup", games: Math.round(league.games * (regular ? 0.42 : 0.25) * share) };
}

// ---------------------------------------------
// 2. 시즌 진행 (핵심 함수)
// ---------------------------------------------
function runSeason(player, focusKeys) {
  if (player.league === "SOCIAL") return serviceSeason(player, focusKeys); // 사회복무는 경기가 없어요
  const league = LEAGUES[player.league];
  const report = {
    age: player.age, year: gameYear(player), league: player.league, team: player.team,
    events: [], specials: [], awards: [], bat: null, pit: null,
  };

  // (1) 국가대표 대회 / 팀 집중
  let mod = 0;
  let extraInjury = 0;
  if (player.nationalPlan) {
    playNationalEvent(player, report);
    mod -= 2; // 대회 피로
    extraInjury = 0.05;
  } else if (player.teamFocus) {
    mod += 2; // 팀에만 집중해서 컨디션 UP
    report.events.push("팀 집중");
  }
  player.nationalPlan = null;
  player.teamFocus = false;

  // 인터뷰·사생활 선택의 여파, 새 포지션 적응
  if (player.nextMod) {
    mod += player.nextMod;
    report.events.push(player.nextMod > 0 ? "감독 신뢰" : "멘탈 흔들림");
    player.nextMod = 0;
  }
  mod += hiddenMod(player, report); // 숨은 특성·회춘 (world.js)
  resolveCampWish(player, report, mod); // 감독 면담 '캠프 경쟁' 결과 (world.js)
  if (player.positionAdjust) {
    mod -= 2;
    report.events.push("새 포지션 적응");
    player.positionAdjust = false;
  }

  // (2) 랜덤 이벤트
  let gameFactor = 1;
  let injuryChance = (player.type === "twoway" ? 0.16 : 0.08) + extraInjury;
  if (hasItem(player, "rehab")) injuryChance /= 2;
  const resting = player.restPlan === player.team; // 감독 면담: 베테랑 체력 관리
  if (resting) injuryChance *= 0.5;
  if (hasItem(player, "recovery")) injuryChance *= 0.8; // 회복 장비
  const restFactor = resting ? 0.9 : 1;
  if (Math.random() < injuryChance) {
    gameFactor = 0.4 + Math.random() * 0.4;
    report.events.push("부상");
    report.specials.push({ key: "injury" });
  }
  if (player.type === "twoway" && Math.random() < 0.03) {
    mod += 12;
    report.events.push("이도류 각성");
    report.specials.push({ key: "twowayAwaken" });
  } else if (Math.random() < 0.05) {
    mod += 5; // 각성 (예전 +8 → +5: 능력치가 성적을 더 많이 좌우하게)
    report.events.push("각성");
    report.specials.push({ key: "awaken" });
  } else if (Math.random() < (hasItem(player, "mental") ? 0.03 : 0.06)) {
    mod -= 5; // 슬럼프 (멘탈 코치가 있으면 확률 절반)
    report.events.push("슬럼프");
  }

  // (3) 시뮬레이션
  const ovrs = getOvrs(player);
  if (ovrs.bat !== null) {
    const plan = batterPlan(player, ovrs.bat);
    const batPos = player.position.split(" 겸 ").pop();
    report.bat = steadyBattingSeason(player.stats, league.level, Math.round(plan.games * gameFactor * restFactor), plan.pa, mod, batPos, LEAGUE_ENV[player.league]);
    report.bat.role = plan.label;
    if (plan.label.startsWith("주전")) lineupEffect(player, report.bat); // 타순 (world.js)
  }
  if (ovrs.pit !== null) {
    const plan = pitcherPlan(player, ovrs.pit);
    report.pit = steadyPitchingSeason(player.stats, league.level, plan.role, Math.round(plan.games * gameFactor * restFactor), mod, LEAGUE_ENV[player.league]);
    report.pit.role = plan.label;
  }
  report.WAR = round((report.bat ? report.bat.WAR : 0) + (report.pit ? report.pit.WAR : 0), 1);
  report.gameFactor = gameFactor; // 1군 등록일수 계산용

  // (4) 팀 순위, 리그 기록 순위, 수상
  teamStanding(player, report);
  statRanks(player, report);
  checkAwards(player, report);
  rivalSeason(player, report); // 라이벌도 같은 해 시즌을 보내요

  // (5) 성장
  report.gains = growPlayer(player, focusKeys, report);
  maybeRevival(player, report); // 30대 회춘 (world.js)
  player.lastFocus = focusKeys;

  // (6) 연봉 받기
  if (!isAmateur(player.league)) report.salary = payday(player, report);

  // (7) 기록 남기기
  player.leagueSeasons[player.league] = (player.leagueSeasons[player.league] || 0) + 1;
  player.history.push({
    season: player.season, age: player.age, year: report.year, league: player.league, team: player.team,
    bat: report.bat, pit: report.pit, WAR: report.WAR, awards: report.awards.slice(), events: report.events.slice(),
    standing: report.standing && { rank: report.standing.rank, teams: report.standing.teams, w: report.standing.w, l: report.standing.l, group: report.standing.group, seed: report.standing.seed },
  });

  // (8) 나이 먹고 다음 단계로
  player.age += 1;
  player.season += 1;
  moveCareer(player, report);
  callNationalTeam(player, report);
  checkMilitary(player, report);
  player.bestOvr = Math.max(player.bestOvr, getOvrs(player).best);

  // (9) 기사와 팬 반응, 그리고 야구 밖의 이야기 (story.js)
  beforeFeedStory(player, report);
  buildFeed(player, report);
  afterSeasonStory(player, report);
  return report;
}

// ---------------------------------------------
// 3. 팀 순위와 리그 기록 순위
// ---------------------------------------------
// teamStanding은 world.js에 있어요 (지구·리그별 순위)

// 값이 기준선과 얼마나 먼지로 리그 순위를 추정해요
function estimateRank(value, line, step, lowerIsBetter) {
  const gap = lowerIsBetter ? value - line : line - value;
  return Math.max(1, 1 + Math.round(gap / step)); // 성적만으로 정해요
}

function statRanks(player, report) {
  const line = AWARD_LINE[player.league];
  if (!line) return;
  const games = LEAGUES[player.league].games;
  const ranks = [];
  const b = report.bat;
  const p = report.pit;
  if (b && b.PA > 0) {
    const qualified = b.PA >= games * 3.1; // 규정타석
    if (qualified) ranks.push({ label: "타율", key: "avg", rank: estimateRank(b.AVG, line.avg, 0.006) });
    ranks.push({ label: "홈런", key: "hr", rank: estimateRank(b.HR, line.hr, 2) });
    ranks.push({ label: "타점", key: "rbi", rank: estimateRank(b.RBI, line.rbi, 4) });
    if (qualified) ranks.push({ label: "OPS", key: "ops", rank: estimateRank(b.OPS, line.ops, 0.02) });
    ranks.push({ label: "도루", key: "sb", rank: estimateRank(b.SB, line.sb, 3) });
  }
  if (p && p.G > 0) {
    const qualified = p.outs / 3 >= games; // 규정이닝
    if (qualified) ranks.push({ label: "평균자책", key: "era", rank: estimateRank(p.ERA, line.era, 0.15, true) });
    ranks.push({ label: "승리", key: "w", rank: estimateRank(p.W, line.w, 1) });
    ranks.push({ label: "탈삼진", key: "k", rank: estimateRank(p.K, line.k, 8) });
    if (p.SV) ranks.push({ label: "세이브", key: "sv", rank: estimateRank(p.SV, line.sv, 2) });
    if (p.HLD) ranks.push({ label: "홀드", key: "hld", rank: estimateRank(p.HLD, line.hld, 2) });
  }
  ranks.push({ label: "WAR", key: "war", rank: estimateRank(report.WAR, line.war, 0.4) });
  report.ranks = ranks;
}

// ---------------------------------------------
// 4. 수상과 우승
// ---------------------------------------------
function addAward(player, report, name) {
  player.awards[name] = (player.awards[name] || 0) + 1;
  report.awards.push(name);
  report.specials.push({ key: "award", award: name });
}

const TITLE_NAMES = { hr: "홈런왕", avg: "타격왕", rbi: "타점왕", sb: "도루왕", w: "다승왕", k: "탈삼진왕", sv: "세이브왕", hld: "홀드왕", era: "평균자책점왕" };

function checkAwards(player, report) {
  const lg = player.league;

  // 우승
  if (lg === "HS") {
    playHsTournaments(player, report); // 이마트배, 황금사자기, 청룡기, 대통령배, 봉황대기 (story.js)
  } else if (lg === "COLLEGE") {
    playCollegeTournaments(player, report); // U-리그 왕중왕전, 선수권, 대통령기 (story.js)
  } else {
    checkChampion(player, report); // 포스트시즌 시드별 우승 확률 (world.js)
  }

  allStar(player, report); // 올스타 (world.js)

  if (!TOP_LEAGUES.includes(lg) || !report.ranks) return;

  // 타이틀: 리그 1위 기록
  for (const r of report.ranks) {
    if (r.rank === 1 && TITLE_NAMES[r.key]) addAward(player, report, TITLE_NAMES[r.key]);
  }
  // MVP·신인왕·골든글러브·베스트나인·실버슬러거·골드글러브·투수상 (world.js)
  seasonAwards(player, report);
}

// ---------------------------------------------
// 5. 성장 (집중 안 한 능력치는 떨어질 수도 있어요)
// ---------------------------------------------
function baseGrowth(age) {
  if (age <= 18) return 1.5;
  if (age <= 23) return 1.2;
  if (age <= 27) return 0.6;
  if (age <= 31) return 0.2;
  if (age <= 34) return -1;
  return -2;
}

function growPlayer(player, focusKeys, report) {
  let base = typedGrowth(player); // 성장유형 반영 (legacy.js)
  base = adjustGrowthBase(player, base); // 회춘·전담 셰프 (world.js)
  if (player.type === "twoway" && base > 0) base *= 0.7;
  let bonus = 0;
  if (report.WAR >= 4) bonus += 1;
  if (report.events.includes("각성")) bonus += 1;
  if (report.events.includes("이도류 각성")) bonus += 5;
  const focusBonus = hasItem(player, "trainer") ? 1 : 0;

  const gains = {};
  for (const key of Object.keys(player.stats)) {
    let growth;
    if (focusKeys.includes(key)) {
      // 나이가 들수록 훈련 효과가 줄어요
      const ageFactor = player.age >= 36 ? 0.25 : player.age >= 32 ? 0.5 : 1;
      growth = base * (0.5 + Math.random()) + bonus + (1.5 + Math.random() * 1.5 + focusBonus) * ageFactor;
    } else {
      growth = base * (0.5 + Math.random()) + bonus;
      // 훈련을 안 하면 감이 떨어질 수 있어요 (고교 때는 덜)
      const decay = (player.age <= 18 ? 0.1 : 0.2) * (hasItem(player, "gym") ? 0.5 : 1); // 개인 훈련장이 있으면 절반
      if (Math.random() < decay) growth -= 1;
    }
    const before = player.stats[key];
    if (growth > 0 && before >= 70) growth *= 0.5;
    if (growth > 0 && before >= 85) growth *= 0.5;
    player.stats[key] = clamp(Math.round(before + growth), 1, 99);
    gains[key] = player.stats[key] - before;
  }
  return gains;
}

// ---------------------------------------------
// 6. 커리어 이동 (드래프트, 콜업, FA, 해외, 은퇴)
// ---------------------------------------------
function draftScore(player, report) {
  const school = HIGH_SCHOOLS.find((s) => s.name === player.school);
  const schoolBonus = player.league === "HS" && school ? school.level * 2 : 0; // 강팀은 스카우트 노출이 많아요
  const twowayBonus = player.type === "twoway" ? 4 : 0;
  const collegeBonus = player.league === "COLLEGE" ? 3 : 0; // 대학에서 검증된 선수
  const warBonus = clamp((report.WAR || 0) * 1.5, 0, 6);   // 졸업반 성적
  const cupBonus = hsCupBonus(report);                     // 전국대회 성적
  return Math.round(getOvrs(player).best + schoolBonus + collegeBonus + twowayBonus + warBonus + cupBonus);
}

// 고교 전국대회 성적 보너스: 우승 2, 준우승 1.5, 4강 1, 8강 0.5 (최대 4)
function hsCupBonus(report) {
  const cups = report.hsTournaments || report.collegeCups;
  if (!cups) return 0;
  const pts = { "우승": 2, "준우승": 1.5, "결승 진출": 1.5, "4강": 1, "8강": 0.5 };
  return Math.min(4, cups.reduce((sum, t) => sum + (pts[t.result] || 0), 0));
}

function joinDraft(player, report, round) {
  player.league = "KBO2";
  player.team = pick(TEAMS.KBO);
  player.draftRound = round;
  const bonus = Math.round(MONEY.draftBonus[round - 1] * priceIndex(player) * (0.8 + Math.random() * 0.4));
  player.contract = makeContract("KBO2", player.team, 1, minSalary("KBO2", player), 0);
  addMoney(player, bonus);
  report.specials.push({ key: round === 1 ? "draftTop" : "draft", round, team: player.team, bonus: fmtMoney(bonus) });
  if (player.type === "twoway") {
    pushChoice(player, {
      key: "twoway",
      text: `${player.team} 코칭스태프가 묻습니다. "프로에서도 이도류를 계속할 건가?"`,
      options: [
        { id: "keep", label: "이도류 유지 (힘들지만 대박 가능)" },
        { id: "batter", label: "타자에 전념" },
        { id: "pitcher", label: "투수에 전념" },
      ],
    });
  }
}

function moveCareer(player, report) {
  const ovr = getOvrs(player).best;
  const lg = player.league;

  if (lg === "HS" && player.age >= 19) {
    hsDraft(player, report); // 지명되면 입단 또는 대학 진학 선택 (rules.js)
  } else if (lg === "COLLEGE" && player.age >= 23) {
    collegeDraft(player, report); // 대학 4학년 끝 → 대졸 드래프트
  } else if (lg === "INDIE" || lg === "ABL") {
    indieToPro(player, report); // 드래프트 또는 육성선수 계약 (rules.js)
  } else if (lg === "KBO2" || lg === "KBO") {
    player.proSeasons++;
    countKboService(player, report); // 1군 등록 145일 이상이면 FA 1시즌 (rules.js)
    const c = player.contract;
    let faNow = false;
    if (c && c.isFA) {
      c.years--;
      if (c.years <= 0) {
        if (isKboFaEligible(player)) {
          pushChoice(player, faChoice(player, faText(player, "계약이 끝나고 FA 재자격을 얻었어요!")));
          faNow = true;
        } else {
          renewAfterFa(player, report); // 재자격(1군 4시즌) 전이라 원소속팀과 1년 재계약
        }
      }
    } else {
      negotiateSalary(player);
      if (isKboFaEligible(player)) {
        pushChoice(player, faChoice(player, faText(player, "FA 자격을 얻었어요!")));
        faNow = true;
      }
    }
    if (!faNow) maybePosting(player, report); // 1군 7시즌 + 구단 동의면 포스팅
    // 콜업과 강등
    const kboLevel = LEAGUES.KBO.level;
    if (lg === "KBO2" && (ovr >= kboLevel - 3 || (report.WAR >= 2.5 && ovr >= kboLevel - 8))) {
      player.league = "KBO";
      if (player.contract) player.contract.league = "KBO";
      report.specials.push({ key: "callup" });
    } else if (lg === "KBO" && ovr < kboLevel - 10) {
      player.league = "KBO2";
      if (player.contract) player.contract.league = "KBO2";
      report.specials.push({ key: "demote" });
    }
  } else if (lg === "MILB") {
    milbTick(player, report); // 콜업 또는 방출 (world.js)
  } else if (lg === "SANGMU" || lg === "SOCIAL") {
    serviceTick(player, report); // 복무 2년이 끝나면 원래 팀으로
  } else if (lg === "NPB" || lg === "MLB") {
    const c = player.contract;
    c.years--;
    if (lg === "MLB") player.mlbService = (player.mlbService || 0) + 1; // 부상자 명단도 서비스타임에 들어가요
    if (ovr < LEAGUES[lg].level - 10) {
      // 방출: 국내 복귀 제안
      report.specials.push({ key: "uturn" });
      pushChoice(player, faChoice(player, `해외 팀에서 방출됐어요.${player.kboRights ? ` KBO로 돌아가려면 보류권을 가진 ${player.kboRights}하고만 계약할 수 있어요.` : ""}`));
    } else if (c.years <= 0) {
      if (lg === "MLB") mlbContractEnd(player, report); // 서비스타임 6년 전이면 연봉조정·논텐더 (rules.js)
      else pushChoice(player, faChoice(player, "NPB 계약이 끝났어요. 외국인 선수라 자유롭게 다음 행선지를 고를 수 있어요."));
    }
  }

  // 은퇴할 수밖에 없는 상황
  const isPro = PRO_LEAGUES.includes(player.league);
  const mustRetire =
    player.age >= 42 ||
    (isPro && ovr < 45 && player.age >= 30) ||
    ((player.league === "INDIE" || player.league === "ABL") && player.age >= 28);
  if (mustRetire) {
    player.choiceQueue = [];
    player.pendingChoice = {
      key: "forcedRetire",
      text: "더 이상 불러주는 팀이 없어요. 유니폼을 벗을 때가 됐어요.",
      options: [{ id: "retire", label: "은퇴하기" }],
    };
  }
}

// 선택지 버튼을 눌렀을 때
function resolveChoice(player, id) {
  const choice = player.pendingChoice;
  const option = choice.options.find((o) => o.id === id);
  nextChoice(player);
  const news = [];

  if (id === "retire") {
    retirePlayer(player);
    news.push(fillText(NEWS.special.retire, player, {}));
    return news;
  }

  if (choice.key === "undrafted" && id === "COLLEGE") {
    enterCollege(player); // 대학 고르기 선택지가 이어져요 (rules.js)
    news.push(`${player.name}, 대학 진학 결심… 대학에서 다시 프로를 노린다`);
  } else if (choice.key === "undrafted") {
    player.league = id;
    player.team = pick(TEAMS[id]);
    player.contract = makeContract(id, player.team, 1, minSalary(id, player), 0);
    news.push(`${player.name}, ${LEAGUES[id].name} ${player.team} 입단`);
  } else if (choice.key === "twoway") {
    if (id !== "keep") {
      const [first, second] = player.position.split(" 겸 ");
      player.type = id;
      player.position = id === "batter" ? second : first;
      player.style = id === "batter" ? "교타자" : "파이어볼러";
      news.push(fillText(NEWS.special.focus, player, { side: id === "batter" ? "타자" : "투수" }));
    } else {
      news.push(`${player.name}, "이도류 포기 안 한다" 정면 돌파 선언`);
    }
  } else if (choice.key === "fa" && id === "nofile") {
    player.contract = makeContract(player.league, player.team, 1, player.contract ? player.contract.salary : minSalary(player.league, player), 0);
    negotiateSalary(player);
    news.push(`${player.name}, FA 신청 안 해… ${player.team}과 1년 더 동행`);
  } else if (choice.key === "fa") {
    const o = option.offer;
    const stayed = o.team === player.team;
    const oldTeam = player.team;
    signContract(player, o);
    if (o.mega) player.megaSigned = true; // 업적용
    const values = { team: o.team, total: fmtMoney(o.total), years: o.years };
    if (stayed) news.push(fillText(NEWS.special.stay, player, values));
    else if (o.league === "KBO") news.push(fillText(NEWS.special.fa, player, values));
    else news.push(fillText(NEWS.special.overseas, player, values));
    news.push(`계약 조건: ${o.years}년 총액 ${fmtMoney(o.total)}${o.bonus ? ` (계약금 ${fmtMoney(o.bonus)})` : ""}`);
    const move = franchiseMoveNews(player, oldTeam);
    if (move) news.push(move.line);
  } else if (choice.key === "closerOffer") {
    news.push(...resolveCloserOffer(player, choice, option));
  } else if (choice.key === "managerTalk") {
    news.push(...resolveManagerTalk(player, choice, option));
  } else if (choice.key === "mlbDirect") {
    news.push(...resolveMlbDirect(player, choice, option));
  } else if (choice.key === "national" && id === "nretire") {
    news.push(retireNational(player));
  } else if (choice.key === "national") {
    if (id === "join") {
      player.nationalPlan = choice.eventId;
      news.push(fillText(NEWS.special.national, player, { event: choice.eventName }));
    } else {
      player.teamFocus = true;
      news.push(`${player.name}, ${choice.eventName} 대표팀 고사… "소속팀에 집중하겠다"`);
    }
  } else {
    news.push(...resolveStoryChoice(player, choice, option)); // 병역, 포지션, 인터뷰·사생활
  }
  return news;
}

// ---------------------------------------------
// 7. 은퇴와 랭킹
// ---------------------------------------------
const RANKING_KEY = "baseball-ranking";

// 통산 기록 (고교 제외)
function careerTotals(player, leagueFilter) {
  const t = {
    G: 0, PA: 0, AB: 0, H: 0, D: 0, T: 0, HR: 0, RBI: 0, R: 0, SB: 0, BB: 0, K: 0,
    pG: 0, GS: 0, W: 0, L: 0, SV: 0, HLD: 0, outs: 0, pH: 0, pHR: 0, pBB: 0, pK: 0, pR: 0, ER: 0, WAR: 0,
  };
  for (const h of player.history) {
    if (isAmateur(h.league)) continue;
    if (leagueFilter && !leagueFilter.includes(h.league)) continue;
    t.WAR += h.WAR;
    if (h.bat) for (const k of ["G", "PA", "AB", "H", "D", "T", "HR", "RBI", "R", "SB", "BB", "K"]) t[k] += h.bat[k] || 0;
    if (h.pit) {
      t.pG += h.pit.G; t.GS += h.pit.GS || 0; t.W += h.pit.W; t.L += h.pit.L; t.SV += h.pit.SV; t.HLD += h.pit.HLD;
      t.outs += h.pit.outs; t.pH += h.pit.H; t.pHR += h.pit.HR; t.pBB += h.pit.BB; t.pK += h.pit.K; t.pR += h.pit.R; t.ER += h.pit.ER;
    }
  }
  t.WAR = round(t.WAR, 1);
  const TB = t.H + t.D + 2 * t.T + 3 * t.HR;
  t.AVG = t.AB ? t.H / t.AB : 0;
  t.OBP = t.PA ? (t.H + t.BB) / t.PA : 0;
  t.SLG = t.AB ? TB / t.AB : 0;
  t.OPS = t.OBP + t.SLG;
  t.ERA = t.outs ? (t.ER * 27) / t.outs : 0;
  t.WHIP = t.outs ? ((t.pH + t.pBB) * 3) / t.outs : 0;
  return t;
}

function retirePlayer(player) {
  player.retireNews = retireStory(player); // 프랜차이즈 스타는 영구결번
  player.retired = true;
  runHofVote(player); // 명예의 전당 투표 (legacy.js)
  player.retireAchievements = checkAchievements(player);
  player.pendingChoice = null;
  player.choiceQueue = [];
  const t = careerTotals(player);
  const count = (pattern) =>
    Object.entries(player.awards).filter(([k]) => k.includes(pattern)).reduce((s, [, v]) => s + v, 0);
  const entry = {
    name: player.name, type: player.type, school: player.school, retireAge: player.age,
    bestOvr: player.bestOvr, WAR: t.WAR, HR: t.HR, AVG: t.AVG, W: t.W, SV: t.SV,
    MVP: count("MVP"), champs: count("시리즈 우승"), national: player.awards["국가대표"] || 0,
    money: player.money, leagues: Object.keys(player.leagueSeasons), nickname: player.nickname || "",
  };
  entry.score = entry.MVP * 10 + entry.champs * 5 + entry.WAR;
  // 랭킹에서 눌러 볼 수 있게 시즌별 기록도 같이 저장해요 (용량 아끼려고 필요한 것만)
  entry.history = player.history.map((h) => ({ year: h.year, age: h.age, league: h.league, team: h.team, bat: h.bat, pit: h.pit, WAR: h.WAR }));
  entry.awards = { ...player.awards };
  entry.nicknames = player.nicknames || [];
  entry.hof = player.hof && player.hof.inducted;
  const ranking = loadRanking();
  ranking.push(entry);
  ranking.sort((a, b) => b.WAR - a.WAR); // 역대 랭킹은 통산 WAR 순
  const top = ranking.slice(0, 50);
  try { localStorage.setItem(RANKING_KEY, JSON.stringify(top)); } catch (e) {
    // 저장 공간이 모자라면 11위 아래는 시즌별 기록을 빼고 저장해요
    top.forEach((r, i) => { if (i >= 10) { delete r.history; delete r.awards; } });
    try { localStorage.setItem(RANKING_KEY, JSON.stringify(top)); } catch (e2) {}
  }
}

function loadRanking() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(RANKING_KEY)) || []; } catch (e) {}
  return list.sort((a, b) => b.WAR - a.WAR);
}

// 명문대(전력 3)에서 실력이 아직 모자라면 벤치 (대학 리그 수준 + 5 미만)
function collegeBench(player, ovr) {
  return player.league === "COLLEGE" && (player.collegeTier || 2) === 3 && ovr < LEAGUES.COLLEGE.level + 5;
}

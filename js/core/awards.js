// =============================================
// awards.js : 시즌 시상식과 올스타
// MVP, 신인왕, 골든글러브, 베스트나인, 실버슬러거, 골드글러브, 투수상, 올스타
// 타이틀(홈런왕 등)과 우승 기록은 career.js checkAwards
// =============================================

// 이름에 pattern이 들어간 상을 몇 번 받았는지 (예: "MVP", "메달")
function countAward(player, pattern) {
  return Object.entries(player.awards || {})
    .filter(([name]) => name.includes(pattern))
    .reduce((sum, [, count]) => sum + count, 0);
}

// 실제 리그 기준 (리그 최고 수준 선수의 성적)
// mvp: 보통 MVP 경쟁자 점수, pitcher: 투수상 경쟁자 점수
const AWARD_RACE = {
  KBO: { mvp: 8.4, pitcher: 6.6, allstar: 3.9, pitcherAward: "최동원상" },
  NPB: { mvp: 7.6, pitcher: 6.4, allstar: 4.0, pitcherAward: "사와무라상" },
  MLB: { mvp: 8.7, pitcher: 7.0, allstar: 4.4, pitcherAward: "사이영상" },
};

// 포지션별 골든글러브(베스트나인) 경쟁자 점수: 그 포지션 1등의 보통 성적
const POSITION_RACE = { "포수": 3.4, "1루수": 4.2, "2루수": 4.0, "3루수": 4.3, "유격수": 4.3, "외야수": 3.6, "지명타자": 3.2, "투수": 6.0 };
// 실버슬러거: 포지션별로 이 정도 OPS면 경쟁권 (리그 평균 대비 배율)
const SLUGGER_RACE = { "포수": 1.08, "1루수": 1.22, "2루수": 1.1, "3루수": 1.17, "유격수": 1.1, "외야수": 1.17, "지명타자": 1.24 };

function isPitchingQualified(p, games) {
  return p.outs / 3 >= games || p.W >= 10 || p.SV >= 30 || p.HLD >= 30;
}

// 종합 임팩트 점수: WAR + 타이틀 + 굵직한 기록 + 팀 성적 + 인기
function impactScore(player, report) {
  const line = AWARD_LINE[report.league];
  const b = report.bat;
  const p = report.pit;
  let s = report.WAR;
  const titles = report.awards.filter((a) => Object.values(TITLE_NAMES).includes(a));
  s += titles.length * 0.35;
  if (b && b.G) {
    if (b.HR >= line.hr) s += 0.8;
    if (b.HR >= 40 && b.SB >= 40)
      s += 2.5; // 40-40
    else if (b.HR >= 30 && b.SB >= 30) s += 1;
    if (b.AVG >= line.avg && b.PA >= LEAGUES[report.league].games * 3.1) s += 0.5;
    if (b.RBI >= line.rbi) s += 0.5;
    if (["홈런왕", "타격왕", "타점왕"].every((t) => titles.includes(t))) s += 2.5; // 타격 3관왕
  }
  if (p && p.G) {
    if (p.W >= line.w) s += 0.8;
    if (p.ERA <= line.era && p.outs / 3 >= LEAGUES[report.league].games) s += 0.8;
    if (p.SV >= line.sv) s += 0.6;
    if (["다승왕", "평균자책점왕", "탈삼진왕"].every((t) => titles.includes(t))) s += 2.5; // 투수 3관왕
  }
  if (report.standing) {
    if (report.standing.seed === 1) s += 0.6;
    else if (report.standing.seed) s += 0.3;
    else s -= 0.4; // 가을야구 못 간 팀은 표가 덜 옴
  }
  s += clamp((player.fame || 0) / 100, -0.3, 0.6); // 기자단도 사람이라 인기가 조금 반영됨
  return s;
}

// 리그 이름 붙이기 (NPB·MLB는 리그가 2개라 상도 리그별)
function awardLeague(report) {
  return report.standing && report.standing.leagueName ? report.standing.leagueName : report.league;
}

function batPosition(player) {
  if (player.type === "pitcher") return null;
  return player.position.split(" 겸 ").pop();
}

// 수상 레이스: 내 점수가 기준(그 상을 받으려면 필요한 점수)을 넘으면 수상
// 확률이 아니라 성적으로만 정해짐. 결과 탭에서 내 점수와 기준을 같이 보여줌
// spread: 그해 경쟁자 수준이 해마다 다름 (같은 성적이어도 경쟁자가 세면 못 받음)
function race(player, report, award, mine, need, unit, spread) {
  if (spread) need += gauss() * spread;
  const won = mine >= need;
  report.races = report.races || [];
  report.races.push({ award, mine: round(mine, unit === "ops" ? 3 : 1), need: round(need, unit === "ops" ? 3 : 1), won, unit });
  if (won) addAward(player, report, award);
  return won;
}

function seasonAwards(player, report) {
  const lg = report.league;
  const rc = AWARD_RACE[lg];
  if (!rc || !report.ranks) return;
  const games = LEAGUES[lg].games;
  const two = lg !== "KBO"; // 리그가 2개면 경쟁자가 절반이라 기준이 조금 낮음
  const b = report.bat && report.bat.G ? report.bat : null;
  const p = report.pit && report.pit.G ? report.pit : null;
  const name = awardLeague(report);
  const impact = impactScore(player, report);
  report.impact = round(impact, 1);
  const extra = impact - report.WAR; // WAR 말고 타이틀·기록·팀 성적·인기로 얻은 점수

  // MVP: WAR + 타이틀 + 굵직한 기록 + 팀 성적
  race(player, report, `${name} MVP`, impact, rc.mvp - (two ? 0.5 : 0), undefined, 1.3);

  // 신인왕: 이 리그 첫 시즌
  if (!player.leagueSeasons[lg]) race(player, report, `${name} 신인왕`, impact, two ? 3.2 : 3.6, undefined, 0.7);

  // 투수상 (최동원상·사와무라상은 선발만, 사이영상은 리그별·마무리도 가능)
  if (p) {
    const starter = p.GS >= 15;
    const okRole = lg === "MLB" ? starter || p.SV >= 40 : starter;
    if (okRole) {
      const pScore = p.WAR + report.awards.filter((a) => ["다승왕", "평균자책점왕", "탈삼진왕"].includes(a)).length * 0.7;
      race(player, report, lg === "MLB" ? `${name} ${rc.pitcherAward}` : rc.pitcherAward, pScore, rc.pitcher - (lg === "MLB" ? 0.4 : 0), undefined, 0.8);
    }
  }

  // 포지션별 상
  const pos = batPosition(player);
  if (lg === "KBO" || lg === "NPB") {
    // KBO 골든글러브, NPB 베스트나인: 그 포지션에서 공격·수비 종합 1등
    const label = lg === "KBO" ? "골든글러브" : `${name} 베스트나인`;
    let won = false;
    if (b && pos && b.G >= games * 0.6) {
      won = race(player, report, `${label} (${pos})`, b.WAR + extra * 0.6, POSITION_RACE[pos] - (pos === "외야수" ? 0.4 : 0), undefined, 0.7);
    }
    if (!won && p && isPitchingQualified(p, games)) {
      race(player, report, `${label} (투수)`, p.WAR + extra * 0.6, POSITION_RACE["투수"], undefined, 0.7);
    }
  }
  if (lg === "MLB" && b && pos && b.PA >= games * 3.1) {
    // 실버슬러거: 포지션별 OPS 1등
    race(player, report, `${name} 실버슬러거 (${pos})`, b.OPS, LEAGUE_ENV.MLB.ops * SLUGGER_RACE[pos], "ops", 0.03);
  }
  // KBO 수비상 (2023년부터): 포지션별 수비 1등
  if (lg === "KBO" && b && pos && pos !== "지명타자" && b.G >= games * 0.6) {
    race(player, report, `KBO 수비상 (${pos})`, (player.stats.defense + player.stats.arm) / 2, LEAGUES.KBO.level + 12);
  }
  if (lg === "MLB" && b && b.PA >= games * 3.1) {
    // 행크 애런상: 리그 최고의 타자 (OPS)
    race(player, report, `${name} 행크 애런상`, b.OPS, LEAGUE_ENV.MLB.ops * 1.38, "ops");
    // 에드가 마르티네스상: 최고의 지명타자
    if (pos === "지명타자") race(player, report, "에드가 마르티네스상", b.OPS, LEAGUE_ENV.MLB.ops * 1.22, "ops");
  }
  // 올해의 구원투수: MLB 마리아노 리베라상(아메리칸리그)·트레버 호프먼상(내셔널리그)
  if (lg === "MLB" && p && p.SV >= 25) {
    const award = name.startsWith("아메리칸") ? "마리아노 리베라상" : "트레버 호프먼상";
    race(player, report, award, p.SV / 10 + (LEAGUE_ENV.MLB.era - p.ERA), 5.5);
  }
  // 올해의 재기상 (MLB·NPB): 작년에 부진·부상·공백이었는데 올해 부활
  if ((lg === "MLB" || lg === "NPB") && player.history.length >= 2) {
    const prev = player.history[player.history.length - 1]; // 아직 올해 기록은 안 들어갔음
    const wasDown = prev.WAR < 1 || ["SANGMU", "SOCIAL"].includes(prev.league) || (prev.events || []).some((e) => e.includes("부상"));
    if (wasDown && !isAmateur(prev.league)) race(player, report, `${name} 올해의 재기상`, report.WAR, lg === "MLB" ? 4.5 : 4);
  }
  // 로베르토 클레멘테상: 야구 실력 + 사회 공헌 (기부·장학재단) + 팬 사랑
  if (lg === "MLB" && !player.awards["로베르토 클레멘테상"] && (hasItem(player, "donation") || hasItem(player, "foundation"))) {
    race(player, report, "로베르토 클레멘테상", report.WAR / 2 + (player.fame || 0) / 20, 6.5); // 평생 한 번
  }

  // 수비상: MLB 골드글러브, NPB 골든글러브 (수비·송구 능력치)
  if (lg === "MLB" || lg === "NPB") {
    const label = lg === "MLB" ? `${name} 골드글러브` : "NPB 골든글러브";
    const level = LEAGUES[lg].level;
    if (b && pos && pos !== "지명타자" && b.G >= games * 0.6) {
      race(player, report, `${label} (${pos})`, (player.stats.defense + player.stats.arm) / 2, level + 12);
    } else if (p && player.stats.fielding !== undefined && p.outs / 3 >= games * 0.8) {
      race(player, report, `${label} (투수)`, player.stats.fielding, level + 14);
    }
  }
}

// 올스타: 성적 + 인기 (팬 투표)
// 4구간 시즌은 전반기 끝(halfBreak)에 allStarHalf 로 미리 뽑고 발표, 시즌 끝엔 그 결과로 상만 줌
function allStar(player, report) {
  const pick = report.allStarPick;
  if (pick) {
    report.fanVote = pick.fanVote;
    report.races = report.races || [];
    report.races.push({ award: pick.award, mine: pick.score, need: pick.need, won: pick.won, unit: undefined });
    if (!pick.won) return;
    addAward(player, report, pick.award);
    if (pick.award !== "올스타") return;
    report.allStar = { fanPick: pick.fanPick, mvp: pick.mvp };
    if (pick.mvp) addAward(player, report, "미스터 올스타");
    return;
  }
  const r = allStarScore(player, report, report.WAR, report.standing, report.gameFactor);
  if (!r) return;
  if (!race(player, report, r.award, r.score, r.need)) return;
  if (r.award !== "올스타") return;
  report.allStar = { fanPick: r.fanPick, mvp: false };
  if (r.mvpReady) {
    addAward(player, report, "미스터 올스타");
    report.allStar.mvp = true;
  }
}

// 올스타 점수: war 는 한 시즌 기준 (전반기면 x2 해서 넘김), st 는 {w, l}
function allStarScore(player, report, war, st, gameFactor) {
  const lg = report.league;
  const rec = report.bat || report.pit;
  if (!rec || !rec.G) return null;
  const fame = player.fame || 0;
  if (lg === "KBO2") return { award: "퓨처스 올스타", score: round(war, 1), need: 1.5 };
  const rc = AWARD_RACE[lg];
  if (!rc) return null;
  // 팬 투표: 팬덤이 큰 팀 + 팀 성적이 좋으면 몰표 (백업 선수는 투표 대상이 잘 안 됨)
  const backup = report.bat && report.bat.role && report.bat.role.startsWith("백업");
  const teamPct = st && st.w + st.l ? st.w / (st.w + st.l) : 0.5;
  const f = teamFandom(report.team) - 3;
  // 팬덤 작은 팀도 감독 추천으로 뽑힐 길이 있어서 불리함은 조금만
  // 실제 올스타는 팀당 4~5명 꼴 → 주전 3명 중 1명 정도. 팬 투표가 성적을 뒤집는 건 인기 구단 + 팬심 높을 때만
  const fanVote = round((f * (f > 0 ? 0.35 : 0.2) + clamp((teamPct - 0.5) * 6, -0.6, 0.8) + fanVoteBonus(player, report.team) * 0.6) * (backup ? 0.3 : 1), 1); // 내 팀 팬심 (fandom.js)
  report.fanVote = fanVote;
  // 부상으로 덜 뛴 해는 조금 봐줌
  let score = war * (gameFactor < 1 ? 1.3 : 1) + clamp(fame / 80, -0.5, 1) + fanVote;
  // 압도적이면 팬덤이 작은 팀이어도 감독 추천·선수단 투표로 무조건 뽑힘
  const dominant = war >= rc.allstar + 1.5 || report.awards.some((a) => Object.values(TITLE_NAMES).includes(a));
  if (dominant) score = Math.max(score, rc.allstar + 0.1);
  const nerve = player.type === "pitcher" ? player.stats.mental : player.stats.clutch;
  return {
    award: "올스타",
    score: round(score, 1),
    need: rc.allstar,
    fanVote,
    fanPick: (fame >= 50 || fanVote >= 1.3) && war >= 2,
    // 미스터 올스타: 압도적인 성적 + 큰 무대 강심장(클러치·멘탈)
    mvpReady: score >= rc.allstar + 4 && nerve >= LEAGUES[lg].level + 15,
  };
}

// 전반기 끝 (flow.js halfBreak): 전반기 성적으로 올스타 발표 + 올스타전
function allStarHalf(player, ctx) {
  const r = ctx.report;
  if (r.allStarPick) return;
  const h = ctx.half1;
  const st = h ? { w: h.w, l: h.l } : null;
  const x = allStarScore(player, r, r.WAR * 2, st, ctx.gameFactor); // 전반기 WAR x2 = 시즌 페이스
  if (!x) return;
  const won = x.score >= x.need;
  const hurt = ctx.inj && ctx.inj.left > 0;
  // 올스타전 MVP: 조건 되는 선수 중에서도 그날 컨디션 (뽑혀도 부상이면 불참)
  const mvp = won && x.award === "올스타" && !hurt && (x.mvpReady ? Math.random() < 0.3 : Math.random() < 0.015); // 실제론 50명 중 1명
  r.allStarPick = { award: x.award, score: x.score, need: x.need, won, fanPick: !!x.fanPick, fanVote: x.fanVote, mvp };
  const lg = LEAGUES[r.league].name;
  r.toasts = r.toasts || [];
  if (!won) {
    if (x.score >= x.need - 0.8) r.news.push(`${lg} 올스타 명단 발표… ${player.name}, 아쉽게 탈락 (막차 경쟁에서 밀려)`);
    return;
  }
  if (x.award === "퓨처스 올스타") {
    r.news.push(`퓨처스 올스타 명단 발표… ${player.name} 이름 올려`);
    r.toasts.push({ icon: "⭐", text: "퓨처스 올스타 선정" });
    return;
  }
  const how = x.fanPick ? "팬 투표 1위로" : x.fanVote >= 0.5 ? "팬 투표로" : "감독 추천으로";
  r.news.push(`${lg} 올스타 명단 발표… ${player.name}, ${how} 별들의 잔치 간다`);
  if (hurt) r.news.push(`${player.name}, 부상으로 올스타전 불참… 대체 선수 발표`);
  else if (mvp) r.news.push(`'미스터 올스타' ${player.name}! 올스타전 MVP… 상금에 자동차까지`);
  r.toasts.push({ icon: "⭐", text: `올스타 선정 (${how})` });
  r.bigMoments = r.bigMoments || [];
  r.bigMoments.push({
    tone: "gold",
    kicker: `${r.year} ${lg} 올스타전`,
    title: mvp ? "⭐ 미스터 올스타!" : "⭐ 올스타 선정",
    lines: [`전반기 WAR ${r.WAR} · ${how} 선정`, hurt ? "부상으로 올스타전엔 못 나감" : mvp ? "올스타전 MVP까지 차지했어요" : "올스타전 무대를 밟았어요"],
  });
}

// ---------------------------------------------
// 댓글 문구
// ---------------------------------------------

Object.assign(FAN, {
  allstar: ["올스타 축하!", "팬투표 몰표 ㅋㅋ", "올스타전에서도 한 건 해라", "이 정도면 리그 얼굴"],
});

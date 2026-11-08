// =============================================
// extra.js : v15 추가 기능
// 1. 숨은 특성 추가 (유리몸, 특정 계절에 강함) + 부상 정도
// 2. 월별 성적
// 3. 포스트시즌 기록 따로
// 4. 국가대표 기록
// 5. 역사적 시즌 (극악 확률)
// 6. 강제 트레이드 (시즌 중 / 시즌 후)
// 7. FA 팀 사정 + 협상 테이블 (더 기다리기, 직접 협상)
// 8. 현역 연장 (입단 테스트), 해외파 KBO 말년
// 9. 업적
// =============================================

// ---------------------------------------------
// 1. 숨은 특성 + 부상
// ---------------------------------------------
const SEASON_TRAITS = {
  spring: { months: [3, 4, 5], nick: "봄의 사나이", label: "시즌 초반" },
  summer: { months: [6, 7, 8], nick: "여름 사나이", label: "한여름" },
  fall:   { months: [9, 10], nick: "가을 사나이", label: "시즌 막판" },
};

// 예전 저장 데이터에도 새 숨은 특성을 채워줌 (플레이어한텐 끝까지 안 보여줌)
function initExtra(player) {
  const h = player.hidden || (player.hidden = {});
  if (h.glass === undefined) h.glass = Math.random() < 0.03; // 유리몸: 진짜 가끔
  if (h.season === undefined) {
    const r = Math.random();
    h.season = r < 0.05 ? "spring" : r < 0.1 ? "summer" : r < 0.15 ? "fall" : null;
  }
  if (!player.nationalHistory) player.nationalHistory = [];
  fillOldFielding(player);
  if (player.faEarned === undefined) {
    // 예전 데이터는 지금 FA 계약만 알 수 있음
    const c = player.contract;
    player.faEarned = c && c.isFA ? c.total || 0 : 0;
    player.faDeals = c && c.isFA ? 1 : 0;
  }
}

// 부상: 유리몸은 확률도 높고 길게 빠짐. 가벼운 부상은 1군 등록일수에 큰 문제 없음
function rollInjury(player, report, chance) {
  const glass = player.hidden && player.hidden.glass;
  if (glass) chance = chance * 2.4 + 0.05;
  if (Math.random() >= chance) return 1;
  const severe = Math.random() < (glass ? 0.75 : 0.5);
  const factor = severe ? 0.4 + Math.random() * 0.35 : 0.84 + Math.random() * 0.1;
  report.events.push(severe ? "장기 부상" : "부상");
  report.specials.push({ key: severe && glass ? "glassHurt" : "injury" });
  report.injury = { severe, glass };
  return factor;
}

// 1군 등록일수 (시즌 186일 기준, 145일 넘어야 FA 1시즌 인정)
const KBO_SEASON_DAYS = 186;
function registeredDays(report) {
  return Math.round(KBO_SEASON_DAYS * (report.gameFactor || 1));
}

// 부상 때문에 등록일수 못 채우면 크게 알려줌
function serviceShortNotice(player, report, days) {
  if (!report.injury) return false;
  report.specials.push({ key: "serviceInjury", days });
  report.bigMoments = report.bigMoments || [];
  const left = seasonsToFa(player);
  report.bigMoments.push({
    tone: "bad", kicker: "1군 등록일수 부족", title: "⏳ FA가 1년 밀렸어요",
    lines: [`부상으로 1군 등록 ${days}일 (기준 145일)`, `이번 시즌은 FA 시즌으로 안 쳐줌 · FA까지 1군 ${left}시즌 남음`],
  });
  return true;
}

// 계절 특성은 컨디션 +1 (그 시기에 몰아서 잘함)
function seasonTraitMod(player) {
  return player.hidden && player.hidden.season && !isAmateur(player.league) ? 1 : 0;
}

// ---------------------------------------------
// 2. 월별 성적 (타자는 OPS, 투수는 평균자책)
// ---------------------------------------------
function monthsOf(league) {
  if (league === "ABL") return [11, 12, 1];
  if (isAmateur(league)) return null;
  return [4, 5, 6, 7, 8, 9];
}

function makeSplits(player, report) {
  const months = monthsOf(report.league);
  if (!months) return;
  const trait = player.hidden && player.hidden.season ? SEASON_TRAITS[player.hidden.season] : null;
  const side = report.bat ? "bat" : "pit"; // 월별 그래프(story.js)랑 같은 기준
  const rec = report[side];
  if (!rec || !rec.G) return;
  // 달마다 들쭉날쭉 + 특성 있는 시기에는 확 올라감, 평균은 1로 맞춤
  // 1.2 = 그 달은 평소보다 20% 잘함 (타율은 곱하고 평균자책은 나눔)
  const hot = (m) => trait && (trait.months.includes(m) || (m === 4 && trait.months.includes(3)));
  let f = months.map((m) => clamp(1 + gauss() * 0.08 + (trait ? (hot(m) ? 0.2 : -0.06) : 0), 0.6, 1.5));
  const avg = f.reduce((s, x) => s + x, 0) / f.length;
  f = f.map((x) => x / avg);
  report.splits = { side, months, f };
  // 특정 시기만 되면 펄펄 나는 게 3시즌 쌓이면 팬들이 별명 붙여줌
  if (trait && TOP_LEAGUES.includes(report.league)) {
    player.splitSeen = (player.splitSeen || 0) + 1;
    report.specials.push({ key: "seasonHot" });
    if (player.splitSeen === 3) giveNickname(player, report, trait.nick);
  }
}

// 별명 붙이기 (story.js updateNickname과 같은 방식)
function giveNickname(player, report, nick) {
  if (player.nickname === nick) return;
  player.nickname = nick;
  player.nicknames = [...new Set([...(player.nicknames || []), nick])];
  report.specials.push({ key: "nickname", nick });
}

// ---------------------------------------------
// 3. 포스트시즌 기록
// 라운드마다 실제 경기 수만큼 시뮬레이션, 상대가 강해서 리그 수준 +3
// ---------------------------------------------
const PS_BO = {
  KBO: { 4: 2, 3: 5, 2: 5, 1: 7 },
  NPB: { 3: 3, 2: 6, 1: 7 },
  MLB: { 4: 3, 3: 5, 2: 7, 1: 7 },
  ABL: { 2: 3, 1: 3 },
  INDIE: { 2: 3, 1: 3 },
  KBO2: { 2: 1, 1: 1 },
  SANGMU: { 2: 1, 1: 1 },
};

function seriesGames(bo) {
  if (bo <= 1) return 1;
  if (bo === 2) return randomInt(1, 2); // 와일드카드: 1위 팀은 1승만 하면 됨
  const need = Math.ceil(bo / 2);
  return randomInt(need, bo);
}

function postseasonStats(player, report, mod) {
  const ps = report.postseason;
  if (!ps || !ps.length) return;
  const bo = PS_BO[report.league] || {};
  const games = ps.reduce((s, g) => s + seriesGames(bo[g.round] || 5), 0);
  const level = LEAGUES[report.league].level + 3;
  const env = LEAGUE_ENV[report.league];
  const fall = player.hidden && player.hidden.season === "fall" ? 5 : 0; // 가을 체질
  if (report.bat && report.bat.G) {
    const big = ((player.stats.clutch || 50) - 50) / 10; // 큰 경기는 클러치가 더 중요함
    const pa = clamp(report.bat.PA / report.bat.G, 1, 4.6);
    const pos = player.position.split(" 겸 ").pop();
    report.psBat = simBattingSeason(player.stats, level, games, pa, mod + fall + big, pos, env);
  }
  if (report.pit && report.pit.G) {
    const big = ((player.stats.mental || 50) - 50) / 10;
    const role = report.pit.role.includes("선발") ? "starter" : report.pit.role.includes("마무리") ? "closer" : "setup";
    const apps = role === "starter" ? Math.max(1, Math.round(games / 4.2)) : Math.max(1, Math.round(games * 0.55));
    report.psPit = simPitchingSeason(player.stats, level, role, apps, mod + fall + big, env);
  }
  report.psWAR = round((report.psBat ? report.psBat.WAR : 0) + (report.psPit ? report.psPit.WAR : 0), 1);
  // 가을에 미친 활약이면 팬 반응
  const b = report.psBat, p = report.psPit;
  if ((b && b.PA >= 12 && b.OPS >= 1.0) || (p && p.outs >= 18 && p.ERA <= 1.5)) report.specials.push({ key: "autumnHot" });
}

// 기록 탭 맨 아래 포스트시즌 통산
function psTotals(player) {
  const list = (player.history || []).filter((h) => h.psBat || h.psPit);
  if (!list.length) return null;
  return careerTotals({ history: list.map((h) => ({ league: h.league, bat: h.psBat, pit: h.psPit, WAR: h.psWAR || 0 })) });
}

function psStatHtml(report) {
  const b = report.psBat, p = report.psPit;
  let html = "";
  if (b) html += `<p class="small">🍂 가을야구 타격: ${b.G}경기 타율 ${fmtRate(b.AVG)} · ${b.HR}홈런 ${b.RBI}타점 · OPS ${fmtRate(b.OPS)}</p>`;
  if (p) html += `<p class="small">🍂 가을야구 투구: ${p.G}경기 ${fmtInnings(p.outs)}이닝 ${p.W}승 ${p.L}패${p.SV ? ` ${p.SV}세이브` : ""}${p.HLD ? ` ${p.HLD}홀드` : ""} · 평균자책 ${p.ERA.toFixed(2)} · ${p.K}삼진</p>`;
  return html;
}

// ---------------------------------------------
// 4. 국가대표 기록
// ---------------------------------------------
const NATIONAL_GAMES = { u18: 9, asian: 5, premier: 8, wbc: 7, olympic: 6 };

function nationalStats(player, ev, report) {
  const games = NATIONAL_GAMES[ev.id] || 6;
  const level = ev.hsOnly ? 40 : LEAGUES.KBO.level + 5; // 국제대회는 상대가 셈
  const ovrs = getOvrs(player);
  const out = { year: report.year, name: ev.name, bat: null, pit: null };
  if (ovrs.bat !== null) {
    out.bat = simBattingSeason(player.stats, level, games, 3.9, 0, player.position.split(" 겸 ").pop(), NEUTRAL_ENV);
  }
  if (ovrs.pit !== null) {
    const starter = player.position.startsWith("선발");
    out.pit = simPitchingSeason(player.stats, level, starter ? "starter" : "setup", starter ? 2 : Math.ceil(games * 0.5), 0, NEUTRAL_ENV);
  }
  // 대회 성적이 메달 색에도 조금 보탬
  let bonus = 0;
  if (out.bat && out.bat.PA) bonus += (out.bat.OPS - 0.75) * 8;
  if (out.pit && out.pit.outs) bonus += (3.5 - out.pit.ERA) * 0.8;
  return { rec: out, bonus: clamp(bonus, -3, 4) };
}

function nationalRecordHtml(player) {
  const list = player.nationalHistory || [];
  if (!list.length) return "";
  let html = "<h4>🇰🇷 국가대표 기록</h4>";
  const ev = (n) => n.replace(" 청소년 야구월드컵", "");
  const nat = { history: list.map((n) => ({ league: "KBO", bat: n.bat, pit: n.pit, WAR: 0 })) };
  if (list.some((n) => n.bat)) {
    html += `<div class="scroll"><table class="stat-table">${BAT_HEAD(false)}`;
    for (const n of list) if (n.bat) html += batRow(n.year, `${ev(n.name)} ${medalIcon(n.result)}`, n.bat, "");
    html += batRow("국가대표 통산", "", totalsAsBat(careerTotals(nat)), "total");
    html += "</table></div>";
  }
  if (list.some((n) => n.pit)) {
    html += `<div class="scroll"><table class="stat-table">${PIT_HEAD}`;
    for (const n of list) if (n.pit) html += pitRow(n.year, `${ev(n.name)} ${medalIcon(n.result)}`, n.pit, "");
    html += pitRow("국가대표 통산", "", totalsAsPit(careerTotals(nat)), "total");
    html += "</table></div>";
  }
  const medals = ["금메달", "은메달", "동메달"].map((m) => [m, list.filter((n) => n.result === m).length]).filter(([, c]) => c);
  html += `<p class="small">대회 ${list.length}번 출전${medals.length ? ` · ${medals.map(([m, c]) => `${m} ${c}`).join(" · ")}` : ""} (국대 경기는 WAR 없음)</p>`;
  return html;
}

function medalIcon(result) {
  return { 금메달: "🥇", 은메달: "🥈", 동메달: "🥉" }[result] || "";
}

// ---------------------------------------------
// 5. 역사적 시즌: 리그를 한참 압도하는 선수에게만, 그것도 극악 확률
// (저지 62홈런, 오타니 50-50 같은 시즌)
// ---------------------------------------------
function historicMod(player, report, level) {
  if (!TOP_LEAGUES.includes(player.league)) return 0;
  const gap = getOvrs(player).best - level;
  if (gap < 5) return 0;
  const chance = clamp(0.002 + (gap - 5) * 0.0004, 0, 0.008);
  if (Math.random() >= chance) return 0;
  report.historic = true;
  report.events.push("역사적 시즌");
  return 14;
}

function historicMoment(player, report) {
  if (!report.historic) return;
  // 컨디션이 올라도 숫자가 별로면 그냥 커리어 하이로 끝 (진짜 괴물 시즌만 역사적 시즌)
  const race = AWARD_RACE[report.league];
  if (report.WAR < (race ? race.mvp : 7)) {
    report.historic = false;
    report.events = report.events.map((e) => (e === "역사적 시즌" ? "커리어 하이 페이스" : e));
    return;
  }
  const b = report.bat, p = report.pit;
  const lines = [];
  if (b && b.G) {
    lines.push(`타율 ${fmtRate(b.AVG)} · ${b.HR}홈런 · ${b.RBI}타점 · ${b.SB}도루`);
    if (b.HR >= 50 && b.SB >= 50) lines.push("50-50 클럽! 야구 역사상 처음 보는 숫자");
    else if (b.HR >= 40 && b.SB >= 40) lines.push("40-40 달성");
    else if (b.AVG >= 0.4) lines.push("꿈의 4할 타율");
    else if (b.HR >= 55) lines.push(`${b.HR}홈런, 시즌 홈런 신기록급`);
  }
  if (p && p.G) {
    lines.push(`${p.W}승 ${p.L}패${p.SV ? ` ${p.SV}세이브` : ""} · 평균자책 ${p.ERA.toFixed(2)} · ${p.K}탈삼진`);
    if (p.ERA < 1.5) lines.push("1점대 초반 평균자책, 말이 안 되는 시즌");
    else if (p.K >= 300) lines.push("300탈삼진 돌파");
  }
  lines.push(`WAR ${report.WAR}`);
  player.historicSeasons = (player.historicSeasons || 0) + 1;
  report.specials.push({ key: "historic" });
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.unshift({ tone: "gold", kicker: `${report.year} 시즌 · 몇십 년에 한 번`, title: "📜 역사적 시즌!", lines });
}

// ---------------------------------------------
// 6. 강제 트레이드: 팀에서 쓸모가 없으면 내 의지와 상관없이 보내버림
// 프랜차이즈 스타, FA 계약 첫해, 아마추어·해외는 제외
// ---------------------------------------------
function tradeable(player) {
  if (!["KBO", "KBO2"].includes(player.league) || isFranchiseHere(player)) return false;
  if (player.contract && player.contract.isFA && player.contract.years >= 2) return false;
  if (player.age < 21) return false;
  return true;
}

function isBenchRole(report) {
  const roles = [report.bat && report.bat.role, report.pit && report.pit.role].filter(Boolean).join(" ");
  return report.league === "KBO2" || /백업|추격조|대체|대타/.test(roles);
}

function doTrade(player, report, when) {
  const from = player.team;
  const to = pick(TEAMS.KBO.filter((t) => t !== from));
  player.team = to;
  if (player.contract) player.contract.team = to;
  player.traded = true;
  player.forcedTrades = (player.forcedTrades || 0) + 1;
  player.starterPromise = false;
  player.restPlan = null;
  changeFame(player, -2);
  report.specials.push({ key: when === "mid" ? "tradeMid" : "tradeAfter", from, team: to });
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push({
    tone: "bad", kicker: when === "mid" ? "시즌 도중 트레이드" : "비시즌 트레이드",
    title: "📦 트레이드 통보",
    lines: [`${from} → ${to}`, when === "mid" ? "트레이드 마감 직전, 짐 싸서 바로 이동" : "구단이 내 의사와 상관없이 결정했어요"],
  });
  return { from, to };
}

// 시즌 도중: 지난 시즌 백업이었으면 4%
function maybeMidTrade(player, report) {
  const lr = player.lastReport;
  if (!lr || player.league !== "KBO" || !tradeable(player) || !isBenchRole(lr) || lr.league !== "KBO") return;
  if (Math.random() >= 0.04) return;
  const { from, to } = doTrade(player, report, "mid");
  report.team = to;
  report.tradedFrom = from;
  report.events.push("시즌 중 트레이드");
}

// 시즌 뒤: 올해도 백업에 WAR 0.6 미만이면 8%
function maybeAfterTrade(player, report) {
  if (report.tradedFrom || !tradeable(player) || !isBenchRole(report) || report.WAR >= 0.6) return;
  if (player.pendingChoice && player.pendingChoice.key === "fa") return;
  if (Math.random() >= 0.08) return;
  doTrade(player, report, "after");
}

// ---------------------------------------------
// 7. FA: 팀 사정 + 협상 테이블
// ---------------------------------------------
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
  return `${o.need ? `🔥 ${o.need} 급구 · ` : ""}${back ? "KBO 복귀 · " : ""}${o.mega ? "💰 메가 계약 · " : ""}${o.veteran ? (o.years === 2 ? "1+1년 (베테랑 단기 계약) · " : "1년 단기 계약 · ") : ""}${o.years}년 총액 ${fmtMoney(o.total)}${o.bonus ? ` · 계약금 ${fmtMoney(o.bonus)}` : ""} · 연봉 ${fmtMoney(o.salary)}${o.change ? ` · ${o.change}` : ""}`;
}

// 협상 가능한 팀: 원소속팀, 내 자리가 급한 팀
function negotiable(player, o) {
  return !o.negotiated && !o.mega && (o.team === player.team || !!o.need);
}

// 협상 테이블 버튼 (FA 선택지 아래에 붙음)
function faTableOptions(player, offers, table) {
  const opts = [];
  if (table.waits < 2) opts.push({ id: "wait", label: "⏳ 시장 더 지켜보기", detail: `제안이 오를 수도, 다른 FA를 잡고 빠질 수도 있어요 · 남은 기회 ${2 - table.waits}번` });
  if (offers.some((o) => negotiable(player, o))) opts.push({ id: "negotiate", label: "🤝 협상 테이블", detail: "원소속팀이나 나를 꼭 원하는 팀과 직접 조건 담판" });
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
    if (!o.need && o.team !== player.team && r < 0.22) {
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
      ...offers.map((o, i) => ({ o, i })).filter(({ o }) => negotiable(player, o)).map(({ o, i }) => ({
        id: `nego${i}`, label: `${o.team}에 조건 올려 달라고 하기`,
        detail: `${o.need ? `${o.need} 급구 · ` : o.team === player.team ? "원소속팀 · " : ""}성공 가능성 ${chanceLabel(negoChance(player, o))}`,
      })),
      { id: "back", label: "협상 안 하고 돌아가기" },
    ],
  };
}

// FA 선택지 (money.js faChoice가 이걸 씀)
function buildFaChoice(player, reason, offers, table) {
  const options = offers.map((o, i) => ({ id: `offer${i}`, label: offerLabel(player, o), detail: offerDetail(player, o), offer: o }));
  if (player.league === "KBO" || player.league === "KBO2") {
    options.push({ id: "nofile", label: "FA 신청 안 하고 잔류", detail: "원소속팀과 1년 연봉 계약 · FA 자격은 유지돼요" });
  }
  options.push(...faTableOptions(player, offers, table));
  if (player.age >= 33) options.push({ id: "retire", label: "여기서 은퇴한다" });
  const needs = offers.filter((o) => o.need);
  const head = needs.length && !table.waits && !table.negos ? `🔥 ${[...new Set(needs.map((o) => o.need))].join("·")}이(가) 급한 팀이 적극적으로 나섰어요. ` : "";
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
}

// ---------------------------------------------
// 8. 은퇴 조건 다시: 성적 좋으면 나이 상관없이 계속 뜀 (최대 만 47세)
// ---------------------------------------------
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
    options.push({ id: "extend", label: "현역 연장 (입단 테스트)", detail: `테스트 통과하면 퓨처스 육성 선수, 아니면 독립리그에서 다시 · 통과 가능성 ${chanceLabel(tryoutChance(player))}` });
  }
  return {
    key: "forcedRetire",
    text: "더 이상 불러주는 팀이 없어요. 유니폼을 벗을까요, 아니면 입단 테스트라도 받아 볼까요?",
    options,
  };
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

// ---------------------------------------------
// 9. 업적
// ---------------------------------------------
ACHIEVEMENTS.push(
  { id: "autumnMan", group: "시즌 기록", name: "가을 사나이", desc: "포스트시즌 통산 OPS .950 이상(40타석+) 또는 평균자책 2.00 이하(20이닝+)", check: (p) => { const t = psTotals(p); return !!t && ((t.PA >= 40 && t.OPS >= 0.95) || (t.outs >= 60 && t.ERA <= 2)); } },
  { id: "historic", group: "시즌 기록", name: "전설의 시즌", desc: "역사에 남을 시즌 보내기 (극악 확률)", check: (p) => (p.historicSeasons || 0) >= 1 },
  { id: "extend", group: "인생", name: "포기는 없다", desc: "강제 은퇴 위기에서 현역 연장 선택", check: (p) => (p.extended || 0) >= 1 },
  { id: "tryout", group: "인생", name: "입단 테스트 합격", desc: "현역 연장 입단 테스트 통과", check: (p) => !!p.tryoutPassed },
  { id: "age45", group: "인생", name: "불혹을 넘어", desc: "한국 나이 45세 이상까지 현역", check: (p) => p.history.some((h) => !isAmateur(h.league) && koreanAge(h.age) >= 45) },
  { id: "traded", group: "커리어", name: "짐 싸는 날", desc: "본인 의사와 상관없이 트레이드 당하기", check: (p) => (p.forcedTrades || 0) >= 1 },
  { id: "natStar", group: "수상", name: "국대 에이스", desc: "국가대표 통산 5홈런 또는 20탈삼진", check: (p) => { const l = p.nationalHistory || []; return l.reduce((s, n) => s + (n.bat ? n.bat.HR : 0), 0) >= 5 || l.reduce((s, n) => s + (n.pit ? n.pit.K : 0), 0) >= 20; } },
  { id: "faHaggle", group: "커리어", name: "밀당의 고수", desc: "FA 협상 테이블에서 조건 올리기 성공", check: (p) => !!p.negoWin },
);

// ---------------------------------------------
// 10. 역대 순위 탭: 내 팀 순위 기록 + 리그별 연도별 순위 + 팀별 통산
// 매 시즌 리그 전체 승패를 history에 같이 저장함 (v15 이전 시즌은 내 팀 순위만 있음)
// ---------------------------------------------
function saveLeagueTable(player, report, all, seeds) {
  const st = report.standing;
  st.all = all.map((t) => [t.team, t.w, t.l, seeds[t.team] || 0]);
  // 우리 팀이 우승 못 하면 누가 우승했는지: 시드 받은 팀 중에서 승률 높을수록 유리
  const cands = all.filter((t) => seeds[t.team] && t.team !== player.team);
  if (!cands.length || !CHAMPIONSHIP[report.league] || report.league === "COLLEGE") return;
  const weight = (t) => Math.pow(t.w / (t.w + t.l), 4) * (seeds[t.team] === 1 ? 1.5 : 1);
  const total = cands.reduce((s, t) => s + weight(t), 0);
  let r = Math.random() * total;
  st.altChamp = (cands.find((t) => (r -= weight(t)) <= 0) || cands[0]).team;
}

const TABLE_LEAGUE = (lg) => (lg === "SANGMU" ? "KBO2" : lg); // 상무는 퓨처스리그로 묶음
// 팀 이름 줄이기: KBO는 앞 단어(KIA, LG), 해외는 뒤 단어(다저스, 양키스)
const shortTeam = (t) => (!t.includes(" ") ? t : TEAMS.KBO.includes(t) || (TEAMS.KBO2 || []).includes(t) ? t.split(" ")[0] : t.split(" ").pop());

// 우승팀: 내가 우승했으면 우리 팀, 아니면 저장된 다른 팀 (결정적 순간 고르기 전엔 비밀)
function seasonChamp(player, h, isLast) {
  const name = CHAMPIONSHIP[h.league];
  if (!name || h.league === "COLLEGE") return null;
  if (isLast && clutchPending(player)) return "?";
  if (h.awards && h.awards.includes(name)) return h.team;
  return h.standing && h.standing.altChamp ? h.standing.altChamp : null;
}

function clutchPending(player) {
  return [player.pendingChoice, ...(player.choiceQueue || [])].some((c) => c && c.key === "clutch" && (c.kind === "seriesHero" || c.kind === "game7"));
}

// 그 시즌 내 조(지구)의 최종 순위
function groupTable(h) {
  const lg = h.league;
  const all = h.standing.all.map(([team, w, l, seed]) => ({ team, w, l, seed }));
  const g = groupOf(lg, h.team);
  return (g ? all.filter((t) => g.teams.includes(t.team)) : all).sort((a, b) => b.w - a.w);
}

function standingsTabHtml(player, pick) {
  const seasons = player.history.filter((h) => h.standing);
  if (!seasons.length) return "<p class='empty'>아직 순위 기록이 없어요. (고교는 주말리그라 빠짐)</p>";
  const last = player.history[player.history.length - 1];
  let html = "<h4>내 팀 역대 순위</h4><div class='scroll'><table class='stat-table rank-table'><tr><th class='sticky'>연도</th><th>리그</th><th>팀</th><th>순위</th><th>승-패</th><th>승률</th><th>가을</th><th>우승팀</th></tr>";
  for (const h of seasons) {
    const s = h.standing;
    const champ = seasonChamp(player, h, h === last);
    const mine = champ === h.team;
    html += `<tr class="${s.rank === 1 ? "first" : ""}"><td class="sticky">${h.year || ""}</td><td>${(s.group || LEAGUES[h.league].name).replace("아메리칸리그 ", "AL ").replace("내셔널리그 ", "NL ").replace(" 리그", "")}</td><td>${shortTeam(h.team)}</td>
      <td><b>${s.rank}</b>/${s.teams}</td><td>${s.w}-${s.l}</td><td>${fmtRate(s.w / (s.w + s.l))}</td>
      <td>${s.seed ? "●" : "-"}</td><td>${champ ? (mine ? "🏆 우리 팀" : champ === "?" ? "결정 전" : shortTeam(champ)) : "-"}</td></tr>`;
  }
  html += "</table></div>";

  // 리그별 버튼
  const leagues = [...new Set(seasons.filter((h) => h.standing.all).map((h) => TABLE_LEAGUE(h.league)))];
  if (!leagues.length) return html + "<p class='small'>리그 전체 순위는 v15부터 치른 시즌만 저장돼요.</p>";
  const lg = leagues.includes(pick) ? pick : leagues.includes(TABLE_LEAGUE(player.league)) ? TABLE_LEAGUE(player.league) : leagues[leagues.length - 1];
  html += `<h4>리그별 역대 순위</h4><p class="chips league-pick">${leagues.map((l) => `<button class="${l === lg ? "on" : ""}" data-lg="${l}">${LEAGUES[l].name}</button>`).join("")}</p>`;
  const list = seasons.filter((h) => h.standing.all && TABLE_LEAGUE(h.league) === lg);

  // 연도별 최종 순위 (내 조·지구 기준)
  const width = Math.max(...list.map((h) => groupTable(h).length));
  html += `<div class="scroll"><table class="stat-table rank-table rank-hist"><tr><th class="sticky">연도</th>${Array.from({ length: width }, (_, i) => `<th>${i + 1}위</th>`).join("")}<th>우승</th></tr>`;
  for (const h of list) {
    const champ = seasonChamp(player, h, h === last);
    html += `<tr><td class="sticky">${h.year}${h.standing.group ? `<br><small>${h.standing.group}</small>` : ""}</td>${groupTable(h).map((t) =>
      `<td class="${t.team === h.team ? "me" : ""}">${shortTeam(t.team)}<br><small>${t.w}-${t.l}${t.seed ? " ●" : ""}</small></td>`).join("")}${"<td></td>".repeat(width - groupTable(h).length)}
      <td>${champ ? (champ === "?" ? "?" : `🏆 ${shortTeam(champ)}`) : "-"}</td></tr>`;
  }
  html += "</table></div><p class='small'>● 가을야구(포스트시즌) 진출 · 금색 칸이 우리 팀 · MLB·NPB·퓨처스는 그해 우리 조·지구 기준</p>";

  // 팀별 통산 (그 리그 전체 팀)
  const teams = {};
  // MLB·NPB처럼 팀이 많으면 내가 있던 조·지구 팀만
  const seen = new Set(list.flatMap((h) => groupTable(h).map((t) => t.team)));
  for (const h of list) {
    const champ = seasonChamp(player, h, h === last);
    const all = h.standing.all.map(([team, w, l, seed]) => ({ team, w, l, seed }));
    for (const t of all) {
      if (!seen.has(t.team) && champ !== t.team) continue;
      const g = groupOf(h.league, t.team);
      const rank = (g ? all.filter((x) => g.teams.includes(x.team)) : all).sort((a, b) => b.w - a.w).findIndex((x) => x.team === t.team) + 1;
      const r = teams[t.team] || (teams[t.team] = { n: 0, rank: 0, first: 0, ps: 0, champ: 0, w: 0, l: 0 });
      r.n++; r.rank += rank; r.w += t.w; r.l += t.l;
      if (rank === 1) r.first++;
      if (t.seed) r.ps++;
      if (champ === t.team) r.champ++;
    }
  }
  const rows = Object.entries(teams).sort((a, b) => b[1].champ - a[1].champ || a[1].rank / a[1].n - b[1].rank / b[1].n);
  html += `<h4>팀별 통산 <small>(${list.length}시즌)</small></h4><div class="scroll"><table class="stat-table rank-table"><tr><th class="sticky">팀</th><th>평균 순위</th><th>1위</th><th>가을야구</th><th>우승</th><th>승률</th></tr>`;
  for (const [team, r] of rows) {
    html += `<tr class="${team === player.team ? "me-row" : ""}"><td class="sticky">${shortTeam(team)}</td><td>${(r.rank / r.n).toFixed(1)}</td><td>${r.first}</td><td>${r.ps}</td><td>${r.champ ? `🏆 ${r.champ}` : "-"}</td><td>${fmtRate(r.w / (r.w + r.l))}</td></tr>`;
  }
  return html + "</table></div>";
}

function showStandings(player, pick) {
  const box = $("tab-rank");
  if (!box) return;
  box.innerHTML = standingsTabHtml(player, pick);
  box.onclick = (e) => {
    const lg = e.target.dataset && e.target.dataset.lg;
    if (lg) showStandings(player, lg);
  };
}

// v15 전에 치른 시즌은 실책 기록이 없어서, 그 시즌 출전 기록 + 지금 수비 능력치로 채워 넣음
function fillOldFielding(player) {
  if (player.fieldingFilled) return;
  player.fieldingFilled = true;
  const [first, second] = player.position.split(" 겸 ");
  const batPos = second || first;
  for (const h of player.history || []) {
    const lv = LEAGUES[h.league] ? LEAGUES[h.league].level : 50;
    if (h.bat && h.bat.G && h.bat.CH === undefined && FIELD_POS[batPos]) Object.assign(h.bat, fieldingSeason(player.stats, lv, 0, batPos, h.bat));
    if (h.pit && h.pit.outs && h.pit.CH === undefined) Object.assign(h.pit, pitcherFielding(player.stats, lv, 0, h.pit));
  }
}

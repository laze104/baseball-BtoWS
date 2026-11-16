// =============================================
// historic.js : 역사적 시즌
// 리그를 한참 압도하는 선수에게만, 그것도 극악 확률
// =============================================

// (저지 62홈런, 오타니 50-50 같은 시즌)
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
  const b = report.bat,
    p = report.pit;
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

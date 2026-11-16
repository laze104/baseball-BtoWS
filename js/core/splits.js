// =============================================
// splits.js : 월별 성적 (타자는 OPS, 투수는 평균자책)
// =============================================

function monthsOf(league) {
  if (league === "ABL") return [11, 12, 1];
  if (isAmateur(league)) return null;
  return [4, 5, 6, 7, 8, 9];
}

function makeSplits(player, report) {
  const months = monthsOf(report.league);
  if (!months) return;
  const trait = player.hidden && player.hidden.season ? SEASON_TRAITS[player.hidden.season] : null;
  const side = report.bat ? "bat" : "pit"; // 월별 순위 그래프(standings.js)랑 같은 기준
  const rec = report[side];
  if (!rec || !rec.G) return;
  if (report.monthsData && report.monthsData.length === months.length) {
    // 4구간 시즌: 실제로 친 전반기·후반기 기록에서 나온 월별 값 (phases.js)
    const f = report.monthsData.map((d) => (side === "bat" ? d.f : d.ERA ? rec.ERA / d.ERA : 1.5));
    report.splits = { side, months, f: f.map((x) => clamp(x, 0.4, 2)) };
    return;
  }
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

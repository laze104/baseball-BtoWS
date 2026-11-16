// =============================================
// trade.js : 강제 트레이드
// 팀에서 쓸모가 없으면 내 의지와 상관없이 보내버림 (시즌 중 / 시즌 후)
// =============================================

// 프랜차이즈 스타, FA 계약 첫해, 아마추어·해외는 제외
function tradeable(player) {
  if (!["KBO", "KBO2"].includes(player.league) || isFranchiseHere(player)) return false;
  if (hasClause(player, "noTrade")) return false; // 트레이드 거부권 (contract.js)
  if (player.contract && player.contract.isFA && player.contract.years >= 2) return false;
  if (player.age < 21) return false;
  return true;
}

function isBenchRole(report) {
  const roles = [report.bat && report.bat.role, report.pit && report.pit.role].filter(Boolean).join(" ");
  return report.league === "KBO2" || /백업|추격조|대체|대타/.test(roles);
}

function doTrade(player, report, when, toTeam) {
  const from = player.team;
  const to = toTeam || pick((TEAMS[player.league] || TEAMS.KBO).filter((t) => t !== from));
  player.team = to;
  if (player.contract) player.contract.team = to;
  player.traded = true;
  player.moveKind = "trade"; // 팬심 계산용 (fandom.js)
  player.forcedTrades = (player.forcedTrades || 0) + 1;
  player.starterPromise = false;
  player.restPlan = null;
  changeFame(player, -2);
  report.specials.push({ key: when === "mid" ? "tradeMid" : "tradeAfter", from, team: to });
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push({
    tone: "bad",
    kicker: when === "mid" ? "시즌 도중 트레이드" : "비시즌 트레이드",
    title: "📦 트레이드 통보",
    lines: [`${from} → ${to}`, when === "mid" ? "트레이드 마감 직전, 짐 싸서 바로 이동" : "구단이 내 의사와 상관없이 결정했어요"],
  });
  return { from, to };
}

// 시즌 도중: 지난 시즌 백업이었으면 4%
function maybeMidTrade(player, report) {
  const lr = player.lastReport;
  if (!lr || player.league !== "KBO" || !tradeable(player) || !isBenchRole(lr) || lr.league !== "KBO") return;
  if (Math.random() >= 0.04 * fanTradeMul(player)) return; // 팬심 높으면 덜 됨 (fandom.js)
  const { from, to } = doTrade(player, report, "mid");
  report.team = to;
  report.tradedFrom = from;
  report.events.push("시즌 중 트레이드");
}

// 시즌 뒤: 올해도 백업에 WAR 0.6 미만이면 8%
function maybeAfterTrade(player, report) {
  if (report.tradedFrom || !tradeable(player) || !isBenchRole(report) || report.WAR >= 0.6) return;
  if (player.pendingChoice && player.pendingChoice.key === "fa") return;
  if (Math.random() >= 0.08 * fanTradeMul(player)) return;
  doTrade(player, report, "after");
}

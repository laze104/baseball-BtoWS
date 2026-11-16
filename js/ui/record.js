// =============================================
// record.js : 통산 기록 탭 (네이버 스탯창 스타일)
// =============================================

// 예전 저장 데이터엔 BABIP·수비 기록이 없어서 "-"로 표시함
const dash = (v, f) => (v === undefined || v === null || Number.isNaN(v) ? "-" : f ? f(v) : v);
const csRate = (b) => (b.SBA ? `${fmtRate(b.CS / b.SBA)} (${b.CS}/${b.SBA})` : "-");

function batRow(label, team, b, cls, showCS) {
  const fpct = b.FPCT !== undefined && b.FPCT !== null ? b.FPCT : b.CH ? (b.CH - b.E) / b.CH : null;
  return `<tr class="${cls || ""}"><td class="sticky">${label}</td><td>${team}</td><td>${b.G}</td><td>${fmtRate(b.AVG)}</td><td>${b.PA}</td><td>${b.AB}</td>
    <td>${b.R}</td><td>${b.H}</td><td>${b.D}</td><td>${b.T}</td><td>${b.HR}</td><td>${b.RBI}</td><td>${b.SB}</td><td>${b.BB}</td><td>${b.K}</td>
    <td>${fmtRate(b.OBP)}</td><td>${fmtRate(b.SLG)}</td><td>${fmtRate(b.OPS)}</td><td>${dash(b.BABIP !== undefined ? b.BABIP : b.AB ? babip(b) : undefined, fmtRate)}</td><td>${b.WAR}</td>${batSaberCells(b)}
    <td>${b.CH ? b.E : "-"}</td><td>${dash(fpct, fmtRate)}</td>${showCS ? `<td>${csRate(b)}</td>` : ""}</tr>`;
}

function pitRow(label, team, p, cls) {
  const pb = p.BABIP !== undefined ? p.BABIP : p.outs ? pitBabip(p) : undefined;
  return `<tr class="${cls || ""}"><td class="sticky">${label}</td><td>${team}</td><td>${p.G}</td><td>${p.GS}</td><td>${p.W}</td><td>${p.L}</td>
    <td>${p.SV}</td><td>${p.HLD}</td><td>${fmtInnings(p.outs)}</td><td>${p.H}</td><td>${p.HR}</td><td>${p.BB}</td><td>${p.K}</td>
    <td>${p.R}</td><td>${p.ER}</td><td>${p.ERA.toFixed(2)}</td><td>${p.WHIP.toFixed(2)}</td><td>${dash(pb, fmtRate)}</td><td>${p.WAR}</td>${pitSaberCells(p)}
    <td>${p.CH ? p.E : "-"}</td><td>${p.CH ? fmtRate((p.CH - p.E) / p.CH) : "-"}</td></tr>`;
}

const BAT_HEAD = (showCS) => `<tr><th class="sticky">연도</th><th>팀</th><th>경기</th><th>타율</th><th>타석</th><th>타수</th>
  <th>득점</th><th>안타</th><th>2타</th><th>3타</th><th>홈런</th><th>타점</th><th>도루</th><th>볼넷</th><th>삼진</th><th>출루율</th><th>장타율</th><th>OPS</th><th>BABIP</th><th>WAR</th><th>wRC+</th><th>K%</th><th>BB%</th>
  <th>실책</th><th>수비율</th>${showCS ? "<th>도루저지율</th>" : ""}</tr>`;
const PIT_HEAD = `<tr><th class="sticky">연도</th><th>팀</th><th>경기</th><th>선발</th><th>승</th><th>패</th>
  <th>세이브</th><th>홀드</th><th>이닝</th><th>피안타</th><th>피홈런</th><th>볼넷</th><th>삼진</th><th>실점</th><th>자책</th><th>평균자책</th><th>WHIP</th><th>피BABIP</th><th>WAR</th><th>FIP</th><th>K%</th><th>BB%</th><th>실책</th><th>수비율</th></tr>`;

// 통산 합계를 표 한 줄 모양으로
function totalsAsBat(t) {
  return {
    G: t.G,
    AVG: t.AVG,
    PA: t.PA,
    AB: t.AB,
    R: t.R,
    H: t.H,
    D: t.D,
    T: t.T,
    HR: t.HR,
    RBI: t.RBI,
    SB: t.SB,
    BB: t.BB,
    K: t.K,
    OBP: t.OBP,
    SLG: t.SLG,
    OPS: t.OPS,
    WAR: t.WAR,
    BABIP: t.BABIP,
    CH: t.CH,
    E: t.E,
    FPCT: t.FPCT,
    SBA: t.SBA,
    CS: t.CS,
    wRC: t.wRC,
  };
}
function totalsAsPit(t) {
  return {
    G: t.pG,
    GS: t.GS,
    W: t.W,
    L: t.L,
    SV: t.SV,
    HLD: t.HLD,
    outs: t.outs,
    H: t.pH,
    HR: t.pHR,
    BB: t.pBB,
    K: t.pK,
    R: t.pR,
    ER: t.ER,
    ERA: t.ERA,
    WHIP: t.WHIP,
    WAR: t.WAR,
    BABIP: t.pBABIP,
    CH: t.pCH,
    E: t.pE,
    FIP: t.FIP,
  };
}

function showRecord(player) {
  $("tab-record").innerHTML = careerChartsHtml(player) + recordHtml(player); // 커리어 그래프 (charts.js)
}

// ---------------------------------------------
// 수상 내역, 라이벌 비교
// ---------------------------------------------

// 시즌별·통산 기록표 (기록 탭과 은퇴 화면에서 같이 씀)
// 상 이름표: 금메달은 금색, 은메달은 은색, 동메달은 동색
function awardChip(name, text) {
  const t = text || name;
  if (name.includes("은메달")) return `<span class="silver">🥈 ${t}</span>`;
  if (name.includes("동메달")) return `<span class="bronze">🥉 ${t}</span>`;
  if (name.includes("금메달")) return `<span>🥇 ${t}</span>`;
  return `<span>🏆 ${t}</span>`;
}

function recordHtml(player, noRival) {
  if (!player.history.length) return "<p class='empty'>아직 기록이 없어요.</p>";
  const short = (t) => t.split(" ")[0];
  const teamName = (h) =>
    isAmateur(h.league) ? h.team : `${h.tradedFrom ? `${short(h.tradedFrom)}→` : ""}${short(h.team)}${h.league === "KBO2" ? "(2군)" : ""}`;
  const leaguesPlayed = [...new Set(player.history.map((h) => h.league))].filter((l) => TOP_LEAGUES.includes(l));
  let html = "";

  const ps = psTotals(player); // 포스트시즌 통산 (postseason.js)
  if (player.history.some((h) => h.bat)) {
    const showCS = player.history.some((h) => h.bat && h.bat.SBA) || (player.position || "").includes("포수");
    html += `<h4>타격 기록</h4><div class="scroll"><table class="stat-table">${BAT_HEAD(showCS)}`;
    for (const h of player.history) if (h.bat) html += batRow(h.year || h.age, teamName(h), h.bat, isAmateur(h.league) ? "amateur" : "", showCS);
    for (const lg of leaguesPlayed) html += batRow(`${LEAGUES[lg].name} 통산`, "", totalsAsBat(careerTotals(player, [lg])), "total", showCS);
    html += batRow("통산(고교 제외)", "", totalsAsBat(careerTotals(player)), "total", showCS);
    if (ps && ps.PA) html += batRow("🍂 포스트시즌 통산", "", totalsAsBat(ps), "total ps-row", showCS);
    html += "</table></div>";
  }
  if (player.history.some((h) => h.pit)) {
    html += `<h4>투구 기록</h4><div class="scroll"><table class="stat-table">${PIT_HEAD}`;
    for (const h of player.history) if (h.pit) html += pitRow(h.year || h.age, teamName(h), h.pit, isAmateur(h.league) ? "amateur" : "");
    for (const lg of leaguesPlayed) html += pitRow(`${LEAGUES[lg].name} 통산`, "", totalsAsPit(careerTotals(player, [lg])), "total");
    html += pitRow("통산(고교 제외)", "", totalsAsPit(careerTotals(player)), "total");
    if (ps && ps.outs) html += pitRow("🍂 포스트시즌 통산", "", totalsAsPit(ps), "total ps-row");
    html += "</table></div>";
  }
  html += nationalRecordHtml(player); // 국가대표 기록 (national.js)
  html += `<p class="small">회색 줄은 고교·아마추어 기록이라 통산에서 빠져요. 표는 옆으로 밀어서 볼 수 있어요. ${SABER_NOTE}</p>`;

  const awardList = Object.entries(player.awards);
  html += `<h4>수상 경력</h4>${awardList.length ? `<p class="chips awards">${awardList.map(([k, v]) => awardChip(k, `${k} ${v}회`)).join("")}</p>` : "<p class='small'>아직 없어요.</p>"}`;
  if (player.nicknames && player.nicknames.length) {
    html += `<h4>얻은 별명</h4><p class="chips">${player.nicknames.map((n) => `<span>${n}</span>`).join("")}</p>`;
  }
  if (!noRival) html += rivalCompareHtml(player); // 은퇴 화면에서는 라이벌 비교를 뺌
  return html;
}

// 나 vs 라이벌 통산 비교표
function rivalCompareHtml(player) {
  const r = player.rival;
  if (!r) return "";
  const rs = rivalSummary(r);
  const me = careerTotals(player);
  const rows = [
    ["소속", player.team, r.retired ? "은퇴" : r.team],
    ["최고 OVR", fogWidth(player) ? "?" : player.bestOvr, fogWidth(player) ? "?" : r.bestOvr],
    ["통산 WAR", me.WAR, rs.WAR],
    ["MVP", countAward(player, "MVP"), rs.MVP],
    ["우승", countAward(player, "시리즈 우승"), rs.champs],
  ];
  let html = `<h4>⚔️ 라이벌 비교 <small>${r.school} 출신 ${r.position} ${r.name}</small></h4><table class="rival-table"><tr><th></th><th>나</th><th>${r.name}</th></tr>`;
  for (const [label, a, b] of rows) html += `<tr><td>${label}</td><td>${a}</td><td>${b}</td></tr>`;
  return html + "</table>";
}

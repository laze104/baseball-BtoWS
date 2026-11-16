// =============================================
// season-result.js : 시즌 결과 탭
// =============================================

function batRecordHtml(b) {
  return `<table><tr><th>경기</th><th>타율</th><th>홈런</th><th>타점</th><th>득점</th><th>도루</th></tr>
    <tr><td>${b.G}</td><td>${fmtRate(b.AVG)}</td><td>${b.HR}</td><td>${b.RBI}</td><td>${b.R}</td><td>${b.SB}</td></tr>
    <tr><th>출루율</th><th>장타율</th><th>OPS</th><th>볼넷</th><th>삼진</th><th>WAR</th></tr>
    <tr><td>${fmtRate(b.OBP)}</td><td>${fmtRate(b.SLG)}</td><td>${fmtRate(b.OPS)}</td><td>${b.BB}</td><td>${b.K}</td><td>${b.WAR}</td></tr>
    ${
      b.BABIP !== undefined
        ? `<tr><th>BABIP</th><th>안타</th><th>2루타</th><th>실책</th><th>수비율</th><th>${b.SBA ? "도루저지" : "타석"}</th></tr>
    <tr><td>${fmtRate(b.BABIP)}</td><td>${b.H}</td><td>${b.D}</td><td>${b.CH ? b.E : "-"}</td><td>${b.CH ? fmtRate(b.FPCT) : "-"}</td><td>${b.SBA ? `${fmtRate(b.CS / b.SBA)}` : b.PA}</td></tr>`
        : ""
    }${batSaberRow(b)}</table>`;
}

function pitRecordHtml(p) {
  return `<table><tr><th>경기</th><th>승</th><th>패</th><th>홀드</th><th>세이브</th><th>이닝</th></tr>
    <tr><td>${p.G}</td><td>${p.W}</td><td>${p.L}</td><td>${p.HLD}</td><td>${p.SV}</td><td>${fmtInnings(p.outs)}</td></tr>
    <tr><th>평균자책</th><th>탈삼진</th><th>볼넷</th><th>피홈런</th><th>WHIP</th><th>WAR</th></tr>
    <tr><td>${p.ERA.toFixed(2)}</td><td>${p.K}</td><td>${p.BB}</td><td>${p.HR}</td><td>${p.WHIP.toFixed(2)}</td><td>${p.WAR}</td></tr>
    ${
      p.BABIP !== undefined
        ? `<tr><th>피BABIP</th><th>피안타</th><th>실점</th><th>자책</th><th>실책</th><th>K/9</th></tr>
    <tr><td>${fmtRate(p.BABIP)}</td><td>${p.H}</td><td>${p.R}</td><td>${p.ER}</td><td>${p.CH ? p.E : "-"}</td><td>${p.outs ? ((p.K * 27) / p.outs).toFixed(1) : "-"}</td></tr>`
        : ""
    }${pitSaberRow(p)}</table>`;
}

function showSeasonResult(report) {
  const box = $("tab-result");
  if (!report) {
    box.innerHTML = "<p class='empty'>아직 치른 시즌이 없어요.</p>";
    return;
  }
  let html = `<h3>${report.year}년 (${koreanAge(report.age)}세) 시즌 <small>${LEAGUES[report.league].name} · ${report.team}</small></h3>`;

  if (report.standing) {
    const s = report.standing;
    const ps = s.seed
      ? ` <span class="ps">${s.psLabel} 진출${report.league === "KBO" ? "" : ` · ${s.seed}번 시드`}</span>`
      : s.psLabel
        ? ` <span class="ps out">${s.psLabel} 탈락</span>`
        : "";
    html += `<p class="standing">${s.group ? `${s.group} ` : ""}<b>${s.rank}위</b> / ${s.teams}팀 · ${s.w}승 ${s.l}패${ps}</p>`;
  }
  if (report.events.length) html += `<p class="chips">${report.events.map((e) => `<span>${e}</span>`).join("")}</p>`;
  if (report.hsLeague) html += hsLeagueHtml(report.hsLeague);
  if (report.hsTournaments) html += hsTournamentHtml(report.hsTournaments);
  if (report.collegeCups) html += hsTournamentHtml(report.collegeCups, "대학 전국대회 성적");
  if (report.standing && report.standing.table) html += standingTableHtml(report);
  if (report.standing && report.standing.monthly) html += monthlyChartHtml(report);
  if (report.half1)
    html += `<p class="small">전반기 ${report.half1.rank}위 (${report.half1.w}승 ${report.half1.l}패) → 최종 ${report.standing ? report.standing.rank + "위" : "-"}</p>`;
  if (report.bat) html += `<h4>타격 <small>${report.bat.role}</small></h4>` + batRecordHtml(report.bat);
  if (report.pit) html += `<h4>투구 <small>${report.pit.role}</small></h4>` + pitRecordHtml(report.pit);
  html += minorLineHtml(report); // 2군·콜업 기록 (roster.js)
  if (report.regDays !== undefined)
    html += `<p class="small">1군 등록 ${report.regDays}일 (FA 1시즌 기준 145일)${report.injDays ? ` · 부상 ${report.injDays}일` : ""}${report.downDays ? ` · 말소 ${report.downDays}일` : ""}</p>`;
  html += seasonGoalsHtml(report); // 캠프 때 세운 목표 (phases.js)
  if (report.monthlyMvp && report.monthlyMvp.length)
    html += `<p class="chips awards">${report.monthlyMvp.map((m) => `<span>🗓️ ${m}월 ${report.league === "MLB" ? "이달의 선수" : "월간 MVP"}</span>`).join("")}</p>`;
  html += raceChartHtml(report); // 홈런왕·탈삼진왕 레이스 (charts.js)
  html += trackingHtml(report); // 트래킹 데이터 (broadcast.js)
  html += nemesisResultHtml(report); // 숙적 맞대결 (nemesis.js)
  if (report.ranks) {
    html += `<h4>리그 순위</h4><p class="chips">${report.ranks
      .map((r) => `<span class="${r.rank <= 3 ? "top" : ""}">${r.label} ${r.rank > 30 ? "30위 밖" : r.rank + "위"}</span>`)
      .join("")}</p>`;
  }
  if (report.national) html += `<p>🇰🇷 ${report.national.name}: <b>${report.national.result}</b></p>`;
  if (report.awards.length) html += `<p class="chips awards">${report.awards.map((a) => awardChip(a)).join("")}</p>`;
  if (report.postseason) html += postseasonHtml(report);
  if (report.races) html += racesHtml(report);
  if (report.allStar)
    html += `<p class="small">⭐ 올스타 선정${report.allStar.fanPick ? " (팬 투표 1위!)" : ""}${report.allStar.mvp ? " · 미스터 올스타 (올스타전 MVP)" : ""}</p>`;
  if (report.salary) html += `<p class="small">올해 연봉 ${fmtMoney(report.salary)} 수령</p>`;
  if (report.newAchievements && report.newAchievements.length) {
    html += `<p class="chips awards">${report.newAchievements.map((a) => `<span>🏅 업적: ${a}</span>`).join("")}</p>`;
  }
  if (report.fameChange) html += `<p class="small">팬 여론 ${report.fameChange > 0 ? "+" : ""}${report.fameChange}</p>`;
  if (report.rival) {
    const r = report.rival;
    html += `<div class="rival-box"><h4>⚔️ 라이벌 ${r.name} <small>${LEAGUES[r.league].name} · ${r.team} · OVR ${r.ovr}</small></h4>
      <p>${r.line} · WAR ${r.WAR}${report.bat || report.pit ? ` <span class="${report.WAR >= r.WAR ? "win" : "lose"}">(나 ${report.WAR} → ${report.WAR >= r.WAR ? "승" : "패"})</span>` : ""}</p>
      ${r.awards.length ? `<p class="chips">${r.awards.map((a) => `<span>${a}</span>`).join("")}</p>` : ""}</div>`;
  }
  // 제목 누르면 뉴스 탭 기사로 (news.js)
  html += `<div class="news"><h4>뉴스 <small>(제목을 누르면 기사 본문)</small></h4>${report.news.map((n, i) => (isArticle(n) ? `<p class="news-link" onclick="openArticle(${i})">📰 ${n}</p>` : `<p>📰 ${n}</p>`)).join("")}</div>`;
  html += `<button class="secondary" onclick="setTab('board')">팬 반응 보러 가기 💬</button>`;
  html += `<button onclick="setTab('train')">다음 시즌 준비하기 ⚾</button>`;
  box.innerHTML = html;
}

// 고교 전국대회 성적표
function hsLeagueHtml(list) {
  return `<h4>주말리그 <small>(${list[0].region}권)</small></h4><ul class="hs-cups">${list
    .map(
      (x) =>
        `<li><span>${x.half}</span><b class="${x.rank === 1 ? "gold" : x.qualified ? "good" : ""}">${x.rank}위 / ${x.size}팀 · ${x.w}승 ${x.l}패${x.qualified ? " · 본선 진출" : ""}</b></li>`,
    )
    .join(
      "",
    )}</ul><p class="small">전반기 상위 절반은 황금사자기·청룡기, 후반기 상위 절반은 대통령배 본선에 나가요. 이마트배·봉황대기는 모든 학교가 참가해요.</p>`;
}

function hsTournamentHtml(list, title) {
  const cls = (r) => (r === "우승" ? "gold" : r === "준우승" || r === "4강" || r === "결승 진출" ? "good" : r === "8강" ? "mid" : "");
  return `<h4>${title || "전국대회 성적"}</h4><ul class="hs-cups">${list
    .map((t) => `<li><span>${t.name}</span><b class="${cls(t.result)}">${t.result === "결승 진출" ? "결승 (결정적 순간!)" : t.result}</b></li>`)
    .join("")}</ul>`;
}

// 월별 순위 그래프 (SVG): 우리 팀은 굵은 금색 선, 다른 팀은 흐린 회색 선
function monthlyChartHtml(report) {
  const s = report.standing;
  const m = s.monthly;
  const n = m.months.length;
  const N = s.teams;
  const W = 340,
    H = 200,
    L = 34,
    R = 64,
    T = 12,
    B = 26;
  const x = (i) => L + (i * (W - L - R)) / (n - 1);
  const y = (rank) => T + ((rank - 1) * (H - T - B)) / (N - 1);
  let svg = `<svg class="rank-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="월별 팀 순위">`;
  // 가로 눈금선 (순위마다)
  for (let r = 1; r <= N; r++) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(r)}" y2="${y(r)}" class="grid"/>`;
    if (r === 1 || r === N || r % 5 === 0) svg += `<text x="${L - 6}" y="${y(r) + 4}" text-anchor="end" class="axis">${r}위</text>`;
  }
  m.months.forEach((mon, i) => (svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="axis">${mon}월</text>`));
  // 다른 팀들
  for (const [team, ranks] of Object.entries(m.ranks)) {
    if (team === report.team) continue;
    const pts = ranks.map((r, i) => `${x(i)},${y(r)}`).join(" ");
    svg += `<polyline points="${pts}" class="other"><title>${team}: 최종 ${ranks[n - 1]}위</title></polyline>`;
  }
  // 우리 팀
  const mine = m.ranks[report.team];
  svg += `<polyline points="${mine.map((r, i) => `${x(i)},${y(r)}`).join(" ")}" class="mine"/>`;
  mine.forEach((r, i) => {
    const tip = `${m.months[i]}월: ${r}위 (누적 ${m.wins[report.team][i]}승)`;
    svg += `<circle cx="${x(i)}" cy="${y(r)}" r="4.5" class="dot"/><circle cx="${x(i)}" cy="${y(r)}" r="12" class="hit"><title>${tip}</title></circle>`;
  });
  svg += `<text x="${x(n - 1) + 10}" y="${y(mine[n - 1]) + 4}" class="end">최종 ${mine[n - 1]}위</text></svg>`;

  let html = `<h4>월별 순위</h4><p class="legend"><span class="sw mine"></span>${report.team} <span class="sw other"></span>다른 팀 <small>(점을 누르면 그달 성적)</small></p>${svg}`;
  html += `<p class="small">${m.months.map((mon, i) => `${mon}월 ${mine[i]}위`).join(" → ")}</p>`;

  // 내 월별 성적 막대
  const my = s.myMonthly;
  if (my) {
    const max = Math.max(...my.values);
    html += `<h4>${my.label}</h4><div class="month-bars">${my.values
      .map(
        (v, i) =>
          `<div><span class="val">${my.isBat ? fmtRate(v) : v.toFixed(2)}</span><span class="bar-v" style="height:${Math.round((v / max) * 60) + 4}px"></span><span class="mon">${m.months[i]}월</span></div>`,
      )
      .join("")}</div>`;
  }
  return html;
}

// ---------------------------------------------
// 스카우트 평가, 포스트시즌, 타이틀 경쟁
// ---------------------------------------------

// 스카우트 평가: 드래프트 점수 = OVR + 학교(강호 +9 / 강팀 +6 / 중위권 +3) + 시즌 WAR x1.5(최대 8) + 전국대회(최대 4)
function scoutHtml(player) {
  const o = draftOutlook(player);
  if (!o) return "";
  const gap = o.score - o.line;
  let verdict = o.round ? `<b class="good">지명권 · 예상 ${o.round}라운드</b>` : `<b class="bad">지명 기준까지 ${-gap}점</b>`;
  let scoreText = `<b>${o.score}</b>`;
  const fog = fogDraft(player, o); // 아마추어는 범위로만 (saber.js)
  if (fog) {
    scoreText = `<b>${fog.lo}~${fog.hi}</b>`;
    verdict = fog.lo >= o.line ? `<b class="good">지명권 유력</b>` : fog.hi < o.line ? `<b class="bad">지명 기준 미달</b>` : `<b>지명 경계선</b>`;
  }
  return `<div class="scout"><h4>🔍 스카우트 평가 <small>(지난 시즌 기준)</small></h4>
    <p>드래프트 점수 ${scoreText} / 지명 기준 ${o.line} · ${verdict}${o.mlb ? ' · <b class="gold">MLB 스카우트 관심</b>' : ""}</p>
    <p class="small">점수 = OVR + ${player.league === "HS" ? "학교 수준 + 전국대회 성적 + " : "대학 검증 +3 + 대학 대회 성적 + "}시즌 WAR. OVR ${o.sure} 이상이면 점수와 상관없이 지명돼요. 확률이 아니라 이 기준으로 정해져요.</p></div>`;
}

// 포스트시즌 경기 결과
const PS_NAMES = {
  KBO: { 4: "와일드카드", 3: "준플레이오프", 2: "플레이오프", 1: "한국시리즈" },
  NPB: { 3: "CS 퍼스트", 2: "CS 파이널", 1: "재팬시리즈" },
  MLB: { 4: "와일드카드 시리즈", 3: "디비전 시리즈", 2: "챔피언십 시리즈", 1: "월드시리즈" },
  ABL: { 2: "준결승 시리즈", 1: "챔피언십 시리즈" },
};
function postseasonHtml(report) {
  const names = PS_NAMES[report.league] || {};
  return `<h4>포스트시즌</h4><p class="chips">${report.postseason
    .map(
      (g) =>
        `<span class="${g.won && !g.pending ? "top" : ""}">${names[g.round] || g.round + "라운드"} ${g.pending ? "⚡ 결정적 순간!" : g.won ? "승리" : "탈락"}</span>`,
    )
    .join("")}</p>${psStatHtml(report)}`;
}

// 수상 레이스: 내 점수 vs 수상 기준
function racesHtml(report) {
  const fmt = (r, v) => (r.unit === "ops" ? fmtRate(v) : v);
  let html = `<h4>수상 레이스 <small>(기준을 넘으면 수상)</small></h4><table class="races"><tr><th>상</th><th>내 점수</th><th>기준</th><th>결과</th></tr>`;
  for (const r of report.races) {
    html += `<tr><td>${r.award}</td><td>${fmt(r, r.mine)}</td><td>${fmt(r, r.need)}</td><td class="${r.won ? "won" : "lost"}">${r.won ? "수상" : "-"}</td></tr>`;
  }
  html += "</table>";
  if (report.impact !== undefined)
    html += `<p class="small">MVP 점수 = WAR + 타이틀 + 굵직한 기록(40-40, 3관왕) + 팀 성적 + 인기. 올스타 = WAR + 인기 + 팬 투표(구단 팬덤 + 팀 성적${report.fanVote !== undefined ? `, 올해 ${report.fanVote >= 0 ? "+" : ""}${report.fanVote}` : ""}). 골든글러브는 포지션별 WAR, 실버슬러거는 OPS, 수비상은 수비 능력치로 봐요.</p>`;
  return html;
}

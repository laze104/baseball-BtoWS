// =============================================
// living.js : 살아 있는 세계
// 1. 예전에 키운 선수(역대 랭킹)가 KBO 감독 후보로 돌아옴
// 2. 명예의 전당 선수가 해설·시구·올스타 레전드 매치에 나옴
// 3. 기록 사냥: 실제 KBO 기록 + 내가 키웠던 선수 기록. 다가가면 알림, 깨면 큰 화면
// =============================================

// 랭킹에서 쓸 만한 옛 선수 (제명된 선수는 빼고)
function pastPlayers() {
  return loadRanking().filter((r) => !r.banned);
}
function hallOfFamers(player) {
  return pastPlayers().filter((r) => r.hof);
}
function retireYearOf(r) {
  if (r.retireYear) return r.retireYear;
  const h = r.history && r.history[r.history.length - 1];
  return h ? h.year + 1 : null;
}

// ---------------------------------------------
// 1. 옛 선수 감독 후보 (world.js managerCandidates 끝에 붙음)
// ---------------------------------------------
function pastPlayerManagers(player, year, ok) {
  const list = [];
  for (const r of pastPlayers()) {
    const ry = retireYearOf(r);
    if (!ry || year - ry < 3 || r.name === player.name) continue;
    if (!(r.WAR >= 25 || r.hof) || !(r.leagues || []).includes("KBO")) continue;
    const born = ry - (r.retireAge || 38) - 1;
    if (year + 1 - born > 66 || !ok(r.name)) continue;
    const hash = [...r.name].reduce((h, c) => h + c.charCodeAt(0), 0);
    const style = r.type === "pitcher" ? "pitch" : ["trust", "results", "talk", "youth", "run"][hash % 5];
    list.push({
      m: { name: r.name, born, style, legend: !!r.hof, pastPlayer: true, note: `내가 키웠던 선수 · 통산 WAR ${r.WAR}${r.hof ? " · 명예의 전당" : ""}` },
      w: r.hof ? 2 : 1.2,
    });
  }
  return list;
}

// ---------------------------------------------
// 2. 레전드 해설·시구
// ---------------------------------------------
function legendCommentary(player, choice, pbp, ok) {
  const hof = hallOfFamers(player);
  if (!hof.length || !pbp || Math.random() >= 0.5) return pbp;
  const h = pick(hof);
  const was = h.type === "pitcher" ? "투수" : "타자";
  const before =
    choice.side === "bat"
      ? pick([`"저도 현역 때 이런 타석 많이 서 봤는데요, 이럴 땐 노림수 하나만 가져가야 합니다."`, `"투수가 더 떨려요. 타자는 자신 있게 가면 됩니다."`])
      : pick([`"지금 포수 사인이 중요합니다. ${was} 출신으로 보면 여기서 도망가면 안 돼요."`, `"이 순간엔 공 하나하나가 시즌 전체 무게예요."`]);
  const after = ok
    ? pick([`"이게 스타죠! 제 현역 때보다 낫네요."`, `"소름 돋았습니다. 오늘 이 장면 오래 기억될 거예요."`])
    : pick([`"아… 결과는 아쉽지만 피하지 않은 건 칭찬해야 합니다."`, `"이런 날도 있어요. 저도 많이 울어 봤습니다."`]);
  const out = pbp.slice();
  out.splice(Math.max(2, out.length - 1), 0, `🎙️ 해설 ${h.name} 위원 (명예의 전당): ${before}`);
  out.push(`🎙️ ${h.name} 위원: ${after}`);
  return out;
}

// 올스타 레전드 매치, 개막전 시구
function legendEvents(player, report) {
  if (report.league !== "KBO") return;
  const hof = hallOfFamers(player);
  if (!hof.length) return;
  if (report.awards.includes("올스타") && Math.random() < 0.5) {
    const [a, b] = shuffle(hof);
    report.news.push(
      b
        ? `올스타전 레전드 매치! 명예의 전당 ${a.name}·${b.name} 재회… ${player.name}${josaOf(player.name, "도")} 한 팀으로 뛰었다`
        : `올스타전 시구자로 명예의 전당 ${a.name} 등장… ${player.name}과 기념 촬영`,
    );
  } else if (Math.random() < 0.12) {
    const a = pick(hof);
    report.news.push(`${report.team} 개막전 시구에 명예의 전당 ${a.name}… 전광판에 '통산 WAR ${a.WAR}'`);
  }
}

// ---------------------------------------------
// 3. 기록 사냥 (실제 KBO 기록은 2024 시즌 끝 기준)
// ---------------------------------------------
const KBO_RECORDS = [
  { id: "cHR", kind: "career", label: "통산 홈런", side: "bat", stat: "HR", value: 495, holder: "최정", near: 30, unit: "개" },
  { id: "cSB", kind: "career", label: "통산 도루", side: "bat", stat: "SB", value: 549, holder: "전준호", near: 40, unit: "개" },
  { id: "cW", kind: "career", label: "통산 승리", side: "pit", stat: "W", value: 210, holder: "송진우", near: 15, unit: "승" },
  { id: "cSV", kind: "career", label: "통산 세이브", side: "pit", stat: "SV", value: 427, holder: "오승환", near: 30, unit: "세이브" },
  { id: "sHR", kind: "season", label: "단일 시즌 홈런", side: "bat", stat: "HR", value: 56, holder: "이승엽", year: 2003, unit: "개" },
  {
    id: "sAVG",
    kind: "season",
    label: "단일 시즌 타율",
    side: "bat",
    stat: "AVG",
    value: 0.412,
    holder: "백인천",
    year: 1982,
    rate: true,
    qualify: (b) => b.PA >= 446,
  },
  { id: "sH", kind: "season", label: "단일 시즌 안타", side: "bat", stat: "H", value: 202, holder: "레이예스", year: 2024, unit: "개" },
  { id: "sRBI", kind: "season", label: "단일 시즌 타점", side: "bat", stat: "RBI", value: 146, holder: "박병호", year: 2015, unit: "타점" },
  { id: "sSB", kind: "season", label: "단일 시즌 도루", side: "bat", stat: "SB", value: 84, holder: "이종범", year: 1994, unit: "개" },
  { id: "sW", kind: "season", label: "단일 시즌 승리", side: "pit", stat: "W", value: 30, holder: "장명부", year: 1983, unit: "승" },
  { id: "sSV", kind: "season", label: "단일 시즌 세이브", side: "pit", stat: "SV", value: 47, holder: "오승환", year: 2011, unit: "세이브" },
  { id: "sK", kind: "season", label: "단일 시즌 탈삼진", side: "pit", stat: "K", value: 225, holder: "미란다", year: 2021, unit: "개" },
  {
    id: "sERA",
    kind: "season",
    label: "단일 시즌 평균자책",
    side: "pit",
    stat: "ERA",
    value: 0.78,
    holder: "선동열",
    year: 1993,
    low: true,
    qualify: (p) => p.outs >= 432,
  },
];

const recFmt = (rec, v) => (rec.rate ? fmtRate(v) : rec.low ? Number(v).toFixed(2) : `${v}${rec.unit || ""}`);
const better = (rec, a, b) => (rec.low ? a < b : a > b);

// 시즌 기록 한 줄에서 값 꺼내기
function seasonValue(rec, h) {
  const s = rec.side === "bat" ? h.bat : h.pit;
  if (!s || h.league !== "KBO") return null;
  if (rec.qualify && !rec.qualify(s)) return null;
  return s[rec.stat] === undefined ? null : s[rec.stat];
}

function kboCareer(rec, history) {
  let v = 0;
  for (const h of history) {
    const s = rec.side === "bat" ? h.bat : h.pit;
    if (s && h.league === "KBO") v += s[rec.stat] || 0;
  }
  return v;
}

// 지금 기록 보유자: 실제 기록 vs 내가 키웠던 선수들 vs 지금 선수의 지난 시즌
function currentRecord(rec, player, exceptYear, past) {
  let best = { value: rec.value, holder: rec.holder, year: rec.year, real: true };
  for (const r of past || pastPlayers()) {
    if (!r.history) continue;
    if (rec.kind === "career") {
      const v = kboCareer(rec, r.history);
      if (better(rec, v, best.value)) best = { value: v, holder: r.name, mine: true };
    } else {
      for (const h of r.history) {
        const v = seasonValue(rec, h);
        if (v !== null && better(rec, v, best.value)) best = { value: v, holder: r.name, year: h.year, mine: true };
      }
    }
  }
  if (rec.kind === "season" && player) {
    for (const h of player.history) {
      if (h.year === exceptYear) continue;
      const v = seasonValue(rec, h);
      if (v !== null && better(rec, v, best.value)) best = { value: v, holder: player.name, year: h.year, self: true };
    }
  }
  return best;
}

// 시즌 끝날 때마다
function recordHunt(player, report) {
  if (!player.recordsBroken) player.recordsBroken = {};
  if (!player.recordAlerts) player.recordAlerts = {};
  report.bigMoments = report.bigMoments || [];
  const past = pastPlayers(); // 랭킹 한 번만 읽음
  for (const rec of KBO_RECORDS) {
    if (rec.kind === "season") {
      if (report.league !== "KBO") continue;
      const v = seasonValue(rec, { league: "KBO", bat: report.bat, pit: report.pit });
      if (v === null) continue;
      const cur = currentRecord(rec, player, report.year, past);
      if (!better(rec, v, cur.value)) continue;
      player.recordsBroken[`${rec.id}-${report.year}`] = { label: rec.label, value: v, year: report.year };
      const who = cur.self ? "자기 기록" : `${cur.holder}${cur.year ? `(${cur.year})` : ""}의 기록`;
      report.news.push(`[KBO 신기록] ${player.name}, ${rec.label} ${recFmt(rec, v)}! ${who} 넘었다`);
      report.bigMoments.push({
        tone: "gold",
        kicker: "📜 KBO 신기록",
        title: `${rec.label} ${recFmt(rec, v)}`,
        lines: [
          `종전 기록: ${cur.holder} ${recFmt(rec, cur.value)}${cur.year ? ` (${cur.year})` : ""}`,
          cur.mine ? "내가 키웠던 선수의 기록을 넘었어요" : cur.self ? "자기 기록을 스스로 갈아치웠어요" : "KBO 역사책이 새로 쓰였어요",
        ],
      });
    } else {
      if (!PRO_LEAGUES.includes(report.league)) continue;
      const mine = kboCareer(rec, player.history);
      if (!mine) continue;
      const cur = currentRecord(rec, player, null, past);
      const left = cur.value - mine + 1;
      if (left <= 0) {
        if (player.recordsBroken[rec.id]) {
          player.recordsBroken[rec.id].value = mine;
          continue;
        }
        player.recordsBroken[rec.id] = { label: rec.label, value: mine, year: report.year };
        report.news.push(`[KBO 신기록] ${player.name}, ${rec.label} ${mine}${rec.unit}! ${cur.holder}${josaOf(cur.holder, "을")} 넘어 역대 1위`);
        report.bigMoments.push({
          tone: "gold",
          kicker: "👑 KBO 통산 최다",
          title: `${rec.label} ${mine}${rec.unit}`,
          lines: [`종전 1위: ${cur.holder} ${cur.value}${rec.unit}`, cur.mine ? "내가 키웠던 선수의 기록을 넘었어요" : "KBO 역사상 가장 높은 곳"],
        });
      } else if (left <= rec.near && report.league === "KBO") {
        report.news.push(`${player.name}, ${cur.holder}의 KBO ${rec.label} 기록(${cur.value}${rec.unit})까지 ${left}${rec.unit}`);
        if (!player.recordAlerts[rec.id]) {
          player.recordAlerts[rec.id] = report.year;
          report.bigMoments.push({
            tone: "good",
            kicker: "📜 기록 사냥",
            title: `${cur.holder}까지 ${left}${rec.unit}`,
            lines: [`KBO ${rec.label} 1위 ${cur.holder} ${cur.value}${rec.unit}`, `지금 ${player.name} ${mine}${rec.unit}`],
          });
        }
      }
    }
  }
}

function recordHuntHtml(player) {
  const pro = player.history.some((h) => h.league === "KBO");
  const past = pastPlayers();
  let html = `<h4>📜 KBO 기록 사냥 <small>(실제 기록은 2024 시즌 끝 기준 + 내가 키웠던 선수들)</small></h4><table class="records"><tr><th>기록</th><th>보유자</th><th>기록</th><th>${player.name}</th></tr>`;
  for (const rec of KBO_RECORDS) {
    if (player.type !== "twoway" && rec.side !== (player.type === "batter" ? "bat" : "pit")) continue;
    let cur = currentRecord(rec, player, null, past);
    let me = "-";
    if (pro) {
      if (rec.kind === "career") {
        const v = kboCareer(rec, player.history);
        me = `${v}${rec.unit}`;
        if (v > cur.value) cur = { value: v, holder: player.name, self: true };
      } else {
        const vals = player.history.map((h) => seasonValue(rec, h)).filter((v) => v !== null);
        if (vals.length) me = recFmt(rec, rec.low ? Math.min(...vals) : Math.max(...vals));
      }
    }
    const broke = cur.self || Object.values(player.recordsBroken || {}).some((b) => b.label === rec.label);
    html += `<tr class="${broke ? "mine" : ""}"><td>${rec.label}</td><td>${cur.holder}${cur.year ? ` <small>${cur.year}</small>` : ""}${cur.mine ? " <small>⭐내 선수</small>" : ""}</td><td>${recFmt(rec, cur.value)}</td><td>${me}</td></tr>`;
  }
  return html + "</table>";
}

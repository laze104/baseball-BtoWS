// =============================================
// feed.js : 기사 제목과 커뮤니티 댓글 만들기
// =============================================

// "{name}, {HR}홈런" 같은 템플릿의 {칸}을 실제 값으로 채워요
function fillText(template, player, extra) {
  const values = {
    name: player.name,
    team: player.team,
    school: player.school,
    league: LEAGUES[player.league] ? LEAGUES[player.league].name : "",
    ...extra,
  };
  return template.replace(/\{(\w+)\}/g, (match, key) => (values[key] !== undefined ? values[key] : match));
}

// 이번 시즌이 잘한 시즌인지: great / good / bad
function seasonGrade(report, side) {
  const rec = report[side];
  if (TOP_LEAGUES.includes(report.league)) {
    if (rec.WAR >= 4) return "great";
    if (rec.WAR >= 1.5) return "good";
    return "bad";
  }
  if (side === "bat") return rec.OPS >= 0.95 ? "great" : rec.OPS >= 0.76 ? "good" : "bad";
  return rec.ERA <= 2.5 ? "great" : rec.ERA <= 4.3 ? "good" : "bad";
}

function recordValues(report) {
  const v = {};
  if (report.bat) {
    v.HR = report.bat.HR; v.RBI = report.bat.RBI;
    v.AVG = fmtRate(report.bat.AVG); v.OPS = fmtRate(report.bat.OPS);
  }
  if (report.pit) {
    v.ERA = report.pit.ERA.toFixed(2); v.K = report.pit.K; v.W = report.pit.W;
  }
  return v;
}

// ---------------------------------------------
// 댓글 하나 만들기: 닉네임, IP 일부, 시간, 추천/비추천
// ---------------------------------------------
function makeComment(text, player, extra, mood) {
  const nick = pick(NICKS);
  const isGuest = nick === "ㅇㅇ";
  const likeBase = mood === "hot" ? 40 : 8;
  const hour = String(randomInt(18, 23)).padStart(2, "0");
  const minute = String(randomInt(0, 59)).padStart(2, "0");
  return {
    nick,
    ip: isGuest ? `${randomInt(1, 223)}.${randomInt(1, 255)}` : "",
    text: fillText(text, player, extra),
    likes: randomInt(0, likeBase) + (Math.random() < 0.15 ? randomInt(50, 300) : 0),
    dislikes: randomInt(0, 15),
    time: `${hour}:${minute}`,
  };
}

// 리스트에서 겹치지 않게 n개 뽑기
function pickMany(list, n) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, n);
}

function buildFeed(player, report) {
  const news = [];
  const values = { ...recordValues(report), team: report.team };

  // 사회복무 시즌처럼 경기 기록이 없는 해
  if (!report.bat && !report.pit) {
    report.grade = "none";
    for (const sp of report.specials) {
      const template = NEWS.special[sp.key];
      if (template) news.push(fillText(template, player, { ...values, ...sp, team: sp.team || player.team }));
    }
    const texts = pickMany(FAN.military, 3);
    if (report.rival) texts.push(...pickMany(FAN.rival, 1));
    report.news = news.length ? news : [fillText(NEWS.special.service, player, {})];
    report.comments = texts.map((t) => makeComment(t, player, { rival: report.rival ? report.rival.name : "" }, "normal"));
    return;
  }

  // 이도류는 더 잘한 쪽으로 기사를 써요
  let side = report.bat ? "bat" : "pit";
  if (report.bat && report.pit && report.pit.WAR > report.bat.WAR) side = "pit";
  const grade = report[side].G > 0 ? seasonGrade(report, side) : "bad";
  report.grade = grade;

  // 기사: 시즌 총평 1개 + 특별 기사들
  const pool = side === "bat" ? NEWS.batter : NEWS.pitcher;
  news.push(fillText(pick(pool[grade]), player, values));
  for (const sp of report.specials) {
    const template = NEWS.special[sp.key];
    if (template) news.push(fillText(template, player, { ...values, ...sp, team: sp.team || player.team }));
  }

  // 댓글: 성적 반응 6~8개 + 상황별 반응
  let texts;
  if (grade === "bad") texts = pickMany(side === "bat" ? FAN.batterBad : FAN.pitcherBad, randomInt(6, 8));
  else texts = pickMany(FAN[grade], randomInt(6, 8));
  if (grade === "great") texts.push(...pickMany(FAN.good, 2)); // 칭찬 속에 담백한 반응도
  if (grade === "bad") texts.push(...pickMany(FAN.good, 1));   // 쉴드 치는 팬도 한 명

  const keys = report.specials.map((s) => s.key);
  const add = (pool, n) => texts.push(...pickMany(pool, n));
  if (keys.includes("draft") || keys.includes("draftTop")) add(FAN.draft, 2);
  if (keys.includes("undrafted")) add(FAN.undrafted, 2);
  if (keys.includes("callup")) add(FAN.callup, 2);
  if (keys.includes("injury")) add(FAN.injury, 2);
  if (keys.includes("twowayAwaken")) add(FAN.twoway, 2);
  if (keys.includes("medal")) add(FAN.medal, 2);
  if (keys.includes("nationalCall")) add(FAN.national, 2);
  if (keys.includes("exempt")) add(FAN.exempt, 2);
  if (keys.includes("discharge")) add(FAN.military, 1);
  if (keys.includes("nickname")) add(FAN.nickname, 2);
  if (keys.includes("franchise")) add(FAN.franchise, 2);
  if (keys.includes("rivalWin") || keys.includes("rivalLose")) add(FAN.rival, 2);
  if (keys.includes("revival")) add(FAN.revival, 3);
  if (keys.includes("mlbCallup")) add(FAN.mlbCall, 3);
  if (keys.includes("mlbScout")) add(FAN.mlbDirect, 2);
  if (report.awards.includes("올스타")) add(FAN.allstar, 1);
  if ((player.fame || 0) >= 40) add(FAN.fameHigh, 2);
  if ((player.fame || 0) <= -30) add(FAN.fameLow, 2);

  const draftInfo = report.specials.find((s) => s.round);
  const extra = {
    round: draftInfo ? draftInfo.round : "", team: report.team,
    nick: player.nickname || "", rival: report.rival ? report.rival.name : "",
  };
  const comments = texts.map((t) => makeComment(t, player, extra, grade === "bad" ? "hot" : "normal"));
  comments.sort(() => Math.random() - 0.5);

  report.news = news;
  report.comments = comments;
}

// 선택이나 쇼핑 뒤에 기사와 댓글을 덧붙여요
function addReaction(player, report, newsLines, pool, extra) {
  if (!report) return;
  report.news.push(...newsLines);
  if (!report.comments) report.comments = [];
  for (const t of pickMany(pool, 3)) report.comments.unshift(makeComment(t, player, extra || {}, "normal"));
}

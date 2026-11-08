// =============================================
// feed.js : 기사 제목과 커뮤니티 댓글 만들기
// =============================================

// "{name}, {HR}홈런" 같은 템플릿의 {칸}을 실제 값으로 채움
function fillText(template, player, extra) {
  const values = {
    name: player.name,
    team: player.team,
    school: player.school,
    league: LEAGUES[player.league] ? LEAGUES[player.league].name : "",
    tt: typeof teamTilde === "function" ? teamTilde((extra && extra.team) || player.team) : "", // 삼~성 식 (news.js)
    ...extra,
  };
  // {rival|은} 처럼 쓰면 받침 보고 은/는 붙여줌
  return template.replace(/\{(\w+)(?:\|([^}]+))?\}/g, (match, key, j) => {
    if (values[key] === undefined) return match;
    return j ? values[key] + josaOf(values[key], j) : values[key];
  });
}

const JOSA_PAIRS = { 은: ["은", "는"], 는: ["은", "는"], 이: ["이", "가"], 가: ["이", "가"], 을: ["을", "를"], 를: ["을", "를"], 과: ["과", "와"], 와: ["과", "와"], 이랑: ["이랑", "랑"], 으로: ["으로", "로"] };
function josaOf(word, j) {
  const pair = JOSA_PAIRS[j];
  if (!pair) return j;
  const c = String(word).charCodeAt(String(word).length - 1);
  const batchim = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  if (j === "으로" && batchim && (c - 0xac00) % 28 === 8) return "로"; // ㄹ받침은 '로'
  return batchim ? pair[0] : pair[1];
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
  v.WAR = report.WAR;
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
    makePost(player, report, "none"); // 커뮤 글 제목 (news.js)
    applySkin(report);
    return;
  }

  // 이도류는 더 잘한 쪽으로 기사를 씀
  let side = report.bat ? "bat" : "pit";
  if (report.bat && report.pit && report.pit.WAR > report.bat.WAR) side = "pit";
  const grade = report[side].G > 0 ? seasonGrade(report, side) : "bad";
  report.grade = grade;

  // 기사: 시즌 총평 1개 + 특별 기사들
  const pool = side === "bat" ? NEWS.batter : NEWS.pitcher;
  news.push(fillText(pick(pool[grade]), player, values));
  report.summaryTitle = news[0]; // 뉴스 탭에서 시즌 총평 기사로 씀
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
  // v15: 진짜 커뮤처럼 숫자 언급, 짧은 드립, 키배, 팀 얘기
  if (TOP_LEAGUES.includes(report.league)) {
    if (grade === "bad") add(side === "bat" ? FAN.statBatBad : FAN.statPitBad, 1);
    else add(side === "bat" ? FAN.statBat : FAN.statPit, 1);
    add(FAN.teamTalk, Math.random() < 0.5 ? 1 : 0);
    if (grade !== "bad" && Math.random() < 0.5) add(FAN.fight, 1);
  }
  add(FAN.meme, randomInt(1, 2));
  if (keys.includes("tradeMid") || keys.includes("tradeAfter")) add(FAN.trade, 3);
  if (keys.includes("historic")) add(FAN.historic, 4);
  if (keys.includes("autumnHot")) add(FAN.autumn, 2);
  if (keys.includes("seasonHot") && Math.random() < 0.6) add(FAN.season, 1);
  if (keys.includes("glassHurt") || (report.injury && report.injury.glass)) add(FAN.glass, 2);
  if (keys.includes("serviceInjury")) texts.push("FA 1년 밀렸네 ㅠㅠ 몸이 재산이다");
  if ((player.fame || 0) >= 40) add(FAN.fameHigh, 2);
  if ((player.fame || 0) <= -30) add(FAN.fameLow, 2);

  const draftInfo = report.specials.find((s) => s.round);
  const extra = {
    ...values,
    round: draftInfo ? draftInfo.round : "", team: report.team,
    nick: player.nickname || "", rival: report.rival ? report.rival.name : "",
  };
  const comments = texts.map((t) => makeComment(t, player, extra, grade === "bad" ? "hot" : "normal"));
  comments.sort(() => Math.random() - 0.5);
  addReplies(comments, player, extra);

  report.news = news;
  report.comments = comments;
  maybeAggro(player, report); // 어그로 기사 (news.js)
  makePost(player, report, grade); // 커뮤 글 제목·본문
  applySkin(report); // 갤러리형 / 커뮤형 게시판
}

// 선택이나 쇼핑 뒤에 기사와 댓글을 덧붙임
function addReaction(player, report, newsLines, pool, extra) {
  if (!report) return;
  report.news.push(...newsLines);
  if (!report.comments) report.comments = [];
  for (const t of pickMany(pool, 3)) report.comments.unshift(makeComment(t, player, extra || {}, "normal"));
  applySkin(report);
}

// 대댓글: 댓글 몇 개에 'ㄴ' 답글이 달림, 가끔 글쓴이도 등판
function addReplies(comments, player, extra) {
  for (const c of comments) {
    if (Math.random() >= 0.3) continue;
    c.replies = pickMany(FAN.reply, randomInt(1, 2)).map((t) => {
      const r = makeComment(t, player, extra, "normal");
      return { nick: r.nick, ip: r.ip, text: r.text, time: r.time };
    });
    if (Math.random() < 0.12) c.replies.push({ nick: "ㅇㅇ", ip: `${randomInt(1, 223)}.${randomInt(1, 255)}`, text: pick(["ㄴ 내 말이 그 말", "ㄴ 글쓴이인데 이거 인정", "ㄴ 아니 내 글에서 싸우지 마라"]), time: c.time, op: true });
  }
}

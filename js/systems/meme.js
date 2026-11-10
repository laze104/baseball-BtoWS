// =============================================
// meme.js : 밈 시스템
// 사건이 밈이 돼서 몇 시즌 댓글에 따라다님 (player.memes)
// 비슷한 상황이 오면 다시 터짐 → "또 그 장면 나오나"
// 같은 상황에서 성공하면 뒤집기: 별명 바뀜, "악몽을 지웠다" 기사, 업적
// =============================================

const MEME_LIFE = 4; // 몇 시즌 따라다니는지

// born: 밈 이름 / again: 비슷한 상황 / flip: 뒤집었을 때 별명·기사
const MEME_TYPES = {
  finalFail: {
    name: (p, x) => `${x.stage} ${x.side === "pit" ? "끝내기 피홈런" : "마지막 타석 삼진"}`,
    comments: ["또 {stage} 생각나네", "{name} 큰 경기 나오면 손에 땀부터 남", "그날 이후로 가을만 되면 불안함", "{meme} 아직도 꿈에 나온다"],
    again: ["또 그 장면 나오나 ㄷㄷ", "제발 이번엔… 제발", "{meme} 재방송 각?", "눈 감고 기도한다"],
    flipNick: "악몽을 지운 사나이",
    flipNews: "{name}, '{meme}' 악몽을 지웠다… 같은 무대에서 영웅으로",
  },
  strikeout: {
    name: (p, x) => `삼진 ${x.K}개 선풍기 시즌`,
    comments: ["선풍기 아직 안 꺼졌냐", "{name} 타석 = 에어컨 필요 없음", "올해도 삼진 세는 재미로 본다", "{meme} 기억하는 사람?"],
    again: ["선풍기 재가동 ㅋㅋㅋ", "올해도 삼진 페이스 미쳤네", "{meme} 시즌2 개봉박두"],
    flipNick: "선풍기 끈 남자",
    flipNews: "{name}, '{meme}'은 옛말… 삼진 줄이고 정교한 타자로 진화",
  },
  arson: {
    name: (p, x) => `평균자책 ${x.ERA} 방화 시즌`,
    comments: ["소방차 대기시켜라", "{name} 올라오면 채널 돌림", "{meme} 트라우마 아직 있음", "불펜 문 열리면 심장 떨어짐"],
    again: ["또 불 지르냐", "방화범 재범 ㄷㄷ", "{meme} 다시 보는 중"],
    flipNick: "소방수",
    flipNews: "{name}, '{meme}' 꼬리표 뗐다… 이제는 팀의 소방수",
  },
  bust: {
    name: (p, x) => `${x.team} FA 먹튀`,
    comments: ["연봉 계산기 두드려 봄 ㅋㅋ", "{name} 계약서 다시 읽어 보는 중", "{meme} 아직 유효함", "돈값 언제 하냐"],
    again: ["올해도 먹튀 각", "{meme} 연장 계약 ㅋㅋ", "계약 기간 남은 게 공포"],
    flipNick: "몸값 하는 남자",
    flipNews: "{name}, '{meme}' 오명 씻었다… 계약 이후 최고 시즌",
  },
  mouth: {
    name: () => "입털이 반박문",
    comments: ["입은 리그 MVP", "반박문 쓸 시간에 연습이나", "{meme} 박제해 둠", "말이 앞서는 타입"],
    again: ["또 입 터는 거 아니지?", "{meme} 2탄 기대 ㅋㅋ"],
    flipNick: "말한 대로 하는 남자",
    flipNews: "{name}, '{meme}' 비웃던 사람들 입 다물게 한 시즌",
  },
  betray: {
    name: (p, x) => `"여기서 은퇴" 했던 ${x.team}`,
    comments: ["'여기서 은퇴하겠다' ㅋㅋㅋ", "{name} 말은 믿지 마라", "{meme} 영원히 박제", "그 인터뷰 캡처 아직 있음"],
    again: ["또 은퇴 약속하나 ㅋㅋ"],
    flipNick: null,
    flipNews: null, // 배신은 뒤집기 없음
  },
};

function initMemes(player) {
  if (!player.memes) player.memes = [];
}

function aliveMemes(player, year) {
  initMemes(player);
  const y = year || gameYear(player);
  return player.memes.filter((m) => !m.flipped && y - m.year < MEME_LIFE);
}

// 밈 만들기 (같은 종류가 살아 있으면 안 만듦)
function addMeme(player, kind, extra, report) {
  initMemes(player);
  const year = report ? report.year : gameYear(player);
  if (aliveMemes(player, year).some((m) => m.kind === kind)) return null;
  const m = {
    id: `${kind}-${year}`,
    kind,
    name: MEME_TYPES[kind].name(player, extra || {}),
    year,
    fires: 0,
    flipped: false,
    stage: (extra && extra.stage) || "",
  };
  player.memes.push(m);
  if (report) report.news.push(`'${m.name}'… 커뮤니티에서 밈으로 번지는 중`);
  return m;
}

function memeExtra(m, player) {
  return { meme: m.name, stage: m.stage || "", name: player.name };
}

// 다시 터짐: 댓글 + 기사 한 줄
function fireMeme(player, report, m) {
  m.fires += 1;
  const pool = MEME_TYPES[m.kind].again;
  report.comments = report.comments || [];
  for (const t of pickMany(pool, 2)) report.comments.unshift(makeComment(t, player, memeExtra(m, player), "hot"));
  report.news.push(`'${m.name}' 다시 소환… "또 그 장면 나오나"`);
}

// 뒤집기
function flipMeme(player, report, m) {
  const t = MEME_TYPES[m.kind];
  if (!t.flipNick) return;
  m.flipped = true;
  m.flipYear = report ? report.year : gameYear(player);
  changeFame(player, 6);
  player.memeFlips = (player.memeFlips || 0) + 1;
  const news = fillText(t.flipNews, player, memeExtra(m, player));
  const moment = {
    tone: "gold",
    kicker: `밈 뒤집기 · ${m.year}년의 그 장면`,
    title: "🔄 악몽을 지웠다",
    lines: [news, `새 별명: '${t.flipNick}'`, "팬 여론 +6"],
  };
  if (!report) return { news, moment };
  giveNickname(player, report, t.flipNick);
  report.news.push(news);
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push(moment);
  report.comments = report.comments || [];
  for (const c of pickMany(FAN.memeFlip, 3)) report.comments.unshift(makeComment(c, player, memeExtra(m, player), "hot"));
  return { news, moment };
}

// 시즌 끝: 기록으로 생기는 밈 + 살아 있는 밈 댓글 + 뒤집기
function memeSeason(player, report) {
  initMemes(player);
  if (isAmateur(report.league)) return;
  const b = report.bat;
  const p = report.pit;
  const alive = aliveMemes(player, report.year);
  const has = (kind) => alive.find((m) => m.kind === kind && m.year < report.year);

  // 뒤집기·재발 먼저 (올해 생긴 건 빼고)
  let m;
  if ((m = has("strikeout")) && b && b.PA >= 300) {
    if (b.K / b.PA < 0.15 && b.OPS >= 0.85) flipMeme(player, report, m);
    else if (b.K >= 150) fireMeme(player, report, m);
  }
  if ((m = has("arson")) && p && p.outs >= 90) {
    if (p.ERA <= 2.5) flipMeme(player, report, m);
    else if (p.ERA >= 5) fireMeme(player, report, m);
  }
  if ((m = has("bust"))) {
    if (report.WAR >= 5) flipMeme(player, report, m);
    else if (report.WAR < 1) fireMeme(player, report, m);
  }
  if ((m = has("mouth"))) {
    if (report.WAR >= 4) flipMeme(player, report, m);
  }

  // 새 밈
  if (b && b.PA >= 300 && b.K >= 170) addMeme(player, "strikeout", { K: b.K }, report);
  if (p && p.outs >= 90 && p.ERA >= (p.role && p.role.includes("선발") ? 6 : 5.5)) addMeme(player, "arson", { ERA: p.ERA.toFixed(2) }, report);
  const fresh = player.faFreshYear && report.year - player.faFreshYear <= 1;
  if (fresh && player.faFreshMega && report.WAR < 1) addMeme(player, "bust", { team: report.team }, report);

  // 살아 있는 밈은 가끔 댓글로 따라다님
  for (const x of aliveMemes(player, report.year)) {
    if (x.year === report.year || Math.random() >= 0.35) continue;
    report.comments = report.comments || [];
    report.comments.push(makeComment(pick(MEME_TYPES[x.kind].comments), player, memeExtra(x, player), "normal"));
  }
}

// 결정적 순간 뒤 (main.js 선택지 클릭에서). 큰 화면 알림 목록을 돌려줌
function memeAfterClutch(player, choice, news) {
  if (choice.key !== "clutch") return [];
  const big = choice.kind === "seriesHero" || choice.kind === "game7";
  if (!big) return [];
  const ok = player.lastClutch;
  const r = player.lastReport;
  const year = r ? r.year : gameYear(player);
  const m = aliveMemes(player, year).find((x) => x.kind === "finalFail" && x.year < year);
  if (m) {
    if (!ok) {
      if (r) fireMeme(player, r, m);
      return [];
    }
    const res = flipMeme(player, null, m);
    if (!res) return [];
    if (r) giveNickname(player, r, MEME_TYPES[m.kind].flipNick);
    news.push(res.news);
    return [res.moment];
  }
  if (!ok) {
    const made = addMeme(player, "finalFail", { stage: choice.stage, side: choice.side }, r);
    if (made) news.push(`'${made.name}'… 한동안 따라다닐 것 같아요`);
  }
  return [];
}

// FA 계약할 때 (먹튀 감시용)
function memeFaSigned(player, offer) {
  player.faFreshYear = gameYear(player) + 1; // 다음 시즌부터
  player.faFreshMega = !!(offer && (offer.mega || offer.total >= 500000));
}

// 반응 탭: 지금 도는 밈
function memeHtml(player) {
  initMemes(player);
  if (!player.memes.length) return "";
  const year = gameYear(player);
  const list = [...player.memes].reverse().slice(0, 6);
  return `<div class="memes"><p class="fd-head">🔥 밈 <small>${MEME_LIFE}시즌 따라다님 · 같은 상황에서 성공하면 뒤집힘</small></p><ul>${list
    .map((m) => {
      const left = MEME_LIFE - (year - m.year);
      const state = m.flipped
        ? `<em class="flip">🔄 ${m.flipYear}년에 뒤집음</em>`
        : left > 0
          ? `<em>${left}시즌 남음${m.fires ? ` · ${m.fires}번 재소환` : ""}</em>`
          : `<em class="dead">잊혀짐</em>`;
      return `<li class="${m.flipped ? "flipped" : left > 0 ? "" : "dead"}"><b>${m.name}</b><small>${m.year}년</small>${state}</li>`;
    })
    .join("")}</ul></div>`;
}

FAN.memeFlip = [
  "와 이걸 뒤집네 ㅋㅋㅋㅋ",
  "{meme} 이제 아무도 말 못 함",
  "서사 완성 소름",
  "이래서 야구 본다",
  "그날 욕했던 사람 반성해라",
  "{name} 인생 영화 찍냐",
];

ACHIEVEMENTS.push(
  { id: "memeFlip", group: "인생", name: "악몽을 지웠다", desc: "따라다니던 밈 뒤집기", check: (p) => (p.memeFlips || 0) >= 1 },
  { id: "memeMaker", group: "인생", name: "밈 제조기", desc: "커리어 동안 밈 4개", check: (p) => (p.memes || []).length >= 4 },
);

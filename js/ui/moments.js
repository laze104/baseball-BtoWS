// =============================================
// moments.js : 큰 화면 알림 (시상식, 드래프트, 결정적 순간 문자중계)
// =============================================

// ---------------------------------------------
// 1. 무엇을 띄울지
// ---------------------------------------------

const BIG_AWARD_WORDS = [
  "행크 애런상",
  "리베라상",
  "호프먼상",
  "재기상",
  "클레멘테상",
  "마르티네스상",
  "수비상",
  "MVP",
  "골든글러브",
  "베스트나인",
  "실버슬러거",
  "골드글러브",
  "신인왕",
  "사이영상",
  "사와무라상",
  "최동원상",
  "올스타",
  "우승",
  "왕",
  "메달",
  "최우수선수",
  "노히트노런",
  "사이클링",
];

function isBigAward(name) {
  return BIG_AWARD_WORDS.some((w) => name.includes(w));
}

// 시즌 결과에서 큰 화면 알림 목록 만들기
function seasonBigMoments(report) {
  const list = [];
  const awards = report.awards.filter(isBigAward);
  if (awards.length) {
    const top = awards.find((a) => a.includes("MVP") && !a.includes("올스타")) || awards.find((a) => a.includes("우승")) || awards[0];
    list.push({
      tone: "gold",
      kicker: `${report.year} 시즌 시상식`,
      title: `🏆 ${top}`,
      awards,
      lines: report.allStar && report.allStar.fanPick ? ["올스타 팬 투표 1위!"] : [],
    });
  }
  // 드래프트 결과도 큰 화면으로
  const from = { HS: "고졸", COLLEGE: "대졸", INDIE: "독립리그 출신", ABL: "호주리그 출신" }[report.league] || "";
  for (const sp of report.specials) {
    if (sp.key === "draft" || sp.key === "draftTop") {
      list.unshift({
        tone: "gold",
        kicker: `KBO 신인 드래프트 · ${from}`,
        title: sp.round === 1 ? "🎉 1라운드 지명!" : `🎉 ${sp.round}라운드 지명!`,
        lines: [`${sp.team} ${sp.round}라운드 지명`, `계약금 ${sp.bonus}`],
      });
    } else if (sp.key === "openingRoster") {
      list.push({ tone: "gold", kicker: "신인 개막 엔트리", title: "⚾ 바로 1군!", lines: [`${sp.team} 1군에서 프로 데뷔`] });
    } else if (sp.key === "trainee") {
      list.unshift({
        tone: "good",
        kicker: `${from} 프로 입단`,
        title: "✍️ 육성선수 계약",
        lines: [`${sp.team}과 육성선수 계약`, "계약금은 없지만 프로 유니폼을 입었어요"],
      });
    } else if (sp.key === "undrafted") {
      list.unshift({ tone: "bad", kicker: `KBO 신인 드래프트 · ${from}`, title: "😢 미지명", lines: ["끝내 이름이 불리지 않았어요", "다음 길을 골라야 해요"] });
    } else if (sp.key === "mlbScout") {
      list.push({ tone: "gold", kicker: "깜짝 소식", title: "🇺🇸 MLB 스카우트 방문", lines: [`${sp.team} 스카우트의 미국 직행 제안`] });
    }
  }
  return list.concat(report.bigMoments || []);
}

// 선택지를 고른 뒤 큰 화면으로 보여줄 것
function choiceBigMoments(player, choice, option, news, awardsBefore) {
  const list = [];
  if (choice.key === "clutch") {
    const ok = player.lastClutch;
    const r = player.lastReport;
    const newAwards = r ? r.awards.slice(awardsBefore) : [];
    // 텍스트 중계: 상대가 숙적이면 그 선수로 (broadcast.js, nemesis.js)
    const title = ok ? "⚡ 성공!" : "💥 실패…";
    let pbp = null;
    let box = null;
    try {
      const nem = choice.opp ? (choice.opp.nemId ? (player.nemeses || []).find((n) => n.id === choice.opp.nemId) : null) : clutchNemesis(player, choice.side);
      pbp = legendCommentary(player, choice, buildPbp(player, choice, option.id, ok, nem), ok); // 명예의 전당 해설 (living.js)
      box = buildBoxScore(player, choice, option.id, ok); // 박스스코어 (boxscore.js)
      news.push(...clutchNemesisResult(player, nem, ok, choice));
      saveHighlight(player, choice, ok, title, pbp, box);
    } catch (e) {
      console.error("중계 만들기 실패 (broadcast.js / nemesis.js 확인)", e); // 중계가 깨져도 결과 팝업은 뜨게
    }
    list.push({
      tone: ok ? "gold" : "bad",
      kicker: `결정적 순간 · ${choice.stage}`,
      title,
      pbp,
      box,
      lines: news.slice(),
      awards: newAwards,
    });
  } else if (choice.key === "press" && player.lastPress) {
    const acc = player.lastPress;
    player.lastPress = null;
    list.push({
      tone: acc.fame >= 0 ? "good" : "bad",
      kicker: choice.kind === "sign" ? `입단 기자회견 · ${player.team}` : "시즌 결산 기자회견",
      title: "🎤 기자회견 끝",
      lines: pressSummary(acc),
    });
  } else if (choice.key === "agent" && option.id !== "self") {
    list.push({
      tone: "gold",
      kicker: "에이전트 계약",
      title: `🕴️ ${player.agent.name}`,
      lines: [player.agent.boss, `수수료 ${Math.round(player.agent.rate * 100)}% · 지금부터 FA 협상을 맡아요`],
    });
  } else if (choice.key === "mlbDirect" && option.id === "go") {
    list.push({ tone: "gold", kicker: "미국 직행", title: `🇺🇸 ${choice.org} 입단!`, lines: news });
  } else if (choice.key === "fa" && option.offer && option.offer.mega) {
    const o = option.offer;
    list.push({
      tone: "gold",
      kicker: "초대형 계약",
      title: `💰 ${o.team} ${o.years}년 ${fmtMoney(o.total)}!`,
      lines: [`연봉 ${fmtMoney(o.salary)} × ${o.years}년`, ...news],
    });
  } else if (choice.key === "fa" && option.offer && option.offer.veteran) {
    const o = option.offer;
    list.push({
      tone: "gold",
      kicker: `${koreanAge(player.age)}세의 해외 도전`,
      title: `${o.league === "MLB" ? "🇺🇸" : "🇯🇵"} ${o.team} 입단!`,
      lines: [`${LEAGUES[o.league].name} ${o.years === 2 ? "1+1년" : "1년"} 계약`, ...news],
    });
  } else if (choice.key === "collegePick") {
    list.push({ tone: "good", kicker: "대학 진학", title: `🎓 ${option.id} 입학!`, lines: news });
  } else if (choice.key === "national" && option.id === "nretire") {
    list.push({ tone: "good", kicker: "국가대표 은퇴", title: "🇰🇷 태극마크 반납", lines: news });
  }
  return list;
}

// ---------------------------------------------
// 2. 띄우기 (하나씩 차례로)
// ---------------------------------------------

// 큰 화면 알림: 여러 개면 확인을 누를 때마다 다음 것
let bigQueue = [];
function showBigMoments(list) {
  if (!list || !list.length) return;
  bigQueue.push(...list);
  if ($("big-modal").hidden) nextBigMoment();
}

// 텍스트 중계(pbp)가 있으면 한 줄씩 나오고 결과는 마지막에 공개됨
const PBP_STEP = 0.9; // 줄 사이 간격 (초), 빠른 진행이면 0.18
const pbpStep = () => (fastMode ? 0.18 : PBP_STEP);
let pbpTimer = null;
function nextBigMoment() {
  const modal = $("big-modal");
  // 중계 도중 누르면 닫지 않고 끝까지 바로 보여줌
  if (modal.classList.contains("playing")) {
    clearTimeout(pbpTimer);
    modal.className = `${modal.dataset.tone} pbp-mode skip`;
    return;
  }
  const m = bigQueue.shift();
  if (!m) {
    modal.hidden = true;
    return;
  }
  const pbp = m.pbp && m.pbp.length ? m.pbp : null;
  // 중계 중엔 테두리 색으로 결과가 새지 않게 중립색
  modal.dataset.tone = m.tone || "gold";
  modal.className = (pbp ? "pbp-mode playing" : m.tone || "gold") + (m.cls ? ` ${m.cls}` : ""); // 세레머니 크기 (ceremony.js)
  const late = pbp ? `animation-delay:${(pbp.length * pbpStep()).toFixed(1)}s` : "";
  modal.querySelector(".big-kicker").textContent = m.kicker || "";
  const title = modal.querySelector(".big-title");
  title.textContent = m.title;
  title.className = "big-title" + (pbp ? " late" : "");
  title.style.cssText = late;
  let body = "";
  if (pbp) body += `<div class="pbp">${pbp.map((l, i) => `<p style="animation-delay:${(i * pbpStep()).toFixed(2)}s">${l}</p>`).join("")}</div>`;
  let after = "";
  if (m.html) body += m.html; // 카운트업·꽃가루 (ceremony.js)
  if (m.box) after += boxScoreHtml(m.box);
  if (m.awards && m.awards.length) after += `<p class="big-awards">${m.awards.map((a) => awardChip(a)).join("")}</p>`;
  if (m.lines && m.lines.length) after += m.lines.map((l) => `<p>${l}</p>`).join("");
  body += pbp ? `<div class="late" style="${late}">${after}</div>` : after;
  modal.querySelector(".big-body").innerHTML = body;
  $("big-close").textContent = pbp ? "결과 바로 보기" : "확인";
  if (pbp) {
    pbpTimer = setTimeout(
      () => {
        modal.className = `${modal.dataset.tone} pbp-mode`;
        $("big-close").textContent = "확인";
      },
      pbp.length * pbpStep() * 1000 + 400,
    );
  }
  modal.hidden = false;
  runCountUps(modal); // 숫자 올라가는 연출 (effects.js)
}

$("big-close").addEventListener("click", () => {
  const wasPlaying = $("big-modal").classList.contains("playing");
  nextBigMoment();
  if (wasPlaying) $("big-close").textContent = "확인";
});
$("big-modal").addEventListener("click", (event) => {
  if (event.target.id === "big-modal") nextBigMoment(); // 바깥을 눌러도 닫힘
});

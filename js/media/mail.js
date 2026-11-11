// =============================================
// mail.js : 메일함 (선택지가 메일로 옴) + 메일 탭
// 결정적 순간(clutch)은 중계 화면 그대로, 나머지는 메일 형식
// 지난 메일은 player.mailLog 에 최근 300통 보관 (메일 탭에서 전부 봄)
// =============================================

// 선택지 key → 보낸 사람, 제목
const MAIL_SENDERS = {
  fa: { from: "에이전시 · FA 시장", icon: "💼", subject: "FA 계약 제안서 도착" },
  faNego: { from: "에이전시 · 협상팀", icon: "🤝", subject: "협상 테이블 일정 잡혔습니다" },
  renew: { from: "구단 운영팀", icon: "📄", subject: "재계약 관련 면담 요청" },
  agent: { from: "스포츠 에이전시", icon: "🕴️", subject: "대리인 계약 제안드립니다" },
  press: { from: "구단 홍보팀", icon: "🎤", subject: "기자회견 질의 응답 요청" },
  national: { from: "KBO 기술위원회", icon: "🇰🇷", subject: "국가대표 예비 명단 안내" },
  military: { from: "병무청", icon: "🪖", subject: "병역 이행 관련 안내" },
  managerTalk: { from: "감독실", icon: "🗣️", subject: "감독님이 찾으십니다" },
  closerOffer: { from: "감독실", icon: "🗣️", subject: "보직 관련 면담" },
  position: { from: "감독실", icon: "🧢", subject: "포지션 변경 제안" },
  convert: { from: "감독실", icon: "🔄", subject: "[대외비] 전향 제안" },
  posting: { from: "구단 운영팀", icon: "✈️", subject: "포스팅 신청 관련" },
  postingOffer: { from: "구단 운영팀", icon: "✈️", subject: "포스팅 결과 통보" },
  overseasOffer: { from: "해외 구단 에이전트", icon: "✈️", subject: "해외 구단 입단 제안" },
  twoway: { from: "코칭스태프", icon: "⚾", subject: "투타겸업 관련 의견" },
  undrafted: { from: "스카우트팀", icon: "📋", subject: "드래프트 결과 안내" },
  draftSign: { from: "스카우트팀", icon: "📋", subject: "신인 지명 통보" },
  collegePick: { from: "대학 야구부", icon: "🎓", subject: "체육특기자 입학 제안" },
  mlbDirect: { from: "MLB 스카우트", icon: "🇺🇸", subject: "Invitation to Pro Baseball" },
  life: { from: "매니지먼트", icon: "📱", subject: "확인 부탁드려요" },
  nemesisMate: { from: "구단 운영팀", icon: "🤝", subject: "새 동료 합류 안내" },
  forcedRetire: { from: "구단 운영팀", icon: "📦", subject: "재계약 불가 통보" },
  coachPitch: { from: "투수코치실", icon: "🎯", subject: "새 구종 한번 해 보자" },
  hiddenPain: { from: "트레이너실", icon: "🩺", subject: "[비공개] 검진 결과" },
  fixing: { from: "발신자 불명", icon: "✉️", subject: "좋은 제안 하나 드리죠", shady: true },
  expansionDraft: { from: "KBO 사무국", icon: "🏟️", subject: "신생구단 특별지명 결과" },
  styleChange: { from: "코칭스태프", icon: "🔧", subject: "플레이 스타일 상담" },
  surgery: { from: "구단 의료진", icon: "🏥", subject: "수술 여부 결정 요청" },
  locker: { from: "라커룸", icon: "👕", subject: "동료가 할 말이 있대요" },
  banned: { from: "KBO 상벌위원회", icon: "⚖️", subject: "징계 결과 통보" },
  hookPitch: { from: "전력분석팀", icon: "📊", subject: "상대 분석 자료" },
  deadline: { from: "구단 운영팀", icon: "📦", subject: "트레이드 마감 관련" },
  promiseBroken: { from: "매니지먼트", icon: "📋", subject: "계약 조건 관련" },
  optOut: { from: "구단 운영팀", icon: "🚪", subject: "옵트아웃 권리 안내" },
  arbStart: { from: "구단 운영팀", icon: "⚖️", subject: "연봉 협상 결렬" },
  arbRound: { from: "연봉조정위원회", icon: "⚖️", subject: "청문회 진행 중" },
  gala: { from: "시상식 사무국", icon: "🏆", subject: "수상 소감 순서 안내" },
  lockerSide: { from: "라커룸", icon: "👕", subject: "라커룸 분위기" },
};
const MAIL_DEFAULT = { from: "구단 사무국", icon: "📨", subject: "확인이 필요한 일" };

function mailInfo(choice) {
  const m = MAIL_SENDERS[choice.key] || MAIL_DEFAULT;
  // 선택지에 직접 정해 둔 발신자·제목이 있으면 그걸 씀
  return { from: choice.mailFrom || m.from, icon: m.icon, subject: choice.mailSubject || m.subject, shady: m.shady };
}

// 아직 안 읽은 메일 목록 = 지금 선택지 + 대기열
function unreadMails(player) {
  const list = [];
  if (player.pendingChoice) list.push(player.pendingChoice);
  for (const c of player.choiceQueue || []) list.push(c);
  return list;
}

function mailboxHtml(player) {
  const choice = player.pendingChoice;
  const mails = unreadMails(player).filter((c) => c.key !== "clutch");
  const info = mailInfo(choice);
  const stage = player.cur ? { camp: "스프링캠프", half1: "올스타 휴식기", half2: "정규시즌 끝" }[player.phase] : null; // 시즌 중 메일 (phases.js)
  const when = `${gameYear(player)}년 ${stage || (player.league === "HS" || player.league === "COLLEGE" ? "겨울방학" : "비시즌")}`;
  let html = `<div class="mailbox"><div class="mail-head">📬 받은 메일함 <small>안 읽은 메일 ${mails.length}통</small></div>`;
  if (mails.length > 1) {
    html += `<ul class="mail-list">${mails
      .map((c, i) => {
        const m = mailInfo(c);
        return `<li class="${i === 0 ? "open" : ""}"><span>${m.icon} ${m.from}</span><b>${m.subject}</b></li>`;
      })
      .join("")}</ul>`;
  }
  html += `<div class="mail-open${info.shady ? " shady" : ""}">
    <p class="mail-meta"><b>${info.icon} ${info.from}</b><small>${when}</small></p>
    <p class="mail-subject">${info.subject}</p>
    <p class="mail-body">${choice.text}</p>
  </div></div>`;
  return html;
}

// 답장한 메일은 보관함으로 (최근 300통)
function logMail(player, choice, option) {
  if (!choice || choice.key === "clutch") return;
  const m = mailInfo(choice);
  if (!player.mailLog) player.mailLog = [];
  const body = String(choice.text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  player.mailLog.unshift({
    year: gameYear(player),
    from: m.from,
    icon: m.icon,
    subject: m.subject,
    body: body.slice(0, 800),
    reply: option.label.replace(/<[^>]+>/g, ""),
  });
  player.mailLog.length = Math.min(player.mailLog.length, 300);
}

// ---------- 메일 탭 (지난 메일 전부, 연도별) ----------
function showMail(player) {
  const box = $("tab-mail");
  const log = player.mailLog || [];
  const waiting = unreadMails(player).filter((c) => c.key !== "clutch");
  let html = `<div class="mail-tab"><div class="mail-head">📬 메일함 <small>받은 메일 ${log.length + waiting.length}통${waiting.length ? ` · 안 읽음 ${waiting.length}` : ""}</small></div>`;
  if (waiting.length) {
    html += `<ul class="mail-all">${waiting
      .map((c) => {
        const m = mailInfo(c);
        return `<li class="unread"><p><span>${m.icon} ${m.from}</span><small>답장 대기</small></p><b>${m.subject}</b></li>`;
      })
      .join("")}</ul>
      <button onclick="setTab('train');window.scrollTo({top:0,behavior:'smooth'})">답장하러 가기</button>`;
  }
  if (!log.length && !waiting.length) html += "<p class='empty'>아직 받은 메일이 없어요.</p>";
  // 연도별로 묶음
  const years = [...new Set(log.map((m) => m.year))];
  for (const y of years) {
    html += `<p class="mail-year">${y}년</p><ul class="mail-all">`;
    for (const m of log.filter((x) => x.year === y)) {
      html += `<li><details><summary><p><span>${m.icon} ${m.from}</span></p><b>${m.subject}</b></summary><p class="mail-body">${m.body}</p><em>↪ 내 답장: ${m.reply}</em></details></li>`;
    }
    html += "</ul>";
  }
  box.innerHTML = html + "</div>";
}

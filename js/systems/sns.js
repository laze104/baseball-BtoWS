// =============================================
// sns.js : SNS·인터뷰 논란 대응
// 시즌 끝에 가끔 어그로 기사·논란이 터지고 메일로 옴 (key: "sns")
// 무대응 / 사과문 / 정면 반박 / 유머로 넘기기
// 같은 대응도 성적(최근 WAR)과 인기(fame)에 따라 결과가 달라짐
// 잘할 때 반박 = 사이다, 못할 때 반박 = 입털이 (밈이 됨)
// =============================================

const SNS_ISSUES = [
  {
    id: "critic",
    from: "스포츠 칼럼",
    subject: "[칼럼] 연봉값 못 하는 선수들",
    text: (p) => `"${p.name}, 이 정도 성적이면 연봉 반납해야" 칼럼이 포털 메인에 걸렸어요. 댓글 4천 개.`,
    when: (p, r) => r.WAR < 1.5,
  },
  {
    id: "post",
    from: "매니지먼트",
    subject: "SNS 게시물 논란",
    text: (p) => `팀이 진 날 ${p.name} SNS에 올라온 맛집 사진이 캡처돼서 돌고 있어요. "지금 이게 중요하냐"는 반응.`,
    when: () => true,
  },
  {
    id: "quote",
    from: "구단 홍보팀",
    subject: "인터뷰 발언 왜곡 보도",
    text: (p) => `인터뷰에서 한 말이 잘려서 "${p.name}, 팀 동료 탓" 기사로 나갔어요. 앞뒤 맥락은 빠졌어요.`,
    when: () => true,
  },
  {
    id: "rumor",
    from: "구단 운영팀",
    subject: "이적설 보도 관련",
    text: (p) => `"${p.name}, 시즌 끝나면 ${p.team} 떠난다" 단독 기사가 떴어요. 팬들이 술렁이는 중.`,
    when: (p) => !isAmateur(p.league) && seasonsToFa(p) <= 2,
  },
];

const SNS_OPTIONS = [
  { id: "ignore", label: "무대응", detail: "시간이 해결해 줌… 아마도" },
  { id: "apology", label: "사과문 올리기", detail: '고개 숙이기 · 잘하고 있을 땐 "왜 사과함?"' },
  { id: "rebut", label: "정면 반박", detail: "성적이 좋으면 사이다, 나쁘면 역풍" },
  { id: "humor", label: "유머로 넘기기", detail: "인기가 있으면 센스, 없으면 장난하냐" },
];

// 시즌 끝에 논란이 터질지 (프로만, 시즌에 한 번)
function maybeSnsIssue(player, report) {
  if (!FAN_LEAGUES.includes(player.league) || player.retired) return; // 군 복무 중엔 없음
  const fame = player.fame || 0;
  let chance = 0.12 + (Math.abs(fame) >= 50 ? 0.06 : 0) + (report.WAR < 0.5 ? 0.08 : 0);
  if (player.lastPressTone === "bold") chance += 0.06; // 기자회견에서 도발했으면 더 잘 터짐
  if (Math.random() >= chance) return;
  const list = SNS_ISSUES.filter((x) => x.when(player, report));
  const issue = pick(list);
  pushChoice(player, {
    key: "sns",
    issue: issue.id,
    mailFrom: issue.from,
    mailSubject: issue.subject,
    text: `${issue.text(player)} 어떻게 대응할까요?`,
    options: SNS_OPTIONS.map((o) => ({ ...o })),
  });
}

// 대응 결과
function resolveSns(player, choice, option) {
  const war = recentWar(player);
  const good = war >= 3;
  const popular = (player.fame || 0) >= 20;
  const issue = choice.issue;
  const lr = player.lastReport;
  let fame = 0,
    fans = 0,
    tag,
    line;
  switch (option.id) {
    case "ignore":
      fame = issue === "post" ? -3 : -1;
      tag = "silent";
      line = `${player.name} 측 "노코멘트"… 논란은 며칠 만에 잠잠해짐`;
      if (issue === "rumor") {
        fans = -4;
        line = `${player.name}, 이적설에 침묵… ${player.team} 팬들 "뭐라도 말해라"`;
      }
      break;
    case "apology":
      if (issue === "critic" && good) {
        fame = 0;
        tag = "whyApology";
        line = `${player.name}, 비판 칼럼에 사과문… 팬들 "잘하는데 왜 사과함?"`;
      } else {
        fame = 2;
        fans = 2;
        tag = "apology";
        line = `${player.name}, 자필 사과문 "더 신중하겠다"`;
      }
      break;
    case "rebut":
      if (issue === "rumor") {
        fans = 8;
        fame = 2;
        tag = "loyal";
        player.loyalVow = player.team; // 나중에 FA로 떠나면 배신 밈 (fandom.js)
        line = `${player.name}, 이적설 정면 반박 "${player.team}에서 은퇴하겠다"`;
      } else if (good) {
        fame = 5;
        fans = 4;
        tag = "cider";
        line = `${player.name}, 정면 반박 "숫자로 보여줬다"… 팬들 "사이다"`;
      } else {
        fame = -6;
        fans = -5;
        tag = "mouth";
        line = `${player.name}, 반박문 올렸다가 역풍… "성적이나 내고 말해라"`;
        addMeme(player, "mouth", {}, lr);
      }
      break;
    case "humor":
      if (popular) {
        fame = 4;
        fans = 2;
        tag = "witty";
        line = `${player.name}, 논란을 유머로 받아쳐… "센스 만점" 반응`;
      } else {
        fame = -3;
        fans = -2;
        tag = "joke";
        line = `${player.name}, 농담으로 넘기려다… "지금 장난하냐" 역풍`;
      }
      break;
  }
  changeFame(player, fame);
  changeTeamFans(player, player.team, fans);
  player.lastSnsTone = tag;
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  return [line, `(전체 여론 ${sign(fame)} · ${player.team} 팬심 ${sign(fans)})`];
}

// 대응별 커뮤 반응 (main.js reactionPool)
function snsPool(player) {
  return FAN[`sns_${player.lastSnsTone}`] || FAN.good;
}

Object.assign(FAN, {
  sns_silent: ["노코멘트가 답이긴 함", "그냥 조용히 넘어가네", "뭐라도 말하지", "시간 지나면 다 잊혀짐"],
  sns_apology: ["사과했으면 됐다", "그래도 바로 사과한 건 인정", "다음부턴 조심해라", "진정성은 모르겠고 일단 ok"],
  sns_whyApology: ["아니 잘하는데 왜 사과함?", "칼럼니스트가 사과해야지", "착해 빠졌네 진짜", "기자가 야구를 알긴 하냐"],
  sns_loyal: ["이 말 박제한다", "{team}에서 은퇴한다 ㄹㅇ?", "믿는다 진짜", "나중에 딴 말 하기 없기"],
  sns_cider: ["사이다 그 자체", "숫자 앞에 할 말 없지 ㅋㅋ", "이게 실력자의 여유", "칼럼 쓴 기자 어디 갔냐"],
  sns_mouth: ["입은 MVP", "성적이나 내고 말해라", "반박문 박제 완료", "입털이 ㅋㅋㅋㅋ"],
  sns_witty: ["센스 미쳤다 ㅋㅋ", "이래서 {name} 좋아함", "논란을 밈으로 만드네", "유머 감각 국가대표"],
  sns_joke: ["지금 장난하냐", "웃기지도 않음", "상황 파악 안 되냐", "농담할 때가 아님"],
});

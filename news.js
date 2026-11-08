// =============================================
// news.js : 뉴스 탭 + 커뮤니티 (v15)
// 1. 커뮤 댓글 다시 쓰기 (야갤·펨코 말투), 게시판 두 종류
// 2. 기사 본문 만들기 (스포츠 포털 기사 스타일), 어그로 기사
// 3. 뉴스 탭 그리기, 시즌 결과 제목 누르면 기사로 이동
// 실제 언론사·사이트 이름은 안 씀 (가상 언론사)
// =============================================

// ---------------------------------------------
// 1. 커뮤 댓글
// ---------------------------------------------
// 기존 댓글 묶음을 실제 커뮤 말투로 갈아엎음 (약한 욕까지 OK, 집단 비하는 안 씀)
Object.assign(FAN, {
  great: [
    "얘 진짜 미쳤네 ㅋㅋㅋㅋㅋ", "작년에 거품이라던 애들 다 어디 감?", "리그 원탑 맞다 이제 반박 불가", "볼 때마다 감탄만 나옴 ㄹㅇ",
    "이 정도면 걍 사기캐 아님?", "{name} 유니폼 마킹하러 간다", "와 {team} 팬들은 좋겠다 부럽다 진심", "어차피 해외 갈 거 지금 즐기자 ㅠㅠ",
    "타석 들어설 때부터 분위기가 다름", "솔직히 처음엔 기대 안 했는데 사과함", "이 선수 보려고 직관 감", "영결 각 벌써 나옴",
    "다른 팀 팬인데 인정할 건 인정함", "얘 상대 팀 팬은 무슨 심정일까 ㅋㅋ", "올해 연봉 협상 개꿀잼 예약",
  ],
  good: [
    "이 정도면 밥값은 함", "나쁘지 않네 내년이 더 기대됨", "꾸준한 게 제일 무서운 거임", "딱 기대한 만큼 해줌",
    "아직 다듬을 거 많은데 가능성은 보임", "스탯만 보면 무난무난", "솔직히 몇 경기만 덜 말렸으면 커리어하이였음",
    "이 정도면 합격점", "멘탈만 잡으면 한 단계 더 간다", "우리 팀에선 소중한 자원임",
  ],
  batterBad: [
    "선풍기 오늘도 정상 영업 중", "얘 나오면 그냥 1아웃 깔고 감", "타율 보소 ㅋㅋㅋㅋ 투수냐?", "2군 가서 머리 좀 식히고 와라",
    "연봉 루팡 소리 들어도 할 말 없음", "감독은 얘한테 뭐 약점 잡혔냐", "득점권만 되면 사라지는 마술사", "삼진 먹고 들어가는 뒷모습만 기억남",
    "방망이 거꾸로 잡은 줄", "이 스탯으로 주전이면 나도 주전 가능", "타석 들어오면 화장실 타이밍", "공 보고 치는 거 맞냐",
  ],
  pitcherBad: [
    "방화범 출근 완료", "얘 올라오면 채널 돌림", "볼볼볼볼 볼넷 장인", "배팅볼 투수 아님? ㅋㅋ",
    "감독은 무슨 생각으로 계속 올리냐", "불 끄러 온 게 아니라 기름 부으러 옴", "직구 구속 보고 놀람 (나쁜 의미로)",
    "홈런 맞는 거 보는 것도 이제 지겹다", "평자 보고 웃음만 나옴", "불펜에서 몸 풀 때부터 불안함",
  ],
});
FAN.meme.push("ㅇㄷ", "ㄱㅁ", "추천 누르고 감", "아 웃겨 ㅋㅋㅋㅋㅋ", "이거 개념글 가자", "오늘 야구 본 사람 손", "이게 야구지", "3줄 요약 좀");
FAN.fight.push("팩트) 작년보다 못함", "응 니 팀 선수 아님", "까도 기록 보고 까라", "이분 맨날 까기만 하네 ㅋㅋ", "인정할 건 인정하자 좀");
FAN.reply.push("ㄴ ㅇㅈ", "ㄴ 이게 맞지", "ㄴ 어그로 ㄴㄴ", "ㄴ ㅋㅋㅋㅋㅋㅋㅋ 미친", "ㄴ 이건 좀 아닌 듯", "ㄴ 뇌절 ㄴㄴ");

// 요즘 커뮤 말투 + 약한 욕 (ㅅㅂ·존나·개-·ㅈ 정도까지만, 패드립·혐오 표현 안 씀)
// {tt} = 팀 이름 늘려 부르기 (삼~성, 엘~지, 쓱~)
const TEAM_TILDE = { KIA: "기~아", 삼성: "삼~성", LG: "엘~지", 두산: "두~산", KT: "크~트", SSG: "쓱~", 롯데: "롯~데", 한화: "한~화", NC: "엔~씨", 키움: "키~움", 울산: "울~산" };
function teamTilde(team) {
  if (!team) return "";
  if (/(고|대)$/.test(team)) return team; // 학교는 그냥 부름
  const words = String(team).split(" ");
  if (TEAM_TILDE[words[0]]) return TEAM_TILDE[words[0]];
  const w = /[가-힣]/.test(words[words.length - 1]) ? words[words.length - 1] : words[0];
  return w.length >= 2 ? w[0] + "~" + w.slice(1) : w + "~";
}
FAN.great.push(
  "와 ㅅㅂ 미쳤네 이게 사람이냐", "폼 미쳤다 진짜 ㅋㅋㅋㅋ", "이새끼 진짜 물건이다", "개사기캐 너프 좀 해라 ㅋㅋ",
  "보법이 다르네 보법이", "{name} 존나 잘하네 ㄹㅇ", "도파민 터진다 진짜", "{tt} 팬들 오늘 밤 잠 못 잔다",
  "이 정도면 ㄹㅇ 리그 파괴범", "와 씨 소름 돋았음", "{name} 없었으면 {tt} 올해 줴줴였음", "개추 박고 간다",
  "중꺾마 그 자체", "얘 보다가 다른 선수 보면 답답해 죽음", "럭키비키잖아 ㅋㅋ", "킹갓제너럴 {name}",
);
FAN.good.push(
  "ㄱㅊㄱㅊ 이 정도면 됐다", "밥값은 했다 인정", "개잘한 건 아닌데 못한 것도 아님", "내년에 한 번 터지면 ㅈ된다 이거",
  "평타는 쳤네", "{tt}에선 이 정도도 감지덕지임", "애매하게 잘해서 까기도 뭐함 ㅋㅋ",
);
FAN.batterBad.push(
  "성적 줴줴네 진짜", "아 ㅅㅂ 또 삼진이냐", "존나 못 치네 진짜 ㅋㅋㅋ", "같은 {tt} 또 {tt}했다",
  "{name} 타석 = 개꿀 아웃", "이걸 돈 주고 보냐 ㅆㅂ", "방망이 왜 들고 나옴? 장식용?", "지랄 났네 진짜 ㅋㅋ",
  "득점권 {name}은 ㅈ됐다고 보면 됨", "개못하네 이번 시즌 걍 버리자", "타율 실화냐 염병 ㅋㅋ", "{tt} 타선 개노답 삼형제 중 하나",
  "아 진짜 보다가 혈압 오름", "이 정도면 상대 팀 첩자 아님?",
);
FAN.pitcherBad.push(
  "성적 줴줴네 진짜", "아 ㅅㅂ 또 불 질렀냐", "존나 맞네 오늘도 ㅋㅋㅋ", "같은 {tt} 또 {tt}했다",
  "볼질 개빡치네 진짜", "{name} 나오면 TV 끔 ㅆㅂ", "이걸 돈 주고 보냐", "직구가 배팅볼 수준 ㅋㅋ 개웃기네",
  "평자 실화냐 염병", "얘 올리는 감독도 지랄임", "불펜 방화 클럽 회장님 등판", "아 진짜 보다가 혈압 오름",
);
FAN.meme.push("ㄹㅇㅋㅋ", "아 개웃기네 ㅋㅋㅋㅋㅋㅋ", "{tt}~ {tt}~", "오늘도 {tt} 보고 수명 깎임", "야구 끊는다 (내일 또 봄)", "도파민 중독자 집합", "알빠노 ㅋㅋ", "킹받네 진짜", "이게 {tt}지 ㅋㅋㅋ");
FAN.fight.push("응 니 팀이나 걱정해 ㅋㅋ", "어쩔티비 기록이 말해줌", "까는 새끼들 다 어디 감?", "ㅈ도 모르면서 훈수 오지네", "스탯 한 번이라도 보고 까라 좀");
FAN.reply.push("ㄴ ㄹㅇㅋㅋ", "ㄴ ㅅㅂ 맞말이네", "ㄴ 개웃기네 ㅋㅋㅋㅋ", "ㄴ 지랄 ㄴㄴ", "ㄴ ㅈㄴ 공감", "ㄴ 니가 뭘 앎 ㅋㅋ", "ㄴ 개추");
FAN.teamTalk.push("{tt} 프런트 일 좀 해라 ㅅㅂ", "{tt} 팬 하기 존나 힘들다", "같은 {tt}… 그래도 본다", "{tt}는 {tt}임 기대하지 마라");

// 커뮤 게시글 제목·본문 (글쓴이 = 팬)
const POST_TITLES = {
  great: ["{name} 올해 진짜 미쳤다", "솔직히 {name} 리그 원탑 아님?", "{name} 시즌 성적 정리.txt", "오늘도 {name} 혼자 다 함 ㄷㄷ", "{name} 해외 가면 어떡하냐 ㅠㅠ"],
  good: ["{name} 올해 어떻게 봄?", "{name} 이 정도면 괜찮지 않냐", "{name} 내년엔 더 터질 듯", "{name} 시즌 총평 해봄"],
  bad: ["{name} 진짜 답 없다", "{name} 언제까지 써야 함?", "{name} 2군 보내라 제발", "솔직히 {name} 거품 맞잖아", "{name} 올해 스탯 실화냐"],
  none: ["{name} 요즘 뭐함?", "{name} 복귀 언제냐", "{name} 근황 아는 사람"],
};
const POST_BODY = {
  great: ["{line} 찍었는데 이게 사람이냐 ㅋㅋ", "{line}… 할 말이 없다 그냥 박수", "{line} 이거 게임 아님?"],
  good: ["{line} 정도면 밥값은 했다고 봄", "{line}. 내년에 한 단계 더 가자", "{line}이면 무난하지 않냐"],
  bad: ["{line}… 이게 맞냐?", "{line} 보고 할 말을 잃음", "{line}. 연봉 생각하면 좀 그렇다"],
  none: ["경기를 못 보니 심심하다", "빨리 돌아와라"],
};

// 요즘 말투 글 제목·본문 추가
POST_TITLES.great.push("ㅅㅂ {name} 미쳤다 미쳤어", "{name} 폼 미쳤다 ㄹㅇ", "{tt} 팬인데 {name} 때문에 산다");
POST_TITLES.good.push("{name} 이 정도면 ㄱㅊ지?", "{name} 애매하게 잘함 ㅋㅋ");
POST_TITLES.bad.push("{name} 성적 줴줴이야", "아 ㅅㅂ {name} 진짜", "같은 {tt} 또 {tt}했다", "{name} 존나 못하네 진짜");
POST_BODY.great.push("{line} ㅅㅂ 이게 말이 되냐 ㅋㅋㅋ", "{line} 폼 미쳤다");
POST_BODY.bad.push("{line} 이게 맞냐 ㅅㅂ", "{line}… 줴줴다 줴줴", "{line} 보고 소주 깠다");

// 게시판 두 종류: 갤러리형(유동닉+IP) / 커뮤형(닉네임+레벨)
const FM_NICKS = ["치킨은반반", "야구는구라", "직관만10년", "불펜은왜", "타율3할의꿈", "외야석터줏대감", "펨붕이", "스탯충", "홈런볼사냥꾼",
  "야알못탈출", "새벽야구러", "응원가장인", "덕아웃캠", "오늘도패배", "가을야구가자", "구속은거짓말"];

function applySkin(report) {
  if (!report.skin) report.skin = Math.random() < 0.5 ? "dc" : "fm";
  const post = report.post || (report.post = {});
  if (!post.author) post.author = report.skin === "fm" ? { nick: pick(FM_NICKS), lv: randomInt(5, 40), ip: "" } : { nick: "ㅇㅇ", ip: `${randomInt(1, 223)}.${randomInt(1, 255)}` };
  for (const c of report.comments || []) {
    for (const r of c.replies || []) if (r.op) Object.assign(r, post.author); // 글쓴이 답글은 글쓴이 닉으로
  }
  if (report.skin !== "fm") return;
  const fix = (c) => {
    if (c.lv) return;
    c.nick = pick(FM_NICKS);
    c.ip = "";
    c.lv = randomInt(3, 40);
    c.text = c.text.replace(/^ㄴ /, ""); // 펨코식은 ㄴ 안 붙임
  };
  for (const c of report.comments || []) {
    fix(c);
    for (const r of c.replies || []) if (!r.op) fix(r);
  }
}

function makePost(player, report, grade) {
  const values = { ...recordValues(report), team: report.team };
  const g = POST_TITLES[grade] ? grade : "none";
  report.post = {
    ...(report.post || {}),
    title: fillText(pick(POST_TITLES[g]), player, values),
    body: fillText(pick(POST_BODY[g]), player, { ...values, line: statLine(report) || "기록 없음" }),
  };
}

// ---------------------------------------------
// 2. 기사
// ---------------------------------------------
const PRESS = ["야구투데이", "스포츠헤럴드", "다이아몬드뉴스", "베이스볼코리아", "스포츠라인", "그라운드일보", "엑스트라이닝", "스포츠데일리K", "더그아웃뉴스", "풀카운트"];
const REPORTER_LAST = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"];
const REPORTER_FIRST = ["민수", "지훈", "서연", "도윤", "하은", "준호", "예린", "성민", "유진", "태현", "수빈", "동혁", "다은", "재원"];

function statLine(report) {
  const b = report.bat, p = report.pit;
  const parts = [];
  if (b && b.G) parts.push(`타율 ${fmtRate(b.AVG)}, ${b.HR}홈런, ${b.RBI}타점, OPS ${fmtRate(b.OPS)}`);
  if (p && p.G) {
    const sv = p.SV ? ` ${p.SV}세이브` : p.HLD ? ` ${p.HLD}홀드` : "";
    parts.push(`${p.W}승 ${p.L}패${sv}, 평균자책점 ${p.ERA.toFixed(2)}, ${p.K}탈삼진`);
  }
  return parts.join(" / ");
}

// 기사 종류: 제목에 들어간 단어로 판단 (시즌 총평은 따로 표시해 둠)
function articleKind(title, report) {
  if (report && report.summaryTitle === title) return "season";
  if (/^\[단독\]|충격|논란|의미심장|결국|폭발|열애설|불화|몰락|도마 위|볼멘소리|쓴소리|소박|먹튀|목격담|루머|의혹|해명/.test(title)) return "aggro";
  if (/별명/.test(title)) return "nickname";
  if (/프랜차이즈|얼굴/.test(title)) return "franchise";
  if (/퇴장|징계|항의|싸늘|호불호|벤치클리어링/.test(title)) return "discipline";
  if (/콜업|개막 엔트리|군행|1군|테스트|독립리그/.test(title)) return "roster";
  if (/체중|폼|훈련|감량|펑고|벌크업|신무기|투구 수|연습장/.test(title)) return "training";
  if (/열애|결혼|유튜브|미담|사인|고소|사생활|기부|봉사|선행|팬미팅|광고|출산|아빠|입양|예능|공부|시험|멘토|약속|어린이/.test(title)) return "life";
  if (/포지션/.test(title)) return "position";
  if (/각성|회춘|전성기|달라진/.test(title)) return "hot";
  if (/포스팅|진출|이적료|스카우트|MLB 도전|NPB 도전|해외/.test(title)) return "overseas";
  if (/대학|체육특기자/.test(title)) return "college";
  if (/감독|사령탑|지휘봉/.test(title)) return "manager";
  if (/라이벌/.test(title)) return "rival";
  if (/명단/.test(title)) return "natcall";
  if (/MVP|수상|골든글러브|베스트나인|실버슬러거|골드글러브|올스타|신인왕|수비상/.test(title)) return "award";
  if (/계약|총액|FA|연봉|잔류|포스팅|제안|협상|조건|수용/.test(title)) return "contract";
  if (/트레이드/.test(title)) return "trade";
  if (/부상|이탈|재활/.test(title)) return "injury";
  if (/대표|메달|WBC|올림픽|프리미어12|아시안게임|태극/.test(title)) return /탈락|고개|충격/.test(title) ? "nationalFail" : "national";
  if (/우승|시리즈|챔피언/.test(title)) return "champ";
  if (/지명|드래프트|입단|육성/.test(title)) return "draft";
  if (/은퇴|유니폼을 벗/.test(title)) return "retire";
  if (/끝내기|결승타|노히트|사이클링|위기 탈출|삼구삼진|고개 숙|결승점|범타|피홈런/.test(title)) return "clutch";
  if (/병역|상무|사회복무|전역|입대/.test(title)) return "military";
  if (/"/.test(title)) return "interview";
  return "general";
}

const QUOTES = {
  great: ["팀 동료들 덕분이다. 개인 기록보다 팀 승리가 먼저", "아직 보여줄 게 많다. 내년엔 더 잘하겠다", "팬들 응원 덕분에 버틸 수 있었다", "목표는 늘 우승이다", "숫자는 신경 안 쓴다. 하루하루 최선을 다했을 뿐"],
  good: ["아쉬운 부분도 있었지만 배운 게 많은 시즌", "비시즌에 부족한 부분을 채우겠다", "꾸준함을 증명하고 싶었다", "만족은 없다. 더 올라가야 한다"],
  bad: ["변명의 여지가 없다. 팬들께 죄송하다", "다시 처음부터 시작하겠다", "실력으로 보여드리는 수밖에 없다", "내가 부족했다. 이번 겨울은 쉬지 않겠다"],
};

// 문단마다 후보 여러 개 → 하나씩 골라서 기사 완성 (등급별로 다른 후보가 있으면 {great, good, bad})
const BODY = {
  season: [
    { great: ["{team} {name}({age})의 {year} 시즌은 '커리어 하이'라는 말로도 부족했다. {line}.", "{name|이} {year} 시즌을 {line}로 마무리했다. 리그 정상급 성적이다."],
      good: ["{name|이} {year} 시즌을 {line}로 마쳤다. 화려하진 않았지만 제 몫은 충분히 했다.", "{team} {name}({age})의 {year} 시즌 성적표는 {line}. 합격점이다."],
      bad: ["{name}에게 {year} 시즌은 잊고 싶은 한 해였다. 성적은 {line}.", "{team} {name}({age})의 {year} 시즌은 기대와 거리가 멀었다. {line}에 그쳤다."] },
    { great: ["WAR {WAR}로 리그 최상위권. 상대 팀 전력분석원들 사이에서는 \"약점이 안 보인다\"는 말이 나온다.", "시즌 내내 큰 슬럼프 없이 꾸준했다는 점이 더 무섭다. WAR는 {WAR}."],
      good: ["WAR {WAR}. 시즌 중반 슬럼프를 딛고 반등에 성공했다는 평가다.", "WAR {WAR}로 팀 기여도는 준수한 편. 다만 기복은 숙제로 남았다."],
      bad: ["WAR {WAR}에 그치며 \"연봉 대비 아쉽다\"는 평가를 피하지 못했다.", "WAR {WAR}. 결정적인 순간마다 침묵했다는 지적도 나왔다."] },
    ["{standing}"],
    ["{name|은} 시즌을 마친 뒤 \"{quote}\"{qra}고 말했다.", "시즌 뒤 만난 {name|은} \"{quote}\"{qra}며 담담하게 소감을 전했다."],
    { great: ["벌써부터 내년 연봉 협상 결과에 관심이 쏠린다.", "야구계 안팎에서는 벌써 해외 진출 이야기까지 흘러나온다."],
      good: ["내년 시즌 한 단계 도약이 기대된다.", "다음 시즌이 진짜 시험대가 될 전망이다."],
      bad: ["비시즌 동안 반등의 실마리를 찾을 수 있을지 주목된다.", "구단 안팎에서는 \"이대로면 자리가 위험하다\"는 말도 나온다."] },
  ],
  award: [
    ["{name|이} {award}의 주인공이 됐다.", "{year} 시즌 {award} 트로피는 {name}에게 돌아갔다."],
    ["올 시즌 {line}을 기록한 {name|은} 경쟁자들을 제치고 수상의 영예를 안았다.", "시즌 성적은 {line}. 이견이 없는 수상이라는 평가다."],
    ["시상식 무대에 오른 {name|은} \"{quote}\"{qra}고 소감을 밝혔다.", "{name|은} 수상 직후 \"{quote}\"{qra}며 웃었다."],
    ["{team} 구단 관계자는 \"리그를 대표하는 선수로 성장했다\"며 흐뭇해했다.", "한 해설위원은 \"지금 기량이면 몇 년은 더 상을 휩쓸 것\"이라고 내다봤다."],
  ],
  contract: [
    ["{name}의 계약 소식이 전해지며 스토브리그가 달아올랐다.", "스토브리그 최대어 중 하나로 꼽힌 {name}의 행선지가 정해졌다."],
    ["업계에 따르면 이번 계약은 최근 성적({line})과 시장 상황이 반영된 결과다."],
    ["{name|은} \"믿어준 구단에 감사하다. 몸값에 걸맞은 활약을 하겠다\"고 말했다.", "{name|은} \"돈보다 뛸 수 있는 환경을 봤다\"고 계약 배경을 설명했다."],
    ["한 에이전트는 \"요즘 FA 시장 분위기를 감안하면 합리적인 수준\"이라고 평가했다.", "일부 팬들은 \"오버페이 아니냐\"는 반응도 보였다."],
  ],
  trade: [
    ["트레이드 소식은 갑작스러웠다. 구단은 \"팀 뎁스를 고려한 결정\"이라고 설명했다."],
    ["{name|은} 새 팀에서 \"기회를 준 만큼 증명하겠다\"며 각오를 다졌다."],
    ["올 시즌 {name}의 성적은 {line}. 새 팀에서 반등할 수 있을지 관심이 모인다."],
  ],
  injury: [
    ["{name|이} 부상으로 한동안 전력에서 이탈한다.", "악재가 터졌다. {name|이} 부상으로 쓰러졌다."],
    ["구단 트레이닝 파트는 \"정밀 검진 결과를 지켜봐야 한다\"고 밝혔다."],
    ["올 시즌 {line}을 기록하던 중이라 아쉬움이 더 크다."],
    ["팀 관계자는 \"무리시키지 않고 완벽하게 회복한 뒤 복귀시키겠다\"고 전했다."],
  ],
  manager: [
    ["{mteam|이} 사령탑 교체를 결정했다.", "{mteam}의 감독 선임 소식이 전해졌다."],
    ["구단은 \"팀 체질 개선과 새 바람이 필요했다\"고 설명했다.", "성적과 리빌딩 사이에서 고민한 끝에 내린 결정이라는 후문이다."],
    ["{mine}"],
  ],
  rival: [
    ["동갑내기 라이벌 {rival}과의 비교는 올해도 계속됐다.", "고교 시절부터 이어진 {name}와 {rival}의 경쟁이 또 한 번 화제다."],
    ["{name}의 올 시즌 성적은 {line}. 라이벌 {rival}의 성적은 {rivalLine}."],
    ["{name|은} \"서로 자극이 되는 사이\"라며 \"언젠가 같은 팀에서 뛰어 보고 싶다\"고 웃었다.", "두 선수 모두 \"의식하지 않는다\"고 말하지만 팬들의 생각은 다르다."],
  ],
  natcall: [
    ["{name|이} 대표팀 예비 명단에 이름을 올렸다."],
    ["대표팀 코칭스태프는 \"올 시즌 성적({line})이면 뽑지 않을 이유가 없다\"고 설명했다."],
    ["최종 엔트리 승선 여부는 비시즌 컨디션에 달렸다."],
  ],
  national: [
    ["태극마크를 단 {name|이} 국제무대에서 존재감을 드러냈다."],
    ["대표팀 관계자는 \"큰 경기에서 흔들리지 않는 선수\"라고 평가했다."],
    ["{name|은} \"나라를 대표한다는 건 언제나 영광\"이라고 말했다."],
  ],
  nationalFail: [
    ["대표팀의 국제대회 도전이 일찍 막을 내렸다.", "기대가 컸던 만큼 실망도 컸다."],
    ["{name|은} 대회 뒤 \"태극마크의 무게를 다시 느꼈다. 다음엔 꼭 결과로 보답하겠다\"고 말했다."],
    ["야구계에서는 \"국제 경쟁력부터 다시 점검해야 한다\"는 목소리가 나온다."],
  ],
  champ: [
    ["{team|이} 정상에 섰다. 마지막 순간 그라운드에는 선수단의 함성이 터져 나왔다."],
    ["이번 시즌 {name}의 성적은 {line}. 큰 경기에서 제 몫을 해냈다."],
    ["{name|은} \"이 순간을 위해 1년을 달렸다. 팬들과 함께 기쁨을 나누고 싶다\"고 말했다."],
  ],
  draft: [
    ["{name}의 프로 입성 소식이 전해졌다."],
    ["스카우트 관계자는 \"성장 가능성이 큰 선수\"라며 \"몇 년 안에 1군 주축으로 클 수 있다\"고 평가했다."],
    ["{name|은} \"꿈에 그리던 순간이다. 빨리 1군 무대에 서고 싶다\"고 소감을 전했다."],
  ],
  retire: [
    ["한 시대가 저물었다. {name|이} 정든 유니폼을 벗는다."],
    ["팬들은 커뮤니티에 \"덕분에 야구 볼 맛 났다\"며 아쉬움을 전했다."],
  ],
  clutch: [
    ["승부처에서 {name}의 이름이 다시 한번 불렸다."],
    ["경기 후 감독은 \"그런 상황을 이겨내야 진짜 선수\"라고 말했다."],
    ["올 시즌 {name}의 성적은 {line}."],
  ],
  military: [
    ["{name}의 병역 문제가 정리됐다."],
    ["구단은 \"선수 커리어에 가장 좋은 방향을 함께 고민했다\"고 밝혔다."],
    ["{name|은} \"돌아와서 더 좋은 모습 보여드리겠다\"고 다짐했다."],
  ],
  nickname: [
    ["팬들이 {name}에게 새 별명을 붙여줬다.", "야구 커뮤니티에서 {name}의 새 별명이 화제다."],
    ["별명이 생겼다는 건 그만큼 팬들의 관심이 크다는 뜻. 올 시즌 성적은 {line}."],
    ["{name|은} \"처음엔 쑥스러웠는데 이제는 마음에 든다\"며 웃었다.", "정작 {name|은} \"별명은 팬들이 정해주는 것\"이라며 말을 아꼈다."],
  ],
  franchise: [
    ["{team}의 얼굴이 바뀌었다. 이제 {name}의 이름을 빼고 {team|을} 말하기 어렵다."],
    ["구단 관계자는 \"실력과 인성 모두 팀의 상징이 될 만한 선수\"라고 말했다.", "구단 굿즈 판매량에서도 {name}의 마킹 유니폼이 압도적 1위다."],
    ["올 시즌 {name}의 성적은 {line}."],
  ],
  discipline: [
    ["{name}의 행동이 도마 위에 올랐다.", "{name|을} 두고 팬들 사이에서 갑론을박이 벌어졌다."],
    ["\"선수도 사람\"이라는 옹호와 \"프로답지 못했다\"는 비판이 맞섰다."],
    ["구단은 \"선수와 충분히 대화를 나눴다\"고 짧게 입장을 밝혔다."],
  ],
  life: [
    ["그라운드 밖 {name}의 이야기가 화제다."],
    ["야구팬들은 \"이런 모습 보니 더 응원하게 된다\"는 반응을 보였다.", "온라인에서는 관련 게시물이 빠르게 공유됐다."],
    ["올 시즌 {name}의 성적은 {line}."],
  ],
  position: [
    ["{name}의 수비 위치를 두고 코칭스태프의 고민이 깊다."],
    ["코치진은 \"팀 사정과 선수의 장점을 모두 고려했다\"고 설명했다."],
    ["새 포지션 적응이 순조로울지는 내년 시즌 초반이 고비가 될 전망이다."],
  ],
  hot: [
    ["완전히 다른 선수가 됐다. {name|이} 각성했다.", "{name}에게 무슨 일이 생긴 걸까."],
    ["올 시즌 성적은 {line}. 지난해와는 차원이 다르다."],
    ["{name|은} \"비시즌에 뭔가를 깨달았다. 설명하긴 어렵다\"며 웃었다."],
  ],
  overseas: [
    ["{name|을} 향한 해외 구단들의 관심이 뜨겁다.", "{name}의 해외 진출 이야기가 본격적으로 나오기 시작했다."],
    ["복수의 관계자에 따르면 해외 스카우트들은 최근 {name}의 경기를 직접 지켜봤다. 올 시즌 성적은 {line}."],
    ["{name|은} \"꿈은 늘 더 큰 무대\"라면서도 \"지금은 팀이 먼저\"라고 말했다."],
  ],
  college: [
    ["{name|이} 대학 무대에서 다시 프로를 노린다."],
    ["대학 감독은 \"4년 동안 몸을 제대로 만들면 상위 라운드도 충분하다\"고 말했다."],
    ["4년 뒤 대졸 드래프트에서 어떤 평가를 받을지 관심이 모인다."],
  ],
  interview: [
    ["{name}의 한마디가 화제다."],
    ["올 시즌 {line}을 기록한 {name}의 발언을 두고 팬들의 해석이 엇갈렸다.", "발언이 알려지자 커뮤니티에는 \"{fan}\"이라는 반응이 올라왔다."],
    ["{team} 관계자는 \"선수의 진심이 잘 전달됐으면 한다\"고 말했다."],
  ],
  roster: [
    ["{name}의 엔트리 변동 소식이 전해졌다.", "{team} 코칭스태프가 {name}에 대한 결단을 내렸다."],
    ["올 시즌 {name}의 성적은 {line}.", "구단 관계자는 \"지금 선수에게 가장 필요한 환경을 고민했다\"고 설명했다."],
    ["{name|은} \"어디서든 내 야구를 하면 된다\"며 각오를 다졌다."],
  ],
  training: [
    ["{name}의 비시즌이 바쁘다.", "{name|이} 변화를 택했다."],
    ["관계자들은 \"훈련 태도만큼은 팀 내 최고\"라고 입을 모은다."],
    ["변화가 성적으로 이어질지는 내년 시즌 개막과 함께 확인할 수 있다."],
  ],
  general: [
    ["{team} {name}의 소식이 야구계의 관심을 모으고 있다."],
    ["{name}의 올 시즌 성적은 {line}."],
    ["팬들의 반응도 뜨겁다. 한 야구 커뮤니티에는 \"{fan}\"이라는 글이 올라오기도 했다."],
  ],
  aggro: [
    ["{name|을} 둘러싼 이야기가 야구팬들 사이에서 빠르게 퍼지고 있다.", "온라인 커뮤니티를 중심으로 {name} 관련 이야기가 확산되고 있다."],
    ["일각에서는 \"이대로 가면 안 된다\"는 목소리도 나온다. 올 시즌 {name}의 성적은 {line}.", "한 관계자는 익명을 전제로 \"내부 분위기가 예전 같지 않다\"고 귀띔했다."],
    ["다만 구단 관계자는 \"확대 해석은 자제해 달라. 사실과 다른 부분이 많다\"며 선을 그었다."],
    ["진위 여부와 별개로 당분간 {name|을} 향한 시선은 엇갈릴 전망이다."],
  ],
};

// 어그로 기사 제목
const AGGRO_TITLES = {
  great: ["[단독] {name}, 해외 진출 의사 있다?… 측근 \"시기상조\"", "\"몸값 100억 간다\" {name}, FA 시장 벌써부터 들썩", "{name} 독주에 다른 구단들 \"규정 바꿔야\" 볼멘소리?", "'괴물' {name}, 사생활은 의외로 소박… 휴일엔 이것만 한다"],
  good: ["{name}, 경기 후 SNS에 의미심장한 글… 무슨 일?", "\"아직 멀었다\" {name} 향한 쓴소리, 누가 했나 봤더니", "{name} 열애설? 소속사 \"사생활이라 확인 불가\""],
  bad: ["'연봉 루팡' 논란 {name}, 팬들 분노 폭발", "충격! {name}의 몰락… 이대로 끝인가", "결국 터졌다… {name}, 덕아웃서 헬멧 집어던져", "{name} 부진에 \"트레이드해라\" 여론 들끓어", "'먹튀' 꼬리표 {name}, 성적표가 말해준다"],
};

const NAVER_COMMENTS = {
  good: ["응원합니다 다치지만 마세요", "이런 선수가 우리 팀이라 행복합니다", "올해 진짜 고생 많았다", "역시 믿고 보는 선수", "국대에서도 이렇게만 해주길", "꾸준함이 최고의 재능", "내년이 더 기대되네요"],
  bad: ["연봉 생각하면 좀 아쉽네요", "내년엔 반등하겠죠", "솔직히 실망입니다", "2군 가서 다시 다듬어야 할 듯", "기회를 너무 많이 받는 거 아닌가요", "부상만 아니었으면 아쉽네"],
  aggro: ["기자님 소설 잘 봤습니다", "제목 보고 들어왔는데 낚였네", "또 어그로 기사네 ㅋㅋ", "제목이랑 본문이 다르잖아요", "이런 기사는 왜 쓰는 건지", "클릭 수 장사 그만합시다"],
};

function articleGrade(report) {
  return ["great", "good", "bad"].includes(report.grade) ? report.grade : "good";
}

function makeArticle(player, report, title) {
  const kind = articleKind(title, report);
  const grade = articleGrade(report);
  const st = report.standing;
  const mteam = title.split(",")[0];
  const awardM = title.match(/^.+?, (.+?) 수상/);
  const r = report.rival;
  const values = {
    team: report.team, year: report.year, age: koreanAge(report.age), WAR: report.WAR,
    line: statLine(report) || "기록 없음",
    quote: pick(QUOTES[grade]),
    qra: "",
    fan: report.comments && report.comments.length ? pick(report.comments).text : "응원한다",
    award: awardM ? awardM[1] : "올해의 상",
    mteam,
    mine: mteam === report.team ? `새 감독 체제에서 ${player.name}의 역할에도 관심이 쏠린다.` : "이번 결정으로 리그 사령탑 지형에도 변화가 생겼다.",
    rival: r ? r.name : "라이벌", rivalLine: r ? r.line : "-",
    standing: st ? `${report.team}${josaOf(report.team, "은")} 정규시즌 ${st.rank}위(${st.w}승 ${st.l}패)로 시즌을 마쳤다.${st.seed ? " 가을야구 무대도 밟았다." : ""}` : "",
  };
  values.qra = josaOf(values.quote, "이") === "이" ? "이라" : "라"; // "시즌"이라고 / "하겠다"라고
  const choose = (slot) => (Array.isArray(slot) ? pick(slot) : pick(slot[grade] || slot.good));
  const body = BODY[kind].map((slot) => fillText(choose(slot), player, values)).filter((t) => t.trim());
  const d = new Date(Date.UTC(report.year, report.league === "ABL" ? 0 : 9, randomInt(1, 28), randomInt(8, 22), randomInt(0, 59)));
  const h = d.getUTCHours();
  const pool = kind === "aggro" ? NAVER_COMMENTS.aggro : grade === "bad" || kind === "nationalFail" ? NAVER_COMMENTS.bad : NAVER_COMMENTS.good;
  const abc = "abcdefghjkmnpqrstuvwxyz".split("");
  return {
    title, kind, body,
    press: pick(PRESS),
    reporter: `${pick(REPORTER_LAST)}${pick(REPORTER_FIRST)} 기자`,
    time: `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}. ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
    emoji: { nationalFail: "😞", roster: "📋", training: "🏋️", nickname: "🏷️", franchise: "⭐", discipline: "⚠️", life: "📸", position: "🧤", hot: "🔥", overseas: "✈️", college: "🎓", interview: "🎤", season: "📊", award: "🏆", contract: "✍️", trade: "📦", injury: "🏥", manager: "🧢", rival: "⚔️", natcall: "🇰🇷", national: "🇰🇷", champ: "🎉", draft: "🎓", retire: "👋", clutch: "⚡", military: "🎖️", aggro: "🔥", general: "⚾" }[kind],
    react: kind === "aggro"
      ? { 좋아요: randomInt(5, 80), 훈훈해요: randomInt(0, 10), 슬퍼요: randomInt(5, 60), 화나요: randomInt(80, 900), 후속기사: randomInt(10, 200) }
      : grade === "bad"
        ? { 좋아요: randomInt(5, 60), 훈훈해요: randomInt(0, 20), 슬퍼요: randomInt(30, 300), 화나요: randomInt(30, 400), 후속기사: randomInt(5, 60) }
        : { 좋아요: randomInt(100, 2500), 훈훈해요: randomInt(20, 400), 슬퍼요: randomInt(0, 15), 화나요: randomInt(0, 30), 후속기사: randomInt(20, 300) },
    comments: pickMany(pool, randomInt(3, 5)).map((t) => ({ nick: `${pick(abc)}${pick(abc)}${pick(abc)}****`, text: t, up: randomInt(0, 400), down: randomInt(0, 60) })),
  };
}

// 시즌마다 어그로 기사 하나 정도 (60%)
function maybeAggro(player, report) {
  if (isAmateur(report.league) || !report.bat && !report.pit || Math.random() >= 0.6) return;
  const grade = report.grade === "great" ? "great" : report.grade === "bad" ? "bad" : "good";
  report.news.push(fillText(pick(AGGRO_TITLES[grade]), player, {}));
}

// 팬 여론 수치·계약 조건·업적 같은 줄은 기사로 안 만듦
function isArticle(t) {
  return !/^팬 여론|^계약 조건|^🏅|^업적/.test(t);
}

// 제목마다 기사 하나씩 (처음 볼 때 만들고 저장해 둠)
function ensureArticles(player, report) {
  if (!report || !report.news) return false;
  report.articles = report.articles || {};
  let made = false;
  for (const t of report.news) {
    if (!isArticle(t)) continue;
    if (!report.articles[t]) { report.articles[t] = makeArticle(player, report, t); made = true; }
  }
  return made;
}

// 지난 시즌 기사는 2시즌만 보관 (저장 용량 아끼려고)
function archiveNews(player) {
  const r = player.lastReport;
  if (!r || !r.news || !r.news.length) return;
  ensureArticles(player, r);
  player.newsArchive = [{ year: r.year, news: r.news.slice(), articles: r.articles }, ...(player.newsArchive || [])].slice(0, 2);
}

// ---------------------------------------------
// 3. 뉴스 탭
// ---------------------------------------------
function articleHtml(a, id) {
  const reacts = Object.entries(a.react).map(([k, v]) => `<span>${{ 좋아요: "👍", 훈훈해요: "🥰", 슬퍼요: "😢", 화나요: "😡", 후속기사: "📝" }[k]} ${k === "후속기사" ? "후속기사 원해요" : k} <b>${v}</b></span>`).join("");
  return `<details class="article" id="${id}">
    <summary><span class="a-thumb">${a.emoji}</span><span class="a-head"><b>${a.title}</b><small>${a.press} · ${a.time}</small></span></summary>
    <div class="a-body">
      <h3>${a.title}</h3>
      <p class="a-meta">${a.press} | ${a.reporter} | 입력 ${a.time}</p>
      <div class="a-photo">${a.emoji}</div>
      ${a.body.map((p) => `<p>${p}</p>`).join("")}
      <p class="a-copy">ⓒ ${a.press}, 무단 전재 및 재배포 금지</p>
      <div class="a-react">${reacts}</div>
      <div class="a-cmt"><b>댓글 ${a.comments.length}</b>${a.comments.map((c) => `<div><span class="a-nick">${c.nick}</span> ${c.text}<span class="a-ud">공감 ${c.up} · 비공감 ${c.down}</span></div>`).join("")}</div>
    </div>
  </details>`;
}

function showNews(player) {
  const box = $("tab-news");
  if (!box) return;
  const r = player.lastReport;
  if (!r || !r.news) { box.innerHTML = "<p class='empty'>아직 기사가 없어요.</p>"; return; }
  if (ensureArticles(player, r)) savePlayer(player);
  let html = `<div class="news-portal"><div class="np-title">⚾ 스포츠 · 야구 <small>${r.year} 시즌</small></div>`;
  html += r.news.map((t, i) => (r.articles[t] ? articleHtml(r.articles[t], `article-${i}`) : "")).join("");
  for (const old of player.newsArchive || []) {
    html += `<div class="np-sub">${old.year} 시즌 기사</div>` + old.news.map((t) => (old.articles[t] ? articleHtml(old.articles[t], "") : "")).join("");
  }
  box.innerHTML = html + "</div>";
}

// 시즌 결과에서 기사 제목 누르면 뉴스 탭의 그 기사로
function openArticle(i) {
  setTab("news");
  const el = document.getElementById(`article-${i}`);
  if (!el) return;
  el.open = true;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

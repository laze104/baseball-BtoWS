// =============================================
// achievements.js : 업적 도감
// 선수가 바뀌어도 브라우저에 계속 남음. 기능별 업적은 그 기능 파일 맨 아래에서 추가(push)함
// =============================================

const ACH_KEY = "baseball-achievements";

const sumHist = (p, side, key) => p.history.filter((h) => !isAmateur(h.league) && h[side]).reduce((s, h) => s + (h[side][key] || 0), 0);
const everIn = (p, lg) => p.history.some((h) => h.league === lg) || p.league === lg;

const proSeasons = (p) => p.history.filter((h) => PRO_LEAGUES.includes(h.league) || h.league === "MILB");
const qualifiedBat = (h) => !isAmateur(h.league) && h.bat && h.bat.PA >= 3.1 * LEAGUES[h.league].games;

const ACHIEVEMENTS = [
  // 아마추어
  { id: "hsTitle", group: "아마추어", name: "고교 챔피언", desc: "고교 전국대회 우승", check: (p) => hsTitles(p) >= 1 },
  {
    id: "hsSlam",
    group: "아마추어",
    name: "고교 그랜드슬램",
    desc: "5개 고교 전국대회를 모두 우승",
    check: (p) => HS_TOURNAMENTS.every((n) => p.awards[`${n} 우승`]),
  },
  { id: "college", group: "아마추어", name: "캠퍼스 스타", desc: "대학을 거쳐 프로 입단", check: (p) => p.collegeGrad && PRO_LEAGUES.includes(p.league) },
  { id: "round1", group: "아마추어", name: "최대어", desc: "1라운드 지명으로 입단", check: (p) => p.draftRound === 1 && !isAmateur(p.league) },
  {
    id: "weed",
    group: "아마추어",
    name: "잡초",
    desc: "독립리그·호주리그를 거쳐 프로 입단",
    check: (p) => (everIn(p, "INDIE") || everIn(p, "ABL")) && everIn(p, "KBO2"),
  },
  // 프로 커리어
  { id: "debut", group: "커리어", name: "1군 데뷔", desc: "KBO 1군에서 한 시즌", check: (p) => everIn(p, "KBO") },
  { id: "fa", group: "커리어", name: "FA 대박", desc: "KBO FA 계약 성공", check: (p) => (p.faCount || 0) >= 1 },
  { id: "posting", group: "커리어", name: "포스팅 성공", desc: "포스팅으로 해외 진출", check: (p) => !!p.kboRights },
  { id: "npb", group: "커리어", name: "일본 무대", desc: "NPB에서 뛰기", check: (p) => everIn(p, "NPB") },
  { id: "mlb", group: "커리어", name: "메이저리거", desc: "MLB에서 뛰기", check: (p) => everIn(p, "MLB") },
  {
    id: "mlbFA",
    group: "커리어",
    name: "억대 달러",
    desc: "MLB 총액 1,000억 이상 계약",
    check: (p) => p.contract && p.contract.league === "MLB" && p.contract.total >= 10000000,
  },
  { id: "franchise", group: "커리어", name: "프랜차이즈 스타", desc: "한 팀의 얼굴이 되기", check: (p) => !!p.franchise },
  { id: "number", group: "커리어", name: "영구결번", desc: "등번호가 영원히 남기", check: (p) => countAward(p, "영구결번") >= 1 },
  {
    id: "forty",
    group: "커리어",
    name: "불혹의 현역",
    desc: "40세(한국 나이)에도 프로에서 뛰기",
    check: (p) => p.history.some((h) => PRO_LEAGUES.includes(h.league) && koreanAge(h.age) >= 40),
  },
  { id: "army", group: "커리어", name: "군필", desc: "병역을 마치고 복귀", check: (p) => p.military === "done" },
  {
    id: "exempt",
    group: "커리어",
    name: "병역 특례",
    desc: "메달로 병역 특례 받기",
    check: (p) => p.military === "exempt" || p.history.some((h) => h.events.includes("병역 특례")),
  },
  // 시즌 기록 (타자)
  {
    id: "hr40",
    group: "시즌 기록",
    name: "40홈런",
    desc: "한 시즌 40홈런 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 40),
  },
  {
    id: "hr50",
    group: "시즌 기록",
    name: "50홈런",
    desc: "한 시즌 50홈런 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 50),
  },
  {
    id: "avg400",
    group: "시즌 기록",
    name: "4할 타자",
    desc: "규정타석 채우고 타율 4할 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.AVG >= 0.4 && h.bat.PA >= 400),
  },
  {
    id: "sb50",
    group: "시즌 기록",
    name: "대도",
    desc: "한 시즌 50도루 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.SB >= 50),
  },
  {
    id: "triple",
    group: "시즌 기록",
    name: "타격 3관왕",
    desc: "한 해에 타격왕·홈런왕·타점왕",
    check: (p) => p.history.some((h) => ["타격왕", "홈런왕", "타점왕"].every((a) => h.awards.includes(a))),
  },
  { id: "cycle", group: "시즌 기록", name: "사이클링 히트", desc: "결정적 순간에 사이클링 히트", check: (p) => countAward(p, "사이클링 히트") >= 1 },
  // 시즌 기록 (투수)
  {
    id: "win20",
    group: "시즌 기록",
    name: "20승",
    desc: "한 시즌 20승 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.W >= 20),
  },
  {
    id: "k250",
    group: "시즌 기록",
    name: "닥터 K",
    desc: "한 시즌 250탈삼진 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.K >= 250),
  },
  {
    id: "sv40",
    group: "시즌 기록",
    name: "철벽 마무리",
    desc: "한 시즌 40세이브 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.SV >= 40),
  },
  {
    id: "era1",
    group: "시즌 기록",
    name: "1점대 에이스",
    desc: "규정이닝 채우고 평균자책 1점대",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.ERA < 2 && h.pit.outs >= 3 * LEAGUES[h.league].games),
  },
  {
    id: "pTriple",
    group: "시즌 기록",
    name: "투수 3관왕",
    desc: "한 해에 다승왕·평균자책점왕·탈삼진왕",
    check: (p) => p.history.some((h) => ["다승왕", "평균자책점왕", "탈삼진왕"].every((a) => h.awards.includes(a))),
  },
  { id: "nohit", group: "시즌 기록", name: "노히트노런", desc: "결정적 순간에 노히트노런", check: (p) => countAward(p, "노히트노런") >= 1 },
  // 통산 기록
  { id: "hr300", group: "통산 기록", name: "300홈런", desc: "프로 통산 300홈런", check: (p) => sumHist(p, "bat", "HR") >= 300 },
  { id: "hr500", group: "통산 기록", name: "500홈런", desc: "프로 통산 500홈런", check: (p) => sumHist(p, "bat", "HR") >= 500 },
  { id: "hit2000", group: "통산 기록", name: "2000안타", desc: "프로 통산 2000안타", check: (p) => sumHist(p, "bat", "H") >= 2000 },
  { id: "win150", group: "통산 기록", name: "150승", desc: "프로 통산 150승", check: (p) => sumHist(p, "pit", "W") >= 150 },
  { id: "sv300", group: "통산 기록", name: "300세이브", desc: "프로 통산 300세이브", check: (p) => sumHist(p, "pit", "SV") >= 300 },
  { id: "war60", group: "통산 기록", name: "WAR 60", desc: "프로 통산 WAR 60", check: (p) => careerTotals(p).WAR >= 60 },
  // 수상
  { id: "rookie", group: "수상", name: "신인왕", desc: "신인왕 수상", check: (p) => countAward(p, "신인왕") >= 1 },
  { id: "mvp", group: "수상", name: "MVP", desc: "정규시즌 MVP", check: (p) => countAward(p, "MVP") >= 1 },
  { id: "mvp3", group: "수상", name: "MVP 3회", desc: "정규시즌 MVP 3번", check: (p) => countAward(p, "MVP") >= 3 },
  { id: "ring", group: "수상", name: "우승 반지", desc: "프로 시리즈 우승", check: (p) => countAward(p, "시리즈 우승") >= 1 },
  { id: "dynasty", group: "수상", name: "왕조의 주역", desc: "프로 시리즈 우승 5번", check: (p) => countAward(p, "시리즈 우승") >= 5 },
  { id: "hero", group: "수상", name: "시리즈의 영웅", desc: "시리즈 최우수선수", check: (p) => countAward(p, "최우수선수") >= 1 },
  { id: "gold", group: "수상", name: "금메달", desc: "국제대회 금메달", check: (p) => countAward(p, "금메달") + countAward(p, "WBC 우승") >= 1 },
  {
    id: "twoway",
    group: "수상",
    name: "진짜 이도류",
    desc: "이도류로 투타 OVR 모두 65 이상",
    check: (p) => p.type === "twoway" && getOvrs(p).bat >= 65 && getOvrs(p).pit >= 65,
  },
  // 인생
  { id: "star", group: "인생", name: "국민 스타", desc: "팬 여론 80 이상", check: (p) => (p.fame || 0) >= 80 },
  { id: "villain", group: "인생", name: "공공의 적", desc: "팬 여론 -60 이하", check: (p) => (p.fame || 0) <= -60 },
  { id: "married", group: "인생", name: "가장", desc: "결혼하기", check: (p) => !!p.married },
  { id: "rich", group: "인생", name: "100억 자산가", desc: "재산 100억", check: (p) => (p.money || 0) >= 1000000 },
  { id: "richer", group: "인생", name: "1000억 자산가", desc: "재산 1000억", check: (p) => (p.money || 0) >= 10000000 },
  {
    id: "rival",
    group: "인생",
    name: "라이벌 압승",
    desc: "은퇴할 때 통산 WAR가 라이벌의 2배 이상",
    check: (p) => p.retired && p.rival && careerTotals(p).WAR >= 10 && careerTotals(p).WAR >= 2 * Math.max(1, rivalSummary(p.rival).WAR),
  },
  { id: "hof", group: "인생", name: "명예의 전당", desc: "명예의 전당 헌액", check: (p) => p.hof && p.hof.inducted },
  { id: "hofFirst", group: "인생", name: "첫 투표 헌액", desc: "은퇴 후 첫 투표에서 바로 헌액", check: (p) => p.hof && p.hof.inducted && p.hof.ballot === 1 },
  // ---------- 시상식·해외 직행·회춘 ----------
  { id: "allstar", group: "수상", name: "별들의 잔치", desc: "올스타 선정", check: (p) => (p.awards["올스타"] || 0) >= 1 },
  { id: "allstar10", group: "수상", name: "올스타 단골", desc: "올스타 10번 선정", check: (p) => (p.awards["올스타"] || 0) >= 10 },
  { id: "mrAllstar", group: "수상", name: "미스터 올스타", desc: "올스타전 MVP", check: (p) => countAward(p, "미스터 올스타") >= 1 },
  {
    id: "glove",
    group: "수상",
    name: "황금 장갑",
    desc: "골든글러브·베스트나인·골드글러브·실버슬러거 중 하나",
    check: (p) => ["골든글러브", "베스트나인", "골드글러브", "실버슬러거"].some((a) => countAward(p, a) >= 1),
  },
  {
    id: "ace",
    group: "수상",
    name: "리그 최고 투수",
    desc: "최동원상·사와무라상·사이영상",
    check: (p) => ["최동원상", "사와무라상", "사이영상"].some((a) => countAward(p, a) >= 1),
  },
  { id: "direct", group: "커리어", name: "아메리칸 드림", desc: "고교 졸업 후 미국 직행", check: (p) => !!p.overseasAmateur },
  { id: "revival", group: "커리어", name: "회춘", desc: "30대에 찾아온 제2의 전성기", check: (p) => !!p.revivalUsed },
  { id: "nretire", group: "커리어", name: "태극마크 반납", desc: "국가대표 은퇴 선언", check: (p) => !!p.nationalRetired },
  // 아마추어·커리어
  {
    id: "hsMonster",
    group: "아마추어",
    name: "고교 괴물",
    desc: "고교에서 타율 5할 또는 평균자책 0점대",
    check: (p) => p.history.some((h) => h.league === "HS" && ((h.bat && h.bat.AVG >= 0.5 && h.bat.PA >= 60) || (h.pit && h.pit.ERA < 1 && h.pit.outs >= 90))),
  },
  {
    id: "rookieWar",
    group: "커리어",
    name: "괴물 신인",
    desc: "1군 첫 시즌 WAR 5 이상",
    check: (p) => {
      const f = p.history.find((h) => TOP_LEAGUES.includes(h.league));
      return !!f && f.WAR >= 5;
    },
  },
  {
    id: "oneClub",
    group: "커리어",
    name: "원클럽맨",
    desc: "프로 10시즌 이상을 한 팀에서만 뛰고 은퇴",
    check: (p) =>
      p.retired &&
      proSeasons(p).length >= 10 &&
      new Set(
        proSeasons(p)
          .filter((h) => TOP_LEAGUES.includes(h.league))
          .map((h) => h.team),
      ).size === 1,
  },
  {
    id: "journey",
    group: "커리어",
    name: "저니맨",
    desc: "프로 1군 팀 5곳 이상에서 뛰기",
    check: (p) => new Set(p.history.filter((h) => TOP_LEAGUES.includes(h.league)).map((h) => h.team)).size >= 5,
  },
  {
    id: "worldTour",
    group: "커리어",
    name: "한·미·일 정복",
    desc: "KBO·NPB·MLB에서 모두 뛰기",
    check: (p) => ["KBO", "NPB", "MLB"].every((lg) => everIn(p, lg)),
  },
  { id: "traded", group: "커리어", name: "새 출발", desc: "트레이드 요청으로 팀 옮기기", check: (p) => !!p.traded },
  { id: "captain", group: "커리어", name: "캡틴", desc: "팀 주장 맡기", check: (p) => !!p.captainTeam },
  { id: "closerUp", group: "커리어", name: "뒷문 승격", desc: "감독이 먼저 마무리를 맡기기", check: (p) => !!p.closerPromoted },
  { id: "mega", group: "커리어", name: "메가 계약", desc: "8년 이상 초대형 계약 서명", check: (p) => !!p.megaSigned },
  { id: "abroadDefer", group: "커리어", name: "국외 체류 연기", desc: "MLB에서 뛰며 입대 연기", check: (p) => !!p.abroadDefer },
  {
    id: "legendBoss",
    group: "커리어",
    name: "레전드의 제자",
    desc: "👑 레전드 감독 밑에서 뛰기",
    check: (p) => (p.myManagers || []).some((n) => PAST_MANAGERS.some((m) => m.legend && m.name === n)),
  },
  {
    id: "rivalBoss",
    group: "커리어",
    name: "적장이 된 라이벌",
    desc: "은퇴한 라이벌이 KBO 감독이 되기",
    check: (p) => !!(p.rival && p.managerPool && p.managerPool[p.rival.name]),
  },
  // 시즌 기록
  {
    id: "thirty30",
    group: "시즌 기록",
    name: "30-30",
    desc: "한 시즌 30홈런·30도루 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 30 && h.bat.SB >= 30),
  },
  {
    id: "forty40",
    group: "시즌 기록",
    name: "40-40",
    desc: "한 시즌 40홈런·40도루 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 40 && h.bat.SB >= 40),
  },
  {
    id: "hit200",
    group: "시즌 기록",
    name: "200안타",
    desc: "한 시즌 200안타 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.H >= 200),
  },
  {
    id: "ops1000",
    group: "시즌 기록",
    name: "OPS 1.000",
    desc: "규정타석 채우고 OPS 1.000 이상",
    check: (p) => p.history.some((h) => qualifiedBat(h) && h.bat.OPS >= 1),
  },
  {
    id: "rbi130",
    group: "시즌 기록",
    name: "타점 기계",
    desc: "한 시즌 130타점 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.RBI >= 130),
  },
  {
    id: "ip200",
    group: "시즌 기록",
    name: "이닝 이터",
    desc: "한 시즌 200이닝 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.outs >= 600),
  },
  {
    id: "k300",
    group: "시즌 기록",
    name: "300K",
    desc: "한 시즌 300탈삼진 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.K >= 300),
  },
  {
    id: "hld30",
    group: "시즌 기록",
    name: "홀드 장인",
    desc: "한 시즌 30홀드 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.HLD >= 30),
  },
  { id: "war10", group: "시즌 기록", name: "WAR 10", desc: "한 시즌 WAR 10 이상", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.WAR >= 10) },
  // 통산 기록
  { id: "hit3000", group: "통산 기록", name: "3000안타", desc: "프로 통산 3000안타", check: (p) => sumHist(p, "bat", "H") >= 3000 },
  { id: "win200", group: "통산 기록", name: "200승", desc: "프로 통산 200승", check: (p) => sumHist(p, "pit", "W") >= 200 },
  { id: "k2000", group: "통산 기록", name: "2000탈삼진", desc: "프로 통산 2000탈삼진", check: (p) => sumHist(p, "pit", "K") >= 2000 },
  { id: "sb400", group: "통산 기록", name: "도루 400", desc: "프로 통산 400도루", check: (p) => sumHist(p, "bat", "SB") >= 400 },
  { id: "war100", group: "통산 기록", name: "WAR 100", desc: "프로 통산 WAR 100", check: (p) => careerTotals(p).WAR >= 100 },
  // 수상
  { id: "regular1", group: "수상", name: "정규시즌 1위", desc: "정규시즌 우승", check: (p) => countAward(p, "정규시즌 우승") >= 1 },
  {
    id: "mvpRing",
    group: "수상",
    name: "완벽한 한 해",
    desc: "같은 해에 MVP와 시리즈 우승",
    check: (p) => p.history.some((h) => h.awards.some((a) => a.includes("MVP") && !a.includes("올스타")) && h.awards.some((a) => a.includes("시리즈 우승"))),
  },
  {
    id: "glove5",
    group: "수상",
    name: "황금 장갑 수집가",
    desc: "골든글러브·베스트나인 5회",
    check: (p) => countAward(p, "골든글러브") + countAward(p, "베스트나인") >= 5,
  },
  {
    id: "aceTwice",
    group: "수상",
    name: "에이스 중의 에이스",
    desc: "최동원상·사와무라상·사이영상 합쳐 3회",
    check: (p) => ["최동원상", "사와무라상", "사이영상"].reduce((t, a) => t + countAward(p, a), 0) >= 3,
  },
  { id: "aaron", group: "수상", name: "리그 최고의 타자", desc: "행크 애런상", check: (p) => countAward(p, "행크 애런상") >= 1 },
  {
    id: "reliever",
    group: "수상",
    name: "올해의 구원투수",
    desc: "마리아노 리베라상·트레버 호프먼상",
    check: (p) => countAward(p, "리베라상") + countAward(p, "호프먼상") >= 1,
  },
  { id: "comeback", group: "수상", name: "재기의 아이콘", desc: "올해의 재기상", check: (p) => countAward(p, "재기상") >= 1 },
  { id: "clemente", group: "수상", name: "그라운드 밖의 영웅", desc: "로베르토 클레멘테상", check: (p) => countAward(p, "클레멘테상") >= 1 },
  { id: "medals", group: "수상", name: "메달 컬렉터", desc: "국제대회 메달 3개", check: (p) => countAward(p, "메달") >= 3 },
  // 인생
  { id: "dad", group: "인생", name: "아빠 선수", desc: "아이 태어나기", check: (p) => (p.kids || 0) >= 1 },
  { id: "petLover", group: "인생", name: "집사", desc: "반려동물 키우기", check: (p) => !!p.pet },
  { id: "landlord", group: "인생", name: "건물주", desc: "건물주 되기", check: (p) => hasItem(p, "building") },
  { id: "islander", group: "인생", name: "섬 주인", desc: "남태평양 개인 섬 사기", check: (p) => hasItem(p, "island") },
  {
    id: "giver",
    group: "인생",
    name: "기부 천사",
    desc: "기부 아이템 4개 이상",
    check: (p) => ["donation", "foundation", "alma", "coal", "elderly", "disaster", "little", "camp"].filter((id) => hasItem(p, id)).length >= 4,
  },
  { id: "hyodo", group: "인생", name: "효자", desc: "부모님 집과 차 선물", check: (p) => hasItem(p, "parents") && hasItem(p, "parentsCar") },
  { id: "collector", group: "인생", name: "쇼핑왕", desc: "상점 아이템 20개 보유", check: (p) => (p.owned || []).length >= 20 },
  // ---------- 트레이드·FA·말년 ----------
  {
    id: "autumnMan",
    group: "시즌 기록",
    name: "가을 사나이",
    desc: "포스트시즌 통산 OPS .950 이상(40타석+) 또는 평균자책 2.00 이하(20이닝+)",
    check: (p) => {
      const t = psTotals(p);
      return !!t && ((t.PA >= 40 && t.OPS >= 0.95) || (t.outs >= 60 && t.ERA <= 2));
    },
  },
  { id: "historic", group: "시즌 기록", name: "전설의 시즌", desc: "역사에 남을 시즌 보내기 (극악 확률)", check: (p) => (p.historicSeasons || 0) >= 1 },
  { id: "extend", group: "인생", name: "포기는 없다", desc: "강제 은퇴 위기에서 현역 연장 선택", check: (p) => (p.extended || 0) >= 1 },
  { id: "tryout", group: "인생", name: "입단 테스트 합격", desc: "현역 연장 입단 테스트 통과", check: (p) => !!p.tryoutPassed },
  {
    id: "age45",
    group: "인생",
    name: "불혹을 넘어",
    desc: "한국 나이 45세 이상까지 현역",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && koreanAge(h.age) >= 45),
  },
  { id: "traded", group: "커리어", name: "짐 싸는 날", desc: "본인 의사와 상관없이 트레이드 당하기", check: (p) => (p.forcedTrades || 0) >= 1 },
  {
    id: "natStar",
    group: "수상",
    name: "국대 에이스",
    desc: "국가대표 통산 5홈런 또는 20탈삼진",
    check: (p) => {
      const l = p.nationalHistory || [];
      return l.reduce((s, n) => s + (n.bat ? n.bat.HR : 0), 0) >= 5 || l.reduce((s, n) => s + (n.pit ? n.pit.K : 0), 0) >= 20;
    },
  },
  { id: "faHaggle", group: "커리어", name: "밀당의 고수", desc: "FA 협상 테이블에서 조건 올리기 성공", check: (p) => !!p.negoWin },
];

function loadAchievements() {
  return loadJSON(ACH_KEY, {});
}

// 새로 달성한 업적 이름 목록을 돌려줌
function checkAchievements(player) {
  const got = loadAchievements();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (got[a.id]) continue;
    let ok = false;
    try {
      ok = a.check(player);
    } catch (e) {
      ok = false;
    }
    if (ok) {
      got[a.id] = { by: player.name, year: gameYear(player) };
      fresh.push(a.name);
    }
  }
  if (fresh.length) {
    saveJSON(ACH_KEY, got);
  }
  return fresh;
}

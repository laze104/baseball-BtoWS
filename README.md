# 야구선수 키우기

야구선수 한 명을 고교부터 은퇴까지 키우는 웹 게임. 빌드 없이 `index.html`만 열면 돌아감.
저장은 브라우저 localStorage.

## 폴더 구조

파일 하나 = 주제 하나. 뭘 고치고 싶은지 정해지면 아래 표에서 파일을 찾으면 됨.

```
index.html          화면 뼈대 + 스크립트 읽는 순서
css/style.css       화면 꾸밈 전부 (맨 위에 구역 목차 있음)
js/
  core/util.js      랜덤·숫자·저장 같은 공통 함수. 제일 먼저 읽힘

  data/             고정 데이터. 숫자·이름만 있고 계산하는 코드는 없음
    basics.js       능력치 이름, 포지션, 플레이 스타일, 시작 연도·물가
    schools.js      고등학교·대학교 야구부, 권역, 아마추어 대회
    leagues.js      리그 수준·경기 수, 팀, 지구 편성, 우승 이름, 팬덤 크기
    managers.js     감독 이름·스타일, 역대 감독, 새 감독 후보
    economy.js      최저연봉·계약금, 쇼핑 목록
    events.js       국가대표 대회, 인터뷰·사생활 이벤트, 별명 규칙
    text.js         기사 제목, 팬 댓글 기본 묶음

  core/             시즌을 돌리는 규칙 (화면 없음)
    sim.js          타석·투구를 굴려서 시즌 기록을 만드는 시뮬레이션
    player.js       선수 만들기, OVR 계산, 예전 저장 데이터 채우기
    growth.js       성장유형 (비공개)
    traits.js       숨은 특성: 늦깎이·해외 체질·계절 체질 (비공개)
    money.js        연봉, 계약, FA 제안 금액, 돈 들어오기
    rules.js        실제 규정: KBO FA 등록일수, 포스팅, MLB 서비스타임
    draft.js        신인 드래프트, 대학 진학
    choices.js      선택지(메일) 대기열. 메일 상한도 여기
    career.js       시즌 하나 진행하는 본체 + 커리어 이동 + 은퇴
    standings.js    팀 순위, 포스트시즌 진출, 우승 판정, 월별 순위
    postseason.js   포스트시즌 기록
    splits.js       월별 성적
    awards.js       시상식 (MVP·골든글러브 등), 올스타
    achievements.js 업적 도감
    hof.js          명예의 전당 투표

  media/            기사·댓글·중계 (성적을 글로 바꾸는 쪽)
    feed.js         기사 제목, 커뮤니티 댓글 만들기
    news.js         뉴스 탭, 기사 본문, 성적별 댓글 묶음
    broadcast.js    트래킹 데이터, 신기록, 텍스트 중계
    press.js        기자회견
    saber.js        세이버 지표, 스카우트 리포트
    almanac.js      기록 연감 탭
    mail.js         메일함 + 메일 탭

  systems/          콘텐츠 (한 파일 = 한 기능)
    national.js     국가대표 (대회, 기록, 대표팀 은퇴)
    military.js     병역 (상무·사회복무·메달 특례)
    rival.js        동갑내기 라이벌
    nickname.js     별명
    life.js         팬 여론(fame), 인터뷰·사생활 이벤트
    franchise.js    프랜차이즈 스타, 영구결번
    position.js     포지션 변경
    cups.js         고교 주말리그·전국대회, 대학 대회
    clutch.js       결정적 순간
    boxscore.js     수싸움 + 결정적 순간 박스스코어
    shop.js         쇼핑, 전담 스태프 계약
    minors.js       고졸 MLB 직행, 마이너리그
    manager.js      감독 면담, 감독 교체
    historic.js     역사적 시즌
    trade.js        강제 트레이드
    fa.js           FA 협상 테이블 (팀 사정, 더 기다리기, 직접 협상)
    late-career.js  커리어 말년 (은퇴 조건, 입단 테스트)
    nemesis.js      숙적
    agent.js        FA 에이전트
    dilemma.js      딜레마 선택지
    body.js         몸의 이야기, 코치 새 구종
    locker.js       팀 동료와 라커룸
    living.js       살아 있는 세계 (옛 선수가 감독으로)
    era.js          시대 변화, 신생구단
    ceremony.js     마일스톤 세레머니, 기념구 앨범
    cards.js        서포트 카드 덱
    fanfare.js      등번호, 응원가
    fandom.js       팀별 팬심
    meme.js         밈
    sns.js          SNS·인터뷰 논란 대응
    contract.js     계약 조항·역할 약속·에이전트 성향·연봉조정 청문회
    clubhouse.js    라커룸 그룹 + 감독이 보는 점수
    analysis.js     분석실 (코스별 히트맵·구종 약점)
    gala.js         연말 시상식 수상 소감
    injury.js       부상 (부위·IL·재활 단계·재발·가을야구 진통제)
    roster.js       1군·2군 오르내리기
    slump.js        슬럼프 면담
    streak.js       연속 기록 + 루틴·징크스
    matchup.js      상대 전적 + 천적·킬러
    extension.js    비FA 다년계약·연장 계약
    compensation.js FA 보상선수
    amateur.js      고교·대학 이벤트 (혹사·최저학력제·전학·하이라이트 영상·동기 라이벌)
    phases.js       프로 시즌 4구간 (캠프·전반기·후반기·가을야구)

  flow.js           콘텐츠들을 시즌 흐름에 꽂는 곳

  ui/               화면
    effects.js      토스트, 숫자 카운트업, 빠른 진행
    talk.js         감독 면담 1대1 대화 팝업
    charts.js       선 그래프
    layout.js       PC 화면 오른쪽 피드
    backup.js       저장 파일 내보내기·불러오기 (시작 화면)
    state.js        화면 요소, 지금 키우는 선수, 저장·불러오기
    create.js       선수 만들기 화면
    player-view.js  선수 화면 (탭, 능력치, 집중 훈련, 포지션 변경)
    choice.js       선택지(메일) 화면, 고른 뒤 반응 댓글
    season-result.js 시즌 결과 탭
    board.js        반응 탭 (댓글창)
    record.js       통산 기록 탭
    phase-ui.js     4구간 시즌 진행 버튼, 스프링캠프 창
    money-tab.js    재산 탭
    hall.js         업적 도감, 명예의 전당, 은퇴 화면, 역대 랭킹
    standings-tab.js 순위표, 역대 순위 탭
    moments.js      큰 화면 알림 (시상식·드래프트·문자중계)
    meeting.js      감독 면담 화면
    main.js         버튼 연결 + 시작. 맨 마지막에 읽힘
```

## 스크립트 순서가 중요한 이유

- 모듈(import/export) 안 쓰고 `<script>` 여러 개로 읽음 → 함수·상수가 전부 전역
- 함수 안에서 다른 파일 함수 부르는 건 순서 상관없음 (실행될 땐 다 읽혀 있음)
- 근데 파일 맨 바깥에서 바로 실행되는 줄은 순서 타야 함
  - 예: `Object.assign(FAN, {...})` 는 `FAN` 만드는 data/text.js 뒤에 와야 함
  - 예: `ACHIEVEMENTS.push(...)` 는 core/achievements.js 뒤
  - 예: boxscore.js 는 clutch.js 의 `CLUTCH_OPTIONS` 에 덧붙여서 clutch.js 뒤
  - data 폴더 안에서도 schools.js 가 leagues.js 보다 먼저 (대학 팀 목록을 학교 목록에서 뽑음)
- 새 파일 넣을 땐 index.html 에서 쓰는 것들 뒤에 넣으면 됨
- `const`/`let` 은 그 줄 읽기 전엔 못 씀
  - ui/state.js 가 ui 쪽 맨 앞 (화면 요소, currentPlayer)
  - 저장된 선수 불러와서 화면 그리는 줄은 ui/main.js 맨 끝. 위에 두면 새로고침할 때 화면이 멈춤 (v0.20 버그)

## 시즌 한 번 도는 흐름

```
[시즌 진행] 버튼 (ui/main.js)
 → runSeason (core/career.js)
     국가대표 → 이벤트 → 컨디션 → sim.js 로 한 시즌 시뮬
     → 순위(standings) · 수상(awards) → 성장 → 연봉 → 기사·댓글 (media)
     → afterSeason (flow.js)
          몸·딜레마·라커룸·기록 사냥·시대 변화
          카드·등번호·응원가·세레머니
          팬심·밈·논란·고교/대학 이벤트
 → 선택지는 pushChoice (core/choices.js) 로 쌓였다가 메일로 옴
 → 고르면 resolveChoice (career.js) → 따로 빼둔 건 resolveSideChoice (flow.js)
 → 큰 화면 알림(report.bigMoments), 토스트(report.toasts)
```

## 프로 시즌 4구간

```
[🌴 스프링캠프 시작] → 캠프 창: 프로그램 1개 + 시즌 목표 3개
  startCamp (phases.js) = startSeason + 연습경기 → player.cur 에 진행 중 시즌 저장
[⚾ 전반기 진행] playFirstHalf = playPart(0~0.5) + 전반기 순위 + 월간 MVP
  → 트레이드 마감 / 역할 약속 / 라커룸 그룹 메일
[⚾ 후반기 진행] playSecondHalf = playPart(0.5~1) + 최종 순위
[🍂 가을야구] finishPhased = finishSeason (포스트시즌·시상·성장·afterSeason)
```
- 아마추어·사회복무는 runSeason 한 번에 끝남
- 시즌 중 기사는 report.news 에 쌓였다가 시즌 끝 총평 뒤에 붙음

## 구간마다 끼는 것 (flow.js)

```
beforeHalf  구간 시작: 부상(injury) + 2군 날짜(roster) + 콜업 + 슬럼프 휴식
            → ctx.partFactor = 이번 구간에 원래 리그에서 뛴 비율 (playPart 가 경기 수에 곱함)
afterHalf   구간 경기 직후: 연속 기록(streak), 슬럼프 탈출 기사
halfBreak   구간 사이 메일: (전반기 끝) 올스타 발표 → 재활 단계 → 2군 강등 / 콜업 → 슬럼프 → 연장 계약, 천적 예고, 징크스
            후반기 끝엔 부상 남아 있으면 가을야구 진통제 투혼 메일
```
- 올스타는 전반기 성적으로 뽑아 report.allStarPick 에 저장, 시즌 끝 allStar() 는 그걸로 상만 줌
- 슬럼프 메일은 실제로 못할 때만 (리그 평균 OPS·평균자책, 작년 성적이랑 비교)
- 2군·콜업 기록은 report.minorLine 에만 (통산 1군 기록이랑 안 섞임), history 엔 minor 로 남음
- 1군 등록일수: 186일 - 부상 - 말소 + 부상자 명단 30일 인정 → report.regDays (rules.js 가 FA 시즌 셀 때 씀)

## 밸런스·메일 규칙

- 타이틀 기준(career.js AWARD_LINE)은 실제 최근 리그 1위 수준. 1위 기준은 해마다 흔들림 (estimateRank)
- 큰 상(MVP·투수상·골든글러브 등)은 awards.js race(..., spread) 로 그해 경쟁자 수준이 바뀜
- 능력치가 리그 수준보다 24 넘게 높으면 효과가 다시 완만해짐 (sim.js diff)
- 곁가지 메일(life·locker·sns 등 MAIL_PRIORITY)은 한 번에 2통까지, 넘치면 덜 중요한 것부터 빠짐 (choices.js pushChoice)
- 고교·대학 이벤트 결과: 드래프트 점수 보정 player.draftAdj (-5~+5), 다음 해 출전 정지 player.amateurBan

## 화면 크기 (css 맨 아래 @media)

- 폰 (759px 이하): 한 줄 세로, 탭 5칸 2줄
- 태블릿 (760px~): 가운데 760px
- PC (1100px~): 왼쪽 메뉴 · 가운데 내용 · 오른쪽 피드 3단 (index.html 의 #side-nav · #main-col · #side-col)

## 새 기능 넣는 순서 (예: 새 시스템 `xxx.js`)

1. `js/systems/xxx.js` 만들고 시즌 끝 함수 하나 만듦: `xxxSeason(player, report)`
2. `flow.js` 의 `afterSeason` 에 한 줄 추가
3. 선택지가 있으면 `pushChoice(player, { key: "xxx", ... })` 로 보내고
   `SIDE_CHOICE_KEYS` 에 key 추가, `resolveSideChoice` 에 case 추가
4. 팬 반응 댓글은 그 파일 맨 아래에 `Object.assign(FAN, { xxx: [...] })` 로 넣고 `sidePool` 에 연결
5. `index.html` 에 `<script src="js/systems/xxx.js">` 추가 (flow.js 앞)

## 지키는 규칙

- 성장유형·숨은 특성은 화면에 절대 안 보여줌
- 실제 언론사·커뮤니티 이름 안 씀 (가상)
- 고정 데이터는 data 폴더에 처음부터 완성된 모양으로 적음. 다른 파일에서 나중에 고치지 않음
  - 기능에 딸린 문구·업적만 그 기능 파일 맨 아래에서 추가
- 랜덤 섞기는 `shuffle()` 씀. `sort(() => Math.random() - 0.5)` 는 앞쪽이 덜 섞임
- localStorage 는 `loadJSON` / `saveJSON` 으로만. 깨진 저장 데이터가 있어도 게임이 안 멈춤
- 같은 이름의 댓글 묶음(`FAN.xxx`)을 두 파일에서 만들면 뒤에 읽힌 게 앞을 덮어씀 → 이름 겹치지 않게
- 코드 모양은 Prettier 로 맞춤 (`.prettierrc`: 한 줄 160자). 손으로 줄 맞출 필요 없음

## 혼자 확인하는 법

- `index.html` 더블클릭 → 브라우저에서 바로 실행
- 문제 생기면 F12 → Console 탭에 빨간 글씨 확인
- 저장 지우기: Console 에 `localStorage.clear()`

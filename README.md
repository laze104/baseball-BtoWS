# 야구선수 키우기

야구선수 한 명을 고교부터 은퇴까지 키우는 웹 게임. 빌드 없이 `index.html`만 열면 돌아감.
저장은 브라우저 localStorage.

## 폴더 구조

```
index.html          화면 뼈대 + 스크립트 읽는 순서
css/style.css       스타일 전부
js/
  core/             게임 규칙과 데이터 (화면 없음)
    util.js         랜덤·숫자·저장 같은 공통 함수. 제일 먼저 읽힘
    data.js         팀, 리그, 고교, 이벤트, 댓글 같은 고정 데이터
    sim.js          타석 하나하나 굴리는 경기 시뮬레이션
    legacy.js       성장유형(비공개), 업적, 명예의 전당
    money.js        연봉, 계약, FA 제안, 쇼핑
    rules.js        실제 KBO·MLB 규정 (FA 일수, 포스팅, 드래프트)
    career.js       runSeason: 시즌 하나 진행하는 본체
    world.js        순위, 시상식, 숨은 특성, 감독 면담
    extra.js        부상, 월별 성적, 트레이드, FA 협상, 현역 연장
  media/            기사·댓글·중계 (성적을 글로 바꾸는 쪽)
    feed.js         기사 제목, 커뮤니티 댓글 만들기
    news.js         뉴스 탭, 기사 본문
    broadcast.js    트래킹 데이터, 신기록, 텍스트 중계
    press.js        기자회견
    saber.js        세이버 지표, 스카우트 리포트
    almanac.js      기록 연감 탭
    mail.js         메일함 + 메일 탭
  systems/          콘텐츠 시스템 (하나 = 기능 하나)
    national.js  story.js  boxscore.js  nemesis.js  agent.js
    dilemma.js  body.js  locker.js  living.js  era.js
    ceremony.js  cards.js  fanfare.js  fandom.js  meme.js  sns.js
    contract.js     계약 조항·역할 약속·에이전트 성향·연봉조정 청문회
    clubhouse.js    라커룸 그룹 + 감독이 보는 점수 (managerView)
    analysis.js     분석실 (코스별 히트맵·구종 약점)
    gala.js         연말 시상식 수상 소감
    phases.js       프로 시즌 4구간 (캠프·전반기·후반기·가을야구)
  flow.js           시스템들을 시즌 흐름에 꽂는 곳
  ui/               화면
    effects.js      토스트, 숫자 카운트업
    talk.js         감독 면담 1대1 대화 팝업 (말투·기분·관계·기억)
    charts.js       선 그래프 (홈런왕 레이스, 시즌 페이스, 커리어)
    main.js         화면 그리기, 버튼 연결, 저장/불러오기
```

## 스크립트 순서가 중요한 이유

- 모듈(import/export) 안 쓰고 `<script>` 여러 개로 읽음 → 함수·상수가 전부 전역
- 함수 안에서 다른 파일 함수 부르는 건 순서 상관없음 (실행될 땐 다 읽혀 있음)
- 근데 파일 맨 바깥에서 바로 실행되는 줄은 순서 타야 함
  - 예: `FAN.boo = [...]` 는 `FAN` 만드는 data.js 뒤에 와야 함
  - 예: `ACHIEVEMENTS.push(...)` 는 legacy.js 뒤
  - 예: boxscore.js 는 story.js 의 `CLUTCH_OPTIONS` 를 고쳐서 story.js 뒤
- 새 파일 넣을 땐 index.html 에서 쓰는 것들 뒤에 넣으면 됨

## 시즌 한 번 도는 흐름

```
[시즌 진행] 버튼 (ui/main.js)
 → runSeason (core/career.js)
     국가대표 → 이벤트 → 컨디션 → sim.js 로 한 시즌 시뮬
     → 순위·수상 → 성장 → 연봉 → 기사·댓글 (media)
     → afterSeason (flow.js)
          몸·딜레마·라커룸·기록 사냥·시대 변화
          카드·등번호·응원가·세레머니
          팬심·밈·논란
 → 선택지는 pushChoice 로 쌓였다가 메일로 옴
 → 고르면 resolveChoice (career.js) → 따로 빼둔 건 resolveSideChoice (flow.js)
 → 큰 화면 알림(report.bigMoments), 토스트(report.toasts)
```

## 프로 시즌 4구간 (v0.19)

```
[🌴 스프링캠프 시작] → 캠프 창: 프로그램 1개 + 시즌 목표 3개
  startCamp (phases.js) = startSeason + 연습경기 → player.cur 에 진행 중 시즌 저장
[⚾ 전반기 진행] playFirstHalf = playPart(0~0.5) + 전반기 순위 + 월간 MVP
  → 트레이드 마감 / 역할 약속 / 라커룸 그룹 메일
[⚾ 후반기 진행] playSecondHalf = playPart(0.5~1) + 최종 순위
[🍂 가을야구] finishPhased = finishSeason (포스트시즌·시상·성장·afterSeason)
```
- 아마추어·사회복무는 예전처럼 runSeason 한 번에 끝남
- 시즌 중 기사는 report.news 에 쌓였다가 시즌 끝 총평 뒤에 붙음

## 새 기능 넣는 순서 (예: 새 시스템 `xxx.js`)

1. `js/systems/xxx.js` 만들고 시즌 끝 함수 하나 만듦: `xxxSeason(player, report)`
2. `flow.js` 의 `afterSeason` 에 한 줄 추가
3. 선택지가 있으면 `pushChoice(player, { key: "xxx", ... })` 로 보내고
   `SIDE_CHOICE_KEYS` 에 key 추가, `resolveSideChoice` 에 case 추가
4. 팬 반응 댓글은 `FAN.xxx = [...]` 로 넣고 `sidePool` 에 연결
5. `index.html` 에 `<script src="js/systems/xxx.js">` 추가 (flow.js 앞)

## 지키는 규칙

- 성장유형·숨은 특성은 화면에 절대 안 보여줌
- 실제 언론사·커뮤니티 이름 안 씀 (가상)
- 랜덤 섞기는 `shuffle()` 씀. `sort(() => Math.random() - 0.5)` 는 앞쪽이 덜 섞임
- localStorage 는 `loadJSON` / `saveJSON` 으로만. 깨진 저장 데이터가 있어도 게임이 안 멈춤
- 같은 이름의 댓글 묶음(`FAN.xxx`)을 두 파일에서 만들면 뒤에 읽힌 게 앞을 덮어씀 → 이름 겹치지 않게
- 코드 모양은 Prettier 로 맞춤 (`.prettierrc`: 한 줄 160자). 손으로 줄 맞출 필요 없음

## 혼자 확인하는 법

- `index.html` 더블클릭 → 브라우저에서 바로 실행
- 문제 생기면 F12 → Console 탭에 빨간 글씨 확인
- 저장 지우기: Console 에 `localStorage.clear()`

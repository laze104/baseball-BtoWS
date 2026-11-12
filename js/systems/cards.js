// =============================================
// cards.js : 서포트 카드 덱 (내 주변 사람들)
// 선수 만들 때 최대 DECK_SIZE장 고름. 효과는 전부 공개
// 카드마다 이벤트 사슬(chain)이 있고 조건 맞으면 한 단계씩 진행됨
// 성장유형·숨은 특성은 카드로도 힌트 안 줌
// 카드 추가할 땐 SUPPORT_CARDS에 하나 더 넣으면 됨
// =============================================

const DECK_SIZE = 3;

// focus: 집중 훈련 보너스 (amateur: 아마추어 때만)
// chain: [{ when(player, report, card) → true면 발동, run(player, report, card) → 한 줄 }]
// 사슬 진행은 player.cardStage[카드id] = 끝난 단계 번호 배열
const SUPPORT_CARDS = [
  {
    id: "mentor",
    icon: "🧢",
    role: "은사",
    name: "고교 감독님",
    desc: "집중 훈련 능력치 성장 +0.5 (프로까지 계속)",
    focus: 0.5,
    chain: [
      {
        title: "졸업 전 특훈",
        when: (p, r) => r.league === "HS" && r.age >= 18,
        run: (p) => {
          const k = pick(p.lastFocus || Object.keys(p.stats));
          p.stats[k] = clamp(p.stats[k] + 2, 1, 99);
          return `감독님이 졸업 전 마지막 특훈을 해 줬어요 (${statLabel(k)} +2)`;
        },
      },
      {
        title: "기본기로 돌아가라",
        when: (p, r) => !isAmateur(r.league) && ((r.events.includes("슬럼프") && r.WAR < 2) || r.WAR < 0),
        run: (p) => {
          p.nextMod = (p.nextMod || 0) + 2;
          return `"기본기로 돌아가라." 고교 감독님 전화 한 통에 다음 시즌 컨디션 +2`;
        },
      },
      {
        title: "은사의 은퇴식",
        when: (p) => (p.proSeasons || 0) >= 10,
        run: (p) => {
          changeFame(p, 2);
          return `고교 감독님 은퇴식에서 시구를 맡았어요 (팬 여론 +2)`;
        },
      },
    ],
  },
  {
    id: "trainer",
    icon: "💪",
    role: "트레이너",
    name: "재활 트레이너",
    desc: "부상 확률 x0.8",
    injury: 0.8,
    chain: [
      {
        title: "재활 플랜",
        when: (p, r) => r.events.includes("부상") || r.events.includes("장기 부상"),
        run: (p) => {
          p.nextMod = (p.nextMod || 0) + 1;
          return "트레이너와 겨우내 재활 플랜을 짰어요 (다음 시즌 컨디션 +1)";
        },
      },
      {
        title: "30대의 몸 관리",
        when: (p) => p.age >= 33,
        run: (p) => {
          p.nextMod = (p.nextMod || 0) + 1;
          return `"이제부턴 회복이 실력이다." 루틴을 새로 짰어요 (다음 시즌 컨디션 +1)`;
        },
      },
    ],
  },
  {
    id: "agentFriend",
    icon: "💼",
    role: "에이전트",
    name: "에이전트 친구",
    desc: "프로에서 팬 여론 10 이상이면 시즌마다 광고 수입 (연봉의 10%)",
    chain: [
      {
        title: "첫 광고 계약",
        when: (p, r) => !isAmateur(r.league) && (p.fame || 0) >= 10,
        run: () => "에이전트 친구가 첫 광고 계약을 따 왔어요. 이제 시즌마다 광고 수입이 들어와요",
      },
      {
        title: "FA 대박 축하주",
        when: (p) => (p.faCount || 0) >= 1,
        run: (p) => {
          changeFame(p, 1);
          return 'FA 계약 날, 친구가 "우리 성공했다"며 울었어요 (팬 여론 +1)';
        },
      },
    ],
  },
  {
    id: "senior",
    icon: "🤝",
    role: "선배",
    name: "동네 선배",
    desc: "프로 첫 시즌 컨디션 +2",
    chain: [
      {
        title: "밥 먹자",
        when: (p, r) => !isAmateur(r.league) && ((r.events.includes("슬럼프") && r.WAR < 2) || r.WAR < 0.5) && (p.proSeasons || 0) >= 2,
        run: (p) => {
          p.nextMod = (p.nextMod || 0) + 2;
          return `선배가 "밥 먹자"며 불러냈어요. 털어놓고 나니 한결 가벼워짐 (다음 시즌 컨디션 +2)`;
        },
      },
      {
        title: "선배의 은퇴",
        when: (p) => (p.proSeasons || 0) >= 6,
        run: (p) => {
          changeFame(p, 1);
          return "선배가 은퇴하면서 쓰던 글러브를 물려줬어요 (팬 여론 +1)";
        },
      },
    ],
  },
  {
    id: "parent",
    icon: "👨‍👦",
    role: "부모",
    name: "야구 아빠",
    desc: "고교·대학 때만 집중 훈련 성장 +0.8 (프로 가면 효과 없음)",
    focus: 0.8,
    amateur: true,
    chain: [
      {
        title: "프로 입단 날",
        when: (p, r) => !isAmateur(p.league) && isAmateur(r.league),
        run: (p) => {
          changeFame(p, 1);
          return "프로 유니폼 입은 날, 아빠가 처음으로 울었어요 (팬 여론 +1)";
        },
      },
      { title: "아빠의 직관", when: (p, r) => r.awards.some(isBigAward), run: () => "시상식 날 객석 맨 앞줄에 아빠가 있었어요" },
    ],
  },
  {
    id: "reporter",
    icon: "🎤",
    role: "기자",
    name: "전담 기자",
    desc: "프로에서 시즌마다 팬 여론 +1",
    chain: [
      {
        title: "단독 인터뷰",
        when: (p, r) => !isAmateur(r.league) && r.WAR < 0.5 && (p.proSeasons || 0) >= 2,
        run: (p) => {
          changeFame(p, 2);
          return "부진한 해, 전담 기자가 단독 인터뷰로 속사정을 실어 줬어요 (팬 여론 +2)";
        },
      },
      { title: "커버 스토리", when: (p) => (p.fame || 0) >= 40, run: () => "전담 기자가 쓴 커버 스토리가 그해 가장 많이 읽힌 기사가 됐어요" },
    ],
  },
];

// 내 이전 선수 → 은사 카드 (역대 랭킹 WAR 15 이상, 상위 3명)
function legendCards() {
  return loadRanking()
    .filter((r) => !r.banned && r.WAR >= 15)
    .slice(0, 3)
    .map((r) => {
      const key = legendFocusKey(r);
      return {
        id: `legend-${r.name}-${r.retireYear || r.retireAge}`,
        icon: "👑",
        role: "은사",
        name: `레전드 ${r.name}`,
        legend: r,
        desc: `${legendKeyText(key)} 집중 훈련 성장 +1 (통산 WAR ${r.WAR})`,
        focusKey: key,
        focus: 1,
        chain: [
          {
            title: "너희 선배는 말이야",
            when: (p, rep) => !isAmateur(rep.league),
            run: (p) => {
              p.nextMod = (p.nextMod || 0) + 1;
              return `"${r.name} 선배는 말이야…" 레전드 얘기만 들어도 힘이 났어요 (다음 시즌 컨디션 +1)`;
            },
          },
          {
            title: "선배를 넘다",
            when: (p) => careerTotals(p).WAR > r.WAR,
            run: (p) => {
              changeFame(p, 2);
              return `통산 WAR ${r.WAR}, ${r.name}을 넘었어요. 선배가 직접 꽃다발을 들고 왔어요 (팬 여론 +2)`;
            },
          },
        ],
      };
    });
}

function legendFocusKey(r) {
  if (r.type === "pitcher") return (r.SV || 0) >= 100 ? "mental" : "control";
  if (r.type === "twoway") return "power";
  return (r.HR || 0) >= 150 ? "power" : "contact";
}

// 타자 레전드 → 투수 후배면 비슷한 능력치로 (반대도)
const LEGEND_MIRROR = { power: "stuff", contact: "control", control: "contact", mental: "clutch", stuff: "power", clutch: "mental" };

function legendKeyText(key) {
  return `${statLabel(key)}(${PITCHER_STATS[key] ? "타자는" : "투수는"} ${statLabel(LEGEND_MIRROR[key])})`;
}

function allCards() {
  return [...SUPPORT_CARDS, ...legendCards()];
}

// 저장된 덱은 카드 데이터 일부만 들고 있음 (레전드 카드는 랭킹이 바뀌어도 그대로)
function deckCards(player) {
  return (player.deck || [])
    .map((d) => {
      const base = SUPPORT_CARDS.find((c) => c.id === d.id);
      if (base) return base;
      if (d.legend) return legendCardFrom(d.legend);
      return null;
    })
    .filter(Boolean);
}

function legendCardFrom(r) {
  const fresh = legendCards().find((c) => c.legend.name === r.name);
  if (fresh) return fresh;
  // 랭킹에서 빠졌어도 덱에 넣은 카드는 계속 씀
  const key = legendFocusKey(r);
  return {
    id: `legend-${r.name}`,
    icon: "👑",
    role: "은사",
    name: `레전드 ${r.name}`,
    legend: r,
    desc: `${legendKeyText(key)} 집중 훈련 성장 +1`,
    focusKey: key,
    focus: 1,
    chain: [],
  };
}

function setDeck(player, ids) {
  const cards = allCards();
  player.deck = ids
    .slice(0, DECK_SIZE)
    .map((id) => {
      const c = cards.find((x) => x.id === id);
      if (!c) return null;
      return c.legend
        ? {
            id: c.id,
            legend: { name: c.legend.name, type: c.legend.type, WAR: c.legend.WAR, HR: c.legend.HR, SV: c.legend.SV, retireYear: c.legend.retireYear },
          }
        : { id: c.id };
    })
    .filter(Boolean);
  player.cardStage = {};
}

// ---------- 효과 연결 (career.js에서 부름) ----------

// 집중 훈련 성장 보너스 (growPlayer)
function cardFocusBonus(player, key) {
  let b = 0;
  for (const c of deckCards(player)) {
    if (!c.focus) continue;
    if (c.amateur && !isAmateur(player.league)) continue;
    if (c.focusKey && c.focusKey !== key && LEGEND_MIRROR[c.focusKey] !== key) continue;
    b += c.focus;
  }
  return b;
}

// 부상 확률 배수
function cardInjuryMul(player) {
  return deckCards(player).reduce((m, c) => m * (c.injury || 1), 1);
}

// 시즌 시작 컨디션
function cardMod(player, report) {
  let mod = 0;
  const ids = (player.deck || []).map((d) => d.id);
  if (ids.includes("senior") && !isAmateur(player.league) && !player.seniorDebutUsed) {
    player.seniorDebutUsed = true;
    mod += 2;
    report.events.push("선배 덕에 빠른 적응");
  }
  return mod;
}

// 시즌 끝: 광고 수입, 팬 여론, 이벤트 사슬
function cardSeason(player, report) {
  if (!player.deck || !player.deck.length) return;
  if (!player.cardStage) player.cardStage = {};
  report.bigMoments = report.bigMoments || [];
  const ids = player.deck.map((d) => d.id);
  const pro = !isAmateur(report.league);
  if (pro && ids.includes("reporter")) changeFame(player, 1);
  if (pro && ids.includes("agentFriend") && (player.fame || 0) >= 10 && report.salary) {
    const ad = Math.round(report.salary * 0.1);
    addMoney(player, ad);
    report.events.push(`광고 수입 ${fmtMoney(ad)}`);
  }
  // 사슬은 한 시즌에 하나만 진행 (한꺼번에 몰리면 지겨움). 순서 상관없이 조건 맞는 것부터
  for (const c of deckCards(player)) {
    const done = player.cardStage[c.id] || [];
    const i = c.chain.findIndex((s, k) => !done.includes(k) && s.when(player, report, c));
    if (i < 0) continue;
    const step = c.chain[i];
    const line = step.run(player, report, c);
    player.cardStage[c.id] = [...done, i];
    report.news.push(`[${c.role}] ${line}`);
    report.bigMoments.push({
      tone: "good",
      cls: "card-moment",
      kicker: `서포트 카드 · ${c.role} ${c.name} (${done.length + 1}/${c.chain.length})`,
      title: `${c.icon} ${step.title}`,
      lines: [line],
    });
    break;
  }
}

// ---------- 화면 ----------

// 선수 만들기 화면의 카드 고르기
function deckPickerHtml() {
  const cards = allCards();
  let html = `<div class="deck-picker"><p class="deck-head">서포트 카드 <small>최대 ${DECK_SIZE}장 · <b id="deck-count">0</b>/${DECK_SIZE}</small></p><div class="card-grid">`;
  for (const c of cards) {
    html += `<label class="s-card${c.legend ? " legend" : ""}"><input type="checkbox" name="deck" value="${c.id}">
      <span class="s-icon">${c.icon}</span><b>${c.name}</b><em>${c.role}</em><small>${c.desc}</small>
      <small class="s-chain">이벤트 ${c.chain.length}단계</small></label>`;
  }
  html += "</div>";
  if (!cards.some((c) => c.legend)) html += `<p class="small">통산 WAR 15 넘게 은퇴한 내 선수는 다음 판부터 👑 레전드 카드로 나와요.</p>`;
  return html + "</div>";
}

function pickedDeck() {
  return Array.from(document.querySelectorAll('.deck-picker input[name="deck"]:checked')).map((i) => i.value);
}

// 훈련 탭의 내 덱
function deckHtml(player) {
  const cards = deckCards(player);
  if (!cards.length) return "";
  const st = player.cardStage || {};
  return `<div class="my-deck">${cards
    .map((c) => {
      const done = (st[c.id] || []).length;
      const next = c.chain.find((s, k) => !(st[c.id] || []).includes(k));
      return `<div class="s-card mini${c.legend ? " legend" : ""}"><span class="s-icon">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small>
        <small class="s-chain">${"●".repeat(done)}${"○".repeat(c.chain.length - done)}${next ? ` 다음: ${next.title}` : c.chain.length ? " 완료" : ""}</small></div>`;
    })
    .join("")}</div>`;
}

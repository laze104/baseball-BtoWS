// =============================================
// sim.js : 경기 시뮬레이션
// 타석(또는 상대 타자) 하나하나를 능력치 기반 확률로 굴려서
// 시즌 기록을 만듦
// =============================================

// 값을 min~max 사이로 고정
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 소수점 자리 맞추기: round(0.31234, 3) → 0.312
function round(value, digits) {
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
}

// 야구식 비율 표기: 0.312 → ".312", 1.05 → "1.050"
function fmtRate(value) {
  const text = value.toFixed(3);
  return value < 1 ? text.slice(1) : text;
}

// 아웃 카운트 → 이닝 표기: 100아웃 → "33.1"
function fmtInnings(outs) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

// 능력치가 상대 수준(level)보다 얼마나 높은지 (-1 ~ +1 정도)
// 리그 수준을 한참 넘으면(8 이상) 차이가 더 크게 벌어짐: 급이 다른 선수는 압도적으로
function diff(stat, level) {
  const gap = stat - level;
  const extra = gap > 8 ? (gap - 8) * 0.7 : 0;
  return (gap + extra) / 100;
}

// ---------------------------------------------
// 리그별 경기 환경: 같은 실력이라도 리그마다 기록이 다름
// hit: 안타, hr: 홈런, k: 삼진, bb: 볼넷 배율 / ops·era: 리그 평균 (WAR 기준선)
// hold: 불펜이 홀드 상황에 나오는 비율 (NPB는 셋업맨 홀드가 많음)
// ---------------------------------------------
const LEAGUE_ENV = {
  HS:      { hit: 1.0,  hr: 0.55, k: 0.9,  bb: 1.25, ops: 0.72,  era: 4.0, hold: 0.45 , ph: 1.0 },
  COLLEGE: { hit: 1.0,  hr: 0.7,  k: 0.95, bb: 1.2,  ops: 0.73,  era: 4.4, hold: 0.45 , ph: 1.02 },
  INDIE:   { hit: 1.04, hr: 0.8,  k: 0.95, bb: 1.2,  ops: 0.75,  era: 5.2, hold: 0.45 , ph: 1.12 },
  ABL:     { hit: 1.03, hr: 0.9,  k: 1.0,  bb: 1.1,  ops: 0.74,  era: 4.8, hold: 0.45 , ph: 1.09 },
  KBO2:    { hit: 1.06, hr: 0.85, k: 0.95, bb: 1.15, ops: 0.75,  era: 5.0, hold: 0.45 , ph: 1.13 },
  SANGMU:  { hit: 1.06, hr: 0.85, k: 0.95, bb: 1.15, ops: 0.75,  era: 5.0, hold: 0.45 , ph: 1.13 },
  KBO:     { hit: 1.06, hr: 1.0,  k: 0.95, bb: 1.05, ops: 0.76,  era: 4.5, hold: 0.45 , ph: 1.05 },
  NPB:     { hit: 0.96, hr: 0.75, k: 1.08, bb: 0.95, ops: 0.66,  era: 3.2, hold: 0.6 , ph: 1.07 },
  MLB:     { hit: 0.97, hr: 1.3,  k: 1.18, bb: 0.95, ops: 0.715, era: 4.1, hold: 0.45 , ph: 1.08 },
  MILB:    { hit: 1.02, hr: 1.15, k: 1.12, bb: 1.1,  ops: 0.75,  era: 4.8, hold: 0.45 , ph: 1.1 },
};
const NEUTRAL_ENV = { hit: 1, hr: 1, k: 1, bb: 1, ops: 0.72, era: 4.4, hold: 0.45 };

// ---------------------------------------------
// 타자 시즌
// stats: 선수 능력치, level: 리그 수준, games: 출전 경기 수
// paPerGame: 경기당 타석 수, mod: 컨디션 보정 (슬럼프 -8, 각성 +8)
// ---------------------------------------------
function simBattingSeason(stats, level, games, paPerGame, mod, position, env) {
  env = env || NEUTRAL_ENV;
  const s = (key) => stats[key] + mod; // 보정이 들어간 능력치
  const L = level;

  // 타석 결과 확률
  const pK = clamp((0.20 - 0.20 * diff(s("eye"), L) - 0.10 * diff(s("contact"), L)) * env.k, 0.05, 0.42);
  const pBB = clamp((0.085 + 0.09 * diff(s("eye"), L)) * env.bb, 0.02, 0.20);
  const pHBP = 0.01;
  const pHitInPlay = clamp((0.33 + 0.18 * diff(s("contact"), L) + 0.04 * diff(s("speed"), L)) * env.hit, 0.18, 0.41);
  const pHR = clamp((0.10 + 0.32 * diff(s("power"), L)) * env.hr, 0.01, 0.42); // 안타 중 홈런 비율
  const p3B = clamp(0.015 + 0.03 * diff(s("speed"), L), 0.002, 0.06);
  const p2B = clamp(0.19 + 0.10 * diff(s("power"), L), 0.10, 0.30);
  const pScore = clamp(0.32 + 0.25 * diff(s("speed"), L), 0.2, 0.5); // 출루 후 득점 확률
  const clutchBonus = 1 + 1.5 * diff(s("clutch"), L);

  const r = { G: games, PA: 0, AB: 0, H: 0, D: 0, T: 0, HR: 0, RBI: 0, R: 0, SB: 0, BB: 0, K: 0 };
  const totalPA = Math.round(games * paPerGame);

  for (let i = 0; i < totalPA; i++) {
    r.PA++;
    const roll = Math.random();
    let onFirst = false;

    if (roll < pK) {
      r.AB++; r.K++;
    } else if (roll < pK + pBB) {
      r.BB++; onFirst = true;
    } else if (roll < pK + pBB + pHBP) {
      onFirst = true;
    } else {
      r.AB++;
      if (Math.random() < pHitInPlay) {
        r.H++;
        const t = Math.random();
        if (t < pHR) {
          r.HR++; r.R++;
          r.RBI += 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0);
        } else if (t < pHR + p3B) {
          r.T++;
          if (Math.random() < 0.75 * clutchBonus) r.RBI++;
          if (Math.random() < 0.7) r.R++;
        } else if (t < pHR + p3B + p2B) {
          r.D++;
          if (Math.random() < 0.5 * clutchBonus) r.RBI++;
          if (Math.random() < pScore + 0.15) r.R++;
        } else {
          onFirst = true;
          if (Math.random() < 0.25 * clutchBonus) r.RBI++;
        }
      }
    }

    // 1루에 나가면 도루 시도와 득점
    if (onFirst) {
      if (s("speed") > 45 && Math.random() < (s("speed") - 45) / 150) {
        if (Math.random() < clamp(0.55 + diff(s("speed"), L), 0.4, 0.92)) r.SB++;
      }
      if (Math.random() < pScore) r.R++;
    }
  }

  // 비율 기록
  const TB = r.H + r.D + 2 * r.T + 3 * r.HR; // 루타
  r.AVG = r.AB ? r.H / r.AB : 0;
  r.OBP = r.PA ? (r.H + r.BB + Math.round(r.PA * pHBP)) / r.PA : 0;
  r.SLG = r.AB ? TB / r.AB : 0;
  r.OPS = r.OBP + r.SLG;

  // 간단 WAR: 공격 기여 + 수비 기여 + 대체 선수 대비 보정
  const offense = ((r.OPS - env.ops - 0.015) * r.PA) / 4.5; // 리그 평균 OPS 기준
  // 포지션 보정: 포수·유격수처럼 어려운 수비일수록 WAR를 더 받음
  const POS_ADJ = { "포수": 8, "유격수": 6, "2루수": 3, "3루수": 2, "외야수": 0, "1루수": -6, "지명타자": -12 };
  let defense = ((stats.defense + stats.arm) / 2 + mod - L) * 0.25 * (r.PA / 600);
  if (position === "지명타자") defense = 0; // 지명타자는 수비를 안 함
  defense += (POS_ADJ[position] || 0) * (r.PA / 600);
  r.WAR = round((offense + defense + r.PA * 0.033) / 10, 1);
  return r;
}

// ---------------------------------------------
// 투수 시즌
// role: "starter"(선발) / "closer"(마무리) / "setup"(필승조·불펜)
// ---------------------------------------------
function simPitchingSeason(stats, level, role, games, mod, env) {
  env = env || NEUTRAL_ENV;
  const s = (key) => stats[key] + mod;
  const L = level;
  const relief = role === "starter" ? 0 : 1; // 불펜은 짧게 전력투구라 조금 더 강함
  const ph = env.ph || 1.12; // 투수 쪽 피안타 보정 (리그 평균자책을 맞추는 값)

  const pK = clamp((0.18 + 0.22 * diff(s("velocity"), L) + 0.08 * diff(s("stuff"), L) + 0.06 * diff(s("breaking"), L)) * env.k * (1 + relief * 0.15), 0.06, 0.45);
  const pBB = clamp((0.10 - 0.09 * diff(s("control"), L)) * env.bb, 0.02, 0.18);
  const pHitInPlay = clamp((0.34 - 0.10 * diff(s("breaking"), L) - 0.05 * diff(s("fielding"), L)) * env.hit * ph * (1 - relief * 0.13), 0.18, 0.42);
  const pHR = clamp((0.14 - 0.12 * diff(s("stuff"), L)) * env.hr * ph * (1 - relief * 0.2), 0.02, 0.3);
  const pressure = 0.3 * diff(s("mental"), L); // 주자 있을 때 멘탈 보정

  const r = { G: games, GS: 0, W: 0, L: 0, SV: 0, HLD: 0, outs: 0, H: 0, HR: 0, BB: 0, K: 0, R: 0 };

  for (let g = 0; g < games; g++) {
    // 이번 등판 목표 아웃 수
    let targetOuts;
    if (role === "starter") {
      r.GS++;
      targetOuts = clamp(Math.round((5.3 + (s("stamina") - L) / 12) * 3) + randomInt(-3, 3), 6, 27);
    } else {
      targetOuts = randomInt(2, 4);
    }

    // 이닝 진행
    let outs = 0, runs = 0;
    let bases = [false, false, false]; // 1루, 2루, 3루
    while (outs < targetOuts) {
      const runnersOn = bases[1] || bases[2];
      const p = runnersOn ? pressure : 0;
      const roll = Math.random();

      if (roll < pK + p * 0.3) {
        r.K++; outs++;
      } else if (roll < pK + pBB - p * 0.3) {
        r.BB++;
        // 밀어내기
        if (bases[0] && bases[1] && bases[2]) runs++;
        else if (bases[0] && bases[1]) bases[2] = true;
        else if (bases[0]) bases[1] = true;
        bases[0] = true;
      } else if (Math.random() < pHitInPlay - p * 0.1) {
        r.H++;
        const t = Math.random();
        const onBase = bases.filter(Boolean).length;
        if (t < pHR) {
          r.HR++; runs += onBase + 1; bases = [false, false, false];
        } else if (t < pHR + 0.2) {
          // 2루타: 2,3루 주자 득점, 1루 주자는 45% 득점 아니면 3루로
          runs += (bases[1] ? 1 : 0) + (bases[2] ? 1 : 0);
          const firstScores = bases[0] && Math.random() < 0.45;
          if (firstScores) runs++;
          bases = [false, true, bases[0] && !firstScores];
        } else {
          // 단타: 3루 주자 득점, 2루 주자 60% 득점, 1루 주자 30% 3루까지
          runs += bases[2] ? 1 : 0;
          const scoreFromSecond = bases[1] && Math.random() < 0.6;
          if (scoreFromSecond) runs++;
          const firstToThird = bases[0] && Math.random() < 0.3;
          bases = [true, bases[0] && !firstToThird, (bases[1] && !scoreFromSecond) || firstToThird];
        }
      } else if (Math.random() < 0.02) {
        // 실책으로 출루
        if (bases[2]) runs++;
        bases = [true, bases[0], bases[1]];
      } else {
        // 인플레이 아웃: 2아웃 전이면 3루 주자 50% 득점(희생플라이·땅볼), 2루 주자 40% 진루
        if (outs % 3 < 2) {
          if (bases[2] && Math.random() < 0.5) { runs++; bases[2] = false; }
          if (bases[1] && !bases[2] && Math.random() < 0.4) { bases[2] = true; bases[1] = false; }
        }
        outs++;
      }
      // 3아웃마다 주자 초기화
      if (outs > 0 && outs % 3 === 0) bases = [false, false, false];
    }

    r.outs += outs;
    r.R += runs;

    // 승패와 세이브, 홀드 (실제 야구처럼 '그 상황'을 만들어서 판정)
    if (role === "starter") {
      // 우리 팀 득점: 리그 득점 수준 근처에서 들쭉날쭉. 그중 내가 던지는 동안 낸 점수
      const teamRuns = Math.max(0, Math.round(env.era * 1.05 + (Math.random() + Math.random() + Math.random() - 1.5) * 4));
      let support = 0;
      const share = clamp(outs / 27 + 0.1, 0.3, 1);
      for (let k = 0; k < teamRuns; k++) if (Math.random() < share) support++;
      if (outs >= 15 && support > runs) {
        if (Math.random() < 0.85) r.W++; // 불펜이 가끔 승리를 날림
      } else if (runs > support && teamRuns <= runs) {
        if (Math.random() < 0.9) r.L++;  // 끝까지 못 뒤집으면 패전
      }
    } else if (role === "closer" || Math.random() < env.hold) {
      // 리드 상황 등판: 마무리는 세이브, 셋업맨은 홀드 (1~3점 차)
      const lead = [1, 1, 2, 2, 3][randomInt(0, 4)];
      const saveSpot = role !== "closer" || Math.random() < 0.65;
      if (saveSpot) {
        if (runs < lead) { if (role === "closer") r.SV++; else r.HLD++; }
        else if (runs > lead && Math.random() < 0.6) r.L++;
        else if (runs === lead && Math.random() < 0.2) r.W++; // 블론 후 타선이 뒤집어 주면 승리
      } else if (Math.random() < 0.5) {
        // 마무리가 동점 상황에 나오는 경우
        if (runs === 0 && Math.random() < 0.35) r.W++;
        else if (runs > 0 && Math.random() < 0.5) r.L++;
      }
    } else {
      // 지는 상황·동점 상황
      if (runs === 0 && Math.random() < 0.08) r.W++;
      else if (runs > 0 && Math.random() < 0.1) r.L++;
    }
  }

  const ip = r.outs / 3;
  r.ER = Math.round(r.R * 0.92); // 자책점은 실점의 92% 정도로
  r.ERA = ip ? (r.ER * 9) / ip : 0;
  r.WHIP = ip ? (r.H + r.BB) / ip : 0;
  const leverage = role === "starter" ? 1 : 1.6; // 불펜은 중요한 순간에 던짐
  // 대체 선수 평균자책 = 리그 평균의 1.25배 정도
  r.WAR = round((((env.era * 1.25 - r.ERA) * ip) / 9 / 9) * leverage, 1);
  return r;
}

// ---------------------------------------------
// 같은 시즌을 두 번 돌려서 평균 내기
// 운 요소가 절반 가까이 줄어서 능력치와 성적이 더 비례함
// ---------------------------------------------
function averageSeasons(a, b, isBat) {
  const r = { ...a };
  for (const k of Object.keys(a)) {
    if (typeof a[k] === "number" && typeof b[k] === "number") r[k] = (a[k] + b[k]) / 2;
  }
  const ints = isBat
    ? ["PA", "AB", "H", "D", "T", "HR", "RBI", "R", "SB", "BB", "K"]
    : ["W", "L", "SV", "HLD", "outs", "H", "HR", "BB", "K", "R", "ER"];
  for (const k of ints) r[k] = Math.round(r[k]);
  r.G = a.G;
  if (isBat) {
    r.AVG = r.AB ? r.H / r.AB : 0;
    r.SLG = r.AB ? (r.H + r.D + 2 * r.T + 3 * r.HR) / r.AB : 0;
    r.OPS = r.OBP + r.SLG;
  } else {
    r.GS = a.GS;
    r.ERA = r.outs ? (r.ER * 27) / r.outs : 0;
    r.WHIP = r.outs ? ((r.H + r.BB) * 3) / r.outs : 0;
  }
  r.WAR = round(r.WAR, 1);
  return r;
}

function steadyBattingSeason(...args) {
  return averageSeasons(simBattingSeason(...args), simBattingSeason(...args), true);
}

function steadyPitchingSeason(...args) {
  return averageSeasons(simPitchingSeason(...args), simPitchingSeason(...args), false);
}

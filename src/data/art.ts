/**
 * 유닛별 아트 에셋 레지스트리 — public/sprites/ 아래 파일을 참조한다.
 * 등록된 유닛은 단색 사각형 대신 스프라이트로 표시되고,
 * bust는 유닛 정보 패널·도감에 쓰인다.
 * 에셋이 없는 유닛은 기존 generateTexture 방식으로 폴백.
 */
export interface UnitArt {
  /** 아트 생성/연출 기준: 공중 유닛은 기본 원거리 */
  bodyType: UnitBodyType;
  /** 아트 생성/연출 기준: 원거리=투척/사격, 근거리=스윙/찌르기/도약 */
  attackType: UnitAttackType;
  /** 정보 패널용 상반신 (DOM <img> 경로) */
  bust?: string;
  /** 공격 모션 스프라이트 시트 (가로 1행, 프레임 0 = 대기) */
  attack?: {
    url: string;
    frameW: number;
    frameH: number;
    frames: number;
    rate: number; // fps
  };
  /** 공격 스킬/패시브 발동 이펙트 시트 — 현재 스킬 로직 미구현, 선로드/선등록용 */
  skillAttack?: {
    url: string;
    frameW: number;
    frameH: number;
    frames: number;
    rate: number;
  };
  passive?: {
    url: string;
    frameW: number;
    frameH: number;
    frames: number;
    rate: number;
  };
  /** 이동 모션 스프라이트 시트 — front=아래, back=위, side=오른쪽(왼쪽은 미러) */
  walk?: {
    front: string;
    back: string;
    side: string;
    frameW: number;
    frameH: number;
    frames: number;
    rate: number;
  };
}

export type UnitBodyType = "ground" | "air";
export type UnitAttackType = "melee" | "ranged";

export interface UnitArtProfile {
  bodyType: UnitBodyType;
  attackType: UnitAttackType;
  attackMotion: string;
}

/**
 * docs/characters 기준 아트 프로필.
 * 공중 유닛은 원거리 공격을 기본값으로 둔다.
 */
export const UNIT_ART_PROFILE: Record<string, UnitArtProfile> = {
  dv1: { bodyType: "ground", attackType: "ranged", attackMotion: "포장 음식 정밀 투척" },
  pc1: { bodyType: "ground", attackType: "ranged", attackMotion: "떨리는 손의 테이저 사격" },
  sn1: { bodyType: "ground", attackType: "ranged", attackMotion: "Y자 새총 조준 사격" },
  dr1: { bodyType: "air", attackType: "ranged", attackMotion: "드론 상공 사출" },
  dm1: { bodyType: "ground", attackType: "melee", attackMotion: "큰 망치 내려찍기" },
  tf1: { bodyType: "ground", attackType: "melee", attackMotion: "집게 찌르기와 빗자루 스윙" },
  dv2: { bodyType: "ground", attackType: "ranged", attackMotion: "잔상이 남는 초고속 투척" },
  pc2: { bodyType: "ground", attackType: "ranged", attackMotion: "테이저 정조준 사격" },
  sn2: { bodyType: "ground", attackType: "ranged", attackMotion: "공기총 스코프 사격" },
  dr2: { bodyType: "air", attackType: "ranged", attackMotion: "중형 드론 사출" },
  dm2: { bodyType: "ground", attackType: "melee", attackMotion: "대형 해머 풀스윙" },
  tf2: { bodyType: "ground", attackType: "ranged", attackMotion: "야광봉 수신호" },
  dv3: { bodyType: "ground", attackType: "ranged", attackMotion: "콜 배정과 동시에 투척" },
  pc3: { bodyType: "ground", attackType: "ranged", attackMotion: "고무탄 사격" },
  sn3: { bodyType: "ground", attackType: "ranged", attackMotion: "대형 저격총 사격" },
  dr3: { bodyType: "air", attackType: "ranged", attackMotion: "헬기 상공 광역 사격" },
  dm3: { bodyType: "ground", attackType: "melee", attackMotion: "폭약 설치 후 기폭" },
  tf3: { bodyType: "ground", attackType: "melee", attackMotion: "방패 밀치기" },
  fl1: { bodyType: "ground", attackType: "ranged", attackMotion: "전단지 표창 투척" },
  fb1: { bodyType: "ground", attackType: "ranged", attackMotion: "갓 구운 붕어빵 투척" },
  hp1: { bodyType: "air", attackType: "ranged", attackMotion: "비둘기 떼 파견 쪼기" },
  hc1: { bodyType: "ground", attackType: "melee", attackMotion: "그림자 도약 암습" },
};

export const UNIT_ART: Record<string, UnitArt> = {
  dv1: {
    ...UNIT_ART_PROFILE.dv1,
    bust: "/sprites/dv1_bust.png",
    attack: {
      url: "/sprites/dv1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/dv1_walk_front_sheet.png",
      back: "/sprites/dv1_walk_back_sheet.png",
      side: "/sprites/dv1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  pc1: {
    ...UNIT_ART_PROFILE.pc1,
    bust: "/sprites/pc1_bust.png",
    attack: {
      url: "/sprites/pc1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/pc1_walk_front_sheet.png",
      back: "/sprites/pc1_walk_back_sheet.png",
      side: "/sprites/pc1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  sn1: {
    ...UNIT_ART_PROFILE.sn1,
    bust: "/sprites/sn1_bust.png",
    attack: {
      url: "/sprites/sn1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
    walk: {
      front: "/sprites/sn1_walk_front_sheet.png",
      back: "/sprites/sn1_walk_back_sheet.png",
      side: "/sprites/sn1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  dr1: {
    ...UNIT_ART_PROFILE.dr1,
    bust: "/sprites/dr1_bust.png",
    attack: {
      url: "/sprites/dr1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/dr1_walk_front_sheet.png",
      back: "/sprites/dr1_walk_back_sheet.png",
      side: "/sprites/dr1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  dm1: {
    ...UNIT_ART_PROFILE.dm1,
    bust: "/sprites/dm1_bust.png",
    attack: {
      url: "/sprites/dm1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/dm1_walk_front_sheet.png",
      back: "/sprites/dm1_walk_back_sheet.png",
      side: "/sprites/dm1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
  },
  tf1: {
    ...UNIT_ART_PROFILE.tf1,
    bust: "/sprites/tf1_bust.png",
    attack: {
      url: "/sprites/tf1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/tf1_walk_front_sheet.png",
      back: "/sprites/tf1_walk_back_sheet.png",
      side: "/sprites/tf1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 9,
    },
  },
  dv2: {
    ...UNIT_ART_PROFILE.dv2,
    bust: "/sprites/dv2_bust.png",
    attack: {
      url: "/sprites/dv2_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 14,
    },
    walk: {
      front: "/sprites/dv2_walk_front_sheet.png",
      back: "/sprites/dv2_walk_back_sheet.png",
      side: "/sprites/dv2_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
  },
  pc2: {
    ...UNIT_ART_PROFILE.pc2,
    bust: "/sprites/pc2_bust.png",
    attack: {
      url: "/sprites/pc2_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/pc2_walk_front_sheet.png",
      back: "/sprites/pc2_walk_back_sheet.png",
      side: "/sprites/pc2_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  sn2: {
    ...UNIT_ART_PROFILE.sn2,
    bust: "/sprites/sn2_bust.png",
    attack: {
      url: "/sprites/sn2_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
    walk: {
      front: "/sprites/sn2_walk_front_sheet.png",
      back: "/sprites/sn2_walk_back_sheet.png",
      side: "/sprites/sn2_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 9,
    },
  },
  dr2: {
    ...UNIT_ART_PROFILE.dr2,
    bust: "/sprites/dr2_bust.png",
    attack: {
      url: "/sprites/dr2_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/dr2_walk_front_sheet.png",
      back: "/sprites/dr2_walk_back_sheet.png",
      side: "/sprites/dr2_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  dm2: {
    ...UNIT_ART_PROFILE.dm2,
    bust: "/sprites/dm2_bust.png",
    attack: {
      url: "/sprites/dm2_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/dm2_walk_front_sheet.png",
      back: "/sprites/dm2_walk_back_sheet.png",
      side: "/sprites/dm2_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
  },
  tf2: {
    ...UNIT_ART_PROFILE.tf2,
    bust: "/sprites/tf2_bust.png",
    attack: {
      url: "/sprites/tf2_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/tf2_walk_front_sheet.png",
      back: "/sprites/tf2_walk_back_sheet.png",
      side: "/sprites/tf2_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  dv3: {
    ...UNIT_ART_PROFILE.dv3,
    bust: "/sprites/dv3_bust.png",
    attack: {
      url: "/sprites/dv3_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    skillAttack: {
      url: "/sprites/dv3_skill_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/dv3_walk_front_sheet.png",
      back: "/sprites/dv3_walk_back_sheet.png",
      side: "/sprites/dv3_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  pc3: {
    ...UNIT_ART_PROFILE.pc3,
    bust: "/sprites/pc3_bust.png",
    attack: {
      url: "/sprites/pc3_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 11,
    },
    skillAttack: {
      url: "/sprites/pc3_skill_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    passive: {
      url: "/sprites/pc3_passive_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/pc3_walk_front_sheet.png",
      back: "/sprites/pc3_walk_back_sheet.png",
      side: "/sprites/pc3_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 9,
    },
  },
  sn3: {
    ...UNIT_ART_PROFILE.sn3,
    bust: "/sprites/sn3_bust.png",
    attack: {
      url: "/sprites/sn3_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    skillAttack: {
      url: "/sprites/sn3_skill_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    passive: {
      url: "/sprites/sn3_passive_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/sn3_walk_front_sheet.png",
      back: "/sprites/sn3_walk_back_sheet.png",
      side: "/sprites/sn3_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
  },
  dr3: {
    ...UNIT_ART_PROFILE.dr3,
    bust: "/sprites/dr3_bust.png",
    attack: {
      url: "/sprites/dr3_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
    skillAttack: {
      url: "/sprites/dr3_skill_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    passive: {
      url: "/sprites/dr3_passive_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/dr3_walk_front_sheet.png",
      back: "/sprites/dr3_walk_back_sheet.png",
      side: "/sprites/dr3_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  dm3: {
    ...UNIT_ART_PROFILE.dm3,
    bust: "/sprites/dm3_bust.png",
    attack: {
      url: "/sprites/dm3_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    skillAttack: {
      url: "/sprites/dm3_skill_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    passive: {
      url: "/sprites/dm3_passive_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/dm3_walk_front_sheet.png",
      back: "/sprites/dm3_walk_back_sheet.png",
      side: "/sprites/dm3_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 7,
    },
  },
  tf3: {
    ...UNIT_ART_PROFILE.tf3,
    bust: "/sprites/tf3_bust.png",
    attack: {
      url: "/sprites/tf3_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
    skillAttack: {
      url: "/sprites/tf3_skill_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    passive: {
      url: "/sprites/tf3_passive_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
    walk: {
      front: "/sprites/tf3_walk_front_sheet.png",
      back: "/sprites/tf3_walk_back_sheet.png",
      side: "/sprites/tf3_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 8,
    },
  },
  fl1: {
    ...UNIT_ART_PROFILE.fl1,
    bust: "/sprites/fl1_bust.png",
    attack: {
      url: "/sprites/fl1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/fl1_walk_front_sheet.png",
      back: "/sprites/fl1_walk_back_sheet.png",
      side: "/sprites/fl1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
  },
  fb1: {
    ...UNIT_ART_PROFILE.fb1,
    bust: "/sprites/fb1_bust.png",
    attack: {
      url: "/sprites/fb1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 10,
    },
    walk: {
      front: "/sprites/fb1_walk_front_sheet.png",
      back: "/sprites/fb1_walk_back_sheet.png",
      side: "/sprites/fb1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 9,
    },
  },
  hp1: {
    ...UNIT_ART_PROFILE.hp1,
    bust: "/sprites/hp1_bust.png",
    attack: {
      url: "/sprites/hp1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/hp1_walk_front_sheet.png",
      back: "/sprites/hp1_walk_back_sheet.png",
      side: "/sprites/hp1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
  },
  hc1: {
    ...UNIT_ART_PROFILE.hc1,
    bust: "/sprites/hc1_bust.png",
    attack: {
      url: "/sprites/hc1_attack_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/hc1_walk_front_sheet.png",
      back: "/sprites/hc1_walk_back_sheet.png",
      side: "/sprites/hc1_walk_side_sheet.png",
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: 12,
    },
  },
};

/** Phaser 텍스처/애니메이션 키 */
export function attackKey(unitId: string): string {
  return `${unitId}_attack`;
}

export function skillAttackKey(unitId: string): string {
  return `${unitId}_skill_attack`;
}

export function passiveKey(unitId: string): string {
  return `${unitId}_passive`;
}

export type WalkDir = "front" | "back" | "side";
export const WALK_DIRS: WalkDir[] = ["front", "back", "side"];

export function walkKey(unitId: string, dir: WalkDir): string {
  return `${unitId}_walk_${dir}`;
}

/**
 * 버스트 <img> HTML — DOM UI 공통 (정보 패널·조합법·덱 선택·도감).
 * 에셋 미등록이면 null (호출부가 폴백 담당), 파일 누락이면 자동 숨김.
 */
export function bustHtml(unitId: string, height: number): string | null {
  const bust = UNIT_ART[unitId]?.bust;
  if (!bust) return null;
  return `<img src="${bust}" alt="" draggable="false" onerror="this.style.display='none'"
    style="height:${height}px;image-rendering:pixelated;vertical-align:middle">`;
}

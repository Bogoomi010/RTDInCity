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
  fl1: { bodyType: "ground", attackType: "ranged", attackMotion: "전단지 표창 투척" },
  fb1: { bodyType: "ground", attackType: "ranged", attackMotion: "갓 구운 붕어빵 투척" },
  hp1: { bodyType: "air", attackType: "ranged", attackMotion: "비둘기 떼 파견 쪼기" },
  hc1: { bodyType: "ground", attackType: "melee", attackMotion: "그림자 도약 암습" },
};

const GENERATED_COMMON_RUNTIME = "/assets/generated/common-runtime";

function generatedCommonArt(
  id: string,
  attackRate: number,
  walkRate: number
): UnitArt {
  const base = `${GENERATED_COMMON_RUNTIME}/${id}`;
  return {
    ...UNIT_ART_PROFILE[id],
    bust: `${base}_bust.png`,
    attack: {
      url: `${base}_attack_sheet.png`,
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: attackRate,
    },
    walk: {
      front: `${base}_walk_front_sheet.png`,
      back: `${base}_walk_back_sheet.png`,
      side: `${base}_walk_side_sheet.png`,
      frameW: 144,
      frameH: 144,
      frames: 4,
      rate: walkRate,
    },
  };
}

export const UNIT_ART: Record<string, UnitArt> = {
  dv1: generatedCommonArt("dv1", 12, 10),
  pc1: generatedCommonArt("pc1", 12, 10),
  sn1: generatedCommonArt("sn1", 10, 10),
  dr1: generatedCommonArt("dr1", 12, 10),
  dm1: generatedCommonArt("dm1", 8, 8),
  tf1: generatedCommonArt("tf1", 8, 9),
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
  fl1: generatedCommonArt("fl1", 12, 10),
  fb1: generatedCommonArt("fb1", 10, 9),
  hp1: generatedCommonArt("hp1", 12, 12),
  hc1: generatedCommonArt("hc1", 12, 12),
};

/** Phaser 텍스처/애니메이션 키 */
export function attackKey(unitId: string): string {
  return `${unitId}_attack`;
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

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
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/dv1_walk_front_sheet.png",
      back: "/sprites/dv1_walk_back_sheet.png",
      side: "/sprites/dv1_walk_side_sheet.png",
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 10,
    },
  },
  pc1: {
    ...UNIT_ART_PROFILE.pc1,
    bust: "/sprites/pc1_bust.png",
    attack: {
      url: "/sprites/pc1_attack_sheet.png",
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/pc1_walk_front_sheet.png",
      back: "/sprites/pc1_walk_back_sheet.png",
      side: "/sprites/pc1_walk_side_sheet.png",
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 10,
    },
  },
  sn1: {
    ...UNIT_ART_PROFILE.sn1,
    bust: "/sprites/sn1_bust.png",
    attack: {
      url: "/sprites/sn1_attack_sheet.png",
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 10,
    },
    walk: {
      front: "/sprites/sn1_walk_front_sheet.png",
      back: "/sprites/sn1_walk_back_sheet.png",
      side: "/sprites/sn1_walk_side_sheet.png",
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 10,
    },
  },
  fl1: {
    ...UNIT_ART_PROFILE.fl1,
    bust: "/sprites/fl1_bust.png",
    attack: {
      url: "/sprites/fl1_attack_sheet.png",
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 12,
    },
    walk: {
      front: "/sprites/fl1_walk_front_sheet.png",
      back: "/sprites/fl1_walk_back_sheet.png",
      side: "/sprites/fl1_walk_side_sheet.png",
      frameW: 540,
      frameH: 540,
      frames: 4,
      rate: 10,
    },
  },
};

/** Phaser 텍스처/애니메이션 키 */
export function attackKey(unitId: string): string {
  return `${unitId}_attack`;
}

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
  /** 작은 위젯에서 원본 버스트를 과도하게 축소하지 않도록 만든 전용 에셋 */
  ui?: {
    avatar: string;
    portrait: string;
  };
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
  dv4: { bodyType: "ground", attackType: "ranged", attackMotion: "택배 상자 정밀 투척" },
  pc4: { bodyType: "ground", attackType: "ranged", attackMotion: "지휘 사격" },
  sn4: { bodyType: "ground", attackType: "ranged", attackMotion: "전자기 가속 저격" },
  dr4: { bodyType: "air", attackType: "ranged", attackMotion: "해킹 드론 전파 공격" },
  dm4: { bodyType: "ground", attackType: "melee", attackMotion: "소리 없는 구조물 폭파" },
  tf4: { bodyType: "ground", attackType: "ranged", attackMotion: "빛나는 결재 도장" },
  dv5: { bodyType: "ground", attackType: "ranged", attackMotion: "결재 서류 초음속 투척" },
  pc5: { bodyType: "ground", attackType: "ranged", attackMotion: "지휘봉 일제 사격" },
  sn5: { bodyType: "ground", attackType: "ranged", attackMotion: "기록되지 않는 초장거리 저격" },
  dr5: { bodyType: "air", attackType: "ranged", attackMotion: "드론 편대 광역 폭격" },
  dm5: { bodyType: "ground", attackType: "melee", attackMotion: "철거 크레인볼 스윙" },
  tf5: { bodyType: "ground", attackType: "ranged", attackMotion: "연설 충격파" },
  t1: { bodyType: "ground", attackType: "ranged", attackMotion: "응축 에너지 펀치 충격파" },
  t2: { bodyType: "ground", attackType: "melee", attackMotion: "크레인 팔 광역 스윙" },
  t3: { bodyType: "air", attackType: "ranged", attackMotion: "데이터 스파이크 관통" },
  t4: { bodyType: "air", attackType: "ranged", attackMotion: "먹구름 번개 다발" },
  t5: { bodyType: "air", attackType: "ranged", attackMotion: "포드 융단 폭격" },
  t6: { bodyType: "ground", attackType: "ranged", attackMotion: "황금 호루라기 도시 권능" },
  fl1: { bodyType: "ground", attackType: "ranged", attackMotion: "전단지 표창 투척" },
  fb1: { bodyType: "ground", attackType: "ranged", attackMotion: "갓 구운 붕어빵 투척" },
  hp1: { bodyType: "air", attackType: "ranged", attackMotion: "비둘기 떼 파견 쪼기" },
  hc1: { bodyType: "ground", attackType: "melee", attackMotion: "그림자 도약 암습" },
};

export const UNIT_ART: Record<string, UnitArt> = {
  dv1: {
    ...UNIT_ART_PROFILE.dv1,
    bust: "/sprites/common/dv1_bust.png",
    ui: {
      avatar: "/sprites/common/ui/dv1_avatar_48.png",
      portrait: "/sprites/common/ui/dv1_portrait_128.png",
    },
    attack: {
      url: "/sprites/common/dv1_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/common/dv1_walk_front_sheet.png",
      back: "/sprites/common/dv1_walk_back_sheet.png",
      side: "/sprites/common/dv1_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  pc1: {
    ...UNIT_ART_PROFILE.pc1,
    bust: "/sprites/common/pc1_bust.png",
    ui: {
      avatar: "/sprites/common/ui/pc1_avatar_48.png",
      portrait: "/sprites/common/ui/pc1_portrait_128.png",
    },
    attack: {
      url: "/sprites/common/pc1_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/common/pc1_walk_front_sheet.png",
      back: "/sprites/common/pc1_walk_back_sheet.png",
      side: "/sprites/common/pc1_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  sn1: {
    ...UNIT_ART_PROFILE.sn1,
    bust: "/sprites/common/sn1_bust.png",
    ui: {
      avatar: "/sprites/common/ui/sn1_avatar_48.png",
      portrait: "/sprites/common/ui/sn1_portrait_128.png",
    },
    attack: {
      url: "/sprites/common/sn1_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
    walk: {
      front: "/sprites/common/sn1_walk_front_sheet.png",
      back: "/sprites/common/sn1_walk_back_sheet.png",
      side: "/sprites/common/sn1_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  dr1: {
    ...UNIT_ART_PROFILE.dr1,
    bust: "/sprites/common/dr1_bust.png",
    ui: {
      avatar: "/sprites/common/ui/dr1_avatar_48.png",
      portrait: "/sprites/common/ui/dr1_portrait_128.png",
    },
    attack: {
      url: "/sprites/common/dr1_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/common/dr1_walk_front_sheet.png",
      back: "/sprites/common/dr1_walk_back_sheet.png",
      side: "/sprites/common/dr1_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  dm1: {
    ...UNIT_ART_PROFILE.dm1,
    bust: "/sprites/common/dm1_bust.png",
    ui: {
      avatar: "/sprites/common/ui/dm1_avatar_48.png",
      portrait: "/sprites/common/ui/dm1_portrait_128.png",
    },
    attack: {
      url: "/sprites/common/dm1_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
    walk: {
      front: "/sprites/common/dm1_walk_front_sheet.png",
      back: "/sprites/common/dm1_walk_back_sheet.png",
      side: "/sprites/common/dm1_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
  },
  tf1: {
    ...UNIT_ART_PROFILE.tf1,
    bust: "/sprites/common/tf1_bust.png",
    ui: {
      avatar: "/sprites/common/ui/tf1_avatar_48.png",
      portrait: "/sprites/common/ui/tf1_portrait_128.png",
    },
    attack: {
      url: "/sprites/common/tf1_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
    walk: {
      front: "/sprites/common/tf1_walk_front_sheet.png",
      back: "/sprites/common/tf1_walk_back_sheet.png",
      side: "/sprites/common/tf1_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
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
  dv4: {
    ...UNIT_ART_PROFILE.dv4,
    bust: "/sprites/rare/dv4_bust.png",
    ui: {
      avatar: "/sprites/rare/ui/dv4_avatar_48.png",
      portrait: "/sprites/rare/ui/dv4_portrait_128.png",
    },
    attack: {
      url: "/sprites/rare/dv4_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/rare/dv4_walk_front_sheet.png",
      back: "/sprites/rare/dv4_walk_back_sheet.png",
      side: "/sprites/rare/dv4_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  pc4: {
    ...UNIT_ART_PROFILE.pc4,
    bust: "/sprites/rare/pc4_bust.png",
    ui: {
      avatar: "/sprites/rare/ui/pc4_avatar_48.png",
      portrait: "/sprites/rare/ui/pc4_portrait_128.png",
    },
    attack: {
      url: "/sprites/rare/pc4_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 11,
    },
    walk: {
      front: "/sprites/rare/pc4_walk_front_sheet.png",
      back: "/sprites/rare/pc4_walk_back_sheet.png",
      side: "/sprites/rare/pc4_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 9,
    },
  },
  sn4: {
    ...UNIT_ART_PROFILE.sn4,
    bust: "/sprites/rare/sn4_bust.png",
    ui: {
      avatar: "/sprites/rare/ui/sn4_avatar_48.png",
      portrait: "/sprites/rare/ui/sn4_portrait_128.png",
    },
    attack: {
      url: "/sprites/rare/sn4_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 9,
    },
    walk: {
      front: "/sprites/rare/sn4_walk_front_sheet.png",
      back: "/sprites/rare/sn4_walk_back_sheet.png",
      side: "/sprites/rare/sn4_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
  },
  dr4: {
    ...UNIT_ART_PROFILE.dr4,
    bust: "/sprites/rare/dr4_bust.png",
    ui: {
      avatar: "/sprites/rare/ui/dr4_avatar_48.png",
      portrait: "/sprites/rare/ui/dr4_portrait_128.png",
    },
    attack: {
      url: "/sprites/rare/dr4_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/rare/dr4_walk_front_sheet.png",
      back: "/sprites/rare/dr4_walk_back_sheet.png",
      side: "/sprites/rare/dr4_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  dm4: {
    ...UNIT_ART_PROFILE.dm4,
    bust: "/sprites/rare/dm4_bust.png",
    ui: {
      avatar: "/sprites/rare/ui/dm4_avatar_48.png",
      portrait: "/sprites/rare/ui/dm4_portrait_128.png",
    },
    attack: {
      url: "/sprites/rare/dm4_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 9,
    },
    walk: {
      front: "/sprites/rare/dm4_walk_front_sheet.png",
      back: "/sprites/rare/dm4_walk_back_sheet.png",
      side: "/sprites/rare/dm4_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
  },
  tf4: {
    ...UNIT_ART_PROFILE.tf4,
    bust: "/sprites/rare/tf4_bust.png",
    ui: {
      avatar: "/sprites/rare/ui/tf4_avatar_48.png",
      portrait: "/sprites/rare/ui/tf4_portrait_128.png",
    },
    attack: {
      url: "/sprites/rare/tf4_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
    walk: {
      front: "/sprites/rare/tf4_walk_front_sheet.png",
      back: "/sprites/rare/tf4_walk_back_sheet.png",
      side: "/sprites/rare/tf4_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 9,
    },
  },
  dv5: {
    ...UNIT_ART_PROFILE.dv5,
    bust: "/sprites/legendary/dv5_bust.png",
    ui: {
      avatar: "/sprites/legendary/ui/dv5_avatar_48.png",
      portrait: "/sprites/legendary/ui/dv5_portrait_128.png",
    },
    attack: {
      url: "/sprites/legendary/dv5_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 14,
    },
    walk: {
      front: "/sprites/legendary/dv5_walk_front_sheet.png",
      back: "/sprites/legendary/dv5_walk_back_sheet.png",
      side: "/sprites/legendary/dv5_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
  },
  pc5: {
    ...UNIT_ART_PROFILE.pc5,
    bust: "/sprites/legendary/pc5_bust.png",
    ui: {
      avatar: "/sprites/legendary/ui/pc5_avatar_48.png",
      portrait: "/sprites/legendary/ui/pc5_portrait_128.png",
    },
    attack: {
      url: "/sprites/legendary/pc5_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
    walk: {
      front: "/sprites/legendary/pc5_walk_front_sheet.png",
      back: "/sprites/legendary/pc5_walk_back_sheet.png",
      side: "/sprites/legendary/pc5_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
  },
  sn5: {
    ...UNIT_ART_PROFILE.sn5,
    bust: "/sprites/legendary/sn5_bust.png",
    ui: {
      avatar: "/sprites/legendary/ui/sn5_avatar_48.png",
      portrait: "/sprites/legendary/ui/sn5_portrait_128.png",
    },
    attack: {
      url: "/sprites/legendary/sn5_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
    walk: {
      front: "/sprites/legendary/sn5_walk_front_sheet.png",
      back: "/sprites/legendary/sn5_walk_back_sheet.png",
      side: "/sprites/legendary/sn5_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
  },
  dr5: {
    ...UNIT_ART_PROFILE.dr5,
    bust: "/sprites/legendary/dr5_bust.png",
    ui: {
      avatar: "/sprites/legendary/ui/dr5_avatar_48.png",
      portrait: "/sprites/legendary/ui/dr5_portrait_128.png",
    },
    attack: {
      url: "/sprites/legendary/dr5_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/legendary/dr5_walk_front_sheet.png",
      back: "/sprites/legendary/dr5_walk_back_sheet.png",
      side: "/sprites/legendary/dr5_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  dm5: {
    ...UNIT_ART_PROFILE.dm5,
    bust: "/sprites/legendary/dm5_bust.png",
    ui: {
      avatar: "/sprites/legendary/ui/dm5_avatar_48.png",
      portrait: "/sprites/legendary/ui/dm5_portrait_128.png",
    },
    attack: {
      url: "/sprites/legendary/dm5_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
    walk: {
      front: "/sprites/legendary/dm5_walk_front_sheet.png",
      back: "/sprites/legendary/dm5_walk_back_sheet.png",
      side: "/sprites/legendary/dm5_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
  },
  tf5: {
    ...UNIT_ART_PROFILE.tf5,
    bust: "/sprites/legendary/tf5_bust.png",
    ui: {
      avatar: "/sprites/legendary/ui/tf5_avatar_48.png",
      portrait: "/sprites/legendary/ui/tf5_portrait_128.png",
    },
    attack: {
      url: "/sprites/legendary/tf5_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
    walk: {
      front: "/sprites/legendary/tf5_walk_front_sheet.png",
      back: "/sprites/legendary/tf5_walk_back_sheet.png",
      side: "/sprites/legendary/tf5_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 9,
    },
  },
  t1: {
    ...UNIT_ART_PROFILE.t1,
    bust: "/sprites/transcendent/t1_bust.png",
    ui: {
      avatar: "/sprites/transcendent/ui/t1_avatar_48.png",
      portrait: "/sprites/transcendent/ui/t1_portrait_128.png",
    },
    attack: {
      url: "/sprites/transcendent/t1_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/transcendent/t1_walk_front_sheet.png",
      back: "/sprites/transcendent/t1_walk_back_sheet.png",
      side: "/sprites/transcendent/t1_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
  },
  t2: {
    ...UNIT_ART_PROFILE.t2,
    bust: "/sprites/transcendent/t2_bust.png",
    ui: {
      avatar: "/sprites/transcendent/ui/t2_avatar_48.png",
      portrait: "/sprites/transcendent/ui/t2_portrait_128.png",
    },
    attack: {
      url: "/sprites/transcendent/t2_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
    walk: {
      front: "/sprites/transcendent/t2_walk_front_sheet.png",
      back: "/sprites/transcendent/t2_walk_back_sheet.png",
      side: "/sprites/transcendent/t2_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 8,
    },
  },
  t3: {
    ...UNIT_ART_PROFILE.t3,
    bust: "/sprites/transcendent/t3_bust.png",
    ui: {
      avatar: "/sprites/transcendent/ui/t3_avatar_48.png",
      portrait: "/sprites/transcendent/ui/t3_portrait_128.png",
    },
    attack: {
      url: "/sprites/transcendent/t3_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 14,
    },
    walk: {
      front: "/sprites/transcendent/t3_walk_front_sheet.png",
      back: "/sprites/transcendent/t3_walk_back_sheet.png",
      side: "/sprites/transcendent/t3_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  t4: {
    ...UNIT_ART_PROFILE.t4,
    bust: "/sprites/transcendent/t4_bust.png",
    ui: {
      avatar: "/sprites/transcendent/ui/t4_avatar_48.png",
      portrait: "/sprites/transcendent/ui/t4_portrait_128.png",
    },
    attack: {
      url: "/sprites/transcendent/t4_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 14,
    },
    walk: {
      front: "/sprites/transcendent/t4_walk_front_sheet.png",
      back: "/sprites/transcendent/t4_walk_back_sheet.png",
      side: "/sprites/transcendent/t4_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 10,
    },
  },
  t5: {
    ...UNIT_ART_PROFILE.t5,
    bust: "/sprites/transcendent/t5_bust.png",
    ui: {
      avatar: "/sprites/transcendent/ui/t5_avatar_48.png",
      portrait: "/sprites/transcendent/ui/t5_portrait_128.png",
    },
    attack: {
      url: "/sprites/transcendent/t5_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 16,
    },
    walk: {
      front: "/sprites/transcendent/t5_walk_front_sheet.png",
      back: "/sprites/transcendent/t5_walk_back_sheet.png",
      side: "/sprites/transcendent/t5_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
  },
  t6: {
    ...UNIT_ART_PROFILE.t6,
    bust: "/sprites/transcendent/t6_bust.png",
    ui: {
      avatar: "/sprites/transcendent/ui/t6_avatar_48.png",
      portrait: "/sprites/transcendent/ui/t6_portrait_128.png",
    },
    attack: {
      url: "/sprites/transcendent/t6_attack_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 12,
    },
    walk: {
      front: "/sprites/transcendent/t6_walk_front_sheet.png",
      back: "/sprites/transcendent/t6_walk_back_sheet.png",
      side: "/sprites/transcendent/t6_walk_side_sheet.png",
      frameW: 256,
      frameH: 256,
      frames: 8,
      rate: 9,
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
  const art = UNIT_ART[unitId];
  const bust =
    height <= 48 ? art?.ui?.avatar ?? art?.bust :
    height <= 128 ? art?.ui?.portrait ?? art?.bust : art?.bust;
  if (!bust) return null;
  return `<img src="${bust}" alt="" draggable="false" loading="lazy" onerror="this.style.display='none'"
    style="height:${height}px;image-rendering:pixelated;vertical-align:middle">`;
}

/**
 * 스킬 데이터 정합성 자가 검증 (GDD 1.7)
 * 실행: node --experimental-strip-types scripts/skills-check.ts
 * 규칙이 깨지면 assert로 즉시 실패한다 — 스킬/유닛 데이터 변경 시 시뮬과 함께 돌린다.
 */
import assert from "node:assert";
import { SKILLS, activeSkill, skillDpsMul } from "../src/data/skills.ts";
import { UNIT_BY_ID, UNITS, type Grade } from "../src/data/units.ts";

// 등급별 스킬 예산 (GDD 1.7): [패시브, 공격, 액티브 허용]
const BUDGET: Record<Grade, [number, number, boolean]> = {
  common: [0, 0, false],
  uncommon: [1, 0, false],
  special: [1, 1, false],
  rare: [2, 2, false],
  legendary: [3, 3, true],
  transcendent: [5, 5, true],
};

for (const [id, skills] of Object.entries(SKILLS)) {
  const unit = UNIT_BY_ID[id];
  assert(unit, `${id}: units.ts에 없는 유닛`);
  const [pn, an, actOk] = BUDGET[unit.grade];
  const passives = skills.filter((s) => s.kind === "passive");
  const attacks = skills.filter((s) => s.kind === "attack");
  const actives = skills.filter((s) => s.kind === "active");
  assert.equal(passives.length, pn, `${id}: 패시브 ${passives.length} ≠ 예산 ${pn}`);
  assert.equal(attacks.length, an, `${id}: 공격 스킬 ${attacks.length} ≠ 예산 ${an}`);
  assert(actives.length <= (actOk ? 1 : 0), `${id}: 액티브 초과`);

  for (const s of attacks) {
    assert(s.everyN && s.everyN >= 2, `${id}/${s.name}: everyN 누락 또는 <2`);
    assert(s.pct !== undefined, `${id}/${s.name}: pct 누락`);
  }
  // 공격 스킬 everyN 중복 금지 — 같은 회차에 두 스킬이 겹치면 발동 규칙이 모호해진다
  const ns = attacks.map((s) => s.everyN);
  assert.equal(new Set(ns).size, ns.length, `${id}: everyN 중복 ${ns}`);
  for (const s of actives) {
    assert(s.cooldownSec && s.cooldownSec >= 30, `${id}/${s.name}: 액티브 쿨다운 <30s`);
  }
  // 기대 배율 폭주 방지 — 예산 재분배 원칙 (기본 공격력으로 보상되므로 상한만 감시)
  const mul = skillDpsMul(id, false);
  assert(mul > 0.5 && mul < 8, `${id}: 필드 기대 배율 이상치 ${mul.toFixed(2)}`);
}

// 스킬 보유 대상: 흔함 제외 전 유닛
for (const u of UNITS) {
  if (u.grade === "common") {
    assert(!SKILLS[u.id], `${u.id}: 흔함은 스킬 없음`);
  } else {
    assert(SKILLS[u.id], `${u.id}: 스킬 누락`);
  }
}

// 액티브 보유 유닛 고정 (기획: 전설 페어 2 + 초월 2)
const owners = Object.keys(SKILLS).filter((id) => activeSkill(id));
assert.deepEqual(owners.sort(), ["pc5", "t1", "t6", "tf5"], `액티브 보유: ${owners}`);

console.log(`OK — ${Object.keys(SKILLS).length}개 유닛, 스킬 예산·발동 규칙 정합성 통과`);

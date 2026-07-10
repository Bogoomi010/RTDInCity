# 희귀 등급 생성 원본

`docs/characters/4-rare.md`의 캐릭터·공격 프롬프트를 기준으로 imagegen 내장 도구에서 생성한 알파 원본이다.

## 생성 규격

- 캐릭터 마스터: 버스트 + 정면/후면/측면 전신, 희귀 등급 보라 `#ab47bc`
- 공격: 준비부터 복귀까지 8프레임
- 이동: 정면/후면/측면 각 8프레임
- 런타임 출력: 프레임 `256x256`, 캐릭터 높이 `180px`, 기준선 `y=244`
- UI 출력: 버스트 `512px`, 패널 `128px`, 작은 위젯 `48px`

생성 시에는 피사체에 없는 `#00ff00` 단색 배경을 사용한 뒤 imagegen 스킬의
`remove_chroma_key.py`로 알파 PNG를 만들었다. 최종 런타임 파일은 `public/sprites/rare/`에 있다.

## 런타임 에셋 재빌드

```bash
.venv/bin/python scripts/build-generated-sprite.py dv4 \
  --character public/assets/generated/rare-sprites/dv4_character_sheet.png \
  --attack public/assets/generated/rare-sprites/dv4_attack_sheet.png \
  --walk public/assets/generated/rare-sprites/dv4_walk_atlas.png
```

`sn4`는 긴 총열 간격을 확보한 2x4 공격 원본에 `--attack-rows 2`를 사용한다.
`dr4`는 넓은 요원+드론 실루엣 때문에 측면 이동에 `--walk-side-spacious` 원본을 추가 사용한다.

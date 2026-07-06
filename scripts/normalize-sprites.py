"""스프라이트 시트 캐릭터 크기 정규화 — 새 캐릭터 시트를 넣을 때마다 실행
사용법: pip install pillow 후 `python3 scripts/normalize-sprites.py`

- 셀 크기 자동 감지(가로 1행 시트 기준) → 720 셀로 재배치. art.ts frameW/frameH도 720이어야 함
- 인간형(기본): 시트별 최대 캐릭터 높이 → 560px, 바닥 정렬(발 기준선 y=704)
- 드론형(WIDTH_MODE): 폭 기준 통일 + 세로 중앙(호버링)
- 동물형(MAXDIM_MODE): 최대변 기준 통일 + 바닥 정렬 (4족은 뷰마다 실루엣이 달라 키 기준 무의미)
- 멱등: 이미 처리된 시트는 k≈1로 다시 저장될 뿐 안전
- 원본은 프로젝트 루트 .sprite-backup/에 백업 (.gitignore 권장)
"""
from PIL import Image
import os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "sprites")
BAK = os.path.join(ROOT, ".sprite-backup")
CELL = 720
TARGET_H = 560
MAX_W = 688
PAD_BOTTOM = 16

# 가로형(드론 등 공중) 유닛 — 폭 기준 정규화 + 세로 중앙(호버링).
# 그림자·이펙트가 세로 bbox를 오염시켜도 폭은 안정적이다.
WIDTH_MODE: dict[str, int] = {"dr1": 500}  # id → 목표 폭(px)

# 동물(4족/조류) — 뷰마다 실루엣이 극단적으로 달라(냥이 측면=길고 낮음, 정면=높고 좁음)
# 키 기준이 무의미. 시트별 최대변(maxdim)을 목표로 맞춰 발자국 크기를 통일. 바닥 정렬.
MAXDIM_MODE: dict[str, int] = {"hp1": 420, "hc1": 420}  # id → 목표 최대변(px)

os.makedirs(BAK, exist_ok=True)

for f in sorted(os.listdir(SRC)):
    if not re.search(r"_(attack|walk_\w+)_sheet\.png$", f):
        continue
    path = f"{SRC}/{f}"
    shutil.copy(path, f"{BAK}/{f}")
    im = Image.open(path).convert("RGBA")
    old_cell = im.height  # 가로 1행 시트 — 높이 = 셀 크기 (540/720 자동 감지)
    n = im.width // old_cell

    crops = []
    for i in range(n):
        cell = im.crop((i * old_cell, 0, (i + 1) * old_cell, old_cell))
        bb = cell.getchannel("A").getbbox()
        crops.append(cell.crop(bb))

    max_h = max(c.height for c in crops)
    max_w = max(c.width for c in crops)
    unit_id = f.split("_")[0]
    wide = WIDTH_MODE.get(unit_id)
    maxdim = MAXDIM_MODE.get(unit_id)
    if wide:
        k = min(wide / max_w, (CELL - 32) / max_h)
    elif maxdim:
        k = min(maxdim / max(max_w, max_h), MAX_W / max_w, (CELL - 24) / max_h)
    else:
        k = min(TARGET_H / max_h, MAX_W / max_w)

    sheet = Image.new("RGBA", (CELL * n, CELL), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        nw, nh = round(c.width * k), round(c.height * k)
        r = c.resize((nw, nh), Image.LANCZOS)
        y = (CELL - nh) // 2 if wide else CELL - PAD_BOTTOM - nh
        sheet.paste(r, (i * CELL + (CELL - nw) // 2, y))
    sheet.save(path)
    mode = f"charW {max_w}->{round(max_w*k)}" if wide else f"charH {max_h}->{round(max_h*k)}"
    print(f"{f:32s} k={k:.3f} {mode}")

"""생성형 원본 시트에서 런타임용 스프라이트와 UI 이미지를 만든다.

원본 규격
- character: 좌측 버스트, 우측 정면/후면/우측 전신
- attack: 가로 1행 8프레임
- walk: 정면/후면/우측 3행 x 8프레임

크로마 제거는 imagegen 스킬의 remove_chroma_key.py를 먼저 실행한다.
이 스크립트는 투명 PNG를 분할하고 캐릭터 높이/기준선을 통일한다.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import median

from PIL import Image


FRAME = 256
CHARACTER_HEIGHT = 180
BASELINE = 244


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("투명하지 않은 픽셀을 찾지 못했습니다")
    return bbox


def crop_content(image: Image.Image) -> Image.Image:
    return image.crop(alpha_bbox(image))


def fit_canvas(
    image: Image.Image,
    width: int,
    height: int,
    *,
    padding: int = 0,
    align_y: str = "center",
) -> Image.Image:
    content = crop_content(image)
    scale = min(
        (width - padding * 2) / content.width,
        (height - padding * 2) / content.height,
    )
    size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
    resized = content.resize(size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (width, height))
    x = (width - resized.width) // 2
    y = padding if align_y == "top" else (height - resized.height) // 2
    out.alpha_composite(resized, (x, y))
    return out


@dataclass
class Component:
    runs: list[tuple[int, int, int]]
    area: int
    bbox: tuple[int, int, int, int]

    @property
    def center(self) -> tuple[float, float]:
        x0, y0, x1, y1 = self.bbox
        return ((x0 + x1) / 2, (y0 + y1) / 2)


def connected_components(image: Image.Image) -> list[Component]:
    """알파 마스크를 행 단위 run-length union으로 빠르게 라벨링한다."""
    alpha = image.getchannel("A")
    width, height = alpha.size
    data = alpha.tobytes()
    runs: list[tuple[int, int, int]] = []
    parent: list[int] = []
    previous: list[int] = []

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left_root, right_root = find(left), find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for y in range(height):
        current: list[int] = []
        offset = y * width
        x = 0
        while x < width:
            while x < width and data[offset + x] <= 12:
                x += 1
            if x >= width:
                break
            start = x
            while x < width and data[offset + x] > 12:
                x += 1
            index = len(runs)
            runs.append((y, start, x))
            parent.append(index)
            current.append(index)

        previous_cursor = 0
        for current_index in current:
            _, current_x0, current_x1 = runs[current_index]
            while previous_cursor < len(previous) and runs[previous[previous_cursor]][2] < current_x0:
                previous_cursor += 1
            cursor = previous_cursor
            while cursor < len(previous):
                _, previous_x0, previous_x1 = runs[previous[cursor]]
                if previous_x0 > current_x1:
                    break
                if previous_x1 >= current_x0 and previous_x0 <= current_x1:
                    union(current_index, previous[cursor])
                cursor += 1
        previous = current

    grouped: dict[int, list[tuple[int, int, int]]] = defaultdict(list)
    for index, run in enumerate(runs):
        grouped[find(index)].append(run)

    components: list[Component] = []
    for component_runs in grouped.values():
        area = sum(x1 - x0 for _, x0, x1 in component_runs)
        if area < 16:
            continue
        x0 = min(run[1] for run in component_runs)
        y0 = min(run[0] for run in component_runs)
        x1 = max(run[2] for run in component_runs)
        y1 = max(run[0] + 1 for run in component_runs)
        components.append(Component(component_runs, area, (x0, y0, x1, y1)))
    return components


def extract_group(image: Image.Image, components: list[Component]) -> Image.Image:
    x0 = min(component.bbox[0] for component in components)
    y0 = min(component.bbox[1] for component in components)
    x1 = max(component.bbox[2] for component in components)
    y1 = max(component.bbox[3] for component in components)
    result = Image.new("RGBA", (x1 - x0, y1 - y0))
    for component in components:
        for y, run_x0, run_x1 in component.runs:
            line = image.crop((run_x0, y, run_x1, y + 1))
            result.alpha_composite(line, (run_x0 - x0, y - y0))
    return result


def projection_split(image: Image.Image, columns: int, rows: int) -> list[list[Image.Image]]:
    """긴 무기 때문에 인접 포즈가 닿은 경우 저밀도 경계를 찾아 분리한다."""
    alpha = image.getchannel("A")

    def cuts(length: int, parts: int, projection: list[int]) -> list[int]:
        result = [0]
        cell = length / parts
        radius = max(2, round(cell * 0.18))
        for index in range(1, parts):
            expected = round(index * cell)
            start = max(result[-1] + 1, expected - radius)
            end = min(length - 1, expected + radius)
            result.append(min(range(start, end + 1), key=lambda value: projection[value]))
        result.append(length)
        return result

    x_projection = [sum(1 for y in range(image.height) if alpha.getpixel((x, y)) > 12) for x in range(image.width)]
    y_projection = [sum(1 for x in range(image.width) if alpha.getpixel((x, y)) > 12) for y in range(image.height)]
    x_cuts = cuts(image.width, columns, x_projection)
    y_cuts = cuts(image.height, rows, y_projection)
    return [
        [
            image.crop((x_cuts[column], y_cuts[row], x_cuts[column + 1], y_cuts[row + 1]))
            for column in range(columns)
        ]
        for row in range(rows)
    ]


def extract_sprites(image: Image.Image, count: int, rows: int) -> list[list[Image.Image]]:
    components = connected_components(image)
    if len(components) < count:
        return projection_split(image, count // rows, rows)

    mains = sorted(components, key=lambda component: component.area, reverse=True)[:count]
    main_ids = {id(component) for component in mains}
    groups: dict[int, list[Component]] = {id(main): [main] for main in mains}
    typical_width = image.width / (count / rows)
    typical_height = image.height / rows

    # 발사체·속도선처럼 몸에서 떨어진 작은 연결 영역은 가장 가까운 본체에 귀속한다.
    for component in components:
        if id(component) in main_ids:
            continue
        cx, cy = component.center
        nearest = min(
            mains,
            key=lambda main: ((cx - main.center[0]) / typical_width) ** 2
            + ((cy - main.center[1]) / typical_height) ** 2,
        )
        nx, ny = nearest.center
        if abs(cx - nx) <= typical_width * 0.72 and abs(cy - ny) <= typical_height * 0.72:
            groups[id(nearest)].append(component)

    ordered_rows: list[list[Component]] = []
    for row in range(rows):
        y0 = row * image.height / rows
        y1 = (row + 1) * image.height / rows
        row_mains = sorted(
            (main for main in mains if y0 <= main.center[1] < y1),
            key=lambda main: main.center[0],
        )
        ordered_rows.append(row_mains)
    if any(len(row) != count // rows for row in ordered_rows):
        return projection_split(image, count // rows, rows)
    return [
        [extract_group(image, groups[id(main)]) for main in row]
        for row in ordered_rows
    ]


def normalize_motion(cells: list[Image.Image]) -> list[Image.Image]:
    boxes = [alpha_bbox(cell) for cell in cells]
    heights = [box[3] - box[1] for box in boxes]
    # 생성 시트가 이미 같은 스케일이므로 프레임별 확대가 아니라 공통 배율을 쓴다.
    source_height = median(heights)
    scale = CHARACTER_HEIGHT / source_height
    frames: list[Image.Image] = []
    for cell, box in zip(cells, boxes, strict=True):
        content = cell.crop(box)
        size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
        resized = content.resize(size, Image.Resampling.LANCZOS)
        if resized.width > FRAME - 8 or resized.height > FRAME - 8:
            contain = min((FRAME - 8) / resized.width, (FRAME - 8) / resized.height)
            resized = resized.resize(
                (max(1, round(resized.width * contain)), max(1, round(resized.height * contain))),
                Image.Resampling.LANCZOS,
            )
        frame = Image.new("RGBA", (FRAME, FRAME))
        x = (FRAME - resized.width) // 2
        y = min(BASELINE - resized.height, FRAME - resized.height)
        frame.alpha_composite(resized, (x, max(0, y)))
        frames.append(frame)
    return frames


def save_sheet(frames: list[Image.Image], path: Path) -> None:
    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, optimize=True)


def build_character_assets(character: Image.Image, unit_id: str, out: Path) -> None:
    # imagegen 마스터 규격: 좌측 약 38%가 버스트, 우측이 3방향 전신이다.
    bust_region = character.crop((0, 0, round(character.width * 0.38), character.height))
    bust = fit_canvas(bust_region, 512, 512, padding=8, align_y="top")
    bust.save(out / f"{unit_id}_bust.png", optimize=True)

    ui_dir = out / "ui"
    ui_dir.mkdir(parents=True, exist_ok=True)
    bust.resize((128, 128), Image.Resampling.LANCZOS).save(
        ui_dir / f"{unit_id}_portrait_128.png", optimize=True
    )
    bust.resize((48, 48), Image.Resampling.LANCZOS).save(
        ui_dir / f"{unit_id}_avatar_48.png", optimize=True
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("unit_id")
    parser.add_argument("--character", type=Path, required=True)
    parser.add_argument("--attack", type=Path, required=True)
    parser.add_argument("--attack-rows", type=int, default=1, choices=(1, 2))
    parser.add_argument("--walk", type=Path, required=True)
    parser.add_argument(
        "--walk-side-spacious",
        type=Path,
        help="6x4 재생성본의 4~5행을 측면 8프레임으로 사용",
    )
    parser.add_argument("--out", type=Path, default=Path("public/sprites/rare"))
    args = parser.parse_args()

    character = Image.open(args.character).convert("RGBA")
    attack = Image.open(args.attack).convert("RGBA")
    walk = Image.open(args.walk).convert("RGBA")

    build_character_assets(character, args.unit_id, args.out)
    attack_cells = [
        cell
        for row in extract_sprites(attack, 8, args.attack_rows)
        for cell in row
    ]
    save_sheet(normalize_motion(attack_cells), args.out / f"{args.unit_id}_attack_sheet.png")

    walk_rows = extract_sprites(walk, 24, 3)
    for direction, cells in zip(("front", "back", "side"), walk_rows, strict=True):
        save_sheet(
            normalize_motion(cells),
            args.out / f"{args.unit_id}_walk_{direction}_sheet.png",
        )
    if args.walk_side_spacious:
        spacious = Image.open(args.walk_side_spacious).convert("RGBA")
        spacious_rows = projection_split(spacious, 4, 6)
        side_cells = spacious_rows[3] + spacious_rows[4]
        save_sheet(
            normalize_motion(side_cells),
            args.out / f"{args.unit_id}_walk_side_sheet.png",
        )


if __name__ == "__main__":
    main()

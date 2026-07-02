export interface Pt {
  x: number;
  y: number;
}

/** 닫힌 다각형 경로를 따라 거리 → 좌표 변환 */
export class PathLoop {
  private pts: Pt[];
  private segLens: number[] = [];
  readonly total: number;

  constructor(pts: Pt[]) {
    this.pts = pts;
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segLens.push(len);
      total += len;
    }
    this.total = total;
  }

  posAt(dist: number): Pt {
    let d = dist % this.total;
    if (d < 0) d += this.total;
    for (let i = 0; i < this.pts.length; i++) {
      const len = this.segLens[i];
      if (d <= len) {
        const a = this.pts[i];
        const b = this.pts[(i + 1) % this.pts.length];
        const t = len === 0 ? 0 : d / len;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      d -= len;
    }
    return { ...this.pts[0] };
  }
}

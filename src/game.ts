import type { Point } from "./drawing";

type FallingItem = {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  kind: "target" | "danger";
};

export type MotionGameSnapshot = {
  running: boolean;
  score: number;
  lives: number;
};

export class MotionGame {
  private items: FallingItem[] = [];
  private lastSpawn = 0;
  private nextId = 1;
  private scoreValue = 0;
  private livesValue = 3;
  private runningValue = false;

  get snapshot(): MotionGameSnapshot {
    return {
      running: this.runningValue,
      score: this.scoreValue,
      lives: this.livesValue,
    };
  }

  start(): void {
    if (this.livesValue <= 0) {
      this.reset();
    }
    this.runningValue = true;
  }

  pause(): void {
    this.runningValue = false;
  }

  toggle(): void {
    if (this.runningValue) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset(): void {
    this.items = [];
    this.lastSpawn = 0;
    this.scoreValue = 0;
    this.livesValue = 3;
    this.runningValue = false;
  }

  update(now: number, bounds: { width: number; height: number }, hand?: Point, head?: Point): void {
    if (!this.runningValue) {
      return;
    }

    if (now - this.lastSpawn > 760) {
      this.spawn(bounds);
      this.lastSpawn = now;
    }

    for (const item of this.items) {
      item.y += item.speed;
    }

    this.items = this.items.filter((item) => {
      if (item.kind === "target" && hand && hit(item, hand)) {
        this.scoreValue += 10;
        return false;
      }

      if (item.kind === "danger" && head && hit(item, head)) {
        this.livesValue -= 1;
        if (this.livesValue <= 0) {
          this.runningValue = false;
        }
        return false;
      }

      if (item.y - item.radius > bounds.height) {
        if (item.kind === "target") {
          this.livesValue -= 1;
        }
        if (this.livesValue <= 0) {
          this.runningValue = false;
        }
        return false;
      }

      return true;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(10, 18, 24, 0.68)";
    ctx.fillRect(16, ctx.canvas.height - 78, 250, 54);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Juego: ${this.runningValue ? "activo" : "pausado"}`, 30, ctx.canvas.height - 50);
    ctx.fillText(`Puntos ${this.scoreValue}  Vidas ${this.livesValue}`, 30, ctx.canvas.height - 28);

    for (const item of this.items) {
      ctx.beginPath();
      ctx.fillStyle = item.kind === "target" ? "#56f39a" : "#ff4d6d";
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.88)";
      ctx.stroke();
    }

    ctx.restore();
  }

  private spawn(bounds: { width: number; height: number }): void {
    const kind = Math.random() > 0.28 ? "target" : "danger";
    this.items.push({
      id: this.nextId,
      x: 36 + Math.random() * Math.max(1, bounds.width - 72),
      y: -28,
      radius: kind === "target" ? 23 : 28,
      speed: kind === "target" ? 5.4 : 4.2,
      kind,
    });
    this.nextId += 1;
  }
}

function hit(item: FallingItem, point: Point): boolean {
  return Math.hypot(item.x - point.x, item.y - point.y) < item.radius + 24;
}

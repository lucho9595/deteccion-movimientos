import type { Point } from "./drawing";
import type { HandGesture } from "./gestures";

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

export type RpsMove = "Piedra" | "Papel" | "Tijera";
export type RpsDifficulty = "easy" | "medium" | "hard";

export type RpsSnapshot = {
  playerScore: number;
  aiScore: number;
  round: number;
  prompt: string;
  playerMove: RpsMove | "No mostro";
  aiMove: RpsMove | "No mostro";
  result: string;
  nextRoundAt: number;
};

const MOVES: RpsMove[] = ["Piedra", "Papel", "Tijera"];

export class RockPaperScissorsGame {
  private playerScoreValue = 0;
  private aiScoreValue = 0;
  private roundValue = 1;
  private nextRoundAtValue = 0;
  private lastPlayerMove: RpsMove | "No mostro" = "No mostro";
  private lastAiMove: RpsMove | "No mostro" = "No mostro";
  private resultValue = "Mostra piedra, papel o tijera";
  private playerHistory: RpsMove[] = [];

  get snapshot(): RpsSnapshot {
    return {
      playerScore: this.playerScoreValue,
      aiScore: this.aiScoreValue,
      round: this.roundValue,
      prompt: "Piedra, papel o tijera",
      playerMove: this.lastPlayerMove,
      aiMove: this.lastAiMove,
      result: this.resultValue,
      nextRoundAt: this.nextRoundAtValue,
    };
  }

  reset(now = performance.now()): void {
    this.playerScoreValue = 0;
    this.aiScoreValue = 0;
    this.roundValue = 1;
    this.nextRoundAtValue = now;
    this.lastPlayerMove = "No mostro";
    this.lastAiMove = "No mostro";
    this.resultValue = "Mostra piedra, papel o tijera";
    this.playerHistory = [];
  }

  update(now: number, gesture: HandGesture, difficulty: RpsDifficulty): void {
    if (now < this.nextRoundAtValue) {
      return;
    }

    const playerMove = gestureToRpsMove(gesture);
    const aiMove = this.chooseAiMove(difficulty);
    this.lastPlayerMove = playerMove ?? "No mostro";
    this.lastAiMove = aiMove;

    if (!playerMove) {
      this.aiScoreValue += 1;
      this.resultValue = "No mostraste jugada: punto para la IA";
    } else {
      this.playerHistory.push(playerMove);
      if (this.playerHistory.length > 8) {
        this.playerHistory.shift();
      }

      const outcome = compareMoves(playerMove, aiMove);
      if (outcome === 0) {
        this.resultValue = "Empate";
      } else if (outcome > 0) {
        this.playerScoreValue += 1;
        this.resultValue = "Ganaste la ronda";
      } else {
        this.aiScoreValue += 1;
        this.resultValue = "Gano la IA";
      }
    }

    this.roundValue += 1;
    this.nextRoundAtValue = now + 1800;
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const waitMs = Math.max(0, this.nextRoundAtValue - now);
    const countdown = waitMs > 0 ? `${Math.ceil(waitMs / 1000)}` : "YA";
    const panelWidth = Math.min(520, ctx.canvas.width - 32);
    const panelX = 16;
    const panelY = ctx.canvas.height - 176;

    ctx.save();
    ctx.fillStyle = "rgba(10, 18, 24, 0.76)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, 150, 10);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    ctx.fillText(`Piedra papel tijera | Ronda ${this.roundValue}`, panelX + 16, panelY + 22);

    ctx.font = "800 17px Inter, system-ui, sans-serif";
    ctx.fillText(`Deci: ${this.snapshot.prompt} (${countdown})`, panelX + 16, panelY + 52);

    ctx.font = "800 15px Inter, system-ui, sans-serif";
    ctx.fillText(`Vos: ${this.lastPlayerMove}`, panelX + 16, panelY + 84);
    ctx.fillText(`IA: ${this.lastAiMove}`, panelX + 220, panelY + 84);
    ctx.fillText(`${this.playerScoreValue} - ${this.aiScoreValue}`, panelX + 16, panelY + 114);

    ctx.fillStyle = "#56f39a";
    ctx.fillText(this.resultValue, panelX + 90, panelY + 114);
    ctx.restore();
  }

  private chooseAiMove(difficulty: RpsDifficulty): RpsMove {
    const randomMove = MOVES[Math.floor(Math.random() * MOVES.length)];

    if (difficulty === "easy") {
      return Math.random() < 0.82 ? randomMove : this.counterLikelyMove();
    }

    if (difficulty === "medium") {
      return Math.random() < 0.48 ? randomMove : this.counterLikelyMove();
    }

    return Math.random() < 0.18 ? randomMove : this.counterLikelyMove();
  }

  private counterLikelyMove(): RpsMove {
    const likelyMove = mostCommonMove(this.playerHistory) ?? MOVES[Math.floor(Math.random() * MOVES.length)];
    return winningMoveAgainst(likelyMove);
  }
}

export function gestureToRpsMove(gesture: HandGesture): RpsMove | null {
  if (gesture === "Puno") {
    return "Piedra";
  }

  if (gesture === "Mano abierta") {
    return "Papel";
  }

  if (gesture === "Paz") {
    return "Tijera";
  }

  return null;
}

function compareMoves(player: RpsMove, ai: RpsMove): -1 | 0 | 1 {
  if (player === ai) {
    return 0;
  }

  if (
    (player === "Piedra" && ai === "Tijera") ||
    (player === "Papel" && ai === "Piedra") ||
    (player === "Tijera" && ai === "Papel")
  ) {
    return 1;
  }

  return -1;
}

function winningMoveAgainst(move: RpsMove): RpsMove {
  if (move === "Piedra") {
    return "Papel";
  }

  if (move === "Papel") {
    return "Tijera";
  }

  return "Piedra";
}

function mostCommonMove(history: RpsMove[]): RpsMove | null {
  if (history.length === 0) {
    return null;
  }

  return MOVES
    .map((move) => ({
      move,
      count: history.filter((item) => item === move).length,
    }))
    .sort((a, b) => b.count - a.count)[0].move;
}

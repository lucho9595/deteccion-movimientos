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
  phase: "countdown" | "reveal" | "matchOver";
  matchWinner: "player" | "ai" | null;
};

const MOVES: RpsMove[] = ["Piedra", "Papel", "Tijera"];
const WINNING_SCORE = 2;

type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
};

export class RockPaperScissorsGame {
  private playerScoreValue = 0;
  private aiScoreValue = 0;
  private roundValue = 1;
  private resolveAtValue = 3000;
  private revealUntilValue = 0;
  private phaseValue: "countdown" | "reveal" | "matchOver" = "countdown";
  private lastPlayerMove: RpsMove | "No mostro" = "No mostro";
  private lastAiMove: RpsMove | "No mostro" = "No mostro";
  private resultValue = "Preparate para mostrar tu jugada";
  private playerHistory: RpsMove[] = [];
  private matchWinnerValue: "player" | "ai" | null = null;
  private matchOverUntilValue = 0;
  private confetti: ConfettiPiece[] = [];

  get snapshot(): RpsSnapshot {
    return {
      playerScore: this.playerScoreValue,
      aiScore: this.aiScoreValue,
      round: this.roundValue,
      prompt: "Piedra, papel o tijera",
      playerMove: this.lastPlayerMove,
      aiMove: this.lastAiMove,
      result: this.resultValue,
      nextRoundAt: this.resolveAtValue,
      phase: this.phaseValue,
      matchWinner: this.matchWinnerValue,
    };
  }

  reset(now = performance.now()): void {
    this.playerScoreValue = 0;
    this.aiScoreValue = 0;
    this.roundValue = 1;
    this.resolveAtValue = now + 3000;
    this.revealUntilValue = 0;
    this.phaseValue = "countdown";
    this.lastPlayerMove = "No mostro";
    this.lastAiMove = "No mostro";
    this.resultValue = "Preparate para mostrar tu jugada";
    this.playerHistory = [];
    this.matchWinnerValue = null;
    this.matchOverUntilValue = 0;
    this.confetti = [];
  }

  update(now: number, gesture: HandGesture, difficulty: RpsDifficulty): void {
    if (this.phaseValue === "matchOver") {
      this.updateConfetti();
      if (now >= this.matchOverUntilValue) {
        this.reset(now);
      }
      return;
    }

    if (this.phaseValue === "reveal") {
      if (now >= this.revealUntilValue) {
        this.roundValue += 1;
        this.resolveAtValue = now + 3000;
        this.phaseValue = "countdown";
        this.resultValue = "Preparate para mostrar tu jugada";
      }
      return;
    }

    if (now < this.resolveAtValue) {
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

    this.phaseValue = "reveal";
    if (this.playerScoreValue >= WINNING_SCORE || this.aiScoreValue >= WINNING_SCORE) {
      this.matchWinnerValue = this.playerScoreValue >= WINNING_SCORE ? "player" : "ai";
      this.phaseValue = "matchOver";
      this.matchOverUntilValue = now + 4200;
      this.resultValue = this.matchWinnerValue === "player"
        ? "Ganaste al mejor de 3"
        : "Perdiste... la IA se esta riendo de vos jajaja";
      if (this.matchWinnerValue === "player") {
        this.spawnConfetti();
      }
      return;
    }

    this.revealUntilValue = now + 1800;
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const panelWidth = Math.min(520, ctx.canvas.width - 32);
    const panelX = Math.max(16, (ctx.canvas.width - panelWidth) / 2);
    const panelY = Math.max(16, ctx.canvas.height - 208);

    ctx.save();
    ctx.fillStyle = "rgba(10, 18, 24, 0.76)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, 182, 10);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    ctx.fillText(`Piedra papel tijera | Ronda ${this.roundValue}`, panelX + 16, panelY + 22);

    if (this.phaseValue === "matchOver") {
      if (this.matchWinnerValue === "player") {
        this.drawConfetti(ctx);
      }

      ctx.fillStyle = this.matchWinnerValue === "player" ? "#56f39a" : "#ff6b6b";
      ctx.font = "900 40px Inter, system-ui, sans-serif";
      ctx.fillText(this.matchWinnerValue === "player" ? "GANASTE" : "PERDISTE", panelX + 16, panelY + 76);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 20px Inter, system-ui, sans-serif";
      ctx.fillText(`Final ${this.playerScoreValue} - ${this.aiScoreValue}`, panelX + 16, panelY + 112);

      ctx.fillStyle = this.matchWinnerValue === "player" ? "#ffcf56" : "#ffb4b4";
      ctx.font = "800 17px Inter, system-ui, sans-serif";
      ctx.fillText(this.resultValue, panelX + 16, panelY + 146);
      ctx.fillText("Nueva partida en unos segundos", panelX + 16, panelY + 170);
      ctx.restore();
      return;
    }

    if (this.phaseValue === "countdown") {
      const waitMs = Math.max(0, this.resolveAtValue - now);
      const countdown = Math.max(1, Math.ceil(waitMs / 1000));
      ctx.fillStyle = "#ffcf56";
      ctx.font = "900 92px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${countdown}`, panelX + panelWidth / 2, panelY + 112);

      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 18px Inter, system-ui, sans-serif";
      ctx.fillText(this.snapshot.prompt, panelX + 16, panelY + 146);
      ctx.fillText("Mostra piedra, papel o tijera al llegar a 1", panelX + 16, panelY + 168);
      ctx.restore();
      return;
    }

    ctx.font = "900 24px Inter, system-ui, sans-serif";
    ctx.fillText(`Vos: ${this.lastPlayerMove}`, panelX + 16, panelY + 64);
    ctx.fillText(`IA: ${this.lastAiMove}`, panelX + 260, panelY + 64);

    ctx.font = "900 42px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#ffcf56";
    ctx.fillText(symbolForMove(this.lastPlayerMove), panelX + 16, panelY + 118);
    ctx.fillText(symbolForMove(this.lastAiMove), panelX + 260, panelY + 118);

    ctx.font = "800 17px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Marcador ${this.playerScoreValue} - ${this.aiScoreValue}`, panelX + 16, panelY + 150);

    ctx.fillStyle = "#56f39a";
    ctx.fillText(this.resultValue, panelX + 160, panelY + 150);
    ctx.restore();
  }

  private spawnConfetti(): void {
    const colors = ["#ffcf56", "#56f39a", "#4dabf7", "#ff6b6b", "#ffffff"];
    this.confetti = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: -0.1 - Math.random() * 0.6,
      vx: -0.006 + Math.random() * 0.012,
      vy: 0.012 + Math.random() * 0.026,
      size: 6 + Math.random() * 9,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
    }));
  }

  private updateConfetti(): void {
    for (const piece of this.confetti) {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += 0.0008;
      piece.rotation += 0.18;
      if (piece.y > 1.12) {
        piece.y = -0.12;
        piece.x = Math.random();
        piece.vy = 0.012 + Math.random() * 0.02;
      }
    }
  }

  private drawConfetti(ctx: CanvasRenderingContext2D): void {
    for (const piece of this.confetti) {
      ctx.save();
      ctx.translate(piece.x * ctx.canvas.width, piece.y * ctx.canvas.height);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.55);
      ctx.restore();
    }
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

  if (gesture === "Tijera" || gesture === "Paz") {
    return "Tijera";
  }

  return null;
}

function symbolForMove(move: RpsMove | "No mostro"): string {
  if (move === "Piedra") {
    return "Piedra";
  }

  if (move === "Papel") {
    return "Papel";
  }

  if (move === "Tijera") {
    return "Tijera";
  }

  return "Trampa";
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

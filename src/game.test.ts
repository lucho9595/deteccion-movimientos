import { describe, expect, it } from "vitest";
import { RockPaperScissorsGame, gestureToRpsMove } from "./game";

describe("rock paper scissors game", () => {
  it("maps hand gestures to rock paper scissors moves", () => {
    expect(gestureToRpsMove("Puno")).toBe("Piedra");
    expect(gestureToRpsMove("Mano abierta")).toBe("Papel");
    expect(gestureToRpsMove("Tijera")).toBe("Tijera");
    expect(gestureToRpsMove("Paz")).toBe("Tijera");
    expect(gestureToRpsMove("Detectando")).toBeNull();
  });

  it("gives the point to the AI when the player does not show a valid move", () => {
    const game = new RockPaperScissorsGame();
    game.reset(0);
    game.update(3000, "Detectando", "easy");

    expect(game.snapshot.playerMove).toBe("No mostro");
    expect(game.snapshot.aiMove).not.toBe("No mostro");
    expect(game.snapshot.aiScore).toBe(1);
  });

  it("starts with a 3 second countdown before revealing moves", () => {
    const game = new RockPaperScissorsGame();
    game.reset(1000);

    game.update(2500, "Puno", "easy");
    expect(game.snapshot.phase).toBe("countdown");
    expect(game.snapshot.playerMove).toBe("No mostro");

    game.update(4000, "Puno", "easy");
    expect(game.snapshot.phase).toBe("reveal");
    expect(game.snapshot.playerMove).toBe("Piedra");
  });
});

import { describe, expect, it } from "vitest";
import { RockPaperScissorsGame, gestureToRpsMove } from "./game";

describe("rock paper scissors game", () => {
  it("maps hand gestures to rock paper scissors moves", () => {
    expect(gestureToRpsMove("Puno")).toBe("Piedra");
    expect(gestureToRpsMove("Mano abierta")).toBe("Papel");
    expect(gestureToRpsMove("Paz")).toBe("Tijera");
    expect(gestureToRpsMove("Detectando")).toBeNull();
  });

  it("gives the point to the AI when the player does not show a valid move", () => {
    const game = new RockPaperScissorsGame();
    game.reset(0);
    game.update(0, "Detectando", "easy");

    expect(game.snapshot.playerMove).toBe("No mostro");
    expect(game.snapshot.aiMove).not.toBe("No mostro");
    expect(game.snapshot.aiScore).toBe(1);
  });
});

import { describe, it, expect } from "vitest";
import { canDictateOffline, getOfflineKey } from "../shared/subscription";

describe("Lógica de Inscrição Offline", () => {
  it("deve permitir ditar se o contador offline for menor que 2", () => {
    expect(canDictateOffline(0)).toBe(true);
    expect(canDictateOffline(1)).toBe(true);
  });

  it("deve bloquear ditar se o contador offline for 2 ou mais", () => {
    expect(canDictateOffline(2)).toBe(false);
    expect(canDictateOffline(3)).toBe(false);
  });

  it("deve gerar a chave correta baseada na data", () => {
    const date = new Date(2026, 4, 11); // 11 de Maio de 2026
    expect(getOfflineKey(date)).toBe("offline_dictations_2026-05-11");
  });
});

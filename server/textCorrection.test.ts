import { describe, it, expect, vi, beforeEach } from "vitest";
import { correctTextWithAI } from "./textCorrection";

// Mock the LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "Este é um texto corrigido com pontuação adequada.",
        },
      },
    ],
  }),
}));

describe("correctTextWithAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should correct text with AI successfully", async () => {
    const originalText = "este é um texto sem pontuação";

    const result = await correctTextWithAI(originalText);

    expect(result).toBe("Este é um texto corrigido com pontuação adequada.");
  });

  it("should handle LLM errors gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [],
    });

    const originalText = "teste";

    await expect(correctTextWithAI(originalText)).rejects.toThrow(
      "Falha ao corrigir texto com IA"
    );
  });

  it("should handle non-string responses from LLM", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: [{ type: "text", text: "array content" }],
          },
        },
      ],
    });

    const originalText = "teste";

    await expect(correctTextWithAI(originalText)).rejects.toThrow(
      "Falha ao corrigir texto com IA"
    );
  });
});

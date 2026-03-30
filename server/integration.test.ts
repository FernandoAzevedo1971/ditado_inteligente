import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcribeAudioFile } from "./transcription";
import { correctTextWithAI } from "./textCorrection";

// Mock all external dependencies
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://example.com/audio.webm",
  }),
}));

vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: "Este é um texto de teste",
  }),
}));

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

vi.mock("./paragraphSeparation", () => ({
  separateParagraphsByContext: vi.fn((text) => Promise.resolve(text)),
}));

describe("Voice Text Corrector - Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full workflow: audio -> transcription -> correction", async () => {
    // Step 1: Simulate audio blob
    const audioBlob = new Blob(["audio data"], { type: "audio/webm" });
    expect(audioBlob.size).toBeGreaterThan(0);

    // Step 2: Transcribe audio
    const transcribedText = await transcribeAudioFile(audioBlob);
    expect(transcribedText).toBe("Este é um texto de teste");
    expect(transcribedText.length).toBeGreaterThan(0);

    // Step 3: Correct transcribed text
    const correctedText = await correctTextWithAI(transcribedText);
    expect(correctedText).toBe("Este é um texto corrigido com pontuação adequada.");
    expect(correctedText.length).toBeGreaterThan(transcribedText.length);

    // Verify that correction added punctuation
    expect(correctedText).toContain(".");
  });

  it("should preserve text meaning during correction", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Eu gosto de programação em JavaScript.",
          },
        },
      ],
    });

    const originalText = "eu gosto de programação em javascript";
    const correctedText = await correctTextWithAI(originalText);

    // Verify key words are preserved
    expect(correctedText.toLowerCase()).toContain("programação");
    expect(correctedText.toLowerCase()).toContain("javascript");
  });

  it("should add proper punctuation and capitalization", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Oi, tudo bem? Como você está?",
          },
        },
      ],
    });

    const textWithoutPunctuation = "oi tudo bem como você está";
    const correctedText = await correctTextWithAI(textWithoutPunctuation);

    // Should have capitalization at start
    expect(correctedText[0]).toMatch(/[A-Z]/);

    // Should have punctuation
    expect(correctedText).toMatch(/[.!?]/);
  });

  it("should handle multiple sentences", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Primeira frase. Segunda frase. Terceira frase.",
          },
        },
      ],
    });

    const multiSentence = "primeira frase segunda frase terceira frase";
    const correctedText = await correctTextWithAI(multiSentence);

    // Should have multiple punctuation marks
    const punctuationCount = (correctedText.match(/[.!?]/g) || []).length;
    expect(punctuationCount).toBeGreaterThanOrEqual(1);
  });

  it("should handle error in transcription gracefully", async () => {
    const { transcribeAudio } = await import("./_core/voiceTranscription");
    vi.mocked(transcribeAudio).mockResolvedValueOnce({
      error: "Transcription failed",
    });

    const audioBlob = new Blob(["audio data"], { type: "audio/webm" });

    await expect(transcribeAudioFile(audioBlob)).rejects.toThrow(
      "Falha ao transcrever áudio"
    );
  });

  it("should handle error in correction gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [],
    });

    const text = "teste";

    await expect(correctTextWithAI(text)).rejects.toThrow(
      "Falha ao corrigir texto com IA"
    );
  });
});

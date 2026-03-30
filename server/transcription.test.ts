import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcribeAudioFile } from "./transcription";

// Mock the dependencies
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

describe("transcribeAudioFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should transcribe audio file successfully", async () => {
    const audioBlob = new Blob(["audio data"], { type: "audio/webm" });

    const result = await transcribeAudioFile(audioBlob);

    expect(result).toBe("Este é um texto de teste");
  });

  it("should handle transcription errors", async () => {
    const { transcribeAudio } = await import("./_core/voiceTranscription");
    vi.mocked(transcribeAudio).mockResolvedValueOnce({
      error: "Transcription failed",
    });

    const audioBlob = new Blob(["audio data"], { type: "audio/webm" });

    await expect(transcribeAudioFile(audioBlob)).rejects.toThrow(
      "Falha ao transcrever áudio"
    );
  });
});

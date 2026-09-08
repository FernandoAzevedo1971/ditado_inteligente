import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const createMock = vi.fn();

vi.mock("groq-sdk", () => ({
  Groq: vi.fn().mockImplementation(() => ({
    audio: { transcriptions: { create: createMock } },
  })),
}));

async function importTranscription() {
  return await import("./transcription.js");
}

describe("transcribeAudioFile (Groq) — filtro de alucinações", () => {
  const originalEnv = { ...process.env };
  const tempFilePath = path.join(os.tmpdir(), `audio-test-${Date.now()}.webm`);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GROQ_API_KEY = "test-key";
    delete process.env.TRANSCRIPTION_PROVIDER;
    fs.writeFileSync(tempFilePath, "fake audio data");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // Não removemos o arquivo temporário aqui: o SDK do Groq (mockado) ainda
  // recebe um fs.createReadStream real e aberto de forma assíncrona: apagar
  // o arquivo logo em seguida geraria um ENOENT não tratado no stream. É um
  // arquivo pequeno em os.tmpdir(), removido pelo SO.

  it("descarta a frase fantasma quando ela é o único segmento (áudio em silêncio)", async () => {
    createMock.mockResolvedValueOnce({
      text: "Acesse o nosso site www.opusdei.pt para mais informações.",
      segments: [
        { text: "Acesse o nosso site www.opusdei.pt para mais informações.", no_speech_prob: 0.55, avg_logprob: -0.8 },
      ],
    });

    const { transcribeAudioFile } = await importTranscription();
    const result = await transcribeAudioFile(tempFilePath, "pt");
    expect(result).toBe("");
  });

  it("remove apenas o segmento alucinado quando ele vem grudado a uma fala real", async () => {
    createMock.mockResolvedValueOnce({
      text: "Paciente relata dor no peito há dois dias. Acesse o nosso site www.opusdei.pt para mais informações.",
      segments: [
        { text: "Paciente relata dor no peito há dois dias.", no_speech_prob: 0.05, avg_logprob: -0.1 },
        { text: "Acesse o nosso site www.opusdei.pt para mais informações.", no_speech_prob: 0.4, avg_logprob: -0.9 },
      ],
    });

    const { transcribeAudioFile } = await importTranscription();
    const result = await transcribeAudioFile(tempFilePath, "pt");
    expect(result).toBe("Paciente relata dor no peito há dois dias.");
  });

  it("descarta a frase fantasma mesmo quando o modelo a devolve com alta confiança", async () => {
    // Caso observado em produção: o Whisper devolveu a propaganda com
    // no_speech_prob baixo e avg_logprob alto, e o filtro por confiança a
    // deixava passar. O domínio é bloqueado independentemente da confiança.
    createMock.mockResolvedValueOnce({
      text: "Acesse o nosso site www.opusdei.pt para mais informações.",
      segments: [
        { text: "Acesse o nosso site www.opusdei.pt para mais informações.", no_speech_prob: 0.02, avg_logprob: -0.05 },
      ],
    });

    const { transcribeAudioFile } = await importTranscription();
    const result = await transcribeAudioFile(tempFilePath, "pt");
    expect(result).toBe("");
  });

  it("remove variações de redação em torno do mesmo domínio", async () => {
    createMock.mockResolvedValueOnce({
      text: "Visite www.opusdei.org e saiba mais.",
      segments: [{ text: "Visite www.opusdei.org e saiba mais.", no_speech_prob: 0.01, avg_logprob: -0.02 }],
    });

    const { transcribeAudioFile } = await importTranscription();
    const result = await transcribeAudioFile(tempFilePath, "pt");
    expect(result).toBe("");
  });

  it("remove a propaganda mesmo quando ela vem dentro de um segmento com fala real", async () => {
    createMock.mockResolvedValueOnce({
      text: "Paciente com apneia obstrutiva do sono grave. Para mais informações acesse www.opusdei.pt.",
      segments: [
        {
          text: "Paciente com apneia obstrutiva do sono grave. Para mais informações acesse www.opusdei.pt.",
          no_speech_prob: 0.01,
          avg_logprob: -0.03,
        },
      ],
    });

    const { transcribeAudioFile } = await importTranscription();
    const result = await transcribeAudioFile(tempFilePath, "pt");
    expect(result).toBe("Paciente com apneia obstrutiva do sono grave.");
  });

  it("corta a propaganda grudada na fala real sem pontuação separando as duas", async () => {
    createMock.mockResolvedValueOnce({
      text: "Índice de apneia e hipopneia de trinta e dois eventos por hora acesse o nosso site www.opusdei.pt",
      segments: [
        {
          text: "Índice de apneia e hipopneia de trinta e dois eventos por hora acesse o nosso site www.opusdei.pt",
          no_speech_prob: 0.01,
          avg_logprob: -0.04,
        },
      ],
    });

    const { transcribeAudioFile } = await importTranscription();
    const result = await transcribeAudioFile(tempFilePath, "pt");
    expect(result).toBe("Índice de apneia e hipopneia de trinta e dois eventos por hora");
  });

  it("preserva integralmente um ditado clínico legítimo", async () => {
    const ditado =
      "Paciente do sexo masculino, sessenta e quatro anos, em uso de CPAP com pressão de dez centímetros de água. Refere melhora da sonolência diurna.";
    createMock.mockResolvedValueOnce({
      text: ditado,
      segments: [{ text: ditado, no_speech_prob: 0.01, avg_logprob: -0.05 }],
    });

    const { transcribeAudioFile } = await importTranscription();
    const result = await transcribeAudioFile(tempFilePath, "pt");
    expect(result).toBe(ditado);
  });

});

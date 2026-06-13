import { Groq } from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";
import { Buffer } from "buffer";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  pt: "Ditado em português brasileiro. Pode ser de qualquer natureza: médico, jurídico, empresarial ou pessoal. Termos médicos comuns quando aplicável: anamnese, ausculta, pressão arterial, frequência cardíaca, saturação de oxigênio, hemograma, glicemia, creatinina, TGO, TGP, troponina, tomografia, ressonância magnética, eletrocardiograma, ecocardiograma, hipertensão arterial, diabetes mellitus, insuficiência cardíaca, fibrilação atrial, infarto agudo do miocárdio, acidente vascular cerebral, pneumonia, sepse, DPOC, omeprazol, metformina, losartana, atenolol, furosemida, sinvastatina, levotiroxina, dipirona, amoxicilina, ceftriaxona, heparina, enoxaparina, AAS, prednisona, prontuário, UTI.",
  en: "Dictation in English. Can be of any nature: medical, legal, business, or personal. Common medical terms when applicable: auscultation, blood pressure, heart rate, oxygen saturation, CBC, blood glucose, creatinine, AST, ALT, troponin, CT scan, MRI, ECG, echocardiogram, hypertension, diabetes mellitus, heart failure, atrial fibrillation, acute myocardial infarction, stroke, pneumonia, sepsis, COPD, omeprazole, metformin, losartan, atenolol, furosemide, simvastatin, levothyroxine, amoxicillin, ceftriaxone, heparin, enoxaparin, aspirin, prednisone, medical record, ICU.",
  es: "Dictado en español. Puede ser de cualquier naturaleza: médico, jurídico, empresarial o personal. Términos médicos comunes cuando aplique: auscultación, presión arterial, frecuencia cardíaca, saturación de oxígeno, hemograma, glucemia, creatinina, TGO, TGP, troponina, tomografía, resonancia magnética, electrocardiograma, ecocardiograma, hipertensión arterial, diabetes mellitus, insuficiencia cardíaca, fibrilación auricular, infarto agudo de miocardio, accidente cerebrovascular, neumonía, sepsis, EPOC, omeprazol, metformina, losartán, atenolol, furosemida, simvastatina, levotiroxina, amoxicilina, ceftriaxona, heparina, enoxaparina, aspirina, prednisona, historia clínica, UCI.",
};

// Limiares usados pelo próprio Whisper para decidir se um segmento é silêncio:
// só é tratado como "sem fala" quando a probabilidade de silêncio é alta E a
// confiança da transcrição (avg_logprob) é baixa. Isso evita descartar falas
// curtas/baixas que o modelo ainda transcreveu com confiança.
const NO_SPEECH_PROB_THRESHOLD = 0.6;
const LOGPROB_THRESHOLD = -1.0;

// Frases "fantasma" que o Whisper costuma alucinar quando o áudio está em
// silêncio, é muito curto ou contém apenas ruído (ex: anúncios/legendas que
// fizeram parte do material de treino do modelo). Quando o texto transcrito
// corresponde a uma dessas frases, tratamos como "nenhuma fala detectada".
const HALLUCINATION_PHRASES = [
  "acesse o nosso site www.opusdei.pt para mais informações",
  "acesse o nosso site www.opusdei.pt para mais informacoes",
  "legendas pela comunidade amara.org",
  "subscrevam o canal",
  "se inscreva no canal",
  "obrigado por assistir",
  "obrigado por ver",
];

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/g, "")
    .trim();
}

function isLikelyHallucination(text: string): boolean {
  const normalized = normalizeForComparison(text);
  if (!normalized) return false;
  return HALLUCINATION_PHRASES.some((phrase) => normalized === phrase);
}

type WhisperVerboseSegment = {
  text: string;
  no_speech_prob: number;
  avg_logprob: number;
};

type WhisperVerboseResponse = {
  text: string;
  segments?: WhisperVerboseSegment[];
};

export async function transcribeAudioFile(filePath: string, language: SupportedLanguage = "pt"): Promise<string> {
  console.log(`[Transcription] Iniciando transcrição. Idioma: ${language}`);

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "dummy") {
    console.warn("[Transcription] GROQ_API_KEY não encontrada. Usando mock.");
    return new Promise(resolve => {
      setTimeout(() => resolve("Esta é uma transcrição de teste. Configure sua chave GROQ_API_KEY para transcrições reais."), 2000);
    });
  }

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("Arquivo de áudio não encontrado no servidor.");
    }

    console.log(`[Transcription] Enviando para Groq Whisper (modelo: whisper-large-v3, arquivo: ${filePath})...`);

    const result = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      prompt: LANGUAGE_PROMPTS[language],
      response_format: "verbose_json",
      language: language === "pt" ? "pt" : language === "es" ? "es" : "en",
      temperature: 0,
    });

    const verboseResult = result as unknown as WhisperVerboseResponse;
    const transcription = (verboseResult.text || "").trim();
    const segments = verboseResult.segments || [];

    // Áudio em branco/sem fala: o Whisper costuma retornar nenhum segmento,
    // ou segmentos com alta probabilidade de "sem fala" E baixa confiança na
    // transcrição. Nesses casos o texto retornado é frequentemente uma
    // alucinação (texto inventado pelo modelo a partir de dados de treino) e
    // não deve ser exibido ao usuário.
    const noSpeechDetected =
      segments.length === 0 ||
      segments.every(
        (segment) => segment.no_speech_prob >= NO_SPEECH_PROB_THRESHOLD && segment.avg_logprob < LOGPROB_THRESHOLD
      );

    // Frases conhecidas de alucinação (ex: anúncios) só são descartadas se o
    // áudio também tiver indícios de silêncio/ruído. Assim, se o usuário
    // realmente ditar uma dessas frases com fala clara, ela é preservada.
    const avgNoSpeechProb =
      segments.length > 0
        ? segments.reduce((sum, segment) => sum + segment.no_speech_prob, 0) / segments.length
        : 1;
    const looksLikeHallucination = isLikelyHallucination(transcription) && avgNoSpeechProb >= 0.3;

    if (!transcription || noSpeechDetected || looksLikeHallucination) {
      console.warn("[Transcription] Nenhuma fala detectada no áudio (ou resultado alucinado pelo modelo).");
      return "";
    }

    console.log(`[Transcription] Sucesso! Texto: "${transcription.substring(0, 50).trim()}..."`);
    return transcription;
  } catch (error: any) {
    console.error("[Transcription] ERRO CRÍTICO:", error.message);

    if (error.response) {
      throw new Error(`Erro na API Groq (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    if (error.message.includes("413") || error.message.includes("payload too large")) {
      throw new Error("O arquivo de áudio é muito grande. Tente gravar um áudio mais curto.");
    }

    throw new Error(`Falha ao transcrever o áudio: ${error.message}`);
  }
}

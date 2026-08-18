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

// Um segmento isolado só é tratado como "possível alucinação" quando, além do
// texto bater com uma das frases fantasma, ele próprio já mostra algum
// indício de silêncio/ruído. O limiar aqui é mais permissivo que o de
// "nenhuma fala detectada" acima porque essas frases costumam aparecer
// grudadas no fim de um trecho com fala real (onde o resto do áudio já
// "convenceu" o modelo de que há voz, elevando a confiança do segmento).
const SEGMENT_HALLUCINATION_NO_SPEECH_THRESHOLD = 0.3;

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

// Remove, frase por frase, qualquer sentença que corresponda a uma alucinação
// conhecida — mesmo quando ela aparece grudada ao final (ou no meio) de um
// ditado real, e não como a transcrição inteira. Funciona como uma segunda
// camada de proteção, independente de haver ou não sinais de confiança do
// modelo (necessário para provedores que não expõem no_speech_prob).
function stripHallucinationSentences(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((sentence) => !isLikelyHallucination(sentence));
  return kept.join(" ").replace(/\s+/g, " ").trim();
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

function isSegmentHallucination(segment: WhisperVerboseSegment): boolean {
  const normalized = normalizeForComparison(segment.text);
  if (!normalized) return false;
  const matchesKnownPhrase = HALLUCINATION_PHRASES.some((phrase) => normalized === phrase);
  if (!matchesKnownPhrase) return false;
  return (
    segment.no_speech_prob >= SEGMENT_HALLUCINATION_NO_SPEECH_THRESHOLD ||
    segment.avg_logprob < LOGPROB_THRESHOLD
  );
}

async function transcribeWithGroq(filePath: string, language: SupportedLanguage): Promise<string> {
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
  const segments = verboseResult.segments || [];

  if (segments.length === 0) {
    // Sem segmentos: não há como avaliar confiança por trecho. Caímos de
    // volta na checagem do texto inteiro (comportamento anterior).
    const wholeText = (verboseResult.text || "").trim();
    const noSpeechDetected = !wholeText;
    const looksLikeHallucination = isLikelyHallucination(wholeText);
    if (noSpeechDetected || looksLikeHallucination) {
      console.warn("[Transcription] Nenhuma fala detectada no áudio (ou resultado alucinado pelo modelo).");
      return "";
    }
    return wholeText;
  }

  // Descarta, segmento a segmento, qualquer trecho que seja tanto uma frase
  // fantasma conhecida quanto tenha indícios de silêncio/baixa confiança.
  // Isso corrige o caso em que a alucinação aparece grudada ao final de um
  // ditado real: a média geral do áudio pode parecer "com fala", mas o
  // segmento da alucinação em si continua tendo baixa confiança.
  const realSegments = segments.filter((segment) => !isSegmentHallucination(segment));

  // Áudio em branco/sem fala: o Whisper costuma retornar nenhum segmento
  // "real" (após remover alucinações), ou segmentos com alta probabilidade
  // de "sem fala" E baixa confiança na transcrição.
  const noSpeechDetected =
    realSegments.length === 0 ||
    realSegments.every(
      (segment) => segment.no_speech_prob >= NO_SPEECH_PROB_THRESHOLD && segment.avg_logprob < LOGPROB_THRESHOLD
    );

  if (noSpeechDetected) {
    console.warn("[Transcription] Nenhuma fala detectada no áudio (ou resultado alucinado pelo modelo).");
    return "";
  }

  return realSegments.map((segment) => segment.text.trim()).filter(Boolean).join(" ");
}

async function transcribeWithVoxtral(filePath: string, language: SupportedLanguage): Promise<string> {
  const apiKey = process.env.VOXTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("VOXTRAL_API_KEY não configurada.");
  }

  console.log(`[Transcription] Enviando para Voxtral (modelo: voxtral-mini-latest, arquivo: ${filePath})...`);

  const form = new FormData();
  form.append("model", "voxtral-mini-latest");
  form.append("file", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  form.append("language", language);
  form.append("response_format", "json");

  const response = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Erro na API Voxtral (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { text?: string };
  const wholeText = (data.text || "").trim();
  if (!wholeText) {
    console.warn("[Transcription] Nenhuma fala detectada no áudio.");
    return "";
  }

  const transcription = stripHallucinationSentences(wholeText);
  if (!transcription || isLikelyHallucination(transcription)) {
    console.warn("[Transcription] Resultado alucinado descartado.");
    return "";
  }

  return transcription;
}

export async function transcribeAudioFile(filePath: string, language: SupportedLanguage = "pt"): Promise<string> {
  const provider = (process.env.TRANSCRIPTION_PROVIDER || "groq").toLowerCase();
  console.log(`[Transcription] Iniciando transcrição. Idioma: ${language}. Provedor: ${provider}`);

  const hasGroqKey = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "dummy";
  const hasVoxtralKey = !!process.env.VOXTRAL_API_KEY;
  const usingVoxtral = provider === "voxtral";

  if ((usingVoxtral && !hasVoxtralKey) || (!usingVoxtral && !hasGroqKey)) {
    console.warn(`[Transcription] Chave de API para o provedor "${provider}" não encontrada. Usando mock.`);
    return new Promise((resolve) => {
      setTimeout(() => resolve("Esta é uma transcrição de teste. Configure sua chave GROQ_API_KEY para transcrições reais."), 2000);
    });
  }

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("Arquivo de áudio não encontrado no servidor.");
    }

    const transcription = usingVoxtral
      ? await transcribeWithVoxtral(filePath, language)
      : await transcribeWithGroq(filePath, language);

    if (transcription) {
      console.log(`[Transcription] Sucesso! Texto: "${transcription.substring(0, 50).trim()}..."`);
    }
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

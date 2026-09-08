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

// Marcas de propaganda e de legenda que o Whisper injeta em áudio de baixa
// energia. Diferente de HALLUCINATION_PHRASES, que exige correspondência
// exata com o texto e só descarta o trecho quando o modelo também sinaliza
// baixa confiança, estes marcadores são bloqueados INCONDICIONALMENTE e em
// qualquer redação. São domínios e chamadas de canal que não aparecem num
// ditado legítimo, e o modelo às vezes os devolve com no_speech_prob baixo e
// avg_logprob alto, o que fazia o filtro por confiança deixá-los passar.
const HALLUCINATION_MARKERS: RegExp[] = [
  /(?:www\.)?opus\s?dei\.[a-z]{2,4}/i,
  /amara\.org/i,
  /legenda\w*\s+(?:pela|por|feitas?\s+pela)\s+comunidade/i,
  /(?:se\s+)?inscrev\w*(?:-se)?\s+no\s+canal/i,
  /subscrev\w*\s+o\s+canal/i,
  /ativ\w*\s+o\s+sininho/i,
  /legendas?\s+por\s+\w+/i,
];

// Expressões que costumam abrir a frase de propaganda. Quando o marcador vem
// grudado a uma fala real sem pontuação separando as duas, o corte começa
// aqui em vez de descartar a sentença inteira, preservando o ditado.
const HALLUCINATION_LEAD_INS =
  /\b(?:acess\w*|visit\w*|confir\w*|veja|vejam|assist\w*|cliqu\w*|saiba\s+mais|para\s+mais\s+informa\w*|legenda\w*)\b/gi;

const SENTENCE_TERMINATORS = /[.!?\n]/;

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/g, "")
    .trim();
}

// Remove a frase inteira em torno de cada marcador de alucinação: expande do
// marcador até o começo da sentença (ou até o último "lead-in", quando a
// propaganda vem grudada numa fala real sem pontuação) e até o terminador
// seguinte, inclusive.
function stripHallucinationMarkers(text: string): string {
  let result = text;

  for (const marker of HALLUCINATION_MARKERS) {
    // O mesmo marcador pode aparecer repetido; o limite evita laço infinito
    // caso alguma expressão passe a casar com string vazia.
    for (let pass = 0; pass < 10; pass++) {
      const match = result.match(marker);
      if (!match || match.index === undefined) break;

      let start = match.index;
      while (start > 0 && !SENTENCE_TERMINATORS.test(result[start - 1])) start--;

      const before = result.slice(start, match.index);
      // Corta a partir do PRIMEIRO lead-in da sentença: a propaganda costuma
      // encadear várias dessas expressões ("Para mais informações acesse ...")
      // e cortar só a última deixaria resíduo no texto entregue ao usuário.
      HALLUCINATION_LEAD_INS.lastIndex = 0;
      const firstLeadIn = HALLUCINATION_LEAD_INS.exec(before);
      if (firstLeadIn) start += firstLeadIn.index;

      let end = match.index + match[0].length;
      while (end < result.length && !SENTENCE_TERMINATORS.test(result[end])) end++;
      if (end < result.length) end++;

      result = `${result.slice(0, start)} ${result.slice(end)}`;
    }
  }

  return result
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

function isLikelyHallucination(text: string): boolean {
  const normalized = normalizeForComparison(text);
  if (!normalized) return false;
  if (HALLUCINATION_MARKERS.some((marker) => marker.test(text))) return true;
  return HALLUCINATION_PHRASES.some((phrase) => normalized === phrase);
}

// Sanitização final aplicada ao texto de qualquer provedor: primeiro corta os
// marcadores incondicionais, depois descarta sentença por sentença o que
// ainda corresponder a uma frase fantasma conhecida. Independe de o provedor
// expor sinais de confiança (no_speech_prob / avg_logprob).
function stripHallucinationSentences(text: string): string {
  const withoutMarkers = stripHallucinationMarkers(text);
  const sentences = withoutMarkers.split(/(?<=[.!?])\s+/);
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

  // Marcadores de propaganda são tratados sem consultar a confiança do
  // modelo: já foi observado o Whisper devolvê-los com no_speech_prob baixo.
  // O segmento inteiro só é descartado quando nada sobra depois do corte —
  // se ele também carrega fala real, quem limpa o resíduo é o
  // stripHallucinationSentences aplicado ao texto final.
  if (HALLUCINATION_MARKERS.some((marker) => marker.test(segment.text))) {
    return stripHallucinationMarkers(segment.text).length === 0;
  }

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
    const cleaned = stripHallucinationSentences(wholeText);
    if (!cleaned) {
      console.warn("[Transcription] Nenhuma fala detectada no áudio (ou resultado alucinado pelo modelo).");
      return "";
    }
    return cleaned;
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

  const joined = realSegments.map((segment) => segment.text.trim()).filter(Boolean).join(" ");
  return stripHallucinationSentences(joined);
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

    const rawTranscription = usingVoxtral
      ? await transcribeWithVoxtral(filePath, language)
      : await transcribeWithGroq(filePath, language);

    // Rede de segurança final: nenhuma propaganda alucinada sai daqui, seja
    // qual for o provedor ou o caminho percorrido acima.
    const transcription = stripHallucinationSentences(rawTranscription);

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

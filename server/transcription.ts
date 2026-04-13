import { Groq } from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";
import { Buffer } from "buffer";

// Instancia o cliente Groq usando a chave nas variáveis de ambiente
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  pt: "Transcrição literal e precisa, sem comentários adicionais.",
  en: "Literal and accurate transcription, no extra comments.",
  es: "Transcripción literal y precisa, sin comentarios adicionales.",
};

export async function transcribeAudioFile(filePath: string, language: SupportedLanguage = "pt"): Promise<string> {
  console.log(`[Transcription] Iniciando transcrição. Idioma: ${language}`);
  
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
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

    // 3. Envia o arquivo de áudio real para o Whisper v3 no Groq Cloud
    console.log(`[Transcription] Enviando para Groq Whisper (modelo: whisper-large-v3, arquivo: ${filePath})...`);
    
    // Type checking para a resposta verbose_json
    type WhisperVerboseJSONResponse = {
      text: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    const result = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      prompt: LANGUAGE_PROMPTS[language],
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
      language: language === "pt" ? "pt" : language === "es" ? "es" : "en",
    }) as WhisperVerboseJSONResponse;

    let finalTranscription = result.text;

    // Processar segmentos para paragrafação baseada em pausas
    if (result.segments && result.segments.length > 0) {
      const PAUSE_THRESHOLD = 1.5; // Limite de 1.5 segundos definido
      let paragraphedText = "";

      for (let i = 0; i < result.segments.length; i++) {
        // Usa trim para evitar acúmulo indesejado de espaços soltos e unifica com um espaço regular ou formatação desejada. 
        // O Whisper já traz os espaços necessários, mas as pausas substituem isso.
        paragraphedText += result.segments[i].text;
        
        if (i < result.segments.length - 1) {
          const gap = result.segments[i + 1].start - result.segments[i].end;
          if (gap >= PAUSE_THRESHOLD) {
            paragraphedText += "\n\n";
          }
        }
      }
      finalTranscription = paragraphedText;
    }

    console.log(`[Transcription] Sucesso! Texto transcrito: "${finalTranscription.substring(0, 50).trim()}..."`);

    return finalTranscription.trim();
  } catch (error: any) {
    console.error("[Transcription] ERRO CRÍTICO transcrevendo áudio com Groq Whisper:");
    console.error(`- Mensagem: ${error.message}`);
    console.error(`- Código: ${error.code || 'N/A'}`);
    console.error(`- Tipo: ${error.type || 'N/A'}`);
    
    // Log detalhado do erro se for um erro de rede/API da Groq
    if (error.response) {
      console.error("[Transcription] Detalhes da resposta de erro da Groq:", {
        status: error.response.status,
        data: error.response.data,
      });
      throw new Error(`Erro na API Groq (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }

    if (error.message.includes("413") || error.message.includes("payload too large")) {
      throw new Error("O arquivo de áudio é muito grande para o servidor. Tente gravar um áudio mais curto.");
    }

    throw new Error(`Falha ao transcrever o áudio: ${error.message}`);
  }
}

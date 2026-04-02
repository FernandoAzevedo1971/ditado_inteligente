import { Groq } from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";
import { Buffer } from "buffer";

// Instancia o cliente Groq usando a chave nas variáveis de ambiente
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  pt: "Transcrever o texto ditado em português com precisão",
  en: "Transcribe the spoken text in English accurately",
  es: "Transcribir el texto hablado em español con precisión",
};

export async function transcribeAudioFile(audioBlob: Blob, language: SupportedLanguage = "pt"): Promise<string> {
  console.log(`[Transcription] Iniciando transcrição. Idioma: ${language}`);
  
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "dummy") {
    console.warn("[Transcription] GROQ_API_KEY não encontrada. Usando mock.");
    return new Promise(resolve => {
      setTimeout(() => resolve("Olá! Esta é uma transcrição simulada pelo modo de teste. Eu percebi que você ainda não configurou a sua chave GROQ_API_KEY no arquivo .env na nuvem do seu projeto. Quando colocar a chave lá, esta frase se tornará a transcrição rápida e real da sua voz!"), 2000);
    });
  }

  try {
    // 1. Converte o áudio que vem do navegador (Web Blob) para Buffer do Node
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[Transcription] Buffer de áudio criado. Tamanho: ${buffer.length} bytes`);
    
    // 2. Salva em um arquivo temporário (pois a API do Whisper precisa ser lida como arquivo real no disco em Node)
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `audio-${Date.now()}.webm`);
    console.log(`[Transcription] Salvando arquivo temporário em: ${tempFilePath}`);
    fs.writeFileSync(tempFilePath, buffer);

    // 3. Envia o arquivo de áudio real para o Whisper v3 no Groq Cloud
    console.log(`[Transcription] Enviando para Groq Whisper (modelo: whisper-large-v3)...`);
    const result = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
      prompt: LANGUAGE_PROMPTS[language],
      response_format: "json",
      language: language === "pt" ? "pt" : language === "es" ? "es" : "en",
    });

    console.log(`[Transcription] Sucesso! Texto transcrito: "${result.text.substring(0, 50)}..."`);

    // 4. Apaga o arquivo temporário por segurança
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`[Transcription] Arquivo temporário removido.`);
    } catch (e) {
      console.error(`[Transcription] Erro ao remover arquivo temporário:`, e);
    }

    return result.text;
  } catch (error: any) {
    console.error("[Transcription] Erro transcrevendo áudio com Groq Whisper:", error);
    // Log detalhado do erro se disponível
    if (error.response) {
      console.error("[Transcription] Detalhes da resposta de erro:", error.response.data);
    }
    throw new Error(`Falha ao transcrever o áudio: ${error.message}`);
  }
}

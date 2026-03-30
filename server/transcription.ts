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
  es: "Transcribir el texto hablado en español con precisión",
};

export async function transcribeAudioFile(audioBlob: Blob, language: SupportedLanguage = "pt"): Promise<string> {
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.GROQ_API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => resolve("Olá! Esta é uma transcrição simulada pelo modo de teste. Eu percebi que você ainda não configurou a sua chave GROQ_API_KEY no arquivo .env na nuvem do seu projeto. Quando colocar a chave lá, esta frase se tornará a transcrição rápida e real da sua voz!"), 2000);
    });
  }

  try {
    // 1. Converte o áudio que vem do navegador (Web Blob) para Buffer do Node
    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    
    // 2. Salva em um arquivo temporário (pois a API do Whisper precisa ser lida como arquivo real no disco em Node)
    const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, buffer);

    // 3. Envia o arquivo de áudio real para o Whisper v3 no Groq Cloud
    const result = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
      prompt: LANGUAGE_PROMPTS[language],
      response_format: "json",
      language: language === "pt" ? "pt" : language === "es" ? "es" : "en",
    });

    // 4. Apaga o arquivo temporário por segurança
    fs.unlinkSync(tempFilePath);

    return result.text;
  } catch (error) {
    console.error("Erro transcrevendo áudio com Groq Whisper:", error);
    throw new Error("Falha ao transcrever o áudio.");
  }
}

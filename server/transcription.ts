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

export async function transcribeAudioFile(audioBlob: Blob, language: SupportedLanguage = "pt"): Promise<string> {
  console.log(`[Transcription] Iniciando transcrição. Idioma: ${language}`);
  
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "dummy") {
    console.warn("[Transcription] GROQ_API_KEY não encontrada. Usando mock.");
    return new Promise(resolve => {
      setTimeout(() => resolve("Esta é uma transcrição de teste. Configure sua chave GROQ_API_KEY para transcrições reais."), 2000);
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
      console.warn(`[Transcription] Aviso: Erro não crítico ao remover arquivo temporário:`, e);
    }

    return result.text;
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

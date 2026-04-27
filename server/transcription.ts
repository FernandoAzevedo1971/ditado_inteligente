import { Groq } from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";
import { Buffer } from "buffer";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  pt: "Transcrição de ditado médico em português brasileiro. Termos: diagnóstico, prognóstico, anamnese, ausculta, pressão arterial, frequência cardíaca, saturação de oxigênio, hemograma, glicemia, creatinina, ureia, TGO, TGP, tomografia, ressonância magnética, eletrocardiograma, ecocardiograma, hipertensão arterial, diabetes mellitus, insuficiência cardíaca, fibrilão atrial, infarto agudo do miocárdio, AVC, pneumonia, sepse, DPOC, omeprazol, metformina, losartana, atenolol, sinvastatina, levotiroxina, dipirona, amoxicilina, ceftriaxona, heparina, AAS, prednisona, insulina, prescrição médica, prontuário, evolução clínica, UTI.",
  en: "Medical dictation in English. Terms: diagnosis, prognosis, anamnesis, auscultation, blood pressure, heart rate, oxygen saturation, CBC, blood glucose, creatinine, urea, CT scan, MRI, ECG, echocardiogram, hypertension, diabetes mellitus, heart failure, atrial fibrillation, acute myocardial infarction, ischemic stroke, pneumonia, sepsis, COPD, omeprazole, metformin, losartan, atenolol, simvastatin, levothyroxine, ibuprofen, amoxicillin, ceftriaxone, heparin, aspirin, prednisone, insulin, prescription, medical record, clinical notes, ICU, ER.",
  es: "Dictado médico en español. Términos: diagnóstico, pronóstico, anamnesis, auscultación, presión arterial, frecuencia cardíaca, saturación de oxígeno, hemograma, glucemia, creatinina, urea, TGO, TGP, tomografía, resonancia magnética, electrocardiograma, ecocardiograma, hipertensión arterial, diabetes mellitus, insuficiencia cardíaca, fibrilación auricular, infarto agudo de miocardio, ACV, neumonía, sepsis, EPOC, omeprazol, metformina, losartán, atenolol, simvastatina, levotiroxina, ibuprofeno, amoxicilina, ceftriaxona, heparina, aspirina, prednisona, insulina, prescripción, historia clínica, evolución clínica, UCI.",
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

    console.log(`[Transcription] Enviando para Groq Whisper (modelo: whisper-large-v3-turbo, arquivo: ${filePath})...`);

    const result = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3-turbo",
      prompt: LANGUAGE_PROMPTS[language],
      response_format: "text",
      language: language === "pt" ? "pt" : language === "es" ? "es" : "en",
      temperature: 0,
    });

    const transcription = (result as unknown as string).trim();
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

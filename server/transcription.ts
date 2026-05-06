import { Groq } from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";
import { Buffer } from "buffer";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  pt: "Ditado médico em português brasileiro. Termos: anamnese, ausculta, murmúrio vesicular, crepitações, sibilos, pressão arterial, frequência cardíaca, saturação de oxigênio, hemograma, leucocitose, glicemia, creatinina, ureia, TGO, TGP, troponina, gasometria, tomografia, ressonância magnética, eletrocardiograma, ecocardiograma, hipertensão arterial, diabetes mellitus, insuficiência cardíaca, fibrilação atrial, infarto agudo do miocárdio, acidente vascular cerebral, pneumonia, derrame pleural, embolia pulmonar, sepse, DPOC, insuficiência renal aguda, omeprazol, metformina, losartana, atenolol, metoprolol, furosemida, sinvastatina, levotiroxina, dipirona, amoxicilina, ceftriaxona, ciprofloxacino, metronidazol, vancomicina, meropeném, heparina, enoxaparina, rivaroxabana, AAS, prednisona, ondansetrona, prontuário, evolução clínica, UTI.",
  en: "Medical dictation in English. Terms: anamnesis, auscultation, crackles, wheezes, blood pressure, heart rate, oxygen saturation, CBC, blood glucose, creatinine, AST, ALT, troponin, arterial blood gas, CT scan, MRI, ECG, echocardiogram, hypertension, diabetes mellitus, heart failure, atrial fibrillation, acute myocardial infarction, stroke, pneumonia, pleural effusion, pulmonary embolism, sepsis, COPD, acute kidney injury, omeprazole, metformin, losartan, atenolol, metoprolol, furosemide, simvastatin, levothyroxine, amoxicillin, ceftriaxone, ciprofloxacin, metronidazole, vancomycin, meropenem, heparin, enoxaparin, rivaroxaban, aspirin, prednisone, ondansetron, medical record, clinical notes, ICU.",
  es: "Dictado médico en español. Términos: anamnesis, auscultación, murmullo vesicular, crepitantes, sibilancias, presión arterial, frecuencia cardíaca, saturación de oxígeno, hemograma, leucocitosis, glucemia, creatinina, TGO, TGP, troponina, gasometría, tomografía, resonancia magnética, electrocardiograma, ecocardiograma, hipertensión arterial, diabetes mellitus, insuficiencia cardíaca, fibrilación auricular, infarto agudo de miocardio, accidente cerebrovascular, neumonía, derrame pleural, embolia pulmonar, sepsis, EPOC, insuficiencia renal aguda, omeprazol, metformina, losartán, atenolol, metoprolol, furosemida, simvastatina, levotiroxina, amoxicilina, ceftriaxona, ciprofloxacino, metronidazol, vancomicina, meropenem, heparina, enoxaparina, rivaroxabán, aspirina, prednisona, ondansetrón, historia clínica, evolución clínica, UCI.",
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

import { Groq } from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";
import { Buffer } from "buffer";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  pt: `Transcrição de ditado médico em português brasileiro. Termos frequentes: diagnóstico, prognóstico, anamnese, ausculta, ausculta pulmonar, pressão arterial, frequência cardíaca, saturação de oxigênio, frequência respiratória, temperatura axilar, hemograma completo, glicemia, creatinina, ureia, sódio, potássio, TGO, TGP, bilirrubinas, coagulograma, RX de tórax, tomografia computadorizada, ressonância magnética, eletrocardiograma, ecocardiograma, ultrassonografia, endoscopia, colonoscopia, hipertensão arterial sistêmica, diabetes mellitus, insuficiência cardíaca congestiva, fibrilão atrial, infarto agudo do miocárdio, acidente vascular cerebral isquêmico, pneumonia, sepse, insuficiência renal aguda, doença pulmonar obstrutiva crônica, asma brônquica, hipotireoidismo, hipertireoidismo, dislipidemia, obesidade mórbida, anemia ferropriva, trombose venosa profunda, embolia pulmonar, cirrose hepática, pancreatite aguda, apendicite aguda, hernía de disco, fibromialgia, artrite reumatoide, lúpus eritematoso sistêmico, omeprazol, metformina, losartana, enalapril, atenolol, sinvastatina, atorvastatina, levotiroxina, dipirona, ibuprofeno, amoxicilina, azitromicina, ciprofloxacino, ceftriaxona, heparina, varfarina, AAS, metoprolol, amlodipino, hidroclorotiazida, furosemida, espironolactona, prednisona, dexametasona, insulina regular, glibenclamida, prescrição médica, prontuário, evolução clínica, hipótese diagnóstica, conduta médica, alta hospitalar, internação, UTI, pronto-socorro.`,
  en: `Medical dictation transcription in English. Common terms: diagnosis, prognosis, anamnesis, auscultation, blood pressure, heart rate, oxygen saturation, respiratory rate, complete blood count, blood glucose, creatinine, urea, sodium, potassium, chest X-ray, CT scan, MRI, electrocardiogram, echocardiogram, ultrasound, endoscopy, colonoscopy, hypertension, diabetes mellitus, congestive heart failure, atrial fibrillation, acute myocardial infarction, ischemic stroke, pneumonia, sepsis, acute renal failure, COPD, bronchial asthma, hypothyroidism, hyperthyroidism, dyslipidemia, morbid obesity, iron deficiency anemia, deep vein thrombosis, pulmonary embolism, liver cirrhosis, acute pancreatitis, appendicitis, herniated disc, fibromyalgia, rheumatoid arthritis, systemic lupus erythematosus, omeprazole, metformin, losartan, enalapril, atenolol, simvastatin, atorvastatin, levothyroxine, ibuprofen, amoxicillin, azithromycin, ciprofloxacin, ceftriaxone, heparin, warfarin, aspirin, metoprolol, amlodipine, hydrochlorothiazide, furosemide, spironolactone, prednisone, dexamethasone, insulin, prescription, medical record, clinical progress note, diagnostic hypothesis, medical management, hospital discharge, ICU, emergency room.`,
  es: `Transcripción de dictado médico en español. Términos frecuentes: diagnóstico, pronóstico, anamnesis, auscultación, presión arterial, frecuencia cardíaca, saturación de oxígeno, frecuencia respiratoria, hemograma completo, glucemia, creatinina, urea, sodio, potasio, radiografía de tórax, tomografía computarizada, resonancia magnética, electrocardiograma, ecocardiograma, ecografía, endoscopia, colonoscopia, hipertensión arterial, diabetes mellitus, insuficiencia cardíaca congestiva, fibrilación auricular, infarto agudo de miocardio, accidente cerebrovascular isquémico, neumonía, sepsis, insuficiencia renal aguda, EPOC, asma bronquial, hipotiroidismo, hipertiroidismo, dislipemia, obesidad mórbida, anemia ferropénica, trombosis venosa profunda, embolia pulmonar, cirrosis hepática, pancreatitis aguda, apendicitis aguda, hernia discal, fibromialgia, artritis reumatoide, lupus eritematoso sistémico, omeprazol, metformina, losartán, enalapril, atenolol, simvastatina, atorvastatina, levotiroxina, ibuprofeno, amoxicilina, azitromicina, ciprofloxacino, ceftriaxona, heparina, warfarina, aspirina, metoprolol, amlodipino, hidroclorotiazida, furosemida, espironolactona, prednisona, dexametasona, insulina, prescripción médica, historia clínica, evolución clínica, hipótesis diagnóstica, conducta médica, alta hospitalaria, UCI, urgencias.`,
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

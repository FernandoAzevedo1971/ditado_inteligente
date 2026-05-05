import { Groq } from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";
import { Buffer } from "buffer";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_PROMPTS: Record<SupportedLanguage, string> = {
  pt: "Ditado médico em português brasileiro. Grafias corretas obrigatórias: anamnese, ausculta, ausculta pulmonar, murmúrio vesicular, crepitações, sibilos, roncos, pressão arterial, frequência cardíaca, frequência respiratória, saturação de oxigênio, Glasgow, pupilas isocóricas, fotorreativas, hemograma completo, leucocitose, neutrofilia, plaquetopenia, glicemia, creatinina, ureia, sódio, potássio, TGO, TGP, bilirrubinas, albumina, proteína C-reativa, procalcitonina, D-dímero, troponina, BNP, gasometria arterial, radiografia, tomografia computadorizada, ressonância magnética, eletrocardiograma, ecocardiograma, ultrassonografia, hipertensão arterial sistêmica, diabetes mellitus, insuficiência cardíaca congestiva, fibrilação atrial, flutter atrial, taquicardia supraventricular, infarto agudo do miocárdio, angina instável, acidente vascular cerebral, acidente isquêmico transitório, pneumonia, derrame pleural, pneumotórax, embolia pulmonar, sepse, choque séptico, insuficiência respiratória aguda, síndrome do desconforto respiratório agudo, DPOC, asma, insuficiência renal aguda, insuficiência renal crônica, cirrose hepática, hemorragia digestiva alta, pancreatite aguda, apendicite, colecistite, omeprazol, pantoprazol, metformina, glibenclamida, insulina regular, insulina NPH, losartana, enalapril, captopril, atenolol, metoprolol, carvedilol, anlodipino, hidroclorotiazida, furosemida, espironolactona, sinvastatina, atorvastatina, levotiroxina, dipirona, tramadol, morfina, amoxicilina, ampicilina, ceftriaxona, cefazolina, ciprofloxacino, azitromicina, metronidazol, vancomicina, meropeném, piperacilina-tazobactam, heparina, enoxaparina, varfarina, rivaroxabana, AAS, clopidogrel, prednisona, dexametasona, hidrocortisona, bromoprida, ondansetrona, diazepam, haloperidol, prometazina, prescrição médica, prontuário eletrônico, evolução clínica, sumário de alta, UTI, UPA, SAMU, PA.",
  en: "Medical dictation in English. Correct spellings required: anamnesis, auscultation, breath sounds, vesicular murmur, crackles, wheezes, rhonchi, blood pressure, heart rate, respiratory rate, oxygen saturation, Glasgow coma scale, pupils equal round reactive to light, complete blood count, leukocytosis, neutrophilia, thrombocytopenia, blood glucose, creatinine, urea, sodium, potassium, AST, ALT, bilirubin, albumin, C-reactive protein, procalcitonin, D-dimer, troponin, BNP, arterial blood gas, chest X-ray, CT scan, MRI, ECG, echocardiogram, ultrasound, hypertension, diabetes mellitus, congestive heart failure, atrial fibrillation, atrial flutter, supraventricular tachycardia, acute myocardial infarction, unstable angina, stroke, transient ischemic attack, pneumonia, pleural effusion, pneumothorax, pulmonary embolism, sepsis, septic shock, acute respiratory failure, ARDS, COPD, asthma, acute kidney injury, chronic kidney disease, liver cirrhosis, upper gastrointestinal bleeding, acute pancreatitis, appendicitis, cholecystitis, omeprazole, pantoprazole, metformin, glibenclamide, regular insulin, NPH insulin, losartan, enalapril, captopril, atenolol, metoprolol, carvedilol, amlodipine, hydrochlorothiazide, furosemide, spironolactone, simvastatin, atorvastatin, levothyroxine, acetaminophen, tramadol, morphine, amoxicillin, ampicillin, ceftriaxone, cefazolin, ciprofloxacin, azithromycin, metronidazole, vancomycin, meropenem, piperacillin-tazobactam, heparin, enoxaparin, warfarin, rivaroxaban, aspirin, clopidogrel, prednisone, dexamethasone, hydrocortisone, ondansetron, diazepam, haloperidol, prescription, electronic medical record, clinical notes, discharge summary, ICU, ER.",
  es: "Dictado médico en español. Grafías correctas requeridas: anamnesis, auscultación, murmullo vesicular, crepitantes, sibilancias, roncus, presión arterial, frecuencia cardíaca, frecuencia respiratoria, saturación de oxígeno, escala de Glasgow, pupilas isocóricas fotorreactivas, hemograma completo, leucocitosis, neutrofilia, trombocitopenia, glucemia, creatinina, urea, sodio, potasio, TGO, TGP, bilirrubinas, albúmina, proteína C-reactiva, procalcitonina, dímero-D, troponina, BNP, gasometría arterial, radiografía de tórax, tomografía computarizada, resonancia magnética, electrocardiograma, ecocardiograma, ecografía, hipertensión arterial, diabetes mellitus, insuficiencia cardíaca congestiva, fibrilación auricular, flutter auricular, taquicardia supraventricular, infarto agudo de miocardio, angina inestable, accidente cerebrovascular, accidente isquémico transitorio, neumonía, derrame pleural, neumotórax, tromboembolismo pulmonar, sepsis, choque séptico, insuficiencia respiratoria aguda, SDRA, EPOC, asma, injuria renal aguda, enfermedad renal crónica, cirrosis hepática, hemorragia digestiva alta, pancreatitis aguda, apendicitis, colecistitis, omeprazol, pantoprazol, metformina, glibenclamida, insulina regular, insulina NPH, losartán, enalapril, captopril, atenolol, metoprolol, carvedilol, amlodipino, hidroclorotiazida, furosemida, espironolactona, simvastatina, atorvastatina, levotiroxina, ibuprofeno, tramadol, morfina, amoxicilina, ampicilina, ceftriaxona, cefazolina, ciprofloxacino, azitromicina, metronidazol, vancomicina, meropenem, piperacilina-tazobactam, heparina, enoxaparina, warfarina, rivaroxabán, aspirina, clopidogrel, prednisona, dexametasona, hidrocortisona, ondansetrón, diazepam, haloperidol, receta médica, historia clínica electrónica, evolución clínica, informe de alta, UCI, urgencias.",
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

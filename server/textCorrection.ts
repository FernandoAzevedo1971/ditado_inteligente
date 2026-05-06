import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `VOCÊ É UM REVISOR ESPECIALIZADO EM DITADO MÉDICO E CLÍNICO.

═══ PASSO 1 — DETECTAR MODO ═══
Verifique se o texto contém pedido explícito de tradução.
Exemplos: "traduz para o inglês", "coloca em inglês", "quero em espanhol", "passa para o francês" ou qualquer variação clara.

SE houver pedido de tradução → MODO TRADUÇÃO:
• Remova apenas o comando de tradução; preserve todo o conteúdo restante.
• Traduza com pontuação e paragrafação corretas.
• Retorne "correctedText" com o texto traduzido e "translatedTo" com o nome do idioma em português (ex: "Inglês").

SE NÃO houver pedido de tradução → MODO TRANSCRIÇÃO (siga todos os passos abaixo):

═══ PASSO 2 — CORRIGIR PALAVRAS ═══
• Corrija erros fonéticos de termos médicos (ex: "fibrilão" → "fibrilação", "tensão" → "pressão arterial" se contexto indicar).
• Corrija pontuação: vírgulas, pontos, dois-pontos onde faltam.
• Mantenha rigorosamente o tom original (informal/formal).
• NÃO adicione palavras, conclusões ou explicações que não estavam no ditado.
• NÃO responda perguntas contidas no texto — apenas transcreva.
• Liste em "outOfContextWords" palavras que pareçam erro fonético do Whisper mas que você NÃO conseguiu corrigir com certeza.

═══ PASSO 3 — PARAGRAFAÇÃO (crítico) ═══
Aplique quebra de parágrafo (linha em branco entre blocos) SEMPRE que ocorrer UMA das situações:
  1. Mudança de assunto ou tema clínico (ex: passa de queixa principal para história pregressa)
  2. Mudança de sistema corporal avaliado (ex: de cardiovascular para respiratório)
  3. Início de novo tópico do prontuário (ex: exame físico, hipótese diagnóstica, conduta, prescrição)
  4. Transição entre dados subjetivos e objetivos
  5. Início de lista de medicamentos, exames ou condutas
  6. Qualquer mudança clara de contexto ou interlocutor

REGRA DE OURO: na dúvida entre manter junto ou separar → SEPARE.
Blocos típicos de um prontuário médico que SEMPRE devem estar em parágrafos distintos:
  • Identificação / Queixa principal
  • História da doença atual
  • Antecedentes pessoais / familiares
  • Exame físico geral
  • Exames por sistema (cardiovascular, respiratório, abdome, neurológico…)
  • Hipótese diagnóstica / Diagnóstico
  • Exames solicitados
  • Conduta / Prescrição / Orientações

═══ EXEMPLO OBRIGATÓRIO — siga este padrão de paragrafação ═══
Entrada: "paciente joão silva 45 anos masculino queixa dor no peito há 3 dias nega febre tem hipertensão arterial usa losartana há 2 anos pressão arterial 150 por 90 frequência cardíaca 88 batimentos por minuto ritmo regular ausculta pulmonar murmúrio vesicular presente sem ruídos adventícios abdome sem alterações hipótese diagnóstica angina instável conduta solicitar eletrocardiograma e troponina prescrever AAS 100 miligramas por dia orientar retorno em 24 horas"

Saída correta:
{"correctedText":"Paciente João Silva, 45 anos, masculino. Queixa de dor no peito há 3 dias. Nega febre. Tem hipertensão arterial, usa losartana há 2 anos.\n\nPressão arterial: 150/90 mmHg. Frequência cardíaca: 88 bpm, ritmo regular. Ausculta pulmonar com murmúrio vesicular presente, sem ruídos adventícios. Abdome sem alterações.\n\nHipótese diagnóstica: angina instável.\n\nConduta: solicitar eletrocardiograma e troponina. Prescrever AAS 100 mg/dia. Orientar retorno em 24 horas.","outOfContextWords":[]}

OBSERVE: cada bloco temático (identificação, exame físico, hipótese, conduta) ficou em parágrafo separado com \\n\\n.

═══ FORMATO DE RESPOSTA ═══
Responda EXCLUSIVAMENTE com JSON válido — nenhum texto antes ou depois:
Modo transcrição: { "correctedText": "...", "outOfContextWords": ["palavra1"] }
Modo tradução:    { "correctedText": "...", "outOfContextWords": [], "translatedTo": "Inglês" }`,
    user: `Analise o texto de ditado médico abaixo e responda APENAS com o JSON. Use \\n\\n para separar cada bloco temático, exatamente como no exemplo acima:\n\n`,
  },
  en: {
    system: `YOU ARE A SPECIALIST REVIEWER FOR MEDICAL AND CLINICAL DICTATION.

═══ STEP 1 — DETECT MODE ═══
Check if the text contains an explicit translation request.
Examples: "translate to Spanish", "put it in French", "I want it in German", or any clear variation.

IF translation is requested → TRANSLATION MODE:
• Remove only the translation command; preserve all other content.
• Translate with correct punctuation and paragraphing.
• Return "correctedText" with the translated text and "translatedTo" with the language name in English (e.g., "Spanish").

IF NO translation is requested → TRANSCRIPTION MODE (follow all steps below):

═══ STEP 2 — CORRECT WORDS ═══
• Fix phonetic errors in medical terms (e.g., "hipertention" → "hypertension").
• Fix punctuation: missing commas, periods, colons.
• Strictly maintain the original tone (informal/formal).
• DO NOT add words, conclusions, or explanations not present in the dictation.
• DO NOT answer questions in the text — just transcribe.
• List in "outOfContextWords" words that appear to be Whisper phonetic errors you could NOT correct with certainty.

═══ STEP 3 — PARAGRAPHING (critical) ═══
Apply a paragraph break (blank line between blocks) WHENEVER one of these occurs:
  1. Change of clinical subject or theme (e.g., from chief complaint to past history)
  2. Change of body system being evaluated (e.g., cardiovascular to respiratory)
  3. Start of a new chart section (e.g., physical exam, diagnosis, plan, prescription)
  4. Transition between subjective and objective data
  5. Start of a list of medications, tests, or orders
  6. Any clear change of context

GOLDEN RULE: when in doubt between keeping together or separating → SEPARATE.
Typical medical note sections that MUST always be in separate paragraphs:
  • Identification / Chief complaint
  • History of present illness
  • Past medical / family history
  • General physical exam
  • System exams (cardiovascular, respiratory, abdomen, neurological…)
  • Assessment / Diagnosis
  • Orders / Prescription / Instructions

═══ MANDATORY EXAMPLE — follow this paragraphing pattern ═══
Input: "patient john smith 45 year old male chief complaint chest pain for 3 days denies fever has hypertension uses losartan for 2 years blood pressure 150 over 90 heart rate 88 regular rhythm lung auscultation clear no adventitious sounds abdomen unremarkable assessment unstable angina plan order ECG and troponin prescribe aspirin 100 milligrams per day follow up in 24 hours"

Correct output:
{"correctedText":"Patient John Smith, 45-year-old male. Chief complaint: chest pain for 3 days. Denies fever. Has hypertension, uses losartan for 2 years.\n\nBlood pressure: 150/90 mmHg. Heart rate: 88 bpm, regular rhythm. Lung auscultation clear, no adventitious sounds. Abdomen unremarkable.\n\nAssessment: unstable angina.\n\nPlan: order ECG and troponin. Prescribe aspirin 100 mg/day. Follow up in 24 hours.","outOfContextWords":[]}

NOTE: each thematic block (identification, physical exam, assessment, plan) is in a separate paragraph with \\n\\n.

═══ RESPONSE FORMAT ═══
Reply EXCLUSIVELY with valid JSON — no text before or after:
Transcription mode: { "correctedText": "...", "outOfContextWords": ["word1"] }
Translation mode:   { "correctedText": "...", "outOfContextWords": [], "translatedTo": "Spanish" }`,
    user: `Analyze the medical dictation below and reply ONLY with the JSON. Use \\n\\n to separate each thematic block, exactly as in the example above:\n\n`,
  },
  es: {
    system: `ERES UN REVISOR ESPECIALIZADO EN DICTADO MÉDICO Y CLÍNICO.

═══ PASO 1 — DETECTAR MODO ═══
Verifica si el texto contiene una solicitud explícita de traducción.
Ejemplos: "traduce al inglés", "ponlo en inglés", "quiero en portugués", "pásalo al francés" o cualquier variación clara.

SI hay solicitud de traducción → MODO TRADUCCIÓN:
• Elimina solo el comando de traducción; preserva todo el contenido restante.
• Traduce con puntuación y párrafos correctos.
• Devuelve "correctedText" con el texto traducido y "translatedTo" con el nombre del idioma en español (ej: "Inglés").

SI NO hay solicitud de traducción → MODO TRANSCRIPCIÓN (sigue todos los pasos):

═══ PASO 2 — CORREGIR PALABRAS ═══
• Corrige errores fonéticos en términos médicos (ej: "hipertensión" mal escrito → corrígelo).
• Corrige puntuación: comas, puntos, dos puntos faltantes.
• Mantén rigurosamente el tono original (informal/formal).
• NO añadas palabras, conclusiones ni explicaciones que no estaban en el dictado.
• NO respondas preguntas del texto — solo transcribe.
• Lista en "outOfContextWords" palabras que parezcan error fonético del Whisper que NO pudiste corregir con certeza.

═══ PASO 3 — PÁRRAFOS (crítico) ═══
Aplica un salto de párrafo (línea en blanco entre bloques) SIEMPRE que ocurra UNA de estas situaciones:
  1. Cambio de tema o asunto clínico (ej: de queja principal a antecedentes)
  2. Cambio de sistema corporal evaluado (ej: cardiovascular a respiratorio)
  3. Inicio de una nueva sección del expediente (ej: exploración física, diagnóstico, plan, prescripción)
  4. Transición entre datos subjetivos y objetivos
  5. Inicio de lista de medicamentos, estudios o indicaciones
  6. Cualquier cambio claro de contexto

REGLA DE ORO: ante la duda entre mantener junto o separar → SEPARA.
Secciones típicas que SIEMPRE deben estar en párrafos distintos:
  • Identificación / Motivo de consulta
  • Historia de la enfermedad actual
  • Antecedentes personales / familiares
  • Exploración física general
  • Exploración por sistemas (cardiovascular, respiratorio, abdomen, neurológico…)
  • Juicio clínico / Diagnóstico
  • Estudios solicitados
  • Plan / Prescripción / Indicaciones

═══ EJEMPLO OBLIGATORIO — sigue este patrón de párrafos ═══
Entrada: "paciente juan pérez 45 años masculino motivo consulta dolor torácico hace 3 días niega fiebre tiene hipertensión arterial usa losartán hace 2 años presión arterial 150 sobre 90 frecuencia cardíaca 88 ritmo regular auscultación pulmonar murmullo vesicular presente sin ruidos adventicios abdomen sin alteraciones juicio clínico angina inestable plan solicitar electrocardiograma y troponina prescribir aspirina 100 miligramos por día control en 24 horas"

Salida correcta:
{"correctedText":"Paciente Juan Pérez, 45 años, masculino. Motivo de consulta: dolor torácico hace 3 días. Niega fiebre. Tiene hipertensión arterial, usa losartán hace 2 años.\n\nPresión arterial: 150/90 mmHg. Frecuencia cardíaca: 88 lpm, ritmo regular. Auscultación pulmonar con murmullo vesicular presente, sin ruidos adventicios. Abdomen sin alteraciones.\n\nJuicio clínico: angina inestable.\n\nPlan: solicitar electrocardiograma y troponina. Prescribir aspirina 100 mg/día. Control en 24 horas.","outOfContextWords":[]}

OBSERVA: cada bloque temático (identificación, exploración física, diagnóstico, plan) está en párrafo separado con \\n\\n.

═══ FORMATO DE RESPUESTA ═══
Responde EXCLUSIVAMENTE con JSON válido — ningún texto antes ni después:
Modo transcripción: { "correctedText": "...", "outOfContextWords": ["palabra1"] }
Modo traducción:    { "correctedText": "...", "outOfContextWords": [], "translatedTo": "Inglés" }`,
    user: `Analiza el dictado médico a continuación y responde SÓLO con el JSON. Usa \\n\\n para separar cada bloque temático, exactamente como en el ejemplo de arriba:\n\n`,
  },
};

export async function correctTextWithAI(
  originalText: string,
  language: SupportedLanguage = "pt"
): Promise<{ correctedText: string; outOfContextWords: string[]; translatedTo?: string }> {
  if (!process.env.GROQ_API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        correctedText: originalText,
        outOfContextWords: []
      }), 1500);
    });
  }

  try {
    const prompts = CORRECTION_PROMPTS[language];

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: `${prompts.user}${originalText}` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Llama 3 devolveu uma resposta vazia.");
    }

    try {
      const parsed = JSON.parse(content);
      return {
        correctedText: parsed.correctedText || originalText,
        outOfContextWords: Array.isArray(parsed.outOfContextWords) ? parsed.outOfContextWords : [],
        translatedTo: parsed.translatedTo || undefined,
      };
    } catch (parseError) {
      console.error("Failed to parse JSON from Groq:", content);
      return { correctedText: content, outOfContextWords: [] };
    }
  } catch (error) {
    console.error("Error correcting text with Groq Llama 3:", error);
    throw new Error("Falha ao corrigir texto com IA");
  }
}

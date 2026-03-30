import { Groq } from "groq-sdk";

export type SupportedLanguage = "pt" | "en" | "es";

const PARAGRAPH_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  // prompts same as before
  pt: {
    system: `Você é um especialista em análise de contexto e estruturação de textos em português.

Sua tarefa é analisar o texto fornecido e identificar mudanças de contexto ou tópico entre frases.

Quando detectar uma mudança significativa de contexto (mudança de assunto, mudança de tempo verbal, mudança de perspectiva, mudança de tom, etc.), você deve inserir uma quebra de parágrafo.

REGRAS:
1. Mantenha o texto original intacto, apenas adicione quebras de parágrafo (\n\n)
2. Detecte mudanças de contexto como: mudança de assunto, mudança de tempo, mudança de perspectiva, mudança de tom
3. Não quebre parágrafos por comprimento, apenas por mudança de contexto
4. Retorne APENAS o texto reformatado com quebras de parágrafo, sem explicações

EXEMPLO:
Entrada: "Eu fui ao mercado ontem. Comprei maçãs e laranjas. Meu cachorro é muito fofo. Ele gosta de brincar no parque."

Saída:
"Eu fui ao mercado ontem. Comprei maçãs e laranjas.

Meu cachorro é muito fofo. Ele gosta de brincar no parque."`,
    user: `Por favor, analise este texto e separe em parágrafos detectando mudanças de contexto:\n\n`,
  },
  en: {
    system: `You are an expert in context analysis and text structuring in English.

Your task is to analyze the provided text and identify changes in context or topic between sentences.

When you detect a significant change in context (change of subject, change of tense, change of perspective, change of tone, etc.), you should insert a paragraph break.

RULES:
1. Keep the original text intact, only add paragraph breaks (\n\n)
2. Detect context changes such as: change of subject, change of tense, change of perspective, change of tone
3. Do not break paragraphs by length, only by context change
4. Return ONLY the reformatted text with paragraph breaks, without explanations

EXAMPLE:
Input: "I went to the market yesterday. I bought apples and oranges. My dog is very cute. He likes to play in the park."

Output:
"I went to the market yesterday. I bought apples and oranges.

My dog is very cute. He likes to play in the park."`,
    user: `Please analyze this text and separate it into paragraphs by detecting context changes:\n\n`,
  },
  es: {
    system: `Eres un experto en análisis de contexto y estructuración de textos en español.

Tu tarea es analizar el texto proporcionado e identificar cambios de contexto o tema entre oraciones.

Cuando detectes un cambio significativo de contexto (cambio de tema, cambio de tiempo verbal, cambio de perspectiva, cambio de tono, etc.), debes insertar un salto de párrafo.

REGLAS:
1. Mantén el texto original intacto, solo añade saltos de párrafo (\n\n)
2. Detecta cambios de contexto como: cambio de tema, cambio de tiempo, cambio de perspectiva, cambio de tono
3. No rompas párrafos por longitud, solo por cambio de contexto
4. Devuelve SOLO el texto reformateado con saltos de párrafo, sin explicaciones

EJEMPLO:
Entrada: "Fui al mercado ayer. Compré manzanas y naranjas. Mi perro es muy lindo. Le gusta jugar en el parque."

Salida:
"Fui al mercado ayer. Compré manzanas y naranjas.

Mi perro es muy lindo. Le gusta jugar en el parque."`,
    user: `Por favor, analiza este texto y sepáralo en párrafos detectando cambios de contexto:\n\n`,
  },
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export async function separateParagraphsByContext(
  text: string,
  language: SupportedLanguage = "pt"
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    return text + "\n\n[Sem API Key: Parágrafos não foram separados automaticamente]";
  }

  try {
    const prompts = PARAGRAPH_PROMPTS[language];

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: `${prompts.user}${text}` },
      ],
      model: "llama-3.1-8b-instant", // Modelo leve/rápido para separar parágrafos
      temperature: 0.1,
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Llama 3 devolveu resposta vazia para separação de parágrafos");
    }

    return content;
  } catch (error) {
    console.error("Error separating paragraphs with Groq:", error);
    return text; // Fallback: retorna o texto original em caso de falha, ao invés de quebrar o app inteiro
  }
}


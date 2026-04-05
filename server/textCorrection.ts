import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `VOCÊ É UM CORRETOR GRAMATICAL ESTRITO.
SUA ÚNICA TAREFA É CORRIGIR ORTOGRAFIA, PONTUAÇÃO, GRAMÁTICA E ESTRUTURA DO TEXTO EM PORTUGUÊS.

REGRAS ABSOLUTAS:
- RETORNE APENAS O TEXTO CORRIGIDO EM PORTUGUÊS.
- NUNCA TRADUZA PARA O INGLÊS OU QUALQUER OUTRA LÍNGUA.
- NUNCA DÊ SUGESTÕES DE TRADUÇÃO.
- IDENTIFIQUE MUDANÇAS DE CONTEXTO, TÓPICO OU PAUSAS E ADICIONE QUEBRAS DE PARÁGRAFO (\n\n) QUANDO NECESSÁRIO PARA MELHORAR A LEITURA.
- NUNCA ADICIONE COMENTÁRIOS, INTRODUÇÕES OU CONCLUSÕES.
- NÃO USE FRASES COMO "AQUI ESTÁ O TEXTO", "TEXTO CORRIGIDO:" OU QUALQUER EXPLICAÇÃO.
- MANTENHA A ESSÊNCIA E AS PALAVRAS DO ORIGINAL, MAS AJUSTE A ESTRUTURA SE NECESSÁRIO PARA CLAREZA.
- SE O TEXTO JÁ ESTIVER CORRETO, RETORNE O MESMO TEXTO SEM ALTERAR NADA.`,
    user: `Corrija a pontuação, ortografia, gramática e separe em parágrafos por contexto o texto abaixo. Mantenha o texto estritamente em português:\n\n`,
  },
  en: {
    system: `YOU ARE A STRICT GRAMMAR CORRECTOR.
YOUR ONLY TASK IS TO CORRECT SPELLING, PUNCTUATION AND GRAMMAR.

ABSOLUTE RULES:
- RETURN ONLY THE CORRECTED TEXT.
- NEVER ADD COMMENTS, INTROS, OR CONCLUSIONS.
- DO NOT USE PHRASES LIKE "HERE IS THE TEXT", "CORRECTED TEXT:" OR ANY EXPLANATION.
- KEEP EXACTLY THE SAME WORDS FROM THE ORIGINAL.
- DO NOT ADD PARAGRAPH BREAKS OR EXTRA FORMATTING.
- IF THE TEXT IS ALREADY CORRECT, RETURN IT IDENTICALLY.`,
    user: `Correct only punctuation, spelling and grammar of the text below, keeping original words:\n\n`,
  },
  es: {
    system: `ERES UN CORRECTOR GRAMATICAL ESTRICTO.
TU ÚNICA TAREA ES CORREGIR ORTOGRAFÍA, PUNTUACIÓN Y GRAMÁTICA.

REGLAS ABSOLUTAS:
- DEVUELVE ÚNICAMENTE EL TEXTO CORREGIDO.
- NUNCA AÑADAS COMENTARIOS, INTRODUCCIONES O CONCLUSIONES.
- NO USES FRASES COMO "AQUÍ ESTÁ EL TEXTO", "TEXTO CORREGIDO:" NI NINGUNA EXPLICACIÓN.
- MANTÉN EXACTAMENTE LAS MISMAS PALABRAS DEL ORIGINAL.
- NO AÑADAS SALTOS DE PÁRRAFO O FORMATO EXTRA.
- SI EL TEXTO YA ES CORRECTO, DEVUÉLVELO IDENTICAMENTE.`,
    user: `Corrige sólo la puntuación, ortografía y gramática del texto a continuación, manteniendo las palabras originales:\n\n`,
  },
};

export async function correctTextWithAI(originalText: string, language: SupportedLanguage = "pt"): Promise<string> {
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.GROQ_API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => resolve(originalText), 1500);
    });
  }

  try {
    const prompts = CORRECTION_PROMPTS[language];

    // Passo 1: Chama a API do Llama 3 v70b no Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: `${prompts.user}${originalText}` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // Temperatura baixa para garantir que siga regras de não adicionar enrolação ao final
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Llama 3 devolveu uma resposta vazia.");
    }

    // Passo 2: Retornamos o texto corrigido diretamente para evitar interpretações de contexto indesejadas
    return content;
  } catch (error) {
    console.error("Error correcting text with Groq Llama 3:", error);
    throw new Error("Falha ao corrigir texto com IA");
  }
}

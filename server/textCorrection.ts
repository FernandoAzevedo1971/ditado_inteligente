import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `VOCÊ É UM CORRETOR GRAMATICAL ESTRITO ESPECIALIZADO EM CONTEXTOS CLÍNICOS E PROFISSIONAIS.
SUA TAREFA É TRANSFORMAR A TRANSCRIÇÃO DE VOZ EM UM TEXTO ESTRUTURADO E PROFISSIONAL.

REGRAS CRÍTICAS DE ESTRUTURAÇÃO:
1. PARAGRAFAÇÃO POR CONTEXTO: Insira quebras de parágrafo (\n\n) sempre que houver uma transição de tópico. Em contextos médicos, identifique mudanças como: Anamnese -> Exame Físico -> Hipótese Diagnóstica -> Conduta.
2. CONCLUSÃO DE RACIOCÍNIO: Identifique pontos onde um pensamento parece ser concluído e inicie um novo parágrafo.
3. FLUXO CLÍNICO: O texto deve fluir como um relatório médico ou nota de evolução.

REGRAS ABSOLUTAS DE SAÍDA:
- RETORNE APENAS O TEXTO CORRIGIDO EM PORTUGUÊS.
- NUNCA TRADUZA PARA OUTRA LÍNGUA NEM DÊ SUGESTÕES.
- NUNCA ADICIONE COMENTÁRIOS, INTRODUÇÕES ("Aqui está o texto...") OU CONCLUSÕES.
- MANTENHA A ESSÊNCIA DAS PALAVRAS ORIGINAIS, MAS AJUSTE A PONTUAÇÃO E GRAMÁTICA PARA MÁXIMA CLAREZA.
- SE O TEXTO JÁ ESTIVER PERFEITO, RETORNE-O IDENTICAMENTE.`,
    user: `Corrija e estruture o texto abaixo em parágrafos profissionais baseados em transições de contexto clínico. Mantenha estritamente em português:\n\n`,
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

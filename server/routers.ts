import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { z } from "zod";
import { transcribeAudioFile, type SupportedLanguage } from "./transcription.js";
import { correctTextWithAI, type SupportedLanguage as CorrectionLanguage } from "./textCorrection.js";
import { applyVoiceCorrections } from "./voiceCorrections.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LANGUAGE_ENUM = z.enum(["pt", "en", "es", "auto"]);

export const appRouter = router({
  system: systemRouter,

  audio: router({
    transcribe: publicProcedure
      .input(z.object({ 
        audioData: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        // Remove o prefixo "data:audio/webm;base64," se existir
        const base64Data = input.audioData.includes(",") 
          ? input.audioData.split(",")[1] 
          : input.audioData;
        
        const buffer = Buffer.from(base64Data, 'base64');
        const tempFilePath = path.join(os.tmpdir(), `audio-trpc-${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, buffer);

        // Se language é "auto", deixa undefined para detecção automática
        const lang = input.language === "auto" ? undefined : (input.language as SupportedLanguage);
        const transcribedText = await transcribeAudioFile(tempFilePath, lang);
        
        fs.unlinkSync(tempFilePath);
        return { text: transcribedText };
      }),
  }),

  text: router({
    correct: publicProcedure
      .input(z.object({ 
        text: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        // Se language é "auto", deixa undefined para detecção automática
        const lang = input.language === "auto" ? undefined : (input.language as CorrectionLanguage);
        const correctedText = await correctTextWithAI(input.text, lang);
        return { correctedText };
      }),
    applyVoiceCorrections: publicProcedure
      .input(z.object({
        correctedText: z.string(),
        voiceCorrections: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        // Se language é "auto", usa "pt" como padrão para voiceCorrections
        const lang: CorrectionLanguage = (input.language === "auto" ? "pt" : input.language) as CorrectionLanguage;
        const finalText = await applyVoiceCorrections(
          input.correctedText,
          input.voiceCorrections,
          lang
        );
        return { finalText };
      }),
  }),
});

export type AppRouter = typeof appRouter;

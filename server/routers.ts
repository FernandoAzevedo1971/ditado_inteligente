import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { z } from "zod";
import { transcribeAudioFile, type SupportedLanguage } from "./transcription.js";
import { correctTextWithAI, type SupportedLanguage as CorrectionLanguage } from "./textCorrection.js";
import { applyVoiceCorrections } from "./voiceCorrections.js";
import {
  incrementDictationCount,
  getUserSubscriptionInfo,
  updateSubscription,
  completeRegistration,
  grantFreeAccess,
  revokeFreeAccess,
  listFreeAccessUsers,
} from "./db.js";
import {
  FREE_DICTATION_LIMIT,
  PAYMENT_REQUIRED_ERR_MSG,
  PHONE_IN_USE_ERR_MSG,
} from "../shared/const.js";
import { TRPCError } from "@trpc/server";
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
        const base64Data = input.audioData.includes(",")
          ? input.audioData.split(",")[1]
          : input.audioData;

        const buffer = Buffer.from(base64Data, "base64");
        const tempFilePath = path.join(os.tmpdir(), `audio-trpc-${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, buffer);

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
        const lang = input.language === "auto" ? undefined : (input.language as CorrectionLanguage);
        const result = await correctTextWithAI(input.text, lang);
        return {
          correctedText: result.correctedText,
          outOfContextWords: result.outOfContextWords,
          translatedTo: result.translatedTo,
        };
      }),

    applyVoiceCorrections: publicProcedure
      .input(z.object({
        correctedText: z.string(),
        voiceCorrections: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        const lang: CorrectionLanguage = (input.language === "auto" ? "pt" : input.language) as CorrectionLanguage;
        const finalText = await applyVoiceCorrections(
          input.correctedText,
          input.voiceCorrections,
          lang
        );
        return { finalText };
      }),
  }),

  // User profile & registration
  user: router({
    getProfile: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        return { role: "user" as const, freeAccess: false, registrationComplete: true, email: null };
      }
      return {
        role: ctx.user.role,
        freeAccess: ctx.user.freeAccess ?? false,
        // If column missing (pre-migration), default to true to avoid blocking users
        registrationComplete: ctx.user.registrationComplete ?? true,
        email: ctx.user.email ?? null,
      };
    }),

    completeRegistration: publicProcedure
      .input(z.object({
        email: z.string().email(),
        phone: z.string().min(8).max(30),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário" });
        }
        try {
          await completeRegistration(ctx.user.openId, { email: input.email, phone: input.phone });
          return { success: true };
        } catch (err: any) {
          if (err.message === "PHONE_IN_USE") {
            throw new TRPCError({ code: "CONFLICT", message: PHONE_IN_USE_ERR_MSG });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao salvar cadastro" });
        }
      }),
  }),

  // Subscription & billing routes
  subscription: router({
    getInfo: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        return {
          dictationCount: 0,
          dictationsRemaining: FREE_DICTATION_LIMIT,
          subscriptionStatus: "free" as const,
          isPremium: false,
          limit: FREE_DICTATION_LIMIT,
        };
      }

      const info = await getUserSubscriptionInfo(ctx.user.openId);
      if (!info) {
        return {
          dictationCount: 0,
          dictationsRemaining: FREE_DICTATION_LIMIT,
          subscriptionStatus: "free" as const,
          isPremium: false,
          limit: FREE_DICTATION_LIMIT,
        };
      }

      const isExpired = info.subscriptionExpiry && new Date(info.subscriptionExpiry) < new Date();
      const effectiveStatus = isExpired && info.subscriptionStatus === "active"
        ? "expired"
        : info.subscriptionStatus;

      const isPremium = effectiveStatus === "active" || info.role === "admin" || info.freeAccess === true;
      const remaining = isPremium
        ? Infinity
        : Math.max(0, FREE_DICTATION_LIMIT - info.dictationCount);

      return {
        dictationCount: info.dictationCount,
        dictationsRemaining: remaining,
        subscriptionStatus: effectiveStatus,
        isPremium,
        limit: FREE_DICTATION_LIMIT,
      };
    }),

    recordDictation: publicProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário" });
      }

      if (ctx.user.role === "admin" || ctx.user.freeAccess) {
        return { allowed: true, count: 0, remaining: Infinity };
      }

      const info = await getUserSubscriptionInfo(ctx.user.openId);
      const isPremium = info?.subscriptionStatus === "active";

      if (!isPremium && info && info.dictationCount >= FREE_DICTATION_LIMIT) {
        throw new TRPCError({ code: "FORBIDDEN", message: PAYMENT_REQUIRED_ERR_MSG });
      }

      const newCount = await incrementDictationCount(ctx.user.openId);
      const remaining = isPremium ? Infinity : Math.max(0, FREE_DICTATION_LIMIT - newCount);

      return { allowed: true, count: newCount, remaining };
    }),

    validatePurchase: publicProcedure
      .input(z.object({
        purchaseToken: z.string(),
        productId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário" });
        }

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);

        await updateSubscription(
          ctx.user.openId,
          "active",
          expiryDate,
          input.purchaseToken
        );

        return { success: true, expiresAt: expiryDate.toISOString() };
      }),
  }),

  // Admin routes — only accessible to users with role = 'admin'
  admin: router({
    listFreeAccessUsers: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso negado" });
      }
      return listFreeAccessUsers();
    }),

    grantFreeAccess: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso negado" });
        }
        await grantFreeAccess(input.email);
        return { success: true };
      }),

    revokeFreeAccess: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso negado" });
        }
        await revokeFreeAccess(input.email);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

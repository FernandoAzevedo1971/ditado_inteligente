import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { transcribeAudioFile } from "../transcription.js";
import { transcribeWithMistral } from "../transcription-mistral.js";

const app = express();

// Configure multer for /tmp storage
const upload = multer({ dest: os.tmpdir() });

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Audio Transcription REST API (supports larger files than tRPC/JSON)
app.post("/api/audio/transcribe", upload.single("file"), async (req: express.Request, res: express.Response) => {
  try {
    const multerReq = req as any;
    if (!multerReq.file) {
      return res.status(400).json({ error: "Nenhum arquivo de áudio enviado." });
    }

    const originalFilePath = multerReq.file.path;
    const filePath = originalFilePath + ".webm";
    fs.renameSync(originalFilePath, filePath);

    const provider = req.body.provider || "groq"; // groq | mistral
    const language = req.body.language || "pt";

    console.log(`[API] Transcrevendo com ${provider} (arquivo: ${multerReq.file.originalname})`);

    let transcribedText = "";

    if (provider === "mistral") {
      transcribedText = await transcribeWithMistral(filePath, language);
    } else {
      transcribedText = await transcribeAudioFile(filePath, language);
    }

    // Cleanup
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ text: transcribedText });
  } catch (error: any) {
    console.error("[API] Erro na transcrição:", error);
    res.status(500).json({ error: error.message || "Erro interno no servidor" });
  }
});

// OAuth callback under /api/oauth/callback
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// We don't call setupVite or serveStatic here because they depend on environment/context
// and we want this 'app' to be clean for Vercel functions as well.

export default app;

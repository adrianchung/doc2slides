import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateRouter } from "./routes/generate.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/generate", generateRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Doc2Slides backend running on port ${PORT}`);
  console.log(`Gemini API key configured: ${process.env.GEMINI_API_KEY ? "Yes (" + process.env.GEMINI_API_KEY.slice(0, 10) + "...)" : "No"}`);
});

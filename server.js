require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const PROMPT = `You are an expert currency recognition AI. Analyze this image and identify any money/currency present.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "detected": true or false,
  "currencies": [
    {
      "currency_name": "Full currency name (e.g. Ghanaian Cedi, US Dollar)",
      "currency_code": "ISO code (e.g. GHS, USD, KWD)",
      "symbol": "Currency symbol (e.g. ₵, $)",
      "country": "Country of origin",
      "denomination": "The denomination shown (e.g. 50, 100, 1)",
      "amount": numeric value as number,
      "note_or_coin": "note or coin",
      "condition": "new, good, worn, or damaged",
      "confidence": "high, medium, or low"
    }
  ],
  "total_by_currency": [
    {
      "currency_code": "ISO code",
      "currency_name": "Full name",
      "symbol": "Symbol",
      "total": total numeric amount
    }
  ],
  "multiple_currencies": true or false,
  "image_quality": "clear, blurry, or partial",
  "notes": "Any additional observations about the money"
}

If no currency is detected, set detected to false and return empty arrays.`;

app.post("/api/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image provided." });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "OPENROUTER_API_KEY not configured." });
    }

    const base64Image = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-11b-vision-instruct:free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mediaType};base64,${base64Image}` },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";

    let result;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { detected: false, error: "Could not parse AI response" };
    }

    res.json({ success: true, result });
  } catch (err) {
    console.error("Detection error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", apiKeySet: !!process.env.OPENROUTER_API_KEY });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n💰 Currency Detector running at http://localhost:${PORT}`);
  console.log(`   OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? "✓ Set" : "✗ Missing"}\n`);
});
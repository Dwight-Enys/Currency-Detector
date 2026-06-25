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
    else cb(new Error("Only image files are allowed (JPEG, PNG, WebP, GIF)"));
  },
});

const PROMPT = `You are an expert currency recognition AI. Analyze this image carefully and identify any money/currency present.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "detected": true or false,
  "currencies": [
    {
      "currency_name": "Full currency name (e.g. Ghanaian Cedi, US Dollar, Kuwaiti Dinar)",
      "currency_code": "ISO code (e.g. GHS, USD, KWD)",
      "symbol": "Currency symbol (e.g. ₵, $, د.ك)",
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

If no currency is detected, set "detected" to false and return empty arrays.
Detect ALL currencies you can see, including: USD, EUR, GBP, GHS (Cedi), KWD (Kuwaiti Dinar), NGN (Naira), JPY, CNY, INR, AUD, CAD, and any other world currency.`;

// Currency detection endpoint
app.post("/api/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image provided." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return res.status(500).json({
        success: false,
        error: "API key not configured. Please set GEMINI_API_KEY in your environment variables.",
      });
    }

    const base64Image = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype;

    // Call Gemini Vision API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mediaType,
                    data: base64Image,
                  },
                },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let result;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { detected: false, error: "Could not parse AI response", raw: rawText };
    }

    res.json({ success: true, result });
  } catch (err) {
    console.error("Detection error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    apiKeySet: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here"),
  });
});

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n💰 Currency Detector running at http://localhost:${PORT}`);
  console.log(`   Gemini API Key: ${process.env.GEMINI_API_KEY ? "✓ Set" : "✗ Missing — set GEMINI_API_KEY in environment"}\n`);
});
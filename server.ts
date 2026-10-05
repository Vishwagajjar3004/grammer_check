import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    aiEnabled: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Deep AI Proofreader Endpoint
app.post("/api/proofread", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Text is required and must be a string." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY environment variable is not configured. Please add your key in Settings > Secrets." 
      });
    }

    const systemInstruction = `You are a professional grammar assistant and stylistic editor.
Analyze the user's input text for spelling mistakes, grammatical errors, subject-verb disagreements, punctuation issues, and stylistic problems (like passive voice, run-on sentences, wordiness, or tone inconsistencies).

For each issue found, you must return:
1. "word": The exact substring in the original text that is incorrect or needs improvement.
2. "suggestions": An array of recommended replacements (at least 1, up to 3).
3. "type": One of: 'spelling', 'grammar', 'capitalization', 'punctuation', 'style'.
4. "message": A clear, concise description of the issue.
5. "explanation": A helpful explanation of the rule or why the style should be improved.

CRITICAL POSITIONING INSTRUCTIONS:
- You MUST find the exact 0-based character "index" of the "word" in the original text.
- Double-check your "index" calculations. The first character of the text is index 0.
- Ensure "length" is the exact character length of the "word" string.
- If the same error appears multiple times, create separate entries with different indices.
- Do not skip spaces when counting. Make sure indices match the original text exactly so that highlighting and replacement works perfectly.
- If there are no issues, return an empty array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Find and detail all grammar, spelling, punctuation, and stylistic issues in the following text. Determine the exact index positions.
Text:
"""
${text}
"""`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of errors detected in the text with precise indices",
          items: {
            type: Type.OBJECT,
            required: ["word", "suggestions", "type", "message", "explanation"],
            properties: {
              word: {
                type: Type.STRING,
                description: "The exact incorrect word or phrase in the original text"
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Ranked list of corrections"
              },
              type: {
                type: Type.STRING,
                description: "The type of error"
              },
              message: {
                type: Type.STRING,
                description: "Short message describing the error"
              },
              explanation: {
                type: Type.STRING,
                description: "Longer grammar rule explanation or style guide recommendation"
              }
            }
          }
        }
      }
    });

    const parsedText = response.text || "[]";
    let rawErrors = JSON.parse(parsedText.trim());

    // Post-process to ensure correct index values
    const processedErrors = rawErrors.map((err: any, idx: number) => {
      // Find the index dynamically if the model didn't calculate or got it wrong, 
      // or to verify the model's index.
      let computedIndex = text.indexOf(err.word);
      if (computedIndex === -1) {
        // Fallback search case-insensitive
        computedIndex = text.toLowerCase().indexOf(err.word.toLowerCase());
      }

      // If we still can't find it, we default to 0
      const index = computedIndex !== -1 ? computedIndex : 0;
      const length = err.word.length;

      return {
        id: `ai-error-${idx}-${Date.now()}`,
        word: err.word,
        originalWord: err.word,
        index,
        length,
        suggestions: err.suggestions || [],
        type: ['spelling', 'grammar', 'capitalization', 'punctuation', 'style'].includes(err.type) ? err.type : 'grammar',
        message: err.message,
        explanation: err.explanation || ""
      };
    }).filter((err: any) => err.length > 0);

    res.json({ errors: processedErrors });
  } catch (err: any) {
    console.error("AI Proofread Error:", err);
    res.status(500).json({ error: err.message || "Failed to process AI proofreading request." });
  }
});

// Deep AI Rewrite / Tone Adjuster Endpoint
app.post("/api/rewrite", async (req, res) => {
  try {
    const { text, tone } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Text is required and must be a string." });
    }
    if (!tone || typeof tone !== 'string') {
      return res.status(400).json({ error: "Tone is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY environment variable is not configured. Please add your key in Settings > Secrets." 
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Rewrite the following text to have a ${tone} tone. Keep the core information and meaning intact, but polish the structure, flow, vocabulary, and sentence variety to perfectly fit the requested tone.
Original Text:
"""
${text}
"""`,
      config: {
        systemInstruction: `You are a master of styles and tones. Rewrite the provided text according to the requested tone:
- professional: authoritative, clear, polite, and industry-standard formatting.
- casual: conversational, friendly, warm, and natural.
- academic: formal, objective, precise, structured, and well-phrased.
- shorten: highly concise, dense, clear, cutting out any fluff.
- expand: elaborate, descriptive, expressive, and detailed.

Return the result in JSON format.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["rewrittenText", "explanation"],
          properties: {
            rewrittenText: {
              type: Type.STRING,
              description: "The complete rewritten text"
            },
            explanation: {
              type: Type.STRING,
              description: "A short professional summary of the stylistic changes made and why"
            }
          }
        }
      }
    });

    const resultJson = JSON.parse((response.text || "{}").trim());
    res.json(resultJson);
  } catch (err: any) {
    console.error("AI Rewrite Error:", err);
    res.status(500).json({ error: err.message || "Failed to rewrite text." });
  }
});

// Import Vite dynamic server module for middleware
const setupVite = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
};

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error("Vite server initialization failed:", err);
});

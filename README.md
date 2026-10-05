# gemini grammer-check
 grammer check
# Deep AI & Offline Proofreader

An elegant, real-time proofreading editor and stylist featuring a custom high-performance local heuristics engine combined with a powerful server-side Gemini 3.5 Flash intelligence layer.

## 🚀 Architecture Overview

This application operates in a hybrid mode to deliver immediate feedback with high accuracy:

1. **Offline Rules Engine**: 
   - Uses a custom Levenshtein Distance matrix and BK-Tree dictionary lookup.
   - Executes spelling, grammar, punctuation, and capitalisation checks directly in the browser (completely client-side).
   - Monitors active structures including continuous form shifting and active voice recommendations.

2. **Server-Side AI Engine (Gemini 3.5 Flash)**:
   - Activates when clicking **AI Deep Check** or switching to **AI Engine**.
   - Leverages full semantic and context-aware styling over a dedicated Express backend proxy (`/api/proofread` & `/api/rewrite`).
   - Ensures perfect API security by holding credentials safely on the server side (avoiding public exposure).

3. **AI Co-Pilot & Styles**:
   - Offers instant dynamic text rewriting and tone transitions (Professional, Casual, Academic, Concise, Descriptive).
   - Translates or adjusts texts using custom prompt inputs.

---

## 🛠️ Features

- **Split Editor/Reviewer View**: Direct drafting or focused markup check layouts.
- **Dynamic Live Tense Shift**: Automatically detects and offers direct/active alternatives for:
  - Past Continuous (`was/were going` ➔ `am going` / `will go` / `goes`)
  - Conditional (`would be going` / `would go` ➔ `am going` / `will go`)
  - Future Continuous (`will be going` ➔ `will go`)
  - Present Continuous (`am/is/are going` ➔ `goes` / `will go`)
- **Aesthetic Stats Dashboard**: Live readability metrics, spell counters, styling grades, and performance metadata.
- **Lexicon Manager**: Custom dictionary editor to ignore, append, or manage user spelling exemptions.

---

## 💻 Tech Stack

- **Frontend**: React (v18), Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Express (Node.js), TypeScript, Google GenAI SDK (`@google/genai`)
- **Database / Storage**: Local Storage persistent caches

---

## ⚙️ Setup and Installation

### 1. Requirements
Ensure you have **Node.js** (v18+) and **npm** installed.

### 2. Configure Environment Variables
Duplicate `.env.example` as `.env` and configure your API key securely:
```env
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
Install dependencies and launch the dev server on standard port `3000`:
```bash
npm install
npm run dev
```

### 4. Build for Production
To bundle the frontend assets and compile the server entry point (`server.ts`):
```bash
npm run build
npm start
```
The application will bundle optimized client files and compile the Express wrapper directly to `dist/server.cjs` using `esbuild`.

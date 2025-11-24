import { useState, useEffect, useCallback } from "react";
import { FiCopy, FiCheck, FiEdit3, FiLoader } from "react-icons/fi";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ThemeToggle from "./components/ThemeToggle";

// 🔑 1-liner: put your key here or in .env as VITE_GEMINI_KEY
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_KEY || "YOUR_GEMINI_KEY");

const TONE_COLORS = {
  Positive: "text-emerald-500",
  Negative: "text-rose-500",
  Neutral: "text-sky-500",
};

const countWords = (str) => str.trim().split(/\s+/).filter(Boolean).length;

export default function App() {
  const [text, setText] = useState(localStorage.getItem("lastText") || "");
  const [tone, setTone] = useState("Neutral");
  const [suggestions, setSuggestions] = useState([]);
  const [improved, setImproved] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ---------- real-time tone + suggestions ---------- */
  useEffect(() => {
    const lower = text.toLowerCase();
    let t = "Neutral";
    if (/hate|angry|terrible/.test(lower)) t = "Negative";
    if (/love|great|amazing/.test(lower)) t = "Positive";
    setTone(t);

    const list = [];
    if (text.length < 30) list.push("Consider adding more detail.");
    if (!/because|since|therefore/.test(lower) && text.length > 40)
      list.push("Add reasoning or examples.");
    const words = countWords(text);
    if (words > 60) list.push("Try splitting into shorter sentences.");
    if (words < 5 && text.length) list.push("A single sentence is too brief.");
    setSuggestions(list);
    localStorage.setItem("lastText", text);
  }, [text]);

  /* ---------- Gemini rewrite ---------- */
  const improve = useCallback(
    async (mode) => {
      if (!text.trim()) return;
      setLoading(true);
      try {
        const prompt =
          mode === "expand"
            ? `Expand this into a clear 120-word paragraph:\n\n${text}`
            : mode === "shorten"
            ? `Shorten this to <30 words while keeping meaning:\n\n${text}`
            : `Rewrite this in a professional tone:\n\n${text}`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        setImproved(result.response.text() || "No response");
      } catch {
        setImproved("⚠️  Could not reach Gemini");
      } finally {
        setLoading(false);
      }
    },
    [text]
  );

  const copy = () => {
    navigator.clipboard.writeText(improved || text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-800 dark:to-black text-slate-800 dark:text-slate-100 font-inter p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="font-poppins text-3xl font-bold flex items-center gap-2">
            <FiEdit3 /> AI Writing Assistant (Gemini)
          </h1>
          <ThemeToggle />
        </header>

        {/* textarea */}
        <div className="relative">
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing… Gemini will help."
            className="w-full p-4 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md
                       border border-transparent focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
          <div className="absolute bottom-2 right-3 text-xs text-slate-500">
            {countWords(text)} words / {text.length} chars
          </div>
        </div>

        {/* tone + suggestions */}
        {text && (
          <div className="p-4 rounded-2xl bg-white/30 dark:bg-gray-800/30 backdrop-blur-md">
            <p className="font-semibold">
              Tone: <span className={TONE_COLORS[tone]}>{tone}</span>
            </p>
            {suggestions.length > 0 && (
              <ul className="list-disc list-inside mt-1">
                {suggestions.map((s, i) => (
                  <li key={i} className="text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Gemini buttons */}
        <div className="flex gap-3 flex-wrap">
          {["expand", "shorten", "formalize"].map((m) => (
            <button
              key={m}
              onClick={() => improve(m)}
              disabled={loading || !text.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium
                         disabled:bg-gray-400 disabled:cursor-not-allowed
                         hover:bg-indigo-700 transition"
            >
              {loading && m === "expand" ? <FiLoader className="animate-spin" /> : m}
            </button>
          ))}
        </div>

        {/* improved output */}
        {improved && (
          <div className="relative p-4 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md">
            <h2 className="font-semibold mb-2">Gemini rewrite</h2>
            <p className="whitespace-pre-wrap">{improved}</p>
            <button
              onClick={copy}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/10 dark:bg-white/10"
              title="Copy"
            >
              {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
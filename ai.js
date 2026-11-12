import { GoogleGenAI } from "@google/genai";
import { contacts } from "./contacts.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Comma-separated list in .env (GEMINI_MODELS=a,b) or a single GEMINI_MODEL
const MODELS = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || "gemini-3.8-flash")
  .split(",").map((s) => s.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(name) {
  const d = new Date();
  let diff = (DAYS.indexOf(name.toLowerCase()) - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Local rule-based parser: no API needed
function fallbackParse(text) {
  const names = Object.keys(contacts);

  const unknown = [...text.matchAll(/\b(?:pay|invoice|send)\s+([a-z]+)\s+\$?\d/gi)]
    .map((m) => m[1].toLowerCase())
    .find((n) => !names.includes(n));
  if (unknown) {
    return { actions: [], unclear: `I don't know a contact named "${unknown}". Known contacts: ${names.join(", ")}.` };
  }

  const re = new RegExp(`\\b(pay|invoice|send)\\b|\\b(${names.join("|")})\\b\\s*\\$?(\\d+(?:\\.\\d+)?)`, "gi");
  let type = "payout";
  const actions = [];
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) { type = m[1].toLowerCase() === "invoice" ? "invoice" : "payout"; continue; }
    const rest = text.slice(re.lastIndex).split(/\b(?:pay|invoice|send)\b/i)[0];
    const desc = rest.match(/^\s*for\s+(.+?)(?=,|\s+due\b|\s+and\b|$)/i);
    const due = rest.match(/\bdue\s+(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    actions.push({
      type,
      contact: m[2].toLowerCase(),
      amount: parseFloat(m[3]),
      description: desc ? desc[1].trim() : type === "invoice" ? "Invoice" : "Payment",
      dueDate: type === "invoice" ? (due ? nextWeekday(due[1]) : inDays(7)) : null,
    });
  }

  if (!actions.length) {
    return { actions: [], unclear: "I couldn't find a contact and amount. Try: \"Pay Meera $50\" or \"Invoice Ravi $200 for logo design, due Friday\"." };
  }
  return { actions, unclear: null };
}

export async function parseCommand(text) {
  const today = new Date().toISOString().slice(0, 10);
  const config = {
    responseMimeType: "application/json",
    systemInstruction: `You convert payment requests into JSON. Today is ${today}.
Known contacts: ${Object.keys(contacts).join(", ")}.
Return ONLY JSON in this shape:
{"actions":[{"type":"invoice"|"payout","contact":"<name>","amount":<number>,"description":"<string>","dueDate":"YYYY-MM-DD or null"}],
 "unclear": "<question for user, or null>"}
If a name isn't a known contact or an amount is missing, set "unclear" instead of guessing.`,
  };

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents: text, config });
        return JSON.parse(response.text);
      } catch (e) {
        if (e.status === 404) { console.log(`Model ${model} not available, skipping.`); break; }
        if (e.status === 503 || e.status === 429) {
          console.log(`${model} busy (attempt ${attempt}/3)...`);
          await sleep(1500 * attempt);
          continue;
        }
        console.log(`${model} error: ${e.message}`);
        break;
      }
    }
  }

  console.log("Gemini unavailable. Using local fallback parser.");
  return fallbackParse(text);
}

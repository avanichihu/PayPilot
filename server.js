import "dotenv/config";
import express from "express";
import { parseCommand } from "./ai.js";
import { contacts } from "./contacts.js";
import { sendPayouts, createAndSendInvoice } from "./paypal.js";

const MAX_AMOUNT = 500;
const app = express();
app.use(express.json());
app.use(express.static("public"));

// Parsing never moves money
app.post("/parse", async (req, res) => {
  try {
    res.json(await parseCommand(String(req.body.text || "")));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Only runs what the user confirmed, after validation
app.post("/execute", async (req, res) => {
  try {
    const actions = req.body.actions;
    if (!Array.isArray(actions) || !actions.length) throw new Error("No actions to run");

    for (const a of actions) {
      if (!contacts[String(a.contact || "").toLowerCase()]) throw new Error(`Unknown contact: ${a.contact}`);
      if (!["payout", "invoice"].includes(a.type)) throw new Error(`Bad action type: ${a.type}`);
      const amt = Number(a.amount);
      if (!(amt > 0) || amt > MAX_AMOUNT) throw new Error(`Amount for ${a.contact} must be between $0 and $${MAX_AMOUNT}`);
    }

    const results = [];
    const payouts = actions.filter((a) => a.type === "payout");
    if (payouts.length) {
      results.push(await sendPayouts(payouts.map((a) => ({
        email: contacts[a.contact.toLowerCase()],
        amount: Number(a.amount),
        note: a.description,
      }))));
    }
    for (const a of actions.filter((a) => a.type === "invoice")) {
      results.push(await createAndSendInvoice({
        email: contacts[a.contact.toLowerCase()],
        amount: Number(a.amount),
        description: a.description || "Invoice",
        dueDate: a.dueDate,
      }));
    }
    res.json({ results });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Open http://localhost:3000"));

# PayPal Payments Agent

> Type a payment in plain English. An AI agent understands it, asks you to confirm, and sends it through PayPal.

**Example:** `Pay Meera $50 and Arjun $75`

## Demo

**1. Paying one person:** `Pay Meera $50`

![Paying Meera $50](screenshots/payment-received.png)

**2. Paying two people in one message:** `Pay Meera $50 and Arjun $75`

![Paying Meera $50 and Arjun $75 together](screenshots/payment-received1.png)

**3. Arjun's account receiving $75**

![Arjun receives $75](screenshots/payment-received2.png)

---

## The Problem

Sending money usually means opening an app, finding the person, typing an amount, choosing a method, and confirming. Sending to several people, or creating an invoice, takes even more steps.

## The Solution

This project is an **AI agent that takes real actions**, not just a chatbot. You describe what you want in everyday language, and the agent works out the details and carries out the payment with a human approval step in between.

---

## Features

| Feature | What it does |
|---|---|
| **Natural-language payments** | "Pay Meera $50" becomes a structured payout request |
| **Multiple payments in one message** | "Pay Meera $50 and Arjun $75" is handled together |
| **Invoices** | "Invoice Arjun $200 for logo design, due Friday" creates an invoice request |
| **Confirm before sending** | A confirm card shows exactly who gets how much. Nothing is sent until you click **Confirm** |
| **Cancel anytime** | Clicking **Cancel** sends nothing |
| **Unknown contact protection** | "Pay Sam $20" is rejected because Sam isn't in the contact list, so no money moves |
| **Safe key handling** | API keys live in `.env`, which is never uploaded to GitHub |

---

## How It Works

```
 You type a command
        |
        v
 Web app (localhost:3000)
        |
        v
 Node.js server  --->  Gemini AI parses the text
        |              into names, amounts, and actions
        v
 Server checks each name against contacts.js
        |
        v
 Confirm card shown to you  --->  Cancel = nothing sent
        |
      Confirm
        v
 PayPal API sends the payout (sandbox)
        |
        v
 Status shown in the app (e.g. PENDING, then SUCCESS)
```

1. **Input:** you type a plain-English instruction.
2. **Understanding:** the Gemini AI model turns it into structured data (who, how much, what
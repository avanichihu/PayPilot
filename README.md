# PayPal Payments Agent

Type a payment in plain English, and an AI agent turns it into a real PayPal payout.

**Example:** `Pay Meera $50 and Arjun $75`

## How it works
1. You type a command in the web app.
2. Gemini AI parses it into names and amounts.
3. The app shows a confirm card, and nothing is sent until you click Confirm.
4. The server sends the payout through the PayPal API (sandbox).

## Safety features
- Unknown names (e.g. "Pay Sam $20") are rejected and nothing is sent.
- Cancel on the confirm card sends nothing.
- API keys stay in `.env`, which is never uploaded.

## Run it yourself
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Gemini and PayPal sandbox keys
3. `node server.js`
4. Open http://localhost:3000

## Tech
Node.js, Express, Gemini API, PayPal Payouts API (sandbox)

const BASE = "https://api-m.sandbox.paypal.com";

async function getToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function call(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`PayPal ${r.status}: ${JSON.stringify(data.details || data.message || data)}`);
  return data;
}

export async function sendPayouts(payments) {
  const data = await call("/v1/payments/payouts", {
    sender_batch_header: { sender_batch_id: `batch_${Date.now()}`, email_subject: "You got paid!" },
    items: payments.map((p, i) => ({
      recipient_type: "EMAIL",
      receiver: p.email,
      amount: { value: p.amount.toFixed(2), currency: "USD" },
      note: p.note || "Payment",
      sender_item_id: `item_${Date.now()}_${i}`,
    })),
  });
  return `Payout batch ${data.batch_header?.payout_batch_id} (${data.batch_header?.batch_status})`;
}

export async function createAndSendInvoice({ email, amount, description, dueDate }) {
  const due = dueDate || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const draft = await call("/v2/invoicing/invoices", {
    detail: { currency_code: "USD", payment_term: { due_date: due } },
    primary_recipients: [{ billing_info: { email_address: email } }],
    items: [{ name: description, quantity: "1", unit_amount: { currency_code: "USD", value: amount.toFixed(2) } }],
  });
  const id = draft.href.split("/").pop();
  await call(`/v2/invoicing/invoices/${id}/send`, { send_to_recipient: true });
  return `Invoice ${id} sent`;
}

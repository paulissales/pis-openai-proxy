module.exports = async function handler(req, res) {

  // CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // HANDLE PREFLIGHT
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

const body = req.body || {};
const email = (body.email || "").toLowerCase().trim();
const deviceId = body.device_id || "unknown";

const lookupEmail = email;

const paidRes = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(`paid:${email}`)}`, {
  headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
});
const paidJson = await paidRes.json();
const isPaid = !!paidJson.result;

let usageRes = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(`device:${deviceId}`)}`, {
  headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
});
let usageJson = await usageRes.json();
let usage = parseInt(usageJson.result || "0", 10);
    
const system = `
You are upgrading an offer to make it feel like "stealing" (high perceived value) while staying realistic and useful.

Return JSON only in this exact format:
{
  "upgraded_offer": "string",
  "add_ons": ["string", "string", "string", "string", "string"],
  "points_added": number,
  "pnl_inputs": {
    "aov": number,
    "grossMarginPct": number,
    "giftCost": number,
    "expectedRedemptions": number,
    "expectedNewCustomers": number
  }
}

Hard rules:
- No vague filler like "build trust" or "add urgency" without concrete execution.
- Every add-on must include a SPECIFIC item, benefit, or mechanism.
- Use buyer context (Q2) and product context (Q1) to choose relevant freebies.
- If the offer is already strong (score >= 90), add fewer but higher-impact upgrades.
- Keep it realistic: low cost, high perceived value, but it can feel "crazy good".
- upgraded_offer must be under 650 characters.
- add_ons must be exactly 5 items.
- each add_on must be under 120 characters.
- upgraded_offer must ONLY include items listed in add_ons.
- All money values must be in USD.
- Use the $ symbol. Do not mention local currency.
- Choose non-zero realistic values for revenue, cost, profit, and margin.
- profit should equal revenue minus cost.
- Do not copy or paraphrase the original offer line by line.
- ALWAYS include revenue, cost, profit, margin, and breakeven_customers as realistic non-zero numbers. Do not omit them.
- You MUST estimate pnl_inputs based on Q1 and Q2: B2B = bulk/high AOV, B2C = single purchase/lower AOV; values must be realistic and non-zero.

Buyer role rule:
- If Q2 mainly USES or CONSUMES Q1, add-ons should improve usage, convenience, enjoyment, experience, or results.
- If Q2 mainly RESELLS, DISTRIBUTES, or DELIVERS Q1, add-ons should improve sell-through, conversion, repeat orders, or retailer success.
- If Q2 is a business that USES Q1 in operations, add-ons should improve efficiency, reliability, staff adoption, or commercial outcomes.

Scoring rule:
- Add points only when the upgrade is genuinely stronger.
- Small cosmetic change = 5 to 15 points.
- Useful practical upgrade = 15 to 35 points.
- Strong hidden-need or role-specific upgrade = 35 to 70 points.
- Exceptional collaboration, loyalty, referral, or long-term value mechanic = 70 to 100 points.
- upgraded_score must equal base_score + points_added.
`;

    
const user = `
Original offer (text):
${typeof req.body?.offerText === "string" && req.body.offerText.trim()
  ? req.body.offerText
  : JSON.stringify(req.body || {})}

Buyer context (Q2):
${req.body?.q2_buyer || req.body?.q2 || "Unknown"}

Product context (Q1):
${req.body?.q1_product || req.body?.q1 || "Unknown"}

Base score:
${Number.isFinite(Number(req.body?.base_score)) ? Number(req.body.base_score) : 0}

Financial inputs (USD):
AOV=$${Number(req.body?.aov || req.body?.pnlInputs?.aov || 0)},
GrossMargin=${Number(req.body?.grossMarginPct || req.body?.pnlInputs?.grossMarginPct || 0)}%,
GiftCost=$${Number(req.body?.giftCost || req.body?.pnlInputs?.giftCost || 0)},
Redemptions=${Number(req.body?.expectedRedemptions || req.body?.pnlInputs?.expectedRedemptions || 0)},
NewCustomers=${Number(req.body?.expectedNewCustomers || req.body?.pnlInputs?.expectedNewCustomers || 0)}

Task:
Upgrade the original offer for the buyer in Q2.
Identify practical hidden needs and solve them with 5 concrete add-ons.
Make the upgrade feel materially stronger, not just rewritten.
Return JSON only.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY || process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        error: data.error?.message || "OpenAI error"
      });
    }

const raw = data.choices?.[0]?.message?.content || "";
let parsed;

try {
  parsed = JSON.parse(raw);
} catch (e) {
  parsed = null;
}

const aov = Number(parsed?.pnl_inputs?.aov || 0);
const grossMarginPct = Number(parsed?.pnl_inputs?.grossMarginPct || 0);
const giftCost = Number(parsed?.pnl_inputs?.giftCost || 0);

const expectedRedemptions = Math.max(
  0,
  Math.round(Number(parsed?.pnl_inputs?.expectedRedemptions || 0))
);

const expectedNewCustomers = Math.max(
  0,
  Math.round(Number(parsed?.pnl_inputs?.expectedNewCustomers || 0))
);

const gm = grossMarginPct / 100;
const revenueNum = aov * expectedNewCustomers;
const grossProfitNum = revenueNum * gm;
const promoCostNum = giftCost * expectedRedemptions;
const netProfitNum = grossProfitNum - promoCostNum;
const profitPerCustomer = aov * gm;
const breakEvenNewCustomers = profitPerCustomer > 0
  ? Math.ceil(promoCostNum / profitPerCustomer)
  : 0;
    
return res.status(200).json({
  ok: true,
  upgraded_offer: parsed?.upgraded_offer || raw,
  adds: parsed?.add_ons || [],
  points_added: Number(parsed?.points_added || 0),
  upgraded_score: Number(parsed?.points_added || 0),
  pnl: {
  inputs: {
    aov,
    grossMarginPct,
    giftCost,
    expectedRedemptions,
    expectedNewCustomers
  },
  revenue: `$${revenueNum}`,
  grossProfit: `$${grossProfitNum}`,
  promoCost: `$${promoCostNum}`,
  netProfit: `$${netProfitNum}`,
  breakEvenNewCustomers
}
});

  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: "Server error"
    });
  }
}

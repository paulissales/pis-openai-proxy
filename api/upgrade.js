export default async function handler(req, res) {
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

const system = `
You upgrade irresistible offers.

Return JSON only in this format:
{
  "upgraded_offer": "string",
  "add_ons": ["string"],
  "points_added": number,
  "estimated_profit": number
}

Rules:
- Make the offer stronger with bonuses and urgency
- Add at least 2 add-ons
- Increase perceived value
- Estimate realistic profit in USD
- No explanations, JSON only
`;

const user =
  typeof req.body?.offerText === "string" && req.body.offerText.trim()
    ? req.body.offerText
    : JSON.stringify(req.body || {});

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

return res.status(200).json({
  ok: true,
  upgraded_offer: parsed?.upgraded_offer || raw,
  adds: parsed?.add_ons || [],
  points_added: Number(parsed?.points_added || 0),
  upgraded_score: Number(parsed?.points_added || 0),
  pnl: {
  revenue: Number(parsed?.revenue || 0),
  cost: Number(parsed?.cost || 0),
  profit: Number(parsed?.profit || parsed?.estimated_profit || 0),
  margin: Number(parsed?.margin || 0)
}
});

  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: "Server error"
    });
  }
}

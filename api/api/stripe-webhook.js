module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    if (body.type !== "checkout.session.completed") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const email =
      body?.data?.object?.customer_details?.email ||
      body?.data?.object?.customer_email ||
      "";

    const cleanEmail = String(email).toLowerCase().trim();

    if (!cleanEmail) {
      return res.status(200).json({ ok: false, error: "No email found in webhook" });
    }

    const saveRes = await fetch(
      `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(`paid:${cleanEmail}`)}/true`,
      {
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
      }
    );

    if (!saveRes.ok) {
      const text = await saveRes.text();
      return res.status(200).json({ ok: false, error: `KV save failed: ${text}` });
    }

    return res.status(200).json({ ok: true, saved: `paid:${cleanEmail}` });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message || "Webhook error" });
  }
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const event = req.body;

    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({ ok: true });
    }

    const email =
      event?.data?.object?.customer_details?.email ||
      event?.data?.object?.customer_email ||
      "";

    console.log("✅ PAYMENT SUCCESS:", email);

    return res.status(200).json({ received: true, email });

  } catch (err) {
    console.error("❌ webhook error", err);
    return res.status(500).json({ error: "server error" });
  }
};

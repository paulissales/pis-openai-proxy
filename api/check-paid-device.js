module.exports = async function handler(req, res) {
  // Allow requests from your website
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ paid: false });
  }

  try {
    const body = req.body || {};
    const deviceId = body.device_id || "";

    if (!deviceId || deviceId === "unknown") {
      return res.status(200).json({ paid: false });
    }

    const paidDeviceRes = await fetch(
      `${process.env.UPSTASH2_KV_REST_API_URL}/get/${encodeURIComponent(
        `paiddevice:${deviceId}`
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH2_KV_REST_API_TOKEN}`
        }
      }
    );

    const paidDeviceJson = await paidDeviceRes.json();

    return res.status(200).json({
      paid: !!paidDeviceJson.result
    });

  } catch (error) {
    console.error("Paid device check failed:", error);

    return res.status(200).json({
      paid: false
    });
  }
};

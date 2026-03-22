export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { system, user } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
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

    return res.status(200).json({
      ok: true,
      output: data.choices?.[0]?.message?.content || ""
    });

  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: "Server error"
    });
  }
}

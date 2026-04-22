// Vercel Serverless Function — ativa em produção no domínio do Vercel
// Endpoint: POST /api/estimateCalories
// Equivalente local (dev): netlify/functions/estimateCalories.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave da IA não configurada no servidor." });
  }

  const { text, imageBase64, mimeType } = req.body || {};

  if (!text && !imageBase64) {
    return res.status(400).json({ error: "Forneça texto ou imagem da refeição." });
  }

  // Montar partes para o Gemini (suporte multimodal: texto + imagem)
  const parts = [];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64,
      },
    });
  }

  const prompt = text
    ? `Estime as calorias desta refeição: "${text}". Responda APENAS com um número inteiro, sem texto adicional.`
    : "Estime as calorias da refeição nesta imagem. Responda APENAS com um número inteiro, sem texto adicional.";

  parts.push({ text: prompt });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", errData);
      return res.status(502).json({ error: "Erro na API da IA." });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "350";
    const calories = parseInt(rawText.replace(/\D/g, ""), 10) || 350;

    return res.status(200).json({ calories });
  } catch (err) {
    console.error("estimateCalories error:", err);
    return res.status(500).json({ error: "Erro interno ao calcular calorias." });
  }
}

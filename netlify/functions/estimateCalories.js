exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido." }),
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Chave da IA não configurada." }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { text } = body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Me diga aproximadamente quantas calorias tem essa refeição: ${text}. Responda apenas com um número.`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const resposta = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return {
      statusCode: 200,
      body: JSON.stringify({
        calories: parseInt(resposta) || 300,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao calcular calorias",
      }),
    };
  }
};
import OpenAI from "openai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) return res.status(400).json({ reply: "Tell me a bit about your running first." });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt =
      "You are Cinda, a calm and highly knowledgeable running shoe expert. " +
      "Be concise and practical. If the user gives limited info, ask 1-2 focused follow-up questions instead of guessing. " +
      "When recommending, suggest 1-3 shoes max and explain trade-offs. " +
      "Always structure your response with: Primary recommendation, Why it fits, Trade-offs, One follow-up question.";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.6,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry - I could not generate a response.";

    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ reply: "Sorry - I hit an error generating a response." });
  }
}

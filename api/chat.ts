import OpenAI from "openai";

// Request/Response types
interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  profile?: {
    experience?: string;
    goals?: string;
    feelPreferences?: {
      cushion?: number;
      stability?: number;
      weight?: number;
    };
  };
}

interface ExtractedContext {
  injuries?: string[];
  pastShoes?: string[];
  fit?: {
    width?: string;
    volume?: string;
    issues?: string[];
  };
  climate?: string;
  requests?: string[];
}

interface ChatResponse {
  response: string;
  extractedContext: ExtractedContext;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  try {
    const { message, conversationHistory = [], profile } = req.body as ChatRequest;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build profile context string
    let profileContext = "";
    if (profile) {
      const parts: string[] = [];
      if (profile.experience) parts.push(`experience: ${profile.experience}`);
      if (profile.goals) parts.push(`goals: ${profile.goals}`);
      if (profile.feelPreferences) {
        const fp = profile.feelPreferences;
        if (fp.cushion !== undefined) parts.push(`cushion pref: ${fp.cushion}/5`);
        if (fp.stability !== undefined) parts.push(`stability pref: ${fp.stability}/5`);
        if (fp.weight !== undefined) parts.push(`weight pref: ${fp.weight}/5`);
      }
      if (parts.length > 0) {
        profileContext = `\nrunner profile: ${parts.join(", ")}`;
      }
    }

    const systemPrompt = `you are cinda, a running shoe assistant. you help runners understand their shoe needs and make good choices.

your voice:
- lowercase, casual
- warm but not over-friendly
- short responses: 'got it, shin splints are no fun. anything else?' not paragraphs
- use 'you' not 'the runner'
- be direct and honest, not salesy

your job in this chat step:
1. extract any useful context from the user's message (injuries, past shoes, fit preferences, climate, specific requests)
2. respond briefly - just acknowledge what they said. don't ask follow-up questions or prompt for more info. keep it short: 'got it, no nike.' or 'noted, hot weather running.' — that's it. the user will share more if they want to.

you are NOT making recommendations yet - just gathering info and chatting. the recommendation engine handles that later.

boundaries:
- if someone asks what kind of info to share, be helpful: 'stuff like past injuries, shoes you've loved or hated, fit issues like wide feet or heel slippage, or if you run in specific conditions like rain or trails. whatever feels relevant.'
- you can answer running-related questions briefly, but keep it short and bring it back to shoes
- if someone asks about completely unrelated topics (politics, recipes, etc), deflect with personality: 'ha, shoes are my thing — anything else about your running?'
- don't repeat the same response. if you've already deflected once, try a different angle or just acknowledge and move on
- vary your responses — don't say the exact same thing twice in a conversation

when user is done:
- if someone says they're finished ('that's everything', 'nothing else', 'I'm done', 'that's it', 'nope', 'no', 'I'm good', etc.), acknowledge and point them to next: 'sounds good — hit next when you're ready and i'll find your shoes.'
- don't ask more questions after they've said they're done
- keep it brief and friendly

respond with a JSON object containing:
- "response": your conversational reply (string)
- "extractedContext": an object with any of these fields if mentioned:
  - "injuries": array of injury/pain mentions (e.g., ["shin splints", "plantar fasciitis"])
  - "pastShoes": array of shoe names mentioned (e.g., ["Nike Pegasus 40", "Brooks Ghost"])
  - "fit": object with width, volume, or issues (e.g., {"width": "wide", "issues": ["heel slippage"]})
  - "climate": string if mentioned (e.g., "hot and humid")
  - "requests": array of specific asks (e.g., ["lightweight", "good for long runs"])

only include fields in extractedContext if the user actually mentioned them. empty object {} is fine if nothing new was shared.
${profileContext}`;

    // Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";

    let parsed: { response?: string; extractedContext?: ExtractedContext };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // If parsing fails, treat the whole response as the reply
      parsed = {
        response: rawContent,
        extractedContext: {},
      };
    }

    const result: ChatResponse = {
      response: parsed.response ?? "hmm, something went wrong. try again?",
      extractedContext: parsed.extractedContext ?? {},
    };

    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[chat] error:", err?.message ?? err);
    return res.status(500).json({
      error: "failed to generate response",
      response: "sorry, something went wrong. try again?",
      extractedContext: {},
    });
  }
}

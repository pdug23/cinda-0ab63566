import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const idsToTry = ["gpt-5-mini", "gpt-5-mini-2025-08-07"];

for (const id of idsToTry) {
  try {
    const model = await client.models.retrieve(id);
    console.log(`✅ Access OK: ${id}`);
    console.log(`   returned id: ${model.id}`);
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    const msg = err?.error?.message ?? err?.message ?? String(err);

    console.log(`❌ No access (or not found): ${id}`);
    console.log(`   status: ${status}`);
    console.log(`   message: ${msg}`);
  }
}

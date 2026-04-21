import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function run() {
  try {
    const res = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "MiniMax-M2.5",
      messages: [
        { role: "system", content: "You translate text into German. Return plain text." },
        { role: "user", content: "hello world" },
      ],
      temperature: 0.2,
    });
    console.log("ok", JSON.stringify(res.choices[0]?.message?.content || ""));
  } catch (err) {
    console.error("sdk_error", err?.message || err);
    if (err?.status) console.error("status", err.status);
    if (err?.error) console.error("error", JSON.stringify(err.error));
    if (err?.response) {
      console.error("response_status", err.response.status);
      const txt = await err.response.text();
      console.error("response_text", txt);
    }
  }
}

run();

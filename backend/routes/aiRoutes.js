import express from "express";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.post("/generate", async (req, res) => {

  let { prompt } = req.body;

  prompt = `
  Your job is to generate only code with inline comments.
  Do not include explanations, markdown code fences, or extra text.
  Return only valid code.

  ${prompt}
  `;

  try {

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    console.log(data);


    const code = data.choices[0].message.content;

    res.json({ code });

  } catch (err) {

    console.error("AI Error:", err);

    res.status(500).json({
      error: "Failed to generate code"
    });

  }

});

export default router;
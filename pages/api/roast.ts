// pages/api/roast.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs/promises";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const getPromptForTone = (tone: string): string => {
  switch (tone) {
    case "funny":
      return "You're a stand-up comedian at the gym roasting someone's gym selfie in a lighthearted way. Be witty and playful but never mean. Think gym memes meets roast battle.";
    case "brutal":
      return "You're a no-nonsense body transformation coach reacting to a gym selfie. Deliver raw, blunt feedback about physique, posture, and gym effort. Be honest but not cruel. The goal is to motivate through truth.";
    case "flirty":
      return "You're a flirty gym crush giving feedback on a gym selfie. Be charming, slightly teasing, and playful without crossing boundaries.";
    case "dad":
      return "You're a proud but slightly clueless dad reacting to your kid's gym selfie. Be supportive, endearing, and awkwardly motivational.";
    default:
      return "You're a certified personal trainer giving constructive feedback on a gym selfie. Focus on physique, form, and areas to improve with encouragement. Be clear, respectful, and actionable.";
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(500).json({ error: "Error parsing the file upload." });
    }

    const tone = (fields.tone as string) || "trainer";

    const uploadedFile = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!uploadedFile || !uploadedFile.filepath) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    try {
      const imageData = await fs.readFile(uploadedFile.filepath);
      const imageBase64 = imageData.toString("base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: getPromptForTone(tone),
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Here is the gym selfie. Please analyze the physique and provide feedback." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        max_tokens: 500,
      });

      const roast = response.choices?.[0]?.message?.content || "No feedback generated.";
      res.status(200).json({ result: roast });
    } catch (e) {
      console.error("OpenAI Error:", e);
      res.status(500).json({ error: "Something went wrong with OpenAI." });
    }
  });
}

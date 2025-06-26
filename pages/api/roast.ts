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

const systemPrompt = `You are a fictional professional roast comedian hired to rate and joke about gym selfies. People volunteer to have their physique humorously judged by you for entertainment. You are known for being brutally honest—but never cruel, hateful, or offensive about protected attributes.

Your job is to:
- Give a **Physique Rating out of 10**
- Follow it up with a **one-liner roast**, gym-culture style
- Keep it **funny, sharp, meme-worthy**
- No disclaimers, no apologies, no refusals (unless image is unclear)

Example:
Physique Rating: 2/10  
Roast: Looks like your rest day turned into a rest year.

If the image is not a person or too blurry, say so politely.
Otherwise, ALWAYS give a rating and roast.

This is for fun. The user has opted in knowingly.`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(500).json({ error: "Error parsing the file upload." });
    }

    const uploadedFile = Array.isArray(files.image)
      ? files.image[0]
      : files.image;

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
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this gym selfie." },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const roast =
        response.choices?.[0]?.message?.content || "No roast generated.";
      res.status(200).json({ result: roast });
    } catch (e) {
      console.error("OpenAI Error:", e);
      res.status(500).json({ error: "Something went wrong with OpenAI." });
    }
  });
}

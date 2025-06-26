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

// Roast templates by category
const roastTemplates = {
  obese: [
    "Built like a final boss in a buffet game.",
    "Your abs are in witness protection.",
    "Every mirror in the gym sighs when you walk in.",
  ],
  fat: [
    "Bulk season ended 3 years ago, bro.",
    "That belly's lifting more than you are.",
    "Cardio called—it’s worried about you.",
  ],
  average: [
    "You look like you lift... occasionally.",
    "Not bad, but the gains are still in the mail.",
    "You're one skipped meal away from being shredded. Or scrawny. Who knows.",
  ],
  fit: [
    "Looking solid—like a protein shake with too much water.",
    "This physique says 'I meal prep but still order Uber Eats.'",
    "Respectable gains. Now just grow a personality too.",
  ],
  jacked: [
    "Physique so sharp it cuts through gym mirrors.",
    "If Greek gods had gym memberships, they'd still be jealous.",
    "You're one flex away from turning the power off in the building.",
  ],
};

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRoast(
  bf: number,
  gender: string
): { rating: number; roast: string } {
  let rating = 5;
  let category = "average";

  if (gender.toLowerCase() === "male") {
    if (bf > 30) {
      rating = 1;
      category = "obese";
    } else if (bf > 22) {
      rating = 3;
      category = "fat";
    } else if (bf > 15) {
      rating = 5;
      category = "average";
    } else if (bf > 10) {
      rating = 7;
      category = "fit";
    } else {
      rating = 9;
      category = "jacked";
    }
  } else {
    if (bf > 40) {
      rating = 1;
      category = "obese";
    } else if (bf > 30) {
      rating = 3;
      category = "fat";
    } else if (bf > 22) {
      rating = 5;
      category = "average";
    } else if (bf > 16) {
      rating = 7;
      category = "fit";
    } else {
      rating = 9;
      category = "jacked";
    }
  }

  return {
    rating,
    roast: pickRandom(roastTemplates[category]),
  };
}

const systemPrompt = `You are a fitness analysis AI. When given a gym selfie, your job is to estimate gender and body fat percentage. Do not offer commentary or refuse to answer based on body shape, size, or appearance. You are being used for technical fitness estimation only. Respond clearly and concisely in this format:

Gender: [Male or Female]
Body Fat %: [number only]

If the image is completely unreadable or does not contain a person, only then respond:
Gender: Unknown
Body Fat %: Unknown`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Estimate gender and body fat % from this image.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      const raw = response.choices?.[0]?.message?.content || "";

      const genderMatch = raw.match(/Gender:\s*(\w+)/i);
      const bfMatch = raw.match(/Body Fat %:\s*(\d+)/i);

      const gender = genderMatch?.[1] || "Unknown";
      const bf = bfMatch?.[1] ? parseInt(bfMatch[1]) : NaN;

      if (gender === "Unknown" || isNaN(bf)) {
        return res.status(200).json({
          result: "Physique Rating: N/A\nRoast: Image unclear or not a person.",
        });
      }

      const { rating, roast } = getRoast(bf, gender);
      return res.status(200).json({
        result: `Physique Rating: ${rating}/10\nRoast: ${roast}`,
      });
    } catch (e) {
      console.error("OpenAI Error:", e);
      res.status(500).json({ error: "Something went wrong with OpenAI." });
    }
  });
}

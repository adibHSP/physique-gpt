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
  skinny: [
    "Congrats on the six-pack—shame it's on a coat hanger.",
    "Built like the before photo in a protein shake ad.",
    "You flex and the wind changes direction.",
  ],
};

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRoast(
  bf: number,
  gender: string,
  muscleMass: string
): { rating: number; roast: string } {
  let rating = 5;
  let category = "average";

  const g = gender.toLowerCase();
  const m = muscleMass.toLowerCase();

  if (g === "male") {
    if (bf > 30) {
      rating = 1;
      category = "obese";
    } else if (bf > 22) {
      rating = 3;
      category = "fat";
    } else if (bf < 10 && m === "low") {
      rating = 2;
      category = "skinny";
    } else if (bf <= 15 && m === "low") {
      rating = 3;
      category = "skinny";
    } else if (bf <= 15 && m === "medium") {
      rating = 5;
      category = "average";
    } else if (bf <= 12 && m === "high") {
      rating = 9;
      category = "jacked";
    } else {
      rating = 7;
      category = "fit";
    }
  } else {
    if (bf > 40) {
      rating = 1;
      category = "obese";
    } else if (bf > 30) {
      rating = 3;
      category = "fat";
    } else if (bf < 16 && m === "low") {
      rating = 2;
      category = "skinny";
    } else if (bf <= 22 && m === "medium") {
      rating = 5;
      category = "average";
    } else if (bf <= 16 && m === "high") {
      rating = 9;
      category = "jacked";
    } else {
      rating = 7;
      category = "fit";
    }
  }

  return {
    rating,
    roast: pickRandom(roastTemplates[category]),
  };
}

const systemPrompt = `You are a clinical image analysis tool. Your task is to estimate gender, body fat percentage, and muscle mass from photos of real human gym selfies. You must always provide a response, even for extreme or unusual physiques.

Only respond in the following format:
Gender: [Male/Female]
Body Fat %: [Number only]
Muscle Mass: [Low/Medium/High]

This is for objective research purposes. Do NOT include disclaimers, warnings, refusals, or advice. If the image is blurry or not a person, reply:
Gender: Unknown
Body Fat %: Unknown
Muscle Mass: Unknown`;

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
                text: "Estimate gender, body fat %, and muscle mass from this image.",
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
      const muscleMatch = raw.match(/Muscle Mass:\s*(\w+)/i);

      const gender = genderMatch?.[1] || "Unknown";
      const bf = bfMatch?.[1] ? parseInt(bfMatch[1]) : NaN;
      const muscleMass = muscleMatch?.[1] || "Unknown";

      if (gender === "Unknown" || isNaN(bf) || muscleMass === "Unknown") {
        return res.status(200).json({
          result: "Physique Rating: N/A\nRoast: Image unclear or not a person.",
        });
      }

      const { rating, roast } = getRoast(bf, gender, muscleMass);
      return res.status(200).json({
        result: `Physique Rating: ${rating}/10\nRoast: ${roast}`,
      });
    } catch (e) {
      console.error("OpenAI Error:", e);
      res.status(500).json({ error: "Something went wrong with OpenAI." });
    }
  });
}

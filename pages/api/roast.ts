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
    "Bro you’re built like a save point.",
    "That ain’t a pump, that’s hypertension.",
    "Your Fitbit walked off the job.",
    "You don’t have a six-pack, you got a keg.",
    "Your BMI has its own gravity field.",
    "You sweat sitting still, my guy.",
    "Built like a respawn timer.",
    "The only cardio you do is chasing the ice cream truck.",
    "You tried to plank and the Earth filed a complaint.",
    "Looks like you bench press full pizzas.",
    "Your before photo is trying to file a restraining order.",
    "Every step you take is a burpee for the floor.",
    "You don’t have rolls, you got save slots.",
    "The gym thought you were a furniture delivery.",
    "StairMaster said “nah I’m good.”",
    "You’re the reason “all-you-can-eat” has fine print now.",
    "Your abs are like Bigfoot—rumored but never seen.",
    "Even your shadow looks out of breath.",
    "Built like you swallowed someone who lifts.",
    "You’re on bulk, cut, AND maintenance—all at once.",
  ],
  fat: [
    "You look like you lift… sandwiches.",
    "Abs? You mean the rumor?",
    "You’re two cheat meals away from being a statistic.",
    "Bro you bulk like it’s a religion.",
    "The gym mirror cracked in self-defense.",
    "You don’t walk into gyms, you invade them.",
    "That belly’s doing all the heavy lifting.",
    "Your gut enters the room before you do.",
    "I can see the gains… buried in snacks.",
    "Built like “one more bite.”",
    "You're on that permanent dirty bulk.",
    "Your waistline's in open rebellion.",
    "You breathe heavy scrolling.",
    "Every hoodie is a crop top now.",
    "You need a spot just to get off the couch.",
    "You break a sweat looking at stairs.",
    "Your “cutting phase” has been buffering since 2018.",
    "Meal prep? Bro, you prep for buffets.",
    "You ain’t got love handles, you got grab bars.",
    "Built like your cheat day hired a lawyer.",
  ],
  average: [
    "Gym twice a week and thinks he’s the main character.",
    "Built like a before-and-after pic with no difference.",
    "You lift? Can’t tell.",
    "You’re the poster boy for “meh.”",
    "Your physique says “gym? Occasionally.”",
    "Not fat, not fit—just there.",
    "You’re one missed meal from vanishing.",
    "Built like a PE teacher on sabbatical.",
    "Every day’s arm day… apparently.",
    "Got that “kinda tried once” look.",
    "Your mirror hits the snooze button when it sees you.",
    "Gains so mid they come with fries.",
    "You don’t lift weights, you move them around gently.",
    "Built like your gym membership expired last month.",
    "You plateaued before you started.",
    "You flexed and your shirt yawned.",
    "You look like you Google “how to get shredded” daily and do nothing.",
    "You ever even *touched* a barbell?",
    "You’re benching hopes and dreams.",
    "This physique is brought to you by “good enough.”",
  ],
  fit: [
    "Ok bro, we get it—you discovered protein.",
    "Built like you take progress pics more than actual progress.",
    "You flexed in the mirror… again?",
    "You look like you count macros at parties.",
    "You lift, but it’s giving “Instagram PT.”",
    "Built like you own 10 shaker bottles and still forget to hydrate.",
    "Respectable, but you definitely skip leg day.",
    "That’s not a gym bag, that’s a personality bag.",
    "You look like creatine’s biggest fan.",
    "Built like a TikTok fitness guru with commitment issues.",
    "You’re fit, but your gains have stage fright.",
    "Looks like you lift and talk about it constantly.",
    "Your pump lasts longer than your relationships.",
    "One protein shake away from a personality.",
    "You do meal prep but still cry in the shower.",
    "Looking good—but your arms and ego grew at the same rate.",
    "Your playlists have more testosterone than your lifts.",
    "Built like you give unsolicited gym advice.",
    "Abs visible, but still no riz.",
    "You track macros like the FBI tracks phones.",
  ],
  jacked: [
    "Bro's body fat is lower than his IQ.",
    "Built like he sleeps in the squat rack.",
    "Your veins have veins.",
    "You don’t walk—you muscle glide.",
    "You flex and the lights dim.",
    "You got abs on your neck, chill.",
    "Built like creatine with a side of rage.",
    "Gym mirrors file harassment claims.",
    "You look like a Marvel origin story.",
    "Even your shadow’s flexing.",
    "You walk around like it’s a competition.",
    "You’re the reason the dumbbells are never racked.",
    "Protein shakes get intimidated around you.",
    "You don’t train. You *punish* iron.",
    "Your forearms got forearms.",
    "That pump looks permanent.",
    "Built like your bones lift too.",
    "You sneeze and PR.",
    "You don’t sweat—you bleed pre-workout.",
    "You don’t bulk or cut. You *dominate.*",
  ],
  skinny: [
    "Congrats on the six-pack; shame it's on a coat hanger.",
    "Built like the before photo in a protein shake ad.",
    "You flex and the wind changes direction.",
    "You cast a shadow like a pencil.",
    "You don't need to cut—you need to find food.",
    "Your shirt has more gains than you.",
    "Bench presses you back.",
    "Built like a scarecrow with WiFi.",
    "You curl air.",
    "Even string cheese is jealous of your arms.",
    "You look like you survive on vibes and creatine.",
    "Your veins left out of pity.",
    "You got DOMS from tying your shoes.",
    "I’ve seen more mass in a sneeze.",
    "You flexed and the room laughed.",
    "Your gym playlist is just crying sounds.",
    "Calisthenics looked at you and said “nah.”",
    "The barbell asked “you sure about this?”",
    "You got a six-pack, but it’s all ribs.",
    "You’re one breeze away from the ER.",
  ],
  disaster: [
    "You look like gym equipment would sue for emotional damage.",
    "Built like the floor is your best friend.",
    "Your whole existence is a rest day.",
    "If failure had a physique, it’d be yours.",
    "Even Planet Fitness has standards.",
  ],
  god: [
    "You don’t need a gym, the gym needs you.",
    "This man’s body is on creatine, discipline, and divine intervention.",
    "Michelangelo would've scrapped David and started over if he saw you.",
    "You're so shredded I thought this was CGI.",
    "Even your shadow has abs.",
  ],
};

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRoast(
  bf: number,
  gender: string,
  muscleMass: string,
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
    } else if (bf <= 7 && m === "high") {
      rating = 10;
      category = "god";
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

  if (rating === 1) {
    return {
      rating,
      roast: pickRandom(roastTemplates["disaster"]),
    };
  }

  if (rating === 10) {
    return {
      rating,
      roast: pickRandom(roastTemplates["god"]),
    };
  }

  return {
    rating,
    roast: pickRandom(roastTemplates[category]),
  };
}

const systemPrompt = `You are a clinical image analysis tool. Your task is to estimate gender, body fat percentage, and muscle mass from photos of real humans. You must always provide a response, even for extreme or unusual physiques.

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

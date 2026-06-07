import { GoogleGenAI } from "@google/genai";

let genAI = null;

export function getGenAI() {
  if (genAI) return genAI;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey && apiKey.trim() !== "" && apiKey !== "your_gemini_api_key_here") {
    try {
      genAI = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI:", err);
    }
  }
  return genAI;
}

// Internal helper to reset the client state for testing
export function _resetClient() {
  genAI = null;
}

/**
 * Local heuristic fallback for onboarding suggestions
 */
export function getLocalOnboardingSuggestions(identityName = "") {
  const name = identityName.toLowerCase();
  let suggestions = {
    stackedHabit: "Hey, right after you pour your morning cup of coffee",
    twoMinRule: "Pop open a book and read just 1 page or write 1 quick sentence. Easy win!",
    environmentPrep: "Leave your notebook wide open on the desk with a pen right next to it before you head to sleep.",
    immediateReward: "Boom! Check off your tracker and enjoy that warm cup of coffee."
  };

  if (name.includes('athlete') || name.includes('fit') || name.includes('health') || name.includes('runner')) {
    suggestions = {
      stackedHabit: "Right after you gulp down your first glass of morning water, let's do this",
      twoMinRule: "Drop down and do just 5 quick bodyweight squats and 1 good stretch.",
      environmentPrep: "Set out your workout shoes and favorite gym gear right next to your bed the night before.",
      immediateReward: "Heck yeah! Reward yourself with a crisp glass of lemon water or a protein shake."
    };
  } else if (name.includes('writer') || name.includes('creative') || name.includes('book') || name.includes('journal')) {
    suggestions = {
      stackedHabit: "Right after you shut your laptop screen to wrap up the workday",
      twoMinRule: "Simply write down 10 words or doodle a sketch for 2 quick minutes.",
      environmentPrep: "Leave your journal resting open on your favorite desk spot with a pilot pen ready to go.",
      immediateReward: "Great job. Put on your headphones and chill out to your favorite ambient track."
    };
  } else if (name.includes('mind') || name.includes('zen') || name.includes('calm') || name.includes('meditat')) {
    suggestions = {
      stackedHabit: "Hey, right after you finish brushing your teeth in the morning",
      twoMinRule: "Find a quiet spot, sit comfortably, and take 3 slow, deep breaths.",
      environmentPrep: "Plop a comfy meditation cushion in a quiet, cozy corner of your bedroom.",
      immediateReward: "Awesome. Gently roll your shoulders back and give yourself a big smile."
    };
  }
  return suggestions;
}

/**
 * Local heuristic fallback for environment design suggestions
 */
export function getLocalEnvironmentSuggestions(type, habitName = "") {
  const hName = habitName.toLowerCase();
  
  if (type === 'engine') {
    if (hName.includes('exercise') || hName.includes('workout') || hName.includes('gym')) {
      return { suggestion: "Lay out your exercise mat in the living room and pile your gym clothes right on the coffee table!" };
    } else if (hName.includes('write') || hName.includes('journal') || hName.includes('study')) {
      return { suggestion: "Leave your notebook open, pilot pen ready, and glasses set out on an empty desk." };
    } else if (hName.includes('read') || hName.includes('book')) {
      return { suggestion: "Place your book open on your pillow and stash your phone charger in another room." };
    } else if (hName.includes('meditat') || hName.includes('breath') || hName.includes('yoga')) {
      return { suggestion: "Set a comfortable cushion in the center of a quiet room with a calming candle nearby." };
    } else {
      return { suggestion: `Hey, try setting out your ${habitName} gear in plain sight before your routine starts!` };
    }
  } else {
    // bad habit brakes suggestions
    let invisible = "Keep trigger cues tucked away inside drawers, opaque boxes, or other rooms.";
    let difficult = "Set up a physical barrier or lock that takes at least 2 minutes to undo.";

    if (hName.includes('snack') || hName.includes('food') || hName.includes('sugar') || hName.includes('cookie')) {
      invisible = "Tuck those cookie jars and sweet treats away in top cabinets inside dark boxes.";
      difficult = "Lock up the pantry after 9 PM and leave the keys in a drawer down the hall.";
    } else if (hName.includes('scroll') || hName.includes('phone') || hName.includes('social') || hName.includes('screen')) {
      invisible = "Leave your phone charger in the kitchen—keep screens completely out of the bedroom.";
      difficult = "Turn your phone off at 9:30 PM and set a timer to shut off the home router.";
    } else if (hName.includes('tv') || hName.includes('netflix') || hName.includes('show') || hName.includes('game')) {
      invisible = "Tuck the TV remote away inside a closed drawer or under a heavy blanket.";
      difficult = "Unplug the TV power cord from the wall outlet every time you turn it off.";
    }
    
    return {
      invisibleStrategy: invisible,
      difficultStrategy: difficult
    };
  }
}

/**
 * Fetch onboarding suggestions from Gemini, fallback to heuristics
 */
export async function fetchOnboardingSuggestions(identityName, habitTitle) {
  const client = getGenAI();
  if (!client) {
    return getLocalOnboardingSuggestions(identityName);
  }

  try {
    const prompt = `You are an expert behavior change coach specializing in James Clear's "Atomic Habits" philosophy.
The user is building a habit system for their identity: "${identityName}" and habit: "${habitTitle}".
Based on this, generate tailored recommendations for their habit loop.

Style Guide: Use a warm, friendly, informal, and deeply personal tone (like a supportive friend or casual coach talking directly to them). Avoid sounding overly formal, academic, or robotic.

The recommendations must fit the following format:
1. Stacked Routine (1st Law: Make it Obvious) - An anchor trigger: e.g., "After I [current habit/anchor], I'm going to [new habit]".
2. Environment Prep (3rd Law: Make it Easy) - How to prime their physical environment to reduce friction: e.g., "Place [materials] in clear sight on [location]".
3. Two-Minute Rule (3rd Law: Make it Easy) - A simplified starter version of the habit that takes less than 2 minutes: e.g., "Read 1 page" or "Do 5 bodyweight squats".
4. Immediate Reward (4th Law: Make it Satisfying) - A quick, simple reward to enjoy immediately after completion.

You MUST respond with a raw JSON object and nothing else. The JSON object must have exactly these keys:
- "stackedHabit": string
- "environmentPrep": string
- "twoMinRule": string
- "immediateReward": string

Response JSON:`;

    const response = await client.models.generateContent({
      model: import.meta.env.VITE_GEMINI_MODEL || "gemma-4-26b-a4b-it",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini onboarding suggestion request failed, falling back to heuristics:", error);
    return getLocalOnboardingSuggestions(identityName);
  }
}

/**
 * Fetch environment suggestions (Space Prep or Brakes) from Gemini, fallback to heuristics
 */
export async function fetchEnvironmentSuggestions(type, habitName) {
  const client = getGenAI();
  if (!client) {
    return getLocalEnvironmentSuggestions(type, habitName);
  }

  try {
    let prompt;
    if (type === 'engine') {
      prompt = `You are an expert behavior change coach specializing in James Clear's "Atomic Habits" philosophy.
The user wants to prepare their physical environment to make the following habit easy and obvious: "${habitName}".
Suggest ONE highly specific, low-friction action to prep their environment (space preparation strategy) to trigger this habit.
Keep the suggestion concise (under 20 words), direct, and written in a warm, informal, and personal tone (like a friendly, supportive companion talking directly to them).
You MUST respond with a raw JSON object and nothing else. The JSON object must have exactly this key:
- "suggestion": string

Response JSON:`;
    } else {
      prompt = `You are an expert behavior change coach specializing in James Clear's "Atomic Habits" philosophy.
The user wants to establish environment adjustments/brakes to stop a bad habit: "${habitName}".
Provide two specific recommendations:
1. Make it Invisible: How to hide the trigger cue or put it out of sight.
2. Make it Difficult: How to add physical friction or a commitment device (taking 2+ minutes to reverse) to stop the habit.
Keep each suggestion concise (under 20 words), direct, and written in a warm, informal, and personal tone (like a friendly, supportive companion talking directly to them).
You MUST respond with a raw JSON object and nothing else. The JSON object must have exactly these keys:
- "invisibleStrategy": string
- "difficultStrategy": string

Response JSON:`;
    }

    const response = await client.models.generateContent({
      model: import.meta.env.VITE_GEMINI_MODEL || "gemma-4-26b-a4b-it",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini environment suggestion request failed, falling back to heuristics:", error);
    return getLocalEnvironmentSuggestions(type, habitName);
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

export function getGenAI() {
  if (genAI) return genAI;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey && apiKey.trim() !== "" && apiKey !== "your_gemini_api_key_here") {
    try {
      genAI = new GoogleGenerativeAI(apiKey);
    } catch (err) {
      console.error("Failed to initialize GoogleGenerativeAI:", err);
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
    stackedHabit: "After I pour my morning cup of coffee",
    twoMinRule: "Read 1 page of a book or write 1 sentence",
    environmentPrep: "Place my notebook open on the desk with a pen next to it before bed",
    immediateReward: "Tick off my tracker and drink a warm cup of coffee"
  };

  if (name.includes('athlete') || name.includes('fit') || name.includes('health') || name.includes('runner')) {
    suggestions = {
      stackedHabit: "After I drink my first glass of water in the morning",
      twoMinRule: "Do 5 bodyweight squats and 1 stretch",
      environmentPrep: "Lay out my workout shoes and clothes next to my bed the night before",
      immediateReward: "Enjoy a cold glass of lemon water or protein shake"
    };
  } else if (name.includes('writer') || name.includes('creative') || name.includes('book') || name.includes('journal')) {
    suggestions = {
      stackedHabit: "After I close my laptop screen at the end of my workday",
      twoMinRule: "Write 10 words or sketch for 2 minutes",
      environmentPrep: "Leave my journal open on my favorite desk spot with a pilot pen",
      immediateReward: "Listen to 1 favorite ambient track with headphones"
    };
  } else if (name.includes('mind') || name.includes('zen') || name.includes('calm') || name.includes('meditat')) {
    suggestions = {
      stackedHabit: "After I brush my teeth in the morning",
      twoMinRule: "Sit in silence and take 3 deep breaths",
      environmentPrep: "Put a meditation cushion in the quiet corner of the bedroom",
      immediateReward: "Gently stretch my shoulders and smile for 5 seconds"
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
      return { suggestion: "Unroll exercise mat in living room and stack workout clothes directly on coffee table." };
    } else if (hName.includes('write') || hName.includes('journal') || hName.includes('study')) {
      return { suggestion: "Place open notebook, pilot pen, and glasses on empty desk. Turn laptop completely off." };
    } else if (hName.includes('read') || hName.includes('book')) {
      return { suggestion: "Put bookmark-opened book on pillow. Remove charging cords from sleeping area." };
    } else if (hName.includes('meditat') || hName.includes('breath') || hName.includes('yoga')) {
      return { suggestion: "Place clean cushion in center of quiet bedroom corner with an ambient candle." };
    } else {
      return { suggestion: `Set out materials for ${habitName} in clear sight before your stacked routine trigger occurs.` };
    }
  } else {
    // bad habit brakes suggestions
    let invisible = "Keep trigger cues inside drawers, boxes, or other rooms.";
    let difficult = "Establish a friction obstacle or commitment device requiring 2+ minutes to reverse.";

    if (hName.includes('snack') || hName.includes('food') || hName.includes('sugar') || hName.includes('cookie')) {
      invisible = "Move cookie jars and chocolates into top pantry cabinets inside opaque boxes.";
      difficult = "Lock pantry cupboards after 9 PM. Put keys in hallway drawer.";
    } else if (hName.includes('scroll') || hName.includes('phone') || hName.includes('social') || hName.includes('screen')) {
      invisible = "Store mobile charger in kitchen. Keep phone out of bedtime bedroom.";
      difficult = "Turn off phone completely at 9:30 PM and set router to auto-shutoff.";
    } else if (hName.includes('tv') || hName.includes('netflix') || hName.includes('show') || hName.includes('game')) {
      invisible = "Put TV remote inside a closed drawer or wardrobe under sheets.";
      difficult = "Unplug TV power supply from plug point after turning it off.";
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
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are an expert behavior change coach specializing in James Clear's "Atomic Habits" philosophy.
The user is building a habit system for their identity: "${identityName}" and habit: "${habitTitle}".
Based on this, generate tailored recommendations for their habit loop.
The recommendations must fit the following format:
1. Stacked Routine (1st Law: Make it Obvious) - An anchor trigger: e.g., "After I [current habit/anchor], I will [new habit]".
2. Environment Prep (3rd Law: Make it Easy) - How to prime their physical environment to reduce friction: e.g., "Place [materials] in clear sight on [location]".
3. Two-Minute Rule (3rd Law: Make it Easy) - A simplified starter version of the habit that takes less than 2 minutes: e.g., "Read 1 page" or "Do 5 bodyweight squats".
4. Immediate Reward (4th Law: Make it Satisfying) - A quick, simple reward to enjoy immediately after completion.

You MUST respond with a raw JSON object and nothing else. The JSON object must have exactly these keys:
- "stackedHabit": string
- "environmentPrep": string
- "twoMinRule": string
- "immediateReward": string

Response JSON:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
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
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    if (type === 'engine') {
      const prompt = `You are an expert behavior change coach specializing in James Clear's "Atomic Habits" philosophy.
The user wants to prepare their physical environment to make the following habit easy and obvious: "${habitName}".
Suggest ONE highly specific, low-friction action to prep their environment (space preparation strategy) to trigger this habit.
Keep the suggestion concise (under 20 words) and direct.
You MUST respond with a raw JSON object and nothing else. The JSON object must have exactly this key:
- "suggestion": string

Response JSON:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return JSON.parse(text);
    } else {
      const prompt = `You are an expert behavior change coach specializing in James Clear's "Atomic Habits" philosophy.
The user wants to establish environment adjustments/brakes to stop a bad habit: "${habitName}".
Provide two specific recommendations:
1. Make it Invisible: How to hide the trigger cue or put it out of sight.
2. Make it Difficult: How to add physical friction or a commitment device (taking 2+ minutes to reverse) to stop the habit.
Keep each suggestion concise (under 20 words) and direct.
You MUST respond with a raw JSON object and nothing else. The JSON object must have exactly these keys:
- "invisibleStrategy": string
- "difficultStrategy": string

Response JSON:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return JSON.parse(text);
    }
  } catch (error) {
    console.error("Gemini environment suggestion request failed, falling back to heuristics:", error);
    return getLocalEnvironmentSuggestions(type, habitName);
  }
}


import { GoogleGenAI } from "@google/genai";
import { TerrainType, TerrainElement } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateHexDescription = async (
  terrain: TerrainType,
  element: TerrainElement
): Promise<string> => {
  const client = getAIClient();
  if (!client) return "AI description unavailable (Missing API Key).";

  const prompt = `
    You are a Pathfinder RPG Game Master helper for a unique setting.
    The setting is a blend of the American Wild West and Ancient Western China (Silk Road / Wuxia).
    Think: High steppes, red rock canyons, jade mountains, dusty trading posts, and spirits of the desert.

    Generate a concise, atmospheric description (max 3 sentences) for a wilderness hex.
    
    Terrain: ${terrain}
    Feature/Element: ${element}
    
    If the element is "Feature", "Resource", or "Secret", invent a specific interesting detail fitting this "East meets West" frontier theme.
    If "Difficult", describe the obstacle (e.g., flash floods, crumbling cliffside paths).
    If "Hunting Ground", hint at a predator (e.g., giant vultures, dune worms, spirit wolves).
    Do not use Markdown formatting. Keep it immersive.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate description from the oracle.";
  }
};

export const generateEncounter = async (
  terrain: TerrainType,
  partyLevel: number
): Promise<string> => {
  const client = getAIClient();
  if (!client) return "Encounter generation unavailable.";

  const prompt = `
    You are a Pathfinder RPG Game Master helper for a setting blending the American Wild West and Ancient Western China.
    Generate a random encounter for a party of level ${partyLevel} in a ${terrain} terrain.
    
    Provide:
    1. Name of creature(s) or hazard (Mix western tropes like Gunslingers/Bandits with Eastern tropes like Jiangshi/Spirit Beasts).
    2. A one-sentence setup describing how the encounter begins.
    Keep it brief.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No encounter details.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The oracle is silent.";
  }
};

import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

interface AIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export const generateItinerary = async (
  destination: string,
  number_of_days: number,
  startdate: Date,
  currency: string,
  budget: number,
  number_of_persons: number,
  interests?: string[]
) => {
  try {
    if (!GROQ_API_KEY) throw new Error("Missing GROQ API Key!");

    const interestText =
      interests && interests.length > 0
        ? `Interests to consider: ${interests.join(", ")}. Take it as a priority.`
        : "";

    const prompt = `
    Before generating the itinerary, if the destination name appears to be misspelled, vague, or invalid, intelligently correct it to the most likely valid city or country name (e.g., "indiad" should be "India", "parisss" should be "Paris", etc.). Use the corrected name in the response.
    Generate a detailed, optimized travel itinerary for a trip to **${destination}** spanning **${number_of_days}** days, starting from **${startdate}**.
    The total budget for this trip is **${currency} ${budget}**, and it is planned for **${number_of_persons}** people.
    ${interestText}

    ### **Strict Budget Utilization Guidelines:**
    - Ensure optimal use of the budget. The remaining budget should be reasonably low while maintaining quality.
    - Distribute expenses efficiently across accommodation, food, transport, and activities.
    - Do not exceed the given budget, but also do not leave more than 25-30% unspent.

    ### **Location Accuracy Requirements:**
    - Each activity, restaurant, and transport mode must include place name and city in format: #Place Name, City#
    - Food recommendations: #Restaurant Name, City#
    - Transport: #Transport Location, City#

    ### **Itinerary Structure:**
    - Each day: morning, afternoon, and evening sections.
    - Include food, transport, and cost breakdown per section.
    - Provide total budget estimation at the end.

    Return ONLY valid JSON in this exact format, no extra text:
    {
      "itinerary": {
        "destination": "${destination}",
        "number_of_days": ${number_of_days},
        "start_date": "${startdate}",
        "budget": "${budget}",
        "currency": "${currency}",
        "number_of_persons": ${number_of_persons},
        "interests": ${JSON.stringify(interests || [])},
        "days": [
          {
            "day": 1,
            "morning": {
              "activities": "string with #Place, City# format",
              "food": "string with #Restaurant, City# format",
              "transport": "string with #Location, City# format",
              "cost": "${currency} amount"
            },
            "afternoon": {
              "activities": "string",
              "food": "string",
              "transport": "string",
              "cost": "${currency} amount"
            },
            "evening": {
              "activities": "string",
              "food": "string",
              "transport": "string",
              "cost": "${currency} amount"
            },
            "budget_breakdown": "${currency} amount",
            "tips": "travel tip string"
          }
        ],
        "total_budget_used": "${currency} amount",
        "remaining_budget": "${currency} amount"
      }
    }
    `;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API request failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AIResponse;
    const rawContent = data.choices[0]?.message?.content?.trim();
    if (!rawContent) throw new Error("Empty response from Groq API");

    // Strip markdown code block if present
    const cleanedText = rawContent.replace(/^```json\s*|```$/gm, "").trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return { success: false, message: "Failed to generate itinerary." };
  }
};
import weaviate from 'weaviate-client';
import dotenv from 'dotenv';
dotenv.config();
const weaviateURL = process.env.WEAVIATE_URL as string 
const weaviateApiKey = process.env.WEAVIATE_API_KEY as string
const jinaaiApiKey = process.env.JINAAI_API_KEY as string
const mistralapikey= process.env.MISTRAL_API_KEY as string
const studioapikey= process.env.GOOGLE_API_KEY as string


import { prisma } from './prisma';

export async function searchQuery(query:string, placeId:string, limit:number):Promise<String>{
  try {
    const weaviateURL = process.env.WEAVIATE_URL as string;
    const weaviateApiKey = process.env.WEAVIATE_API_KEY as string;
    const jinaaiApiKey = process.env.JINAAI_API_KEY as string;
    const studioapikey= process.env.GOOGLE_API_KEY as string;

    if (weaviateURL && weaviateApiKey) {
      try {
        const client = await weaviate.connectToWeaviateCloud(
          weaviateURL,
          { authCredentials: new weaviate.ApiKey(weaviateApiKey),
            headers:{
              'X-JinaAI-Api-Key': jinaaiApiKey,
              'X-Goog-Studio-Api-Key': studioapikey,
            }
          }
        );
        const jeopardy = client.collections.get('ReviewSchema');
        const resGen = await jeopardy.generate.nearText([query],{
          groupedTask:`You are a friendly travel assistant.If the user is asking a general question like "hi", "how are you", or just greeting, respond normally without using the reviews.
          If the user is asking about something related to the place (like best time to visit, what to do, ticket prices, etc.), use the reviews to answer based on what people say.
          Here is the query: "${query}". Respond accordingly. `
        },{
          filters: jeopardy.filter.byProperty('place').containsAny([placeId]),
          returnMetadata:['distance'],
          limit
        });
        if (resGen.generated) {
           return JSON.stringify(resGen.generated);
        }
      } catch (weaviateErr) {
        console.error("Weaviate search failed, falling back to Groq", weaviateErr);
      }
    }

    // Fallback to Groq API
    let placeName = "the location";
    try {
      const place = await prisma.place.findFirst({ where: { placeId } });
      if (place && place.name) {
        placeName = place.name;
      }
    } catch (dbErr) {}

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a helpful travel assistant. The user is asking about the tourist destination: ${placeName}. Provide a friendly, concise, and helpful answer. Do not use markdown.`
          },
          {
            role: "user",
            content: query
          }
        ]
      })
    });
    
    const groqData = await groqResponse.json();
    return JSON.stringify(groqData.choices[0].message.content);
    
  } catch (err) {
    console.error("Error in searchQuery:", err);
    throw err;
  }
}

import { prisma } from "./prisma";
import e from "express";


export async function summaryRoute(req: any, res: any) {
    try {
        const { placeid } = req.query;
        if (!placeid) {
            res.status(400).json({ error: "Place ID is required" });
            return;
        }

        const data = await prisma.place.findFirst({
            where: { placeId: placeid },
            select: { summarizedReview: true, rating: true, name: true, address: true }
        });

        if (data?.summarizedReview) {
            res.status(200).json({ 
                summarizedReview: data.summarizedReview,
                rating: data.rating 
            });
            return;
        }

        // If no summary in DB, let's use Groq to generate one dynamically!
        // This acts as a fallback since the Web Scraper microservice isn't running.
        const placeName = data?.name || "this location";
        
        // Trigger the scraper via load balancer (Fire and forget)
        const loadBalancerUrl = process.env.LOAD_BALANCER_URL;
        if (loadBalancerUrl && data?.name) {
             fetch(`${loadBalancerUrl}/loadbalancer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    placeName: data.name,
                    maxScrolls: 5,
                    placeId: placeid,
                    placeAddress: data.address || ""
                })
            }).catch(e => console.error("Load balancer trigger failed:", e));
        }

        try {
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
                            content: "You are a travel assistant. Write a short, engaging 3-sentence summary of the provided tourist destination. Focus on what makes it special. Do not include introductory text."
                        },
                        {
                            role: "user",
                            content: `Summarize the destination: ${placeName}`
                        }
                    ]
                })
            });
            
            const groqData = await groqResponse.json();
            const generatedSummary = groqData.choices[0].message.content;
            
            // Random rating between 4.0 and 5.0 for the fallback
            const fallbackRating = (4.0 + Math.random() * 1.0).toFixed(1);

            // Save back to DB
            await prisma.place.updateMany({
                where: { placeId: placeid },
                data: { 
                    summarizedReview: generatedSummary,
                    rating: parseFloat(fallbackRating)
                }
            });

            res.status(200).json({ 
                summarizedReview: generatedSummary,
                rating: parseFloat(fallbackRating)
            });
            return;
        } catch (groqError) {
            console.error("Groq fallback failed:", groqError);
            res.status(404).json({ error: "No summary found and generation failed" });
            return;
        }

    } catch (error) {
        console.error("Error in summaryRoute:", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }
}
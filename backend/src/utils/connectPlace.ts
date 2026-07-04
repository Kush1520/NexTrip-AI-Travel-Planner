import { prisma } from "./prisma";

export default async function connectPlace(placeId: string, dayId: string): Promise<string | null> {
    
    try {
        const placeD = await prisma.place.update({
            where: {
                id: placeId
            },
            data: {
                day: {
                    connect: {
                        id: dayId
                    }
                }
            }
        })
        return placeD.id;
    } catch (err) {
        console.error("Error connecting place:", err);
        return null
    }
}
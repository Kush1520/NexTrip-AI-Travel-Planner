import { prisma } from "./prisma";

export default async function saveReview(review:string,rating:number,placeId:string):Promise<string|null>{
    
    // console.log(rating)
   try{
    const reviewD=await prisma.place.update({
        where:{
            placeId:placeId
        },
        data:{
            summarizedReview:review,
            rating:rating
        }
    })
    // console.log(reviewD)
    return reviewD.id;
   }catch(err){
        console.log(err);
        return null;
   }
}
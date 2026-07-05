import dotenv from 'dotenv';
dotenv.config();
export default async function callWebScrapper(placeName:string,maxScrolls:Number,placeId:string,placeAddress:string){
    try {
        const loadBalancerUrl = process.env.LOAD_BALANCER_URL;
        if (!loadBalancerUrl) {
            console.log("LOAD_BALANCER_URL is not set. Skipping web scraper call.");
            return null;
        }

        return await fetch(loadBalancerUrl, {
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'server-api-key': `${process.env.SERVER_API_KEY}`
            },
            body:JSON.stringify({placeName,maxScrolls,placeId,placeAddress})
        }).then((res)=>res.json())
        .then((data)=>{
            console.log(data);
            return data;
        }).catch((err)=>{
            console.log("Error in sending request to load balancer",err)
        });
    } catch (error) {
        console.error("Critical error in callWebScrapper:", error);
        return null;
    }
}
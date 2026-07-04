import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "trip-planner-4c341",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
} catch (error) {
  console.warn("⚠️ Firebase Admin initialization failed: Ensure FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL are set in your .env file.");
}

export const firebaseAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // const body = req.body;
    // console.log('Request Body:', body);
    // console.log('Request Headers:', req.headers);
  const googleauth = req.headers['google-auth'];
  console.log('Google Auth:', googleauth);
    if(googleauth!='true'){
      next();
      return
    }
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    console.log('Token:', token);
    
    try {
      // Verify Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Add user ID to request
      req.body.firebaseUserId = decodedToken.uid;
      
      next();
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (err) {
    console.error('Firebase auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  sendEmailVerification,
  type Auth
} from "firebase/auth";
import { useState, useEffect } from "react";

// Firebase configuration - replace with your actual Firebase config values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

// Initialize Firebase only when the required Vite env vars are present.
// This keeps the app renderable in local/dev environments without Firebase keys.
const app: FirebaseApp | null = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const auth: Auth | null = app ? getAuth(app) : null;
const googleProvider = auth ? new GoogleAuthProvider() : null;

export function getConfiguredAuth() {
  if (!auth) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values to your frontend .env file.");
  }

  return auth;
}

function getConfiguredGoogleProvider() {
  if (!googleProvider) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values to your frontend .env file.");
  }

  return googleProvider;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up with email and password
  const signup = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const firebaseAuth = getConfiguredAuth();
      
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      
      // Update profile with name
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user, {
          url: `${window.location.origin}/verify-otp`, // Redirect to OTP verification page
          handleCodeInApp: true,
        });
      }
      
      
      // Get Firebase token for backend integration
      const idToken = await userCredential.user.getIdToken();
      
      // Call your backend to store user in your database
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            email,
            password,
            name,
            firebaseUserId: userCredential.user.uid
          })
        });

        const data = await response.text();
        //@ts-ignore
        let jsonData;
        try {
          jsonData = JSON.parse(data);
        } catch (e) {
          console.error('Response is not JSON:', data);
          if (!response.ok) {
            throw new Error(`Backend returned status ${response.status}: ${data}`);
          }
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to register user in backend');
        }
      } catch (backendError: any) {
        console.error('Backend registration error:', backendError);
        // Continue since Firebase registration succeeded
      }
      
      return userCredential.user;
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message);
      throw new Error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signin = async (email: string, password: string) => {
    try {
      // setLoading(true);
      setError(null);
      
      // Call backend signin directly (no Firebase authentication for regular signin)
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({
          email,
          password,
          googleAuth: false,
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }
      
      // Return user data for state management
      return { 
        success: true, 
        user: { 
          email: email,
          name: data.name || 'User' // Get name from backend response
        } 
      };
    } catch (err: any) {
      console.error('Signin error:', err);
      setError(err.message);
      throw new Error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signinWithGoogle = async () => {
    try {
      // setLoading(true);
      setError(null);
      const firebaseAuth = getConfiguredAuth();
      const provider = getConfiguredGoogleProvider();
      
      const result = await signInWithPopup(firebaseAuth, provider);
      
      // Get Firebase token for backend integration
      const idToken = await result.user.getIdToken();
      const name = result.user.displayName || '';
      const email = result.user.email || '';
      
      // Create or verify user in backend
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            'google-auth': 'true'
          },
          credentials: 'include',
          body: JSON.stringify({
            email,
            name,
            googleAuth: true,
            firebaseUserId: result.user.uid
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.warn('Backend Google login warning:', errorData);
          // Continue anyway since Firebase login succeeded
        }
      } catch (backendError) {
        console.error('Backend Google login error:', backendError);
        // Continue since Firebase login succeeded
      }
      
      return result.user;
    } catch (err: any) {
      console.error('Google signin error:', err);
      setError(err.message);
      throw new Error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      const firebaseAuth = getConfiguredAuth();
      await signOut(firebaseAuth);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  };

  return {
    currentUser,
    loading,
    error,
    signup,
    signin,
    signinWithGoogle,
    logout
  };
}

export { auth };

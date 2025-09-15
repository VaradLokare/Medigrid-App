// firebase.ts
import { initializeApp } from "firebase/app";
import {
    User as FirebaseUser,
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔑 Firebase config (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBPDTva1kBr73VASF36htznxyH0lsb4FUc",
  authDomain: "medigridapp.firebaseapp.com",
  projectId: "medigridapp",
  storageBucket: "medigridapp.appspot.com",
  messagingSenderId: "872648052958",
  appId: "1:872648052958:ios:c93d0e91384b1b011b724f",
};

// 🚀 Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Firebase Authentication
export const auth = getAuth(app);

// ✅ Initialize Cloud Firestore
export const db = getFirestore(app);

// ✅ Google Auth Provider
const provider = new GoogleAuthProvider();

/**
 * Sign in with Google
 * Returns both Firebase User + OAuth AccessToken
 */
export const signInWithGoogle = async (): Promise<{
  user: FirebaseUser;
  accessToken: string | null;
}> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken ?? null;

    return { user: result.user, accessToken };
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

// ✅ Sign out helper
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out error:", error);
  }
};

// ✅ Custom User type for your app
export type User = {
  uid: string;
  email: string | null;
  name?: string | null;
};

// ✅ Helper: map FirebaseUser → your User type
export const mapUser = (user: FirebaseUser | null): User | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName ?? null,
  };
};

export default app;

// firebase.ts
import { initializeApp } from "firebase/app";
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  signOut,
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

// 🔑 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBPDTva1kBr73VASF36htznxyH0lsb4FUc",
  authDomain: "medigridapp.firebaseapp.com",
  projectId: "medigridapp",
  storageBucket: "medigridapp.appspot.com",
  messagingSenderId: "872648052958",
  appId: "1:872648052958:ios:c93d0e91384b1b011b724f",
};

// 🚀 Initialize Firebase
export const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth with in-memory persistence (React Native compatible)
export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});

// ✅ Firestore
export const db = getFirestore(app);

// ✅ Google Auth Provider
export const provider = new GoogleAuthProvider();

// -------------------- Helper Functions -------------------- //

/**
 * Calculate age from date of birth
 */
const calculateAge = (dob: string | null): number | undefined => {
  if (!dob) return undefined;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Map Firebase User → App User
 */
export const mapUser = (user: FirebaseUser | null, dob: string | null = null) => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName ?? null,
    dateOfBirth: dob,
    age: calculateAge(dob),
  };
};

/**
 * Save user to Firestore
 */
export const saveUserToFirestore = async (user: FirebaseUser, dob: string | null = null) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const existingUser = await getDoc(userRef);

    if (!existingUser.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName ?? null,
        dateOfBirth: dob,
      });
    } else if (dob) {
      await setDoc(userRef, { dateOfBirth: dob }, { merge: true });
    }
  } catch (error) {
    console.error("Error saving user:", error);
  }
};

/**
 * Sign out helper
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out error:", error);
  }
};

// ✅ Default export
export default app;

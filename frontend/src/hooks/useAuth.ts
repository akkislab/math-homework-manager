"use client";
import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { setUserRole } from "../lib/api";
import type { UserRole } from "../types";

export interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const tokenResult = await u.getIdTokenResult();
        setRole((tokenResult.claims.role as UserRole) ?? null);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, role, loading };
}

// ── Auth actions ──────────────────────────────────────────────────────────────
export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = () =>
  signInWithPopup(auth, new GoogleAuthProvider());

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  role: UserRole
) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Create Firestore profile
  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    displayName,
    email,
    role,
    createdAt: serverTimestamp(),
  });

  // Set custom claim (requires Cloud Function call)
  await setUserRole({ targetUid: credential.user.uid, role });

  // Force token refresh so claim is available immediately
  await credential.user.getIdToken(true);
  return credential;
};

export const logout = () => signOut(auth);

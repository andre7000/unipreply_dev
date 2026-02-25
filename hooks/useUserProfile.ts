import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { createDefaultWorkspace } from "@/lib/workspace";
import type { User } from "firebase/auth";
import type { UserProfile, UserType } from "@/types/profile";

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  setProfile: (profile: Partial<UserProfile>) => Promise<void>;
  createProfile: (userType: UserType, displayName?: string) => Promise<void>;
}

export function useUserProfile(user: User | null): UseUserProfileReturn {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfileState(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (cancelled) return;
        if (docSnap.exists()) {
          setProfileState({ uid: user.uid, ...docSnap.data() } as UserProfile);
        } else {
          setProfileState(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading profile:", err);
        setError("Failed to load profile");
        setProfileState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const createProfile = async (
    userType: UserType,
    displayName?: string
  ): Promise<void> => {
    if (!user) return;

    setError(null);
    try {
      const docRef = doc(db, "users", user.uid);
      const profileData: Omit<UserProfile, "uid"> = {
        email: user.email ?? null,
        displayName: displayName ?? user.displayName ?? undefined,
        userType,
      };
      await setDoc(docRef, {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await createDefaultWorkspace(
        user.uid,
        userType,
        profileData.displayName
      );
      setProfileState({ uid: user.uid, ...profileData });
    } catch (err) {
      console.error("Error creating profile:", err);
      setError("Failed to create profile");
      throw err;
    }
  };

  const setProfile = async (
    updates: Partial<Omit<UserProfile, "uid">>
  ): Promise<void> => {
    if (!user) return;

    setError(null);
    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(
        docRef,
        { ...updates, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setProfileState((prev) =>
        prev ? { ...prev, ...updates } : ({ uid: user.uid, ...updates } as UserProfile)
      );
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
      throw err;
    }
  };

  return { profile, loading, error, setProfile, createProfile };
}

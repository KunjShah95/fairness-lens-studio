import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import type { User as AppUser } from './types';
import { useAppStore } from './store';
import { AuthContext } from './auth-context-core';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser: setStoreUser } = useAppStore();

  const fbAuth = getFirebaseAuth();
  const fbDb = getFirebaseDb();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, (firebaseUser) => {
      if (firebaseUser) {
        const userData: AppUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: 'analyst',
        };
        setUserState(userData);
        setStoreUser(userData);
      } else {
        setUserState(null);
        setStoreUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fbAuth, setStoreUser]);

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(fbAuth, email, password);
    const userData: AppUser = {
      id: result.user.uid,
      email: result.user.email || '',
      name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
      role: 'analyst',
    };
    setUserState(userData);
    setStoreUser(userData);
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const result = await createUserWithEmailAndPassword(fbAuth, email, password);
    if (result.user) {
      await updateProfile(result.user, { displayName: name });
    }
    const userData: AppUser = {
      id: result.user.uid,
      email,
      name,
      role: 'analyst',
    };
    setUserState(userData);
    setStoreUser(userData);
    setLoading(false);
    
    // Background sync
    try {
      await setDoc(doc(fbDb, 'users', result.user.uid), {
        ...userData,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Silently fail
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(fbAuth, provider);
    
    // Set user immediately from Google data (optimistic)
    const userData: AppUser = {
      id: result.user.uid,
      email: result.user.email || '',
      name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
      role: 'analyst',
    };
    setUserState(userData);
    setStoreUser(userData);
    setLoading(false);
    
    // Background sync to Firestore
    try {
      const existingUser = await getDoc(doc(fbDb, 'users', result.user.uid));
      if (!existingUser.exists()) {
        await setDoc(doc(fbDb, 'users', result.user.uid), {
          ...userData,
          createdAt: serverTimestamp(),
        });
      }
    } catch {
      // Silently fail - user already set
    }
  };

  const logout = async () => {
    await signOut(fbAuth);
    setUserState(null);
    setStoreUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(fbAuth, email);
  };

  const updateUserProfile = async (data: Partial<AppUser>) => {
    if (!user) return;
    await setDoc(doc(fbDb, 'users', user.id), data, { merge: true });
    const updatedUser = { ...user, ...data };
    setUserState(updatedUser);
    setStoreUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logout, resetPassword, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

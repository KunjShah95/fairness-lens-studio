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
import type { User as AppUser, UserRole } from './types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

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
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fbAuth]);

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(fbAuth, email, password);
    const userData: AppUser = {
      id: result.user.uid,
      email: result.user.email || '',
      name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
      role: 'analyst',
    };
    setUser(userData);
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
    setUser(userData);
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
    setUser(userData);
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
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(fbAuth, email);
  };

  const updateUserProfile = async (data: Partial<AppUser>) => {
    if (!user) return;
    await setDoc(doc(fbDb, 'users', user.id), data, { merge: true });
    setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logout, resetPassword, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
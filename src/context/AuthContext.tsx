import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export interface OperatorProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  clearanceLevel: 'TS-SCI' | 'SECRET' | 'RESTRICTED' | 'OPERATOR';
  role: 'COMMANDER' | 'INTEL_OFFICER' | 'TACTICAL_OPERATOR';
}

interface AuthContextType {
  user: User | null;
  operatorProfile: OperatorProfile | null;
  loading: boolean;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  signupWithEmail: (e: string, p: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setOperatorProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Tactical Operator',
          email: firebaseUser.email || 'operator@vanguard.c2',
          photoURL: firebaseUser.photoURL || undefined,
          clearanceLevel: 'TS-SCI',
          role: 'COMMANDER'
        });
      } else {
        setUser(null);
        setOperatorProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.warn('[Firebase Auth] Sign in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        setOperatorProfile((prev) =>
          prev
            ? { ...prev, displayName: name }
            : {
                uid: cred.user.uid,
                displayName: name,
                email,
                clearanceLevel: 'TS-SCI',
                role: 'COMMANDER'
              }
        );
      }
    } catch (err: any) {
      console.warn('[Firebase Auth] Signup failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('[Firebase Auth] Google login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setOperatorProfile(null);
    } catch (err) {
      console.warn('[Firebase Auth] Sign out failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        operatorProfile,
        loading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

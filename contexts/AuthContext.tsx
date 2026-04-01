"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'super_admin' | 'admin' | 'restaurant';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user role from Firestore using email as the document ID
        const userEmail = firebaseUser.email?.toLowerCase();
        if (!userEmail) {
          setUserData(null);
          setLoading(false);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', userEmail));
          if (userDoc.exists()) {
            setUserData({ uid: userEmail, ...userDoc.data() } as UserData);
          } else {
            // If no user doc, check if it's the default super admin
            if (userEmail === 'chenkarfei@gmail.com' || userEmail === 'evotech4001@gmail.com') {
              setUserData({
                uid: userEmail,
                email: userEmail,
                name: 'Super Admin',
                role: 'super_admin',
                isActive: true,
              });
            } else {
              setUserData(null);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

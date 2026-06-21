import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../db/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = noch am Laden

  // Falls der Login per Redirect lief: Ergebnis nach Rückkehr abholen (Fehler sichtbar machen)
  useEffect(() => {
    getRedirectResult(auth).catch((err) => console.error('Redirect-Login fehlgeschlagen:', err));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            displayName: firebaseUser.displayName,
            photoURL:    firebaseUser.photoURL,
            lastSeen:    serverTimestamp(),
          },
          { merge: true }
        );
      }
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      return await signInWithPopup(auth, provider);
    } catch (e) {
      // Popup von Browser/COOP blockiert → auf Redirect-Login ausweichen
      const popupProblem = [
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/internal-error',
      ].includes(e?.code);
      if (popupProblem) {
        return signInWithRedirect(auth, provider);
      }
      throw e;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
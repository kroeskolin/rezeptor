import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../db/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = noch am Laden
  const [, bumpRefresh] = useState(0); // erzwingt Re-Render nach Profiländerung

  // Falls der Login per Redirect lief: Ergebnis nach Rückkehr abholen (Fehler sichtbar machen)
  useEffect(() => {
    getRedirectResult(auth).catch((err) => console.error('Redirect-Login fehlgeschlagen:', err));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // displayName nur schreiben, wenn vorhanden – sonst würde der bei anonymem
        // Login (noch ohne Namen) gesetzte Name wieder auf null überschrieben.
        const data = { photoURL: firebaseUser.photoURL || null, lastSeen: serverTimestamp() };
        if (firebaseUser.displayName) data.displayName = firebaseUser.displayName;
        await setDoc(doc(db, 'users', firebaseUser.uid), data, { merge: true });
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

  // Ohne Google: anonym mit selbstgewähltem Namen beitreten
  const signInWithName = async (name) => {
    const clean = (name || '').trim();
    if (!clean) throw new Error('Bitte gib einen Namen ein.');
    const cred = await signInAnonymously(auth);
    await updateProfile(cred.user, { displayName: clean });
    await setDoc(
      doc(db, 'users', cred.user.uid),
      { displayName: clean, photoURL: null, lastSeen: serverTimestamp() },
      { merge: true }
    );
    // currentUser ist dasselbe Objekt im State; Re-Render anstoßen, damit der Name erscheint
    bumpRefresh((n) => n + 1);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signInWithName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
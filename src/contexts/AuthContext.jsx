import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  linkWithPopup,
  linkWithRedirect,
  getRedirectResult,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../db/firebase';

const AuthContext = createContext(null);

// Popup vom Browser/COOP blockiert → auf Redirect-Login ausweichen.
// (In iOS-Standalone-PWAs sind Popups oft nicht möglich → Redirect ist dort der Normalfall.)
const POPUP_PROBLEMS = [
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/internal-error',
  'auth/operation-not-supported-in-this-environment',
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = noch am Laden
  const [, bumpRefresh] = useState(0); // erzwingt Re-Render nach Profiländerung

  // Falls der Login per Redirect lief: Ergebnis nach Rückkehr abholen.
  // Sonderfall bei der Verknüpfung (linkWithRedirect): Gibt es das Google-Konto schon
  // (anderes Gerät), schlägt das Verknüpfen fehl → dann mit dem bestehenden Konto anmelden.
  useEffect(() => {
    getRedirectResult(auth).catch(async (err) => {
      if (err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/email-already-in-use') {
        const cred = GoogleAuthProvider.credentialFromError(err);
        if (cred) {
          try {
            await signInWithCredential(auth, cred);
            return;
          } catch (e2) {
            console.error('Anmeldung mit bestehendem Konto fehlgeschlagen:', e2);
          }
        }
      }
      console.error('Redirect-Login fehlgeschlagen:', err);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Zuerst den Login-Zustand setzen – darf NIE an einem Firestore-Write hängen
      setUser(firebaseUser);
      if (firebaseUser) {
        // displayName nur schreiben, wenn vorhanden – sonst würde der bei anonymem
        // Login (noch ohne Namen) gesetzte Name wieder auf null überschrieben.
        const data = { photoURL: firebaseUser.photoURL || null, lastSeen: serverTimestamp() };
        if (firebaseUser.displayName) data.displayName = firebaseUser.displayName;
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), data, { merge: true });
        } catch (e) {
          console.error('users-Dokument konnte nicht geschrieben werden:', e);
        }
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const current = auth.currentUser;

    // Anonymes Konto → zu Google „hochstufen" (verknüpfen): gleicher UID, alle
    // Rezepte/Tags/Aktivitäten bleiben am selben Konto, nichts wird verwaist.
    if (current && current.isAnonymous) {
      try {
        return await linkWithPopup(current, provider);
      } catch (e) {
        // Google-Konto existiert schon (z.B. anderes Gerät): Verknüpfen unmöglich
        // → mit dem bestehenden Konto anmelden. Lokale Rezepte bleiben lokal und
        //   werden danach automatisch ins bestehende Konto gesichert.
        if (e?.code === 'auth/credential-already-in-use' || e?.code === 'auth/email-already-in-use') {
          const cred = GoogleAuthProvider.credentialFromError(e);
          if (cred) return await signInWithCredential(auth, cred);
        }
        if (POPUP_PROBLEMS.includes(e?.code)) {
          return linkWithRedirect(current, provider);
        }
        throw e;
      }
    }

    // Kein anonymes Konto → normaler Login
    try {
      return await signInWithPopup(auth, provider);
    } catch (e) {
      if (POPUP_PROBLEMS.includes(e?.code)) {
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
    try {
      await setDoc(
        doc(db, 'users', cred.user.uid),
        { displayName: clean, photoURL: null, lastSeen: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error('users-Dokument konnte nicht geschrieben werden:', e);
    }
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
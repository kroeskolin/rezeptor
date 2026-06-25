// useTheme.js — Theme-Hook
// Speichert und lädt das aktive Theme

export const THEMES = [
  {
    id: 'default',
    name: 'Karolins Leibspeise',
    colors: ['#C8D9BF', '#473528', '#EDD4CF', '#F9FBF8'],
  },
  {
    id: 'salbei',
    name: 'Salbei-Risotto',
    colors: ['#809589', '#3E4F57', '#E4CACA', '#FBF4F0'],
  },
  {
    id: 'himbeer',
    name: 'Himbeer-Grießbrei',
    colors: ['#CA9695', '#46333A', '#F1D5CE', '#FDF8F2'],
  },
  {
    id: 'gorgonzola',
    name: 'Gorgonzola-Gnocchi',
    colors: ['#496C86', '#233A49', '#BCD2D7', '#FCF8F3'],
  },
];

import { auth, db } from './db/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export function applyTheme(themeId, opts = {}) {
  // Alle Theme-Klassen entfernen
  const html = document.documentElement;
  THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
  // Neue Klasse setzen (default braucht keine Klasse)
  if (themeId !== 'default') {
    html.classList.add(`theme-${themeId}`);
  }
  localStorage.setItem('rezeptor-theme', themeId);
  // Bei eingeloggtem Nutzer ans Konto heften
  if (!opts.skipCloud && auth.currentUser) {
    setDoc(doc(db, 'users', auth.currentUser.uid), { theme: themeId }, { merge: true })
      .catch(err => console.error('Theme speichern (Cloud) fehlgeschlagen:', err));
  }
}

export function loadTheme() {
  const saved = localStorage.getItem('rezeptor-theme') || 'default';
  // Falls ein gelöschtes/unbekanntes Theme gespeichert ist → Default
  const valid = THEMES.some(t => t.id === saved) ? saved : 'default';
  applyTheme(valid, { skipCloud: true });
  return valid;
}

// Beim Login das am Konto gespeicherte Theme übernehmen.
export async function syncThemeFromCloud() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const t = snap.exists() ? snap.data().theme : null;
    if (t && THEMES.some(x => x.id === t)) {
      applyTheme(t, { skipCloud: true });
    } else {
      // Noch kein Theme am Konto → aktuelles lokales Theme dort sichern
      const local = localStorage.getItem('rezeptor-theme') || 'default';
      setDoc(doc(db, 'users', user.uid), { theme: local }, { merge: true }).catch(() => { });
    }
  } catch (err) {
    console.error('Theme aus Cloud laden fehlgeschlagen:', err);
  }
}
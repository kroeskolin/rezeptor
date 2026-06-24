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

export function applyTheme(themeId) {
  // Alle Theme-Klassen entfernen
  const html = document.documentElement;
  THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
  // Neue Klasse setzen (default braucht keine Klasse)
  if (themeId !== 'default') {
    html.classList.add(`theme-${themeId}`);
  }
  localStorage.setItem('rezeptor-theme', themeId);
}

export function loadTheme() {
  const saved = localStorage.getItem('rezeptor-theme') || 'default';
  // Falls ein gelöschtes/unbekanntes Theme gespeichert ist → Default
  const valid = THEMES.some(t => t.id === saved) ? saved : 'default';
  applyTheme(valid);
  return valid;
}
// useTheme.js — Theme-Hook
// Speichert und lädt das aktive Theme

export const THEMES = [
  {
    id: 'default',
    name: 'Waldgrün',
    colors: ['#C8D9BF', '#473528', '#EDD4CF', '#F9FBF8'],
  },
  {
    id: 'nocturne',
    name: 'Nocturne',
    colors: ['#C4BBDB', '#1E1E1E', '#EDB8B8', '#FEFAF2'],
  },
  {
    id: 'herbst',
    name: 'Herbst',
    colors: ['#D4B8C7', '#3D1F35', '#E8D0DA', '#F5F0F2'],
  },
  {
    id: 'nacht',
    name: 'Nacht',
    colors: ['#4A8A96', '#E3EAF0', '#3A4A50', '#252B2B'],
  },
  {
    id: 'sommer',
    name: 'Sommer',
    colors: ['#7DD4D4', '#1A3A36', '#B8EAE4', '#F2FAF8'],
  },
  {
    id: 'harvest',
    name: 'Harvest',
    colors: ['#F5D080', '#4A1A14', '#F0C8B8', '#FDF8F0'],
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
  applyTheme(saved);
  return saved;
}
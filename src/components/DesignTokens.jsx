// Shared design helpers — used across all components

export const COVER_TINTS = [
  { bg: '#C8D9BF', ink: '#3C5232' },  // sage
  { bg: '#EDD4CF', ink: '#8A4F46' },  // rose
  { bg: '#E7DCC6', ink: '#6A5230' },  // cream
  { bg: '#DCE7D0', ink: '#46603A' },  // pale green
];

export function coverTint(recipe) {
  const k = recipe
    ? typeof recipe.id === 'number'
      ? recipe.id
      : (recipe.title || '').length
    : 0;
  return COVER_TINTS[Math.abs(k) % COVER_TINTS.length];
}

export function getInitial(recipe) {
  return ((recipe && recipe.title) || '?').trim().charAt(0).toUpperCase();
}

export function totalTime(recipe) {
  if (!recipe) return 0;
  return (recipe.prepTime || 0) + (recipe.cookTime || 0);
}

export function Monogram({ recipe, size = 56, radius = 14 }) {
  const t = coverTint(recipe);
  const initial = getInitial(recipe);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: t.bg, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        fontFamily: 'var(--logo)', fontWeight: 600,
        fontSize: size * 0.56, color: t.ink, lineHeight: 1,
      }}>{initial}</span>
    </div>
  );
}

export function Icon({ name, size = 24, color = 'var(--espresso)', strokeWidth = 1.6, fill = false }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'book': return (
      <svg {...p}><path d="M12 6.2C9.6 4.7 6.6 4.5 4 5.4v13c2.6-.9 5.6-.7 8 .8 2.4-1.5 5.4-1.7 8-.8v-13c-2.6-.9-5.6-.7-8 .8z" /><path d="M12 6.2v13.8" /></svg>
    );
    case 'plate': return (
      <svg {...p}><circle cx="12" cy="13" r="5.4" /><circle cx="12" cy="13" r="2.2" /><path d="M4.3 4v4.2M5.6 4v4.2M3 4v4.2M4.3 8.2V20" /><path d="M19.7 4c-1.3 1-1.7 3.2-1.3 5 .3 1.2 1.3 1.4 1.3 1.4V20" /></svg>
    );
    case 'heartnav': return (
      <svg {...p} fill={fill ? color : 'none'}><path d="M12 20C5 15.5 3 12 5 9c1.6-2.4 5-2.2 7 .5 2-2.7 5.4-2.9 7-.5 2 3 0 6.5-7 11z" /></svg>
    );
    case 'wrench': return (
      <svg {...p}><path d="M15.5 7.5a3.8 3.8 0 0 0-4.9 4.6L4 18.7a2 2 0 0 0 2.8 2.8l6.6-6.6a3.8 3.8 0 0 0 4.6-4.9l-2.3 2.3-2.2-.6-.6-2.2z" /></svg>
    );
    case 'search': return (
      <svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.6-3.6" /></svg>
    );
    case 'plus': return (
      <svg {...p}><path d="M12 5v14M5 12h14" /></svg>
    );
    case 'clock': return (
      <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
    );
    case 'dice': return (
      <svg {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.1" fill={color} stroke="none" /><circle cx="15" cy="15" r="1.1" fill={color} stroke="none" /><circle cx="15" cy="9" r="1.1" fill={color} stroke="none" /><circle cx="9" cy="15" r="1.1" fill={color} stroke="none" /></svg>
    );
    case 'cards': return (
      <svg {...p}><rect x="3" y="6" width="13" height="15" rx="2.5" transform="rotate(-8 9.5 13.5)" /><rect x="8" y="5" width="13" height="15" rx="2.5" transform="rotate(7 14.5 12.5)" /></svg>
    );
    case 'recycle': return (
      <svg {...p}><path d="M7 8l-2.6 4.5 3 .1M7 8l2.4-1.4 2 3.4M17 8l2.6 4.5-3 .1M12 20l-2.5-1.5 2-3.4M5.4 12.6l-1 3.4 4 1.2M18.6 12.6l1 3.4-4 1.2" /></svg>
    );
    case 'pencil': return (
      <svg {...p}><path d="M14.5 5.5l4 4M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19z" /></svg>
    );
    case 'x': return (
      <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
    );
    case 'chev': return (
      <svg {...p}><path d="M9 6l6 6-6 6" /></svg>
    );
    case 'chev-left': return (
      <svg {...p}><path d="M15 6l-6 6 6 6" /></svg>
    );
    case 'bookmark': return (
      <svg {...p} fill={fill ? color : 'none'}><path d="M6 4h12v16l-6-4-6 4z" /></svg>
    );
    case 'chefhat': return (
      <svg {...p}><path d="M6 13a4 4 0 1 1 1.3-7.8 4 4 0 0 1 9.4 0A4 4 0 1 1 18 13z" /><path d="M6.5 13v5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-5" /></svg>
    );
    case 'undo': return (
      <svg {...p}><path d="M9 7H5V3M5 7a8 8 0 1 1-2 5" /></svg>
    );
    case 'star': return (
      <svg {...p} fill={fill ? color : 'none'}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" /></svg>
    );
    case 'heart': return (
      <svg {...p} fill={fill ? color : 'none'}><path d="M12 20C5 15.5 3 12 5 9c1.6-2.4 5-2.2 7 .5 2-2.7 5.4-2.9 7-.5 2 3 0 6.5-7 11z" /></svg>
    );
    case 'user': return (
      <svg {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
    );
    case 'bell': return (
      <svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 2 7H4c.5-.5 2-2 2-7z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
    );
    case 'sun': return (
      <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" /></svg>
    );
    case 'download': return (
      <svg {...p}><path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M5 20h14" /></svg>
    );
    case 'globe': return (
      <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5C9.6 18.2 8.4 15.2 8.4 12S9.6 5.8 12 3.5z" /></svg>
    );
    case 'ruler': return (
      <svg {...p}><rect x="2.5" y="7.5" width="19" height="9" rx="2" /><path d="M7 7.5v3M11 7.5v4.5M15 7.5v3M19 7.5v4.5" /></svg>
    );
    case 'shield': return (
      <svg {...p}><path d="M12 3l7 2.5v5c0 5-3.2 8.2-7 9.5-3.8-1.3-7-4.5-7-9.5v-5z" /></svg>
    );
    case 'help': return (
      <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8" /><circle cx="12" cy="17" r="0.4" fill={color} stroke={color} /></svg>
    );
    case 'link': return (
      <svg {...p}><path d="M9.5 14.5l5-5" /><path d="M8 11.5l-2 2a3.2 3.2 0 0 0 4.5 4.5l2-2" /><path d="M16 12.5l2-2a3.2 3.2 0 0 0-4.5-4.5l-2 2" /></svg>
    );
    case 'mic': return (
      <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" /><path d="M12 18v3" /></svg>
    );
    case 'camera': return (
      <svg {...p}><path d="M3 8.5a2 2 0 0 1 2-2h1.6l1-1.6h4.8l1 1.6H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.2" /></svg>
    );
    case 'pen': return (
      <svg {...p}><path d="M4 20l4-1 9.5-9.5a2 2 0 0 0-2.8-2.8L5 16z" /><path d="M13.5 7.5l3 3" /></svg>
    );
    case 'trash': return (
      <svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
    );
    case 'share': return (
      <svg {...p}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" /></svg>
    );
    case 'import': return (
      <svg {...p}><path d="M12 3v11M7.5 9.5L12 14l4.5-4.5M5 20h14" /></svg>
    );
    case 'basket': return (
      <svg {...p}><path d="M6 2l-2 4h16l-2-4M4 6l1.5 11h13L20 6M9 11v4M15 11v4" /></svg>
    );
    case 'minus': return (
      <svg {...p}><path d="M5 12h14" /></svg>
    );
    case 'chev-up': return (
      <svg {...p}><path d="M6 15l6-6 6 6" /></svg>
    );
    case 'chev-down': return (
      <svg {...p}><path d="M6 9l6 6 6-6" /></svg>
    );
    case 'check': return (
      <svg {...p}><path d="M4 12l6 6L20 6" /></svg>
    );
    default: return (
      <svg {...p}><circle cx="12" cy="12" r="5" /></svg>
    );
  }
}

export function Wordmark({ size = 26, color = 'var(--espresso)' }) {
  return (
    <span style={{
      fontFamily: 'var(--logo)',
      fontWeight: 600,
      fontSize: size,
      color,
      letterSpacing: '-0.01em',
      lineHeight: 1,
    }}>
      Rezept<em style={{ fontStyle: 'italic' }}>or</em>
    </span>
  );
}

export function LoveDot({ size = 28, shadow = false, filled = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--rose-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: shadow ? '0 2px 8px rgba(71,53,40,0.25)' : 'none',
    }}>
      <Icon name="heart" size={size * 0.52} color="var(--rose-ink)"
        fill={filled} strokeWidth={filled ? 0 : 1.8} />
    </div>
  );
}

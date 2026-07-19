// Regional colour theme system — applies CSS custom properties on <html>
// based on the user's chosen theme (chhath / mithila / bhojpur / magadh / anga).
// The palette also drives gradients, chip colours, and the story-viewer.

const THEMES = {
  chhath: {
    label: 'Chhath Sunrise',
    tagline: 'Rose → saffron → gold — the sun rising over the Ganga.',
    vars: {
      '--brand-1':      '#F43F5E',
      '--brand-2':      '#F97316',
      '--brand-3':      '#FBBF24',
      '--brand-accent': '#B91C3C',
      '--brand-soft':   'rgba(244, 63, 94, 0.08)',
      '--brand-ring':   'rgba(244, 63, 94, 0.15)',
    },
  },
  mithila: {
    label: 'Mithila Alta',
    tagline: 'Alta red and turmeric yellow — the Madhubani palette.',
    vars: {
      '--brand-1':      '#DC2626',
      '--brand-2':      '#EA580C',
      '--brand-3':      '#F59E0B',
      '--brand-accent': '#7C2D12',
      '--brand-soft':   'rgba(220, 38, 38, 0.08)',
      '--brand-ring':   'rgba(220, 38, 38, 0.18)',
    },
  },
  bhojpur: {
    label: 'Bhojpur Indigo',
    tagline: 'Deep indigo and cream — the Champaran fields.',
    vars: {
      '--brand-1':      '#1E3A8A',
      '--brand-2':      '#4338CA',
      '--brand-3':      '#818CF8',
      '--brand-accent': '#1E1B4B',
      '--brand-soft':   'rgba(67, 56, 202, 0.08)',
      '--brand-ring':   'rgba(67, 56, 202, 0.16)',
    },
  },
  magadh: {
    label: 'Magadh Sandstone',
    tagline: 'Nalanda terracotta and gold — Ashoka\'s palette.',
    vars: {
      '--brand-1':      '#B45309',
      '--brand-2':      '#EA580C',
      '--brand-3':      '#FBBF24',
      '--brand-accent': '#7C2D12',
      '--brand-soft':   'rgba(180, 83, 9, 0.08)',
      '--brand-ring':   'rgba(180, 83, 9, 0.18)',
    },
  },
  anga: {
    label: 'Anga Manjusha',
    tagline: 'Yellow, rose, green — the Manjusha triptych.',
    vars: {
      '--brand-1':      '#F59E0B',
      '--brand-2':      '#EC4899',
      '--brand-3':      '#16A34A',
      '--brand-accent': '#065F46',
      '--brand-soft':   'rgba(245, 158, 11, 0.08)',
      '--brand-ring':   'rgba(245, 158, 11, 0.18)',
    },
  },
};

export function listThemes() {
  return Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label, tagline: t.tagline, vars: t.vars }));
}

/** Apply a theme by ID. Falls back to chhath on unknown values. */
export function applyTheme(id) {
  const theme = THEMES[id] || THEMES.chhath;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
  root.setAttribute('data-theme', id in THEMES ? id : 'chhath');
  try { localStorage.setItem('bidesiya.theme', id); } catch {}
}

/** Load stored theme (before /users/me returns) so the paint doesn't flash. */
export function loadStoredTheme() {
  try {
    const stored = localStorage.getItem('bidesiya.theme');
    if (stored && THEMES[stored]) applyTheme(stored);
  } catch {}
}

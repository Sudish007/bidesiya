// Bihar-inspired SVG art — empty states, spinners, dividers, avatar rings.
// All inline SVG (small, tree-shakes to nothing when unused).
// Everything is stroke-based so the CSS `stroke: var(--brand-1)` cascades in.

export const emptyChhathGhat = `
<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <!-- Sun -->
  <circle cx="100" cy="60" r="14" fill="currentColor" opacity="0.15" stroke="currentColor" />
  <line x1="100" y1="38" x2="100" y2="30"/>
  <line x1="100" y1="82" x2="100" y2="90"/>
  <line x1="78" y1="60" x2="70" y2="60"/>
  <line x1="122" y1="60" x2="130" y2="60"/>
  <line x1="85" y1="45" x2="80" y2="40"/>
  <line x1="115" y1="45" x2="120" y2="40"/>
  <line x1="85" y1="75" x2="80" y2="80"/>
  <line x1="115" y1="75" x2="120" y2="80"/>
  <!-- Ghat steps -->
  <path d="M20 110 L50 110 L50 105 L80 105 L80 100 L120 100 L120 105 L150 105 L150 110 L180 110"/>
  <path d="M40 118 L160 118"/>
  <!-- Water ripples -->
  <path d="M10 128 q 8 -4 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0" opacity="0.6" />
  <path d="M20 135 q 6 -3 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0" opacity="0.4" />
  <!-- Diya on left -->
  <path d="M30 100 q4 6 8 0" fill="currentColor" opacity="0.6"/>
  <line x1="34" y1="95" x2="34" y2="99"/>
  <!-- Diya on right -->
  <path d="M162 100 q4 6 8 0" fill="currentColor" opacity="0.6"/>
  <line x1="166" y1="95" x2="166" y2="99"/>
</svg>`;

export const emptyPeepal = `
<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <!-- Tree trunk -->
  <path d="M100 130 L100 90"/>
  <path d="M92 130 L108 130"/>
  <!-- Foliage — Bodhi/peepal leaf shape -->
  <path d="M100 90 Q60 90 55 60 Q60 30 100 25 Q140 30 145 60 Q140 90 100 90 Z" opacity="0.7"/>
  <path d="M100 25 L100 15" opacity="0.8"/>
  <!-- Village huts underneath -->
  <path d="M50 130 L55 118 L60 118 L65 130 Z" opacity="0.6"/>
  <path d="M55 118 L60 118 L57.5 114 Z"/>
  <path d="M135 130 L140 118 L145 118 L150 130 Z" opacity="0.6"/>
  <path d="M140 118 L145 118 L142.5 114 Z"/>
  <!-- Ground -->
  <line x1="10" y1="130" x2="190" y2="130"/>
</svg>`;

export const emptyPigeon = `
<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <!-- Pigeon body -->
  <ellipse cx="100" cy="70" rx="26" ry="16" opacity="0.6"/>
  <!-- Head -->
  <circle cx="128" cy="60" r="10"/>
  <!-- Beak -->
  <path d="M138 60 L144 62 L138 64"/>
  <!-- Eye -->
  <circle cx="131" cy="58" r="1.2" fill="currentColor"/>
  <!-- Wing -->
  <path d="M85 62 Q90 46 105 50 Q110 60 100 72" opacity="0.7"/>
  <!-- Envelope in beak -->
  <rect x="80" y="76" width="24" height="16" rx="1" opacity="0.4"/>
  <path d="M80 76 L92 86 L104 76"/>
  <!-- Motion swoosh -->
  <path d="M30 80 q 20 -5 40 -4" opacity="0.35" stroke-dasharray="3 3"/>
  <path d="M20 90 q 20 -5 40 -4" opacity="0.25" stroke-dasharray="3 3"/>
</svg>`;

export const emptyPeacock = `
<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <!-- Peacock body -->
  <path d="M60 110 Q65 90 75 90 Q90 88 92 96 Q92 105 82 108" fill="currentColor" opacity="0.15"/>
  <!-- Head -->
  <circle cx="72" cy="82" r="6"/>
  <line x1="72" y1="76" x2="72" y2="72"/>
  <circle cx="72" cy="70" r="1.5" fill="currentColor"/>
  <!-- Beak -->
  <path d="M78 82 L82 83 L78 84"/>
  <!-- Legs -->
  <line x1="76" y1="108" x2="76" y2="118"/>
  <line x1="82" y1="108" x2="82" y2="118"/>
  <!-- Fanned tail: eye motifs -->
  <path d="M90 100 Q120 60 165 55" opacity="0.6"/>
  <path d="M90 105 Q125 70 170 75" opacity="0.6"/>
  <path d="M90 110 Q125 90 170 100" opacity="0.6"/>
  <path d="M90 115 Q125 108 170 118" opacity="0.6"/>
  <circle cx="165" cy="55" r="4"/>
  <circle cx="170" cy="75" r="4"/>
  <circle cx="170" cy="100" r="4"/>
  <circle cx="170" cy="118" r="4"/>
</svg>`;

export const emptyMagnifier = `
<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <!-- Magnifier ring -->
  <circle cx="80" cy="60" r="34"/>
  <line x1="105" y1="85" x2="130" y2="110"/>
  <!-- Madhubani fish inside -->
  <path d="M55 60 Q68 45 88 60 Q68 75 55 60 Z" opacity="0.6"/>
  <path d="M88 60 L98 52 L98 68 Z"/>
  <circle cx="65" cy="60" r="1.5" fill="currentColor"/>
  <path d="M60 55 L60 65" opacity="0.4"/>
  <path d="M75 52 L75 68" opacity="0.4"/>
</svg>`;

/** Peacock-feather spinner — three feathers rotating. */
export const peacockSpinner = `
<svg class="peacock-spinner" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="2">
    <ellipse cx="20" cy="8"  rx="3" ry="6" opacity="0.9"/>
    <ellipse cx="20" cy="8"  rx="1" ry="2.5" fill="currentColor"/>
    <ellipse cx="30" cy="20" rx="6" ry="3" opacity="0.6"/>
    <ellipse cx="20" cy="32" rx="3" ry="6" opacity="0.4"/>
  </g>
</svg>`;

/** Madhubani-inspired thin section divider — repeating peacock-eye motif. */
export const madhubaniDivider = `
<svg class="madhubani-divider" viewBox="0 0 400 16" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <g fill="none" stroke="currentColor" stroke-width="1.2">
    <line x1="0" y1="8" x2="400" y2="8"/>
    ${Array.from({ length: 10 }, (_, i) => {
      const cx = 20 + i * 40;
      return `
        <circle cx="${cx}" cy="8" r="3.5"/>
        <circle cx="${cx}" cy="8" r="1.5" fill="currentColor"/>
      `;
    }).join('')}
  </g>
</svg>`;

/** Render one of the empty states with an optional caption. */
export function renderEmptyState(kind, title, subtitle = '') {
  const svg = ({
    feed:        emptyChhathGhat,
    community:   emptyPeepal,
    inbox:       emptyPigeon,
    verified:    emptyPeacock,
    search:      emptyMagnifier,
  }[kind]) || emptyChhathGhat;

  return `
    <div class="empty-state">
      <div class="es-art">${svg}</div>
      <div class="es-title">${escape(title)}</div>
      ${subtitle ? `<div class="es-sub">${escape(subtitle)}</div>` : ''}
    </div>
  `;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

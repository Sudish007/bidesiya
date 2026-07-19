// Renders the Instagram-style left rail (desktop) + bottom nav (mobile) +
// mobile top bar. Every page includes <div id="shell"></div> and this
// module fills it in based on the current page.

import { loadStoredTheme, applyTheme } from './theme.js';
loadStoredTheme();  // paint the theme before anything renders

const NAV = [
  { id: 'feed',        href: 'index.html',       label: 'Home',        icon: iconHome },
  { id: 'search',      href: 'search.html',      label: 'Search',      icon: iconSearch },
  { id: 'inbox',       href: 'inbox.html',       label: 'Notifications', icon: iconBell, badgeId: 'inbox-badge' },
  { id: 'updates',     href: 'updates.html',     label: 'Updates',     icon: iconUpdates },
  { id: 'communities', href: 'communities.html', label: 'Communities', icon: iconCommunities },
  { id: 'notable',     href: 'notable.html',     label: 'Voices',      icon: iconVoices },
  { id: 'events',      href: 'events.html',      label: 'Events',      icon: iconEvents },
  { id: 'rishta',      href: 'rishta.html',      label: 'Rishta',      icon: iconRishta },
  { id: 'tourism',     href: 'tourism.html',     label: 'Tourism',     icon: iconTourism },
  { id: 'bazaar',      href: 'bazaar.html',      label: 'Bazaar',      icon: iconBazaar },
  { id: 'sahyog',      href: 'fund.html',        label: 'Sahyog',      icon: iconSahyog },
  { id: 'dms',         href: 'dms.html',         label: 'Messages',    icon: iconMessages, badgeId: 'dm-badge' },
  { id: 'learn',       href: 'learn.html',       label: 'Learn',       icon: iconLearn },
  { id: 'jobs',        href: 'jobs.html',        label: 'Jobs',        icon: iconJobs },
  { id: 'land',        href: 'land.html',        label: 'Land',        icon: iconLand },
  { id: 'profile',     href: 'profile.html',     label: 'Profile',     icon: iconProfile },
];

export function mountShell(active) {
  const shell = document.getElementById('shell');
  if (!shell) return;

  // Inline styles below are defensive — they guarantee vertical nav even
  // if a stale/cached CSS file loads out of order. Duplicates the .left-rail
  // + .left-nav rules from style.css, applied at the element level.
  const isMobile = window.matchMedia('(max-width: 940px)').matches;
  const railStyle = isMobile
    ? 'display:none'
    : 'display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding:8px 12px;border-right:1px solid var(--border,#DBDBDB);background:var(--surface,#fff);overflow-y:auto;box-sizing:border-box';

  const navStyle = 'display:flex;flex-direction:column;gap:6px;list-style:none;padding:0;margin:0';
  const linkStyle = 'display:flex;align-items:center;gap:16px;padding:12px;border-radius:12px;color:var(--ink,#262626);font-size:15px;font-weight:500;text-decoration:none;line-height:1';

  shell.innerHTML = `
    <aside class="left-rail" style="${railStyle}">
      <a class="brand" href="index.html" style="padding:16px 12px 20px;display:flex;align-items:center;gap:10px;color:var(--ink,#262626);text-decoration:none">
        <img src="assets/img/logo-mark.svg" alt="" style="width:36px;height:36px;flex:none" />
        <span style="display:flex;flex-direction:column;line-height:1.15;min-width:0">
          <span class="brand-en" style="font-family:'Georgia','Rozha One',serif;font-size:22px;font-weight:800;letter-spacing:-0.2px;background:linear-gradient(90deg,var(--brand-1,#F43F5E),var(--brand-2,#F97316));-webkit-background-clip:text;background-clip:text;color:transparent">Bidesiya</span>
          <span class="brand-hi" style="font-family:'Noto Sans Devanagari','Rozha One','Mangal',system-ui,serif;font-size:14px;font-weight:600;color:var(--ink-muted,#8B6F7C);margin-top:2px">बिदेसिया · अपने, कहीं भी</span>
        </span>
      </a>
      <nav class="left-nav" style="${navStyle}">
        ${NAV.map(n => `
          <a href="${n.href}" class="${n.id === active ? 'active' : ''}" style="${linkStyle}${n.id === active ? ';font-weight:700' : ''}">
            <span class="icon" style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none">${n.icon()}${n.badgeId ? `<span id="${n.badgeId}" class="nav-badge" style="display:none"></span>` : ''}</span>
            <span class="label">${n.label}</span>
          </a>`).join('')}
        <a href="#" id="btn-create-post" style="${linkStyle}">
          <span class="icon" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none">${iconCreate()}</span>
          <span class="label">Create</span>
        </a>
        <a href="admin/login.html" style="${linkStyle}">
          <span class="icon" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none">${iconAdmin()}</span>
          <span class="label">Admin</span>
        </a>
      </nav>
    </aside>
  `;

  // Also ensure the parent `.app-shell` is a grid — inline as belt & braces.
  const appShell = shell.closest('.app-shell');
  if (appShell && !isMobile) {
    appShell.style.cssText = 'display:grid;grid-template-columns:244px 1fr;min-height:100vh';
  } else if (appShell) {
    appShell.style.cssText = 'display:block;min-height:100vh';
  }

  // Mobile top bar + bottom nav
  if (!document.querySelector('.mobile-topbar')) {
    const top = document.createElement('div');
    top.className = 'mobile-topbar';
    top.innerHTML = `
      <span class="brand" style="display:flex;flex-direction:column;line-height:1.1">
        <span style="font-family:'Georgia',serif;font-size:20px;font-weight:800;letter-spacing:-0.2px;background:linear-gradient(90deg,var(--brand-1,#F43F5E),var(--brand-2,#F97316));-webkit-background-clip:text;background-clip:text;color:transparent">Bidesiya</span>
        <span style="font-family:'Noto Sans Devanagari','Mangal',system-ui,serif;font-size:11px;font-weight:600;color:var(--ink-muted,#8B6F7C);margin-top:1px">बिदेसिया · अपने, कहीं भी</span>
      </span>
      <div class="actions">
        <button class="icon-btn" onclick="location.href='#'" title="Notifications">${iconHeartOutline()}</button>
        <button class="icon-btn" id="mobile-create">${iconCreate()}</button>
      </div>`;
    document.body.appendChild(top);

    const bot = document.createElement('nav');
    bot.className = 'bottom-nav';
    bot.innerHTML = NAV.map(n => `
      <a href="${n.href}" class="${n.id === active ? 'active' : ''}" aria-label="${n.label}">${n.icon()}</a>
    `).join('');
    document.body.appendChild(bot);

    document.getElementById('mobile-create').onclick = () => openCreateModal();
  }

  // Left-rail create button (desktop)
  const btnC = document.getElementById('btn-create-post');
  if (btnC) btnC.onclick = (e) => { e.preventDefault(); openCreateModal(); };
}

let composeModal = null;
export function openCreateModal() {
  window.dispatchEvent(new CustomEvent('bidesiya:open-compose'));
}

// ---------- Instagram-ish inline SVGs (24×24) ----------
// SVG icons — all with explicit width/height + fill/stroke so they render
// correctly even before CSS applies.
const S = 'width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

function iconHome() {
  return `<svg ${S}><path d="M22 12L12 2 2 12"/><path d="M4 10v10h5v-6h6v6h5V10"/></svg>`;
}
function iconUpdates() {
  return `<svg ${S}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
}
function iconLearn() {
  return `<svg ${S}><path d="M4 4h13a3 3 0 0 1 3 3v13"/><path d="M4 4v13a3 3 0 0 0 3 3h13"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>`;
}
function iconJobs() {
  return `<svg ${S}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>`;
}
function iconLand() {
  return `<svg ${S}><path d="M12 2l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z"/></svg>`;
}
function iconProfile() {
  return `<svg ${S}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>`;
}
function iconCreate() {
  return `<svg ${S}><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
}
function iconAdmin() {
  return `<svg ${S}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 1 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c0 .68.42 1.28 1 1.51.6.24 1.32.11 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.24.6.84 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.67 0-1.27.4-1.51 1z"/></svg>`;
}
function iconHeartOutline() {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}
function iconCommunities() {
  return `<svg ${S}><circle cx="9" cy="9" r="4"/><circle cx="17" cy="9" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M14 15c2.5 0 4 1.5 4 3.5"/></svg>`;
}
function iconMessages() {
  return `<svg ${S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}
function iconSearch() {
  return `<svg ${S}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
}
function iconBell() {
  return `<svg ${S}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
}
function iconEvents() {
  return `<svg ${S}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
}
function iconVoices() {
  // Laurel-wreath silhouette — two curved leaves cradling a star at centre
  return `<svg ${S}><path d="M12 3 L14 8 L19 8 L15 11 L17 16 L12 13 L7 16 L9 11 L5 8 L10 8 Z"/><path d="M5 20 Q 3 16 4 12" opacity="0.7"/><path d="M19 20 Q 21 16 20 12" opacity="0.7"/></svg>`;
}
function iconRishta() {
  // Two interlinked rings / joined hands
  return `<svg ${S}><circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/></svg>`;
}
function iconTourism() {
  // Mountain + sun
  return `<svg ${S}><circle cx="12" cy="7" r="2.5"/><path d="M3 21 L9 12 L13 17 L17 13 L21 21 Z"/></svg>`;
}
function iconBazaar() {
  // Shop / market — awning above with a doorway
  return `<svg ${S}><path d="M3 9 L5 4 L19 4 L21 9"/><path d="M4 9 L4 20 L20 20 L20 9"/><path d="M10 20 L10 14 L14 14 L14 20"/></svg>`;
}
function iconSahyog() {
  // Two open hands cradling a heart — cooperation & support
  return `<svg ${S}><path d="M12 15 C 10 12, 6 12, 6 15 C 6 17, 9 19, 12 21 C 15 19, 18 17, 18 15 C 18 12, 14 12, 12 15 Z"/><path d="M4 12 L4 8 L7 6"/><path d="M20 12 L20 8 L17 6"/></svg>`;
}

// Poll for DM + inbox unread counts and update sidebar badges.
async function refreshBadges() {
  try {
    // dynamic import to avoid loading api.js on pages that don't need it
    const { api } = await import('./api.js');
    if (!api.isAuthed()) return;
    const setBadge = (id, count) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (count > 0) {
        el.textContent = count > 99 ? '99+' : String(count);
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    };
    const [dm, ib] = await Promise.all([
      api.dmUnreadCount().catch(() => ({ count: 0 })),
      api.inboxUnreadCount().catch(() => ({ count: 0 })),
    ]);
    setBadge('dm-badge', dm.count);
    setBadge('inbox-badge', ib.count);
  } catch {}
}
refreshBadges();
setInterval(refreshBadges, 30000);
document.addEventListener('bidesiya:refresh-badges', refreshBadges);

// Sync theme from the server on every shell mount (silent).
(async () => {
  try {
    const { api } = await import('./api.js');
    if (!api.isAuthed()) return;
    const me = await api.me();
    if (me.theme) applyTheme(me.theme);
  } catch {}
})();

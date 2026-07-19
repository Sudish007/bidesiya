import { api } from './api.js';
import { toast, escapeHtml, timeAgo } from './ui.js';

const KIND_META = {
  job:          { label: 'Latest Jobs',   icon: iconJob,   hi: 'नौकरी' },
  result:       { label: 'Results',       icon: iconResult, hi: 'रिजल्ट' },
  admit_card:   { label: 'Admit Cards',   icon: iconAdmit,  hi: 'एडमिट कार्ड' },
  admission:    { label: 'Admissions',    icon: iconAdmission, hi: 'नामांकन' },
  scholarship:  { label: 'Scholarships',  icon: iconScholarship, hi: 'छात्रवृत्ति' },
  syllabus:     { label: 'Syllabus',      icon: iconSyllabus, hi: 'सिलेबस' },
  online_form:  { label: 'Online Forms',  icon: iconForm,   hi: 'फॉर्म' },
  scheme:       { label: 'Sarkari Yojna', icon: iconScheme, hi: 'सरकारी योजना' },
};

const $tiles = document.getElementById('tiles');
const $list = document.getElementById('list');
const $chips = document.getElementById('filter-chips');
const $search = document.getElementById('search');

let activeKind = '';
let searchTerm = '';
let searchTimer;

$chips.querySelectorAll('.chip').forEach(c => {
  c.onclick = () => {
    activeKind = c.dataset.kind;
    $chips.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
    loadList();
  };
});

$search.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTerm = e.target.value.trim();
    loadList();
  }, 250);
});

async function boot() {
  if (!api.isAuthed()) {
    $list.innerHTML = '<div class="banner banner-warn">Sign in to load government notifications. <a href="auth.html">Sign in →</a></div>';
    renderTiles({});
    return;
  }
  loadTiles();
  loadList();
}

async function loadTiles() {
  try {
    const counts = await api.notificationCounts();
    renderTiles(counts);
  } catch (e) {
    // Silent — tiles just show 0
    renderTiles({});
  }
}

function renderTiles(counts) {
  $tiles.innerHTML = '';
  for (const [kind, meta] of Object.entries(KIND_META)) {
    const count = counts[kind] || 0;
    const el = document.createElement('a');
    el.className = 'tile';
    el.href = 'javascript:void(0)';
    el.innerHTML = `
      <div class="tile-icon kind-${kind}">${meta.icon()}</div>
      <div class="tile-title">${meta.label}</div>
      <div class="tile-count">${count} live · ${meta.hi}</div>
    `;
    el.onclick = () => {
      // Activate chip + filter list
      $chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.kind === kind));
      activeKind = kind;
      loadList();
      $list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    $tiles.appendChild(el);
  }
}

async function loadList() {
  if (!api.isAuthed()) return;
  $list.innerHTML = '<div class="banner banner-info">Loading…</div>';
  try {
    const items = await api.listNotifications({
      kind: activeKind || undefined,
      q: searchTerm || undefined,
      limit: 50,
    });
    renderList(items);
  } catch (e) {
    $list.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function renderList(items) {
  $list.innerHTML = '';
  if (!items.length) {
    $list.innerHTML = `<div class="banner banner-info">No updates${searchTerm ? ` matching "${escapeHtml(searchTerm)}"` : ''}. Try another filter or search.</div>`;
    return;
  }
  for (const n of items) $list.appendChild(renderCard(n));
}

function renderCard(n) {
  const meta = KIND_META[n.kind] || { label: n.kind, hi: '' };
  const el = document.createElement('a');
  el.className = 'notif';
  el.href = `notification.html?id=${n.id}`;

  const applyBy = n.apply_by ? formatDate(n.apply_by) : null;
  const examDate = n.exam_date ? formatDate(n.exam_date) : null;
  const resultDate = n.result_date ? formatDate(n.result_date) : null;
  const daysLeft = n.apply_by ? daysUntil(n.apply_by) : null;

  const timeChip = daysLeft !== null && daysLeft >= 0
    ? `<strong style="color:${daysLeft < 7 ? 'var(--danger)' : 'var(--warning)'}">${daysLeft} days left</strong>`
    : (applyBy ? `Apply by <strong>${applyBy}</strong>` : '');

  el.innerHTML = `
    <div class="notif-head">
      <span class="notif-badge badge-${n.kind}">${meta.label}</span>
      ${n.is_featured ? '<span class="notif-badge" style="background:linear-gradient(135deg, var(--brand-1), var(--brand-2));color:white">Featured</span>' : ''}
      <span class="notif-authority">${escapeHtml(n.issuing_authority_short || n.issuing_authority)}</span>
      <span style="margin-left:auto; color: var(--ink-muted); font-size: 12px">${timeAgo(n.created_at)}</span>
    </div>
    <div class="notif-title">${escapeHtml(n.title)}</div>
    ${n.title_hi ? `<div class="notif-hi">${escapeHtml(n.title_hi)}</div>` : ''}
    <div class="notif-summary">${escapeHtml(n.summary || '')}</div>
    <div class="notif-meta">
      ${n.vacancies ? `<span>Vacancies: <strong>${n.vacancies.toLocaleString('en-IN')}</strong></span>` : ''}
      ${n.education_level ? `<span>Qualification: <strong>${escapeHtml(n.education_level)}</strong></span>` : ''}
      ${examDate ? `<span>Exam: <strong>${examDate}</strong></span>` : ''}
      ${resultDate ? `<span>Result: <strong>${resultDate}</strong></span>` : ''}
      ${timeChip ? `<span>${timeChip}</span>` : ''}
    </div>
  `;
  return el;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysUntil(iso) {
  const target = new Date(iso);
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// ---------- SVG icons ----------
function iconJob() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>`;
}
function iconResult() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>`;
}
function iconAdmit() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h3M15 12h3M6 16h12"/></svg>`;
}
function iconAdmission() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 6-10 6L2 9z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/></svg>`;
}
function iconScholarship() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8 13l-2 8 6-4 6 4-2-8"/></svg>`;
}
function iconSyllabus() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a3 3 0 0 1 3 3v13"/><path d="M4 4v13a3 3 0 0 0 3 3h13"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>`;
}
function iconForm() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>`;
}
function iconScheme() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V10l8-6 8 6v12"/><path d="M9 22v-8h6v8"/></svg>`;
}

boot();

// Tourism landing — one page, two states (Bihar / Jharkhand) via ?state=

import { api } from './api.js';
import { toast, escapeHtml } from './ui.js';
import { mountShell } from './shell.js';
import { imageUrl } from './avatar.js';

mountShell('tourism');

const params = new URLSearchParams(location.search);
let currentState = params.get('state') || 'bihar';
let currentCat = '';

const $grid = document.getElementById('dest-grid');
const $catTabs = document.getElementById('cat-tabs');
const $featured = document.getElementById('featured-list');

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  document.querySelectorAll('.state-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.state === currentState);
  });
  await Promise.all([loadSummary('bihar'), loadSummary('jharkhand')]);
  loadFeatured();
  loadGrid();

  $catTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    currentCat = btn.dataset.cat;
    $catTabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
    loadGrid();
  });
}

async function loadSummary(state) {
  try {
    const s = await api.tourismSummary(state);
    const el = document.getElementById(`st-${state}-count`);
    if (el) el.textContent = `${s.total} destinations`;
  } catch {}
}

async function loadGrid() {
  $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">Loading…</div>';
  try {
    const params = { category: currentCat };
    const list = await api.listDestinations(currentState, params);
    if (!list.length) {
      $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1; padding: 40px 0; text-align: center">No destinations in this category.</div>';
      return;
    }
    $grid.innerHTML = '';
    for (const d of list) $grid.appendChild(renderCard(d));
  } catch (e) {
    $grid.innerHTML = `<div class="banner banner-error" style="grid-column: 1/-1">${e.message}</div>`;
  }
}

function renderCard(d) {
  const card = document.createElement('a');
  card.className = 'dest-card';
  card.href = `destination.html?state=${d.state}&slug=${d.slug}`;
  const photoUrl = imageUrl(d.cover_url);
  card.innerHTML = `
    <div class="dc-cover${photoUrl ? ' has-photo' : ''}">
      ${photoUrl
        ? `<img src="${photoUrl}" alt="${escapeHtml(d.name)}" loading="lazy" />`
        : `<span class="dc-icon">${escapeHtml(d.icon || '📍')}</span>`}
      ${d.is_featured ? '<span class="dc-featured">Featured</span>' : ''}
    </div>
    <div class="dc-body">
      <div class="dc-name">${escapeHtml(d.name)}</div>
      <div class="dc-tagline">${escapeHtml(d.tagline || '')}</div>
      <div class="dc-meta">
        <span class="dc-cat">${escapeHtml(d.category)}</span>
        <span>📍 ${escapeHtml(d.district)}</span>
      </div>
    </div>
  `;
  return card;
}

async function loadFeatured() {
  try {
    const s = await api.tourismSummary(currentState);
    if (!s.featured.length) { $featured.innerHTML = '<div class="subtle">Nothing featured.</div>'; return; }
    $featured.innerHTML = s.featured.map(d => `
      <a class="trend-row" href="destination.html?state=${d.state}&slug=${d.slug}">
        <div class="trend-tag">${escapeHtml(d.icon || '📍')} ${escapeHtml(d.name)}</div>
        <div class="trend-meta">${escapeHtml(d.district)} · ${escapeHtml(d.category)}</div>
      </a>
    `).join('');
  } catch { $featured.innerHTML = ''; }
}

boot();

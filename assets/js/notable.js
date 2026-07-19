// Notable Voices browse page — follow-only public figures of Bihar.

import { api } from './api.js';
import { toast, escapeHtml } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('notable');

const $grid = document.getElementById('voices-grid');
const $tabs = document.getElementById('voice-tabs');

let currentCat = '';
let all = [];

async function boot() {
  if (!api.isAuthed()) {
    $grid.innerHTML = `
      <div class="card" style="text-align:center; padding: 40px 20px; grid-column: 1/-1">
        <p class="subtle" style="margin:0 0 20px">Sign in to follow Bihar's Notable Voices.</p>
        <a href="auth.html" class="btn btn-primary">Sign in</a>
      </div>`;
    return;
  }
  await load();
}

async function load() {
  $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">Loading…</div>';
  try {
    all = await api.listNotable() || [];
    render();
  } catch (e) {
    $grid.innerHTML = `<div class="banner banner-error" style="grid-column: 1/-1">${e.message}</div>`;
  }
}

function render() {
  const list = currentCat ? all.filter(u => u.notable_category === currentCat) : all;
  if (!list.length) {
    $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">Nothing in this category yet.</div>';
    return;
  }
  $grid.innerHTML = '';
  for (const u of list) $grid.appendChild(renderCard(u));
}

function renderCard(u) {
  const card = document.createElement('article');
  card.className = 'voice-card';
  card.innerHTML = `
    <a class="v-avatar-wrap" href="profile.html?u=${u.id}">
      ${avatarHtml(u, 84, { className: 'v-avatar', verification: 'notable' })}
    </a>
    <a href="profile.html?u=${u.id}" class="v-name">
      ${escapeHtml(u.display_name || u.username)}
    </a>
    <div class="v-category">${escapeHtml(u.notable_category || 'notable')}</div>
    <div class="v-headline">${escapeHtml(u.headline || '')}</div>
    <div class="v-meta">
      ${u.home_district ? `<span>📍 ${escapeHtml(u.home_district)}</span>` : ''}
      <span>· ${u.followers_count.toLocaleString()} followers</span>
    </div>
    <button class="btn ${u.i_am_following ? 'btn-outline' : 'btn-primary'} btn-block v-follow" data-id="${u.id}">
      ${u.i_am_following ? 'Following ✓' : 'Follow'}
    </button>
  `;

  card.querySelector('.v-follow').onclick = async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      if (u.i_am_following) {
        await api.del(`/users/${u.id}/follow`);
        u.i_am_following = false;
        u.followers_count = Math.max(0, u.followers_count - 1);
      } else {
        await api.post(`/users/${u.id}/follow`);
        u.i_am_following = true;
        u.followers_count += 1;
      }
      // Re-render this card in place
      const replacement = renderCard(u);
      card.replaceWith(replacement);
    } catch (err) { toast(err.message); btn.disabled = false; }
  };

  return card;
}

$tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  currentCat = btn.dataset.cat;
  $tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
  render();
});

boot();

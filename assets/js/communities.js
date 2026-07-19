// Communities browse page — Bihar-first spaces (Reddit + LinkedIn Groups).

import { api } from './api.js';
import { toast, escapeHtml } from './ui.js';
import { mountShell } from './shell.js';

mountShell('communities');

const $grid = document.getElementById('communities-grid');
const $search = document.getElementById('community-search');
const $tabs = document.getElementById('community-tabs');
const $newBtn = document.getElementById('btn-new-community');

let currentCat = '';
let currentQuery = '';
let all = [];

async function boot() {
  if (!api.isAuthed()) {
    $grid.innerHTML = `
      <div class="card" style="text-align:center; padding: 40px 20px; grid-column: 1/-1">
        <p class="subtle" style="margin:0 0 20px">Sign in to browse and join communities.</p>
        <a href="auth.html" class="btn btn-primary">Sign in</a>
      </div>`;
    return;
  }
  await loadAll();
}

async function loadAll() {
  $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">Loading…</div>';
  try {
    all = await api.listCommunities({ limit: 100 }) || [];
    render();
  } catch (e) {
    $grid.innerHTML = `<div class="banner banner-error" style="grid-column: 1/-1">${e.message}</div>`;
  }
}

function render() {
  let list = all;
  if (currentCat === 'joined') list = list.filter(c => c.joined_by_me);
  else if (currentCat) list = list.filter(c => c.category === currentCat);
  if (currentQuery) {
    const q = currentQuery.toLowerCase();
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.tagline || '').toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">No communities match this filter.</div>';
    return;
  }

  $grid.innerHTML = '';
  for (const c of list) $grid.appendChild(renderCard(c));
}

function renderCard(c) {
  const card = document.createElement('article');
  card.className = 'community-card';
  card.innerHTML = `
    <div class="cc-header">
      <div class="cc-icon">${c.icon || '#'}</div>
      <div style="min-width:0">
        <a href="community.html?slug=${encodeURIComponent(c.slug)}" class="cc-name">${escapeHtml(c.name)}</a>
        ${c.is_official ? '<span class="cc-badge">Official</span>' : ''}
        <div class="cc-tag">${escapeHtml(c.tagline || '')}</div>
      </div>
    </div>
    <div class="cc-meta">
      <span>${c.member_count.toLocaleString()} member${c.member_count === 1 ? '' : 's'}</span>
      <span>·</span>
      <span>${c.post_count} post${c.post_count === 1 ? '' : 's'}</span>
      <span>·</span>
      <span class="cc-cat">${escapeHtml(c.category)}</span>
    </div>
    <button class="btn ${c.joined_by_me ? 'btn-outline' : 'btn-primary'} btn-block cc-join" data-id="${c.id}">
      ${c.joined_by_me ? 'Joined ✓' : 'Join'}
    </button>
  `;

  card.querySelector('.cc-join').onclick = async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      if (c.joined_by_me) {
        await api.leaveCommunity(c.id);
        c.joined_by_me = false;
        c.member_count = Math.max(0, c.member_count - 1);
      } else {
        await api.joinCommunity(c.id);
        c.joined_by_me = true;
        c.member_count += 1;
      }
      btn.textContent = c.joined_by_me ? 'Joined ✓' : 'Join';
      btn.classList.toggle('btn-primary', !c.joined_by_me);
      btn.classList.toggle('btn-outline', c.joined_by_me);
      card.querySelector('.cc-meta').innerHTML = `
        <span>${c.member_count.toLocaleString()} member${c.member_count === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>${c.post_count} post${c.post_count === 1 ? '' : 's'}</span>
        <span>·</span>
        <span class="cc-cat">${escapeHtml(c.category)}</span>
      `;
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; }
  };

  return card;
}

// Tabs
$tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  currentCat = btn.dataset.cat;
  $tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
  render();
});

// Search
let searchTimer;
$search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentQuery = $search.value.trim();
    render();
  }, 200);
});

// Create new
$newBtn.onclick = () => openCreateModal();

function openCreateModal() {
  if (!api.isAuthed()) { toast('Sign in first'); location.href = 'auth.html'; return; }
  const CATS = ['general', 'jobs', 'governance', 'culture', 'skills', 'migration', 'women', 'tech'];
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 480px">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px">
        <h2 style="margin:0">Create a community</h2>
        <button class="btn" id="cc-close" aria-label="Close">✕</button>
      </div>
      <div class="field"><label>Name</label>
        <input class="input" id="cc-name" placeholder="e.g. Nalanda Sanskrit Circle" maxlength="120" /></div>
      <div class="field"><label>Slug</label>
        <input class="input" id="cc-slug" placeholder="lowercase-with-dashes" maxlength="64" /></div>
      <div class="field"><label>Tagline</label>
        <input class="input" id="cc-tag" placeholder="One sentence about the space" maxlength="200" /></div>
      <div class="field"><label>Description</label>
        <textarea class="input" id="cc-desc" rows="3" placeholder="What belongs here, what doesn't."></textarea></div>
      <div class="field"><label>Icon (single emoji)</label>
        <input class="input" id="cc-icon" placeholder="🌾" maxlength="4" /></div>
      <div class="field"><label>Category</label>
        <select class="input" id="cc-cat">${CATS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
      <button class="btn btn-primary btn-block" id="cc-submit">Create community</button>
    </div>`;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#cc-close').onclick = () => back.remove();

  // Auto-slug from name
  const $name = back.querySelector('#cc-name');
  const $slug = back.querySelector('#cc-slug');
  $name.oninput = () => {
    if ($slug.dataset.touched) return;
    $slug.value = $name.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  };
  $slug.oninput = () => { $slug.dataset.touched = '1'; };

  back.querySelector('#cc-submit').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const created = await api.createCommunity({
        name: $name.value.trim(),
        slug: $slug.value.trim(),
        tagline: back.querySelector('#cc-tag').value.trim() || null,
        description: back.querySelector('#cc-desc').value.trim() || null,
        icon: back.querySelector('#cc-icon').value.trim() || null,
        category: back.querySelector('#cc-cat').value,
      });
      toast('Community created');
      back.remove();
      location.href = `community.html?slug=${encodeURIComponent(created.slug)}`;
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = 'Create community';
    }
  };
}

boot();

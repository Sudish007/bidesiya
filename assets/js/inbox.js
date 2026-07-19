// Notifications page — activity feed with unread badges.

import { api } from './api.js';
import { toast, escapeHtml, timeAgo, initials } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('inbox');

const $list = document.getElementById('inbox-list');
const $tabs = document.querySelector('.tab-strip');
const $markBtn = document.getElementById('btn-mark-read');

let filter = 'all';
let items = [];

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  await loadInbox();
}

async function loadInbox() {
  $list.innerHTML = '<div class="subtle" style="padding: 20px">Loading…</div>';
  try {
    items = await api.listInbox(false) || [];
    render();
  } catch (e) {
    $list.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function render() {
  let list = items;
  if (filter === 'unread') list = list.filter(n => !n.read_at);
  else if (filter === 'mentions') list = list.filter(n => n.kind === 'mention');

  if (!list.length) {
    import('./bihar_art.js').then(({ renderEmptyState }) => {
      $list.innerHTML = renderEmptyState('inbox', 'Sab shaant hai', 'When someone reacts, mentions, or follows you, it lands here.');
    });
    return;
  }

  $list.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'inbox-items';
  for (const n of list) container.appendChild(renderRow(n));
  $list.appendChild(container);
}

function renderRow(n) {
  const row = document.createElement('a');
  row.className = 'inbox-row' + (n.read_at ? '' : ' unread');
  row.href = destinationFor(n);
  row.innerHTML = `
    ${avatarHtml({ display_name: n.actor_name, username: n.actor_username, avatar_url: n.actor_avatar_url }, 40, { className: 'ib-avatar' })}
    <div class="ib-body">
      <div class="ib-text">${textFor(n)}</div>
      ${n.preview ? `<div class="ib-preview">${escapeHtml(n.preview).slice(0, 200)}</div>` : ''}
      <div class="ib-time">${timeAgo(n.created_at)}</div>
    </div>
    <span class="ib-icon">${iconFor(n.kind)}</span>
  `;
  row.onclick = async () => {
    // Mark read but let the browser follow the link normally.
    if (!n.read_at) {
      try { await api.markRead(n.id); } catch {}
    }
  };
  return row;
}

function textFor(n) {
  const actor = `<b>${escapeHtml(n.actor_name || 'Someone')}</b>`;
  switch (n.kind) {
    case 'like':    return `${actor} liked your post`;
    case 'comment': return `${actor} commented on your post`;
    case 'follow':  return `${actor} started following you`;
    case 'mention': return `${actor} mentioned you`;
    case 'repost':  return `${actor} reposted your post`;
    case 'community_post': return `${actor} posted in a community`;
    case 'dm':      return `${actor} sent you a message`;
    default:        return `${actor} — ${escapeHtml(n.kind)}`;
  }
}

function destinationFor(n) {
  if (n.kind === 'follow' && n.actor_username) return `profile.html?u=${n.actor_id}`;
  if (n.kind === 'dm' && n.conversation_id)   return `dms.html?c=${n.conversation_id}`;
  if (n.community_id && n.community_slug)     return `community.html?slug=${n.community_slug}`;
  if (n.post_id) return `index.html?post=${n.post_id}`;
  if (n.actor_id) return `profile.html?u=${n.actor_id}`;
  return 'index.html';
}

function iconFor(kind) {
  const c = {
    like:    '#F43F5E',
    comment: '#3B82F6',
    follow:  '#22C55E',
    mention: '#F97316',
    repost:  '#16A34A',
    dm:      '#8B5CF6',
  }[kind] || '#737373';
  return `<span class="ib-badge" style="background: ${c}"></span>`;
}

$tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  filter = btn.dataset.filter;
  $tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
  render();
});

$markBtn.onclick = async () => {
  try {
    await api.markAllRead();
    items = items.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }));
    render();
    toast('Marked all as read');
    // Refresh the shell badge
    document.dispatchEvent(new CustomEvent('bidesiya:refresh-badges'));
  } catch (e) { toast(e.message); }
};

boot();

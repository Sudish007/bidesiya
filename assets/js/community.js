// Single community page — hero, join/leave, tabs (posts/members/about).

import { api } from './api.js';
import { toast, escapeHtml, timeAgo, initials } from './ui.js';
import { mountShell } from './shell.js';
import { renderPost } from './post_render.js';
import { avatarHtml } from './avatar.js';

mountShell('communities');

const $hero = document.getElementById('community-hero');
const $body = document.getElementById('community-body');
const $postBtn = document.getElementById('btn-community-post');
const $related = document.getElementById('related');

const params = new URLSearchParams(location.search);
const slug = params.get('slug');

let me = null;
let community = null;
let view = 'posts';

async function boot() {
  if (!slug) {
    $hero.innerHTML = '<div class="banner banner-error">No community slug in URL.</div>';
    return;
  }
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  try { me = await api.me(); } catch { api.signOut(); location.href = 'auth.html'; return; }

  await loadCommunity();

  // Tabs
  document.querySelectorAll('.tab-strip .tab').forEach(t => {
    t.onclick = () => {
      view = t.dataset.view;
      document.querySelectorAll('.tab-strip .tab').forEach(x => x.classList.toggle('active', x === t));
      loadBody();
    };
  });

  loadRelated();
  window.addEventListener('bidesiya:post-created', () => { if (view === 'posts') loadBody(); });
}

async function loadCommunity() {
  try {
    community = await api.getCommunity(slug);
    document.title = `${community.name} · Bidesiya`;
    renderHero();
    await loadBody();
  } catch (e) {
    $hero.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function renderHero() {
  $hero.innerHTML = `
    <div class="ch-inner">
      <div class="ch-icon">${escapeHtml(community.icon || '#')}</div>
      <div style="flex:1; min-width:0">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap">
          <h1 style="margin:0; font-size:24px; font-weight:800">${escapeHtml(community.name)}</h1>
          ${community.is_official ? '<span class="cc-badge">Official</span>' : ''}
        </div>
        <div class="subtle" style="margin-top: 4px">${escapeHtml(community.tagline || '')}</div>
        <div class="ch-meta">
          <span>${community.member_count.toLocaleString()} member${community.member_count === 1 ? '' : 's'}</span>
          <span>·</span>
          <span>${community.post_count} post${community.post_count === 1 ? '' : 's'}</span>
          <span>·</span>
          <span class="cc-cat">${escapeHtml(community.category)}</span>
        </div>
      </div>
      <button class="btn ${community.joined_by_me ? 'btn-outline' : 'btn-primary'}" id="ch-join">
        ${community.joined_by_me ? 'Joined ✓' : 'Join'}
      </button>
    </div>
  `;
  document.getElementById('ch-join').onclick = toggleJoin;
  $postBtn.style.display = community.joined_by_me ? '' : 'none';
  $postBtn.onclick = () => {
    if (!community.joined_by_me) { toast('Join the community first'); return; }
    window.dispatchEvent(new CustomEvent('bidesiya:open-compose', { detail: { community } }));
  };
}

async function toggleJoin() {
  const btn = document.getElementById('ch-join');
  btn.disabled = true;
  try {
    if (community.joined_by_me) {
      await api.leaveCommunity(community.id);
      community.joined_by_me = false;
      community.member_count = Math.max(0, community.member_count - 1);
    } else {
      await api.joinCommunity(community.id);
      community.joined_by_me = true;
      community.member_count += 1;
    }
    renderHero();
  } catch (e) { toast(e.message); }
  finally { btn.disabled = false; }
}

async function loadBody() {
  if (view === 'posts')   return loadPosts();
  if (view === 'members') return loadMembers();
  if (view === 'about')   return loadAbout();
}

async function loadPosts() {
  $body.innerHTML = '<div class="subtle">Loading posts…</div>';
  try {
    const posts = await api.communityPosts(slug) || [];
    if (!posts.length) {
      const { renderEmptyState } = await import('./bihar_art.js');
      $body.innerHTML = renderEmptyState(
        'community',
        community.joined_by_me ? 'Sannata hai — start a thread' : 'Join to unlock this space',
        community.joined_by_me ? 'Post the first message in this community.' : 'Only members can post here.'
      );
      return;
    }
    $body.innerHTML = '';
    for (const p of posts) $body.appendChild(renderPost(p, { me, onRefresh: loadPosts }));
  } catch (e) {
    $body.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

async function loadMembers() {
  $body.innerHTML = '<div class="subtle">Loading members…</div>';
  try {
    const members = await api.listCommunityMembers(slug) || [];
    if (!members.length) {
      $body.innerHTML = '<div class="banner banner-info">No members yet.</div>';
      return;
    }
    $body.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'members-list';
    for (const m of members) {
      const row = document.createElement('a');
      row.href = `profile.html?u=${m.user_id}`;
      row.className = 'member-row';
      row.innerHTML = `
        ${avatarHtml(m, 40, { className: 'member-avatar' })}
        <div style="flex:1; min-width:0">
          <div class="member-name">${escapeHtml(m.display_name || m.username || 'user')}</div>
          <div class="subtle" style="font-size:12px">Joined ${timeAgo(m.joined_at)}</div>
        </div>
        <div class="member-role role-${m.role}">${escapeHtml(m.role)}</div>
        <button class="btn btn-outline btn-small dm-btn" data-uid="${m.user_id}" onclick="event.preventDefault()">Message</button>
      `;
      row.querySelector('.dm-btn').onclick = async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        if (m.user_id === me.id) { toast("That's you"); return; }
        try {
          const conv = await api.startConversation(m.user_id, null);
          location.href = `dms.html?c=${conv.id}`;
        } catch (e) { toast(e.message); }
      };
      list.appendChild(row);
    }
    $body.appendChild(list);
  } catch (e) {
    $body.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function loadAbout() {
  $body.innerHTML = `
    <div class="card" style="padding: 20px">
      <h3 style="margin: 0 0 10px">About this community</h3>
      <div style="white-space: pre-wrap; line-height: 1.6">${escapeHtml(community.description || 'No description yet.')}</div>
      <div class="subtle" style="margin-top: 16px; font-size: 12px">
        Created ${timeAgo(community.created_at)} · Category: ${escapeHtml(community.category)}
      </div>
    </div>
  `;
}

async function loadRelated() {
  try {
    const all = await api.listCommunities({ category: community?.category, limit: 5 }) || [];
    const rest = all.filter(c => c.slug !== slug).slice(0, 4);
    if (!rest.length) { $related.innerHTML = '<div class="subtle">Nothing related.</div>'; return; }
    $related.innerHTML = rest.map(c => `
      <a class="trend-row" href="community.html?slug=${encodeURIComponent(c.slug)}">
        <div class="trend-tag">${escapeHtml(c.icon || '#')} ${escapeHtml(c.name)}</div>
        <div class="trend-meta">${c.member_count} members</div>
      </a>
    `).join('');
  } catch { $related.innerHTML = ''; }
}

boot();

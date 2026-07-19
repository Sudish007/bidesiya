// Global search — users / communities / posts / hashtags.

import { api } from './api.js';
import { toast, escapeHtml, initials, timeAgo } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('search');

const $q = document.getElementById('q');
const $out = document.getElementById('search-results');
const $tabs = document.querySelector('.search-tabs');

let currentTab = 'all';
let latest = null;

// Prefill from URL
const initial = new URLSearchParams(location.search).get('q') || '';
if (initial) { $q.value = initial; doSearch(initial); }

let timer;
$q.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => doSearch($q.value.trim()), 220);
});
$q.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { clearTimeout(timer); doSearch($q.value.trim()); }
});

$tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  currentTab = btn.dataset.tab;
  $tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
  if (latest) render(latest);
});

async function doSearch(q) {
  if (!q) {
    $out.innerHTML = '<div class="subtle" style="padding: 40px; text-align: center">Type something above.</div>';
    return;
  }

  // Fast-paths for tag / user prefix
  if (q.startsWith('#') && q.length > 1) {
    location.href = `hashtag.html?tag=${encodeURIComponent(q.slice(1))}`;
    return;
  }

  history.replaceState(null, '', `search.html?q=${encodeURIComponent(q)}`);
  $out.innerHTML = '<div class="subtle" style="padding: 20px">Searching…</div>';
  try {
    const results = await api.search(q, 12);
    latest = results;
    render(results);
  } catch (e) { $out.innerHTML = `<div class="banner banner-error">${e.message}</div>`; }
}

function render(r) {
  const has = {
    users: r.users.length > 0,
    communities: r.communities.length > 0,
    posts: r.posts.length > 0,
    hashtags: r.hashtags.length > 0,
  };
  if (!has.users && !has.communities && !has.posts && !has.hashtags) {
    $out.innerHTML = `<div class="subtle" style="padding: 40px; text-align: center">No matches for "<b>${escapeHtml(r.query)}</b>".</div>`;
    return;
  }

  const show = currentTab === 'all'
    ? has
    : { users: currentTab === 'users', communities: currentTab === 'communities', posts: currentTab === 'posts', hashtags: currentTab === 'hashtags' };

  const parts = [];
  if (show.users && has.users) parts.push(sectionUsers(r.users));
  if (show.communities && has.communities) parts.push(sectionCommunities(r.communities));
  if (show.hashtags && has.hashtags) parts.push(sectionHashtags(r.hashtags));
  if (show.posts && has.posts) parts.push(sectionPosts(r.posts));

  $out.innerHTML = parts.join('') || `<div class="subtle" style="padding: 40px; text-align: center">Nothing in this tab.</div>`;
}

function sectionUsers(users) {
  return `
    <section class="search-section">
      <h3>People</h3>
      <div class="search-users">
        ${users.map(u => `
          <a class="search-user" href="profile.html?u=${u.id}">
            ${avatarHtml(u, 40, { className: 'member-avatar' })}
            <div style="flex:1; min-width:0">
              <div class="member-name">${escapeHtml(u.display_name || u.username)}
                ${u.verification_kind && u.verification_kind !== 'none' ? '<span class="verified-badge"></span>' : ''}
              </div>
              <div class="subtle" style="font-size: 12px">
                @${escapeHtml(u.username || '—')}${u.home_district ? ' · ' + escapeHtml(u.home_district) : ''}
              </div>
              ${u.headline ? `<div style="font-size: 13px; margin-top: 2px">${escapeHtml(u.headline)}</div>` : ''}
            </div>
            <div class="subtle" style="font-size: 12px; flex: none">${u.followers_count} followers</div>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

function sectionCommunities(comms) {
  return `
    <section class="search-section">
      <h3>Communities</h3>
      <div class="search-communities">
        ${comms.map(c => `
          <a class="search-community" href="community.html?slug=${encodeURIComponent(c.slug)}">
            <div class="cc-icon" style="width: 40px; height: 40px; font-size: 18px">${escapeHtml(c.icon || '#')}</div>
            <div style="flex:1; min-width:0">
              <div style="font-weight: 700">
                ${escapeHtml(c.name)}
                ${c.is_official ? '<span class="cc-badge">Official</span>' : ''}
              </div>
              <div class="subtle" style="font-size: 12px">${escapeHtml(c.tagline || '')}</div>
              <div class="subtle" style="font-size: 12px">${c.member_count} members · ${escapeHtml(c.category)}</div>
            </div>
            <div class="subtle" style="flex: none; font-size: 12px">
              ${c.joined_by_me ? 'Joined ✓' : ''}
            </div>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

function sectionHashtags(tags) {
  return `
    <section class="search-section">
      <h3>Hashtags</h3>
      <div class="search-hashtags">
        ${tags.map(t => `
          <a class="search-hashtag" href="hashtag.html?tag=${encodeURIComponent(t.tag)}">
            <span class="hashtag" style="font-size: 15px">#${escapeHtml(t.tag)}</span>
            <span class="subtle" style="font-size: 12px; margin-left: 8px">${t.posts} post${t.posts === 1 ? '' : 's'}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

function sectionPosts(posts) {
  return `
    <section class="search-section">
      <h3>Posts</h3>
      <div class="search-posts">
        ${posts.map(p => `
          <a class="search-post" href="profile.html?u=${p.author_id}#post-${p.id}">
            <div style="display:flex; align-items: baseline; gap: 6px; margin-bottom: 4px">
              <b>${escapeHtml(p.author_name)}</b>
              <span class="subtle" style="font-size: 12px">@${escapeHtml(p.author_username || 'user')} · ${escapeHtml(p.district || '')} · ${timeAgo(p.created_at)}</span>
            </div>
            <div>${escapeHtml(p.body).slice(0, 240)}${p.body.length > 240 ? '…' : ''}</div>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

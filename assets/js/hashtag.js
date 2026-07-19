// Hashtag-scoped feed page. Reads ?tag= from URL.
import { api } from './api.js';
import { toast, escapeHtml } from './ui.js';
import { mountShell } from './shell.js';
import { renderPost } from './post_render.js';

mountShell('feed');

const $feed = document.getElementById('feed');
const $title = document.getElementById('hashtag-title');
const $meta = document.getElementById('hashtag-meta');
const $trending = document.getElementById('trending');

const params = new URLSearchParams(location.search);
const tag = (params.get('tag') || '').replace(/^#/, '').toLowerCase();

let me = null;

async function boot() {
  if (!tag) {
    $feed.innerHTML = '<div class="banner banner-error">No hashtag provided.</div>';
    return;
  }
  document.title = `#${tag} · Bidesiya`;
  $title.textContent = `#${tag}`;

  if (!api.isAuthed()) {
    $feed.innerHTML = `
      <div class="card" style="text-align:center; padding: 40px 20px">
        <p class="subtle" style="margin:0 0 20px">Sign in to see posts tagged with <b>#${escapeHtml(tag)}</b>.</p>
        <a href="auth.html" class="btn btn-primary">Sign in</a>
      </div>`;
    $meta.textContent = 'Sign in to see posts';
    return;
  }

  try { me = await api.me(); }
  catch { api.signOut(); location.href = 'auth.html'; return; }

  await Promise.all([loadPosts(), loadTrending()]);
}

async function loadPosts() {
  try {
    const posts = await api.postsForHashtag(tag, 30) || [];
    if (!posts.length) {
      $feed.innerHTML = `<div class="banner banner-info">No posts yet with <b>#${escapeHtml(tag)}</b> — be the first.</div>`;
      $meta.textContent = '0 posts';
      return;
    }
    $meta.textContent = `${posts.length} post${posts.length === 1 ? '' : 's'} in the last week`;
    $feed.innerHTML = '';
    for (const p of posts) {
      $feed.appendChild(renderPost(p, { me, onRefresh: loadPosts }));
    }
  } catch (e) {
    $feed.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

async function loadTrending() {
  if (!$trending) return;
  try {
    const tags = await api.trendingHashtags(7, 8) || [];
    if (!tags.length) { $trending.innerHTML = '<div class="subtle">No trends yet.</div>'; return; }
    $trending.innerHTML = tags.map(t => `
      <a class="trend-row ${t.tag === tag ? 'active' : ''}" href="hashtag.html?tag=${encodeURIComponent(t.tag)}">
        <div class="trend-tag">#${escapeHtml(t.tag)}</div>
        <div class="trend-meta">
          ${t.posts} post${t.posts === 1 ? '' : 's'}
          ${t.districts.length ? '· ' + escapeHtml(t.districts.join(', ')) : ''}
        </div>
      </a>
    `).join('');
  } catch { $trending.innerHTML = '<div class="subtle">Trends unavailable.</div>'; }
}

window.addEventListener('bidesiya:post-created', loadPosts);

boot();

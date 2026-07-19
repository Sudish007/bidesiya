import { api } from './api.js';
import { toast, escapeHtml, initials } from './ui.js';
import { mountShell, openCreateModal } from './shell.js';
import { renderPost as sharedRenderPost } from './post_render.js';
import { loadStoriesIntoRow } from './stories.js';
import { panchangFor, daysUntil } from './panchang.js';
import { applyTheme, loadStoredTheme } from './theme.js';
import { avatarHtml, imageUrl } from './avatar.js';

loadStoredTheme();

mountShell('feed');

const $feed = document.getElementById('feed');
const $stories = document.getElementById('stories');
const $rail = document.getElementById('rail-user');
const $suggestions = document.getElementById('suggestions');
const $trending = document.getElementById('trending');

let me = null;

async function boot() {
  if (!api.isAuthed()) {
    $feed.innerHTML = `
      <div class="card" style="text-align:center; padding: 40px 20px">
        <h2 style="margin:0 0 6px; font-size:22px">Welcome to Bidesiya</h2>
        <p class="subtle" style="margin:0 0 20px">Sign in to see your feed. Guest preview below.</p>
        <a href="auth.html" class="btn btn-primary">Sign in</a>
      </div>`;
    $stories.innerHTML = '';
    renderSuggestions([]);
    renderSeedFeed();
    return;
  }

  try {
    me = await api.me();
  } catch (e) {
    toast('Session expired');
    api.signOut();
    location.href = 'auth.html';
    return;
  }
  if (me.theme) applyTheme(me.theme);
  renderRailUser();
  renderPanchang();
  renderVillageCard(me);
  const div = document.getElementById('madhubani-divider');
  if (div) {
    const { madhubaniDivider } = await import('./bihar_art.js');
    div.innerHTML = madhubaniDivider;
  }
  await Promise.all([
    loadFeed(),
    loadSuggestions(),
    loadTrending(),
    loadUpcoming(),
    loadFeaturedCampaign(),
    loadStoriesIntoRow($stories, me),
  ]);
}

async function loadFeaturedCampaign() {
  const $fc = document.getElementById('featured-campaign');
  if (!$fc) return;
  try {
    const c = await api.featuredCampaign();
    if (!c) { $fc.hidden = true; return; }
    const icons = {
      'village-infra': '🚰', 'education': '📚', 'medical': '🏥', 'cultural': '🎭',
      'disaster': '🌊', 'livelihood': '💼', 'sports': '🏏', 'environment': '🌳',
      'community': '🤝', 'other': '📦',
    };
    const icon = icons[c.category] || '🤝';
    const pct = Math.min(c.percent_raised || 0, 100);
    $fc.innerHTML = `
      <a class="rail-featured" href="campaign.html?id=${c.id}">
        <div class="rf-cat">${icon} Sahyog · ${escapeHtml(c.category_label_hi || c.category)}</div>
        <div class="rf-title">${escapeHtml(c.title)}</div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
        <div class="rf-progress">₹${Math.round(c.current_amount_raised).toLocaleString('en-IN')} of ₹${Math.round(c.target_amount).toLocaleString('en-IN')} · ${c.supporter_count} supporters</div>
      </a>
    `;
    $fc.hidden = false;
  } catch { $fc.hidden = true; }
}

function renderPanchang() {
  const box = document.getElementById('panchang-card');
  if (!box) return;
  const p = panchangFor(new Date());
  document.getElementById('pc-tithi').textContent = `${p.paksha} ${p.tithi}`;
  document.getElementById('pc-nakshatra').textContent = `${p.nakshatra} nakshatra`;
  document.getElementById('pc-vs').textContent = `VS ${p.vs_year} · ${p.vs_month}`;
  document.getElementById('pc-vaar').textContent = p.vaar;
  // Countdown to Chhath Sandhya Arghya 2026 (Oct 26)
  const days = daysUntil(9, 26);  // Oct = month index 9
  if (days > 0 && days < 200) {
    document.getElementById('pc-chhath').hidden = false;
    document.getElementById('pc-chhath-days').textContent = days;
  }
  box.hidden = false;
}

function renderVillageCard(user) {
  const box = document.getElementById('village-card');
  if (!box) return;
  if (!user.village_community_slug) return;  // no village set — hide card
  document.getElementById('vc-name').textContent = user.home_village || '';
  document.getElementById('vc-link').href = `community.html?slug=${encodeURIComponent(user.village_community_slug)}`;
  box.hidden = false;
}

async function loadUpcoming() {
  const $ue = document.getElementById('upcoming-events');
  if (!$ue) return;
  try {
    const list = await api.upcomingEvents(90, 4) || [];
    if (!list.length) {
      $ue.innerHTML = '<div class="subtle">No upcoming events.</div>';
      return;
    }
    $ue.innerHTML = list.map(e => {
      const d = new Date(e.starts_at);
      const day = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return `
        <a class="ue-row" href="event.html?slug=${encodeURIComponent(e.slug)}">
          <div class="ue-date">${escapeHtml(e.icon || '📅')}<br /><span>${day}</span></div>
          <div style="flex: 1; min-width: 0">
            <div class="ue-title">${escapeHtml(e.title)}</div>
            <div class="ue-meta">${escapeHtml(e.location_district || '')} · ${escapeHtml(e.kind)}</div>
          </div>
        </a>
      `;
    }).join('');
  } catch { $ue.innerHTML = ''; }
}

function renderRailUser() {
  if (!me) return;
  $rail.innerHTML = `
    ${avatarHtml(me, 56, { className: 'avatar-lg' })}
    <div style="min-width:0">
      <div class="name">${escapeHtml(me.username || me.display_name || me.phone)}</div>
      <div class="display-name">${escapeHtml(me.display_name || 'Bidesiya user')}</div>
    </div>
    <button class="switch" id="btn-signout">Switch</button>
  `;
  document.getElementById('btn-signout').onclick = () => {
    api.signOut();
    location.href = 'auth.html';
  };
}

// Stories are now handled by stories.js (loadStoriesIntoRow) — the old
// placeholder-toast renderStories() has been removed.

async function loadSuggestions() {
  try {
    const users = await api.get('/users/suggested?limit=5') || [];
    renderSuggestions(users);
  } catch {
    $suggestions.innerHTML = '<div class="subtle">Could not load suggestions.</div>';
  }
}

function renderSuggestions(users) {
  if (!users.length) {
    $suggestions.innerHTML = '<div class="subtle">No suggestions yet.</div>';
    return;
  }
  $suggestions.innerHTML = '';
  for (const u of users) {
    const s = document.createElement('div');
    s.className = 'suggestion';
    s.innerHTML = `
      <a href="profile.html?u=${u.id}">${avatarHtml(u, 44, { className: 'avatar' })}</a>
      <div class="info">
        <div class="u">
          <a href="profile.html?u=${u.id}" style="color:inherit">${escapeHtml(u.username || u.display_name || 'user')}</a>
          ${u.is_verified ? '<span class="verified-badge"></span>' : ''}
        </div>
        <div class="sub">${escapeHtml(u.home_district || 'Bihar')} · ${u.followers_count} followers</div>
      </div>
      <button class="follow-btn" data-id="${u.id}">Follow</button>
    `;
    s.querySelector('.follow-btn').onclick = async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '…';
      try {
        await api.post(`/users/${u.id}/follow`);
        btn.textContent = 'Following';
        btn.style.color = 'var(--ink)';
      } catch (err) { toast(err.message); btn.textContent = 'Follow'; }
    };
    $suggestions.appendChild(s);
  }
}

async function loadTrending() {
  if (!$trending) return;
  try {
    const tags = await api.trendingHashtags(7, 6) || [];
    if (!tags.length) {
      $trending.innerHTML = '<div class="subtle">No trends yet.</div>';
      return;
    }
    $trending.innerHTML = tags.map(t => `
      <a class="trend-row" href="hashtag.html?tag=${encodeURIComponent(t.tag)}">
        <div class="trend-tag">#${escapeHtml(t.tag)}</div>
        <div class="trend-meta">
          ${t.posts} post${t.posts === 1 ? '' : 's'}
          ${t.districts.length ? '· ' + escapeHtml(t.districts.join(', ')) : ''}
        </div>
      </a>
    `).join('');
  } catch {
    $trending.innerHTML = '<div class="subtle">Trends unavailable.</div>';
  }
}

async function loadFeed() {
  try {
    const posts = await api.get('/posts?limit=30') || [];
    render(posts);
  } catch (e) {
    $feed.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function renderComposer() {
  if (!me) return null;
  const box = document.createElement('div');
  box.className = 'feed-composer';
  box.innerHTML = `
    <div class="fc-row">
      ${avatarHtml(me, 44, { className: 'fc-avatar' })}
      <button class="fc-input" type="button">What's happening in Bihar?</button>
    </div>
    <div class="fc-actions">
      <button class="fc-action" data-a="photo">
        <span class="fc-icon photo">🖼️</span>
        <span>Photo</span>
      </button>
      <button class="fc-action" data-a="poll">
        <span class="fc-icon poll">📊</span>
        <span>Poll</span>
      </button>
      <button class="fc-action" data-a="story">
        <span class="fc-icon story">🌅</span>
        <span>Story</span>
      </button>
      <button class="fc-post btn btn-primary" data-a="post">Post</button>
    </div>
  `;
  const openCompose = () => window.dispatchEvent(new CustomEvent('bidesiya:open-compose'));
  box.querySelector('.fc-input').onclick = openCompose;
  box.querySelector('[data-a="photo"]').onclick = openCompose;
  box.querySelector('[data-a="poll"]').onclick = openCompose;
  box.querySelector('[data-a="post"]').onclick = openCompose;
  box.querySelector('[data-a="story"]').onclick = async () => {
    // Lazy-load the story creator so we don't pull it on other pages.
    const { openStoryCreator } = await import('./stories.js');
    openStoryCreator(me);
  };
  return box;
}

async function render(posts) {
  $feed.innerHTML = '';
  const composer = renderComposer();
  if (composer) $feed.appendChild(composer);

  if (!posts.length) {
    const { renderEmptyState } = await import('./bihar_art.js');
    const empty = document.createElement('div');
    empty.innerHTML = renderEmptyState('feed', 'Sunrise over the Ganga', 'No posts yet. Break the silence — write the first one.');
    empty.insertAdjacentHTML('beforeend', '<div style="text-align:center; margin-top: 12px"><button class="btn btn-primary" id="first-post">Post something</button></div>');
    $feed.appendChild(empty);
    const link = empty.querySelector('#first-post');
    if (link) link.onclick = (e) => { e.preventDefault(); openCreateModal(); };
    return;
  }
  for (const p of posts) {
    $feed.appendChild(sharedRenderPost(p, { me, onRefresh: loadFeed }));
  }
}

// Refresh on post creation
window.addEventListener('bidesiya:post-created', loadFeed);

// Guest seed (only shown when signed out)
function renderSeedFeed() {
  const seeds = [
    {
      id: 'seed-1', author_id: -1, author_name: 'Anita Devi',
      district: 'Gopalganj', block: 'Kuchaikote', language: 'hi', kind: 'text',
      body: 'JEEVIKA समूह की महिलाओं ने मखाना पैकिंग शुरू की — दो महीने का हिसाब सामने रखा। #jeevika #mahila',
      image_url: null, likes_count: 89, comments_count: 22, liked_by_me: false,
      reposts_count: 4, hashtags: ['jeevika','mahila'], is_repost: false, is_quote: false, parent: null,
      created_at: new Date(Date.now() - 3*3600*1000).toISOString(),
    },
    {
      id: 'seed-2', author_id: -1, author_name: 'Bihar Disaster Mgmt',
      district: 'Muzaffarpur', block: 'All blocks', language: 'hi', kind: 'alert',
      body: 'बागमती जलस्तर खतरे के निशान से 12 सेमी ऊपर — कटौझा में सतर्क रहें। #bagmati #floodalert',
      image_url: null, likes_count: 0, comments_count: 0, liked_by_me: false,
      reposts_count: 12, hashtags: ['bagmati','floodalert'], is_repost: false, is_quote: false, parent: null,
      created_at: new Date(Date.now() - 60*60*1000).toISOString(),
    },
  ];
  render(seeds);
}

boot();

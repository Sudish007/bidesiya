// Story ring + viewer modal + create picker.
//
// Public exports:
//   loadStoriesIntoRow(el, me) — replaces the placeholder story row on the feed
//   openStoryCreator(me)       — opens the "add to your story" composer

import { api } from './api.js';
import { toast, escapeHtml, initials } from './ui.js';
import { imageUrl as imgUrl } from './avatar.js';

const BACKGROUNDS = {
  sunrise: 'linear-gradient(135deg, #F43F5E, #F97316, #FBBF24)',
  river:   'linear-gradient(135deg, #0EA5E9, #6366F1, #8B5CF6)',
  bamboo:  'linear-gradient(135deg, #16A34A, #65A30D, #FBBF24)',
  plum:    'linear-gradient(135deg, #7E22CE, #EC4899, #F43F5E)',
};

export async function loadStoriesIntoRow(row, me) {
  if (!row) return;
  let groups = [];
  try { groups = await api.storyFeed() || []; } catch { groups = []; }

  row.innerHTML = '';
  // "Your story" tile always first — click to create.
  const you = document.createElement('div');
  you.className = 'story your-story';
  const mine = groups.find(g => g.author_id === (me && me.id));
  const meAvatarUrl = imgUrl(me && me.avatar_url);
  const meAvatarInner = meAvatarUrl
    ? `<img class="story-avatar" src="${meAvatarUrl}" alt="" />`
    : `<div class="story-avatar">${me ? initials(me.display_name || me.username) : '+'}</div>`;
  you.innerHTML = `
    <div class="story-ring ${mine ? 'has-story' : 'empty'}"><div class="story-inner">${meAvatarInner}</div></div>
    <div class="story-label">${mine ? 'Your story' : 'Add story'}</div>
    ${!mine ? '<span class="story-plus">+</span>' : ''}
  `;
  you.onclick = () => {
    if (mine) openStoryViewer(groups, mine.author_id);
    else openStoryCreator(me);
  };
  row.appendChild(you);

  for (const g of groups) {
    if (me && g.author_id === me.id) continue;  // skip "your story", already at front
    const s = document.createElement('div');
    s.className = 'story';
    const url = imgUrl(g.author_avatar_url);
    const inner = url
      ? `<img class="story-avatar" src="${url}" alt="" />`
      : `<div class="story-avatar">${initials(g.author_name || g.author_username || '?')}</div>`;
    s.innerHTML = `
      <div class="story-ring ${g.has_unseen ? '' : 'seen'}"><div class="story-inner">${inner}</div></div>
      <div class="story-label">${escapeHtml(g.author_username || g.author_name || 'user')}</div>
    `;
    s.onclick = () => openStoryViewer(groups, g.author_id);
    row.appendChild(s);
  }
}

function openStoryViewer(groups, startAuthorId) {
  // Flatten into a linear playlist starting from the selected author.
  const orderedAuthors = groups.slice();
  const idx0 = orderedAuthors.findIndex(g => g.author_id === startAuthorId);
  if (idx0 < 0) return;
  // Rotate so selected author starts first.
  const rotated = orderedAuthors.slice(idx0).concat(orderedAuthors.slice(0, idx0));
  const playlist = [];
  for (const g of rotated) for (const s of g.stories) playlist.push({ group: g, story: s });
  if (!playlist.length) return;

  let current = 0;
  let progressTimer = null;

  const back = document.createElement('div');
  back.className = 'story-viewer';
  back.innerHTML = `
    <button class="sv-close" aria-label="Close">✕</button>
    <button class="sv-prev" aria-label="Previous">‹</button>
    <button class="sv-next" aria-label="Next">›</button>
    <div class="sv-stage" id="sv-stage"></div>
    <div class="sv-progress" id="sv-progress"></div>
  `;
  document.body.appendChild(back);

  const stage = back.querySelector('#sv-stage');
  const progressBar = back.querySelector('#sv-progress');

  function renderProgress() {
    progressBar.innerHTML = '';
    for (let i = 0; i < playlist.length; i++) {
      const seg = document.createElement('div');
      seg.className = 'sv-seg' + (i < current ? ' done' : (i === current ? ' active' : ''));
      progressBar.appendChild(seg);
    }
  }

  function renderCurrent() {
    const item = playlist[current];
    const bg = BACKGROUNDS[item.story.background] || BACKGROUNDS.sunrise;
    const imgHtml = item.story.image_url
      ? `<img class="sv-img" src="${item.story.image_url.startsWith('http') ? item.story.image_url : api.base + item.story.image_url}" alt="" />`
      : '';
    stage.innerHTML = `
      <div class="sv-card" style="background: ${bg}">
        <header class="sv-header">
          <div class="sv-avatar">${initials(item.group.author_name || item.group.author_username)}</div>
          <div style="flex:1">
            <div style="font-weight:700; font-size: 14px; color:#fff">${escapeHtml(item.group.author_name || item.group.author_username)}</div>
          </div>
        </header>
        ${imgHtml}
        ${item.story.body ? `<div class="sv-body">${escapeHtml(item.story.body)}</div>` : ''}
      </div>
    `;
    renderProgress();
    // Mark as viewed
    api.viewStory(item.story.id).catch(() => {});
    // Auto-advance after 6s
    clearTimeout(progressTimer);
    progressTimer = setTimeout(next, 6000);
  }

  function next() {
    clearTimeout(progressTimer);
    if (current + 1 >= playlist.length) { close(); return; }
    current++;
    renderCurrent();
  }
  function prev() {
    clearTimeout(progressTimer);
    if (current === 0) return;
    current--;
    renderCurrent();
  }
  function close() {
    clearTimeout(progressTimer);
    back.remove();
    document.removeEventListener('keydown', onKey);
  }

  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  back.querySelector('.sv-close').onclick = close;
  back.querySelector('.sv-next').onclick = next;
  back.querySelector('.sv-prev').onclick = prev;

  renderCurrent();
}

export function openStoryCreator(me) {
  if (!api.isAuthed()) { toast('Sign in first'); return; }
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 480px">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px">
        <h2 style="margin:0">Add to your story</h2>
        <button class="btn" id="sc-close">✕</button>
      </div>
      <div class="story-bg-picker">
        <button class="story-bg" data-bg="sunrise" style="background: ${BACKGROUNDS.sunrise}">Sunrise</button>
        <button class="story-bg" data-bg="river" style="background: ${BACKGROUNDS.river}">River</button>
        <button class="story-bg" data-bg="bamboo" style="background: ${BACKGROUNDS.bamboo}">Bamboo</button>
        <button class="story-bg" data-bg="plum" style="background: ${BACKGROUNDS.plum}">Plum</button>
      </div>
      <div class="field"><label>Text</label>
        <textarea class="input" id="sc-body" rows="3" maxlength="280" placeholder="Share a moment… lasts 24 hours"></textarea>
      </div>
      <div class="field"><label>Or upload an image</label>
        <input type="file" id="sc-file" accept="image/*" />
      </div>
      <button class="btn btn-primary btn-block" id="sc-submit">Post story</button>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#sc-close').onclick = () => back.remove();

  let background = 'sunrise';
  back.querySelectorAll('.story-bg').forEach(b => {
    b.onclick = () => {
      background = b.dataset.bg;
      back.querySelectorAll('.story-bg').forEach(x => x.classList.toggle('active', x === b));
    };
  });
  back.querySelector('[data-bg="sunrise"]').classList.add('active');

  back.querySelector('#sc-submit').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      let image_url = null;
      const file = back.querySelector('#sc-file').files[0];
      if (file) {
        const up = await api.uploadImage(file);
        image_url = up.url;
      }
      const body = back.querySelector('#sc-body').value.trim();
      if (!body && !image_url) { toast('Add text or an image'); btn.disabled = false; btn.textContent = 'Post story'; return; }
      await api.createStory({ body, image_url, background, duration_hours: 24 });
      toast('Story posted — expires in 24h');
      back.remove();
      window.dispatchEvent(new CustomEvent('bidesiya:story-created'));
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = 'Post story';
    }
  };
}

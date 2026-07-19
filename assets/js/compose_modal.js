// Instagram-style "Create new post" modal.
// Listens for the 'bidesiya:open-compose' event dispatched by shell.js.

import { api } from './api.js';
import { toast, escapeHtml, timeAgo, initials } from './ui.js';

const DISTRICTS = ['Siwan', 'Gopalganj', 'Muzaffarpur', 'Patna', 'Darbhanga'];
const LANGS = [['hi', 'हिन्दी'], ['bho', 'भोजपुरी'], ['mai', 'मैथिली'], ['mag', 'मगही'], ['en', 'English']];

window.addEventListener('bidesiya:open-compose', (e) => {
  if (!api.isAuthed()) {
    toast('Sign in to post');
    setTimeout(() => location.href = 'auth.html', 600);
    return;
  }
  const detail = (e && e.detail) || {};
  openModal({ quoting: detail.quoting || null, community: detail.community || null });
});

function openModal({ quoting = null, community = null } = {}) {
  let existing = document.getElementById('compose-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'compose-backdrop';
  backdrop.className = 'modal-backdrop open';

  const title = quoting
    ? 'Quote post'
    : (community ? `Post in ${community.name}` : 'Create new post');
  const submitLabel = quoting ? 'Post quote' : 'Share';

  const communityStripHtml = community ? `
    <div class="compose-community-strip">
      <span class="cc-icon-sm">${community.icon || '#'}</span>
      Posting in <b>${community.name}</b>
    </div>
  ` : '';

  const quoteEmbedHtml = quoting ? `
    <div class="quote-embed" style="cursor:default; margin-bottom: 14px">
      <div class="qe-header">
        <div class="qe-avatar">${initials(quoting.author_name)}</div>
        <div class="qe-author">${escapeHtml(quoting.author_name || 'user')}</div>
        <div class="qe-time">· ${timeAgo(quoting.created_at)}</div>
      </div>
      ${quoting.body ? `<div class="qe-body">${escapeHtml(quoting.body).replace(/\n/g,'<br>')}</div>` : ''}
    </div>
  ` : '';

  const uploaderHtml = quoting ? '' : `
    <label class="compose-drop" id="compose-drop">
      <input type="file" id="compose-file" accept="image/*" hidden />
      <div id="compose-drop-inner">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" stroke-width="1.4">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <div style="margin-top: 12px; font-weight:600">Click to upload a photo</div>
        <div style="margin-top: 4px; font-size: 12px">Or leave blank for a text-only post</div>
      </div>
    </label>
  `;

  backdrop.innerHTML = `
    <div class="modal compose-modal">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 16px">
        <h2 style="margin:0">${title}</h2>
        <button class="btn" id="compose-close" aria-label="Close">✕</button>
      </div>

      ${communityStripHtml}
      ${quoteEmbedHtml}
      ${uploaderHtml}

      <div class="field">
        <label>District</label>
        <select class="input" id="compose-district">
          ${DISTRICTS.map(d => `<option value="${d}"${quoting && quoting.district === d ? ' selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Language</label>
        <select class="input" id="compose-language">
          ${LANGS.map(([c, l]) => `<option value="${c}">${l}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>${quoting ? 'Your thought' : 'Caption'}</label>
        <textarea class="input" id="compose-body" rows="3" placeholder="${quoting ? 'Add your take. Tip: use #hashtags' : 'Write a caption… try #biharjobs'}"></textarea>
      </div>
      <button class="btn btn-primary btn-block" id="compose-submit">${submitLabel}</button>
    </div>
  `;
  document.body.appendChild(backdrop);

  const $drop = backdrop.querySelector('#compose-drop');
  const $file = backdrop.querySelector('#compose-file');
  const $inner = backdrop.querySelector('#compose-drop-inner');
  const $body = backdrop.querySelector('#compose-body');
  const $submit = backdrop.querySelector('#compose-submit');
  const $close = backdrop.querySelector('#compose-close');

  let file = null;
  if ($file) {
    $file.addEventListener('change', (e) => {
      file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      $drop.classList.add('has-image');
      $inner.innerHTML = `<img src="${url}" alt="preview" />`;
    });
  }

  $close.onclick = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

  $submit.onclick = async () => {
    const body = $body.value.trim();
    if (quoting && !body) {
      toast('Add your thought — otherwise use plain Repost');
      return;
    }
    if (!quoting && !body && !file) {
      toast('Add a caption or photo');
      return;
    }
    $submit.disabled = true;
    $submit.textContent = quoting ? 'Posting…' : 'Sharing…';
    try {
      let image_url = null;
      if (file) {
        const up = await api.uploadImage(file);
        image_url = up.url;
      }
      const payload = {
        body,
        district: backdrop.querySelector('#compose-district').value,
        language: backdrop.querySelector('#compose-language').value,
        kind: image_url ? 'image' : 'text',
        image_url,
      };
      if (community) payload.community_id = community.id;
      if (quoting) {
        await api.quote(quoting.id, payload);
      } else {
        await api.createPost(payload);
      }
      toast(quoting ? 'Quote posted' : 'Posted');
      backdrop.remove();
      window.dispatchEvent(new CustomEvent('bidesiya:post-created'));
    } catch (e) {
      toast(e.message);
    } finally {
      $submit.disabled = false;
      $submit.textContent = submitLabel;
    }
  };
}

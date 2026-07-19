// Rishta — matrimony page.
// Shows either the setup wizard (if the user has no profile) or the browse
// grid (if they do). Also lists incoming interests in the right rail.

import { api } from './api.js';
import { toast, escapeHtml, timeAgo, initials } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('rishta');

const $view = document.getElementById('rishta-view');
const $incoming = document.getElementById('incoming-interests');
const $incomingList = document.getElementById('incoming-list');

let myProfile = null;

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  await load();
}

async function load() {
  try {
    myProfile = await api.myRishta();
  } catch { myProfile = null; }

  if (!myProfile) {
    renderIntroCard();
    return;
  }

  renderBrowse();
  loadIncoming();
}

// ---------------- Intro / setup wizard ----------------

function renderIntroCard() {
  $view.innerHTML = `
    <div class="card rishta-intro">
      <div class="ri-emoji">🌹</div>
      <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 800">Welcome to Rishta</h1>
      <p class="subtle" style="margin: 0 0 16px; max-width: 500px">
        A rishta space built without caste, dowry, or manglik. Filters by age, region, language,
        education, profession, and values only. Opt-in — nothing about your account here is
        visible outside Rishta.
      </p>
      <button class="btn btn-primary" id="btn-create-rishta">Create my profile</button>
    </div>
  `;
  document.getElementById('btn-create-rishta').onclick = () => renderWizard();
}

function renderWizard(existing = null) {
  const d = existing || {};
  $view.innerHTML = `
    <div class="card rishta-wizard">
      <h2 style="margin: 0 0 6px">${existing ? 'Edit your Rishta profile' : 'Create your Rishta profile'}</h2>
      <p class="subtle" style="margin: 0 0 20px; font-size: 13px">
        Take your time. Everything except date-of-birth can be edited later.
      </p>

      <div class="rw-grid">
        <div class="field"><label>I am</label>
          <select class="input" id="w-gender">
            ${opts(['male','female','non-binary','prefer-not-to-say'], d.gender)}
          </select>
        </div>
        <div class="field"><label>Seeking</label>
          <select class="input" id="w-seeking">
            ${opts(['male','female','either'], d.seeking)}
          </select>
        </div>
        <div class="field"><label>Date of birth</label>
          <input class="input" id="w-dob" type="date" value="${d.dob || ''}" />
        </div>
        <div class="field"><label>Height (cm, optional)</label>
          <input class="input" id="w-height" type="number" min="120" max="230" value="${d.height_cm || ''}" />
        </div>

        <div class="field"><label>Religion (optional)</label>
          <select class="input" id="w-religion">
            <option value="">Not specified</option>
            ${opts(['hindu','muslim','christian','sikh','jain','buddhist','no-religion','other'], d.religion)}
          </select>
        </div>
        <div class="field"><label>Interfaith OK?</label>
          <select class="input" id="w-interfaith">
            <option value="true" ${d.interfaith_ok === false ? '' : 'selected'}>Yes</option>
            <option value="false" ${d.interfaith_ok === false ? 'selected' : ''}>Prefer same faith</option>
          </select>
        </div>

        <div class="field"><label>Marital status</label>
          <select class="input" id="w-marital">
            ${opts(['never-married','divorced','widowed','separated'], d.marital_status || 'never-married')}
          </select>
        </div>
        <div class="field"><label>Wants children</label>
          <select class="input" id="w-wants-kids">
            ${opts(['yes','maybe','no'], d.wants_children || 'maybe')}
          </select>
        </div>

        <div class="field"><label>Education level</label>
          <select class="input" id="w-education">
            <option value="">Not specified</option>
            ${opts(['high-school','graduate','postgrad','doctorate','professional'], d.education_level)}
          </select>
        </div>
        <div class="field"><label>Field of study</label>
          <input class="input" id="w-edu-field" placeholder="e.g. Civil Engineering" value="${escapeHtml(d.education_field || '')}" />
        </div>

        <div class="field"><label>Profession</label>
          <input class="input" id="w-profession" placeholder="e.g. Doctor" value="${escapeHtml(d.profession || '')}" />
        </div>
        <div class="field"><label>Employer (optional)</label>
          <input class="input" id="w-employer" value="${escapeHtml(d.employer || '')}" />
        </div>

        <div class="field"><label>Diet</label>
          <select class="input" id="w-diet">
            ${opts(['veg','eggetarian','non-veg','vegan'], d.diet || 'veg')}
          </select>
        </div>
        <div class="field"><label>Smoking</label>
          <select class="input" id="w-smoking">
            ${opts(['never','socially','regular'], d.smoking || 'never')}
          </select>
        </div>

        <div class="field"><label>Drinking</label>
          <select class="input" id="w-drinking">
            ${opts(['never','socially','regular'], d.drinking || 'never')}
          </select>
        </div>
        <div class="field"><label>Family style</label>
          <select class="input" id="w-family">
            ${opts(['nuclear','joint','independent'], d.family_style || 'nuclear')}
          </select>
        </div>

        <div class="field"><label>Willing to relocate</label>
          <select class="input" id="w-relocate">
            <option value="true" ${d.willing_to_relocate ? 'selected' : ''}>Yes</option>
            <option value="false" ${d.willing_to_relocate ? '' : 'selected'}>No</option>
          </select>
        </div>
        <div class="field"><label>Languages you speak</label>
          <input class="input" id="w-languages" placeholder="Hindi, Maithili, English" value="${(d.languages || []).join(', ')}" />
        </div>

        <div class="field field-full"><label>About me</label>
          <textarea class="input" id="w-about" rows="4" maxlength="1000" placeholder="Where you're from, what you do, what you love.">${escapeHtml(d.about_me || '')}</textarea>
        </div>
        <div class="field field-full"><label>Looking for</label>
          <textarea class="input" id="w-looking" rows="3" maxlength="1000" placeholder="Values and qualities that matter to you.">${escapeHtml(d.looking_for || '')}</textarea>
        </div>

        <div class="field"><label>Min age preference</label>
          <input class="input" id="w-min" type="number" min="18" max="90" value="${d.min_age || 24}" />
        </div>
        <div class="field"><label>Max age preference</label>
          <input class="input" id="w-max" type="number" min="18" max="90" value="${d.max_age || 34}" />
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--divider); display: flex; gap: 8px; justify-content: flex-end">
        ${existing ? '<button class="btn btn-outline" id="btn-cancel">Cancel</button>' : ''}
        <button class="btn btn-primary" id="btn-save">${existing ? 'Save changes' : 'Create profile'}</button>
      </div>
    </div>
  `;

  const cancel = document.getElementById('btn-cancel');
  if (cancel) cancel.onclick = renderBrowse;

  document.getElementById('btn-save').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const payload = {
        gender: val('w-gender'),
        seeking: val('w-seeking'),
        dob: val('w-dob'),
        height_cm: parseInt(val('w-height')) || null,
        religion: val('w-religion') || null,
        interfaith_ok: val('w-interfaith') === 'true',
        marital_status: val('w-marital'),
        wants_children: val('w-wants-kids'),
        education_level: val('w-education') || null,
        education_field: val('w-edu-field') || null,
        profession: val('w-profession') || null,
        employer: val('w-employer') || null,
        diet: val('w-diet'),
        smoking: val('w-smoking'),
        drinking: val('w-drinking'),
        family_style: val('w-family'),
        willing_to_relocate: val('w-relocate') === 'true',
        languages: val('w-languages').split(',').map(s => s.trim()).filter(Boolean),
        about_me: val('w-about'),
        looking_for: val('w-looking'),
        min_age: parseInt(val('w-min')) || 24,
        max_age: parseInt(val('w-max')) || 34,
      };
      if (!payload.dob) throw new Error('Date of birth is required');
      myProfile = await api.upsertRishta(payload);
      toast(existing ? 'Saved' : 'Profile created');
      renderBrowse();
      loadIncoming();
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = existing ? 'Save changes' : 'Create profile';
    }
  };
}

function opts(list, current) {
  return list.map(v => `<option value="${v}"${current === v ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');
}
function val(id) { return document.getElementById(id).value.trim(); }

// ---------------- Browse ----------------

async function renderBrowse() {
  $view.innerHTML = `
    <header class="communities-header">
      <div>
        <h1 style="margin:0; font-size: 26px; font-weight: 800">Rishta</h1>
        <p class="subtle" style="margin: 4px 0 0">Discover people who share your values.</p>
      </div>
      <div style="display:flex; gap: 8px">
        <button class="btn btn-outline btn-small" id="btn-edit-rishta">Edit my profile</button>
        <button class="btn btn-outline btn-small" id="btn-pause-rishta">${myProfile.is_paused ? 'Unpause' : 'Pause'}</button>
      </div>
    </header>

    <div class="rishta-filters" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px">
      <select class="input" id="f-religion" style="max-width: 160px">
        <option value="">All faiths</option>
        ${opts(['hindu','muslim','christian','sikh','jain','buddhist','no-religion','other'])}
      </select>
      <select class="input" id="f-diet" style="max-width: 140px">
        <option value="">Any diet</option>
        ${opts(['veg','eggetarian','non-veg','vegan'])}
      </select>
      <input class="input" id="f-district" placeholder="District (e.g. Patna)" style="max-width: 200px" />
    </div>

    <div id="rishta-grid" class="rishta-grid"><div class="subtle" style="grid-column: 1/-1">Loading…</div></div>
  `;

  document.getElementById('btn-edit-rishta').onclick = () => renderWizard(myProfile);
  document.getElementById('btn-pause-rishta').onclick = async () => {
    try {
      myProfile = await api.pauseRishta();
      toast(myProfile.is_paused ? 'Profile paused' : 'Profile active');
      renderBrowse();
    } catch (e) { toast(e.message); }
  };

  ['f-religion', 'f-diet', 'f-district'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', doBrowse);
    if (id === 'f-district') el.addEventListener('input', debounce(doBrowse, 250));
  });

  doBrowse();
}

async function doBrowse() {
  const grid = document.getElementById('rishta-grid');
  const params = {
    religion: val('f-religion'),
    diet: val('f-diet'),
    district: val('f-district'),
  };
  grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">Loading…</div>';
  try {
    const results = await api.browseRishta(params);
    if (!results.length) {
      grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1; padding: 40px 0; text-align: center">No matches with these filters.</div>';
      return;
    }
    grid.innerHTML = '';
    for (const r of results) grid.appendChild(renderCard(r));
  } catch (e) {
    grid.innerHTML = `<div class="banner banner-error" style="grid-column: 1/-1">${e.message}</div>`;
  }
}

function renderCard(r) {
  const card = document.createElement('article');
  card.className = 'rishta-card';
  card.innerHTML = `
    <div class="rc-avatar-wrap">
      ${avatarHtml({ display_name: r.display_name, username: r.username, avatar_url: r.avatar_url, verification_kind: r.verification_kind }, 68, { className: 'rc-avatar' })}
    </div>
    <div class="rc-name">${escapeHtml(r.display_name || r.username)}</div>
    <div class="rc-meta">
      ${r.age} · ${escapeHtml(r.gender)}
      ${r.home_district ? '· ' + escapeHtml(r.home_district) : ''}
    </div>
    ${r.profession ? `<div class="rc-line">💼 ${escapeHtml(r.profession)}</div>` : ''}
    ${r.education_level ? `<div class="rc-line">🎓 ${escapeHtml(r.education_level)}${r.education_field ? ' — ' + escapeHtml(r.education_field) : ''}</div>` : ''}
    <div class="rc-line">🍽 ${escapeHtml(r.diet)}${r.religion ? ' · ' + escapeHtml(r.religion) : ''}</div>
    ${r.about_me ? `<div class="rc-about">${escapeHtml(r.about_me).slice(0, 140)}${r.about_me.length > 140 ? '…' : ''}</div>` : ''}
    <button class="btn btn-primary btn-block btn-small rc-interest" data-id="${r.user_id}">
      🌹 Express interest
    </button>
  `;

  card.querySelector('.rc-interest').onclick = async (e) => {
    const btn = e.currentTarget;
    const message = prompt('Send a note with your namaste (optional):', '') || '';
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await api.expressInterest(r.user_id, message);
      btn.textContent = 'Interest sent ✓';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = '🌹 Express interest';
    }
  };
  return card;
}

// ---------------- Incoming interests (right rail) ----------------

async function loadIncoming() {
  if (!myProfile) return;
  try {
    const { incoming } = await api.listInterests();
    const pending = incoming.filter(i => i.status === 'pending');
    if (!pending.length) return;
    $incoming.hidden = false;
    $incomingList.innerHTML = '';
    for (const i of pending) {
      const row = document.createElement('div');
      row.className = 'incoming-row';
      row.innerHTML = `
        ${avatarHtml({ display_name: i.peer_display_name, username: i.peer_username, avatar_url: i.peer_avatar_url }, 40, { className: 'ir-avatar' })}
        <div style="flex: 1; min-width: 0">
          <div class="ir-name">${escapeHtml(i.peer_display_name || i.peer_username || 'user')}</div>
          <div class="ir-meta">${timeAgo(i.created_at)}</div>
          ${i.message ? `<div class="ir-msg">${escapeHtml(i.message)}</div>` : ''}
        </div>
        <div class="ir-actions">
          <button class="ir-btn accept" data-id="${i.id}">✓</button>
          <button class="ir-btn reject" data-id="${i.id}">✕</button>
        </div>
      `;
      row.querySelector('.accept').onclick = async () => {
        try { await api.acceptInterest(i.id); row.remove(); toast('Accepted'); } catch (e) { toast(e.message); }
      };
      row.querySelector('.reject').onclick = async () => {
        try { await api.rejectInterest(i.id); row.remove(); toast('Declined'); } catch (e) { toast(e.message); }
      };
      $incomingList.appendChild(row);
    }
  } catch {}
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

boot();

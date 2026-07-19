import { api } from './api.js';
import { toast, escapeHtml, initials, confirmModal } from './ui.js';
import { mountShell } from './shell.js';
import { imageUrl } from './avatar.js';

mountShell('profile');

const $wrap = document.getElementById('profile');
const ident = new URLSearchParams(location.search).get('u') || (api.userId ? String(api.userId) : null);

let profile = null;
let experience = [];
let education = [];
let currentTab = 'posts';

async function load() {
  if (!api.isAuthed()) {
    $wrap.innerHTML = `
      <div class="card" style="text-align:center; padding:40px 20px; margin-top:40px">
        <h2 style="margin:0 0 6px">Sign in first</h2>
        <p class="subtle">Profiles need an account.</p>
        <a href="auth.html" class="btn btn-primary" style="margin-top:12px">Sign in</a>
      </div>`;
    return;
  }
  if (!ident) {
    $wrap.innerHTML = '<div class="banner banner-error">No user specified — <code>?u=1</code> or <code>?u=admin</code></div>';
    return;
  }
  try {
    [profile, experience, education] = await Promise.all([
      api.get(`/profiles/${encodeURIComponent(ident)}`),
      // Fetch career items in parallel; safe even if user id must be resolved first
      // because /profiles above must return before we know profile.id, but for
      // fast rendering we optimistically hit the current user context too.
      Promise.resolve([]),
      Promise.resolve([]),
    ]);
    // Now that we have the numeric id, fetch the career sections
    [experience, education] = await Promise.all([
      api.listExperience(profile.id).catch(() => []),
      api.listEducation(profile.id).catch(() => []),
    ]);
    render();
    loadTab();
  } catch (e) {
    $wrap.innerHTML = `<div class="banner banner-error">${escapeHtml(e.message)}</div>`;
  }
}

function render() {
  const p = profile;
  const uname = p.username || String(p.id);
  const verifiedBadge = p.verification_kind && p.verification_kind !== 'none'
    ? `<span class="profile-verified-pill verified-${p.verification_kind}">${verifyLabel(p.verification_kind)}</span>`
    : '';

  // Notable Voices are follow-only — no Message, no Block hostility toward them.
  const isNotable = p.verification_kind === 'notable';

  const actions = p.is_me
    ? `<button class="btn btn-outline" id="btn-edit-profile">Edit profile</button>
       <button class="btn btn-outline" id="btn-edit-skills">Edit skills</button>
       <button class="btn ${p.open_to_work ? '' : 'btn-primary'}" id="btn-toggle-otw">
         ${p.open_to_work ? '✓ Open to work' : 'Mark: Open to work'}
       </button>
       ${!p.is_verified ? '<button class="btn btn-outline" id="btn-verify">Request verification</button>' : ''}`
    : isNotable
    ? `<button class="btn ${p.i_am_following ? 'btn-outline' : 'btn-primary'}" id="btn-follow">${p.i_am_following ? 'Following ✓' : 'Follow'}</button>
       <span class="notable-follow-only" title="Notable Voices can only be followed">Follow-only</span>`
    : `<button class="btn ${p.i_am_following ? '' : 'btn-primary'}" id="btn-follow">${p.i_am_following ? 'Following' : 'Follow'}</button>
       <button class="btn" id="btn-message">Message</button>
       <button class="btn btn-outline" id="btn-block">Block</button>`;

  const skillsHtml = (p.skills && p.skills.length)
    ? `<div class="skills-strip">${p.skills.map(s => `<span class="skill-chip">${escapeHtml(s)}</span>`).join('')}</div>`
    : '';

  const locationLine = [
    p.home_district ? `<span class="home">Home: ${escapeHtml([p.home_village, p.home_block, p.home_district].filter(Boolean).join(', '))}</span>` : '',
    p.current_location ? `<span class="away">Currently: ${escapeHtml(p.current_location)}</span>` : '',
  ].filter(Boolean).join(' · ');

  $wrap.innerHTML = `
    <div class="profile-card-wrap">
      <div class="profile-cover"></div>
      <div class="profile-body">
        <div class="profile-avatar-wrap">
          <div class="ring" data-verification="${p.verification_kind || 'none'}">
            ${p.avatar_url
              ? `<img class="inner inner-img" src="${imageUrl(p.avatar_url)}" alt="${escapeHtml(p.display_name || p.username || '')}" />`
              : `<div class="inner">${initials(p.display_name || p.username)}</div>`}
            ${p.is_me ? `
              <button class="avatar-edit-btn" id="btn-upload-avatar" title="${p.avatar_url ? 'Change photo' : 'Add photo'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              <input type="file" id="avatar-file" accept="image/*" hidden />
            ` : ''}
          </div>
        </div>
        <div style="font-size:26px; font-weight:800; letter-spacing:-0.4px; margin: 0 0 2px; display:flex; align-items:center; flex-wrap:wrap">
          ${escapeHtml(p.display_name || uname)}${verifiedBadge}
        </div>
        <div class="subtle" style="font-size:14px">@${escapeHtml(uname)}</div>

        ${p.headline ? `<div class="headline">${escapeHtml(p.headline)}</div>` : ''}
        ${p.bio ? `<div style="margin-top:6px; white-space:pre-wrap; font-size:14px; color:var(--ink-subtle)">${escapeHtml(p.bio)}</div>` : ''}

        <div class="location-line" style="margin-top:8px">${locationLine || `<span class="home">${escapeHtml(p.home_district || 'Bihar')}</span>`}</div>

        ${p.open_to_work ? `<div class="open-to-work-strip">Open to work — seeking new opportunities</div>` : ''}

        <div class="profile-actions">${actions}</div>

        ${skillsHtml}

        <div style="display:flex; gap:24px; margin-top:14px; font-size:14px; color:var(--ink-muted)">
          <div><strong style="color:var(--ink)">${p.posts_count}</strong> posts</div>
          <div><strong style="color:var(--ink)">${p.followers_count}</strong> followers</div>
          <div><strong style="color:var(--ink)">${p.following_count}</strong> following</div>
          <div><strong style="color:var(--ink)">${p.experience_count}</strong> experience</div>
        </div>
      </div>
    </div>

    <div class="profile-tabs">
      ${tab('posts', 'POSTS', gridIcon())}
      ${tab('experience', 'EXPERIENCE', workIcon())}
      ${tab('education', 'EDUCATION', schoolIcon())}
      ${p.is_me ? tab('saved', 'SAVED', bookmarkIcon()) : ''}
    </div>
    <div id="tab-content"><div class="subtle" style="text-align:center; padding: 40px">Loading…</div></div>
  `;

  document.querySelectorAll('.profile-tab').forEach(t => {
    t.onclick = () => {
      currentTab = t.dataset.tab;
      document.querySelectorAll('.profile-tab').forEach(x => x.classList.toggle('active', x === t));
      loadTab();
    };
  });

  // Action buttons
  const followBtn = document.getElementById('btn-follow');
  if (followBtn) followBtn.onclick = async () => {
    try {
      if (p.i_am_following) await api.del(`/users/${p.id}/follow`);
      else await api.post(`/users/${p.id}/follow`);
      load();
    } catch (e) { toast(e.message); }
  };
  const msgBtn = document.getElementById('btn-message');
  if (msgBtn) msgBtn.onclick = async () => {
    try {
      const conv = await api.startConversation(p.id, null);
      location.href = `dms.html?c=${conv.id}`;
    } catch (e) { toast(e.message); }
  };

  const blockBtn = document.getElementById('btn-block');
  if (blockBtn) blockBtn.onclick = async () => {
    if (!confirm(`Block @${p.username}? Their posts and DMs will be hidden from you.`)) return;
    try { await api.blockUser(p.id); toast('Blocked'); location.href = 'index.html'; }
    catch (e) { toast(e.message); }
  };

  const verifyBtn = document.getElementById('btn-verify');
  if (verifyBtn) verifyBtn.onclick = openVerificationModal;

  // Own-profile edit buttons
  const editBtn = document.getElementById('btn-edit-profile');
  if (editBtn) editBtn.onclick = openEditProfileModal;

  const editSkillsBtn = document.getElementById('btn-edit-skills');
  if (editSkillsBtn) editSkillsBtn.onclick = openEditSkillsModal;

  const otwBtn = document.getElementById('btn-toggle-otw');
  if (otwBtn) otwBtn.onclick = async () => {
    try {
      await api.updateMe({ open_to_work: !p.open_to_work });
      load();
    } catch (e) { toast(e.message); }
  };

  // Avatar upload (only shown on own profile)
  const avatarBtn = document.getElementById('btn-upload-avatar');
  const avatarInput = document.getElementById('avatar-file');
  if (avatarBtn && avatarInput) {
    avatarBtn.onclick = (e) => {
      e.preventDefault();
      if (p.avatar_url) {
        // If already have one, offer change / remove
        showAvatarMenu(avatarInput);
      } else {
        avatarInput.click();
      }
    };
    avatarInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { toast('Please pick an image'); return; }
      if (file.size > 10 * 1024 * 1024) { toast('Image too large — 10 MB max'); return; }
      avatarBtn.disabled = true;
      const originalHtml = avatarBtn.innerHTML;
      avatarBtn.innerHTML = '…';
      try {
        await api.uploadAvatar(file);
        toast('Photo updated');
        await load();  // refresh the whole page so all avatar spots update
      } catch (err) {
        toast('Upload failed: ' + err.message);
        avatarBtn.disabled = false;
        avatarBtn.innerHTML = originalHtml;
      }
    };
  }
}

function showAvatarMenu(fileInput) {
  const items = [
    { label: 'Upload new photo', color: 'var(--brand-1)', act: () => fileInput.click() },
    { label: 'Remove photo', color: 'var(--danger, #ef4444)', act: async () => {
      try { await api.removeAvatar(); toast('Photo removed'); await load(); }
      catch (e) { toast(e.message); }
    }},
    { label: 'Cancel', color: '#262626', act: () => {} },
  ];
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.padding = '0';
  modal.style.maxWidth = '400px';
  for (const it of items) {
    const btn = document.createElement('button');
    btn.textContent = it.label;
    btn.style.cssText = `display:block;width:100%;padding:14px;font-size:14px;font-weight:600;border:none;border-bottom:1px solid var(--divider);background:transparent;cursor:pointer;color:${it.color}`;
    btn.onclick = () => { back.remove(); it.act(); };
    modal.appendChild(btn);
  }
  back.appendChild(modal);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  document.body.appendChild(back);
}

function tab(id, label, icon) {
  return `<button class="profile-tab ${currentTab === id ? 'active' : ''}" data-tab="${id}">${icon} ${label}</button>`;
}

function verifyLabel(kind) {
  return {
    community: '✓ Verified',
    institution: '✓ Institution',
    team: '✓ Bidesiya',
    notable: '🏆 Notable Voice',
  }[kind] || '';
}

// ---------------- Tab loaders ----------------

async function loadTab() {
  const $c = document.getElementById('tab-content');
  $c.innerHTML = '<div class="subtle" style="text-align:center; padding: 40px">Loading…</div>';
  try {
    if (currentTab === 'posts') {
      const posts = await api.get(`/posts?author_id=${profile.id}&limit=60`) || [];
      renderPostGrid($c, posts);
    } else if (currentTab === 'saved') {
      const posts = await api.get(`/posts?only_saved=true&limit=60`) || [];
      renderPostGrid($c, posts);
    } else if (currentTab === 'experience') {
      renderExperience($c);
    } else if (currentTab === 'education') {
      renderEducation($c);
    }
  } catch (e) {
    $c.innerHTML = `<div class="banner banner-error">${escapeHtml(e.message)}</div>`;
  }
}

function renderExperience($c) {
  const html = `
    <div class="section-card">
      <div class="section-title" style="margin-bottom:10px">
        <h2>${workIcon()} Work experience</h2>
        <div class="section-actions">
          ${profile.is_me ? '<button class="btn btn-outline" id="btn-add-exp">+ Add experience</button>' : ''}
        </div>
      </div>
      ${experience.length
        ? experience.map(e => experienceItem(e)).join('')
        : '<div class="empty-section">No work experience yet.</div>'}
    </div>`;
  $c.innerHTML = html;

  const btn = document.getElementById('btn-add-exp');
  if (btn) btn.onclick = () => openExperienceModal();

  $c.querySelectorAll('[data-edit-exp]').forEach(b => {
    b.onclick = () => {
      const id = Number(b.dataset.editExp);
      const item = experience.find(e => e.id === id);
      if (item) openExperienceModal(item);
    };
  });
  $c.querySelectorAll('[data-del-exp]').forEach(b => {
    b.onclick = async () => {
      const id = Number(b.dataset.delExp);
      if (!await confirmModal('Delete this experience?', 'This can’t be undone.')) return;
      try {
        await api.deleteExperience(id);
        experience = experience.filter(e => e.id !== id);
        renderExperience($c);
      } catch (e) { toast(e.message); }
    };
  });
}

function experienceItem(e) {
  const roleInit = (e.role || '?').charAt(0).toUpperCase();
  const dates = fmtRange(e.from_date, e.to_date, e.is_current);
  return `
    <div class="career-item">
      <div class="thumb">${roleInit}</div>
      <div class="body">
        <div class="role">${escapeHtml(e.role)}</div>
        <div class="company">${escapeHtml(e.company)}${e.employment_type ? ' · ' + escapeHtml(e.employment_type) : ''}</div>
        <div class="meta">${dates}${e.city ? ' · ' + escapeHtml(e.city) : ''}</div>
        ${e.description ? `<div class="description">${escapeHtml(e.description)}</div>` : ''}
      </div>
      ${profile.is_me ? `<div class="item-actions">
        <button data-edit-exp="${e.id}">Edit</button>
        <button data-del-exp="${e.id}">Delete</button>
      </div>` : '<div></div>'}
    </div>`;
}

function renderEducation($c) {
  const html = `
    <div class="section-card">
      <div class="section-title" style="margin-bottom:10px">
        <h2>${schoolIcon()} Education</h2>
        <div class="section-actions">
          ${profile.is_me ? '<button class="btn btn-outline" id="btn-add-edu">+ Add education</button>' : ''}
        </div>
      </div>
      ${education.length
        ? education.map(e => educationItem(e)).join('')
        : '<div class="empty-section">No education yet.</div>'}
    </div>`;
  $c.innerHTML = html;

  const btn = document.getElementById('btn-add-edu');
  if (btn) btn.onclick = () => openEducationModal();

  $c.querySelectorAll('[data-edit-edu]').forEach(b => {
    b.onclick = () => {
      const id = Number(b.dataset.editEdu);
      const item = education.find(e => e.id === id);
      if (item) openEducationModal(item);
    };
  });
  $c.querySelectorAll('[data-del-edu]').forEach(b => {
    b.onclick = async () => {
      const id = Number(b.dataset.delEdu);
      if (!await confirmModal('Delete this education entry?', 'This can’t be undone.')) return;
      try {
        await api.deleteEducation(id);
        education = education.filter(e => e.id !== id);
        renderEducation($c);
      } catch (e) { toast(e.message); }
    };
  });
}

function educationItem(e) {
  const initial = (e.institution || '?').charAt(0).toUpperCase();
  const yr = fmtYearRange(e.from_year, e.to_year, e.is_current);
  return `
    <div class="career-item">
      <div class="thumb">${initial}</div>
      <div class="body">
        <div class="role">${escapeHtml(e.institution)}</div>
        <div class="company">${escapeHtml(e.qualification)}${e.field_of_study ? ' — ' + escapeHtml(e.field_of_study) : ''}</div>
        <div class="meta">${yr}${e.city ? ' · ' + escapeHtml(e.city) : ''}${e.grade ? ' · ' + escapeHtml(e.grade) : ''}</div>
        ${e.description ? `<div class="description">${escapeHtml(e.description)}</div>` : ''}
      </div>
      ${profile.is_me ? `<div class="item-actions">
        <button data-edit-edu="${e.id}">Edit</button>
        <button data-del-edu="${e.id}">Delete</button>
      </div>` : '<div></div>'}
    </div>`;
}

function renderPostGrid($c, posts) {
  if (!posts.length) {
    $c.innerHTML = `
      <div style="text-align:center; padding: 60px 20px">
        <div style="width:64px;height:64px;border:2px solid var(--ink);border-radius:50%;margin:0 auto 12px;display:grid;place-items:center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
        </div>
        <h3 style="margin:0 0 4px">No posts yet</h3>
        <p class="subtle">${currentTab === 'saved' ? 'Save posts to see them here.' : profile.is_me ? 'Share your first post from the feed.' : 'This user hasn\'t posted yet.'}</p>
      </div>`;
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'grid-3';
  for (const p of posts) grid.appendChild(gridTile(p));
  $c.innerHTML = '';
  $c.appendChild(grid);
}

function gridTile(p) {
  const el = document.createElement('div');
  el.className = 'grid-item';
  const src = p.image_url
    ? (p.image_url.startsWith('http') ? p.image_url : `${api.base}${p.image_url}`)
    : null;
  if (src) {
    el.innerHTML = `<img src="${src}" alt="" loading="lazy" />
      <div class="overlay"><span>♥ ${p.likes_count}</span><span>💬 ${p.comments_count}</span></div>`;
  } else {
    el.classList.add('text-only');
    el.innerHTML = `<div>${escapeHtml(p.body.slice(0, 140))}${p.body.length > 140 ? '…' : ''}</div>
      <div class="overlay"><span>♥ ${p.likes_count}</span><span>💬 ${p.comments_count}</span></div>`;
  }
  el.onclick = () => toast('Single-post view ships next');
  return el;
}

// ---------------- Edit modals ----------------

function openVerificationModal() {
  showModal('Request verification', `
    <p class="subtle" style="margin: 0 0 12px">Verification tiers: <b>community</b> (JEEVIKA-style vouch), <b>institution</b> (school/college/NGO), <b>team</b> (Bidesiya-run programs).</p>
    <div class="field"><label>Tier</label>
      <select class="input" id="vr-kind">
        <option value="community">Community</option>
        <option value="institution">Institution</option>
        <option value="team">Team</option>
      </select>
    </div>
    <div class="field"><label>Evidence</label>
      <textarea class="input" id="vr-evidence" rows="4" maxlength="2000" placeholder="Who can vouch, what documents, official emails, or references verify this?"></textarea>
    </div>
  `, async () => {
    const kind = document.getElementById('vr-kind').value;
    const evidence = document.getElementById('vr-evidence').value.trim();
    if (evidence.length < 10) { toast('Add a bit more detail'); return false; }
    try {
      await api.requestVerification({ kind, evidence });
      toast('Request submitted — an admin will review it');
      return true;
    } catch (e) { toast(e.message); return false; }
  });
}

function openEditProfileModal() {
  const p = profile;
  const themes = [
    { id: 'chhath',  label: 'Chhath Sunrise',   swatch: 'linear-gradient(135deg, #F43F5E, #F97316, #FBBF24)' },
    { id: 'mithila', label: 'Mithila Alta',     swatch: 'linear-gradient(135deg, #DC2626, #EA580C, #F59E0B)' },
    { id: 'bhojpur', label: 'Bhojpur Indigo',   swatch: 'linear-gradient(135deg, #1E3A8A, #4338CA, #818CF8)' },
    { id: 'magadh',  label: 'Magadh Sandstone', swatch: 'linear-gradient(135deg, #B45309, #EA580C, #FBBF24)' },
    { id: 'anga',    label: 'Anga Manjusha',    swatch: 'linear-gradient(135deg, #F59E0B, #EC4899, #16A34A)' },
  ];
  const themeSwatches = themes.map(t => `
    <label class="theme-swatch ${p.theme === t.id ? 'active' : ''}" data-theme="${t.id}">
      <input type="radio" name="theme" value="${t.id}" ${p.theme === t.id ? 'checked' : ''} hidden />
      <span class="ts-strip" style="background: ${t.swatch}"></span>
      <span class="ts-label">${t.label}</span>
    </label>
  `).join('');

  showModal('Edit profile', `
    <div class="field"><label>Display name</label><input class="input" id="m-name" value="${escapeHtml(p.display_name || '')}" /></div>
    <div class="field"><label>Headline</label><input class="input" id="m-headline" value="${escapeHtml(p.headline || '')}" placeholder="e.g. Construction welder · Siwan → Delhi" maxlength="160" /></div>
    <div class="field"><label>Bio</label><textarea class="input" id="m-bio" rows="3">${escapeHtml(p.bio || '')}</textarea></div>
    <div class="field"><label>Currently in (city)</label><input class="input" id="m-loc" value="${escapeHtml(p.current_location || '')}" placeholder="e.g. Delhi NCR" /></div>
    <div class="field"><label>Home district</label><input class="input" id="m-district" value="${escapeHtml(p.home_district || '')}" /></div>
    <div class="field"><label>Home block</label><input class="input" id="m-block" value="${escapeHtml(p.home_block || '')}" /></div>
    <div class="field"><label>Home village <span class="subtle" style="font-size:11px">(will auto-create a private village channel)</span></label><input class="input" id="m-village" value="${escapeHtml(p.home_village || '')}" /></div>

    <div class="field">
      <label>Default avatar <span class="subtle" style="font-size:11px">(only if you haven't uploaded a photo)</span></label>
      <select class="input" id="m-gender">
        <option value=""       ${!p.gender ? 'selected' : ''}>Show my initials</option>
        <option value="male"   ${p.gender === 'male' ? 'selected' : ''}>Bihari uncle cartoon</option>
        <option value="female" ${p.gender === 'female' ? 'selected' : ''}>Bihari aunty cartoon</option>
        <option value="other"  ${p.gender === 'other' ? 'selected' : ''}>Prefer not to say (initials)</option>
      </select>
    </div>

    <div class="field">
      <label>Regional theme</label>
      <div class="theme-picker">${themeSwatches}</div>
    </div>
  `, async () => {
    const themeChoice = document.querySelector('input[name="theme"]:checked')?.value || p.theme || 'chhath';
    const genderChoice = val('m-gender') || null;
    try {
      await api.updateMe({
        display_name: val('m-name'),
        headline: val('m-headline'),
        bio: val('m-bio'),
        current_location: val('m-loc'),
        home_district: val('m-district'),
        home_block: val('m-block'),
        home_village: val('m-village'),
        gender: genderChoice,
        theme: themeChoice,
      });
      // Apply immediately so the user sees the palette shift on save
      const { applyTheme } = await import('./theme.js');
      applyTheme(themeChoice);
      toast('Saved');
      load();
    } catch (e) { toast(e.message); throw e; }
  });

  // Live preview when the user clicks a theme (before saving)
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.onclick = async () => {
      document.querySelectorAll('.theme-swatch').forEach(x => x.classList.toggle('active', x === el));
      el.querySelector('input').checked = true;
      const { applyTheme } = await import('./theme.js');
      applyTheme(el.dataset.theme);
    };
  });
}

function openEditSkillsModal() {
  const p = profile;
  const initial = (p.skills || []).join(', ');
  showModal('Edit skills', `
    <div class="field">
      <label>Skills — comma separated</label>
      <textarea class="input" id="m-skills" rows="3" placeholder="e.g. Welding, Bhojpuri, Basic English, Site safety">${escapeHtml(initial)}</textarea>
      <div class="subtle" style="margin-top:6px; font-size:12px">Add anything: technical trades, languages, softwares, community work.</div>
    </div>
  `, async () => {
    const skills = val('m-skills').split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);
    try {
      await api.updateMe({ skills });
      toast('Skills saved');
      load();
    } catch (e) { toast(e.message); throw e; }
  });
}

function openExperienceModal(existing = null) {
  const isEdit = !!existing;
  const e = existing || {};
  showModal(isEdit ? 'Edit experience' : 'Add experience', `
    <div class="field"><label>Role / Job title</label><input class="input" id="x-role" value="${escapeHtml(e.role || '')}" placeholder="e.g. Site engineer" /></div>
    <div class="field"><label>Company / Employer</label><input class="input" id="x-company" value="${escapeHtml(e.company || '')}" placeholder="e.g. L&T Construction" /></div>
    <div class="hstack" style="gap:10px">
      <div class="field grow"><label>City</label><input class="input" id="x-city" value="${escapeHtml(e.city || '')}" placeholder="Chennai" /></div>
      <div class="field grow">
        <label>Type</label>
        <select class="input" id="x-type">
          ${['', 'full-time','part-time','contract','daily-wage','apprenticeship'].map(t =>
            `<option value="${t}"${(e.employment_type || '') === t ? ' selected' : ''}>${t || '—'}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="hstack" style="gap:10px">
      <div class="field grow"><label>From</label><input class="input" id="x-from" type="date" value="${e.from_date || ''}" /></div>
      <div class="field grow"><label>To</label><input class="input" id="x-to" type="date" value="${e.to_date || ''}" ${e.is_current ? 'disabled' : ''} /></div>
    </div>
    <div class="field"><label><input type="checkbox" id="x-current" ${e.is_current ? 'checked' : ''} /> I currently work here</label></div>
    <div class="field"><label>Description</label><textarea class="input" id="x-desc" rows="3">${escapeHtml(e.description || '')}</textarea></div>
  `, async () => {
    const body = {
      role: val('x-role'), company: val('x-company'),
      city: val('x-city') || null,
      employment_type: val('x-type') || null,
      from_date: val('x-from'),
      to_date: document.getElementById('x-current').checked ? null : (val('x-to') || null),
      is_current: document.getElementById('x-current').checked,
      description: val('x-desc') || null,
    };
    if (!body.role || !body.company || !body.from_date) { toast('Role, company, from-date required'); throw new Error('validation'); }
    try {
      if (isEdit) {
        const upd = await api.updateExperience(existing.id, body);
        experience = experience.map(x => x.id === upd.id ? upd : x);
      } else {
        const created = await api.addExperience(body);
        experience = [created, ...experience];
      }
      toast(isEdit ? 'Updated' : 'Added');
      currentTab = 'experience';
      render();
      loadTab();
    } catch (e) { toast(e.message); throw e; }
  });
  // Wire "is_current" checkbox to disable "to" field
  const cb = document.getElementById('x-current');
  const to = document.getElementById('x-to');
  cb.onchange = () => { to.disabled = cb.checked; if (cb.checked) to.value = ''; };
}

function openEducationModal(existing = null) {
  const isEdit = !!existing;
  const e = existing || {};
  showModal(isEdit ? 'Edit education' : 'Add education', `
    <div class="field"><label>Institution</label><input class="input" id="e-inst" value="${escapeHtml(e.institution || '')}" placeholder="e.g. Patna University" /></div>
    <div class="field"><label>Qualification / Degree</label><input class="input" id="e-qual" value="${escapeHtml(e.qualification || '')}" placeholder="e.g. B.A. Political Science" /></div>
    <div class="hstack" style="gap:10px">
      <div class="field grow"><label>Field of study</label><input class="input" id="e-field" value="${escapeHtml(e.field_of_study || '')}" placeholder="optional" /></div>
      <div class="field grow"><label>City</label><input class="input" id="e-city" value="${escapeHtml(e.city || '')}" /></div>
    </div>
    <div class="hstack" style="gap:10px">
      <div class="field grow"><label>From year</label><input class="input" id="e-from" type="number" min="1950" max="2100" value="${e.from_year || ''}" placeholder="2019" /></div>
      <div class="field grow"><label>To year</label><input class="input" id="e-to" type="number" min="1950" max="2100" value="${e.to_year || ''}" placeholder="2022" ${e.is_current ? 'disabled' : ''} /></div>
    </div>
    <div class="field"><label><input type="checkbox" id="e-current" ${e.is_current ? 'checked' : ''} /> I'm currently studying here</label></div>
    <div class="field"><label>Grade / Result</label><input class="input" id="e-grade" value="${escapeHtml(e.grade || '')}" placeholder="e.g. First Class, 72%, CGPA 8.4" /></div>
    <div class="field"><label>Description</label><textarea class="input" id="e-desc" rows="2">${escapeHtml(e.description || '')}</textarea></div>
  `, async () => {
    const body = {
      institution: val('e-inst'), qualification: val('e-qual'),
      field_of_study: val('e-field') || null,
      city: val('e-city') || null,
      from_year: val('e-from') ? Number(val('e-from')) : null,
      to_year: document.getElementById('e-current').checked ? null : (val('e-to') ? Number(val('e-to')) : null),
      is_current: document.getElementById('e-current').checked,
      grade: val('e-grade') || null,
      description: val('e-desc') || null,
    };
    if (!body.institution || !body.qualification) { toast('Institution and qualification required'); throw new Error('validation'); }
    try {
      if (isEdit) {
        const upd = await api.updateEducation(existing.id, body);
        education = education.map(x => x.id === upd.id ? upd : x);
      } else {
        const created = await api.addEducation(body);
        education = [created, ...education];
      }
      toast(isEdit ? 'Updated' : 'Added');
      currentTab = 'education';
      render();
      loadTab();
    } catch (e) { toast(e.message); throw e; }
  });
  const cb = document.getElementById('e-current');
  const to = document.getElementById('e-to');
  cb.onchange = () => { to.disabled = cb.checked; if (cb.checked) to.value = ''; };
}

// ---------------- Modal utility ----------------

function showModal(title, bodyHtml, onSave) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal">
      <h2>${title}</h2>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-actions">
        <button class="btn" id="m-cancel">Cancel</button>
        <button class="btn btn-primary" id="m-save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });
  document.getElementById('m-cancel').onclick = () => back.remove();
  document.getElementById('m-save').onclick = async () => {
    const saveBtn = document.getElementById('m-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try { await onSave(); back.remove(); }
    catch { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  };
}

function val(id) { return (document.getElementById(id).value || '').trim(); }

function fmtRange(from, to, isCurrent) {
  if (!from) return '';
  const f = new Date(from).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const t = isCurrent ? 'Present' : (to ? new Date(to).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '');
  return t ? `${f} — ${t}` : f;
}
function fmtYearRange(from, to, isCurrent) {
  if (!from && !to) return '';
  const t = isCurrent ? 'Present' : (to || '');
  return `${from || ''}${t ? ' — ' + t : ''}`;
}

function gridIcon() { return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`; }
function bookmarkIcon() { return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`; }
function workIcon() { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`; }
function schoolIcon() { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l10 6-10 6L2 9z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/></svg>`; }

load();

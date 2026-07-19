// Sahyog — browse crowdfunding campaigns for Bihar civic causes.

import { api } from './api.js';
import { toast, escapeHtml, timeAgo } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('sahyog');

const $grid = document.getElementById('campaigns-grid');
const $catTabs = document.getElementById('cat-tabs');
const $start = document.getElementById('btn-start');
const $mine = document.getElementById('my-campaigns-mini');
const $search = document.getElementById('f-search');
const $district = document.getElementById('f-district');
const $sort = document.getElementById('f-sort');

const CAT_ICONS = {
  'village-infra': '🚰',
  'education': '📚',
  'medical': '🏥',
  'cultural': '🎭',
  'disaster': '🌊',
  'livelihood': '💼',
  'sports': '🏏',
  'environment': '🌳',
  'community': '🤝',
  'other': '📦',
};

const CAT_LABEL = {
  'village-infra': 'Village infra',
  'education': 'Education',
  'medical': 'Medical',
  'cultural': 'Culture',
  'disaster': 'Disaster relief',
  'livelihood': 'Livelihood',
  'sports': 'Sports',
  'environment': 'Environment',
  'community': 'Community',
  'other': 'Other',
};

let currentCat = '';
let debounceTimer;

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  loadGrid();
  loadMine();

  $catTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.scat');
    if (!btn) return;
    currentCat = btn.dataset.cat;
    $catTabs.querySelectorAll('.scat').forEach(x => x.classList.toggle('active', x === btn));
    loadGrid();
  });

  [$search, $district].forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadGrid, 300);
    });
  });
  $sort.addEventListener('change', loadGrid);

  $start.onclick = () => openCreateModal();
}

async function loadGrid() {
  $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">Loading…</div>';
  try {
    const params = {
      category: currentCat,
      q: $search.value.trim(),
      district: $district.value.trim(),
      sort: $sort.value,
    };
    const list = await api.listCampaigns(params);
    if (!list.length) {
      $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1; padding: 40px 0; text-align: center">No campaigns match these filters right now.</div>';
      return;
    }
    $grid.innerHTML = '';
    for (const c of list) $grid.appendChild(renderCard(c));
  } catch (e) {
    $grid.innerHTML = `<div class="banner banner-error" style="grid-column: 1/-1">${escapeHtml(e.message)}</div>`;
  }
}

function renderCard(c) {
  const card = document.createElement('a');
  card.className = 'campaign-card';
  card.href = `campaign.html?id=${c.id}`;
  const icon = CAT_ICONS[c.category] || '🤝';
  const daysTag = c.days_left !== null && c.days_left !== undefined
    ? (c.days_left <= 3 ? `<span class="cc-urgent">${c.days_left} days left</span>` : `<span class="cc-days">${c.days_left} days left</span>`)
    : '';
  const pct = Math.min(c.percent_raised || 0, 100);
  card.innerHTML = `
    <div class="cc-cover">
      <span class="cc-icon">${icon}</span>
      ${c.is_featured ? '<span class="cc-featured">⭐ Featured</span>' : ''}
    </div>
    <div class="cc-body">
      <div class="cc-cat">${escapeHtml(CAT_LABEL[c.category] || c.category)}</div>
      <div class="cc-title">${escapeHtml(c.title)}</div>
      <div class="cc-desc">${escapeHtml(c.description)}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
      <div class="cc-progress-row">
        <span><b>₹${Math.round(c.current_amount_raised).toLocaleString('en-IN')}</b> <span class="subtle">of ₹${Math.round(c.target_amount).toLocaleString('en-IN')}</span></span>
        <span>${pct}%</span>
      </div>
      <div class="cc-meta">
        📍 ${escapeHtml(c.location_district)}${c.location_block ? ', ' + escapeHtml(c.location_block) : ''}
        · ${c.supporter_count} supporter${c.supporter_count === 1 ? '' : 's'}
        ${daysTag ? ' · ' + daysTag : ''}
      </div>
    </div>
  `;
  return card;
}

async function loadMine() {
  try {
    const list = await api.myCampaigns();
    if (!list.length) {
      $mine.innerHTML = '<div class="subtle" style="font-size: 12px">You haven\'t started a campaign yet.</div>';
      return;
    }
    $mine.innerHTML = list.slice(0, 5).map(c => `
      <a class="mini-listing" href="campaign.html?id=${c.id}">
        <div class="mli-title">${escapeHtml(c.title)}</div>
        <div class="mli-meta">
          ${statusPill(c.status)}
          · ₹${Math.round(c.current_amount_raised).toLocaleString('en-IN')} raised
        </div>
      </a>
    `).join('');
  } catch { $mine.innerHTML = ''; }
}

function statusPill(status) {
  if (status === 'active') return '<span class="mli-active">Active</span>';
  if (status === 'pending') return '<span class="mli-paused">Pending review</span>';
  if (status === 'rejected') return '<span class="mli-sold">Rejected</span>';
  if (status === 'completed') return '<span class="mli-active">Completed</span>';
  if (status === 'closed') return '<span class="mli-sold">Closed</span>';
  return `<span class="mli-active">${escapeHtml(status)}</span>`;
}

// ---------------------------- Create modal ----------------------------

function openCreateModal() {
  const CATS = [
    ['village-infra', '🚰 Village infra'],
    ['education', '📚 Education'],
    ['medical', '🏥 Medical'],
    ['cultural', '🎭 Cultural'],
    ['disaster', '🌊 Disaster relief'],
    ['livelihood', '💼 Livelihood / SHG'],
    ['sports', '🏏 Sports / youth'],
    ['environment', '🌳 Environment'],
    ['community', '🤝 Community welfare'],
    ['other', '📦 Other'],
  ];

  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 620px">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px">
        <h2 style="margin:0">Start a Sahyog campaign</h2>
        <button class="btn" id="sy-close">✕</button>
      </div>

      <div class="banner banner-info" style="margin-bottom: 16px">
        <b>Money never touches Bidesiya.</b> Supporters pay you directly on the UPI ID you provide.
        Every new campaign is reviewed by admin (usually within 24 hours).
      </div>

      <div class="field"><label>Title</label>
        <input class="input" id="sy-title" maxlength="200" placeholder="e.g. Fix the broken hand-pump in Bariyat village" /></div>

      <div class="field"><label>One-line description (shows on cards)</label>
        <input class="input" id="sy-desc" maxlength="300" placeholder="e.g. Repair estimate is Rs 8,000. 40 families use this pump." /></div>

      <div class="field"><label>Category</label>
        <select class="input" id="sy-cat">${CATS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>

      <div class="field"><label>The full story (why it matters, cost breakdown, proof of use)</label>
        <textarea class="input" id="sy-story" rows="8" maxlength="6000" placeholder="Explain the need in detail. Include an itemized cost breakdown. Mention how supporters will see proof of use (photos, receipts, updates)."></textarea></div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin-bottom: 12px">
        <div class="field"><label>Target amount (₹)</label>
          <input class="input" id="sy-target" type="number" min="500" max="500000" placeholder="e.g. 8000" /></div>
        <div class="field"><label>Deadline</label>
          <input class="input" id="sy-deadline" type="date" /></div>
        <div class="field"><label>District</label>
          <input class="input" id="sy-district" placeholder="e.g. Kishanganj" /></div>
        <div class="field"><label>Block / village (optional)</label>
          <input class="input" id="sy-block" /></div>
      </div>

      <div class="field"><label>Who benefits?</label>
        <select class="input" id="sy-btype">
          <option value="community">A community / group</option>
          <option value="self">Myself</option>
          <option value="other">Someone else</option>
        </select>
      </div>
      <div class="field" id="sy-bname-wrap" hidden>
        <label>Beneficiary name / description</label>
        <input class="input" id="sy-bname" maxlength="120" placeholder="e.g. Sukhiya Devi, 62 (my mother-in-law)" />
      </div>

      <div class="field"><label>Your UPI ID (money comes here)</label>
        <input class="input" id="sy-upi" maxlength="64" placeholder="e.g. yourname@ybl or 9876543210@paytm" /></div>

      <div class="field"><label>Bank details (optional)</label>
        <textarea class="input" id="sy-bank" rows="2" maxlength="500" placeholder="A/c number, IFSC — shown to supporters who prefer bank transfer"></textarea></div>

      <div class="field"><label><input type="checkbox" id="sy-consent" /> I have consent from the beneficiary (if applicable) and confirm this campaign is genuine. False campaigns will be permanently banned.</label></div>

      <button class="btn btn-primary btn-block" id="sy-submit">Submit for review</button>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#sy-close').onclick = () => back.remove();

  back.querySelector('#sy-btype').onchange = (e) => {
    back.querySelector('#sy-bname-wrap').hidden = e.target.value === 'community';
  };

  back.querySelector('#sy-submit').onclick = async (e) => {
    const btn = e.currentTarget;
    if (!back.querySelector('#sy-consent').checked) {
      toast('Please confirm the consent checkbox');
      return;
    }
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const deadlineVal = back.querySelector('#sy-deadline').value;
      const payload = {
        title: back.querySelector('#sy-title').value.trim(),
        description: back.querySelector('#sy-desc').value.trim(),
        story: back.querySelector('#sy-story').value.trim(),
        category: back.querySelector('#sy-cat').value,
        target_amount: parseFloat(back.querySelector('#sy-target').value) || 0,
        deadline: deadlineVal ? new Date(deadlineVal).toISOString() : null,
        beneficiary_type: back.querySelector('#sy-btype').value,
        beneficiary_name: back.querySelector('#sy-bname').value.trim() || null,
        location_district: back.querySelector('#sy-district').value.trim(),
        location_block: back.querySelector('#sy-block').value.trim() || null,
        upi_id: back.querySelector('#sy-upi').value.trim(),
        bank_details: back.querySelector('#sy-bank').value.trim() || null,
      };
      if (payload.title.length < 8) throw new Error('Title needs at least 8 characters');
      if (payload.description.length < 20) throw new Error('Description needs at least 20 characters');
      if (payload.story.length < 80) throw new Error('Story needs at least 80 characters — please give supporters enough detail');
      if (!payload.target_amount || payload.target_amount < 500) throw new Error('Target must be at least ₹500');
      if (payload.target_amount > 500000) throw new Error('Target cannot exceed ₹5,00,000 (contact admin for exceptions)');
      if (!payload.location_district) throw new Error('District is required');
      if (!payload.upi_id || payload.upi_id.length < 4) throw new Error('A valid UPI ID is required');

      const created = await api.createCampaign(payload);
      toast('Submitted — admin will review shortly');
      back.remove();
      location.href = `campaign.html?id=${created.id}`;
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = 'Submit for review';
    }
  };
}

boot();

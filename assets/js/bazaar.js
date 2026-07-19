// Bazaar — browse marketplace, sell your own goods.

import { api } from './api.js';
import { toast, escapeHtml, timeAgo } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('bazaar');

const $grid = document.getElementById('listings-grid');
const $catTabs = document.getElementById('cat-tabs');
const $sell = document.getElementById('btn-sell');
const $mine = document.getElementById('my-listings-mini');

const $search = document.getElementById('f-search');
const $district = document.getElementById('f-district');
const $maxPrice = document.getElementById('f-max-price');

let currentCat = '';
let debounceTimer;

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  loadGrid();
  loadMine();

  $catTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.bcat');
    if (!btn) return;
    currentCat = btn.dataset.cat;
    $catTabs.querySelectorAll('.bcat').forEach(x => x.classList.toggle('active', x === btn));
    loadGrid();
  });

  [$search, $district, $maxPrice].forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadGrid, 300);
    });
  });

  $sell.onclick = () => openCreateModal();
}

async function loadGrid() {
  $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1">Loading…</div>';
  try {
    const params = {
      category: currentCat,
      q: $search.value.trim(),
      district: $district.value.trim(),
      max_price: $maxPrice.value.trim() ? parseFloat($maxPrice.value) : '',
    };
    const list = await api.listListings(params);
    if (!list.length) {
      $grid.innerHTML = '<div class="subtle" style="grid-column: 1/-1; padding: 40px 0; text-align: center">No listings match these filters.</div>';
      return;
    }
    $grid.innerHTML = '';
    for (const l of list) $grid.appendChild(renderCard(l));
  } catch (e) {
    $grid.innerHTML = `<div class="banner banner-error" style="grid-column: 1/-1">${e.message}</div>`;
  }
}

function renderCard(l) {
  const card = document.createElement('a');
  card.className = 'listing-card';
  card.href = `listing.html?id=${l.id}`;
  const priceLabel = l.price_unit === 'fixed'
    ? `₹${l.price.toLocaleString()}`
    : `₹${l.price.toLocaleString()} ${escapeHtml(l.price_unit.replace('per-', '/'))}`;
  const catIcon = { 'farm-produce':'🌾','handicraft':'🎨','home-food':'🥘','livestock':'🐄','vehicles':'🚲','electronics':'📱','furniture':'🪑','books':'📚','clothes':'👗','services':'🔧','property':'🏘️','other':'📦' }[l.category] || '📦';
  card.innerHTML = `
    <div class="lc-cover">
      <span class="lc-icon">${catIcon}</span>
      ${l.is_delivery_available ? '<span class="lc-delivery">🚚 Delivers</span>' : ''}
    </div>
    <div class="lc-body">
      <div class="lc-title">${escapeHtml(l.title)}</div>
      <div class="lc-price">${priceLabel}${l.is_negotiable ? ' <span class="lc-neg">· Negotiable</span>' : ''}</div>
      <div class="lc-meta">
        📍 ${escapeHtml(l.location_district)}${l.location_block ? ', ' + escapeHtml(l.location_block) : ''}
      </div>
      <div class="lc-seller">
        ${avatarHtml({ display_name: l.seller_display_name, username: l.seller_username, avatar_url: l.seller_avatar_url, verification_kind: l.seller_verification_kind }, 20, { className: 'lc-avatar' })}
        <span>${escapeHtml(l.seller_display_name || l.seller_username || 'user')}</span>
        <span class="subtle">· ${timeAgo(l.created_at)}</span>
      </div>
    </div>
  `;
  return card;
}

async function loadMine() {
  try {
    const list = await api.myListings();
    if (!list.length) {
      $mine.innerHTML = '<div class="subtle" style="font-size: 12px">You haven\'t listed anything yet.</div>';
      return;
    }
    $mine.innerHTML = list.slice(0, 5).map(l => `
      <a class="mini-listing" href="listing.html?id=${l.id}">
        <div class="mli-title">${escapeHtml(l.title)}</div>
        <div class="mli-meta">
          ${l.status === 'active' ? '<span class="mli-active">Active</span>' : `<span class="mli-${l.status}">${escapeHtml(l.status)}</span>`}
          · ${l.view_count} views
        </div>
      </a>
    `).join('');
  } catch { $mine.innerHTML = ''; }
}

// ---------------------------- Create listing modal ----------------------------

function openCreateModal() {
  const CATEGORIES = [
    ['farm-produce','🌾 Farm produce'],
    ['handicraft','🎨 Handicraft'],
    ['home-food','🥘 Home food'],
    ['livestock','🐄 Livestock'],
    ['vehicles','🚲 Vehicle'],
    ['electronics','📱 Electronics'],
    ['furniture','🪑 Furniture'],
    ['books','📚 Books'],
    ['clothes','👗 Clothes'],
    ['services','🔧 Service'],
    ['property','🏘️ Property'],
    ['other','📦 Other'],
  ];
  const UNITS = ['per-kg','per-piece','per-dozen','per-litre','per-quintal','per-month','per-hour','per-day','fixed'];

  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 560px">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px">
        <h2 style="margin:0">List something to sell</h2>
        <button class="btn" id="bz-close">✕</button>
      </div>
      <div class="field"><label>Title</label>
        <input class="input" id="bz-title" maxlength="200" placeholder="e.g. Fresh litchi from Muzaffarpur" /></div>
      <div class="field"><label>Category</label>
        <select class="input" id="bz-cat">${CATEGORIES.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label>
        <textarea class="input" id="bz-desc" rows="4" maxlength="4000" placeholder="What you're selling. Quality, quantity, delivery — the more detail, the more trust."></textarea></div>

      <div class="rw-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin-bottom: 12px">
        <div class="field"><label>Price (₹)</label>
          <input class="input" id="bz-price" type="number" min="0" placeholder="e.g. 250" /></div>
        <div class="field"><label>Price unit</label>
          <select class="input" id="bz-unit">${UNITS.map(u => `<option value="${u}">${u}</option>`).join('')}</select></div>
        <div class="field"><label>Location district</label>
          <input class="input" id="bz-district" placeholder="e.g. Muzaffarpur" /></div>
        <div class="field"><label>Block / area (optional)</label>
          <input class="input" id="bz-block" /></div>
        <div class="field"><label>Quantity available</label>
          <input class="input" id="bz-qty" placeholder="e.g. 300 kg / 5 pieces" /></div>
        <div class="field"><label>Quality grade (optional)</label>
          <input class="input" id="bz-grade" placeholder="e.g. Grade A, organic, GI-tagged" /></div>
      </div>

      <div class="field"><label><input type="checkbox" id="bz-neg" checked /> Price is negotiable</label></div>
      <div class="field"><label><input type="checkbox" id="bz-delivery" /> Delivery available</label></div>
      <div class="field" id="bz-delivery-areas" hidden>
        <label>Delivery areas</label>
        <input class="input" id="bz-delivery-input" placeholder="e.g. All Bihar, Patna only, pan-India" />
      </div>

      <div class="field"><label>Buyers contact you via</label>
        <select class="input" id="bz-contact">
          <option value="dm">Bidesiya messages (safest)</option>
          <option value="both">Messages + phone</option>
          <option value="phone">Phone only</option>
        </select>
      </div>
      <div class="field" id="bz-phone-wrap" hidden>
        <label>Phone number</label>
        <input class="input" id="bz-phone" placeholder="10-digit mobile" maxlength="10" />
      </div>

      <button class="btn btn-primary btn-block" id="bz-submit">Publish listing</button>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#bz-close').onclick = () => back.remove();

  back.querySelector('#bz-delivery').onchange = (e) => {
    back.querySelector('#bz-delivery-areas').hidden = !e.target.checked;
  };
  back.querySelector('#bz-contact').onchange = (e) => {
    back.querySelector('#bz-phone-wrap').hidden = e.target.value === 'dm';
  };

  back.querySelector('#bz-submit').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      const payload = {
        title: back.querySelector('#bz-title').value.trim(),
        description: back.querySelector('#bz-desc').value.trim(),
        category: back.querySelector('#bz-cat').value,
        price: parseFloat(back.querySelector('#bz-price').value) || 0,
        price_unit: back.querySelector('#bz-unit').value,
        location_district: back.querySelector('#bz-district').value.trim(),
        location_block: back.querySelector('#bz-block').value.trim() || null,
        quantity_available: back.querySelector('#bz-qty').value.trim() || null,
        quality_grade: back.querySelector('#bz-grade').value.trim() || null,
        is_negotiable: back.querySelector('#bz-neg').checked,
        is_delivery_available: back.querySelector('#bz-delivery').checked,
        delivery_areas: back.querySelector('#bz-delivery-input').value.trim() || null,
        contact_via: back.querySelector('#bz-contact').value,
        phone_number: back.querySelector('#bz-phone').value.trim() || null,
      };
      if (!payload.title || payload.title.length < 3) throw new Error('Title is required');
      if (!payload.description || payload.description.length < 10) throw new Error('Description too short');
      if (!payload.location_district) throw new Error('District is required');
      if (payload.contact_via !== 'dm' && !payload.phone_number) throw new Error('Phone number required for that contact option');

      const created = await api.createListing(payload);
      toast('Listing published');
      back.remove();
      location.href = `listing.html?id=${created.id}`;
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = 'Publish listing';
    }
  };
}

boot();

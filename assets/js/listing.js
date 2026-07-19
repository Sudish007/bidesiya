// Single listing detail page — Bazaar (Round 11).

import { api } from './api.js';
import { toast, escapeHtml, timeAgo } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('bazaar');

const params = new URLSearchParams(location.search);
const listingId = parseInt(params.get('id'), 10);

const $view = document.getElementById('listing-view');
const $similar = document.getElementById('similar-list');

const CAT_ICONS = {
  'farm-produce': '🌾',
  'handicraft': '🎨',
  'home-food': '🥘',
  'livestock': '🐄',
  'vehicles': '🚲',
  'electronics': '📱',
  'furniture': '🪑',
  'books': '📚',
  'clothes': '👗',
  'services': '🔧',
  'property': '🏘️',
  'other': '📦',
};

const CAT_LABELS = {
  'farm-produce': 'Farm produce',
  'handicraft': 'Handicraft',
  'home-food': 'Home food',
  'livestock': 'Livestock',
  'vehicles': 'Vehicle',
  'electronics': 'Electronics',
  'furniture': 'Furniture',
  'books': 'Books',
  'clothes': 'Clothes',
  'services': 'Service',
  'property': 'Property',
  'other': 'Other',
};

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  if (!listingId || Number.isNaN(listingId)) {
    $view.innerHTML = '<div class="banner banner-error">No listing specified.</div>';
    return;
  }
  try {
    const l = await api.getListing(listingId);
    document.title = `${l.title} · Bidesiya`;
    render(l);
    loadSimilar(l);
  } catch (e) {
    $view.innerHTML = `<div class="banner banner-error">${escapeHtml(e.message)}</div>`;
  }
}

function priceLabel(l) {
  if (l.price_unit === 'fixed') return `₹${l.price.toLocaleString()}`;
  const unit = l.price_unit.replace('per-', '/');
  return `₹${l.price.toLocaleString()} <span class="lh-unit">${escapeHtml(unit)}</span>`;
}

function render(l) {
  const isMine = api.userId === l.seller_id;
  const icon = CAT_ICONS[l.category] || '📦';
  const catLabel = CAT_LABELS[l.category] || l.category;

  const statusPill =
    l.status === 'active' ? '<span class="mli-active">● Active</span>'
    : l.status === 'sold' ? '<span class="mli-sold">● Sold</span>'
    : l.status === 'paused' ? '<span class="mli-paused">● Paused</span>'
    : `<span class="mli-active">${escapeHtml(l.status)}</span>`;

  const showPhone = !isMine && (l.contact_via === 'phone' || l.contact_via === 'both') && l.phone_number;

  $view.innerHTML = `
    <header class="listing-hero">
      <div class="lh-cover">
        <span class="lh-icon">${icon}</span>
        ${l.is_delivery_available ? '<span class="lh-delivery">🚚 Delivers</span>' : ''}
      </div>
      <div class="lh-body">
        <div class="lh-cat">${escapeHtml(catLabel)}${l.subcategory ? ' · ' + escapeHtml(l.subcategory) : ''}</div>
        <h1 class="lh-title">${escapeHtml(l.title)}</h1>
        <div class="lh-price">${priceLabel(l)}${l.is_negotiable ? ' <span class="lc-neg">· Negotiable</span>' : ''}</div>
        <div class="lh-meta">
          📍 ${escapeHtml(l.location_district)}${l.location_block ? ', ' + escapeHtml(l.location_block) : ''}
          ${l.location_pincode ? ' · ' + escapeHtml(l.location_pincode) : ''}
          · ${timeAgo(l.created_at)}
          · ${l.view_count} view${l.view_count === 1 ? '' : 's'}
        </div>
        <div class="lh-status">${statusPill}</div>
      </div>
    </header>

    <div class="listing-description">${escapeHtml(l.description).replace(/\n/g, '<br>')}</div>

    <div class="listing-info-grid">
      ${l.quantity_available ? `
        <div class="di-cell">
          <div class="di-label">Quantity available</div>
          <div class="di-value">${escapeHtml(l.quantity_available)}</div>
        </div>` : ''}
      ${l.quality_grade ? `
        <div class="di-cell">
          <div class="di-label">Quality</div>
          <div class="di-value">${escapeHtml(l.quality_grade)}</div>
        </div>` : ''}
      ${l.is_delivery_available ? `
        <div class="di-cell di-full">
          <div class="di-label">Delivery</div>
          <div class="di-value">🚚 ${escapeHtml(l.delivery_areas || 'Available — ask seller for details')}</div>
        </div>` : `
        <div class="di-cell di-full">
          <div class="di-label">Delivery</div>
          <div class="di-value">Pickup only</div>
        </div>`}
    </div>

    <div class="seller-card">
      <div class="sc-heading">Seller</div>
      <div class="sc-row">
        ${avatarHtml({
          display_name: l.seller_display_name,
          username: l.seller_username,
          avatar_url: l.seller_avatar_url,
          verification_kind: l.seller_verification_kind,
        }, 48, { className: 'sc-avatar' })}
        <div class="sc-info">
          <div class="sc-name">${escapeHtml(l.seller_display_name || l.seller_username || 'user')}</div>
          <div class="sc-handle">@${escapeHtml(l.seller_username || '')}</div>
        </div>
        <a class="btn btn-outline" href="profile.html?id=${l.seller_id}">View profile</a>
      </div>
    </div>

    <div class="listing-actions" id="listing-actions"></div>
  `;

  const $actions = document.getElementById('listing-actions');
  if (isMine) {
    $actions.innerHTML = `
      <button class="btn btn-primary" id="lst-edit">✎ Edit</button>
      <button class="btn btn-outline" id="lst-status">${l.status === 'active' ? '⏸ Pause' : l.status === 'paused' ? '▶ Reactivate' : '✓ Mark active'}</button>
      <button class="btn btn-outline" id="lst-sold">${l.status === 'sold' ? '↩ Unmark sold' : '💰 Mark as sold'}</button>
      <button class="btn btn-outline" id="lst-delete" style="color: var(--danger, #E11D48)">🗑 Delete</button>
    `;
    document.getElementById('lst-edit').onclick = () => openEditModal(l);
    document.getElementById('lst-status').onclick = () => togglePause(l);
    document.getElementById('lst-sold').onclick = () => toggleSold(l);
    document.getElementById('lst-delete').onclick = () => confirmDelete(l);
  } else {
    const canDm = l.contact_via === 'dm' || l.contact_via === 'both';
    $actions.innerHTML = `
      ${canDm ? `<button class="btn btn-primary" id="lst-message">💬 Message seller</button>` : ''}
      ${showPhone ? `<a class="btn btn-outline" href="tel:${escapeHtml(l.phone_number)}">📞 ${escapeHtml(l.phone_number)}</a>` : ''}
      <a class="btn btn-outline" href="bazaar.html">← All listings</a>
    `;
    if (canDm) {
      document.getElementById('lst-message').onclick = () => messageSeller(l);
    }
  }
}

async function messageSeller(l) {
  const btn = document.getElementById('lst-message');
  btn.disabled = true; btn.textContent = 'Opening chat…';
  try {
    const opener = `Hi, about your listing: ${l.title}`;
    const conv = await api.startConversation(l.seller_id, opener);
    location.href = `dms.html?c=${conv.id}`;
  } catch (e) {
    toast(e.message);
    btn.disabled = false; btn.textContent = '💬 Message seller';
  }
}

async function togglePause(l) {
  const newStatus = l.status === 'paused' ? 'active' : 'paused';
  try {
    await api.updateListing(l.id, { status: newStatus });
    toast(newStatus === 'paused' ? 'Listing paused' : 'Listing reactivated');
    location.reload();
  } catch (e) { toast(e.message); }
}

async function toggleSold(l) {
  const newStatus = l.status === 'sold' ? 'active' : 'sold';
  try {
    await api.updateListing(l.id, { status: newStatus });
    toast(newStatus === 'sold' ? 'Marked as sold — congrats!' : 'Marked active again');
    location.reload();
  } catch (e) { toast(e.message); }
}

async function confirmDelete(l) {
  if (!confirm(`Delete "${l.title}"? This cannot be undone.`)) return;
  try {
    await api.deleteListing(l.id);
    toast('Listing deleted');
    location.href = 'bazaar.html';
  } catch (e) { toast(e.message); }
}

async function loadSimilar(current) {
  try {
    const [byCat, byDistrict] = await Promise.all([
      api.listListings({ category: current.category, limit: 8 }).catch(() => []),
      api.listListings({ district: current.location_district, limit: 8 }).catch(() => []),
    ]);
    const seen = new Set([current.id]);
    const combined = [];
    for (const l of [...byCat, ...byDistrict]) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      combined.push(l);
      if (combined.length >= 5) break;
    }
    if (!combined.length) {
      $similar.innerHTML = '<div class="subtle">Nothing else to show yet.</div>';
      return;
    }
    $similar.innerHTML = combined.map(l => {
      const icon = CAT_ICONS[l.category] || '📦';
      const pr = l.price_unit === 'fixed' ? `₹${l.price.toLocaleString()}` : `₹${l.price.toLocaleString()} ${l.price_unit.replace('per-', '/')}`;
      return `
        <a class="trend-row" href="listing.html?id=${l.id}">
          <div class="trend-tag">${icon} ${escapeHtml(l.title)}</div>
          <div class="trend-meta">${escapeHtml(pr)} · ${escapeHtml(l.location_district)}</div>
        </a>
      `;
    }).join('');
  } catch { $similar.innerHTML = ''; }
}

// ---------------------------- Edit modal ----------------------------

function openEditModal(l) {
  const CATEGORIES = [
    ['farm-produce', '🌾 Farm produce'],
    ['handicraft', '🎨 Handicraft'],
    ['home-food', '🥘 Home food'],
    ['livestock', '🐄 Livestock'],
    ['vehicles', '🚲 Vehicle'],
    ['electronics', '📱 Electronics'],
    ['furniture', '🪑 Furniture'],
    ['books', '📚 Books'],
    ['clothes', '👗 Clothes'],
    ['services', '🔧 Service'],
    ['property', '🏘️ Property'],
    ['other', '📦 Other'],
  ];
  const UNITS = ['per-kg', 'per-piece', 'per-dozen', 'per-litre', 'per-quintal', 'per-month', 'per-hour', 'per-day', 'fixed'];

  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 560px">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px">
        <h2 style="margin:0">Edit listing</h2>
        <button class="btn" id="lz-close">✕</button>
      </div>
      <div class="field"><label>Title</label>
        <input class="input" id="lz-title" maxlength="200" value="${escapeHtml(l.title)}" /></div>
      <div class="field"><label>Category</label>
        <select class="input" id="lz-cat">${CATEGORIES.map(([v, la]) => `<option value="${v}"${v === l.category ? ' selected' : ''}>${la}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label>
        <textarea class="input" id="lz-desc" rows="4" maxlength="4000">${escapeHtml(l.description)}</textarea></div>

      <div class="rw-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin-bottom: 12px">
        <div class="field"><label>Price (₹)</label>
          <input class="input" id="lz-price" type="number" min="0" value="${l.price}" /></div>
        <div class="field"><label>Price unit</label>
          <select class="input" id="lz-unit">${UNITS.map(u => `<option value="${u}"${u === l.price_unit ? ' selected' : ''}>${u}</option>`).join('')}</select></div>
        <div class="field"><label>Location district</label>
          <input class="input" id="lz-district" value="${escapeHtml(l.location_district || '')}" /></div>
        <div class="field"><label>Block / area</label>
          <input class="input" id="lz-block" value="${escapeHtml(l.location_block || '')}" /></div>
        <div class="field"><label>Quantity available</label>
          <input class="input" id="lz-qty" value="${escapeHtml(l.quantity_available || '')}" /></div>
        <div class="field"><label>Quality grade</label>
          <input class="input" id="lz-grade" value="${escapeHtml(l.quality_grade || '')}" /></div>
      </div>

      <div class="field"><label><input type="checkbox" id="lz-neg"${l.is_negotiable ? ' checked' : ''} /> Price is negotiable</label></div>
      <div class="field"><label><input type="checkbox" id="lz-delivery"${l.is_delivery_available ? ' checked' : ''} /> Delivery available</label></div>
      <div class="field" id="lz-delivery-areas"${l.is_delivery_available ? '' : ' hidden'}>
        <label>Delivery areas</label>
        <input class="input" id="lz-delivery-input" value="${escapeHtml(l.delivery_areas || '')}" />
      </div>

      <div class="field"><label>Buyers contact you via</label>
        <select class="input" id="lz-contact">
          <option value="dm"${l.contact_via === 'dm' ? ' selected' : ''}>Bidesiya messages (safest)</option>
          <option value="both"${l.contact_via === 'both' ? ' selected' : ''}>Messages + phone</option>
          <option value="phone"${l.contact_via === 'phone' ? ' selected' : ''}>Phone only</option>
        </select>
      </div>
      <div class="field" id="lz-phone-wrap"${l.contact_via === 'dm' ? ' hidden' : ''}>
        <label>Phone number</label>
        <input class="input" id="lz-phone" maxlength="10" value="${escapeHtml(l.phone_number || '')}" />
      </div>

      <button class="btn btn-primary btn-block" id="lz-submit">Save changes</button>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#lz-close').onclick = () => back.remove();

  back.querySelector('#lz-delivery').onchange = (e) => {
    back.querySelector('#lz-delivery-areas').hidden = !e.target.checked;
  };
  back.querySelector('#lz-contact').onchange = (e) => {
    back.querySelector('#lz-phone-wrap').hidden = e.target.value === 'dm';
  };

  back.querySelector('#lz-submit').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const payload = {
        title: back.querySelector('#lz-title').value.trim(),
        description: back.querySelector('#lz-desc').value.trim(),
        category: back.querySelector('#lz-cat').value,
        price: parseFloat(back.querySelector('#lz-price').value) || 0,
        price_unit: back.querySelector('#lz-unit').value,
        location_district: back.querySelector('#lz-district').value.trim(),
        location_block: back.querySelector('#lz-block').value.trim() || null,
        quantity_available: back.querySelector('#lz-qty').value.trim() || null,
        quality_grade: back.querySelector('#lz-grade').value.trim() || null,
        is_negotiable: back.querySelector('#lz-neg').checked,
        is_delivery_available: back.querySelector('#lz-delivery').checked,
        delivery_areas: back.querySelector('#lz-delivery-input').value.trim() || null,
        contact_via: back.querySelector('#lz-contact').value,
        phone_number: back.querySelector('#lz-phone').value.trim() || null,
      };
      if (!payload.title || payload.title.length < 3) throw new Error('Title is required');
      if (!payload.description || payload.description.length < 10) throw new Error('Description too short');
      if (!payload.location_district) throw new Error('District is required');
      if (payload.contact_via !== 'dm' && !payload.phone_number) throw new Error('Phone required for that contact option');

      await api.updateListing(l.id, payload);
      toast('Listing updated');
      back.remove();
      location.reload();
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = 'Save changes';
    }
  };
}

boot();

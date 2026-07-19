// Events browse page — Bihar's cultural calendar.

import { api } from './api.js';
import { toast, escapeHtml } from './ui.js';
import { mountShell } from './shell.js';

mountShell('events');

const $list = document.getElementById('events-list');
const $tabs = document.getElementById('event-tabs');
const $newBtn = document.getElementById('btn-new-event');

let currentKind = '';
let all = [];

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  await load();
  $tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    currentKind = btn.dataset.kind;
    $tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
    render();
  });
  $newBtn.onclick = openCreator;
}

async function load() {
  $list.innerHTML = '<div class="subtle" style="padding: 20px">Loading…</div>';
  try {
    all = await api.listEvents({ upcoming: true, limit: 100 }) || [];
    render();
  } catch (e) {
    $list.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function render() {
  const list = currentKind ? all.filter(e => e.kind === currentKind) : all;
  if (!list.length) {
    $list.innerHTML = '<div class="subtle" style="padding: 40px; text-align: center">No upcoming events in this category.</div>';
    return;
  }
  // Group by month for readability
  const byMonth = new Map();
  for (const e of list) {
    const key = new Date(e.starts_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(e);
  }
  $list.innerHTML = '';
  for (const [month, evs] of byMonth) {
    const h = document.createElement('h3');
    h.className = 'events-month';
    h.textContent = month;
    $list.appendChild(h);
    for (const e of evs) $list.appendChild(renderCard(e));
  }
}

function renderCard(e) {
  const card = document.createElement('article');
  card.className = 'event-card';
  const starts = new Date(e.starts_at);
  const day = starts.getDate();
  const monthShort = starts.toLocaleDateString(undefined, { month: 'short' });
  const time = starts.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  card.innerHTML = `
    <a class="event-cover" href="event.html?slug=${encodeURIComponent(e.slug)}">
      <div class="ev-datebox">
        <span class="day">${day}</span>
        <span class="month">${monthShort}</span>
      </div>
      <div class="ev-icon">${escapeHtml(e.icon || '📅')}</div>
    </a>
    <div class="event-body">
      <div style="display:flex; align-items: center; gap: 6px; flex-wrap: wrap">
        <a href="event.html?slug=${encodeURIComponent(e.slug)}" class="event-title">${escapeHtml(e.title)}</a>
        ${e.is_official ? '<span class="cc-badge">Official</span>' : ''}
      </div>
      <div class="event-meta">
        <span>${time}</span>
        ${e.location_district ? `<span>· ${escapeHtml(e.location_district)}</span>` : ''}
        ${e.location_venue ? `<span>· ${escapeHtml(e.location_venue)}</span>` : ''}
        <span class="cc-cat">${escapeHtml(e.kind)}</span>
      </div>
      ${e.description ? `<div class="event-desc">${escapeHtml(e.description).slice(0, 180)}${e.description.length > 180 ? '…' : ''}</div>` : ''}
      <div class="event-actions">
        <button class="btn ${e.my_rsvp === 'going' ? 'btn-primary' : 'btn-outline'} btn-small ev-going" data-id="${e.id}">
          Going · ${e.going_count}
        </button>
        <button class="btn ${e.my_rsvp === 'interested' ? 'btn-primary' : 'btn-outline'} btn-small ev-interested" data-id="${e.id}">
          Interested · ${e.interested_count}
        </button>
      </div>
    </div>
  `;
  const wireRsvp = (btn, status) => {
    btn.onclick = async (ev) => {
      ev.preventDefault();
      btn.disabled = true;
      try {
        const nextStatus = e.my_rsvp === status ? 'none' : status;
        const upd = await api.eventRsvp(e.id, nextStatus);
        Object.assign(e, upd);
        // Re-render the card in place
        const replacement = renderCard(e);
        card.replaceWith(replacement);
      } catch (err) { toast(err.message); }
      finally { btn.disabled = false; }
    };
  };
  wireRsvp(card.querySelector('.ev-going'), 'going');
  wireRsvp(card.querySelector('.ev-interested'), 'interested');
  return card;
}

function openCreator() {
  if (!api.isAuthed()) { toast('Sign in first'); return; }
  const KINDS = ['meetup', 'festival', 'exam', 'market', 'screening', 'protest', 'ghat', 'other'];
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 520px">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px">
        <h2 style="margin:0">New event</h2>
        <button class="btn" id="ec-close">✕</button>
      </div>
      <div class="field"><label>Title</label>
        <input class="input" id="ec-title" maxlength="200" /></div>
      <div class="field"><label>Slug</label>
        <input class="input" id="ec-slug" placeholder="lowercase-with-dashes" maxlength="80" /></div>
      <div class="field"><label>Description</label>
        <textarea class="input" id="ec-desc" rows="3"></textarea></div>
      <div class="field"><label>Kind</label>
        <select class="input" id="ec-kind">${KINDS.map(k => `<option value="${k}">${k}</option>`).join('')}</select></div>
      <div class="field"><label>Icon (single emoji)</label>
        <input class="input" id="ec-icon" placeholder="📅" maxlength="4" /></div>
      <div class="field"><label>Starts at</label>
        <input class="input" id="ec-starts" type="datetime-local" /></div>
      <div class="field"><label>Ends at (optional)</label>
        <input class="input" id="ec-ends" type="datetime-local" /></div>
      <div class="field"><label>District</label>
        <input class="input" id="ec-district" placeholder="Patna" /></div>
      <div class="field"><label>Venue</label>
        <input class="input" id="ec-venue" placeholder="Kalidas Rangalay" /></div>
      <button class="btn btn-primary btn-block" id="ec-submit">Create event</button>
    </div>`;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#ec-close').onclick = () => back.remove();

  const $title = back.querySelector('#ec-title');
  const $slug = back.querySelector('#ec-slug');
  $title.oninput = () => {
    if ($slug.dataset.touched) return;
    $slug.value = $title.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  };
  $slug.oninput = () => { $slug.dataset.touched = '1'; };

  back.querySelector('#ec-submit').onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const starts = back.querySelector('#ec-starts').value;
      const ends = back.querySelector('#ec-ends').value;
      if (!starts) { toast('Set a start time'); btn.disabled = false; btn.textContent = 'Create event'; return; }
      const payload = {
        slug: $slug.value.trim(),
        title: $title.value.trim(),
        description: back.querySelector('#ec-desc').value.trim() || null,
        kind: back.querySelector('#ec-kind').value,
        icon: back.querySelector('#ec-icon').value.trim() || null,
        starts_at: new Date(starts).toISOString(),
        ends_at: ends ? new Date(ends).toISOString() : null,
        location_district: back.querySelector('#ec-district').value.trim() || null,
        location_venue: back.querySelector('#ec-venue').value.trim() || null,
      };
      const created = await api.createEvent(payload);
      toast('Event created');
      back.remove();
      location.href = `event.html?slug=${encodeURIComponent(created.slug)}`;
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = 'Create event';
    }
  };
}

boot();

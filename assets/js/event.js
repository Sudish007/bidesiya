// Single event page.

import { api } from './api.js';
import { toast, escapeHtml, timeAgo } from './ui.js';
import { mountShell } from './shell.js';

mountShell('events');

const $detail = document.getElementById('event-detail');
const $more = document.getElementById('more-events');

const slug = new URLSearchParams(location.search).get('slug');

async function boot() {
  if (!slug) { $detail.innerHTML = '<div class="banner banner-error">No slug.</div>'; return; }
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  try {
    const e = await api.getEvent(slug);
    document.title = `${e.title} · Bidesiya`;
    render(e);
    loadMore(e);
  } catch (err) {
    $detail.innerHTML = `<div class="banner banner-error">${err.message}</div>`;
  }
}

function render(e) {
  const starts = new Date(e.starts_at);
  const ends = e.ends_at ? new Date(e.ends_at) : null;
  const dateStr = starts.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = starts.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endStr = ends ? ` – ${ends.toLocaleDateString() === starts.toLocaleDateString() ? ends.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ends.toLocaleString()}` : '';

  $detail.innerHTML = `
    <header class="event-hero">
      <div class="event-hero-icon">${escapeHtml(e.icon || '📅')}</div>
      <div style="flex:1; min-width:0">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap: wrap">
          <h1 style="margin:0; font-size: 26px; font-weight: 800">${escapeHtml(e.title)}</h1>
          ${e.is_official ? '<span class="cc-badge">Official</span>' : ''}
        </div>
        <div class="event-hero-meta">
          <div>📅 <b>${dateStr}</b></div>
          <div>🕐 ${timeStr}${endStr}</div>
          ${e.location_venue || e.location_district ? `<div>📍 ${escapeHtml([e.location_venue, e.location_district].filter(Boolean).join(', '))}</div>` : ''}
          ${e.community_slug ? `<div>👥 <a href="community.html?slug=${encodeURIComponent(e.community_slug)}">${escapeHtml(e.community_name)}</a></div>` : ''}
          ${e.host_name ? `<div>🤝 Hosted by ${escapeHtml(e.host_name)}</div>` : ''}
        </div>
      </div>
    </header>

    <div class="event-rsvp-row">
      <button class="btn ${e.my_rsvp === 'going' ? 'btn-primary' : 'btn-outline'} ev-going">Going · ${e.going_count}</button>
      <button class="btn ${e.my_rsvp === 'interested' ? 'btn-primary' : 'btn-outline'} ev-interested">Interested · ${e.interested_count}</button>
    </div>

    ${e.description ? `<div class="event-description">${escapeHtml(e.description).replace(/\n/g, '<br>')}</div>` : ''}

    <div class="subtle" style="margin-top: 24px; font-size: 12px">Created ${timeAgo(e.created_at)}</div>
  `;

  const wire = (btn, status) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const nextStatus = e.my_rsvp === status ? 'none' : status;
        const upd = await api.eventRsvp(e.id, nextStatus);
        Object.assign(e, upd);
        render(e);
      } catch (err) { toast(err.message); }
      finally { btn.disabled = false; }
    };
  };
  wire($detail.querySelector('.ev-going'), 'going');
  wire($detail.querySelector('.ev-interested'), 'interested');
}

async function loadMore(current) {
  try {
    const all = await api.listEvents({ upcoming: true, limit: 6 }) || [];
    const others = all.filter(e => e.slug !== current.slug).slice(0, 4);
    if (!others.length) { $more.innerHTML = '<div class="subtle">Nothing else.</div>'; return; }
    $more.innerHTML = others.map(e => `
      <a class="trend-row" href="event.html?slug=${encodeURIComponent(e.slug)}">
        <div class="trend-tag">${escapeHtml(e.icon || '📅')} ${escapeHtml(e.title)}</div>
        <div class="trend-meta">${new Date(e.starts_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${escapeHtml(e.location_district || '')}</div>
      </a>
    `).join('');
  } catch { $more.innerHTML = ''; }
}

boot();

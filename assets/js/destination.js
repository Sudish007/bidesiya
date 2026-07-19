// Single destination view.

import { api } from './api.js';
import { escapeHtml, toast } from './ui.js';
import { mountShell } from './shell.js';
import { imageUrl } from './avatar.js';

mountShell('tourism');

const params = new URLSearchParams(location.search);
const state = params.get('state');
const slug = params.get('slug');

const $view = document.getElementById('dest-view');
const $nearby = document.getElementById('nearby-list');

async function boot() {
  if (!state || !slug) {
    $view.innerHTML = '<div class="banner banner-error">No destination specified.</div>';
    return;
  }
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  try {
    const d = await api.getDestination(state, slug);
    document.title = `${d.name} · Bidesiya`;
    render(d);
    loadNearby(d);
  } catch (e) {
    $view.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function render(d) {
  const mapsUrl = d.latitude
    ? `https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.name + ' ' + d.district + ' ' + d.state)}`;

  const photoUrl = imageUrl(d.cover_url);

  $view.innerHTML = `
    ${photoUrl ? `
      <figure class="dest-photo">
        <img src="${photoUrl}" alt="${escapeHtml(d.name)}" />
        ${d.photo_attribution ? `
          <figcaption>
            ${escapeHtml(d.photo_attribution)}
            ${d.photo_source_url ? ` · <a href="${d.photo_source_url}" target="_blank" rel="noopener">source</a>` : ''}
          </figcaption>` : ''}
      </figure>` : ''}
    <header class="dest-hero">
      <div class="dh-icon">${escapeHtml(d.icon || '📍')}</div>
      <div style="flex: 1; min-width: 0">
        <div class="dh-state">${d.state === 'bihar' ? 'Bihar' : 'Jharkhand'} · ${escapeHtml(d.category)}</div>
        <h1 style="margin: 6px 0 4px; font-size: 26px; font-weight: 800">${escapeHtml(d.name)}</h1>
        <div class="dh-tagline">${escapeHtml(d.tagline || '')}</div>
        <div class="dh-meta">📍 ${escapeHtml(d.district)} ${d.is_featured ? '· <b>Featured</b>' : ''}</div>
      </div>
    </header>

    <div class="dest-description">${escapeHtml(d.description).replace(/\n/g, '<br>')}</div>

    <div class="dest-info-grid">
      ${d.best_time_to_visit ? `
        <div class="di-cell">
          <div class="di-label">Best time</div>
          <div class="di-value">${escapeHtml(d.best_time_to_visit)}</div>
        </div>` : ''}
      ${d.entry_fee ? `
        <div class="di-cell">
          <div class="di-label">Entry fee</div>
          <div class="di-value">${escapeHtml(d.entry_fee)}</div>
        </div>` : ''}
      ${d.how_to_reach ? `
        <div class="di-cell di-full">
          <div class="di-label">How to reach</div>
          <div class="di-value">${escapeHtml(d.how_to_reach)}</div>
        </div>` : ''}
      ${d.tips ? `
        <div class="di-cell di-full">
          <div class="di-label">Insider tip</div>
          <div class="di-value">${escapeHtml(d.tips)}</div>
        </div>` : ''}
    </div>

    <div style="margin-top: 20px">
      <a class="btn btn-primary" href="${mapsUrl}" target="_blank" rel="noopener">📍 Open in Maps</a>
      <a class="btn btn-outline" href="tourism.html?state=${d.state}">All ${d.state === 'bihar' ? 'Bihar' : 'Jharkhand'} destinations</a>
    </div>
  `;
}

async function loadNearby(current) {
  try {
    const list = await api.listDestinations(current.state, { district: current.district, limit: 6 });
    const others = list.filter(x => x.slug !== current.slug).slice(0, 4);
    if (!others.length) { $nearby.innerHTML = '<div class="subtle">Nothing else in this district.</div>'; return; }
    $nearby.innerHTML = others.map(d => `
      <a class="trend-row" href="destination.html?state=${d.state}&slug=${d.slug}">
        <div class="trend-tag">${escapeHtml(d.icon || '📍')} ${escapeHtml(d.name)}</div>
        <div class="trend-meta">${escapeHtml(d.category)}</div>
      </a>
    `).join('');
  } catch { $nearby.innerHTML = ''; }
}

boot();

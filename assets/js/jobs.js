import { api } from './api.js';
import { el, escapeHtml, toast } from './ui.js';

let cat = '';
const $cats = document.getElementById('categories');
const $list = document.getElementById('jobs');

$cats.querySelectorAll('.chip').forEach(c => c.onclick = () => {
  cat = c.dataset.cat;
  $cats.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
  load();
});

async function load() {
  if (!api.isAuthed()) {
    $list.innerHTML = '';
    $list.appendChild(el('div', { class: 'banner banner-warn', html: 'Sign in to load jobs. <a href="auth.html">Sign in →</a>' }));
    return;
  }
  $list.innerHTML = '<div class="banner banner-info">Loading…</div>';
  try {
    const resp = await fetch(`${api.base}/jobs${cat ? '?category=' + cat : ''}`, {
      headers: { Authorization: `Bearer ${api.token}` },
    });
    const jobs = await resp.json();
    if (!Array.isArray(jobs)) throw new Error(jobs.detail || 'load failed');
    $list.innerHTML = '';
    if (!jobs.length) {
      $list.appendChild(el('div', { class: 'banner banner-info', text: 'No jobs in this category yet.' }));
      return;
    }
    for (const j of jobs) $list.appendChild(jobCard(j));
  } catch (e) {
    $list.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function jobCard(j) {
  const wage = `₹${j.monthly_wage_min.toLocaleString('en-IN')} – ₹${j.monthly_wage_max.toLocaleString('en-IN')} / month`;
  const perks = [
    j.housing_included ? 'Housing' : null,
    j.food_included ? 'Food' : null,
    j.is_verified ? 'Verified employer' : null,
  ].filter(Boolean);

  const card = el('div', { class: 'card' });
  card.innerHTML = `
    <div class="hstack">
      <div>
        <strong>${escapeHtml(j.title)}</strong>
        <div class="subtle" style="margin-top:2px; font-size:13px">${escapeHtml(j.employer_name)} · ${escapeHtml(j.city)}, ${escapeHtml(j.state)}</div>
      </div>
      <span class="badge-status verified right">${escapeHtml(j.category)}</span>
    </div>
    <div style="margin-top:8px; font-weight: 700; color: var(--terracotta)">${wage}</div>
    ${perks.length ? `<div class="subtle" style="margin-top:4px">${perks.join(' · ')}</div>` : ''}
    <div style="margin-top:8px">${escapeHtml(j.description)}</div>
    <div class="hstack" style="margin-top:12px; gap: 8px">
      ${j.apply_via_phone ? `<a class="btn btn-primary" href="tel:${j.apply_via_phone}">📞 Call ${escapeHtml(j.apply_via_phone)}</a>` : ''}
      ${j.apply_via_url ? `<a class="btn btn-outline" href="${escapeHtml(j.apply_via_url)}" target="_blank" rel="noreferrer">Apply online ↗</a>` : ''}
      <button class="btn btn-outline right" data-report>⚠ Flag this listing</button>
    </div>`;
  card.querySelector('[data-report]').onclick = () => toast('Reported — our team will re-verify within 24 hours.');
  return card;
}

load();

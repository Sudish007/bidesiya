import { api } from './api.js';
import { el, toast, escapeHtml } from './ui.js';

let track = 'english';
const $tracks = document.getElementById('tracks');
const $list = document.getElementById('lessons');

$tracks.querySelectorAll('.chip').forEach(c => c.onclick = () => {
  track = c.dataset.track;
  $tracks.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
  load();
});

async function load() {
  if (!api.isAuthed()) {
    $list.innerHTML = '';
    $list.appendChild(el('div', { class: 'banner banner-warn', html: 'Sign in to load lessons. <a href="auth.html">Sign in →</a>' }));
    return;
  }
  $list.innerHTML = '<div class="banner banner-info">Loading…</div>';
  try {
    const resp = await fetch(`${api.base}/lessons?track=${track}`, {
      headers: { Authorization: `Bearer ${api.token}` },
    });
    const lessons = await resp.json();
    if (!Array.isArray(lessons)) throw new Error(lessons.detail || 'load failed');
    $list.innerHTML = '';
    if (!lessons.length) {
      $list.appendChild(el('div', { class: 'banner banner-info', text: 'No lessons in this track yet.' }));
      return;
    }
    for (const l of lessons) $list.appendChild(lessonCard(l));
  } catch (e) {
    $list.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function lessonCard(l) {
  const card = el('div', { class: 'card' });
  card.innerHTML = `
    <div class="hstack">
      <div><strong>${escapeHtml(l.title)}</strong>${l.completed ? '  <span class="badge-status verified">Completed</span>' : ''}</div>
      <span class="subtle right">${l.duration_min} min</span>
    </div>
    ${l.subtitle ? `<div class="subtle" style="margin-top:2px">${escapeHtml(l.subtitle)}</div>` : ''}
    <div style="margin-top:10px; white-space: pre-wrap">${markdownLite(l.body_markdown)}</div>
    ${renderPhrases(l.phrases)}
    <div class="hstack" style="margin-top:12px; gap:8px">
      <button class="btn ${l.completed ? '' : 'btn-primary'}" data-id="${l.id}">${l.completed ? 'Mark uncomplete' : 'Mark complete'}</button>
    </div>`;
  card.querySelector('button').onclick = async (e) => {
    const id = e.currentTarget.dataset.id;
    try {
      await fetch(`${api.base}/lessons/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      toast('Marked');
      load();
    } catch (e) { toast(e.message); }
  };
  return card;
}

function renderPhrases(phrases) {
  if (!phrases || !phrases.length) return '';
  let rows = '';
  for (const p of phrases) {
    rows += `<tr>
      <td><strong>${escapeHtml(p.en || '')}</strong></td>
      <td style="color:var(--ink-subtle)">${escapeHtml(p.hi || '')}</td>
      <td class="subtle">${escapeHtml(p.bho || '')}</td>
    </tr>`;
  }
  return `<table style="width:100%; margin-top:10px; border-collapse:collapse; font-size: 14px">
    <thead><tr>
      <th style="text-align:left; padding:6px 0; font-size:11px; color:var(--ink-muted); text-transform:uppercase">English</th>
      <th style="text-align:left; padding:6px 0; font-size:11px; color:var(--ink-muted); text-transform:uppercase">Hindi</th>
      <th style="text-align:left; padding:6px 0; font-size:11px; color:var(--ink-muted); text-transform:uppercase">Bhojpuri</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// Very small markdown → HTML for **bold**, line breaks, and lists.
function markdownLite(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^(\d+\. )/gm, '<span style="color:var(--terracotta); font-weight:700">$1</span>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/^(.+)/, '<p style="margin:8px 0">$1');
}

load();

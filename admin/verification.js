import { api } from '../assets/js/api.js';
import { escapeHtml, toast, timeAgo } from '../assets/js/ui.js';

const $queue = document.getElementById('queue');
const $who = document.getElementById('who');
const $signOut = document.getElementById('btn-signout');
let status = 'pending';

async function boot() {
  if (!api.isAuthed()) { location.href = 'login.html'; return; }
  try {
    const me = await api.me();
    if (me.role !== 'admin') { toast('Admins only'); location.href = '../index.html'; return; }
    $who.textContent = `@${me.username}`;
  } catch { location.href = 'login.html'; return; }

  document.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => {
      status = c.dataset.status;
      document.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
      load();
    };
  });
  $signOut.onclick = () => { api.signOut(); location.href = 'login.html'; };
  load();
}

async function load() {
  $queue.innerHTML = '<div class="subtle">Loading…</div>';
  try {
    const items = await api.adminVerificationQueue(status);
    if (!items.length) {
      $queue.innerHTML = `<div class="subtle" style="padding: 24px">No ${status} requests.</div>`;
      return;
    }
    $queue.innerHTML = '';
    for (const r of items) $queue.appendChild(renderRow(r));
  } catch (e) {
    $queue.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function renderRow(r) {
  const row = document.createElement('div');
  row.className = 'card';
  row.style.cssText = 'padding: 16px; margin-bottom: 12px; border: 1px solid var(--divider); border-radius: 12px';
  row.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap">
      <div>
        <div style="font-weight: 700; font-size: 15px">
          ${escapeHtml(r.display_name || r.username || 'user')}
          <span class="subtle" style="font-weight: 400">· @${escapeHtml(r.username || '')}</span>
        </div>
        <div class="subtle" style="font-size: 12px; margin-top: 2px">
          Tier: <b>${escapeHtml(r.kind)}</b> · submitted ${timeAgo(r.created_at)}
        </div>
      </div>
      <div>
        ${r.status === 'pending' ? `
          <button class="btn btn-primary btn-small" data-a="approve" data-id="${r.id}">Approve</button>
          <button class="btn btn-outline btn-small" data-a="reject" data-id="${r.id}">Reject</button>
        ` : `<span class="cc-badge" style="background: ${r.status === 'approved' ? '#22c55e' : '#ef4444'}">${escapeHtml(r.status)}</span>`}
      </div>
    </div>
    <div style="margin-top: 10px; padding: 10px 12px; background: var(--brand-soft, rgba(244,63,94,0.04)); border-radius: 8px; font-size: 13px; line-height: 1.5">
      ${escapeHtml(r.evidence || '')}
    </div>
    ${r.reviewer_notes ? `<div class="subtle" style="margin-top: 8px; font-size: 12px">Reviewer notes: ${escapeHtml(r.reviewer_notes)}</div>` : ''}
  `;

  row.querySelectorAll('[data-a]').forEach(btn => {
    btn.onclick = async () => {
      const action = btn.dataset.a;
      const notes = prompt(`${action === 'approve' ? 'Approve' : 'Reject'} — reviewer notes (optional):`, '') || '';
      btn.disabled = true;
      try {
        await api.decideVerification(r.id, action === 'approve' ? 'approved' : 'rejected', notes || null);
        toast(action === 'approve' ? 'Approved' : 'Rejected');
        load();
      } catch (e) { toast(e.message); btn.disabled = false; }
    };
  });

  return row;
}

boot();

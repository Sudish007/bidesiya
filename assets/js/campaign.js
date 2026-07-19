// Single campaign detail — Sahyog (Round 12).

import { api } from './api.js';
import { toast, escapeHtml, timeAgo } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('sahyog');

const params = new URLSearchParams(location.search);
const campaignId = parseInt(params.get('id'), 10);

const $view = document.getElementById('campaign-view');
const $pledges = document.getElementById('pledges-list');
const $related = document.getElementById('related-list');

const CAT_ICONS = {
  'village-infra': '🚰', 'education': '📚', 'medical': '🏥', 'cultural': '🎭',
  'disaster': '🌊', 'livelihood': '💼', 'sports': '🏏', 'environment': '🌳',
  'community': '🤝', 'other': '📦',
};
const CAT_LABEL = {
  'village-infra': 'Village infra', 'education': 'Education', 'medical': 'Medical',
  'cultural': 'Cultural', 'disaster': 'Disaster relief', 'livelihood': 'Livelihood',
  'sports': 'Sports', 'environment': 'Environment', 'community': 'Community', 'other': 'Other',
};

let currentCampaign = null;

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  if (!campaignId || Number.isNaN(campaignId)) {
    $view.innerHTML = '<div class="banner banner-error">No campaign specified.</div>';
    return;
  }
  try {
    currentCampaign = await api.getCampaign(campaignId);
    document.title = `${currentCampaign.title} · Sahyog`;
    render(currentCampaign);
    loadPledges();
    loadRelated();
    loadUpdates();
  } catch (e) {
    $view.innerHTML = `<div class="banner banner-error">${escapeHtml(e.message)}</div>`;
  }
}

function render(c) {
  const isMine = api.userId === c.organizer_id;
  const icon = CAT_ICONS[c.category] || '🤝';
  const pct = Math.min(c.percent_raised || 0, 100);
  const daysTxt = c.days_left === null || c.days_left === undefined
    ? 'No deadline'
    : c.days_left === 0 ? 'Deadline today'
    : c.days_left === 1 ? '1 day left'
    : `${c.days_left} days left`;

  const statusBanner =
    c.status === 'pending' ? '<div class="banner banner-info">⏳ Pending admin review — not visible to others yet.</div>'
    : c.status === 'rejected' ? `<div class="banner banner-error">❌ Rejected by admin${c.admin_notes ? ': ' + escapeHtml(c.admin_notes) : ''}</div>`
    : c.status === 'closed' ? '<div class="banner banner-info">Campaign closed by the organizer.</div>'
    : c.status === 'completed' ? '<div class="banner banner-info">🎉 Campaign completed — thank you to all supporters!</div>'
    : '';

  const showBeneficiary = c.beneficiary_type === 'other' && c.beneficiary_name;

  $view.innerHTML = `
    ${statusBanner}
    <header class="campaign-hero">
      <div class="ch-cover">
        <span class="ch-icon">${icon}</span>
        ${c.is_featured ? '<span class="ch-featured">⭐ Featured</span>' : ''}
      </div>
      <div class="ch-body">
        <div class="ch-cat">${escapeHtml(CAT_LABEL[c.category] || c.category)}${c.category_label_hi ? ' · ' + escapeHtml(c.category_label_hi) : ''}</div>
        <h1 class="ch-title">${escapeHtml(c.title)}</h1>
        <div class="ch-desc">${escapeHtml(c.description)}</div>
        <div class="ch-meta">
          📍 ${escapeHtml(c.location_district)}${c.location_block ? ', ' + escapeHtml(c.location_block) : ''}
          ${showBeneficiary ? ' · Beneficiary: <b>' + escapeHtml(c.beneficiary_name) + '</b>' : ''}
        </div>
      </div>
    </header>

    <div class="progress-block">
      <div class="progress-bar big">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
      <div class="pb-row">
        <div>
          <div class="pb-raised">₹${Math.round(c.current_amount_raised).toLocaleString('en-IN')}</div>
          <div class="pb-of">of ₹${Math.round(c.target_amount).toLocaleString('en-IN')} · ${pct}%</div>
        </div>
        <div>
          <div class="pb-num">${c.supporter_count}</div>
          <div class="pb-of">supporter${c.supporter_count === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div class="pb-num">${escapeHtml(daysTxt)}</div>
          <div class="pb-of">time</div>
        </div>
      </div>
    </div>

    <div class="campaign-actions" id="campaign-actions"></div>

    <div class="organizer-card">
      <div class="sc-heading">Organizer</div>
      <div class="sc-row">
        ${avatarHtml({
          display_name: c.organizer_display_name,
          username: c.organizer_username,
          avatar_url: c.organizer_avatar_url,
          verification_kind: c.organizer_verification_kind,
        }, 48, { className: 'sc-avatar' })}
        <div class="sc-info">
          <div class="sc-name">${escapeHtml(c.organizer_display_name || c.organizer_username || 'user')}</div>
          <div class="sc-handle">@${escapeHtml(c.organizer_username || '')}</div>
        </div>
        <a class="btn btn-outline" href="profile.html?id=${c.organizer_id}">View profile</a>
      </div>
    </div>

    <div class="story-block">
      <div class="section-title">The story</div>
      <div class="story-body">${escapeHtml(c.story).replace(/\n/g, '<br>')}</div>
    </div>

    <div class="updates-block">
      <div class="section-title">Milestone updates</div>
      <div id="updates-list"><div class="subtle">…</div></div>
    </div>
  `;

  const $actions = document.getElementById('campaign-actions');
  if (isMine) {
    $actions.innerHTML = `
      <button class="btn btn-primary" id="cta-update">✎ Post an update</button>
      <button class="btn btn-outline" id="cta-manage">Manage pledges</button>
      <button class="btn btn-outline" id="cta-edit">Edit campaign</button>
      ${c.status === 'active' ? '<button class="btn btn-outline" id="cta-close">Close campaign</button>' : ''}
    `;
    document.getElementById('cta-update').onclick = () => openUpdateModal(c);
    document.getElementById('cta-manage').onclick = () => openManageModal(c);
    document.getElementById('cta-edit').onclick = () => openEditModal(c);
    if (c.status === 'active') {
      document.getElementById('cta-close').onclick = () => closeCampaign(c);
    }
  } else if (c.status === 'active') {
    $actions.innerHTML = `
      <button class="btn btn-primary" id="cta-pledge">🤝 Pledge support</button>
      <button class="btn btn-outline" id="cta-share">🔗 Share</button>
      <button class="btn btn-outline" id="cta-report" style="color: var(--danger, #E11D48)">⚠ Report</button>
    `;
    document.getElementById('cta-pledge').onclick = () => openPledgeModal(c);
    document.getElementById('cta-share').onclick = () => sharePage(c);
    document.getElementById('cta-report').onclick = () => reportCampaign(c);
  }
}

async function loadPledges() {
  try {
    const list = await api.listPledges(campaignId, { status_filter: 'confirmed' });
    if (!list.length) {
      $pledges.innerHTML = '<div class="subtle">Be the first to support this.</div>';
      return;
    }
    $pledges.innerHTML = list.slice(0, 20).map(p => {
      const name = p.is_anonymous
        ? '<b>Anonymous</b>'
        : `<b>${escapeHtml(p.supporter_display_name || p.supporter_username || 'user')}</b>`;
      const av = p.is_anonymous
        ? '<div class="lc-avatar" style="width:24px;height:24px;border-radius:50%;background:var(--divider,#DBDBDB);display:inline-block;flex:none"></div>'
        : avatarHtml({
            display_name: p.supporter_display_name,
            username: p.supporter_username,
            avatar_url: p.supporter_avatar_url,
          }, 24, { className: 'lc-avatar' });
      return `
        <div class="pledge-row">
          ${av}
          <div class="pledge-body">
            <div class="pledge-line">${name} · <span class="pledge-amt">₹${Math.round(p.amount).toLocaleString('en-IN')}</span></div>
            ${p.message ? `<div class="pledge-msg">"${escapeHtml(p.message)}"</div>` : ''}
            <div class="pledge-time subtle">${timeAgo(p.confirmed_at || p.created_at)}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch { $pledges.innerHTML = '<div class="subtle">Could not load supporters.</div>'; }
}

async function loadRelated() {
  try {
    const list = await api.listCampaigns({ category: currentCampaign.category, limit: 6 });
    const others = list.filter(x => x.id !== campaignId).slice(0, 4);
    if (!others.length) { $related.innerHTML = '<div class="subtle">Nothing else in this category.</div>'; return; }
    $related.innerHTML = others.map(c => {
      const icon = CAT_ICONS[c.category] || '🤝';
      const pct = Math.min(c.percent_raised || 0, 100);
      return `
        <a class="trend-row" href="campaign.html?id=${c.id}">
          <div class="trend-tag">${icon} ${escapeHtml(c.title)}</div>
          <div class="trend-meta">₹${Math.round(c.current_amount_raised).toLocaleString('en-IN')} of ₹${Math.round(c.target_amount).toLocaleString('en-IN')} · ${pct}%</div>
        </a>
      `;
    }).join('');
  } catch { $related.innerHTML = ''; }
}

async function loadUpdates() {
  const $u = document.getElementById('updates-list');
  if (!$u) return;
  try {
    const list = await api.listCampaignUpdates(campaignId);
    if (!list.length) {
      $u.innerHTML = '<div class="subtle">No updates yet. Organizer will post milestones with photo proofs as the campaign progresses.</div>';
      return;
    }
    $u.innerHTML = list.map(u => `
      <div class="update-item">
        <div class="update-time">${timeAgo(u.created_at)}${u.amount_spent ? ' · Spent ₹' + Math.round(u.amount_spent).toLocaleString('en-IN') : ''}</div>
        <div class="update-body">${escapeHtml(u.body).replace(/\n/g, '<br>')}</div>
      </div>
    `).join('');
  } catch { $u.innerHTML = '<div class="subtle">Could not load updates.</div>'; }
}

// ---------------------------- Pledge modal ----------------------------

function openPledgeModal(c) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 500px">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px">
        <h2 style="margin:0">Pledge to support</h2>
        <button class="btn" id="pg-close">✕</button>
      </div>

      <p class="subtle" style="margin-top: 0">Bidesiya does not process payments. After you pledge, pay the organizer directly via UPI and mark the pledge as paid.</p>

      <div class="field"><label>Amount (₹)</label>
        <div class="amount-chips">
          ${[51, 101, 501, 1001, 5001].map(v => `<button class="amt-chip" data-v="${v}">₹${v}</button>`).join('')}
        </div>
        <input class="input" id="pg-amt" type="number" min="1" placeholder="Custom amount" style="margin-top: 8px" />
      </div>

      <div class="field"><label>Message (optional, 200 chars)</label>
        <textarea class="input" id="pg-msg" rows="2" maxlength="200" placeholder="A note of support"></textarea></div>

      <div class="field"><label><input type="checkbox" id="pg-anon" /> Pledge anonymously (only ₹ counts on the wall)</label></div>

      <div id="pg-pay" hidden>
        <div class="banner banner-info" style="margin-top: 12px">
          <b>Pledge recorded.</b> Now pay <b>₹<span id="pg-amt-echo"></span></b> to the organizer via UPI:
        </div>
        <div class="upi-panel">
          <div class="upi-id">
            <div class="upi-label">UPI ID</div>
            <div class="upi-value" id="pg-upi-id">${escapeHtml(c.upi_id)}</div>
            <button class="btn" id="pg-copy">Copy</button>
          </div>
          <a class="btn btn-primary btn-block" id="pg-upi-link" href="#" style="margin-top: 8px">Open in UPI app</a>
        </div>
        <button class="btn btn-primary btn-block" id="pg-mark-paid" style="margin-top: 12px">I have paid ₹<span id="pg-amt-echo2"></span></button>
        <button class="btn btn-block" id="pg-cancel-pledge" style="margin-top: 8px">Cancel pledge</button>
      </div>

      <button class="btn btn-primary btn-block" id="pg-submit" style="margin-top: 12px">Pledge ₹<span id="pg-amt-echo3">0</span></button>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#pg-close').onclick = () => back.remove();

  let selectedAmount = 0;
  let currentPledge = null;

  const $amt = back.querySelector('#pg-amt');
  const $echo3 = back.querySelector('#pg-amt-echo3');
  const updateEcho = () => {
    const v = parseFloat($amt.value) || 0;
    selectedAmount = v;
    $echo3.textContent = v.toLocaleString('en-IN');
  };

  back.querySelectorAll('.amt-chip').forEach(chip => {
    chip.onclick = () => {
      $amt.value = chip.dataset.v;
      back.querySelectorAll('.amt-chip').forEach(x => x.classList.toggle('active', x === chip));
      updateEcho();
    };
  });
  $amt.oninput = () => {
    back.querySelectorAll('.amt-chip').forEach(x => x.classList.remove('active'));
    updateEcho();
  };

  back.querySelector('#pg-submit').onclick = async (e) => {
    if (!selectedAmount || selectedAmount < 1) {
      toast('Please choose or enter an amount');
      return;
    }
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Pledging…';
    try {
      currentPledge = await api.createPledge(c.id, {
        amount: selectedAmount,
        message: back.querySelector('#pg-msg').value.trim() || null,
        is_anonymous: back.querySelector('#pg-anon').checked,
      });
      // Show UPI payment step
      back.querySelector('#pg-amt-echo').textContent = selectedAmount.toLocaleString('en-IN');
      back.querySelector('#pg-amt-echo2').textContent = selectedAmount.toLocaleString('en-IN');
      const upiLink = `upi://pay?pa=${encodeURIComponent(c.upi_id)}&am=${selectedAmount}&cu=INR&tn=${encodeURIComponent('Sahyog-' + c.id)}`;
      back.querySelector('#pg-upi-link').href = upiLink;
      back.querySelector('#pg-pay').hidden = false;
      btn.hidden = true;
      // Hide the input fields, keep them read-only
      $amt.disabled = true;
      back.querySelector('#pg-msg').disabled = true;
      back.querySelector('#pg-anon').disabled = true;
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = `Pledge ₹${selectedAmount.toLocaleString('en-IN')}`;
    }
  };

  back.addEventListener('click', async (e) => {
    if (e.target.id === 'pg-copy') {
      try { await navigator.clipboard.writeText(c.upi_id); toast('UPI ID copied'); }
      catch { toast('Please copy manually'); }
    }
    if (e.target.id === 'pg-mark-paid') {
      if (!currentPledge) return;
      const btn = e.target;
      btn.disabled = true; btn.textContent = 'Marking paid…';
      try {
        await api.markPledgePaid(currentPledge.id);
        toast('Thank you — organizer will confirm receipt shortly');
        back.remove();
        location.reload();
      } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'I have paid'; }
    }
    if (e.target.id === 'pg-cancel-pledge') {
      if (!currentPledge) return;
      if (!confirm('Cancel this pledge?')) return;
      try {
        await api.cancelPledge(currentPledge.id);
        toast('Pledge cancelled');
        back.remove();
      } catch (err) { toast(err.message); }
    }
  });
}

// ---------------------------- Update modal ----------------------------

function openUpdateModal(c) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 520px">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px">
        <h2 style="margin:0">Post a milestone update</h2>
        <button class="btn" id="up-close">✕</button>
      </div>
      <p class="subtle" style="margin-top: 0">Update supporters on progress — what did you spend, what did you accomplish, what remains.</p>
      <div class="field"><label>Update text</label>
        <textarea class="input" id="up-body" rows="6" maxlength="4000" placeholder="e.g. Parts arrived from Kishanganj today. Mistri starts tomorrow at 8 AM. Photos attached."></textarea></div>
      <div class="field"><label>Amount spent this milestone (optional, ₹)</label>
        <input class="input" id="up-spent" type="number" min="0" placeholder="e.g. 3500" /></div>
      <button class="btn btn-primary btn-block" id="up-submit">Post update</button>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#up-close').onclick = () => back.remove();
  back.querySelector('#up-submit').onclick = async (e) => {
    const btn = e.currentTarget;
    const body = back.querySelector('#up-body').value.trim();
    if (body.length < 10) { toast('Update needs at least 10 characters'); return; }
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      await api.createCampaignUpdate(c.id, {
        body,
        amount_spent: parseFloat(back.querySelector('#up-spent').value) || null,
      });
      toast('Update posted');
      back.remove();
      loadUpdates();
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Post update'; }
  };
}

// ---------------------------- Manage pledges modal (organizer) ----------------------------

async function openManageModal(c) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 620px">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px">
        <h2 style="margin:0">Manage pledges</h2>
        <button class="btn" id="mg-close">✕</button>
      </div>
      <p class="subtle" style="margin-top: 0">Confirm each pledge <b>only</b> after the money hits your UPI account. Confirming bumps the raised total.</p>

      <div class="tabbar" style="margin-bottom: 12px">
        <button class="tab-btn active" data-status="paid">Awaiting confirmation</button>
        <button class="tab-btn" data-status="pledged">Pledged (unpaid)</button>
        <button class="tab-btn" data-status="confirmed">Confirmed</button>
      </div>

      <div id="mg-list"><div class="subtle">Loading…</div></div>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#mg-close').onclick = () => back.remove();

  const $list = back.querySelector('#mg-list');
  const load = async (status) => {
    $list.innerHTML = '<div class="subtle">Loading…</div>';
    try {
      const list = await api.listPledges(c.id, { status_filter: status, limit: 100 });
      if (!list.length) {
        $list.innerHTML = `<div class="subtle">No pledges in "${status}" state.</div>`;
        return;
      }
      $list.innerHTML = list.map(p => {
        const name = p.is_anonymous ? 'Anonymous' : (p.supporter_display_name || p.supporter_username || 'user');
        return `
          <div class="mg-row" data-id="${p.id}">
            <div>
              <div><b>${escapeHtml(name)}</b> · ₹${Math.round(p.amount).toLocaleString('en-IN')}</div>
              ${p.message ? `<div class="subtle" style="font-size: 12.5px">"${escapeHtml(p.message)}"</div>` : ''}
              <div class="subtle" style="font-size: 11.5px">${timeAgo(p.created_at)}</div>
            </div>
            ${status === 'paid' ? `<button class="btn btn-primary btn-confirm" data-id="${p.id}">✓ Confirm received</button>` : ''}
          </div>
        `;
      }).join('');
      $list.querySelectorAll('.btn-confirm').forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true; btn.textContent = 'Confirming…';
          try {
            await api.confirmPledge(parseInt(btn.dataset.id, 10));
            toast('Confirmed — raised total updated');
            load(status);
            // Also refresh the campaign summary
            currentCampaign = await api.getCampaign(campaignId);
            render(currentCampaign);
            loadPledges();
          } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = '✓ Confirm received'; }
        };
      });
    } catch (e) {
      $list.innerHTML = `<div class="banner banner-error">${escapeHtml(e.message)}</div>`;
    }
  };

  back.querySelectorAll('.tab-btn').forEach(t => {
    t.onclick = () => {
      back.querySelectorAll('.tab-btn').forEach(x => x.classList.toggle('active', x === t));
      load(t.dataset.status);
    };
  });
  load('paid');
}

// ---------------------------- Edit / close / share / report ----------------------------

function openEditModal(c) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  back.innerHTML = `
    <div class="modal" style="max-width: 560px">
      <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px">
        <h2 style="margin:0">Edit campaign</h2>
        <button class="btn" id="ed-close">✕</button>
      </div>
      <p class="subtle" style="margin-top: 0">Only some fields can be edited after a campaign goes live. Target amount and category cannot be changed once you have pledges.</p>
      <div class="field"><label>One-line description</label>
        <input class="input" id="ed-desc" maxlength="300" value="${escapeHtml(c.description)}" /></div>
      <div class="field"><label>Full story</label>
        <textarea class="input" id="ed-story" rows="6" maxlength="6000">${escapeHtml(c.story)}</textarea></div>
      <div class="field"><label>UPI ID</label>
        <input class="input" id="ed-upi" maxlength="64" value="${escapeHtml(c.upi_id)}" /></div>
      <div class="field"><label>Bank details</label>
        <textarea class="input" id="ed-bank" rows="2" maxlength="500">${escapeHtml(c.bank_details || '')}</textarea></div>
      <button class="btn btn-primary btn-block" id="ed-submit">Save</button>
    </div>
  `;
  document.body.appendChild(back);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.querySelector('#ed-close').onclick = () => back.remove();
  back.querySelector('#ed-submit').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await api.updateCampaign(c.id, {
        description: back.querySelector('#ed-desc').value.trim(),
        story: back.querySelector('#ed-story').value.trim(),
        upi_id: back.querySelector('#ed-upi').value.trim(),
        bank_details: back.querySelector('#ed-bank').value.trim() || null,
      });
      toast('Campaign updated');
      back.remove();
      location.reload();
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Save'; }
  };
}

async function closeCampaign(c) {
  if (!confirm('Close this campaign? Supporters will still see it but no new pledges can be made.')) return;
  try {
    await api.updateCampaign(c.id, { status: 'closed' });
    toast('Campaign closed');
    location.reload();
  } catch (e) { toast(e.message); }
}

function sharePage(c) {
  const url = location.href;
  const text = `${c.title} · Sahyog on Bidesiya`;
  if (navigator.share) {
    navigator.share({ title: c.title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => toast('Link copied')).catch(() => toast('Copy link manually'));
  }
}

async function reportCampaign(c) {
  const reason = prompt('Why are you reporting this campaign? Admin will review within 24 hours.');
  if (!reason || !reason.trim()) return;
  try {
    await api.post('/reports', {
      reported_type: 'campaign',
      reported_id: c.id,
      reason: reason.trim(),
    });
    toast('Reported — admin will review');
  } catch (e) { toast(e.message || 'Report failed — reports API may not be enabled for campaigns yet'); }
}

boot();

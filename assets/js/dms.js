// Direct messages page — sidebar of conversations + open thread view.
// Refreshes messages every 5s while a thread is open (poll-based).

import { api } from './api.js';
import { toast, escapeHtml, timeAgo, initials } from './ui.js';
import { mountShell } from './shell.js';
import { avatarHtml } from './avatar.js';

mountShell('dms');

const $list = document.getElementById('dm-list');
const $thread = document.getElementById('dm-thread');

let me = null;
let openConv = null;
let pollTimer = null;
let convs = [];

async function boot() {
  if (!api.isAuthed()) { location.href = 'auth.html'; return; }
  try { me = await api.me(); } catch { api.signOut(); location.href = 'auth.html'; return; }
  await loadConversations();

  // Auto-open a specific conversation from ?c=
  const cId = Number(new URLSearchParams(location.search).get('c') || 0);
  if (cId) {
    const c = convs.find(x => x.id === cId);
    if (c) openThread(c);
  }
}

async function loadConversations() {
  try {
    convs = await api.listConversations() || [];
    renderList();
  } catch (e) {
    $list.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function renderList() {
  if (!convs.length) {
    import('./bihar_art.js').then(({ renderEmptyState }) => {
      $list.innerHTML = renderEmptyState(
        'inbox',
        'No messages yet',
        "Open someone's profile and hit Message."
      );
    });
    return;
  }

  $list.innerHTML = '';
  for (const c of convs) {
    const row = document.createElement('button');
    row.className = 'dm-row';
    if (openConv && openConv.id === c.id) row.classList.add('active');
    row.innerHTML = `
      ${avatarHtml({ display_name: c.peer_display_name, username: c.peer_username, avatar_url: c.peer_avatar_url }, 44, { className: 'dm-avatar' })}
      <div style="flex:1; min-width: 0">
        <div class="dm-row-top">
          <span class="dm-name">${escapeHtml(c.peer_display_name || c.peer_username || 'user')}</span>
          ${c.last_message_at ? `<span class="dm-time">${timeAgo(c.last_message_at)}</span>` : ''}
        </div>
        <div class="dm-preview ${c.unread_count ? 'unread' : ''}">
          ${escapeHtml(c.last_message_preview || 'Say hello')}
        </div>
      </div>
      ${c.unread_count ? `<span class="dm-unread-dot">${c.unread_count}</span>` : ''}
    `;
    row.onclick = () => openThread(c);
    $list.appendChild(row);
  }
}

async function openThread(conv) {
  openConv = conv;
  // Refresh sidebar highlight
  renderList();
  history.replaceState(null, '', `dms.html?c=${conv.id}`);
  $thread.innerHTML = `
    <header class="dm-thread-header">
      <a href="profile.html?u=${conv.peer_id}" class="dm-thread-peer">
        ${avatarHtml({ display_name: conv.peer_display_name, username: conv.peer_username, avatar_url: conv.peer_avatar_url }, 44, { className: 'dm-avatar' })}
        <div>
          <div style="font-weight: 700">${escapeHtml(conv.peer_display_name || conv.peer_username || 'user')}</div>
          <div class="subtle" style="font-size: 12px">${escapeHtml(conv.peer_home_district || '')}</div>
        </div>
      </a>
    </header>
    <div class="dm-messages" id="dm-messages">
      <div class="subtle" style="text-align:center; padding: 40px 0">Loading messages…</div>
    </div>
    <form class="dm-composer" id="dm-composer" autocomplete="off">
      <input type="text" placeholder="Message…" autofocus />
      <button type="submit" disabled>Send</button>
    </form>
  `;

  const $messages = $thread.querySelector('#dm-messages');
  const $form = $thread.querySelector('#dm-composer');
  const $input = $form.querySelector('input');
  const $submit = $form.querySelector('button');

  $input.oninput = () => { $submit.disabled = !$input.value.trim(); };
  $form.onsubmit = async (ev) => {
    ev.preventDefault();
    const body = $input.value.trim();
    if (!body) return;
    $submit.disabled = true;
    try {
      const msg = await api.sendMessage(openConv.id, body);
      appendMessage($messages, msg);
      $input.value = '';
      // Update sidebar preview
      openConv.last_message_preview = body;
      openConv.last_message_at = msg.created_at;
      const idx = convs.findIndex(c => c.id === openConv.id);
      if (idx > 0) {
        convs.splice(idx, 1);
        convs.unshift(openConv);
      }
      renderList();
    } catch (e) { toast(e.message); }
    finally { $submit.disabled = !$input.value.trim(); $input.focus(); }
  };

  await refreshMessages();

  // Poll every 5s so new messages appear without a manual refresh.
  clearInterval(pollTimer);
  pollTimer = setInterval(refreshMessages, 5000);
}

async function refreshMessages() {
  if (!openConv) return;
  const $messages = document.getElementById('dm-messages');
  if (!$messages) return;
  try {
    const msgs = await api.listMessages(openConv.id);
    const shouldScroll = isNearBottom($messages);
    $messages.innerHTML = '';
    let lastDay = null;
    for (const m of msgs) {
      const day = new Date(m.created_at).toDateString();
      if (day !== lastDay) {
        const sep = document.createElement('div');
        sep.className = 'dm-day-sep';
        sep.textContent = new Date(m.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        $messages.appendChild(sep);
        lastDay = day;
      }
      appendMessage($messages, m);
    }
    if (shouldScroll) $messages.scrollTop = $messages.scrollHeight;
    // Clear unread badge in sidebar for this conv
    if (openConv.unread_count) {
      openConv.unread_count = 0;
      renderList();
    }
  } catch (e) {
    // Silent — polling shouldn't spam toasts
    console.error(e);
  }
}

function appendMessage($messages, m) {
  const bubble = document.createElement('div');
  const mine = m.sender_id === me.id;
  bubble.className = 'dm-bubble' + (mine ? ' mine' : '');
  bubble.innerHTML = `
    <div class="dm-body">${escapeHtml(m.body).replace(/\n/g, '<br>')}</div>
    <div class="dm-timestamp">${timeAgo(m.created_at)}${m.read_at && mine ? ' · Read' : ''}</div>
  `;
  $messages.appendChild(bubble);
}

function isNearBottom(el) {
  return el.scrollHeight - el.clientHeight - el.scrollTop < 100;
}

// Clean up polling on nav away
window.addEventListener('beforeunload', () => clearInterval(pollTimer));

boot();

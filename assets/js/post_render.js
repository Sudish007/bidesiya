// Shared post-rendering module used by feed.js AND hashtag.js.
// Exports renderPost (returns a DOM element) plus small helpers.

import { api } from './api.js';
import { toast, escapeHtml, timeAgo, initials, confirmModal, promptModal } from './ui.js';
import { avatarHtml, imageUrl as _sharedImageUrl } from './avatar.js';

const REACTIONS = [
  { key: 'like',       label: 'Like',       emoji: '👍' },
  { key: 'celebrate',  label: 'Celebrate',  emoji: '🎉' },
  { key: 'insightful', label: 'Insightful', emoji: '💡' },
  { key: 'support',    label: 'Support',    emoji: '🤝' },
  { key: 'helpful',    label: 'Helpful',    emoji: '💪' },
];

function reactionMeta(kind) {
  return REACTIONS.find(r => r.key === kind) || REACTIONS[0];
}

const HASHTAG_RE = /#([A-Za-z0-9_\u0900-\u097F]{2,32})/g;
const MENTION_RE = /@([A-Za-z0-9_]{2,32})/g;

export function bodyToHtml(text) {
  if (!text) return '';
  const esc = escapeHtml(text);
  const withTags = esc.replace(HASHTAG_RE, (_m, tag) => {
    const t = tag.toLowerCase();
    return `<a class="hashtag" href="hashtag.html?tag=${encodeURIComponent(t)}">#${escapeHtml(tag)}</a>`;
  });
  const withMentions = withTags.replace(MENTION_RE, (_m, u) => {
    // We don't know the user id at render time — link by username via /search
    // (server would ideally attach mention IDs but this keeps everything self-contained).
    return `<a class="mention" href="search.html?q=${encodeURIComponent('@' + u)}">@${escapeHtml(u)}</a>`;
  });
  return withMentions.replace(/\n/g, '<br>');
}

export function renderPost(p, ctx) {
  const me = ctx.me || null;
  const onRefresh = ctx.onRefresh || (() => {});
  const isMine = me && p.author_id === me.id;
  const imgSrc = imageUrl(p.image_url);

  const card = document.createElement('article');
  card.className = 'post-card';
  card.dataset.id = p.id;

  const isPureRepost = p.is_repost && !p.is_quote && p.parent;
  if (isPureRepost) {
    const parent = p.parent;
    const parentImg = imageUrl(parent.image_url);
    card.innerHTML = `
      <div class="repost-strip">
        ${repostIcon()} <span>${escapeHtml(p.author_name || 'user')} reposted</span>
      </div>
      <header class="post-header">
        <a href="profile.html?u=${parent.author_id}">${avatarHtml(parent, 40, { className: 'post-avatar' })}</a>
        <div class="post-author">
          <a href="profile.html?u=${parent.author_id}" class="name" style="color:inherit">${escapeHtml(parent.author_name)}</a>
          <span class="location">${escapeHtml(parent.district)}${parent.block ? ', ' + escapeHtml(parent.block) : ''}</span>
        </div>
        <button class="post-menu" aria-label="More">…</button>
      </header>
      ${parentImg
        ? `<img class="post-image" src="${parentImg}" alt="" loading="lazy" />`
        : `<div class="post-text-only">${bodyToHtml(parent.body)}</div>`
      }
      <div class="post-actions">
        ${parent.my_reaction
          ? `<button class="action-btn react-btn active" aria-label="Reaction">${reactionMeta(parent.my_reaction).emoji}</button>`
          : `<button class="action-btn react-btn" aria-label="React">${heartOutline()}</button>`}
        <button class="action-btn comment-btn" aria-label="Comment">${commentIcon()}</button>
        <button class="action-btn repost-btn" aria-label="Repost">${repostIcon()}${parent.reposts_count ? `<span class="count">${parent.reposts_count}</span>` : ''}</button>
        <button class="action-btn share-btn" aria-label="Share">${shareIcon()}</button>
        <button class="action-btn save-btn right" aria-label="Save">${bookmarkOutline()}</button>
      </div>
      <div class="post-likes">${renderReactionSummary(parent, Object.values(parent.reactions || {}).reduce((a,b)=>a+b,0) || parent.likes_count || 0)}</div>
      ${parentImg && parent.body ? `<div class="post-body"><span class="username">${escapeHtml(parent.author_name)}</span>${bodyToHtml(parent.body)}</div>` : ''}
      ${parent.comments_count ? `<button class="post-comments-link">View all ${parent.comments_count} comment${parent.comments_count === 1 ? '' : 's'}</button>` : '<button class="post-comments-link">Add a comment</button>'}
      <div class="post-time">${timeAgo(parent.created_at)}</div>
      <div class="post-comments"></div>
    `;
    wireCardActions(card, parent, false, me, onRefresh);
    card.querySelector('.post-menu').onclick = () => showPostMenu(p, isMine, card, onRefresh);
    return card;
  }

  const quotedParent = p.is_quote && p.parent ? p.parent : null;

  const communityPillHtml = p.community_id && p.community_slug ? `
    <a class="community-pill" href="community.html?slug=${encodeURIComponent(p.community_slug)}">
      <span class="cc-icon-sm">${p.community_icon || '#'}</span>
      <span>${escapeHtml(p.community_name || p.community_slug)}</span>
    </a>
  ` : '';

  // Multi-image carousel vs single image
  const mediaHtml = (p.image_urls && p.image_urls.length > 1)
    ? renderCarousel(p.image_urls)
    : (imgSrc ? `<img class="post-image" src="${imgSrc}" alt="" loading="lazy" />` : (p.body ? `<div class="post-text-only">${bodyToHtml(p.body)}</div>` : ''));

  // Primary reaction button reflects the user's actual reaction kind.
  const myR = p.my_reaction ? reactionMeta(p.my_reaction) : null;
  const reactBtnHtml = myR
    ? `<button class="action-btn react-btn active" data-kind="${myR.key}" aria-label="Reaction">${myR.emoji}</button>`
    : `<button class="action-btn react-btn" aria-label="React">${heartOutline()}</button>`;

  const totalReactions = Object.values(p.reactions || {}).reduce((a, b) => a + b, 0) || p.likes_count || 0;

  card.innerHTML = `
    ${communityPillHtml}
    <header class="post-header">
      <a href="profile.html?u=${p.author_id}">${avatarHtml(p, 40, { className: 'post-avatar' })}</a>
      <div class="post-author">
        <a href="profile.html?u=${p.author_id}" class="name" style="color:inherit">${escapeHtml(p.author_name)}</a>
        <span class="location">${escapeHtml(p.district)}${p.block ? ', ' + escapeHtml(p.block) : ''}</span>
      </div>
      <button class="post-menu" aria-label="More">…</button>
    </header>

    ${mediaHtml}

    ${renderPoll(p)}

    ${quotedParent ? renderQuoteEmbed(quotedParent) : ''}

    <div class="post-actions">
      ${reactBtnHtml}
      <button class="action-btn comment-btn" aria-label="Comment">${commentIcon()}</button>
      <button class="action-btn repost-btn" aria-label="Repost">${repostIcon()}${p.reposts_count ? `<span class="count">${p.reposts_count}</span>` : ''}</button>
      <button class="action-btn share-btn" aria-label="Share">${shareIcon()}</button>
      <button class="action-btn save-btn right" aria-label="Save">${bookmarkOutline()}</button>
    </div>

    <div class="post-likes">${renderReactionSummary(p, totalReactions)}</div>

    ${imgSrc && p.body ? `<div class="post-body"><span class="username">${escapeHtml(p.author_name)}</span>${bodyToHtml(p.body)}</div>` : ''}
    ${(p.image_urls && p.image_urls.length > 1) && p.body ? `<div class="post-body"><span class="username">${escapeHtml(p.author_name)}</span>${bodyToHtml(p.body)}</div>` : ''}

    ${p.comments_count ? `<button class="post-comments-link">View all ${p.comments_count} comment${p.comments_count === 1 ? '' : 's'}</button>` : '<button class="post-comments-link">Add a comment</button>'}

    <div class="post-time">${timeAgo(p.created_at)}</div>

    <div class="post-comments"></div>
  `;
  wireCardActions(card, p, isMine, me, onRefresh);
  wireCarousel(card);
  wirePoll(card, p);
  return card;
}

function renderReactionSummary(p, total) {
  if (!total) return '0 reactions';
  const emojis = Object.entries(p.reactions || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => reactionMeta(k).emoji)
    .join('');
  return `${emojis || '👍'} ${total} reaction${total === 1 ? '' : 's'}`;
}

function renderQuoteEmbed(parent) {
  const img = imageUrl(parent.image_url);
  return `
    <a class="quote-embed" href="profile.html?u=${parent.author_id}#post-${parent.id}">
      <div class="qe-header">
        ${avatarHtml(parent, 24, { className: 'qe-avatar' })}
        <div class="qe-author">${escapeHtml(parent.author_name)}</div>
        <div class="qe-time">· ${timeAgo(parent.created_at)}</div>
      </div>
      ${parent.body ? `<div class="qe-body">${bodyToHtml(parent.body)}</div>` : ''}
      ${img ? `<img class="qe-image" src="${img}" alt="" loading="lazy" />` : ''}
    </a>
  `;
}

function imageUrl(u) {
  if (!u) return null;
  return u.startsWith('http') ? u : `${api.base}${u}`;
}

/** Build a horizontally-scrolling image carousel with dots. */
function renderCarousel(urls) {
  const abs = urls.map(imageUrl);
  return `
    <div class="post-carousel" data-count="${abs.length}">
      <div class="pc-track">
        ${abs.map((u, i) => `<img class="pc-img" src="${u}" alt="" loading="lazy" data-idx="${i}" />`).join('')}
      </div>
      <div class="pc-dots">
        ${abs.map((_, i) => `<span class="pc-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join('')}
      </div>
    </div>
  `;
}

function wireCarousel(card) {
  const el = card.querySelector('.post-carousel');
  if (!el) return;
  const track = el.querySelector('.pc-track');
  const dots = el.querySelectorAll('.pc-dot');
  track.addEventListener('scroll', () => {
    const w = track.clientWidth;
    if (!w) return;
    const idx = Math.round(track.scrollLeft / w);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }, { passive: true });
  dots.forEach((d, i) => d.onclick = () => {
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  });
}

function renderPoll(post) {
  const p = post.poll;
  if (!p) return '';
  const ends = new Date(p.ends_at);
  const now = new Date();
  const closed = p.is_closed;
  let timeStr;
  if (closed) {
    timeStr = 'Poll ended';
  } else {
    const hours = Math.floor((ends - now) / 3600000);
    if (hours >= 24) timeStr = `${Math.floor(hours / 24)}d left`;
    else if (hours >= 1) timeStr = `${hours}h left`;
    else timeStr = `${Math.max(1, Math.floor((ends - now) / 60000))}m left`;
  }

  const voted = p.my_option_id != null;
  return `
    <div class="post-poll" data-postid="${post.id}" data-pollid="${p.id}">
      ${p.options.map(o => `
        <button class="pp-option ${o.my_vote ? 'mine' : ''} ${voted || closed ? 'showing' : ''}" data-optid="${o.id}"${voted || closed ? ' disabled' : ''}>
          <span class="pp-bar" style="width: ${voted || closed ? o.percent : 0}%"></span>
          <span class="pp-text">${escapeHtml(o.text)}</span>
          ${voted || closed ? `<span class="pp-pct">${o.percent}%</span>` : ''}
          ${o.my_vote ? '<span class="pp-check">✓</span>' : ''}
        </button>
      `).join('')}
      <div class="pp-meta">${p.total_votes} vote${p.total_votes === 1 ? '' : 's'} · ${timeStr}</div>
    </div>
  `;
}

function wirePoll(card, post) {
  const box = card.querySelector('.post-poll');
  if (!box || !post.poll || post.poll.my_option_id != null || post.poll.is_closed) return;
  box.querySelectorAll('.pp-option').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const optId = Number(btn.dataset.optid);
      try {
        await api.votePoll(post.id, optId);
        // Refresh the post — simplest: request the feed row and re-render locally
        // by mutating post.poll counters and re-rendering just the poll section.
        const opt = post.poll.options.find(o => o.id === optId);
        if (opt) {
          opt.votes_count += 1;
          opt.my_vote = true;
          post.poll.my_option_id = optId;
          post.poll.total_votes += 1;
          // Recompute percents
          for (const o of post.poll.options) {
            o.percent = post.poll.total_votes ? Math.round((100 * o.votes_count / post.poll.total_votes) * 10) / 10 : 0;
          }
        }
        // Re-render poll only
        box.outerHTML = renderPoll(post);
      } catch (err) { toast(err.message); }
    };
  });
}

function wireCardActions(card, target, isMine, me, onRefresh) {
  const reactBtn = card.querySelector('.react-btn');
  if (reactBtn) {
    // Click always toggles the default reaction. Hover (desktop) with 400ms
    // delay opens the picker; long-press (touch) also opens the picker.
    // The click handler and the picker are independent — one never blocks the
    // other, which was the bug in the previous mousedown-timer approach.

    reactBtn.onclick = async () => {
      try {
        if (target.my_reaction) {
          await api.clearReaction(target.id);
          if (target.reactions[target.my_reaction]) {
            target.reactions[target.my_reaction]--;
            if (target.reactions[target.my_reaction] <= 0) delete target.reactions[target.my_reaction];
          }
          target.my_reaction = null;
          target.liked_by_me = false;
          target.likes_count = Math.max(0, target.likes_count - 1);
        } else {
          await api.reactPost(target.id, 'like');
          target.my_reaction = 'like';
          target.liked_by_me = true;
          target.reactions.like = (target.reactions.like || 0) + 1;
          target.likes_count += 1;
        }
        refreshReactionUi(card, target);
      } catch (err) { toast(err.message); }
    };

    // Hover (desktop) — 400ms delay to avoid flicker
    let hoverTimer = null;
    reactBtn.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(() => openReactionPicker(reactBtn, target, card), 400);
    });
    reactBtn.addEventListener('mouseleave', () => {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    });

    // Long-press (touch) — 500ms
    let touchTimer = null;
    let touchOpened = false;
    reactBtn.addEventListener('touchstart', () => {
      touchOpened = false;
      touchTimer = setTimeout(() => {
        touchOpened = true;
        openReactionPicker(reactBtn, target, card);
      }, 500);
    }, { passive: true });
    reactBtn.addEventListener('touchend', (e) => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      // If the long-press fired, suppress the follow-on click (which would
      // toggle the default reaction on top of the just-opened picker).
      if (touchOpened) e.preventDefault();
    });
    reactBtn.addEventListener('touchcancel', () => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
    });
  }

  card.querySelector('.comment-btn').onclick = () => toggleComments(card, target, me);
  card.querySelector('.post-comments-link').onclick = () => toggleComments(card, target, me);

  const repostBtn = card.querySelector('.repost-btn');
  if (repostBtn) repostBtn.onclick = () => showRepostMenu(target, card, onRefresh);

  card.querySelector('.share-btn').onclick = () => {
    navigator.clipboard.writeText(`${location.origin}${location.pathname}?post=${target.id}`);
    toast('Link copied');
  };

  const saveBtn = card.querySelector('.save-btn');
  let saved = false;
  saveBtn.onclick = async () => {
    try {
      if (saved) { await api.del(`/posts/${target.id}/bookmark`); saved = false; saveBtn.innerHTML = bookmarkOutline(); }
      else { await api.post(`/posts/${target.id}/bookmark`); saved = true; saveBtn.innerHTML = bookmarkFilled(); }
      saveBtn.classList.toggle('saved', saved);
    } catch (e) { toast(e.message); }
  };

  card.querySelector('.post-menu').onclick = () => showPostMenu(target, isMine, card, onRefresh);
}

function showRepostMenu(p, card, onRefresh) {
  if (!api.isAuthed()) { toast('Sign in to repost'); return; }
  const items = [
    { label: 'Repost', color: '#22c55e', act: async () => {
      try {
        await api.repost(p.id);
        p.reposts_count = (p.reposts_count || 0) + 1;
        updateRepostCount(card, p.reposts_count);
        toast('Reposted');
        setTimeout(onRefresh, 300);
      } catch (e) { toast(e.message); }
    }},
    { label: 'Quote with a thought', color: 'var(--ink)', act: () => {
      window.dispatchEvent(new CustomEvent('bidesiya:open-compose', { detail: { quoting: p } }));
    }},
    { label: 'Cancel', color: 'var(--ink)', act: () => {} },
  ];
  showBottomSheet(items);
}

function updateRepostCount(card, n) {
  const btn = card.querySelector('.repost-btn');
  if (!btn) return;
  const existing = btn.querySelector('.count');
  if (n) {
    if (existing) existing.textContent = n;
    else btn.insertAdjacentHTML('beforeend', `<span class="count">${n}</span>`);
  } else if (existing) {
    existing.remove();
  }
}

function showPostMenu(p, isMine, card, onRefresh) {
  const items = [];
  if (isMine) {
    items.push({ label: 'Edit', color: '#262626', act: async () => {
      const v = await promptModal('Edit post', p.body);
      if (!v) return;
      try {
        await api.editPost(p.id, {
          body: v, district: p.district, block: p.block, language: p.language || 'hi',
          kind: p.kind || 'text', image_url: p.image_url || null,
        });
        toast('Updated'); onRefresh();
      } catch (e) { toast(e.message); }
    }});
    items.push({ label: 'Delete', color: 'var(--danger)', act: async () => {
      if (!await confirmModal('Delete post?', 'Removes it for everyone.')) return;
      try { await api.deletePost(p.id); toast('Deleted'); card.remove(); } catch (e) { toast(e.message); }
    }});
  } else {
    items.push({ label: 'Report', color: 'var(--danger)', act: async () => {
      try { await api.post('/reports', { post_id: p.id, reason: 'inappropriate' }); toast('Reported'); }
      catch (e) { toast(e.message); }
    }});
    items.push({ label: `Block @${p.author_username || 'user'}`, color: 'var(--danger)', act: async () => {
      if (!await confirmModal('Block user?', 'Their posts, comments, and DMs will be hidden from you.')) return;
      try { await api.blockUser(p.author_id); toast('Blocked'); onRefresh(); }
      catch (e) { toast(e.message); }
    }});
  }
  items.push({ label: 'Copy link', color: '#262626', act: () => {
    navigator.clipboard.writeText(`${location.origin}${location.pathname}?post=${p.id}`);
    toast('Link copied');
  }});
  items.push({ label: 'Cancel', color: '#262626', act: () => {} });
  showBottomSheet(items);
}

function showBottomSheet(items) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop open';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.padding = '0';
  modal.style.maxWidth = '400px';
  for (const it of items) {
    const btn = document.createElement('button');
    btn.textContent = it.label;
    btn.style.cssText = `display:block;width:100%;padding:14px;font-size:14px;font-weight:600;border:none;border-bottom:1px solid var(--divider);background:transparent;cursor:pointer;color:${it.color}`;
    btn.onclick = () => { back.remove(); it.act(); };
    modal.appendChild(btn);
  }
  back.appendChild(modal);
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  document.body.appendChild(back);
}

/** LinkedIn/FB-style reaction picker that pops up above the react button. */
function openReactionPicker(anchor, target, card) {
  // Close any existing picker
  document.querySelectorAll('.reaction-picker').forEach(el => el.remove());

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  for (const r of REACTIONS) {
    const btn = document.createElement('button');
    btn.className = 'rp-btn' + (target.my_reaction === r.key ? ' active' : '');
    btn.title = r.label;
    btn.textContent = r.emoji;
    btn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      picker.remove();
      try {
        const wasReacted = !!target.my_reaction;
        const prev = target.my_reaction;
        await api.reactPost(target.id, r.key);
        // Update local state
        if (wasReacted && target.reactions[prev]) {
          target.reactions[prev]--;
          if (target.reactions[prev] <= 0) delete target.reactions[prev];
        } else {
          target.likes_count += 1;
        }
        target.reactions[r.key] = (target.reactions[r.key] || 0) + 1;
        target.my_reaction = r.key;
        target.liked_by_me = true;
        refreshReactionUi(card, target);
      } catch (err) { toast(err.message); }
    };
    picker.appendChild(btn);
  }

  const rect = anchor.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = `${Math.max(8, rect.left - 20)}px`;
  picker.style.top = `${Math.max(8, rect.top - 56)}px`;
  document.body.appendChild(picker);

  // Close when the mouse leaves both the picker AND the anchor button.
  let hideTimer = null;
  const scheduleClose = () => {
    if (hideTimer) return;
    hideTimer = setTimeout(() => picker.remove(), 200);
  };
  const cancelClose = () => {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  };
  picker.addEventListener('mouseleave', scheduleClose);
  picker.addEventListener('mouseenter', cancelClose);
  anchor.addEventListener('mouseleave', scheduleClose, { once: true });

  // Auto-close on outside click (a small delay so the triggering click doesn't self-close)
  setTimeout(() => {
    const onDoc = (ev) => {
      if (!picker.contains(ev.target) && ev.target !== anchor) {
        picker.remove();
        document.removeEventListener('mousedown', onDoc);
      }
    };
    document.addEventListener('mousedown', onDoc);
  }, 50);
}

function refreshReactionUi(card, target) {
  const btn = card.querySelector('.react-btn');
  if (!btn) return;
  if (target.my_reaction) {
    btn.innerHTML = reactionMeta(target.my_reaction).emoji;
    btn.classList.add('active');
    btn.dataset.kind = target.my_reaction;
  } else {
    btn.innerHTML = heartOutline();
    btn.classList.remove('active');
    delete btn.dataset.kind;
  }
  const summary = card.querySelector('.post-likes');
  const total = Object.values(target.reactions || {}).reduce((a, b) => a + b, 0) || target.likes_count || 0;
  if (summary) summary.innerHTML = renderReactionSummary(target, total);
}

async function toggleComments(card, p, me) {
  const box = card.querySelector('.post-comments');
  if (box.classList.contains('open')) {
    box.classList.remove('open');
    return;
  }
  box.classList.add('open');
  box.innerHTML = '<div class="subtle" style="padding: 8px 0">Loading comments…</div>';
  try {
    const r = await api.listComments(p.id);
    box.innerHTML = '';
    for (const c of r) box.appendChild(renderComment(p.id, c, me));
    box.appendChild(renderCommentComposer(p, box, me));
  } catch (e) {
    box.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function renderComment(postId, c, me) {
  const row = document.createElement('div');
  row.className = 'comment-row';
  const isMine = me && c.author_id === me.id;
  row.innerHTML = `
    ${avatarHtml(c, 32, { className: 'comment-avatar' })}
    <div style="flex:1; min-width:0">
      <div class="comment-body"><span class="username">${escapeHtml(c.author_name)}</span>${bodyToHtml(c.body)}</div>
      <div class="comment-meta">
        <span>${timeAgo(c.created_at)}</span>
        ${c.edited_at ? '<span>edited</span>' : ''}
        <button data-a="reply">Reply</button>
        ${isMine ? '<button data-a="edit">Edit</button>' : ''}
        ${isMine ? '<button data-a="del">Delete</button>' : '<button data-a="report">Report</button>'}
      </div>
      ${c.replies_count ? `<button class="view-replies" data-parent="${c.id}">View ${c.replies_count} repl${c.replies_count === 1 ? 'y' : 'ies'}</button>` : ''}
      <div class="reply-thread" data-parent="${c.id}"></div>
    </div>
  `;
  const editBtn = row.querySelector('[data-a="edit"]');
  const delBtn = row.querySelector('[data-a="del"]');
  const repBtn = row.querySelector('[data-a="report"]');
  const replyBtn = row.querySelector('[data-a="reply"]');
  const viewRepliesBtn = row.querySelector('.view-replies');
  const thread = row.querySelector('.reply-thread');

  if (editBtn) editBtn.onclick = async () => {
    const v = await promptModal('Edit comment', c.body);
    if (!v) return;
    try {
      const upd = await api.editComment(postId, c.id, v);
      c.body = upd.body; c.edited_at = upd.edited_at;
      row.querySelector('.comment-body').innerHTML = `<span class="username">${escapeHtml(c.author_name)}</span>${bodyToHtml(c.body)}`;
    } catch (e) { toast(e.message); }
  };
  if (delBtn) delBtn.onclick = async () => {
    if (!await confirmModal('Delete comment?', 'Cannot undo.')) return;
    try { await api.deleteComment(postId, c.id); row.remove(); } catch (e) { toast(e.message); }
  };
  if (repBtn) repBtn.onclick = async () => {
    try { await api.post('/reports', { comment_id: c.id, reason: 'inappropriate' }); toast('Reported'); }
    catch (e) { toast(e.message); }
  };

  // Only top-level comments allow replies
  if (replyBtn && c.parent_id === null) {
    replyBtn.onclick = () => openReplyComposer(postId, c, thread, me);
  } else if (replyBtn) {
    replyBtn.remove();
  }

  if (viewRepliesBtn) {
    viewRepliesBtn.onclick = async () => {
      try {
        const replies = await api.listReplies(postId, c.id);
        thread.innerHTML = '';
        for (const r of replies) thread.appendChild(renderComment(postId, r, me));
        viewRepliesBtn.remove();
      } catch (e) { toast(e.message); }
    };
  }
  return row;
}

function openReplyComposer(postId, parent, thread, me) {
  if (thread.querySelector('.reply-composer')) return;
  const el = document.createElement('div');
  el.className = 'reply-composer';
  el.innerHTML = `
    <input type="text" placeholder="Replying to @${escapeHtml(parent.author_username || parent.author_name)}" />
    <button disabled>Reply</button>
  `;
  const input = el.querySelector('input');
  const btn = el.querySelector('button');
  input.oninput = () => btn.disabled = !input.value.trim();
  btn.onclick = async () => {
    const body = input.value.trim();
    if (!body) return;
    try {
      const r = await api.addReply(postId, parent.id, body);
      thread.appendChild(renderComment(postId, r, me));
      el.remove();
      parent.replies_count = (parent.replies_count || 0) + 1;
    } catch (e) { toast(e.message); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  thread.appendChild(el);
  input.focus();
}

function renderCommentComposer(p, box, me) {
  const el = document.createElement('div');
  el.className = 'comment-composer';
  el.innerHTML = `
    <input type="text" placeholder="Add a comment… use @ for mentions" />
    <button disabled>Post</button>
  `;
  const input = el.querySelector('input');
  const btn = el.querySelector('button');
  input.oninput = () => btn.disabled = !input.value.trim();
  btn.onclick = async () => {
    const body = input.value.trim();
    if (!body) return;
    try {
      const c = await api.addComment(p.id, body);
      box.insertBefore(renderComment(p.id, c, me), el);
      input.value = '';
      btn.disabled = true;
      p.comments_count++;
    } catch (e) { toast(e.message); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  return el;
}

// SVG helpers.
const _S = 'width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
function heartOutline() { return `<svg ${_S}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`; }
function heartFilled() { return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`; }
function commentIcon() { return `<svg ${_S}><path d="M21 12c0 4.97-4.03 9-9 9-1.35 0-2.63-.3-3.79-.83L3 22l1.83-5.21A9 9 0 1 1 21 12z"/></svg>`; }
function shareIcon() { return `<svg ${_S}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`; }
function bookmarkOutline() { return `<svg ${_S}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`; }
function bookmarkFilled() { return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`; }
function repostIcon() { return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`; }

// Shared avatar renderer — image if the user has one, else initials.
// Used everywhere: post headers, DMs, community lists, notifications, stories.

import { api } from './api.js';
import { escapeHtml, initials } from './ui.js';

/** Resolve a relative /uploads/... path to a full URL. */
export function imageUrl(u) {
  if (!u) return null;
  return u.startsWith('http') ? u : `${api.base}${u}`;
}

/** Render an <img> tag for a user's avatar, with initials fallback.
 * @param {object} user  — needs at least display_name/username/avatar_url
 * @param {number} size  — pixel size of the avatar (square)
 * @param {object} opts  — { className, verification, extraStyle }
 */
/** Pick a default cartoon avatar path based on the user's gender.
 * Returns null if gender is unknown (in which case we fall back to initials). */
function defaultCartoonFor(user) {
  const g = user?.gender || user?.author_gender || user?.peer_gender || user?.actor_gender;
  if (g === 'male') return 'assets/img/avatar-uncle.svg';
  if (g === 'female') return 'assets/img/avatar-aunty.svg';
  return null;
}

/** Render an <img> tag for a user's avatar with a 3-step fallback:
 *   1. uploaded photo (avatar_url)
 *   2. Bihari cartoon (avatar-uncle.svg / avatar-aunty.svg) if gender is set
 *   3. initials in a themed circle
 *
 * @param {object} user  — needs display_name/username; avatar_url and gender optional
 * @param {number} size  — pixel size of the avatar (square)
 * @param {object} opts  — { className, verification, extraStyle }
 */
export function avatarHtml(user, size = 40, opts = {}) {
  const name = user?.display_name || user?.username || user?.author_name || '?';
  const url = imageUrl(user?.avatar_url || user?.author_avatar_url || user?.peer_avatar_url || user?.actor_avatar_url);
  const verif = opts.verification || user?.verification_kind || user?.author_verification_kind || 'none';
  const cls = ['avatar-el', opts.className].filter(Boolean).join(' ');
  const style = [
    `width:${size}px`,
    `height:${size}px`,
    `font-size:${Math.max(11, Math.round(size / 2.4))}px`,
    opts.extraStyle || '',
  ].filter(Boolean).join(';');

  if (url) {
    return `<span class="${cls}" data-verification="${verif}" style="${style}">
      <img src="${url}" alt="${escapeHtml(name)}" loading="lazy" />
    </span>`;
  }
  const cartoon = defaultCartoonFor(user);
  if (cartoon) {
    return `<span class="${cls} is-cartoon" data-verification="${verif}" style="${style}">
      <img src="${cartoon}" alt="${escapeHtml(name)}" loading="lazy" />
    </span>`;
  }
  return `<span class="${cls} is-initials" data-verification="${verif}" style="${style}">${escapeHtml(initials(name))}</span>`;
}

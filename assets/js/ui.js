// Shared UI helpers.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node[k.toLowerCase()] = v;
    else if (k === 'data') Object.entries(v).forEach(([dk, dv]) => (node.dataset[dk] = dv));
    else node.setAttribute(k, v);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

let toastTimer;
export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = el('div', { class: 'toast' });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

export function confirmModal(title, body) {
  return new Promise(resolve => {
    const backdrop = el('div', { class: 'modal-backdrop open' });
    const modal = el('div', { class: 'modal' }, [
      el('h2', { text: title }),
      el('p', { text: body, class: 'subtle' }),
      el('div', { class: 'modal-actions' }, [
        el('button', {
          class: 'btn',
          text: 'Cancel',
          onClick: () => { backdrop.remove(); resolve(false); },
        }),
        el('button', {
          class: 'btn btn-danger',
          text: 'Delete',
          onClick: () => { backdrop.remove(); resolve(true); },
        }),
      ]),
    ]);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) { backdrop.remove(); resolve(false); }
    });
  });
}

export function promptModal(title, initial = '') {
  return new Promise(resolve => {
    const backdrop = el('div', { class: 'modal-backdrop open' });
    const input = el('textarea', { rows: 4, class: 'input' });
    input.value = initial;
    const modal = el('div', { class: 'modal' }, [
      el('h2', { text: title }),
      input,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', text: 'Cancel', onClick: () => { backdrop.remove(); resolve(null); } }),
        el('button', {
          class: 'btn btn-primary',
          text: 'Save',
          onClick: () => { const v = input.value.trim(); backdrop.remove(); resolve(v || null); },
        }),
      ]),
    ]);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    input.focus();
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) { backdrop.remove(); resolve(null); }
    });
  });
}

export function initials(name) {
  const s = (name == null ? '' : String(name)).trim();
  return (s[0] || '?').toUpperCase();
}

export function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

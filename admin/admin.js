// Shared admin module — auto-detects the current page and wires it up.

import { api } from '../assets/js/api.js';
import { el, toast, escapeHtml, confirmModal, timeAgo } from '../assets/js/ui.js';

const $ = (id) => document.getElementById(id);
const page = location.pathname.split('/').pop() || 'dashboard.html';

async function requireAdmin() {
  if (!api.isAuthed()) { location.href = 'login.html'; return null; }
  try {
    const me = await api.me();
    if (!['admin', 'moderator'].includes(me.role)) {
      toast('Not an admin account — signing out');
      api.signOut();
      setTimeout(() => location.href = 'login.html', 800);
      return null;
    }
    const who = $('who');
    if (who) who.innerHTML = `<span class="badge-role badge-role-${me.role}">${me.role}</span> ${escapeHtml(me.display_name || me.username || me.phone)}`;
    return me;
  } catch (e) {
    toast(e.message);
    location.href = 'login.html';
    return null;
  }
}

// ---------- Signout button (universal) ----------
const signoutBtn = $('btn-signout');
if (signoutBtn) {
  signoutBtn.onclick = () => { api.signOut(); toast('Signed out'); setTimeout(() => location.href = 'login.html', 400); };
}

// ---------- Page dispatch ----------
if (page === 'login.html' || page === '') {
  const btn = $('btn-signin');
  const err = $('err');
  if (btn) {
    btn.onclick = async () => {
      const u = $('username').value.trim();
      const p = $('password').value;
      if (!u || !p) return;
      btn.disabled = true;
      err.hidden = true;
      try {
        const resp = await fetch(`${api.base}/auth/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.detail || `HTTP ${resp.status}`);
        }
        const d = await resp.json();
        api.token = d.access_token;
        api.userId = d.user_id;
        location.href = 'dashboard.html';
      } catch (e) {
        err.hidden = false;
        err.textContent = e.message;
      } finally {
        btn.disabled = false;
      }
    };
    ['username', 'password'].forEach((id) => $(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    }));
  }
}

if (page === 'dashboard.html') {
  (async () => {
    const me = await requireAdmin();
    if (!me) return;

    try {
      const data = await api.get('/admin/metrics');
      const cards = [
        ['Users', data.total_users, `+${data.users_last_7d} in 7 days`],
        ['Posts', data.total_posts, `+${data.posts_last_24h} in 24 h`],
        ['Comments', data.total_comments, ''],
        ['Open reports', data.open_reports, 'awaiting moderation'],
        ['Watched parcels', data.watched_parcels, `${data.open_land_alerts} open alerts`],
        ['Active jobs', data.active_jobs, ''],
        ['Published lessons', data.published_lessons, ''],
      ];
      const grid = $('metrics');
      grid.innerHTML = '';
      for (const [label, value, sub] of cards) {
        grid.appendChild(el('div', { class: 'metric' }, [
          el('div', { class: 'label', text: label }),
          el('div', { class: 'value', text: String(value) }),
          sub ? el('div', { class: 'sub', text: sub }) : null,
        ]));
      }
    } catch (e) { toast(e.message); }

    $('btn-poll').onclick = async () => {
      try {
        const r = await api.post('/admin/poll-now');
        $('poll-out').textContent = JSON.stringify(r, null, 2);
        toast('Poll done');
      } catch (e) { toast(e.message); }
    };
  })();
}

if (page === 'users.html') {
  (async () => {
    const me = await requireAdmin();
    if (!me) return;
    const tbody = document.querySelector('#users-table tbody');
    const load = async () => {
      const qs = new URLSearchParams();
      if ($('q').value) qs.set('q', $('q').value);
      if ($('role').value) qs.set('role', $('role').value);
      if ($('banned').value) qs.set('banned', $('banned').value);
      try {
        const r = await fetch(`${api.base}/admin/users?${qs}`, {
          headers: { Authorization: `Bearer ${api.token}` },
        });
        const users = await r.json();
        tbody.innerHTML = '';
        for (const u of users) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.id}</td>
            <td>${escapeHtml(u.phone)}${u.username ? '<br><span class="subtle">@' + escapeHtml(u.username) + '</span>' : ''}</td>
            <td>${escapeHtml(u.display_name || '—')}</td>
            <td class="subtle">${escapeHtml(u.home_district || '—')}</td>
            <td><span class="badge-role badge-role-${u.role}">${u.role}</span></td>
            <td>${u.is_banned ? '<span class="badge-status banned">Banned</span>' : '<span class="badge-status active">Active</span>'} ${u.is_verified ? '<span class="badge-status verified">Verified</span>' : ''}</td>
            <td class="row-actions"></td>`;
          const actions = tr.querySelector('.row-actions');
          if (!u.is_verified) actions.appendChild(el('button', {
            class: 'btn', text: 'Verify',
            onClick: () => act(`/admin/users/${u.id}/verify`, 'POST', 'Verified'),
          }));
          if (u.is_banned) {
            actions.appendChild(el('button', {
              class: 'btn', text: 'Unban',
              onClick: () => act(`/admin/users/${u.id}/unban`, 'POST', 'Unbanned'),
            }));
          } else if (me.role === 'admin' || u.role === 'user') {
            actions.appendChild(el('button', {
              class: 'btn btn-danger', text: 'Ban',
              onClick: async () => {
                const ok = await confirmModal('Ban user?', `${u.display_name || u.phone} will lose access immediately.`);
                if (ok) act(`/admin/users/${u.id}/ban`, 'POST', 'Banned', { reason: 'admin action' });
              },
            }));
          }
          if (me.role === 'admin') {
            actions.appendChild(el('button', {
              class: 'btn', text: 'Set role',
              onClick: async () => {
                const role = prompt('Role — one of: user, moderator, admin', u.role);
                if (!role) return;
                act(`/admin/users/${u.id}/role`, 'POST', `Role set to ${role}`, { role });
              },
            }));
          }
          tbody.appendChild(tr);
        }
      } catch (e) { toast(e.message); }
    };
    const act = async (path, method, msg, body) => {
      try {
        await fetch(`${api.base}${path}`, {
          method,
          headers: { Authorization: `Bearer ${api.token}`, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
        toast(msg);
        load();
      } catch (e) { toast(e.message); }
    };
    $('btn-search').onclick = load;
    load();
  })();
}

if (page === 'moderation.html') {
  (async () => {
    const me = await requireAdmin();
    if (!me) return;
    let status = 'open';

    async function load() {
      const list = $('reports');
      list.innerHTML = '<div class="subtle">Loading…</div>';
      try {
        const r = await fetch(`${api.base}/admin/reports?status=${status}`, {
          headers: { Authorization: `Bearer ${api.token}` },
        });
        const rows = await r.json();
        list.innerHTML = '';
        if (!rows.length) {
          list.appendChild(el('div', { class: 'banner banner-info', text: `No ${status} reports.` }));
          return;
        }
        for (const rep of rows) {
          const card = el('div', { class: 'card', style: 'margin-bottom:10px' });
          const target = rep.post_id ? `Post #${rep.post_id}` :
                         rep.comment_id ? `Comment #${rep.comment_id}` :
                         rep.target_user_id ? `User #${rep.target_user_id}` : 'Unknown';
          card.innerHTML = `
            <div class="hstack"><strong>${escapeHtml(rep.reason)}</strong>
              <span class="subtle right">${timeAgo(rep.created_at)}</span></div>
            <div class="subtle" style="margin: 4px 0">Target: ${target} · Reporter: ${escapeHtml(rep.reporter_name || '—')}</div>
            ${rep.detail ? `<div style="margin: 6px 0">${escapeHtml(rep.detail)}</div>` : ''}`;
          if (status === 'open') {
            const actions = el('div', { class: 'hstack', style: 'gap:6px; margin-top:8px' }, [
              el('button', { class: 'btn', text: 'Dismiss', onClick: () => resolve(rep.id, 'dismiss') }),
              el('button', { class: 'btn btn-danger', text: 'Remove content', onClick: () => resolve(rep.id, 'remove_content') }),
              el('button', { class: 'btn btn-danger', text: 'Ban user', onClick: async () => {
                const ok = await confirmModal('Ban target user?', 'The account will lose access immediately.');
                if (ok) resolve(rep.id, 'ban_user');
              } }),
            ]);
            card.appendChild(actions);
          }
          list.appendChild(card);
        }
      } catch (e) {
        list.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
      }
    }

    async function resolve(id, action) {
      try {
        await fetch(`${api.base}/admin/reports/${id}/resolve`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${api.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
        toast('Resolved');
        load();
      } catch (e) { toast(e.message); }
    }

    document.querySelectorAll('.chip').forEach(c => {
      c.onclick = () => {
        document.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
        status = c.dataset.status;
        load();
      };
    });
    load();
  })();
}

if (page === 'content.html') {
  (async () => {
    const me = await requireAdmin();
    if (!me) return;

    $('btn-add-job').onclick = async () => {
      const body = {
        title: $('job-title').value,
        employer_name: $('job-employer').value,
        category: $('job-category').value,
        city: $('job-city').value,
        state: $('job-state').value,
        monthly_wage_min: Number($('job-wmin').value),
        monthly_wage_max: Number($('job-wmax').value),
        housing_included: $('job-house').checked,
        food_included: $('job-food').checked,
        description: $('job-desc').value,
        apply_via_phone: $('job-phone').value || null,
      };
      for (const [k, v] of Object.entries(body)) {
        if (v === '' || (typeof v === 'number' && Number.isNaN(v))) return toast(`Fill ${k}`);
      }
      try {
        await api.post('/jobs', body);
        toast('Job published');
        for (const id of ['job-title','job-employer','job-city','job-state','job-wmin','job-wmax','job-phone','job-desc']) $(id).value = '';
      } catch (e) { toast(e.message); }
    };

    $('btn-add-notification').onclick = async () => {
      const body = {
        kind: $('n-kind').value,
        title: $('n-title').value.trim(),
        title_hi: $('n-title-hi').value.trim() || null,
        summary: $('n-summary').value.trim(),
        issuing_authority: $('n-authority').value.trim(),
        issuing_authority_short: $('n-authority-short').value.trim() || null,
        scope: $('n-scope').value,
        education_level: $('n-education').value.trim() || null,
        vacancies: $('n-vacancies').value ? Number($('n-vacancies').value) : null,
        age_min: $('n-age-min').value ? Number($('n-age-min').value) : null,
        age_max: $('n-age-max').value ? Number($('n-age-max').value) : null,
        apply_from: $('n-apply-from').value || null,
        apply_by: $('n-apply-by').value || null,
        exam_date: $('n-exam-date').value || null,
        official_url: $('n-official').value.trim() || null,
        apply_url: $('n-apply-url').value.trim() || null,
        is_featured: $('n-featured').checked,
      };
      if (!body.title || !body.issuing_authority || !body.summary) {
        return toast('Title, authority, and summary are required');
      }
      try {
        await api.createNotification(body);
        toast('Notification published');
        for (const id of ['n-title','n-title-hi','n-authority','n-authority-short','n-summary','n-vacancies','n-age-min','n-age-max','n-education','n-official','n-apply-url']) $(id).value = '';
        for (const id of ['n-apply-from','n-apply-by','n-exam-date']) $(id).value = '';
        $('n-featured').checked = false;
      } catch (e) { toast(e.message); }
    };

    $('btn-add-lesson').onclick = async () => {
      const body = {
        track: $('l-track').value,
        order_index: Number($('l-order').value) || 99,
        title: $('l-title').value,
        subtitle: $('l-subtitle').value || null,
        body_markdown: $('l-body').value,
      };
      if (!body.title || !body.body_markdown) return toast('Title + body required');
      try {
        await api.post('/lessons', body);
        toast('Lesson published');
        $('l-title').value = ''; $('l-subtitle').value = ''; $('l-body').value = '';
      } catch (e) { toast(e.message); }
    };
  })();
}

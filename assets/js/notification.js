import { api } from './api.js';
import { toast, escapeHtml } from './ui.js';

const KIND_LABEL = {
  job: 'Latest Job', result: 'Result', admit_card: 'Admit Card',
  admission: 'Admission', scholarship: 'Scholarship', syllabus: 'Syllabus',
  online_form: 'Online Form', scheme: 'Sarkari Yojna', news: 'News',
};

const $wrap = document.getElementById('notification');
const id = new URLSearchParams(location.search).get('id');

async function load() {
  if (!api.isAuthed()) {
    $wrap.innerHTML = `<div class="banner banner-warn">Sign in to view this notification. <a href="auth.html">Sign in →</a></div>`;
    return;
  }
  if (!id) {
    $wrap.innerHTML = `<div class="banner banner-error">No notification specified.</div>`;
    return;
  }
  try {
    const n = await api.getNotification(id);
    render(n);
  } catch (e) {
    $wrap.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function render(n) {
  const label = KIND_LABEL[n.kind] || n.kind;

  const timeline = [];
  if (n.posted_on) timeline.push(['Posted on', fmt(n.posted_on)]);
  if (n.apply_from) timeline.push(['Apply from', fmt(n.apply_from)]);
  if (n.apply_by) timeline.push(['Apply by', fmt(n.apply_by)]);
  if (n.exam_date) timeline.push(['Exam date', fmt(n.exam_date)]);
  if (n.result_date) timeline.push(['Result date', fmt(n.result_date)]);

  const daysLeft = n.apply_by ? daysUntil(n.apply_by) : null;
  const urgency = daysLeft !== null && daysLeft >= 0 && daysLeft < 15;

  $wrap.innerHTML = `
    <a href="updates.html" style="color:var(--ink-muted); font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; margin: 12px 0">
      ← All updates
    </a>

    <div class="notif-detail-hero">
      <div class="hstack" style="gap:8px; margin-bottom: 10px">
        <span class="notif-badge badge-${n.kind}">${label}</span>
        ${n.is_featured ? '<span class="notif-badge" style="background:linear-gradient(135deg, var(--brand-1), var(--brand-2));color:white">Featured</span>' : ''}
        <span class="notif-authority" style="margin-left: auto">${escapeHtml(n.issuing_authority)}</span>
      </div>
      <h1 style="font-size: 26px; margin: 4px 0 6px; letter-spacing: -0.4px; line-height: 1.2">${escapeHtml(n.title)}</h1>
      ${n.title_hi ? `<div style="font-size: 16px; color: var(--ink-subtle); margin-bottom: 12px">${escapeHtml(n.title_hi)}</div>` : ''}
      <p style="margin: 8px 0 0; color: var(--ink-subtle); font-size: 15px; line-height: 1.5">${escapeHtml(n.summary)}</p>
      ${urgency
        ? `<div style="margin-top: 14px; padding: 10px 14px; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); color: white; border-radius: 10px; font-weight: 700; display: inline-block">⏳ Only ${daysLeft} days left to apply</div>`
        : ''}
    </div>

    ${timeline.length ? `
      <div class="notif-detail-timeline">
        ${timeline.map(([lbl, val]) => `
          <div class="timeline-cell">
            <div class="lbl">${lbl}</div>
            <div class="val">${val}</div>
          </div>`).join('')}
      </div>
    ` : ''}

    ${renderQuickFacts(n)}

    ${n.details_md ? `
      <div class="card">
        <h3>About</h3>
        <div style="white-space: pre-wrap; line-height: 1.6">${escapeHtml(n.details_md).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p style=\"margin:8px 0\">').replace(/^(.+)/,'<p style=\"margin:8px 0\">$1')}</div>
      </div>
    ` : ''}

    ${renderFees(n)}
    ${renderCtas(n)}

    <div style="text-align: center; color: var(--ink-muted); font-size: 12px; margin-top: 30px">
      Source: verified against <a href="${escapeHtml(n.official_url || '#')}" target="_blank">${escapeHtml(n.issuing_authority)}</a>'s official portal.
      All applications must be submitted on the official website — <strong>Bidesiya never charges any fee</strong>.
    </div>
  `;
}

function renderQuickFacts(n) {
  const facts = [];
  if (n.vacancies) facts.push(['Total vacancies', n.vacancies.toLocaleString('en-IN')]);
  if (n.education_level) facts.push(['Qualification', n.education_level]);
  if (n.age_min || n.age_max) facts.push(['Age', `${n.age_min ?? '—'} to ${n.age_max ?? '—'} years`]);
  if (n.scope) facts.push(['Scope', n.scope === 'bihar' ? 'Bihar only' : 'All India']);
  if (n.reservation_categories && n.reservation_categories.length)
    facts.push(['Categories', n.reservation_categories.join(', ')]);
  if (!facts.length) return '';
  return `
    <div class="card">
      <h3>Quick facts</h3>
      <table class="fees-table">
        ${facts.map(([k, v]) => `<tr><td style="color:var(--ink-muted);text-align:left;font-weight:600">${k}</td><td>${escapeHtml(String(v))}</td></tr>`).join('')}
      </table>
    </div>`;
}

function renderFees(n) {
  if (!n.fees) return '';
  const entries = Object.entries(n.fees);
  if (!entries.length) return '';
  return `
    <div class="card">
      <h3>Application fees</h3>
      <table class="fees-table">
        <thead><tr><th>Category</th><th>Fee</th></tr></thead>
        <tbody>
          ${entries.map(([k, v]) => `<tr><td>${k.toUpperCase()}</td><td>${v === 0 ? 'Free' : '₹' + v}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderCtas(n) {
  const buttons = [];
  if (n.apply_url) {
    buttons.push(`<a class="btn btn-primary" href="${escapeHtml(n.apply_url)}" target="_blank" rel="noreferrer noopener">Apply now →</a>`);
  }
  if (n.official_url && n.official_url !== n.apply_url) {
    buttons.push(`<a class="btn btn-outline" href="${escapeHtml(n.official_url)}" target="_blank" rel="noreferrer noopener">Official website</a>`);
  }
  if (n.notification_pdf_url) {
    buttons.push(`<a class="btn btn-outline" href="${escapeHtml(n.notification_pdf_url)}" target="_blank" rel="noreferrer noopener">Notification PDF</a>`);
  }
  if (n.syllabus_url) {
    buttons.push(`<a class="btn btn-outline" href="${escapeHtml(n.syllabus_url)}" target="_blank" rel="noreferrer noopener">Syllabus</a>`);
  }
  buttons.push(`<button class="btn btn-outline" id="btn-share">Share</button>`);

  return `<div class="detail-cta-row">${buttons.join('')}</div>`;
}

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysUntil(iso) {
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'btn-share') {
    navigator.clipboard.writeText(location.href);
    toast('Link copied');
  }
});

load();

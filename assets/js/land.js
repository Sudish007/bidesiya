import { api } from './api.js';
import { el, toast, timeAgo, confirmModal } from './ui.js';

const $parcels = document.getElementById('parcels');
const $alerts = document.getElementById('alerts');

const inputs = {
  district: document.getElementById('p-district'),
  block: document.getElementById('p-block'),
  village: document.getElementById('p-village'),
  khata: document.getElementById('p-khata'),
  khesra: document.getElementById('p-khesra'),
  area: document.getElementById('p-area'),
  holder: document.getElementById('p-holder'),
};

async function refresh() {
  if (!api.isAuthed()) {
    $parcels.innerHTML = '';
    $parcels.appendChild(el('div', {
      class: 'banner banner-warn',
      html: 'Sign in to view watched parcels. <a href="auth.html">Sign in →</a>',
    }));
    $alerts.innerHTML = '';
    return;
  }

  try {
    const parcels = await api.listParcels();
    renderParcels(parcels);
  } catch (e) {
    $parcels.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
  try {
    const alerts = await api.listAlerts();
    renderAlerts(alerts);
  } catch (e) {
    $alerts.innerHTML = `<div class="banner banner-error">${e.message}</div>`;
  }
}

function renderParcels(parcels) {
  $parcels.innerHTML = '';
  if (!parcels.length) {
    $parcels.appendChild(el('div', { class: 'subtle', text: 'No parcels watched yet.' }));
    return;
  }
  for (const p of parcels) {
    const card = el('div', { class: 'card', style: 'padding:12px;margin-bottom:8px' }, [
      el('div', { class: 'hstack' }, [
        el('strong', { text: `${p.village}, ${p.block}, ${p.district}` }),
        el('span', { class: 'right muted', text: p.last_checked_at ? `checked ${timeAgo(p.last_checked_at)}` : 'not yet checked' }),
      ]),
      el('div', { class: 'muted', style: 'font-size:13px;margin-top:2px', text: `Khata ${p.khata_number} · Khesra ${p.khesra_number}${p.area_decimals ? ' · ' + p.area_decimals + ' dec' : ''}` }),
      p.current_holder ? el('div', { style: 'margin-top:4px', text: `Holder: ${p.current_holder}` }) : null,
      el('div', { style: 'margin-top:8px' }, [
        el('button', {
          class: 'btn btn-outline',
          text: 'Stop watching',
          onClick: async () => {
            const ok = await confirmModal('Stop watching?', 'Alerts for this parcel will stop.');
            if (!ok) return;
            try {
              await api.removeParcel(p.id);
              refresh();
              toast('Stopped watching');
            } catch (e) { toast(e.message); }
          },
        }),
      ]),
    ]);
    $parcels.appendChild(card);
  }
}

function renderAlerts(alerts) {
  $alerts.innerHTML = '';
  if (!alerts.length) {
    $alerts.appendChild(el('div', { class: 'subtle', text: 'No alerts. All good.' }));
    return;
  }
  for (const a of alerts) {
    const color = a.severity === 'critical' ? 'banner-error'
                : a.severity === 'warning' ? 'banner-warn' : 'banner-info';
    const card = el('div', { class: `card` }, [
      el('div', { class: `banner ${color}`, style: 'margin:0 0 8px', text: a.title }),
      el('div', { class: 'muted', style: 'white-space:pre-wrap', text: a.detail }),
      el('div', { class: 'hstack', style: 'margin-top:8px' }, [
        el('span', { class: 'muted', style: 'font-size:12px', text: timeAgo(a.raised_at) }),
        el('button', {
          class: 'btn btn-outline right',
          text: a.acknowledged_at ? 'Acknowledged' : 'Acknowledge',
          disabled: !!a.acknowledged_at,
          onClick: async () => {
            try {
              await api.ackAlert(a.id);
              toast('Acknowledged');
              refresh();
            } catch (e) { toast(e.message); }
          },
        }),
      ]),
    ]);
    $alerts.appendChild(card);
  }
}

document.getElementById('btn-add').addEventListener('click', async () => {
  if (!api.isAuthed()) return toast('Sign in first');
  const payload = {
    district: inputs.district.value.trim(),
    block: inputs.block.value.trim(),
    village: inputs.village.value.trim(),
    khata_number: inputs.khata.value.trim(),
    khesra_number: inputs.khesra.value.trim(),
    area_decimals: inputs.area.value ? Number(inputs.area.value) : null,
    current_holder: inputs.holder.value.trim() || null,
  };
  for (const k of ['district', 'block', 'village', 'khata_number', 'khesra_number']) {
    if (!payload[k]) return toast(`Fill in ${k.replace('_', ' ')}`);
  }
  try {
    await api.addParcel(payload);
    for (const el of Object.values(inputs)) el.value = '';
    toast('Watching started');
    refresh();
  } catch (e) { toast(e.message); }
});

refresh();

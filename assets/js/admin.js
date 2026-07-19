import { api } from './api.js';
import { toast } from './ui.js';

const $base = document.getElementById('api-base');
const $btnSave = document.getElementById('btn-save-base');
const $btnHealth = document.getElementById('btn-health');
const $btnPoll = document.getElementById('btn-poll');
const $btnMe = document.getElementById('btn-me');
const $healthOut = document.getElementById('health-out');
const $pollOut = document.getElementById('poll-out');
const $meOut = document.getElementById('me-out');
const $who = document.getElementById('who');

$base.value = api.base;

$btnSave.addEventListener('click', () => {
  const v = $base.value.trim();
  if (!v.startsWith('http')) return toast('URL should start with http:// or https://');
  api.setBase(v.replace(/\/$/, ''));
  toast('Saved');
  refresh();
});

$btnHealth.addEventListener('click', async () => {
  $healthOut.textContent = '…';
  try {
    const d = await api.health();
    $healthOut.textContent = JSON.stringify(d, null, 2);
  } catch (e) {
    $healthOut.textContent = `Error: ${e.message}`;
  }
});

$btnPoll.addEventListener('click', async () => {
  if (!api.isAuthed()) return toast('Sign in first');
  $pollOut.textContent = 'Running poll…';
  try {
    const d = await api.pollNow();
    $pollOut.textContent = JSON.stringify(d, null, 2);
    toast('Poll done — check land page for new alerts');
  } catch (e) {
    $pollOut.textContent = `Error: ${e.message}`;
  }
});

$btnMe.addEventListener('click', refresh);

async function refresh() {
  if (!api.isAuthed()) {
    $who.innerHTML = 'Not signed in. <a href="auth.html">Sign in</a>';
    $meOut.textContent = '';
    return;
  }
  try {
    const me = await api.me();
    $who.textContent = `${me.display_name || me.phone} · user id ${me.id}`;
    $meOut.textContent = JSON.stringify(me, null, 2);
  } catch (e) {
    $who.textContent = `Auth error: ${e.message}`;
  }
}

refresh();

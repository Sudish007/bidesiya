// Auth page — phone OTP + Google/Facebook/LinkedIn OAuth.
// Every DOM lookup is guarded because we support pages where some elements
// may be missing (e.g. a stripped mobile version).

import { api } from './api.js';
import { toast } from './ui.js';

const $ = (id) => document.getElementById(id);

const $phone = $('phone');
const $code = $('code');
const $btnRequest = $('btn-request');
const $btnVerify = $('btn-verify');
const $otpBlock = $('otp-block');
const $devNotice = $('dev-code-notice');
const $signedInBanner = $('signed-in-banner');
const $otpFlow = $('otp-flow');

const $btnGoogle = $('btn-google');
const $btnFacebook = $('btn-facebook');
const $btnLinkedIn = $('btn-linkedin');
const $socialEmpty = $('social-empty');

// -------------------- Signed-in state --------------------

async function refresh() {
  if (!$signedInBanner || !api.isAuthed()) {
    if ($signedInBanner) $signedInBanner.hidden = true;
    return;
  }
  try {
    const me = await api.me();
    $signedInBanner.hidden = false;
    $signedInBanner.innerHTML = `
      Signed in as <b>${escape(me.display_name || me.username || me.phone || 'user')}</b>.
      <a href="index.html">Go to feed →</a>
      <button class="btn-inline-link" id="btn-signout">Sign out</button>
    `;
    const so = $('btn-signout');
    if (so) so.onclick = () => { api.signOut(); toast('Signed out'); refresh(); };
    if ($otpFlow) $otpFlow.style.display = 'none';
  } catch {
    // Token invalid — clear it
    api.signOut();
  }
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// -------------------- Phone OTP --------------------

function normalizePhone(raw) {
  let p = String(raw || '').replace(/\D/g, '');   // strip everything non-digit
  if (p.length === 12 && p.startsWith('91')) p = p.slice(2);   // +91XXXXXXXXXX
  if (p.length === 11 && p.startsWith('0'))  p = p.slice(1);   // 0XXXXXXXXXX
  return p;
}

if ($btnRequest) {
  $btnRequest.addEventListener('click', async () => {
    const phone = normalizePhone($phone.value);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return toast('Enter a 10-digit Indian mobile');
    }
    $btnRequest.disabled = true;
    try {
      const d = await api.requestOtp(phone);
      if ($otpBlock) $otpBlock.hidden = false;
      if (d.dev_code && $devNotice) {
        $devNotice.hidden = false;
        $devNotice.innerHTML = `Dev-mode OTP: <code>${d.dev_code}</code> (auto-filled)`;
        $code.value = d.dev_code;
      }
      toast('OTP sent');
      if ($code) $code.focus();
    } catch (e) {
      toast(e.message);
    } finally {
      $btnRequest.disabled = false;
    }
  });
}

if ($btnVerify) {
  $btnVerify.addEventListener('click', async () => {
    const phone = normalizePhone($phone.value);
    const code = ($code.value || '').trim();
    if (!code) return toast('Enter the OTP');
    $btnVerify.disabled = true;
    try {
      await api.verifyOtp(phone, code);
      toast('Signed in');
      setTimeout(() => location.href = 'index.html', 500);
    } catch (e) {
      toast(e.message);
      $btnVerify.disabled = false;
    }
  });
}

// Support Enter key in either OTP field
if ($phone) $phone.addEventListener('keydown', e => { if (e.key === 'Enter') $btnRequest?.click(); });
if ($code)  $code.addEventListener('keydown',  e => { if (e.key === 'Enter') $btnVerify?.click(); });

// -------------------- Social sign-in --------------------

async function initSocial() {
  if (!$btnGoogle && !$btnFacebook && !$btnLinkedIn) return;

  let cfg = { google: { enabled: false }, facebook: { enabled: false }, linkedin: { enabled: false } };
  try {
    cfg = await api.get('/auth/social/config');
  } catch (e) {
    console.warn('Could not load social config:', e.message);
  }

  // Always show the buttons so users see the sign-in options.
  // If a provider isn't configured, clicking will show a helpful message.
  if ($btnGoogle)   $btnGoogle.hidden = false;
  if ($btnFacebook) $btnFacebook.hidden = false;
  if ($btnLinkedIn) $btnLinkedIn.hidden = false;

  const anyEnabled = cfg.google.enabled || cfg.facebook.enabled || cfg.linkedin.enabled;
  if ($socialEmpty) $socialEmpty.hidden = anyEnabled;

  if (cfg.google.enabled)   initGoogle(cfg.google.client_id);
  else if ($btnGoogle)      $btnGoogle.onclick = () => toast('Google sign-in is not configured on this server yet. Use phone OTP above.');
  if (cfg.facebook.enabled) initFacebook(cfg.facebook.app_id);
  else if ($btnFacebook)    $btnFacebook.onclick = () => toast('Facebook sign-in is not configured on this server yet. Use phone OTP above.');
  if (cfg.linkedin.enabled) initLinkedIn(cfg.linkedin.client_id);
  else if ($btnLinkedIn)    $btnLinkedIn.onclick = () => toast('LinkedIn sign-in is not configured on this server yet. Use phone OTP above.');
}

// ---- Google ----
function initGoogle(clientId) {
  if (!$btnGoogle) return;
  $btnGoogle.hidden = false;

  const start = () => {
    if (!window.google?.accounts?.id) {
      toast('Google SDK still loading — try again in a second');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (r) => {
        try {
          await api.signInWithGoogle(r.credential);
          toast('Signed in');
          location.href = 'index.html';
        } catch (e) { toast('Google sign-in failed: ' + e.message); }
      },
    });
    window.google.accounts.id.prompt();
  };
  $btnGoogle.onclick = start;
}

// ---- Facebook ----
function initFacebook(appId) {
  if (!$btnFacebook) return;
  $btnFacebook.hidden = false;

  // Load the FB SDK lazily
  let fbReady = false;
  window.fbAsyncInit = function () {
    FB.init({ appId, cookie: false, xfbml: false, version: 'v20.0' });
    fbReady = true;
  };
  (function loadFbSdk() {
    if (document.getElementById('facebook-jssdk')) return;
    const s = document.createElement('script');
    s.id = 'facebook-jssdk';
    s.src = 'https://connect.facebook.net/en_US/sdk.js';
    s.async = true;
    document.head.appendChild(s);
  })();

  $btnFacebook.onclick = () => {
    if (!fbReady) {
      toast('Facebook SDK still loading — try again in a second');
      return;
    }
    window.FB.login((response) => {
      if (!response.authResponse) { toast('Facebook sign-in cancelled'); return; }
      const token = response.authResponse.accessToken;
      api.post('/auth/social/facebook', { access_token: token })
        .then((d) => {
          api.token = d.access_token;
          api.userId = d.user_id;
          toast('Signed in');
          location.href = 'index.html';
        })
        .catch((e) => toast('Facebook sign-in failed: ' + e.message));
    }, { scope: 'public_profile,email' });
  };
}

// ---- LinkedIn (authorization-code flow via popup) ----
function initLinkedIn(clientId) {
  if (!$btnLinkedIn) return;
  $btnLinkedIn.hidden = false;

  const redirectUri = `${location.origin}/auth-linkedin-callback.html`;
  const state = Math.random().toString(36).slice(2);
  localStorage.setItem('bidesiya.linkedin_state', state);

  $btnLinkedIn.onclick = () => {
    const url = 'https://www.linkedin.com/oauth/v2/authorization?' + new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
    }).toString();

    // Open in a popup so we don't lose the origin page context.
    const w = 520, h = 640;
    const left = Math.max(0, (screen.width - w) / 2);
    const top = Math.max(0, (screen.height - h) / 2);
    window.open(url, 'bidesiya-linkedin', `width=${w},height=${h},left=${left},top=${top}`);
  };

  // Callback page posts a message back to the opener.
  window.addEventListener('message', async (ev) => {
    if (ev.origin !== location.origin) return;
    if (!ev.data || ev.data.source !== 'bidesiya-linkedin') return;
    const { code, state: gotState } = ev.data;
    const savedState = localStorage.getItem('bidesiya.linkedin_state');
    if (!code || gotState !== savedState) {
      toast('LinkedIn state mismatch');
      return;
    }
    localStorage.removeItem('bidesiya.linkedin_state');
    try {
      const d = await api.post('/auth/social/linkedin', { code, redirect_uri: redirectUri });
      api.token = d.access_token;
      api.userId = d.user_id;
      toast('Signed in');
      location.href = 'index.html';
    } catch (e) {
      toast('LinkedIn sign-in failed: ' + e.message);
    }
  });
}

initSocial();
refresh();

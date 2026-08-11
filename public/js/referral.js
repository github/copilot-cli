/* public/js/referral.js — Dashboard logic */
'use strict';

const TOKEN_KEY = 'evodron_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { headers: authHeaders(), ...opts });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    location.href = '/login.html';
    return null;
  }
  return res.json();
}

function renderRewardBadge(r) {
  const label = `${r.amount} ${r.reward_type.replace(/_/g, ' ')}`;
  const cls   = r.status !== 'available' ? 'reward-badge claimed' : 'reward-badge';
  const claim = r.status === 'available'
    ? `<button class="btn btn-sm btn-primary" onclick="claimReward(${r.id})">Utiliser</button>`
    : `<span style="font-size:.75rem">(${r.status})</span>`;
  return `<span class="${cls}">🎁 ${label} — ${r.reason.replace(/_/g, ' ')} ${claim}</span>`;
}

async function claimReward(rewardId) {
  const data = await apiFetch(`/api/referral/claim-reward/${rewardId}`, { method: 'POST' });
  if (data) loadRewards();
}

async function loadReferralLink() {
  const data = await apiFetch('/api/referral/link');
  if (!data) return;
  document.getElementById('referral-link-display').textContent = data.referral_link;

  document.getElementById('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(data.referral_link).then(() => {
      const fb = document.getElementById('copy-feedback');
      fb.classList.remove('hidden');
      setTimeout(() => fb.classList.add('hidden'), 2000);
    });
  });
}

async function loadStats() {
  const data = await apiFetch('/api/referral/stats');
  if (!data) return;
  document.getElementById('stat-invitations').textContent = data.total_invitations;
  document.getElementById('stat-signups').textContent     = data.total_signups;
  document.getElementById('stat-active').textContent      = data.total_active;
  document.getElementById('stat-rewarded').textContent    = data.total_rewarded;
}

async function loadRewards() {
  const data = await apiFetch('/api/referral/rewards');
  if (!data) return;

  const availEl   = document.getElementById('rewards-available');
  const historyEl = document.getElementById('rewards-history');

  if (data.available.length === 0) {
    availEl.innerHTML = '<p class="muted">Aucune récompense disponible pour l\'instant.</p>';
  } else {
    availEl.innerHTML = data.available.map(renderRewardBadge).join('');
  }

  if (data.history.length === 0) {
    historyEl.innerHTML = '<p class="muted">Aucun historique.</p>';
  } else {
    historyEl.innerHTML = data.history.map(renderRewardBadge).join('');
  }
}

async function activateUse() {
  const msgEl = document.getElementById('activate-msg');
  const data  = await apiFetch('/api/referral/activate-use', { method: 'POST' });
  if (!data) return;
  msgEl.classList.remove('hidden', 'alert-error', 'alert-success');
  if (data.already_active) {
    msgEl.textContent = 'Votre compte est déjà actif.';
    msgEl.classList.add('alert-success');
  } else if (data.activated) {
    msgEl.textContent = '✅ Compte activé ! Les récompenses ont été créditées si vous avez un parrain.';
    msgEl.classList.add('alert-success');
    loadStats();
    loadRewards();
  } else {
    msgEl.textContent = 'Une erreur est survenue.';
    msgEl.classList.add('alert-error');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────
(function init() {
  if (!getToken()) {
    location.href = '/login.html';
    return;
  }

  document.getElementById('nav-logout').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    location.href = '/';
  });

  document.getElementById('activate-btn').addEventListener('click', activateUse);

  loadReferralLink();
  loadStats();
  loadRewards();
})();

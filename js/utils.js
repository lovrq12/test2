// utils.js — دوال مساعدة

/** توليد معرف عشوائي */
function generateId(len = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

/** توليد كود غرفة */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** حفظ بيانات اللاعب محليًا */
function saveLocalPlayer(data) {
  try { localStorage.setItem('mb_player', JSON.stringify(data)); } catch (e) {}
}

function loadLocalPlayer() {
  try { return JSON.parse(localStorage.getItem('mb_player') || 'null'); } catch (e) { return null; }
}

function clearLocalPlayer() {
  try { localStorage.removeItem('mb_player'); } catch (e) {}
}

/** عرض toast */
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => el.remove(), 400); }, duration);
}

/** تنسيق الوقت */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}`;
}

/** نسخ نص */
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('تم النسخ ✓', 'success'));
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
    showToast('تم النسخ ✓', 'success');
  }
}

/** الحصول على غرض عشوائي (بدون empty) */
function getRandomItem(includeEmpty = false) {
  const pool = includeEmpty ? ITEMS : ITEMS.filter(i => i.id !== 'empty');
  return pool[Math.floor(Math.random() * pool.length)];
}

/** الحصول على غرض بالمعرف */
function getItemById(id) {
  return ITEMS.find(i => i.id === id) || ITEMS.find(i => i.id === 'empty');
}

/** قراءة params من URL */
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** إخفاء loading overlay */
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.add('hidden');
}

/** إظهار loading overlay */
function showLoading(msg = 'جارٍ التحميل...') {
  const el = document.getElementById('loading-overlay');
  if (!el) return;
  const txt = el.querySelector('.loading-text');
  if (txt) txt.textContent = msg;
  el.classList.remove('hidden');
}

/** تعقيم HTML */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}

/** إنشاء timestamp */
function now() { return Date.now(); }

/** تأخير */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

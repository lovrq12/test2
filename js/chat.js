// chat.js — نظام الشات

const Chat = (() => {

  let _listeners = [];
  let _containers = {};

  function track(ref, event, handler) {
    ref.on(event, handler);
    _listeners.push({ ref, event, handler });
  }

  function cleanup() {
    _listeners.forEach(({ ref, event, handler }) => ref.off(event, handler));
    _listeners = [];
    _containers = {};
  }

  /** إرسال رسالة */
  async function sendMessage(code, playerId, playerName, text, channel = 'lobby') {
    text = text.trim();
    if (!text) return;

    const msgId = generateId(16);
    const msg = { id: msgId, playerId, name: playerName, text, channel, createdAt: now() };

    await db.ref(`rooms/${code}/chat/${msgId}`).set(msg);
  }

  /** إرسال رسالة نظام */
  async function sendSystemMessage(code, text, channel = 'lobby') {
    const msgId = generateId(16);
    await db.ref(`rooms/${code}/chat/${msgId}`).set({
      id: msgId, playerId: 'system', name: 'النظام',
      text, channel, isSystem: true, createdAt: now()
    });
  }

  /**
   * الاستماع لشات الغرفة وعرضه
   * @param {string} code - كود الغرفة
   * @param {string} containerId - id عنصر الحاوية
   * @param {string} channel - lobby | game
   */
  function listenChat(code, containerId, channel = 'lobby') {
    const container = document.getElementById(containerId);
    if (!container) return;
    _containers[containerId] = container;

    const ref = db.ref(`rooms/${code}/chat`).orderByChild('createdAt').limitToLast(100);
    track(ref, 'child_added', snap => {
      const msg = snap.val();
      if (msg.channel && msg.channel !== channel && channel !== 'all') return;
      appendMessage(container, msg);
    });
  }

  function appendMessage(container, msg) {
    const div = document.createElement('div');
    div.className = 'chat-msg' + (msg.isSystem ? ' system' : '');

    if (msg.isSystem) {
      div.textContent = msg.text;
    } else {
      div.innerHTML = `<span class="msg-name">${escapeHtml(msg.name)}:</span><span class="msg-text">${escapeHtml(msg.text)}</span>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  /** ربط حقل الإدخال بالشات */
  function bindInput(inputId, btnId, code, playerId, playerName, channel = 'lobby') {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    if (!input || !btn) return;

    const send = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      await sendMessage(code, playerId, playerName, text, channel);
    };

    btn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  }

  return { sendMessage, sendSystemMessage, listenChat, bindInput, cleanup };
})();

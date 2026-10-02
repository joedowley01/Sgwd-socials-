const CHAT_KEY = 'sgwdSocialChatV1';
let chatMessages = [];
try { chatMessages = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]').filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-40); } catch {}
let chatBusy = false, chatReady = false, chatStatus = 'Checking chat connection…', chatError = '', chatDraft = '';
const escapeChat = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function saveChat() { try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatMessages.slice(-40))); } catch { chatError = 'Your device could not save this conversation.'; } }
function renderChat() {
  $('#body').innerHTML = `<section class="hero"><div class="eyebrow">Sgwd’s social media assistant</div><h2>Let’s talk socials</h2><p>Get help with captions, Reels, Facebook, Instagram and turning attention into visits.</p></section>
  <div class="card planner"><p class="chat-status" role="status">${escapeChat(chatStatus)}</p>
  <div class="chat-prompts"><button data-chat-prompt="What should we post this week?">Plan this week</button><button data-chat-prompt="Explain our Instagram and Facebook results in plain English.">Explain our results</button><button data-chat-prompt="Help me write a Sgwd caption. Ask me what we are promoting first.">Write a caption</button></div>
  <div class="chat-log" id="chatLog" role="log" aria-label="Social media conversation">${chatMessages.length ? chatMessages.map(m => `<div class="bubble ${m.role}"><small>${m.role === 'user' ? 'You' : 'Sgwd Social Coach'}</small>${escapeChat(m.content)}</div>`).join('') : '<div class="bubble"><small>Sgwd Social Coach</small>Ask me about a post, an event or your social media results. I’ll use the dated baseline, your saved content plan and any fetched Meta figures.</div>'}${chatBusy ? '<div class="bubble" role="status">Thinking about Sgwd’s socials…</div>' : ''}</div>
  <form id="chatForm"><label for="chatInput">Your message</label><textarea id="chatInput" maxlength="4000" required placeholder="What could we post for Sunday lunch?" ${chatBusy ? 'disabled' : ''}>${escapeChat(chatDraft)}</textarea><button class="btn primary" ${chatBusy || !chatReady ? 'disabled' : ''}>${chatBusy ? 'Thinking…' : 'Send message'}</button></form>
  <p class="chat-error" role="alert">${escapeChat(chatError)}</p>
  <button type="button" id="chatClear" class="btn" ${chatBusy ? 'disabled' : ''}>Clear this conversation</button></div>
  <div class="note">A dedicated AI socials coach. It has its own history and cannot read your ChatGPT conversations. Chats are saved on this device. Sending shares your message, recent chat, baseline and saved plan with OpenAI. The latest fetched Meta figures are included when available.</div>`;
  const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight;
}
async function checkChat() {
  try {
    const r = await fetch('/.netlify/functions/social-chat');
    const data = await r.json();
    chatReady = r.ok && data.ready === true;
    chatStatus = chatReady ? 'AI connection ready • ask a question below.' : 'Chat is built. Live replies need the AI connection enabled in Netlify.';
  } catch { chatReady = false; chatStatus = 'Chat is built. The chat server is not available yet; check the Netlify deployment.'; }
  if (tab === 'chat') renderChat();
}
async function sendChat() {
  if (chatBusy || !chatReady) return;
  const content = $('#chatInput').value.trim(); if (!content) return;
  chatDraft = content;
  chatBusy = true; chatError = ''; renderChat();
  try {
    const r = await fetch('/.netlify/functions/social-chat', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({messages:[...chatMessages.slice(-19), {role:'user',content}], context:{baseline, meta:metaData, planner:shared().planner.slice(-20)}}),
      signal: AbortSignal.timeout(55000)
    });
    let data; try { data = await r.json(); } catch { throw new Error(r.status === 429 ? 'Too many messages just now. Please try again in a minute.' : 'The chat server could not reply. Please try again.'); }
    if (!r.ok) throw new Error(data.error || 'Could not send your message. Please try again.');
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('No reply received. Please try again.');
    chatMessages.push({role:'user',content}, {role:'assistant',content:data.reply}); chatMessages = chatMessages.slice(-40); chatDraft = ''; saveChat();
  } catch (e) { chatError = e.name === 'TimeoutError' ? 'The reply took too long. Your message is kept so you can retry.' : e.message; }
  finally { chatBusy = false; if (tab === 'chat') renderChat(); }
}
document.addEventListener('input', e => { if (e.target.id === 'chatInput') chatDraft = e.target.value; });
document.addEventListener('submit', e => { if (e.target.id === 'chatForm') { e.preventDefault(); sendChat(); } });
document.addEventListener('click', e => {
  const prompt = e.target.closest('[data-chat-prompt]');
  if (prompt && !chatBusy) { chatDraft = prompt.dataset.chatPrompt; renderChat(); $('#chatInput').focus(); }
  if (e.target.id === 'chatClear' && !chatBusy && confirm('Clear this device’s socials conversation?')) { chatMessages = []; chatDraft = ''; chatError = ''; saveChat(); renderChat(); }
});
checkChat();

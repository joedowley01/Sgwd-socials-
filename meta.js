let metaData=null, metaBusy=false, metaError='', metaDraft='';
const metaEscape = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metaNumber = n => typeof n==='number' && Number.isFinite(n) ? Number(n).toLocaleString('en-GB') : 'Unavailable';
const metaDate = s => new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
function metaControls() {
  return `<div class="card planner platform"><h3>Meta connection</h3><p role="status">${metaBusy?'Loading figures from Meta…':metaData?'Last fetched '+metaEscape(new Date(metaData.fetchedAt).toLocaleString('en-GB')):'Unlock to load current Facebook and Instagram figures.'}</p><p class="chat-error" role="alert">${metaEscape(metaError)}</p><label for="metaPass">Joe + Luke team passphrase</label><input id="metaPass" type="password" autocomplete="current-password" value="${metaEscape(metaDraft)}" placeholder="Your team passphrase"><button id="metaRefresh" class="btn primary" ${metaBusy?'disabled':''}>${metaBusy?'Loading…':'Unlock / refresh Meta figures'}</button><p class="small">Use the same passphrase as Chat. The Meta token stays on the server.</p></div>`;
}
function metaCards() {
  if (!metaData) return '';
  const d=metaData;
  return `<section class="hero"><div class="eyebrow">Meta • latest available 28-day figures</div><h2>Sgwd’s current performance</h2><p>${metaDate(d.period.since)} – ${metaDate(new Date(new Date(d.period.until).getTime()-86400000).toISOString())} • complete UTC days</p></section><div class="kpis">${[['views','Views'],['interactions','Interactions / post engagements'],['followers','Total followers • current'],['clicks','Profile link taps / link clicks']].flatMap(([key,label])=>['instagram','facebook'].map(p=>`<div class="kpi"><small>${p==='instagram'?'Instagram':'Facebook'} ${label.toLowerCase()}</small><strong style="font-size:20px;overflow-wrap:anywhere">${metaNumber(d[p][key])}</strong></div>`)).join('')}</div><div class="note">Instagram on the left • Facebook on the right. ${d.notes.map(metaEscape).join(' ')}</div>`;
}
function metaRatios() {
  if(!metaData)return '';
  return `<div class="card platform"><h3>Current performance ratios</h3>${['instagram','facebook'].map(p=>{
    const d=metaData[p],rate=typeof d.views==='number'&&d.views>0&&typeof d.interactions==='number'?(d.interactions/d.views*100).toFixed(2)+'%':'Unavailable';
    return `<div class="row"><span>${p==='instagram'?'Instagram interactions':'Facebook post engagements'} ÷ views</span><b>${rate}</b></div>`;
  }).join('')}<p class="small">These are ratios of actions to views, not engagement by unique reach. Do not compare follower totals with new follows in the historical baseline.</p></div>`;
}
function metaContent() {
  if(!metaData)return '';
  return `<div class="card platform"><h3>Recent Instagram posts</h3><p class="small">Latest six posts • newest first • lifetime likes and comments, not a performance ranking.</p>${metaData.recentInstagram.length?metaData.recentInstagram.map(m=>`<div class="platform"><p>${metaEscape(m.caption)}</p><div class="small">${metaEscape(m.type)} • ${m.date?metaDate(m.date):'Date unavailable'} • ${metaNumber(m.likes)} likes • ${metaNumber(m.comments)} comments</div>${m.url?`<a href="${metaEscape(m.url)}" target="_blank" rel="noopener noreferrer">View on Instagram</a>`:''}</div>`).join(''):'<p>Recent posts unavailable from Meta.</p>'}</div>`;
}
const renderHistorical=render;
render=function() {
  renderHistorical();
  const body=$('#body');
  if(tab==='chat')return;
  if(tab==='plan') {body.insertAdjacentHTML('afterbegin',`<div class="note">${metaData?'Current Meta figures are available in Dashboard, Insights and Chat.':'Planning is available while the Meta connection is locked.'} Plans are saved on this device.</div>`);return;}
  const historical=body.innerHTML.replace('Live Meta import is the next connection step.','This section is the saved historical baseline.').replaceAll('Engagement rate','Interaction/view ratio').replaceAll('Instagram engagement','Instagram interaction/view ratio').replaceAll('Facebook engagement','Facebook action/view ratio').replace('baseline reach','baseline views');
  if(tab==='dashboard')body.innerHTML=metaControls()+metaCards()+`<details class="card platform" ${metaData?'':'open'}><summary>Historical baseline • 1 October 2026</summary>${historical}</details>`;
  if(tab==='insights')body.innerHTML=metaControls()+metaCards()+metaRatios()+`<details class="card platform"><summary>Historical baseline analysis • 1 October 2026</summary>${historical}</details>`;
  if(tab==='content')body.innerHTML=metaControls()+metaContent()+`<details class="card platform"><summary>Historical content snapshot • 1 October 2026</summary>${historical}</details>`;
  if(tab==='coach')body.innerHTML=metaControls()+metaRatios()+`<div class="card coach platform"><h3>This week’s experiment</h3><p>Post one food Reel and one waterfall-to-Sgwd Reel with the same menu or booking call to action. Record the results after seven days.</p><p>${metaData?'The current ratios above describe this period. We need comparable previous-period data before claiming growth or decline.':'Unlock Meta to see current ratios. The advice below uses the dated baseline.'}</p></div>`+(metaData?'':`<details class="card platform"><summary>Historical advice • 1 October 2026</summary>${historical}</details>`);
};
async function refreshMeta() {
  if(metaBusy)return;
  const input=$('#metaPass');
  const pass=input?.value.trim()||sessionStorage.getItem('sgwdChatPass')||'';
  if(!pass){metaError='Enter your team passphrase first.';render();return;}
  sessionStorage.setItem('sgwdChatPass',pass);metaDraft='';metaBusy=true;metaError='';render();
  try {
    const r=await fetch('/.netlify/functions/meta-insights',{headers:{'X-Sgwd-Chat-Pass':pass},signal:AbortSignal.timeout(30000)});
    let d;try{d=await r.json();}catch{throw new Error('The Meta service is unavailable. Check the latest Netlify deployment.');}
    if(!r.ok)throw new Error(d.error||'Could not load Meta figures.');
    if(!d.period||!d.instagram||!d.facebook)throw new Error('Meta returned an incomplete response.');
    metaData=d;
  }catch(e){metaData=null;metaError=e.name==='TimeoutError'?'The connection timed out. Try again.':e.message;}
  finally{metaBusy=false;if(tab!=='chat')render();}
}
document.addEventListener('input',e=>{if(e.target.id==='metaPass')metaDraft=e.target.value;});
document.addEventListener('click',e=>{if(e.target.id==='metaRefresh')refreshMeta();});
document.addEventListener('keydown',e=>{if(e.target.id==='metaPass'&&e.key==='Enter'){e.preventDefault();refreshMeta();}});
render();
if(sessionStorage.getItem('sgwdChatPass'))refreshMeta();

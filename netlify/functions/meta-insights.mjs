import {createHash} from 'node:crypto';

export const config = {rateLimit:{windowLimit:12,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
const json = (body,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const hash = s => createHash('sha256').update(s).digest();
const number = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
let cache;

export function metricValue(data,metric,total=false) {
  const item = data?.data?.find(x=>x.name===metric);
  if (!item) return null;
  if (total) return number(item.total_value?.value);
  const values = item.values;
  if (!Array.isArray(values) || !values.length || values.some(x=>number(x.value)===null)) return null;
  return values.reduce((sum,x)=>sum+x.value,0);
}
class MetaError extends Error { constructor(code) {super('Meta request failed');this.code=code;} }
async function graph(path,params,token,signal) {
  const url = new URL('https://graph.facebook.com/v26.0/'+path);
  Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,String(value)));
  const response = await fetch(url,{headers:{Authorization:'Bearer '+token},signal});
  const data = await response.json();
  if (!response.ok || data.error) throw new MetaError(data.error?.code);
  return data;
}
export default async function handler(req) {
  if (req.method!=='GET') return json({error:'Method not allowed.'},405);
  const origin = req.headers.get('origin');
  if (origin && origin!==new URL(req.url).origin) return json({error:'Request not allowed.'},403);
  const {META_PAGE_ACCESS_TOKEN:token,META_PAGE_ID:page,META_INSTAGRAM_ACCOUNT_ID:ig} = process.env;
  if (!token || !/^\d+$/.test(page||'') || !/^\d+$/.test(ig||'')) return json({error:'Add META_PAGE_ACCESS_TOKEN, META_PAGE_ID, META_INSTAGRAM_ACCOUNT_ID to Netlify Production, then redeploy.'},503);
  const key = hash(token+':'+page+':'+ig).toString('hex');
  if (cache?.key===key && Date.now()-cache.time<300000) return json(cache.data);
  // Complete UTC days only. Meta may still be processing the most recent day.
  const until = Math.floor(new Date(new Date().toISOString().slice(0,10)).getTime()/1000);
  const since = until-28*86400;
  const signal = AbortSignal.timeout(22000);
  try {
    const identity = await graph(page,{fields:'id,name,instagram_business_account'},token,signal);
    if (identity.id!==page || identity.instagram_business_account?.id!==ig) return json({error:'The Page token or linked Instagram account does not match the configured Sgwd accounts.'},409);
    let expired=false;
    const optional = async work => {try{return await work();}catch(e){if(e.code===190)expired=true;return null;}};
    const metric = (id,name,total=false) => optional(async()=>{
      const result = await graph(id+'/insights',{metric:name,period:'day',since,until,...(total?{metric_type:'total_value'}:{})},token,signal);
      if (!total && result.data?.find(x=>x.name===name)?.values?.length!==28) return null;
      return metricValue(result,name,total);
    });
    const [fbViews,fbInteractions,igViews,igInteractions,igClicks,igProfile,fbProfile,media] = await Promise.all([
      metric(page,'page_media_view'),metric(page,'page_post_engagements'),metric(ig,'views',true),metric(ig,'total_interactions',true),metric(ig,'profile_links_taps',true),
      optional(()=>graph(ig,{fields:'username,followers_count'},token,signal)),optional(()=>graph(page,{fields:'followers_count'},token,signal)),
      optional(()=>graph(ig+'/media',{fields:'id,caption,media_type,permalink,timestamp,like_count,comments_count',limit:6},token,signal))
    ]);
    if (expired) return json({error:'Meta access has expired or been revoked. Generate a new Page token, update Netlify and redeploy.'},502);
    const data = {source:'Meta Graph API v26.0',fetchedAt:new Date().toISOString(),period:{since:new Date(since*1000).toISOString(),until:new Date(until*1000).toISOString(),days:28,timezone:'UTC'},
      facebook:{name:String(identity.name||'Sgwd Gwladys').slice(0,150),views:fbViews,interactions:fbInteractions,followers:number(fbProfile?.followers_count),follows:null,clicks:null},
      instagram:{name:String(igProfile?.username||'Instagram').slice(0,150),views:igViews,interactions:igInteractions,followers:number(igProfile?.followers_count),follows:null,clicks:igClicks},
      recentInstagram:(media?.data||[]).slice(0,6).map(m=>({caption:String(m.caption||'Instagram post').slice(0,500),type:String(m.media_type||''),date:m.timestamp,likes:number(m.like_count),comments:number(m.comments_count),url:typeof m.permalink==='string'&&/^https:\/\/(www\.)?instagram\.com\//.test(m.permalink)?m.permalink:null})),
      notes:['Meta figures can lag behind Business Suite. Refreshed results are cached for up to five minutes.','Facebook post engagements and Instagram interactions have different definitions. Views are not unique reach.','Follower totals are current account totals, not follows gained in this 28-day period. New follows and Facebook link clicks are unavailable in this version.']};
    cache={key,time:Date.now(),data};
    return json(data);
  } catch(e) {return json({error:e.code===190?'Meta access has expired or been revoked. Replace the Page token in Netlify and redeploy.':e.code===10||e.code===200?'Meta denied access. Check Page access and the token permissions.':'Could not reach the configured Meta accounts. Check the Page token and IDs, then try again.'},502);}
}

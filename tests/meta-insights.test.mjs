import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler,{metricValue} from '../netlify/functions/meta-insights.mjs';

test('missing metrics stay unavailable; zero stays zero; structured values are not summed',()=>{
  assert.equal(metricValue({data:[]},'views'),null);
  assert.equal(metricValue({data:[{name:'views',total_value:{value:0}}]},'views',true),0);
  assert.equal(metricValue({data:[{name:'views',values:[{value:5},{value:7}]}]},'views'),12);
  assert.equal(metricValue({data:[{name:'views',values:[{value:{paid:4}}]}]},'views'),null);
});
test('server authentication, identity, partial metrics, sanitized response and caching',async()=>{
  const originalFetch=globalThis.fetch;
  const names=['META_PAGE_ACCESS_TOKEN','META_PAGE_ID','META_INSTAGRAM_ACCOUNT_ID','SGWD_CHAT_PASSPHRASE'];
  const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  const req=(pass='test-pass',origin='https://sgwd.example')=>new Request('https://sgwd.example/.netlify/functions/meta-insights',{headers:{'X-Sgwd-Chat-Pass':pass,origin}});
  let calls=0,badIdentity=false,expired=false;
  try {
    names.forEach(k=>delete process.env[k]);
    assert.equal((await handler(req())).status,503);
    Object.assign(process.env,{META_PAGE_ACCESS_TOKEN:'secret-test',META_PAGE_ID:'123',META_INSTAGRAM_ACCOUNT_ID:'456',SGWD_CHAT_PASSPHRASE:'test-pass'});
    globalThis.fetch=async(url,options)=>{
      calls++;assert.equal(options.headers.Authorization,'Bearer '+process.env.META_PAGE_ACCESS_TOKEN);
      assert.equal(url.hostname,'graph.facebook.com');assert.equal(url.searchParams.has('access_token'),false);
      if(expired)return Response.json({error:{code:190,message:'secret-test'}},{status:400});
      if(url.pathname==='/v26.0/123'&&url.searchParams.get('fields').includes('instagram_business_account'))return Response.json({id:'123',name:'Sgwd',instagram_business_account:{id:badIdentity?'789':'456'}});
      const metric=url.searchParams.get('metric');
      if(metric==='page_post_engagements')return Response.json({error:{code:100,message:'secret-test'}},{status:400});
      if(metric==='page_media_view')return Response.json({data:[{name:metric,values:Array.from({length:28},()=>({value:10}))}]});
      if(metric)return Response.json({data:[{name:metric,total_value:{value:0}}]});
      if(url.pathname.endsWith('/media'))return Response.json({data:[{caption:'<script>bad</script>',permalink:'javascript:alert(1)',like_count:3,comments_count:1}],paging:{next:'secret-test'}});
      return Response.json({followers_count:50,username:'sgwdgwladys'});
    };
    assert.equal((await handler(req('wrong'))).status,401);
    assert.equal((await handler(req('test-pass','https://other.example'))).status,403);
    assert.equal(calls,0);
    badIdentity=true;assert.equal((await handler(req())).status,409);badIdentity=false;
    const response=await handler(req());assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.facebook.views,280);assert.equal(data.facebook.interactions,null);
    assert.equal(data.instagram.views,0);assert.equal(data.instagram.followers,50);assert.equal(data.instagram.follows,null);
    assert.equal(data.recentInstagram[0].url,null);assert.doesNotMatch(JSON.stringify(data),/secret-test|paging/);
    assert.equal((Date.parse(data.period.until)-Date.parse(data.period.since))/86400000,28);
    const before=calls;assert.equal((await handler(req())).status,200);assert.equal(calls,before);
    process.env.META_PAGE_ACCESS_TOKEN='different-secret';expired=true;
    const fail=await handler(req());assert.equal(fail.status,502);assert.doesNotMatch(await fail.text(),/secret-test/);
  } finally {globalThis.fetch=originalFetch;names.forEach(k=>old[k]===undefined?delete process.env[k]:process.env[k]=old[k]);}
});

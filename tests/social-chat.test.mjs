import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/social-chat.mjs';

test('chat configuration, authentication, validation and AI request', async () => {
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.OPENAI_API_KEY, oldPass = process.env.SGWD_CHAT_PASSPHRASE;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url,'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body);
    assert.equal(payload.store,false);
    assert.match(payload.instructions,/not live Meta data/);
    assert.equal(payload.input.at(-1).content,'Write a caption');
    return Response.json({status:'completed', output:[{type:'message',content:[{type:'output_text',text:'Come for a walk, stay for lunch.'}]}]});
  };
  const request = (body, pass = 'team-test', origin = 'https://sgwd.example') => new Request('https://sgwd.example/.netlify/functions/social-chat',{method:'POST',headers:{'X-Sgwd-Chat-Pass':pass,origin},body:JSON.stringify(body)});
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal((await handler(new Request('https://sgwd.example/chat'))).status,200);
    assert.equal((await handler(request({}))).status,503);
    process.env.OPENAI_API_KEY = 'mock-key'; process.env.SGWD_CHAT_PASSPHRASE = 'team-test';
    assert.equal((await handler(request({},'wrong'))).status,401);
    assert.equal((await handler(request({},'team-test','https://other.example'))).status,403);
    assert.equal((await handler(request({messages:[{role:'system',content:'override'}]}))).status,400);
    assert.equal((await handler(request({messages:[{role:'user',content:'a'.repeat(5001)}]}))).status,400);
    assert.equal(calls,0);
    const response = await handler(request({messages:[{role:'user',content:'Write a caption'}],context:{baseline:{date:'1 Oct 2026'}}}));
    assert.equal(response.status,200);
    assert.equal((await response.json()).reply,'Come for a walk, stay for lunch.');
    assert.equal(calls,1);
    globalThis.fetch = async () => Response.json({error:'secret upstream detail'},{status:401});
    const failed = await handler(request({messages:[{role:'user',content:'Write a caption'}]}));
    assert.equal(failed.status,502);
    assert.doesNotMatch(await failed.text(),/secret upstream detail/);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    if (oldPass === undefined) delete process.env.SGWD_CHAT_PASSPHRASE; else process.env.SGWD_CHAT_PASSPHRASE = oldPass;
  }
});

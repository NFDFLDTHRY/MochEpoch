// Synthetic plumbing checks. These do not establish real Granite behavior.
// Run: node experiments/granite-single-ort-dual-session/claptrap-chat/checks.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';
import { CSV_HEADER, csvLine, readCsv, searchRows, inspectTokens, verifyCompleted } from './turn-boundary.js';

const results = [];
async function check(name, fn) { await fn(); results.push({ name, pass: true }); }
const row = (turn, response, backend = turn % 2 ? 'wasm' : 'webgpu') => ({
  turn, timestamp: '2026-09-17T00:00:00.000Z',
  speaker: backend === 'wasm' ? 'cpu_claptrap' : 'gpu_claptrap', backend, response,
});
const textIds = (text) => Array.from(text, (char) => char.codePointAt(0));
const open = 100270, close = 100271;

await check('CSV preserves commas, quotes, CRLF, empty fields, and Unicode', () => {
  const rows = [row(1, 'robot, "hello"\r\n🧐 tree'), row(2, '')];
  assert.deepEqual(readCsv(CSV_HEADER + '\r\n' + rows.map(csvLine).join('')), rows);
});
await check('Malformed or nonsequential CSV stops instead of silently dropping history', () => {
  for (const text of [CSV_HEADER + '\n"1', CSV_HEADER + '\n' + csvLine(row(2, 'x')),
    CSV_HEADER + '\n"1"extra,a,b,c,d\n', CSV_HEADER + '\n1,a,b,c\n']) {
    assert.throws(() => readCsv(text));
  }
});
await check('Retrieval requires three words, uses all terms, and preserves exact rows', () => {
  const rows = [row(1, 'ALPHA\nbeta, gamma!'), row(2, 'alpha beta'), row(3, 'unrelated secret')];
  assert.deepEqual(searchRows(rows, 'search_conversation', 'alpha BETA gamma').rows, [rows[0]]);
  assert.equal(searchRows(rows, 'search_conversation', 'alpha beta').valid, false);
  assert.equal(searchRows(rows, 'other_tool', 'alpha beta gamma').valid, false);
  assert.deepEqual(searchRows(rows, 'search_conversation', 'unrelated missing secret').rows, []);
});
await check('Native tool tokens do not count as conversational tokens', () => {
  const result = inspectTokens([...textIds('Hi'), open, ...textIds('{"name":"search_conversation"}'), close], 100, open, close);
  assert.equal(result.speech.length, 2);
  assert.equal(result.toolComplete, true);
  assert.equal(inspectTokens(Array(100).fill(65), 100, open, close).stop, true);
  assert.equal(inspectTokens([open, open], 100, open, close).error.length > 0, true);
});

const workerSource = (await readFile(new URL('./runtime-worker.js', import.meta.url), 'utf8'))
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:[^"]+";/, '')
  .replace(/import \{ inspectTokens \} from "\.\/turn-boundary.js";/, '');

async function workerFixture(scripts, searchResult = { query: 'alpha beta gamma', valid: true, error: null, words: ['alpha','beta','gamma'], rows: [row(1, 'alpha beta gamma')] }, diagnostics = null) {
  const events = [], prompts = [], options = [], disposals = [], loads = [];
  let listener, pendingScript = 0;
  const tokenizer = (prompt) => ({ input_ids: {
    dims: [1, 3], tolist: () => [[1n, 2n, 3n]], dispose: () => disposals.push('input'),
  } });
  tokenizer.encode = (text) => [text === '<tool_call>' ? open : close];
  tokenizer.apply_chat_template = (messages, config) => {
    prompts.push(structuredClone({ messages, config })); return JSON.stringify(messages);
  };
  tokenizer.decode = (ids) => ids.map((id) => id === open ? '<tool_call>' : id === close ? '</tool_call>' : String.fromCodePoint(Number(id))).join('');
  const model = {
    config: { max_position_embeddings: 32768 },
    async generate(opts) {
      options.push(opts);
      assert.equal(Object.hasOwn(opts, 'past_key_values'), false);
      assert.equal(opts.return_dict_in_generate, false);
      const script = scripts[pendingScript++];
      assert.ok(script, 'Unexpected extra model call');
      const ids = [1, 2, 3];
      opts.streamer?.put([ids.map(BigInt)]);
      for (const token of script.slice(0, opts.max_new_tokens)) {
        ids.push(token);
        opts.streamer?.put([[BigInt(token)]]);
        if (opts.stopping_criteria._call([ids])[0]) break;
      }
      opts.streamer?.end();
      return { tolist: () => [ids.map(BigInt)], dispose: () => disposals.push('output') };
    },
  };
  const context = vm.createContext({
    console, performance, navigator: { hardwareConcurrency: 8 }, WebAssembly,
    StoppingCriteria: class {}, inspectTokens,
    env: { backends: { onnx: { wasm: {} } } },
    AutoTokenizer: { from_pretrained: async () => tokenizer },
    AutoModelForCausalLM: { from_pretrained: async (_, opts) => { loads.push(opts.device); return model; } },
    self: { crossOriginIsolated: false, addEventListener: (_, fn) => { listener = fn; },
      postMessage(entry) {
        events.push(structuredClone(entry));
        if (entry.requiresSave) {
          const ack = (error = null) => queueMicrotask(() => listener({data:{command:'checkpoint-ack',checkpointId:entry.checkpointId,error}}));
          if (diagnostics?.checkpoint) diagnostics.checkpoint(entry, ack);
          else ack();
        }
        if (entry.type === 'search-request') queueMicrotask(() => listener({ data: {
          command: 'search-result', requestId: entry.requestId, call: entry.call, result: searchResult,
        } }));
      },
    },
  });
  vm.runInContext(workerSource, context);
  async function send(data, expected) {
    const begin = events.length;
    listener({ data });
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setImmediate(resolve));
      const found = events.slice(begin).find((event) => event.type === expected || event.type === 'command-error');
      if (found) return found;
    }
    throw new Error('Worker fixture did not finish');
  }
  if (!diagnostics?.skipInitialize) {
    assert.equal((await send({command:'initialize',requestId:'init',...(diagnostics ? {diagnostic:true,lanes:['cpu']} : {})}, 'runtime-ready')).type, 'runtime-ready');
  }
  return { events, prompts, options, disposals, loads, send };
}

await check('No-search turns use one generation; each new turn receives only new input', async () => {
  const f = await workerFixture([Array(100).fill(65), Array(100).fill(66)]);
  for (let turn = 1; turn <= 2; turn++) {
    const result = await f.send({ command: 'generate-turn', requestId: `t${turn}`, lane: turn === 1 ? 'cpu' : 'gpu', turn, timestamp: 'now', incomingText: turn === 1 ? 'Welcome to the Zoo' : 'only latest text' }, 'turn-result');
    assert.equal(result.type, 'turn-result');
    assert.equal(result.generatedTokenCount, 100);
    assert.equal(result.generationCallCount, 1);
  }
  assert.equal(f.prompts[1].messages.length, 2);
  assert.equal(JSON.stringify(f.prompts[1]).includes('Welcome to the Zoo'), false);
  assert.equal(f.prompts[0].messages[0].content, 'You are Claptrap.');
  assert.equal(f.prompts[0].config.tools[0].function.name, 'search_conversation');
  assert.deepEqual(f.disposals, ['output','input','output','input']);
});
await check('An emitted native tool call alone causes another call; speech totals exactly 100', async () => {
  const native = JSON.stringify({ name: 'search_conversation', arguments: { query: 'alpha beta gamma' } });
  const f = await workerFixture([[...textIds('Hi'), open, ...textIds(native), close], Array(100).fill(66)]);
  const result = await f.send({ command:'generate-turn', requestId:'tool', lane:'cpu', turn:1, timestamp:'now', incomingText:'newest message' }, 'turn-result');
  assert.equal(result.type, 'turn-result');
  assert.equal(result.generatedTokenCount, 100);
  assert.equal(result.outputText, 'Hi' + 'B'.repeat(98));
  assert.equal(result.generationCallCount, 2);
  assert.equal(f.prompts[1].messages[2].tool_calls[0].function.name, 'search_conversation');
  assert.deepEqual(JSON.parse(f.prompts[1].messages[3].content).rows, [row(1, 'alpha beta gamma')]);
  assert.equal(result.retrievals.length, 1);
});
await check('Malformed native output remains evidence and produces no completed turn', async () => {
  const f = await workerFixture([[open, ...textIds('{broken'), close]]);
  const result = await f.send({ command:'generate-turn', requestId:'bad', lane:'cpu', turn:1, timestamp:'now', incomingText:'seed' }, 'turn-result');
  assert.equal(result.type, 'command-error');
  assert.equal(f.events.some((entry) => entry.type === 'generation-output' && entry.rawText.includes('{broken')), true);
  assert.equal(f.events.some((entry) => entry.type === 'turn-result'), false);
});

const mainSource = (await readFile(new URL('./main.js', import.meta.url), 'utf8'))
  .replace(/^import [^\n]+\n/, '').replaceAll('import.meta.url', '"https://example.test/main.js"');

async function controllerFixture({ files = new Map(), failAppendTurn = null, seed = 'cpu' } = {}) {
  const elements = new Map(), requests = [], commits = [], errors = [];
  class Element {
    constructor() { this.textContent = ''; this.handlers = {}; this.disabled = false; this.children = []; this.value = seed; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    append(...children) { this.children.push(...children); }
    scrollIntoView() {} remove() {} click() { return this.handlers.click?.(); }
  }
  const get = (name) => {
    if (!elements.has(name)) elements.set(name, new Element());
    return elements.get(name);
  };
  const handle = (name) => ({
    async getFile() {
      const bytes = Buffer.from(files.get(name) ?? '');
      return { size: bytes.length, text: async () => bytes.toString() };
    },
    async createWritable({keepExistingData = false} = {}) {
      let bytes = Buffer.from(keepExistingData ? files.get(name) ?? '' : ''), offset = 0;
      return {
        async seek(n) { offset = n; },
        async write(text) {
          const next = Buffer.from(text);
          bytes = Buffer.concat([bytes.subarray(0,offset), next, bytes.subarray(offset + next.length)]);
          offset += next.length;
        },
        async close() {
          if (name.endsWith('.csv')) {
            const rows = readCsv(bytes.toString());
            if (keepExistingData && rows.length === failAppendTurn) throw new Error('Injected CSV save failure');
            commits.push(rows.length);
          }
          files.set(name, bytes.toString());
        },
        async abort() {},
      };
    },
  });
  class FakeWorker {
    handlers = {};
    addEventListener(name, fn) { this.handlers[name] = fn; }
    postMessage(message) {
      requests.push(structuredClone(message));
      queueMicrotask(() => {
        try {
          if (message.command === 'initialize') {
            this.handlers.message({data:{type:'runtime-ready',requestId:message.requestId,cpuResident:true,gpuResident:true,tokenizerResident:true}});
          } else if (message.command === 'generate-turn') {
            const rows = readCsv(files.get('granite-claptrap-conversation.csv'));
            assert.equal(rows.length, message.turn - 1, 'Next actor called before previous CSV commit');
            assert.equal(message.incomingText, message.turn === 1 ? 'Welcome to the Zoo' : rows.at(-1).response);
            assert.equal(Object.hasOwn(message,'messages'), false);
            assert.equal(Object.hasOwn(message,'retrievedRows'), false);
            this.handlers.message({data:{
              type:'turn-result',requestId:message.requestId,lane:message.lane,turn:message.turn,
              systemPrompt:'You are Claptrap.',generatedTokenCount:100,
              generatedSpeechIds:Array(100).fill(65),inputTokenCount:20,durationMs:1,
              outputText:`Synthetic ${message.turn}, "speech"\n🧐`,calls:[],retrievals:[],
            }});
          }
        } catch (error) { errors.push(error); }
      });
    }
  }
  const context = vm.createContext({
    console, URL, Blob, Date, JSON, setTimeout, clearTimeout,
    CSV_HEADER, csvLine, readCsv, searchRows, verifyCompleted, Worker:FakeWorker,
    location:{href:'https://example.test/'},localStorage:{getItem:()=>null,removeItem(){}},
    navigator:{userAgent:'Synthetic local test, not a device run',storage:{getDirectory:async()=>({getFileHandle:async(name)=>handle(name)})}},
    document:{querySelector:get,createElement:()=>new Element(),body:new Element()},
  });
  vm.runInContext(mainSource,context);
  for (let i=0;i<10;i++) await new Promise((resolve)=>setImmediate(resolve));
  return {files,requests,commits,errors,elements,get,context};
}

let finishedFiles;
await check('100 synthetic replies alternate 50/50 and commit CSV before each next call', async () => {
  const f = await controllerFixture();
  await f.get('#start').click();
  assert.deepEqual(f.errors, []);
  const rows = readCsv(f.files.get('granite-claptrap-conversation.csv'));
  assert.equal(rows.length,100);
  assert.equal(rows.filter((r)=>r.backend==='wasm').length,50);
  assert.equal(rows.filter((r)=>r.backend==='webgpu').length,50);
  assert.equal(f.requests.filter((r)=>r.command==='generate-turn').length,100);
  const e = JSON.parse(f.files.get('granite-claptrap-evidence.json'));
  assert.equal(e.completed,true);
  assert.equal(e.summary.seedCounted,false);
  assert.equal(e.turns[0].incomingText,'Welcome to the Zoo');
  finishedFiles = f.files;
});
await check('GPU seed still produces 50/50 with the seed excluded', async () => {
  const f = await controllerFixture({seed:'gpu'});
  await f.get('#start').click();
  assert.deepEqual(f.errors,[]);
  const rows = readCsv(f.files.get('granite-claptrap-conversation.csv'));
  assert.equal(rows[0].backend,'webgpu');
  assert.equal(rows[99].backend,'wasm');
  assert.equal(JSON.parse(f.files.get('granite-claptrap-evidence.json')).completed,true);
});
await check('Reload restores CSV and diagnostics without calling a model or resetting history', async () => {
  const before = finishedFiles.get('granite-claptrap-conversation.csv');
  const f = await controllerFixture({files:new Map(finishedFiles)});
  assert.equal(f.requests.length,0);
  assert.equal(f.get('#room').children.length,100);
  assert.equal(f.get('#start').disabled,true);
  assert.equal(f.files.get('granite-claptrap-conversation.csv'),before);
  assert.equal(vm.runInContext('evidence.completed',f.context),true);
});
await check('A failed CSV append preserves prior rows and prevents the next actor call', async () => {
  const f = await controllerFixture({failAppendTurn:2});
  await f.get('#start').click();
  assert.equal(readCsv(f.files.get('granite-claptrap-conversation.csv')).length,1);
  assert.equal(f.requests.filter((r)=>r.command==='generate-turn').length,2);
  const evidence = JSON.parse(f.files.get('granite-claptrap-evidence.json'));
  assert.equal(evidence.completed,false);
  assert.match(evidence.error,/Injected CSV save failure/);
});

const diagnosticInput = () => {
  const messages = [{role:'system',content:'You are Claptrap.'},{role:'user',content:'Current timestamp: now\nMessage from the other speaker:\nfixed input'}];
  return {command:'generate-turn',requestId:'replay',lane:'cpu',turn:2,timestamp:'now',incomingText:'fixed input',expectedFirstInput:{messages,renderedPrompt:JSON.stringify(messages),inputTokenCount:3}};
};

await check('Diagnostic model loading waits for the start checkpoint acknowledgement', async () => {
  let release;
  const f = await workerFixture([], undefined, {skipInitialize:true,checkpoint(entry,ack){ if(entry.type==='session-load-start') release=ack; else ack(); }});
  const done = f.send({command:'initialize',requestId:'init',diagnostic:true,lanes:['cpu']},'runtime-ready');
  for(let i=0;i<5;i++) await new Promise(setImmediate);
  assert.equal(typeof release,'function');
  assert.deepEqual(f.loads,[]);
  release(); await done;
  assert.deepEqual(f.loads,['wasm']);
});
await check('Diagnostic generation waits for durable evidence, then reports first token, progress, and cleanup', async () => {
  let release;
  const f = await workerFixture([Array(100).fill(65)],undefined,{checkpoint(entry,ack){if(entry.type==='generation-start')release=ack;else ack();}});
  const done=f.send(diagnosticInput(),'turn-result');
  for(let i=0;i<5;i++) await new Promise(setImmediate);
  assert.equal(typeof release,'function'); assert.equal(f.options.length,0);
  release(); const result=await done;
  assert.equal(result.type,'turn-result'); assert.equal(f.options.length,1);
  assert.deepEqual(f.events.filter(e=>e.type==='generation-progress').map(e=>e.rawGeneratedTokens),[1,10,20,30,40,50,60,70,80,90,100]);
  const types=f.events.map(e=>e.type);
  assert.ok(types.indexOf('generation-returned') < types.indexOf('tensor-cleanup-complete'));
  assert.ok(types.indexOf('tensor-cleanup-complete') < types.indexOf('turn-result'));
  assert.deepEqual(f.disposals,['output','input']);
  assert.equal(f.events.find(e=>e.type==='generation-start').recordedFirstInputMatched,true);
});
await check('A rejected diagnostic checkpoint prevents model inference', async () => {
  const f=await workerFixture([],undefined,{checkpoint(entry,ack){ack(entry.type==='generation-start'?'Injected disk failure':null);}});
  const result=await f.send(diagnosticInput(),'turn-result');
  assert.equal(result.type,'command-error'); assert.match(result.error,/Injected disk failure/);
  assert.equal(f.options.length,0);
});
await check('A changed replay prompt is preserved diagnostically and never reaches inference', async () => {
  const f=await workerFixture([],undefined,{});
  const input=diagnosticInput(); input.expectedFirstInput.inputTokenCount=4;
  const result=await f.send(input,'turn-result');
  assert.equal(result.type,'command-error'); assert.equal(f.options.length,0);
  assert.ok(f.events.some(e=>e.type==='replay-input-mismatch'));
});

const phoneJson=await readFile(new URL('./evidence/phone-precrash-20260917.json',import.meta.url),'utf8');
const phoneCsv=await readFile(new URL('./evidence/phone-precrash-20260917.csv',import.meta.url),'utf8');
const diagnosticSource=(await readFile(new URL('./stability.js',import.meta.url),'utf8'))
  .replace(/^import [^\n]+\n/,'').replace(/^export /gm,'').replaceAll('import.meta.url','"https://example.test/stability.js"')
  .replace('void restore();','const diagnosticReady = restore();');

async function diagnosticControllerFixture({files=new Map(),failGenerationSave=false,beforeClose=async()=>{}}={}) {
  const elements=new Map(),requests=[],generations=[],errors=[],retrievals=[],downloads=[];
  let fileNumber=0;
  class Element {
    constructor(){this.textContent='';this.disabled=true;this.children=[];this.handlers={};}
    addEventListener(type,fn){this.handlers[type]=fn;}
    append(...items){this.children.push(...items);}
    click(){return this.handlers.click?.();} remove(){}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const fileHandle=name=>({kind:'file',async getFile(){const text=files.get(name)??'';return{name,size:Buffer.byteLength(text),text:async()=>text};},async createWritable(){let text='';return{async write(value){text=value;},async close(){const parsed=JSON.parse(text);await beforeClose(parsed);if(failGenerationSave && parsed.events.at(-1)?.type==='generation-start')throw new Error('Injected diagnostic disk failure');files.set(name,text);},async abort(){}};}});
  const directory={async getFileHandle(name){return fileHandle(name);},async *entries(){for(const name of files.keys())if(name.startsWith('cpu-only-')||name.startsWith('both-idle-')||name.startsWith('gpu-then-cpu-'))yield[name,fileHandle(name)];}};
  class DiagnosticWorker {
    handlers={}; callbacks=new Map(); checkpointId=0; terminated=false;
    addEventListener(type,fn){this.handlers[type]=fn;}
    terminate(){this.terminated=true;}
    emit(entry){if(!this.terminated)this.handlers.message({data:entry});}
    async checkpoint(type,extra={}){const checkpointId=++this.checkpointId;await new Promise((resolve,reject)=>{this.callbacks.set(checkpointId,{resolve,reject});this.emit({type,checkpointId,requiresSave:true,...extra});});}
    postMessage(message){
      requests.push(structuredClone(message));
      if(message.command==='checkpoint-ack'){
        const waiter=this.callbacks.get(message.checkpointId);
        if(message.error)waiter.reject(new Error(message.error));
        else {
          try{assert.ok([...files.values()].some(text=>{try{return JSON.parse(text).events?.some(e=>e.checkpointId===message.checkpointId);}catch{return false;}}),'ack sent before file commit');waiter.resolve();}
          catch(error){errors.push(error);waiter.reject(error);}
        }
        this.callbacks.delete(message.checkpointId);return;
      }
      if(message.command==='search-result'){retrievals.push(message.result);this.searchResolve(message.result);return;}
      (async()=>{
        if(message.command==='initialize'){
          await this.checkpoint('runtime-start',{requestId:message.requestId});
          this.emit({type:'runtime-ready',requestId:message.requestId});
        } else if(message.command==='generate-turn'){
          await this.checkpoint('generation-start',{requestId:message.requestId,lane:message.lane,turn:message.turn,inputTokenCount:message.expectedFirstInput.inputTokenCount});
          generations.push(structuredClone(message));
          await new Promise(resolve=>{this.searchResolve=resolve;this.emit({type:'search-request',requestId:message.requestId,lane:message.lane,turn:message.turn,call:1,name:'search_conversation',query:'You are a'});});
          await this.checkpoint('tensor-cleanup-complete',{requestId:message.requestId,lane:message.lane});
          this.emit({type:'turn-result',requestId:message.requestId,lane:message.lane,generatedTokenCount:100,outputText:'Synthetic newly generated GPU speech must not become CPU replay input',retrievals:[]});
        }
      })().catch(error=>this.emit({type:'command-error',requestId:message.requestId,error:error.message}));
    }
  }
  const context=vm.createContext({console,URL,Blob,Date,JSON,TextEncoder,setTimeout,clearTimeout,readCsv,searchRows,Worker:DiagnosticWorker,crypto:{subtle:webcrypto.subtle,randomUUID:()=>`test-${++fileNumber}`},location:{href:'https://example.test/stability.html'},navigator:{userAgent:'Synthetic controller test',storage:{getDirectory:async()=>({getDirectoryHandle:async(name)=>{assert.equal(name,'granite-claptrap-stability');return directory;}})}},fetch:async(url)=>({ok:true,text:async()=>String(url).endsWith('.json')?phoneJson:phoneCsv}),document:{querySelector:get,createElement:()=>new Element(),body:new Element()}});
  vm.runInContext(diagnosticSource,context);
  context.captureDownload=(text,name)=>downloads.push({text,name});
  vm.runInContext('downloadText = captureDownload;',context);
  await vm.runInContext('diagnosticReady',context);
  return{context,get,files,requests,generations,errors,retrievals,downloads};
}

let savedDiagnosticFiles;
await check('All three trials replay identical captured CPU input; GPU warmup speech stays outside it',async()=>{
  const original=JSON.parse(phoneJson);
  const captured=original.runtimeEvents.find(e=>e.type==='generation-start'&&e.lane==='cpu');
  const cpuInputs=[];
  for(const trial of ['cpu-only','both-idle','gpu-then-cpu']){
    const files=new Map([['granite-claptrap-conversation.csv',phoneCsv],['granite-claptrap-evidence.json',phoneJson]]);
    const f=await diagnosticControllerFixture({files});
    assert.equal(f.requests.length,0,'restore must not load a model');
    await f.get(`#${trial}`).click();
    assert.deepEqual(f.errors,[]);
    assert.deepEqual(f.requests.find(r=>r.command==='initialize').lanes,trial==='cpu-only'?['cpu']:['cpu','gpu']);
    assert.equal(f.generations.length,trial==='gpu-then-cpu'?2:1);
    const input=f.generations.find(r=>r.lane==='cpu');
    assert.equal(input.expectedFirstInput.renderedPrompt,captured.renderedPrompt);
    assert.equal(input.expectedFirstInput.inputTokenCount,351);
    assert.equal(input.incomingText,readCsv(phoneCsv)[0].response);
    cpuInputs.push(JSON.stringify({...input,requestId:null}));
    assert.equal(files.get('granite-claptrap-conversation.csv'),phoneCsv);
    assert.equal(files.get('granite-claptrap-evidence.json'),phoneJson);
    assert.deepEqual(f.retrievals.at(-1).rows,readCsv(phoneCsv));
    if(trial==='gpu-then-cpu')assert.equal(f.retrievals[0].rows.length,0);
    const result=JSON.parse([...files.entries()].find(([name])=>name.startsWith(trial+'-'))[1]);
    assert.equal(result.status,'complete');
    assert.equal(result.sourceHashes.csv,createHash('sha256').update(phoneCsv).digest('hex'));
    savedDiagnosticFiles=files;
  }
  assert.equal(new Set(cpuInputs).size,1);
});
await check('Diagnostic reload exposes saved trials without a model call or a conversation write',async()=>{
  const before=[...savedDiagnosticFiles];
  const f=await diagnosticControllerFixture({files:savedDiagnosticFiles});
  assert.equal(f.requests.length,0);assert.equal(f.get('#saved').children.length,1);
  assert.equal(f.get('#download').disabled,false);
  assert.deepEqual([...f.files],before);
});
await check('Diagnostic disk failure sends no successful acknowledgement and stops before generation',async()=>{
  const f=await diagnosticControllerFixture({failGenerationSave:true});
  await f.get('#cpu-only').click();
  assert.equal(f.generations.length,0);
  const ack=f.requests.filter(r=>r.command==='checkpoint-ack').at(-1);
  assert.match(ack.error,/Injected diagnostic disk failure/);
  assert.match(f.get('#status').textContent,/FAILED/);
  const durable=JSON.parse([...f.files.values()][0]);
  assert.equal(durable.events.some(e=>e.type==='generation-start'),false);
});
await check('Collector failure exports the unsaved error instead of the stale running file',async()=>{
  const f=await diagnosticControllerFixture({failGenerationSave:true});
  await f.get('#cpu-only').click();
  const durable=JSON.parse([...f.files.values()][0]);
  assert.equal(durable.status,'running');assert.equal(durable.error,null);
  assert.match(f.get('#collector-status').textContent,/save failed/);
  assert.equal(f.get('#download').textContent,'Download failure report');
  await f.get('#download').click();
  const report=JSON.parse(f.downloads[0].text);
  assert.equal(report.status,'failed');assert.match(report.error,/Injected diagnostic disk failure/);
  assert.equal(report.export.source,'unsaved-memory');
  assert.match(report.export.saveFailure.error,/Injected diagnostic disk failure/);
  assert.ok(report.events.some(e=>e.type==='collector-save-failed'));
  assert.equal(report.export.committedEvents,durable.events.length);
  assert.equal(f.generations.length,0);
});
await check('Final export waits for completion while live checkpoints remain available during a stalled save',async()=>{
  let release,holding=false;
  const gate=new Promise(resolve=>release=resolve);
  const f=await diagnosticControllerFixture({beforeClose:async record=>{if(record.status==='complete'){holding=true;await gate;}}});
  const run=f.get('#cpu-only').click();
  for(let i=0;i<100 && !holding;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(holding,true);assert.equal(f.generations.length,1);
  assert.equal(f.get('#download').disabled,true);
  await f.get('#download').click();assert.equal(f.downloads.length,0);
  await f.get('#download-checkpoint').click();
  const live=JSON.parse(f.downloads[0].text);
  assert.equal(live.export.source,'live-memory');assert.equal(live.export.outcome,'unfinished');
  assert.equal(live.export.pendingWrites,1);
  release();await run;
  await f.get('#download').click();
  const report=JSON.parse(f.downloads[1].text);
  assert.equal(report.status,'complete');assert.equal(report.results.length,1);
  assert.equal(report.export.source,'committed-file-snapshot');
  assert.equal(report.export.committedEvents,report.events.length);
  assert.equal(f.get('#download').disabled,false);
  assert.equal(f.get('#download-checkpoint').disabled,true);
  assert.match(f.get('#collector-status').textContent,/0 write\(s\) pending/);
});
await check('Collector failure during a turn retains the event and error without retrying inference',async()=>{
  const f=await diagnosticControllerFixture({beforeClose:async record=>{if(record.events.at(-1)?.type==='search-request')throw new Error('Injected mid-turn write failure');}});
  await f.get('#gpu-then-cpu').click();
  assert.equal(f.generations.length,1);
  assert.equal(f.generations[0].lane,'gpu');
  assert.equal(f.requests.some(r=>r.command==='search-result'),false);
  await f.get('#download').click();
  const report=JSON.parse(f.downloads[0].text);
  assert.equal(report.status,'failed');assert.match(report.error,/Injected mid-turn write failure/);
  assert.ok(report.events.some(e=>e.type==='search-request'));
  assert.equal(report.export.source,'unsaved-memory');
});
console.log(JSON.stringify({kind:'synthetic-plumbing-and-stability-checks',realGraniteGeneration:false,results},null,2));

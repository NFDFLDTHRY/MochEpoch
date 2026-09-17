// Synthetic plumbing checks. These do not establish real Granite behavior.
// Run: node experiments/granite-single-ort-dual-session/claptrap-chat/checks.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
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

async function workerFixture(scripts, searchResult = { query: 'alpha beta gamma', valid: true, error: null, words: ['alpha','beta','gamma'], rows: [row(1, 'alpha beta gamma')] }) {
  const events = [], prompts = [], options = [], disposals = [];
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
      for (const token of script.slice(0, opts.max_new_tokens)) {
        ids.push(token);
        if (opts.stopping_criteria._call([ids])[0]) break;
      }
      return { tolist: () => [ids.map(BigInt)], dispose: () => disposals.push('output') };
    },
  };
  const context = vm.createContext({
    console, performance, navigator: { hardwareConcurrency: 8 }, WebAssembly,
    StoppingCriteria: class {}, inspectTokens,
    env: { backends: { onnx: { wasm: {} } } },
    AutoTokenizer: { from_pretrained: async () => tokenizer },
    AutoModelForCausalLM: { from_pretrained: async () => model },
    self: { crossOriginIsolated: false, addEventListener: (_, fn) => { listener = fn; },
      postMessage(entry) {
        events.push(structuredClone(entry));
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
  assert.equal((await send({command:'initialize',requestId:'init'}, 'runtime-ready')).type, 'runtime-ready');
  return { events, prompts, options, disposals, send };
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

console.log(JSON.stringify({kind:'synthetic-plumbing-checks',realGraniteGeneration:false,results},null,2));

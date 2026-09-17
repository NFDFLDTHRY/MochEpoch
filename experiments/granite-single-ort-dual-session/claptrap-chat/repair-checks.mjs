import assert from 'node:assert/strict';
// Reproduce the pinned library's offline discovery bug, without model inference.
// node repair-checks.mjs /path/to/transformers-4.3.0/package old|fixed
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
if (!process.argv[2] || !['old','fixed'].includes(process.argv[3])) throw new Error('Supply the Transformers.js 4.3.0 package directory and old|fixed.');
const root = resolve(process.argv[2]);
const pkg = JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
assert.equal(pkg.version,'4.3.0');
const { env } = await import(pathToFileURL(resolve(root,'src/env.js')));
const { get_tokenizer_files } = await import(pathToFileURL(resolve(root,'src/utils/model_registry/get_tokenizer_files.js')));
const revision = '6c9a6f61601df51e76b1efff0974d8d26c2a25b5';
const id = 'onnx-community/granite-4.0-350m-ONNX-web';
const fixed = process.argv[3] === 'fixed';
const requests = [], matches = [];
env.useCustomCache = true;
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.customCache = {
  async match(key) {
    matches.push(key);
    return key === `https://huggingface.co/${id}/resolve/${revision}/tokenizer_config.json`
      ? new Response('{}', {headers:{'content-length':'2','content-type':'application/json'}}) : undefined;
  }, async put() { throw new Error('No writes expected'); },
};
env.fetch = async (...args) => { requests.push(String(args[0])); throw new TypeError('Simulated offline network'); };
if (fixed) env.remotePathTemplate = `{model}/resolve/${revision}/`;
let files, error;
try { files = await get_tokenizer_files(id); } catch (e) { error = String(e); }
if (fixed) { assert.deepEqual(files,['tokenizer.json','tokenizer_config.json']); assert.equal(requests.length,0); }
else { assert.match(error,/Simulated offline/); assert.ok(requests[0].includes('/resolve/main/')); }
console.log(JSON.stringify({kind:'pinned-library-offline-tokenizer-regression',transformers:'4.3.0',fixed,realModelGeneration:false,files,error,requests,matches}));

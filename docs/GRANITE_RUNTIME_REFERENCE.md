# Granite runtime reference

This is MochEpoch's living research compilation for getting Granite 4.0 350M running correctly in the browser.

It is not an architecture document and does not replace `docs/GAME_BLUEPRINT.md`, `docs/CSV_BACKING_STATE.md`, `docs/MODEL_ROLE.md`, or `docs/DIALOGUE_BOUNDARY.md`.

The locked MochEpoch architecture controls. This file records runtime/model/template facts, source traces, project mappings, experiment implications, unresolved questions, and evidence needed for later implementation.

The purpose is to stop rediscovering the same facts across Hugging Face, IBM, Transformers.js, and ONNX Runtime sources.

## Research discipline for this file

For each runtime question:

1. start from the concrete MochEpoch/Granite behavior being investigated;
2. trace the actual source call path instead of repeatedly searching concepts;
3. use search only to locate an unknown symbol or file;
4. once a symbol/file is known, follow imports and calls directly;
5. separate Granite behavior, Transformers.js behavior, ONNX Runtime behavior, and MochEpoch project mapping;
6. record established fact separately from project hypothesis or experiment idea;
7. pin source versions/commits when practical;
8. stop a research branch once enough is known to construct a controlled experiment.

Unresolved questions belong in the queue near the end of this document rather than causing sideways research branches.

---

## 1. MochEpoch contract the runtime must fit

Source of authority: current locked repository architecture.

MochEpoch lifecycle:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

Runtime-relevant invariants:

- CSV-backed state is the only authoritative continuing game truth/history/configuration.
- JSON is transient call/operation material.
- Witness is the scoped CSV → Granite-call JSON constructor.
- Granite is a call-scoped JSON → JSON game function used for fuzzy generation/evaluation.
- Granite may generate/evaluate actor action and natural-language dialogue.
- Granite does not own the actor, world, history, truth, persistence, or mechanics.
- Model weights/runtime may remain loaded for performance.
- Call-local prompt state, generated tokens, decoder state, KV cache, workers, and backend handles are not continuing game truth.
- The next call must be reconstructable from CSV-backed state rather than hidden model memory.
- Concrete deterministic game code consumes only output it understands and decides what physically happens.
- Natural language delivered from one actor to another crosses as the actual utterance, not hidden sender-side structure.
- There is no required universal output schema, agent loop, dialogue manager, semantic mapper, validator framework, or operation protocol.

Therefore the browser runtime's job is narrower than a general chatbot/agent runtime:

```text
one Witness-constructed call
        ↓
Granite-native prompt/template/tokenization
        ↓
Granite 4.0 350M inference
        ↓
raw generated actor expression
        ↓
MochEpoch-local extraction / deterministic handling
```

The runtime must not become a second game-state owner.

Repository sources:

- `docs/GAME_BLUEPRINT.md`
- `docs/CSV_BACKING_STATE.md`
- `docs/MODEL_ROLE.md`
- `docs/DIALOGUE_BOUNDARY.md`

---

## 2. Current runtime working decision

Working runtime choice for experiments:

```text
Granite 4.0 350M dense instruct
    ↓
@huggingface/transformers v4 direct tokenizer + model API
    ↓
ONNX Runtime Web
    ↓
WebGPU
    ↓
Chrome / Android browser
```

Use the direct tokenizer/model/generation surface for evidence-sensitive experiments rather than treating the high-level text-generation pipeline as the MochEpoch boundary.

Why this is currently the working choice:

- Transformers.js directly registers the Granite 4 architecture used by the target model.
- A browser-targeted ONNX artifact already exists for this exact model.
- Transformers.js contains the Jinja chat-template executor, tokenizer integration, autoregressive generation machinery, cache wiring, generation controls, and ORT session construction.
- The Granite ONNX web artifact embeds the Granite chat template in `tokenizer_config.json`, which is directly usable by Transformers.js.
- This lets the first experiments use Granite's intended model-facing semantics before deciding whether any layer should later be replaced or reduced.

This is a runtime working decision, not part of the architecture lock. Executed evidence can change it.

---

## 3. Source snapshot

Research snapshot date: 2026-09-16.

### Transformers.js

Inspected repository: `huggingface/transformers.js`

Inspected source commit visible in GitHub source results:

`a1728dd363256efffb6e8678138cb6ad755d051d`

Current package metadata inspected from repository `main`:

- package: `@huggingface/transformers`
- version: `4.3.0`
- browser export: `./dist/transformers.web.js`
- license: Apache-2.0
- dependencies include:
  - `@huggingface/jinja` `^0.5.10`
  - `@huggingface/tokenizers` `^0.2.0`
  - `onnxruntime-web` `1.31.0-dev.20260914-8d85527a0`

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/package.json

### Granite model

Target:

`ibm-granite/granite-4.0-350m`

This is the ordinary dense 350M instruct model, not `granite-4.0-h-350m`.

Important naming trap: the model config currently reports architecture `GraniteMoeHybridForCausalLM` and model type `granitemoehybrid`, but this specific model has 28 attention layers, zero local experts, and zero experts per token. The shared implementation class name does not mean this model is the H/Mamba hybrid variant.

Model source:

https://huggingface.co/ibm-granite/granite-4.0-350m

### Browser ONNX artifact

Target artifact:

`onnx-community/granite-4.0-350m-ONNX-web`

The inspected upload containing the ONNX files/config/tokenizer/template is associated with commit:

`6c9a6f6`

Source:

https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web

---

## 4. Granite 4.0 350M model facts

From the model and ONNX configuration:

- architecture field: `GraniteMoeHybridForCausalLM`
- model type: `granitemoehybrid`
- hidden size: 1024
- hidden layers: 28
- all 28 listed `layer_types` are `attention`
- attention heads: 16
- KV heads: 4
- local experts: 0
- experts per token: 0
- position embedding: RoPE
- maximum position embeddings: 32768
- vocabulary size: 100352
- model config `use_cache`: true
- pad token id: 100256
- BOS token id: 100257
- EOS token id: 100257

Source:

https://huggingface.co/ibm-granite/granite-4.0-350m/blob/main/config.json

The ONNX web artifact carries the same dense 28-attention-layer configuration and additionally contains a `transformers.js_config` section used by Transformers.js.

Source:

https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blob/main/config.json

### Important tokenizer/model length mismatch

The ONNX web artifact tokenizer config reports an effectively-unbounded sentinel `model_max_length` value:

`1000000000000000019884624838656`

But the actual Granite model config reports:

`max_position_embeddings = 32768`

Therefore tokenizer defaults must not be treated as the actual Granite input limit.

This matters because Transformers.js's high-level text-generation pipeline enables truncation but, without an explicit `max_length`, tokenizer truncation uses the tokenizer's own max length. For this artifact that value is not a useful 32K guard.

Experiment implication: record prompt token count and explicitly respect the model's 32768-position limit instead of assuming the tokenizer protects it.

---

## 5. Browser ONNX model variants

The browser artifact currently exposes these model files:

- `model.onnx` + external data about 1.42 GB
- `model_fp16.onnx` + external data about 709 MB
- `model_q4.onnx` + external data about 576 MB
- `model_q4f16.onnx` + external data about 350 MB

Source directory:

https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/tree/main/onnx

The ONNX web config declares external-data use for all four variants.

For `q4f16` and `fp16`, the config declares KV cache dtype `float16`.

Current working first artifact candidate for mobile WebGPU experiments: `q4f16` because it is the smallest published browser artifact in this repository and the config explicitly describes its KV cache dtype.

That is an experiment choice, not an architecture requirement. Behavioral comparison against fp16 may be required later.

---

## 6. Granite tokenizer and relevant control tokens

The ONNX web tokenizer is GPT-2-tokenizer based and uses left padding.

Relevant tokenizer config facts:

- `add_bos_token`: false
- BOS token string: `<|end_of_text|>`
- EOS token string: `<|end_of_text|>`
- pad token string: `<|pad|>`
- unknown token string: `<|unk|>`
- `padding_side`: `left`
- `clean_up_tokenization_spaces`: false

Important model/template token IDs include:

- 100256: `<|pad|>`
- 100257: `<|end_of_text|>`
- 100264: `<|start_of_role|>`; marked special
- 100265: `<|end_of_role|>`; marked special
- 100270: `<tool_call>`; not marked special
- 100271: `</tool_call>`; not marked special
- 100272: `<tool_response>`; not marked special
- 100273: `</tool_response>`; not marked special
- 100278: `<schema>`; marked special
- 100279: `</schema>`; marked special
- 100280: `<tools>`; marked special
- 100281: `</tools>`; marked special
- 100282: `<documents>`; marked special
- 100283: `</documents>`; marked special

The tokenizer also contains thinking and fill-in-the-middle tokens. Their mere presence does not establish a MochEpoch requirement.

Source:

https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blob/main/tokenizer_config.json

### Tool tags are deliberately not special tokens

`<tool_call>`, `</tool_call>`, `<tool_response>`, and `</tool_response>` are in the tokenizer vocabulary but are marked `special: false` in the inspected config.

Consequence: decoding with `skip_special_tokens: true` should not remove those tags merely because they are tool markers. Role markers and other tokens marked special can be removed.

This matters when extracting native Granite tool calls from generated text.

---

## 7. Granite chat template: exact behavioral contract

The Granite 4 template is not a neutral formatter. It actively composes system instructions, tools, documents, conversation roles, tool-call formatting, and tool-result formatting.

Primary source:

https://huggingface.co/ibm-granite/granite-4.0-350m/blame/eb55c80bf6dbfef31a26182da23c8ecdd7aa2f63/chat_template.jinja

ONNX web copy:

https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blob/main/chat_template.jinja

The ONNX web artifact also embeds the Jinja string inside `tokenizer_config.json`, which is important for Transformers.js.

### 7.1 Default system behavior

The template defines this fallback system message when no system content, tools, or documents produce a system message:

`You are a helpful assistant. Please ensure responses are professional, accurate, and safe.`

MochEpoch implication: absence of a supplied system message is not behaviorally neutral. Actor experiments should normally supply deliberate actor/call system material rather than accidentally inheriting the generic Granite fallback.

### 7.2 First system message

If `messages[0]` is a system message, the template extracts it into the system message used at the top of the serialized prompt.

The first system message is not then duplicated during the normal message loop.

Later system messages are serialized in sequence like other role messages.

This means the template permits system-role material after the first turn.

### 7.3 Tools

If tools are supplied, the template builds a tool instruction block. It tells Granite it is a helpful assistant with access to tools, states that one or more tools may be called, serializes each tool definition as JSON inside `<tools></tools>`, and instructs the model to emit each tool call as JSON inside `<tool_call></tool_call>`.

The required native generated form is conceptually:

```text
<tool_call>
{"name": "function_name", "arguments": {...}}
</tool_call>
```

The template accepts either `tools` or the alias `available_tools` when that variable is supplied.

### 7.4 Tool calls can coexist with natural language

For an assistant message, the template writes the assistant's ordinary content first. If `message.tool_calls` exists, it then appends one or more native `<tool_call>` blocks before the message's `<|end_of_text|>` marker.

Therefore Granite's native format supports:

- natural language only;
- tool call(s) only;
- natural language plus tool call(s) in the same assistant turn.

MochEpoch implication: actor speech and proposed executable mechanics can be emitted by one Granite generation without inventing a separate combined MochEpoch action/dialogue schema.

### 7.5 Tool results

Messages with role `tool` are not serialized as a distinct native Granite role.

The template groups consecutive tool-role messages inside a user-role block, wrapping each tool result in:

```text
<tool_response>
...
</tool_response>
```

The grouped block then ends with `<|end_of_text|>`.

MochEpoch implication: returning a mechanic result to Granite is a model-facing representation choice. It is only needed if the next actor behavior needs another Granite call. A deterministic mechanic does not automatically require another Granite turn.

### 7.6 Documents

If `documents` are supplied, the template serializes each document as JSON inside `<documents></documents>` and adds strong instructions telling Granite to align strictly with the facts in those documents and say when the requested information is unavailable.

This is behaviorally significant.

The Granite `documents` input is not merely a neutral bucket for world state. Using it changes the system instruction and may change actor behavior.

MochEpoch implication: experiments that map event history/world state into `documents` must compare that against mapping the same facts into ordinary system/user material. Do not assume the documents channel is the correct home for CSV world state before testing it.

### 7.7 Tools/documents with a supplied system prompt

When a first system message exists:

- tools are appended to that system message;
- documents are appended to that system message;
- if both exist, both generated sections are appended.

Therefore supplying tools/documents modifies the effective system text even when MochEpoch provides a custom character system prompt.

This may be beneficial or harmful for character behavior and must be measured.

### 7.8 Generation prefix

When `add_generation_prompt` is true, the template ends the prompt with:

```text
<|start_of_role|>assistant<|end_of_role|>
```

Granite then generates the assistant body.

---

## 8. Transformers.js tokenizer/template path

Transformers.js's tokenizer layer imports:

- `@huggingface/tokenizers`
- `@huggingface/jinja`

`PreTrainedTokenizer.apply_chat_template()` accepts:

- conversation/messages;
- `tools`;
- `documents`;
- an optional explicit `chat_template` override;
- `add_generation_prompt`;
- tokenization on/off;
- padding;
- truncation;
- explicit max length;
- tensor/array return choice;
- dictionary return choice.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/tokenization_utils.js

### 8.1 Important template-loading detail

The plain Transformers.js tokenizer file loader currently loads:

- `tokenizer.json`
- `tokenizer_config.json`

It does not, in that plain `AutoTokenizer`/`PreTrainedTokenizer` path, independently load `chat_template.jinja`.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/model_registry/get_tokenizer_files.js

`PreTrainedTokenizer` takes `chat_template` from `tokenizer_config.json`.

The selected ONNX web artifact is therefore convenient because its `tokenizer_config.json` embeds the full Granite 4 chat template.

Do not assume every Granite model repository can be swapped into Transformers.js with identical template behavior without checking where the template is stored.

---

## 9. Granite model registration in Transformers.js

Transformers.js directly contains Granite 4 model bindings:

- `GraniteMoeHybridPreTrainedModel`
- `GraniteMoeHybridModel`
- `GraniteMoeHybridForCausalLM`

These classes currently inherit the common `PreTrainedModel` generation/session machinery.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/granitemoehybrid/modeling_granitemoehybrid.js

The model registry maps `granitemoehybrid` to the GraniteMoeHybrid classes.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/registry.js

Transformers.js also has a direct test that loads `GraniteMoeHybridForCausalLM`, tokenizes text, calls `model.generate()`, and compares exact generated token IDs.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/tests/models/granitemoehybrid/test_modeling_granitemoehybrid.js

---

## 10. Device selection: WebGPU must be explicit

Transformers.js browser default device is currently `wasm`, not `webgpu`.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/devices.js

Therefore a MochEpoch Granite browser experiment that intends to use WebGPU should explicitly request:

```text
device = webgpu
```

Do not rely on browser auto-selection unless an experiment is specifically testing auto-selection.

### 10.1 Device-to-ORT execution provider mapping

In the browser backend, Transformers.js imports:

`onnxruntime-web/webgpu`

The device `webgpu` maps to the ONNX Runtime execution provider:

`webgpu`

`deviceToExecutionProviders('webgpu')` therefore produces the WebGPU execution-provider selection used in the ORT session unless caller-provided session options already override `executionProviders`.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/backends/onnx.js

---

## 11. Dtype selection: WebGPU does NOT default to q4f16

This is a high-priority implementation fact.

Current Transformers.js dtype defaults are:

- WASM → `q8`
- any device without a special mapping → `fp32`

WebGPU has no special dtype default in the inspected source, so `device: 'webgpu'` with no explicit dtype resolves to `fp32` unless model config/device config overrides it.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/dtypes.js

File suffix mapping includes:

- fp32 → `model.onnx`
- fp16 → `model_fp16.onnx`
- q4 → `model_q4.onnx`
- q4f16 → `model_q4f16.onnx`

For the selected Granite ONNX web artifact this means:

- omitting dtype with WebGPU can select the roughly 1.42 GB fp32 external-data model;
- explicitly selecting `q4f16` selects the roughly 350 MB q4f16 artifact;
- explicitly selecting `fp16` selects the roughly 709 MB artifact.

MochEpoch experiments must always record the exact dtype rather than saying only "ran Granite on WebGPU."

### 11.1 WebGPU fp16 capability check

When the selected dtype is exactly `fp16` in browser WebGPU mode, Transformers.js currently requests a GPU adapter and checks for the `shader-f16` feature. If absent, loading throws.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/dtypes.js

The inspected source's explicit fp16 guard is keyed to selected dtype `fp16`. Whether all q4f16 kernels/paths impose equivalent hardware requirements is not established by this fact and remains an experiment/runtime question.

---

## 12. ONNX Runtime session construction inside Transformers.js

Source trace:

```text
from_pretrained(... device/dtype/session_options ...)
    ↓
Transformers.js session configuration
    ↓
getSession(...)
    ↓
selectDevice(...)
    ↓
deviceToExecutionProviders(...)
    ↓
selectDtype(...)
    ↓
select model filename + external data
    ↓
createInferenceSession(...)
    ↓
ONNX Runtime InferenceSession.create(...)
```

Primary source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/session.js

### 12.1 Session options are pass-through plus Transformers.js defaults

`getSession()` starts with a shallow copy of caller-provided `options.session_options`.

Transformers.js then fills/augments options including:

- `executionProviders` if caller did not already provide them;
- `freeDimensionOverrides` from `transformers.js_config` when provided;
- `externalData` for ONNX external weight files;
- `preferredOutputLocation` for recognized cache outputs when the session is cache-enabled and uses WebGPU.

Then `createInferenceSession()` calls ONNX Runtime's `InferenceSession.create()` with a default log severity plus the session options.

### 12.2 Decoder-only Granite is a cache-enabled session

Transformers.js classifies decoder-only language models as a session type whose `model` session has cache handling enabled and whose optional config includes `generation_config.json`.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/session_config.js

For WebGPU cache-enabled sessions, Transformers.js can mark recognized `present*` cache outputs with preferred output location `gpu-buffer` so generated KV cache outputs stay GPU-side instead of being unnecessarily copied to CPU.

This cache is inference machinery. MochEpoch must not depend on it as continuing actor/world memory.

### 12.3 Transformers.js serializes browser session creation and inference

Current source explicitly states that Transformers.js does not support simultaneous loading of WASM/WebGPU sessions and chains web initialization calls through a global promise.

Current source also explicitly states that it does not support simultaneous execution of WASM/WebGPU sessions and chains browser inference calls through a global promise to avoid `Session already started` errors.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/backends/onnx.js

MochEpoch consequence:

- multiple Granite calls requested at the same moment may be serialized by the current Transformers.js browser backend;
- this is a runtime scheduling/performance fact, not model memory and not game truth;
- actual impact should be measured before designing around it.

### 12.4 WASM machinery is still present in the WebGPU browser backend

The browser backend imports `onnxruntime-web/webgpu`, but `createInferenceSession()` currently calls `ensureWasmLoaded()` first.

Transformers.js has WASM caching machinery and can preload/cache the ORT WASM binary/factory when configured/defaulted to do so.

This is relevant to package/runtime footprint and offline caching. It does not mean Granite inference selected with `device: 'webgpu'` is intentionally executed on WASM.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/backends/onnx.js

---

## 13. Generation behavior that can change Granite

Transformers.js `GenerationConfig` exposes the generation controls used by `model.generate()`.

Relevant defaults in inspected Transformers.js source include:

- `max_length`: 20
- `max_new_tokens`: null
- `do_sample`: false
- `num_beams`: 1
- `use_cache`: true
- `temperature`: 1.0
- `top_k`: 50
- `top_p`: 1.0
- `typical_p`: 1.0
- `repetition_penalty`: 1.0
- `no_repeat_ngram_size`: 0

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/generation/configuration_utils.js

The Granite ONNX artifact's `generation_config.json` only supplies model token IDs and does not define a sampling strategy:

- BOS: 100257
- EOS: 100257
- PAD: 100256

Source:

https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blame/main/generation_config.json

Therefore MochEpoch experiments should explicitly record generation settings instead of relying on vague "defaults."

For deterministic baseline experiments, `do_sample: false` is especially useful because it removes sampling randomness while testing template/runtime/model wiring.

When `do_sample` is false, temperature/top-k/top-p settings do not provide ordinary stochastic sampling behavior.

### 13.1 Always specify output length in experiments

The high-level text-generation pipeline adds its own default `max_new_tokens: 256`.

Direct `model.generate()` does not receive that pipeline default automatically.

MochEpoch direct-model experiments should explicitly set `max_new_tokens` so the output bound is known and evidence is comparable.

---

## 14. High-level text-generation pipeline versus direct model API

The Transformers.js text-generation pipeline is useful as a reference implementation, but it currently performs several convenience transformations that MochEpoch may want to observe/control directly.

Source:

https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/pipelines/text-generation.js

For chat input the pipeline currently:

1. applies the chat template with `tokenize: false` and `add_generation_prompt: true`;
2. passes `tools`, `documents`, and any requested template through to template rendering;
3. tokenizes the rendered text;
4. enables padding and truncation;
5. sets tokenizer padding side to left;
6. calls `model.generate()`;
7. decodes the whole generated token tensor with `skip_special_tokens: true`;
8. decodes the prompt again and trims the returned decoded string by prompt character length;
9. returns the generated assistant content as a string in a chat-shaped result.

### 14.1 Pipeline does not natively return parsed Granite tool-call objects

The inspected text-generation pipeline reconstructs the generated assistant turn as:

- role: assistant
- content: decoded string

It does not parse Granite `<tool_call>` blocks into structured `tool_calls` objects on return.

That is acceptable for MochEpoch because native Granite tool-call text can be parsed locally and deterministically, but it means the high-level pipeline does not by itself provide the final game-side tool-call structure.

### 14.2 Why direct tokenizer + model API is preferable for first MochEpoch evidence

The direct route can preserve the exact chain:

```text
Witness structured call
    ↓
tokenizer.apply_chat_template(... tokenize=true ...)
    ↓
exact input token IDs
    ↓
model.generate(... explicit settings ...)
    ↓
full output token IDs
    ↓
slice generated tokens after prompt length
    ↓
decode generated portion
    ↓
local Granite tool-call / speech extraction
```

This makes it easier to save exact template output, token count, token IDs, generation settings, raw generated tokens, and decoded output as evidence.

It also avoids relying on the pipeline's decoded-character trimming when testing exact Granite output semantics.

This is an experimental instrumentation preference, not a new MochEpoch architecture layer.

---

## 15. Where Transformers.js slots into MochEpoch

Transformers.js belongs entirely inside the implementation of the Granite call boundary.

Conceptual placement:

```text
CSV-backed truth
    ↓
Witness selects/resolves current call material
    ↓
transient call JSON
    ↓
[ Granite runtime implementation ]
    Transformers.js tokenizer/Jinja
    Transformers.js Granite model/generate
    ONNX Runtime WebGPU
    ↓
raw generated Granite expression
    ↓
MochEpoch-local extraction
    ↓
utterance delivery and/or deterministic mechanic attempt
    ↓
CSV-backed result if produced
```

Transformers.js does not become:

- actor memory;
- conversation storage;
- world state;
- event history;
- an operation registry;
- a dialogue manager;
- an agent loop;
- a truth engine;
- a mechanic executor.

The model/runtime may stay resident. Every game-relevant fact needed by later behavior still comes from CSV-backed state.

---

## 16. Candidate mapping of MochEpoch actor state into Granite-native template inputs

This section is an experiment map, not a frozen packet schema.

Potential ingredients for one actor call:

- character identity / "you are" material;
- character bio/personality card;
- current actor/world facts;
- factual event history relevant to the actor;
- actual conversation history that should be presented to the actor;
- available deterministic mechanics expressed as Granite tool definitions;
- previous mechanic/tool results that the actor needs to react to;
- current human/NPC/world input;
- optional output guidance for a pure structured transformation.

Potential Granite-native channels:

- first system message;
- later system messages;
- user/assistant message history;
- `tools`;
- role `tool` results;
- `documents`;
- current user turn.

The template's channels are not semantically interchangeable.

Especially:

- `tools` adds generic tool-use instructions;
- `documents` adds strict document-grounding instructions;
- no system message invokes Granite's generic helpful-assistant fallback.

Therefore "give Granite the full game state" is experimentally viable, but where each state category is placed can change behavior and must itself be tested.

---

## 17. Native Granite speech + action mapping

Granite's template natively supports an assistant turn containing ordinary content plus one or more tool calls.

Potential MochEpoch interpretation:

- ordinary assistant content = actor utterance/expression;
- native tool call = actor's proposed executable mechanic;
- deterministic game function = actual physical attempt and consequence;
- CSV write = authoritative result only if produced.

Example conceptual output:

```text
Fine. Take it.
<tool_call>
{"name":"hand_over","arguments":{"object":"stone","recipient":"player"}}
</tool_call>
```

MochEpoch does not infer from the tool call that the hand-over succeeded. The deterministic `hand_over` mechanic still checks current CSV facts.

For NPC-to-NPC speech, the actual natural-language utterance crosses to the recipient. Hidden tool-call structure does not substitute for what was actually said.

---

## 18. Pure structured Granite calls remain valid

Not every Granite call needs an actor utterance.

MochEpoch may use Granite for a fuzzy transformation such as interpreting human language into a concrete game-relevant representation.

Granite 4 also contains schema/tool-related special tokens and IBM documents JSON-oriented prompting patterns.

For such calls, a local schema/prompt convention may be used when the concrete game path needs it.

Do not universalize one structured-output mechanism across all Granite calls merely because the current fixture or another experiment uses it.

---

## 19. First experiment controls to record

Every runtime/behavior experiment should preserve enough evidence to reproduce the actual Granite call.

At minimum record:

### Model/runtime identity

- Transformers.js version/commit
- ONNX Runtime Web version bundled/used
- Granite model artifact repository + revision
- selected ONNX file/dtype
- device selection
- relevant ORT session options if any

### Call construction

- authoritative CSV input files/rows used
- one actual Witness call object
- Granite message list
- tools supplied
- documents supplied
- template override if any
- rendered template string when useful
- prompt token count
- exact input token IDs for small controlled fixtures when useful

### Generation

- `max_new_tokens`
- `do_sample`
- temperature/top-k/top-p if sampling
- repetition penalty or other logits changes
- stop criteria if customized
- cache setting if customized

### Return

- raw generated token IDs or sufficient equivalent evidence
- generated-only decoded string
- extracted utterance
- extracted native tool calls
- parser failures/malformed structures

### Game consequence

- deterministic mechanic invoked, if any
- mechanic precondition result
- CSV mutation or explicit no-op
- resulting CSV state

This evidence belongs to executed experiments, not hypothetical stages.

---

## 20. High-value experiment matrix

These are candidate experiments. They are not mandatory machinery.

### A. Template fidelity baseline

Render Granite's template without generation for:

- explicit system + user;
- no explicit system;
- system + tools;
- system + documents;
- system + tools + documents;
- assistant speech + tool call history;
- tool result followed by another assistant generation;
- later system message.

Save exact rendered strings and token counts.

### B. Deterministic generation baseline

Use:

- `device: webgpu`
- explicit dtype
- `do_sample: false`
- explicit `max_new_tokens`

Run the same call repeatedly from freshly reconstructed input and verify generated token stability on the target browser/runtime.

### C. Quantization behavior

Run identical prompts/settings using q4f16 and fp16, then compare:

- exact tokens;
- tool-call validity;
- action choice;
- dialogue differences;
- latency/memory.

Do not assume smaller quantization is behaviorally identical.

### D. Full-state versus scoped-state mapping

Construct the same actor situation using different state projections:

- full available CSV state;
- actor-local/relevant CSV state;
- intermediate scopes.

Compare behavior instead of assuming small scope or full scope is superior.

### E. Template-channel mapping

Hold factual content constant while moving it between:

- ordinary system material;
- message history;
- documents;
- tool results where semantically valid.

This measures the effect of Granite's native template semantics rather than only amount of information.

### F. Native speech + tool call

Give the actor at least two available mechanics and a situation where speech and action can both be reasonable.

Observe whether Granite emits:

- speech only;
- tool only;
- speech + tool;
- multiple tools;
- malformed tool markup.

### G. Call independence

Perform call A, discard all call-local material, reconstruct call B from authoritative CSV, and verify that B does not require hidden conversation/model state to behave correctly.

### H. Browser serialization impact

Request multiple Granite calls close together and measure how the current Transformers.js global WebGPU inference chain schedules them.

This tests latency/scheduling only. It does not alter the CSV authority model.

---

## 21. Known gotchas / facts that can silently change an experiment

1. Browser device default is WASM. Explicitly request WebGPU when that is the experiment.
2. WebGPU dtype default is currently fp32, not q4f16. Explicitly choose dtype.
3. The tokenizer max-length field in the ONNX artifact is not the actual Granite 32K model limit.
4. Granite's template injects a default helpful-assistant system prompt if no other system material exists.
5. Supplying tools modifies the effective system prompt with generic tool-use instructions.
6. Supplying documents modifies the effective system prompt with strict document-grounding instructions.
7. Transformers.js high-level text-generation pipeline does not return parsed Granite tool-call objects; it returns decoded assistant content.
8. Current Transformers.js browser WebGPU/WASM inference is globally serialized through a promise chain.
9. Transformers.js can preload/cache ORT WASM machinery even when the selected execution provider is WebGPU.
10. Direct `model.generate()` experiments should explicitly set output length and other generation controls.
11. Tool-call tags are not marked special in the tokenizer config, while role markers are special. Decode settings therefore affect them differently.
12. The ordinary dense Granite 350M still uses the shared `GraniteMoeHybridForCausalLM` implementation/model-type naming. Do not confuse that naming with the H/Mamba 350M model.
13. The plain Transformers.js tokenizer loader uses `tokenizer.json` + `tokenizer_config.json`; the chosen ONNX web artifact embeds the chat template in tokenizer config.

---

## 22. Unresolved research queue

Only advance these when they are needed for an experiment or block implementation.

### Runtime/model execution

- Verify the exact ONNX input/output names and cache tensor shapes of `model_q4f16.onnx`.
- Determine whether q4f16 on the target Android WebGPU path has any practical `shader-f16`/feature requirement not captured by Transformers.js's explicit fp16 guard.
- Verify actual Pixel 9a load/generation behavior of this exact artifact.
- Measure package/bundle/runtime bytes actually transferred for the selected direct API build.
- Determine whether current ORT WASM preload can/should be avoided in the chosen WebGPU deployment without breaking fallback/runtime initialization.
- Measure current browser Cache API behavior for the 350 MB external-data file.

### Generation/template

- Verify `@huggingface/jinja` renders every Granite 4 template branch identically enough for tools/documents/tool-result experiments.
- Establish the exact generated-only token slicing/decoding path to use in MochEpoch evidence.
- Establish the local native-tool-call extraction format, including multiple tool calls and speech preceding calls.
- Test malformed/truncated tool-call behavior rather than inventing a repair layer in advance.
- Test whether Granite's native tool-system boilerplate changes character behavior enough to justify a template-override experiment.
- Test whether the native documents channel is useful or harmful for full-world/event-history projection.

### Scheduling

- Measure latency when several NPC calls are requested while Transformers.js serializes WebGPU inference.
- Determine whether this runtime serialization remains acceptable for real gameplay before considering any lower-level alternative.

---

## 23. Primary source index

### MochEpoch

- https://github.com/NFDFLDTHRY/MochEpoch/blob/main/docs/GAME_BLUEPRINT.md
- https://github.com/NFDFLDTHRY/MochEpoch/blob/main/docs/CSV_BACKING_STATE.md
- https://github.com/NFDFLDTHRY/MochEpoch/blob/main/docs/MODEL_ROLE.md
- https://github.com/NFDFLDTHRY/MochEpoch/blob/main/docs/DIALOGUE_BOUNDARY.md

### Granite 4.0 350M

- https://huggingface.co/ibm-granite/granite-4.0-350m
- https://huggingface.co/ibm-granite/granite-4.0-350m/blob/main/config.json
- https://huggingface.co/ibm-granite/granite-4.0-350m/blob/main/tokenizer_config.json
- https://huggingface.co/ibm-granite/granite-4.0-350m/blob/main/chat_template.jinja
- https://huggingface.co/ibm-granite/granite-4.0-350m/blob/main/generation_config.json

### Granite ONNX Web

- https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web
- https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/tree/main/onnx
- https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blob/main/config.json
- https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blob/main/tokenizer_config.json
- https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blob/main/chat_template.jinja
- https://huggingface.co/onnx-community/granite-4.0-350m-ONNX-web/blame/main/generation_config.json

### Transformers.js

- https://github.com/huggingface/transformers.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/package.json
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/tokenization_utils.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/model_registry/get_tokenizer_files.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/granitemoehybrid/modeling_granitemoehybrid.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/registry.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/session.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/session_config.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/backends/onnx.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/devices.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/dtypes.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/generation/configuration_utils.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/pipelines/text-generation.js
- https://github.com/huggingface/transformers.js/blob/main/packages/transformers/tests/models/granitemoehybrid/test_modeling_granitemoehybrid.js

---

## 24. Update rule

When new Granite/Transformers.js/runtime research is performed for MochEpoch:

- add the established fact here;
- include the exact source;
- label project interpretation as interpretation/experiment rather than source fact;
- add unresolved consequences to the queue;
- remove or mark superseded facts when a pinned dependency changes;
- do not silently turn an experimental finding into architecture.

The point of this file is to make future Granite work begin from accumulated evidence instead of beginning from search again.

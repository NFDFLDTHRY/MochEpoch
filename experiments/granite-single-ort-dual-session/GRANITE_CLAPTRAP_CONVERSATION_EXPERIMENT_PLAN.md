# Moch Epoch Granite 350M Conversation Experiment Plan

## User-directed two-call amendment — 2026-09-17

After an installed-phone run produced five replies of assistant/tooling narration
and zero searches, the user explicitly selected two calls per turn and recording
only the second output. This supersedes the original optional-retrieval flow for
the current Claptrap experiment. Earlier raw exports remain historical evidence.
It does not establish a mandatory two-stage architecture for MochEpoch generally.

Each completed turn now consists of one retrieval generation, one deterministic
CSV search, and one response generation on the same resident seat. The retrieval
call retains Granite's native tool template. Following the user's later prompt
refinement, its system is exactly `Select three words from the supplied message.
Call search_conversation with those words separated by spaces. Do not compose a
conversational reply.` Its user message is the original incoming text alone;
timestamp metadata is not supplied as text from which to select search words.
The real first split-prompt run copied the template's generic assistant preface
into its query. Omit those two generic role sentences from the retrieval-only
template while retaining its native schema, tool-format instructions and markers.
The actual rendered input and this adjustment are recorded in machine evidence.
The harness may prefill the native call for the sole required search function;
the model supplies the query itself, and the exact prefill is recorded separately
from generated tokens. Its existing finite tool allowance is 96 generated tokens.
There is no `NO_SEARCH` path or empty-CSV exception. A parseable invalid query
returns the existing deterministic search error without adding words.

The response call receives the user-approved actor system `You are Claptrap.
Respond to the incoming message.`, the original timestamp and incoming message,
the native tool request, and the actual CSV result.
It does not receive the retrieval-task instruction or first-call narration, and
it does not advertise a further tool call. Exactly 100 newly generated tokens from
this second call are the response. Only that response is displayed as speech,
appended to the authoritative conversation CSV, and sent to the other seat.
Both calls and the search result remain in separate diagnostic evidence.

A malformed/truncated retrieval call or another tool request during the response
fails visibly and creates no conversation row. No automatic retries, query
rewriting, output sanitization, personality coaching, or third call is added.
A complete run is 100 replies from 200 generations, 50 replies per seat. The seed
is excluded. Both q4 sessions remain resident; generation remains sequential.

The optional tool-use wording and shorter system prompt in the original sections
below describe the prior baseline and are superseded by this explicit amendment
for current execution. The retrieval function still rejects fewer than three
words and does not enforce a new exact-three-word parser rule or rewrite queries.

## Purpose

Build a browser experiment where two resident copies of Granite 4.0 350M q4 hold a visible 100-turn conversation while all durable memory lives outside the model in an append-only CSV. The experiment should reveal how Granite behaves over repeated fresh turns and whether CPU/WASM and GPU/WebGPU execution produce any observable divergence when every other condition is held constant.

The build must not poison the experiment by feeding accumulated conversation history back into the model. Each turn starts from a fresh inference context. Older information may re-enter only through an explicit retrieval tool that searches the saved conversation CSV.

## Starting Point

Continue on the existing branch:

`experiment/granite-single-ort-dual-session`

The proven runtime baseline is commit:

`70e3f4ef0b959c60db02aca80a98519a60491ef5`

That run established one browser Worker can hold one Transformers.js import, one tokenizer, one ONNX Runtime Web environment, one q4 Granite session on WASM, one q4 Granite session on WebGPU, and both model sessions resident simultaneously.

Keep that proven single-runtime/two-session topology. Build the conversation experiment in this same branch without changing the established runtime boundary unless a run demonstrates that a change is required.

## Fixed Experimental Conditions

### Model

- Model: `onnx-community/granite-4.0-350m-ONNX-web`
- Revision: `6c9a6f61601df51e76b1efff0974d8d26c2a25b5`
- Transformers.js: `4.3.0`
- Dtype: `q4`
- Same exact model artifact for both seats.

### Seats

CPU Claptrap uses WASM q4 with fixed-width SIMD, one thread when cross-origin isolation is unavailable, and proxy disabled. GPU Claptrap uses WebGPU q4.

The model identity is intentionally identical. The backend is intentionally different.

### System Prompt

Every conversational turn for both models uses exactly:

`You are Claptrap.`

Do not add Borderlands lore, personality instructions, examples, tone guidance, history, or explanatory text. The point is to discover what Granite 350M itself associates with the identity claim, or what it invents if it does not know.

### Seed

The initial message is exactly:

`Welcome to the Zoo`

The page must allow the operator to choose which seat receives the seed: CPU or GPU. This is the only operator-selectable experimental variable in the first build.

### Turn Count

- 100 generated conversational turns total.
- 50 CPU turns.
- 50 GPU turns.
- Strict alternation.
- The seed is not counted as a generated turn.

### Output Length

Each conversational response generates exactly 100 new tokens using deterministic generation:

- `do_sample: false`
- `min_new_tokens: 100`
- `max_new_tokens: 100`

No temperature, top-k, top-p, or sampling experiments in the baseline.

## Core Runtime Topology

```text
HTML page
   |
   v
one module Worker
   |
   +--> one Transformers.js module realm
   |
   +--> one tokenizer
   |
   +--> one ONNX Runtime Web environment
            |
            +--> CPU q4 model session -> WASM
            |
            +--> GPU q4 model session -> WebGPU
```

Do not create one Worker per model. Do not import Transformers.js twice. Do not create separate ONNX Runtime Web environments for CPU and GPU. The two model sessions stay loaded for the whole experiment. Only per-turn inference state is cleared.

## What “Clear After Every Turn” Means in Code

The weights and ONNX sessions stay resident. The conversation does not.

Long-lived Worker state may contain things such as:

```text
tokenizer
cpuModel
gpuModel
runtime configuration
run control flags
```

It must not keep long-lived conversational state such as:

```text
messages[]
conversation[]
preparedPrompt
preparedInputs
past_key_values
previous input tensors
previous output tensors
previous generation cache
```

Every turn constructs brand-new input from scratch. After a response completes: decode the newly generated text, append it to the durable conversation CSV, send that plain text to the opposite seat, release or drop that turn's prompt tensors/output tensors/KV cache, then construct the next turn from zero.

Never pass `past_key_values` from one conversational turn into the next. The 100 tokens inside a single response may use the normal generation cache; that cache dies when the response ends.

The only continuity between adjacent turns is the other model's latest plain-text response plus any CSV rows explicitly returned by retrieval.

## Conversation Memory

Use an append-only browser-side CSV as the durable conversation record. Prefer OPFS on the actual experiment origin. If OPFS is unavailable, stop and record the failure rather than silently substituting hidden in-memory conversation state.

Suggested filename: `conversation.csv`.

Recommended schema:

```csv
turn,timestamp,speaker,backend,response
```

- `turn`: generated turn 1 through 100
- `timestamp`: absolute ISO 8601 timestamp when response completes
- `speaker`: `cpu_claptrap` or `gpu_claptrap`
- `backend`: `wasm` or `webgpu`
- `response`: exact decoded response text

Do not put system prompts, retrieval diagnostics, benchmark data, interpretation, summaries, or hidden state into the conversation CSV. The CSV represents only what the two models actually said and when.

## Retrieval Tool

Granite does not receive the full conversation automatically. If it wants older information, it must explicitly search the saved conversation CSV.

Expose one retrieval tool conceptually named:

`search_conversation(query)`

The query must contain at least three words. Examples that pass: `bananas in zoo`, `meeting at nine`, `robot said yesterday`. Examples that fail: `the`, `bananas`, `9 a.m.`

The three-word minimum prevents a trivial one-word lookup from returning most of the conversation and recreating a giant context window by accident.

### Search Behavior

The first version is deliberately stupid and deterministic:

1. Lowercase the query and stored response text for matching.
2. Split the query into words.
3. Require at least three words.
4. Return every CSV row whose response text contains all query words.
5. Preserve the original matching rows exactly in the returned result.

Do not use embeddings, semantic search, fuzzy similarity, stemming, synonym expansion, LLM reranking, hidden relevance scores, or automatic query rewriting.

If a legal three-word query still returns an absurd amount of history, allow the run to reveal that failure. Do not add a result cap until a real run establishes the need.

If Granite submits fewer than three words, return a deterministic tool failure such as `Query requires at least three words.` Do not repair the query or add words on Granite's behalf.

## Per-Turn Lifecycle

Each turn behaves like a fresh model awakening.

1. Select the active seat according to strict alternation.
2. Construct a brand-new prompt containing the exact system prompt `You are Claptrap.`, the current absolute timestamp, the other model's newest response or the seed for turn 1, and access to the retrieval tool.
3. Granite may invoke retrieval. The query must be model-produced. Deterministic JavaScript searches the actual CSV and returns only matching rows.
4. Generate the visible conversational response. The visible response must contain exactly 100 newly generated tokens. Tool-call tokens do not count toward the 100 conversational tokens.
5. Append the completed response immediately to `conversation.csv`. The save happens before the next seat begins.
6. Render the message in the visible chat room.
7. Drop all transient prompt, output, and generation-cache references from the completed turn.
8. Pass only the completed plain-text response to the opposite model as its newest incoming message.
9. Repeat until turn 100 completes.

The model never receives the prior transcript, its own prior answers, or the other model's older answers unless the retrieval tool explicitly returns them for that turn.

## HTML Interface

The page should look like a chat room first and an experiment console second.

Before the run, show runtime status, CPU session status, GPU session status, fixed model/revision/dtype, fixed system prompt, fixed seed phrase, the CPU/GPU seed-seat selector, and Start.

During the run, show alternating message cards or bubbles. Each visible message shows turn number, speaker, backend, timestamp, and exact generated response.

Under each message, include an expandable retrieval-evidence section showing the exact search query Granite requested, whether it passed the three-word rule, which prior turn numbers matched, and the exact rows returned to that turn. Retrieval evidence is for the human observer only and is not appended to the conversation CSV.

Provide Pause, Stop, Download Conversation CSV, and Download Evidence JSON. Pause takes effect between turns. Stop lets the current turn finish and save, then ends the run.

At turn 100, stop automatically, verify 50 CPU and 50 GPU turns with strict alternation, and expose/download the finished CSV and machine evidence.

## Separate Machine Evidence

Keep diagnostics out of `conversation.csv`. Store them separately in `evidence.json`.

Per turn, record at least turn number, active seat, backend, start time, completion time, incoming message, retrieval query, retrieval validity, matching turn numbers, exact retrieved rows, final input token count, generated token count, generation duration, raw decoded output, and any errors.

Also record runtime initialization evidence proving one Worker, one Transformers.js module realm, one tokenizer, one CPU q4 session, one GPU q4 session, and both sessions resident before the conversation begins.

## Anti-Poisoning Rules

Do not preload Borderlands lore. Do not explain who Claptrap is. Do not provide style examples. Do not provide conversation examples. Do not tell either model how to behave beyond `You are Claptrap.` Do not feed the transcript back into the prompt. Do not preserve past KV cache across turns. Do not summarize earlier turns for the model. Do not rewrite retrieval queries. Do not perform semantic retrieval. Do not silently fix invalid tool calls. Do not inject human interpretation into the conversation CSV. Do not change generation settings or token limits between CPU and GPU. Do not use different model files. Do not run CPU and GPU generation simultaneously in this experiment. Do not add personality controls or automated behavioral scoring.

The browser observes and records. It does not coach.

## Build Order

Follow the Moch Epoch rule: question, smallest operation, build, run, save evidence, try to break, then add machinery only if failure requires it.

### Build 1: Two-Turn Chat Plumbing

Continue from the proven dual-session runtime on the current branch. Load both q4 sessions in one Worker. Add the seed-seat selector. Use the exact Claptrap system prompt and seed. Run only two alternating turns as a plumbing test. Verify each turn creates fresh inputs with no carried KV cache, and verify the first response becomes the second model's input. This two-turn run is not behavioral evidence.

### Build 2: Append-Only Conversation CSV

Create `conversation.csv`, append every completed response before starting the next turn, reload the page and verify saved rows persist, and verify saved conversation is not automatically reconstructed into model context.

### Build 3: Keyword Retrieval Tool

Add the one retrieval tool, enforce the three-word minimum, search the actual CSV deterministically, return exact matching rows, expose retrieval evidence in the UI, and verify unmatched history never reaches the model.

### Build 4: Full 100-Turn Run

Only after the previous mechanics are proven, set the target to 100 generated turns, require exactly 50 CPU and 50 GPU turns, require exactly 100 generated tokens per visible response, run the experiment, and export the conversation CSV plus machine evidence.

## Mechanical Pass Conditions

The experiment passes only if one Transformers.js runtime realm is used; both q4 sessions remain resident together; CPU uses WASM; GPU uses WebGPU; both use the same model revision/dtype; both use the exact system prompt `You are Claptrap.`; one selectable seat receives `Welcome to the Zoo`; turns alternate strictly; 50 CPU and 50 GPU responses complete; every visible response has exactly 100 new tokens; every completed turn is appended to CSV before the next begins; no previous KV cache is reused across turns; no full transcript is automatically injected; old conversation enters only through explicit retrieval; retrieval requires at least three query words; retrieval uses deterministic all-query-word matching; and the exact conversation plus separate machine evidence can be exported.

## Failures to Preserve, Not Hide

Preserve evidence if one backend produces malformed or empty output, fails before 100 tokens, Granite repeatedly issues invalid retrieval queries, never uses retrieval, retrieves irrelevant rows, forms a three-word query that still returns huge history, loses speaker identity, invents prior events, misreads timestamps, CPU and GPU diverge behaviorally, one seat teaches the other an invented interpretation of Claptrap, the conversation collapses into repetition, stable roles/conventions emerge spontaneously, or the page/runtime crashes.

These are experimental results unless deterministic plumbing caused them.

## Questions for Post-Run Analysis

After the first complete run, bring the exported conversation CSV and machine evidence back to ChatGPT and inspect them turn by turn. Ask whether Granite recognized Claptrap as the Borderlands character, what identity it constructed if not, whether CPU and GPU diverged, whether seed-seat choice mattered, whether one seat established persistent conventions, whether one model taught the other facts or falsehoods, what survived only by direct conversational propagation, what vanished and later returned through retrieval, what search queries Granite chose, whether it understood the three-word constraint, whether retrieved rows were appropriate, whether it handled timestamps and ordering coherently, whether repeated fresh application of `You are Claptrap.` produced a stable behavioral attractor, and whether any systematic differences track CPU/WASM versus GPU/WebGPU.

Do not infer permanent model traits from one run. Save each run as evidence and repeat with one controlled variable changed at a time.

## Follow-Up Experiments Only After Baseline

Possible later experiments include reversing the seed seat, changing only one system prompt, giving the seats different system prompts, removing system prompts, changing the seed phrase, changing the retrieval rule, deliberately testing timestamp comprehension, adding result limits only if baseline failure requires them, repeating identical conditions to measure run-to-run stability, tightly controlled single-turn CPU/GPU comparisons, and sampling experiments. Do not build these into the baseline.

## First Build Question

> Can two resident Granite 350M q4 sessions, one WASM and one WebGPU, alternate fresh 100-token responses while all durable conversational memory exists only in an append-only CSV and older information can re-enter a turn only through an explicit three-word keyword retrieval tool?

Build only enough machinery to answer that question.

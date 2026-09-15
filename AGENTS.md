# MochEpoch agent rules

## Preserve the experiment

Mock Epoch asks whether civilization-like behavior can emerge from factual CSV world state, scoped Witness calls, Granite 350M JSON reasoning, and deterministic game execution without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization.

Preserve this machine:

```text
PLAYER
  ↓
GAME RUNNER
  ↓
WORLD.CSV search list
  ↓
type + name resolve referenced CSV state
  ↓
WITNESS class functions: scoped CSV access + packet construction
  ↓
ONE Granite calling packet
  ↓
GRANITE 350M JSON → JSON
  ↓
MODEL OUTPUT
  ↓
IF / ELSE / THEN resolver
  ↓
GAME RUNNER updates CSV-backed state
  ↓
NEXT WORLD
```

The one Granite packet contains the world descriptive summation, system prompt from CSV, current situational state, and output JSON schema together.

Witness is only a class containing the small set of ordinary functions needed for scoped CSV access and Granite packet construction. It is not an architectural subsystem and does not reason about the world.

Granite only processes the supplied packet and returns JSON. It does not own world state or execute consequences.

Before modifying Granite integration, Witness, NPC processing, or natural-language communication machinery, read `docs/MODEL_ROLE.md` and preserve its operational framing. Do not design Witness functions against an imagined model interface; establish the concrete Granite WebApp call machinery first, then make the class functions feed that proven interface.

Before modifying world-state handling, rendering state, assets, persistence, inventory, NPC state, JSON handling, or any other game-state machinery, read `docs/CSV_BACKING_STATE.md` and preserve it as a hard architectural boundary.

Deterministic code decides what actually happens. The next interaction must operate from the changed CSV-backed state without hidden model memory or hidden game state.

Store facts and attributed events, not designer interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar social abstractions are outside this experiment unless the user explicitly changes the research question. A failed emergence experiment is evidence, not permission to add a trust meter.

System prompts are data in CSV state. They may be character-specific or shared by reference; do not centralize them in executable code merely for convenience.

## CSV backing-state boundary

CSV files are the backing state of MochEpoch. There is no second game-state representation.

Do not create or maintain an active in-memory world model, ECS, state store, object graph, inventory store, relationship graph, NPC state cache, renderer-owned gameplay state, or other parallel gameplay state. CSV is not merely an import/export format.

The allowed game-code shape is:

1. a first-person 3D client that reads the CSV-described world and renders it;
2. CSV files that describe world, system, entity, asset, and other game-relevant backing state; and
3. classes that contain functions which read, resolve, or transform that CSV backing state.

Function classes do not own game state. Any game-relevant result that must survive an operation belongs back in CSV-backed state.

JSON is transient operational structure, not backing state. The project's DNA/RNA analogy is mechanical only: CSV is the durable backing state; JSON is temporary expression or transport for a particular operation. A JSON package may be created from CSV, passed through Granite or another function, compared or validated against CSV, and then discarded. If a JSON result affects the continuing world, deterministic functions resolve it against the relevant CSV backing and write the accepted consequence into CSV-backed state. Do not literalize the analogy into biological mechanics.

Game assets are discovered through CSV manifests. Referenced asset files may use whatever format the renderer or backend requires, but the game's knowledge that an asset exists, where it is located, and any game-relevant metadata about it belongs in CSV. Do not create an independent hard-coded asset registry.

Transient state is permitted only when specifically required by third-party backend machinery such as the browser, Three.js/WebGPU, model inference, decoding, or another explicitly used backend. Backend-required transient machinery must never become authoritative gameplay state and must not contain a game fact that exists nowhere in CSV.

A Chrome WebApp cannot directly rewrite repository files. That limitation does not authorize a non-CSV runtime world model. The eventual browser persistence mechanism is a storage substrate for CSV-backed documents. Repository CSV files may be seed/default state; runtime-mutated state must still remain CSV-backed.

If renderer internals, model-runtime internals, caches, workers, function-class instances, and transient JSON packages are discarded, the continuing world must still be reconstructable from the CSV backing state plus referenced resource files.

Do not build a backend merely to make static repository CSV files writable.

## Work scratchpad handshake

When ChatGPT Work is used on this repository, `scratchpad/` is the required communication surface between Work, the user, and normal ChatGPT sessions.

Before Work changes game code, world CSVs, project architecture, runtime machinery, dependencies, hosting configuration, or other implementation files, it must read `scratchpad/README.md`, write one narrowly scoped proposal into `scratchpad/WORK.md`, set `status: PROPOSED`, and stop for review.

Work may proceed only when `scratchpad/REVIEW.md` explicitly approves the same `proposal_id`, or when the user explicitly tells Work in the active Work conversation to proceed with that exact proposal. Approval is proposal-specific and is never standing permission.

If the approved work later requires more files, different machinery, architecture changes, a new service, cost/quota exposure, or another material scope change, Work must record the change or blocker in `scratchpad/WORK.md` and stop again.

After completing approved work, Work updates `scratchpad/WORK.md` with the actual result and commit/evidence references. The scratchpad is communication only. It is not game state, experimental evidence, or architectural authority and must not override the authoritative repository docs.

Normal ChatGPT sessions reviewing Work should read the scratchpad rather than reconstructing Work's intent from chat memory, and should place review decisions in `scratchpad/REVIEW.md` so Work can read them from the repo.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

Do not add frameworks, services, validators, test harnesses, schedulers, databases, deployment systems, account systems, abstractions, or dependencies because they may be useful later.

Prefer plain HTML, JavaScript, CSV, and local/manual checks until an observed requirement needs something more.

Documentation describes the machine. Code must not parse project documentation as an authority or dependency.

## Cost boundary

Never create, enable, configure, or rely on GitHub Actions or any other metered or hosted execution without the user's explicit approval.

Without explicit approval, do not add CI/CD, scheduled cloud jobs, Codespaces, CodeQL jobs, Pages deployment automation, Dependabot automation, hosted builds, hosted databases, serverless functions, hosted inference, analytics, telemetry, monitoring, or third-party services with billing or quota exposure.

A free tier is not permission.

An explicit user request may authorize a specific external service for that task. Deployment, authentication, payments, and other product-shell work are separate from the core civilization experiment and should not be pulled into the game runtime unless the user asks for them.

If an external service is genuinely required and has not been approved, stop and explain what is needed, why the local/simple path is insufficient, and what cost or quota exposure exists.

## Evidence

Save enough to establish the current run: relevant before-state, the Witness packet, raw model output or error, resolver result, relevant after-state, and visible consequence when useful. Failed runs count.

Do not turn evidence collection into a framework unless accumulated runs become hard to inspect manually.

## Before changing the repo

Read the current repository and the user's latest Mock Epoch instructions. Do not import architecture from unrelated projects or generic best-practice templates.

When unsure whether to add machinery, do not add it. Build the next missing executable operation.

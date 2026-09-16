# MochEpoch agent rules

## Preserve the experiment

MochEpoch asks whether civilization-like behavior can emerge from factual CSV world state, bounded Resolver/Granite/Witness transformations, and deterministic game execution without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization.

Preserve this primitive exactly:

```text
CSV-BOUNDED TRUSTED STATE
  ↓
RESOLVER
CSV → bounded JSON parameters
  ↓
GRANITE(stage)
JSON → JSON
  ↓
UNTRUSTED JSON RESULT
  ↓
WITNESS
JSON → CSV-bounded trusted result or REJECT
```

Each stage is one transformation from a game-defined bounded population of possibilities.

Resolver, Granite, and Witness have one job each and never change roles:

- Resolver projects the CSV-bounded state required for one stage into bounded JSON.
- Granite performs one JSON → JSON transformation. Call-local model state is discarded at call end with respect to game truth.
- Witness validates one Granite return against that stage's schema, values/references, scope, identity, and authority, then converts it to CSV-bounded trusted structure or rejects it.

There are no PRECHECK/FINAL Witness modes, hidden dialogue state, second model authority, or second world model. If another Granite stage is required, it begins again from CSV-bounded state through Resolver.

Do not swap the Resolver and Witness namespaces. Do not use `Witness` to mean outbound packet construction, semantic language checking, or consequence execution.

A witnessed result becoming trusted means it is legal structure for that stage. It does not mean a spoken claim is true, dialogue is finished, or a world consequence has happened.

If a final witnessed result proposes a world consequence, deterministic game code checks current CSV-backed preconditions and performs any permitted mutation. Granite never directly mutates arbitrary world state.

If a final witnessed result is an emitted utterance, deterministic game code delivers it. Granite never writes directly to UI.

Before modifying Granite integration, Resolver, Witness, NPC processing, or natural-language communication machinery, read `docs/MODEL_ROLE.md` and `docs/DIALOGUE_BOUNDARY.md` and preserve their operational framing. Do not design functions against an imagined model interface; establish the concrete Granite WebApp call machinery and real call shape first.

Before modifying world-state handling, rendering state, assets, persistence, inventory, NPC state, JSON handling, or any other game-state machinery, read `docs/CSV_BACKING_STATE.md` and preserve it as a hard architectural boundary.

Store facts and attributed events, not designer interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar social abstractions are outside this experiment unless the user explicitly changes the research question. A failed emergence experiment is evidence, not permission to add a trust meter.

System prompts are data in CSV state. They may be character-specific or shared by reference; do not centralize them in executable code merely for convenience.

## Dialogue boundary

Dialogue is a sequence of repeated `Resolver → Granite → Witness` stages. Never merge the stages into an agent/chatbot loop.

Preserve these rules:

1. Every stage is one bounded transformation and ends at Witness.
2. A later stage starts again from CSV-bounded state through Resolver.
3. Human input is external data, not authority over schema, identity, scope, or world state.
4. Every Granite output is untrusted until Witness accepts/rejects it for that stage.
5. Granite is reset at call end with respect to game truth. Anything required later must survive in CSV-backed state and be supplied again.
6. `CHECK` is mandatory wherever human- or Granite-produced language can influence a later semantic/game stage.
7. Checker is its own Granite transformation. Witness does not perform Checker's semantic job.
8. Checker asks whether the utterance/candidate language is coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by the corresponding bounded packet.
9. Checker does not decide objective truth. Lies, mistakes, ambiguity, deception, and misunderstanding may survive when the language remains matchable to the packet.
10. Ungrounded subject matter must not drive later processing. Human or Granite language cannot create game ontology merely by mentioning it.
11. Checker is local to one side. Do not create an omniscient checker that sees both NPCs' private structures merely to force agreement.
12. NPC-to-NPC communication traverses the actual emitted utterance. Never hand the recipient the sender's hidden structured intent.
13. The final `EMIT` or `COMMIT` stage can return only values contained in its bounded game-defined possibilities.
14. Any dialogue/history/result needed by a later call must be CSV-backed. Hidden model context is never continuity.
15. Retry/correction behavior, if ever needed, is explicit, deterministic, and finite.

Directional sequencing:

```text
Human → NPC
INTAKE → CHECK → COMMIT
(each stage = Resolver → Granite → Witness)

NPC → Human
COMPOSE → CHECK → EMIT
(each stage = Resolver → Granite → Witness)

NPC → NPC
COMPOSE → CHECK → EMIT
actual utterance crosses
INTAKE → CHECK → COMMIT
(each stage = Resolver → Granite → Witness)
```

See `docs/DIALOGUE_BOUNDARY.md` for the full stage definitions.

## CSV backing-state boundary

CSV files are the backing state of MochEpoch. There is no second game-state representation.

Do not create or maintain an active in-memory world model, ECS, state store, object graph, inventory store, relationship graph, NPC state cache, renderer-owned gameplay state, or other parallel gameplay state. CSV is not merely an import/export format.

The allowed game-code shape is:

1. a first-person 3D client that reads the CSV-described world and renders it;
2. CSV files that describe world, system, entity, asset, communication, event, and other game-relevant backing state; and
3. classes that contain functions which read, resolve, validate, or transform that CSV backing state at explicit operation boundaries.

Function classes do not own game state. Any game-relevant result that must survive an operation belongs back in CSV-backed state.

JSON is transient operational structure, not backing state. The project's DNA/RNA analogy is mechanical only: CSV is the durable backing state; JSON is temporary expression or transport for one operation. A JSON package may be created from CSV, passed through Granite, validated by Witness, and discarded. If another stage requires the result, the witnessed result must survive as CSV-bounded state and be resolved again into the next JSON packet.

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

Save enough to establish one stage: relevant CSV before-state, Resolver parameters, raw Granite output/error, Witness acceptance/rejection, and resulting CSV-bounded state. Failed runs count.

When a dialogue sequence is tested, preserve each stage separately and preserve the actual utterance that crosses between speakers. Do not replace the actual utterance with hidden structured intent.

Do not turn evidence collection into a framework unless accumulated runs become hard to inspect manually.

## Before changing the repo

Read the current repository and the user's latest MochEpoch instructions. Do not import architecture from unrelated projects or generic best-practice templates.

When unsure whether to add machinery, do not add it. Build the next missing executable operation.

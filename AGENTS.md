# MochEpoch agent rules

## Preserve the experiment

MochEpoch asks whether civilization-like behavior can emerge from factual CSV world state, bounded Resolver/Granite/Witness transformations, and deterministic game execution without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization.

Preserve this core trust boundary:

```text
TRUSTED CSV-BACKED STATE
  ↓
RESOLVER
CSV → bounded JSON parameters
  ↓
GRANITE(operation)
JSON → JSON
  ↓
UNTRUSTED JSON RESULT
  ↓
WITNESS
JSON → bounded CSV-backed result or REJECT
  ↓
TRUSTED CSV-BACKED STRUCTURE AGAIN
```

Resolver is the outbound game-world boundary. It reads/resolves only the CSV-backed facts permitted for the current operation and constructs the bounded JSON parameters supplied to Granite.

Granite is a function used by the game: `parameters → Granite → return value`. It has no game authority, direct CSV access, hidden world state, or privileged memory. Every Granite return is untrusted, including the output of any checker/coherence operation.

Witness is the inbound boundary. It validates one raw Granite return against the exact schema, references, scope, identities, and authority permitted for the current operation, then produces only the bounded CSV-backed representation allowed for that operation or rejects it.

Do not swap the Resolver and Witness namespaces. Do not use `Witness` to mean outbound packet construction, and do not use `resolver` to mean the post-model consequence executor.

A witnessed result becoming trusted means it is legal game structure, not that a spoken claim is true, an interpretation is correct, or an NPC is honest.

If a witnessed result proposes a world consequence, deterministic game code checks current CSV-backed preconditions and performs any permitted mutation. Granite never commits a world mutation directly.

If a witnessed result is an utterance, deterministic game code delivers the accepted CSV-backed utterance to its recipient. Granite never writes directly to UI or bypasses Witness.

Before modifying Granite integration, Resolver, Witness, NPC processing, or natural-language communication machinery, read `docs/MODEL_ROLE.md` and `docs/DIALOGUE_BOUNDARY.md` and preserve their operational framing. Do not design functions against an imagined model interface; establish the concrete Granite WebApp call machinery and real call shapes before adding operation-specific functions.

Before modifying world-state handling, rendering state, assets, persistence, inventory, NPC state, JSON handling, or any other game-state machinery, read `docs/CSV_BACKING_STATE.md` and preserve it as a hard architectural boundary.

Store facts and attributed events, not designer interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar social abstractions are outside this experiment unless the user explicitly changes the research question. A failed emergence experiment is evidence, not permission to add a trust meter.

System prompts are data in CSV state. They may be character-specific or shared by reference; do not centralize them in executable code merely for convenience.

## Dialogue boundary

Human and NPC dialogue must obey the same `Resolver → Granite → Witness` trust crossing. The crossing never reverses; only the kind and direction of communication change.

Preserve these rules:

1. Human input is external data, not authority. It may be included in a Resolver package only as explicitly labeled current input.
2. Speaker, recipient, actor, operation, event/turn identity, world scope, and permitted output schema are bound from trusted game code/CSV. Granite may not choose or override them unless a specific field is explicitly delegated by schema.
3. Every Granite output is untrusted until Witness accepts it. A Granite `CHECK` call is not a security or authority boundary.
4. Speech is an attributed event, not a world fact. A claim cannot mutate unrelated world state merely by being spoken.
5. NPC-to-NPC communication must traverse the actual delivered utterance. Never hand the recipient the sender's hidden structured intent.
6. Every language-bearing dialogue path has a mandatory local Checker before final admission or delivery: human→NPC intake, NPC→human composition, sender-side NPC→NPC composition, and recipient-side NPC→NPC intake.
7. Checker calls are local to one transformation. Do not create an omniscient checker that sees both parties' private structures and forces perfect communication.
8. Coherence is not truth. Dialogue machinery must allow lies, mistakes, ambiguity, and misunderstanding when they fit the operation schema and grounding contract.
9. Dialogue discourse is packet-bounded. A false proposition about grounded packet concepts may be valid speech, but human or Granite language must not introduce content-bearing entities, objects, systems, capabilities, or subject matter absent from the bounded JSON package. Surface-language glue and synonyms are allowed only when their content maps back to grounded packet content. A dialogue `CHECK` must test this grounding as well as local coherence.
10. Witness still performs the deterministic admission boundary. A Checker result of `valid` cannot make a missing, unknown, or out-of-scope referent legal.
11. Any dialogue/history that must affect a later turn must be CSV-backed. Do not preserve continuity in hidden model context.
12. Resolver context is scoped per operation. Do not dump the whole world or complete transcript into Granite merely because it exists.
13. If retry/correction behavior is ever needed, game code defines an explicit finite policy. Granite cannot recursively call itself or retry until it likes its own answer.

See `docs/DIALOGUE_BOUNDARY.md` for the directional human→NPC, NPC→human, and NPC→NPC flows.

## CSV backing-state boundary

CSV files are the backing state of MochEpoch. There is no second game-state representation.

Do not create or maintain an active in-memory world model, ECS, state store, object graph, inventory store, relationship graph, NPC state cache, renderer-owned gameplay state, or other parallel gameplay state. CSV is not merely an import/export format.

The allowed game-code shape is:

1. a first-person 3D client that reads the CSV-described world and renders it;
2. CSV files that describe world, system, entity, asset, communication, event, and other game-relevant backing state; and
3. classes that contain functions which read, resolve, validate, or transform that CSV backing state at explicit operation boundaries.

Function classes do not own game state. Any game-relevant result that must survive an operation belongs back in CSV-backed state.

JSON is transient operational structure, not backing state. The project's DNA/RNA analogy is mechanical only: CSV is the durable backing state; JSON is temporary expression or transport for a particular operation. A JSON package may be created from CSV, passed through Granite or another function, validated against CSV, and then discarded. If a JSON result affects the continuing world, it must first return through Witness into legal CSV-backed structure. Any actual world consequence is then applied by deterministic code against current CSV-backed preconditions. Do not literalize the analogy into biological mechanics.

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

Save enough to establish the current run: relevant before-state, Resolver parameters, raw Granite output or error, Witness acceptance/rejection, relevant trusted CSV result, any deterministic consequence result, relevant after-state, and visible consequence when useful. Failed runs count.

For dialogue runs, preserve the actual delivered utterance and the bounded context identifiers needed to establish which side saw what. Do not replace the actual utterance with the sender's hidden structured intent.

Do not turn evidence collection into a framework unless accumulated runs become hard to inspect manually.

## Before changing the repo

Read the current repository and the user's latest MochEpoch instructions. Do not import architecture from unrelated projects or generic best-practice templates.

When unsure whether to add machinery, do not add it. Build the next missing executable operation.

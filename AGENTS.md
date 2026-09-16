# MochEpoch agent rules

## Read this first

Before changing MochEpoch architecture, world state, Granite integration, actor behavior, rendering state, assets, persistence, or game systems, read:

1. `docs/GAME_BLUEPRINT.md`
2. `docs/CSV_BACKING_STATE.md`
3. `docs/MODEL_ROLE.md`
4. `docs/DIALOGUE_BOUNDARY.md` when communication is involved
5. `docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md`

The current repository `main` branch is authoritative. Do not reconstruct architecture from old chat assumptions, retired prototypes, generic game-engine patterns, or unrelated projects.

## Preserve the experiment

MochEpoch asks whether civilization-like behavior can emerge from factual CSV-backed world state, bounded JSON transformations, actor behavior, and deterministic game execution without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization.

The compact game lifecycle is:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

This is not shorthand for a larger hidden agent architecture. It is the core state-transition lifecycle of the game.

The player and NPCs may behave chaotically. Do not add machinery to make them sensible, truthful, moral, cooperative, optimal, or consistent merely because their behavior looks strange. The experiment depends on allowing that variation while constraining what can become authoritative world state.

## One game truth

CSV-backed state is the only authoritative continuing game state.

JSON is transient operational structure.

Do not create or maintain an authoritative parallel world in JavaScript objects, Maps, an ECS, state stores, scene graphs, inventory managers, relationship graphs, NPC caches, model context, renderer state, or other runtime structures.

If a game-relevant fact must survive the current operation, it needs a CSV-backed representation.

If something exists only to produce pixels, audio, animation, GPU work, model inference, decoding, or another backend effect, it is transient/resource machinery rather than independent game truth.

Function/class instances own no game state.

A browser persistence substrate may store authoritative CSV-backed documents. It must not replace CSV with a separate in-memory data model.

## The harness is the game lifecycle

The harness must remain small and generic.

For an actor-mediated transition it does only the operations required to move from one authoritative world state to the next:

```text
TRUSTED CSV WORLD
        ↓
resolve relevant state
        ↓
bounded JSON packet
        ↓
NPC or HUMAN
(action / natural-language dialogue)
        ↓
JSON expression/result
        ↓
map / validate against CSV-defined possibilities
        ↓
deterministic game consequence where applicable
        ↓
write durable accepted facts/events to CSV
        ↓
TRUSTED CSV WORLD'
```

Do not turn the harness into a planner, agent framework, semantic world model, behavior tree, social simulation layer, orchestration platform, or second ECS.

A local operation can be tree-shaped or DAG-shaped because it resolves several CSV references and functions. The full game is a graph because accepted state transitions feed later operations.

## Three allowed operation shapes

Unless an executable failure proves another primitive is required, reduce game work to these shapes.

### Projection

```text
CSV → renderer / audio / UI
```

Projection does not mutate authoritative state.

### Deterministic transition

```text
CSV → deterministic function → CSV
```

### Actor-mediated transition

```text
CSV → JSON → NPC / HUMAN → JSON → bounded mapping / deterministic consequence → CSV
```

Do not force Granite into direct deterministic controls or systems that do not need fuzzy generation/mapping.

## Behavioral freedom and ontology boundary

Do not police actor behavior for sensibility.

An NPC or human may lie, misunderstand, contradict themselves, make a poor choice, attempt an impossible action, use strange language, refuse, cooperate, or behave unexpectedly.

The harness asks what the action/dialogue corresponds to in the currently represented world.

It does not ask whether the behavior is true, wise, moral, polite, socially appropriate, or optimal.

Language or behavior cannot create game ontology by mentioning it. If the bounded world contains no spaceship, saying "use the spaceship" does not create one.

Semantic validity and mechanical success are different. `hand_over(stone)` may be a legal expressed action even when deterministic mechanics later reject the consequence because the actor does not currently hold the stone.

Preserve behavioral freedom. Constrain only the boundary between actor expression and authoritative world state.

## Player and NPC symmetry

The player and NPCs enter the same behavioral boundary from the perspective of game truth.

NPC behavior may use Granite to generate/evaluate actions or dialogue from the bounded current possibility-space.

Human behavior enters as external action/dialogue and may use Granite when fuzzy mapping or natural-language interpretation is required.

Direct deterministic controls do not need Granite merely because Granite exists.

Do not create separate hidden semantic universes for human and NPC behavior.

## Granite role

Granite is a bounded JSON → JSON game function.

Its exact role is:

> Generate or evaluate actions and natural-language dialogue against the finite behavioral possibilities exposed by the current CSV-described world.

Granite does not own an NPC, own world state, read arbitrary CSV, choose its own scope, decide objective truth, execute physical consequences, mutate arbitrary world state, write directly to UI, or carry hidden game truth between calls.

The primitive is:

```text
CSV-backed world / bounded transient input
        ↓
RESOLVER
        ↓
bounded JSON parameters
        ↓
GRANITE(stage)
        ↓
untrusted JSON result
        ↓
WITNESS
        ↓
bounded transient result or REJECT
```

Resolver projects only the input permitted for one transformation.

Granite performs one requested JSON → JSON transformation.

Witness validates the raw Granite return against the operation's schema, allowed values/references, identity, scope, and other deterministic bounds. Witness does not perform the semantic `CHECK` job and does not execute consequences.

`CSV-bounded` means constrained to possibilities defined from trusted CSV. It does not mean the intermediate is itself authoritative CSV-backed state.

Only an explicit accepted write into CSV-backed state changes continuing game truth.

Do not use a bounded transient intermediate as hidden game state.

## Dialogue boundary

Natural-language communication may chain several ordinary `Resolver → Granite → Witness` transformations.

```text
Human → NPC
INTAKE → CHECK → COMMIT

NPC → Human
COMPOSE → CHECK → EMIT

NPC → NPC
COMPOSE → CHECK → EMIT
actual utterance crosses
INTAKE → CHECK → COMMIT
```

Every named stage is still the same Granite-call primitive.

Intermediate stage results are bounded transient structures. They are not authoritative CSV-backed world state merely because Witness accepted their structure.

`CHECK` is mandatory wherever human- or Granite-produced language could drive the final semantic/game result. Checker asks whether the language is coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by the supplied bounded packet.

Checker does not decide objective truth. Lies, mistakes, ambiguity, deception, and misunderstanding may survive when language remains grounded in the packet.

NPC-to-NPC communication traverses the actual emitted utterance. Never give the recipient the sender's hidden structured candidate.

Preserve:

```text
A intended X → said Y → B interpreted Z
```

including `X ≠ Z`.

A final emitted utterance may be delivered without automatically becoming a durable world fact. If future operations need the fact that it was spoken/heard, persist the appropriate attributed event in CSV.

## Deterministic consequence boundary

Granite may generate/evaluate a valid expressed action. Deterministic game code decides what physically happens from the current CSV-backed facts.

Do not encode physical success into Granite merely to prevent failed attempts.

Do not let Granite directly mutate arbitrary world state.

Do not let deterministic mechanics infer social interpretations that were never factual state.

## Backing structure must fall out of the game

Do not freeze the final CSV topology, ECS schema, packet schema, spatial index, component model, file-per-entity policy, or world database in advance.

Lock the authority boundary and the categories the game must be able to describe. Let concrete schemas emerge as actual first-person game assets and mechanics are forced through the real lifecycle.

The game-relevance test is:

> If Granite, the player, an NPC, deterministic mechanics, or a future operation may need to refer to a fact after the current operation ends, that fact needs a CSV-backed representation.

Rendering-only detail does not need independent authoritative state.

Examples:

- thousands of decorative grass instances may correspond to one game-relevant vegetation/resource description;
- an individual branch that can be picked up, carried, discussed, stored, burned, or revisited needs enough CSV-backed identity/state for those operations;
- a tree only becomes individually authoritative when implemented mechanics require an individual tree to be referenced or changed.

Do not turn these examples into a preselected schema.

## World categories

The backing state must eventually be able to describe whatever implemented mechanics require from categories including:

- world/space: terrain, regions, water, positions, orientations, containment, adjacency, occupancy, reachability, time/environment;
- actors: player, NPCs, creatures, physical condition, holdings/equipment, factual observations/history when later behavior requires them;
- natural resources and objects: trees, rocks, branches/logs, vegetation, water/resources, materials, tools, food, containers, equipment;
- built world: shelters, houses, storage, workshops, fires, walls, doors, bridges, roads, farms, wells, furniture, construction-in-progress;
- game actions/transformations: only those actually implemented by game assets/mechanics;
- factual events/history: only what future operations need;
- systems/functions: deterministic mechanics, model configuration, prompts, bounded inputs/outputs, function routing; and
- asset/resource references: models, rigs, terrain, textures, materials, animation, audio, shaders, generators, model resources, and other backend assets.

These are ontology categories, not fixed CSV schemas.

## No encoded civilization

Store facts and attributed events, not designer interpretations.

Do not add authoritative trust, morality, friendship, loyalty, resentment, faction sentiment, civilization scores, or similar social abstractions unless the user explicitly changes the research question.

A failed emergence experiment is evidence, not permission to add a trust meter.

System prompts are CSV-backed configuration. They may be entity-specific or shared by reference. Do not centralize them in executable code merely for convenience.

## Renderer and resource boundary

The first-person 3D renderer is a projection of the CSV-described world.

Game assets are discovered through CSV-backed references/manifests. The referenced resource may use the format required by its backend.

Renderer/model backend internals such as scene objects, GPU buffers, animation mixers, workers, caches, handles, or model runtime state are disposable. They must not contain a continuing game fact that exists nowhere in CSV.

If the transient runtime is discarded and rebuilt from CSV-backed state plus referenced resources, the same continuing game world must be recoverable.

## Work scratchpad handshake

When ChatGPT Work is used on this repository, `scratchpad/` is the required communication surface between Work, the user, and normal ChatGPT sessions.

Before Work changes game code, world CSVs, project architecture, runtime machinery, dependencies, hosting configuration, or other implementation files, it must read `scratchpad/README.md`, write one narrowly scoped proposal into `scratchpad/WORK.md`, set `status: PROPOSED`, and stop for review.

Work may proceed only when `scratchpad/REVIEW.md` explicitly approves the same `proposal_id`, or when the user explicitly tells Work in the active Work conversation to proceed with that exact proposal. Approval is proposal-specific and is never standing permission.

If approved work later requires more files, different machinery, architecture changes, a new service, cost/quota exposure, or another material scope change, Work must record the change/blocker in `scratchpad/WORK.md` and stop again.

After completing approved work, Work updates `scratchpad/WORK.md` with the actual result and commit/evidence references.

The scratchpad is communication only. It is not game state, experimental evidence, or architectural authority.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

Do not add frameworks, services, validators, test harnesses, schedulers, databases, deployment systems, account systems, abstractions, or dependencies because they may be useful later.

Prefer plain HTML, JavaScript, CSV, and local/manual checks until an observed requirement needs something more.

Documentation describes the machine. Code must not parse project documentation as runtime authority.

## Cost boundary

Never create, enable, configure, or rely on GitHub Actions or any other metered or hosted execution without the user's explicit approval.

Without explicit approval, do not add CI/CD, scheduled cloud jobs, Codespaces, CodeQL jobs, Pages deployment automation, Dependabot automation, hosted builds, hosted databases, serverless functions, hosted inference, analytics, telemetry, monitoring, or third-party services with billing/quota exposure.

A free tier is not permission.

If an external service is genuinely required and has not been approved, stop and explain the concrete requirement and exposure.

## Evidence

Save only enough evidence to establish the operation being tested.

For a Granite transformation, preserve the relevant CSV-backed input, Resolver packet, raw Granite output/error, Witness result/rejection, deterministic consequence if any, and resulting CSV-backed state if it changed.

For dialogue tests, preserve the actual utterance crossing between speakers and the bounded transient results required to diagnose the run. Do not mistake those intermediates for authoritative world state.

For lifecycle tests, prove that the next operation works from the mutated CSV-backed state with transient runtime/model state discarded or irrelevant.

Do not turn evidence collection into a framework unless accumulated runs become hard to inspect manually.

## Before changing the repo

Read current `main` and the user's latest MochEpoch instructions.

Do not import architecture from retired prototypes. A retired prototype may establish examples of game objects/assets that the real game must eventually describe, but its code structure, state ownership, behavior systems, and schemas are not architectural authority.

When unsure whether to add machinery, do not add it. Build the next missing executable operation.

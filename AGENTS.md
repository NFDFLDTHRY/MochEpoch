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

MochEpoch asks whether civilization-like behavior can emerge from factual CSV-backed world state, bounded JSON transformations, human/NPC behavior, and deterministic execution without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization.

The compact game lifecycle is:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

This is not shorthand for a larger hidden agent architecture. It is the game-state lifecycle.

The human and NPCs may behave chaotically. Do not add machinery to make them sensible, truthful, moral, cooperative, optimal, or consistent merely because behavior looks strange. The chaos is experimental material.

## One game truth

CSV-backed state is the only authoritative continuing game state/history/configuration.

JSON is transient operational structure.

Do not create or maintain an authoritative parallel world in JavaScript objects, Maps, an ECS, state stores, scene graphs, inventory managers, relationship graphs, NPC caches, model context, renderer state, or other runtime structures.

If a game-relevant fact/event must survive the current operation, it needs a CSV-backed representation.

If something exists only to produce pixels, audio, animation, GPU work, model inference, decoding, or another backend effect, it is transient/resource machinery rather than independent game truth.

Function/class instances own no game state.

A browser persistence substrate may store authoritative CSV-backed documents. It must not replace CSV with a separate authoritative object model.

## The harness is the game lifecycle

For an actor-mediated transition:

```text
AUTHORITATIVE CSV WORLD
        ↓
Witness resolves the scoped CSV and constructs one JSON operation packet
        ↓
NPC or HUMAN behavior
(Granite only where fuzzy generation/mapping is required)
        ↓
raw JSON expression/result
        ↓
deterministic parse / map / accept or REJECT
        ↓
write any durable actor expression/event to CSV-backed state
        ↓
deterministic game consequence where applicable
        ↓
write resulting durable facts/events to CSV-backed state
        ↓
AUTHORITATIVE CSV WORLD'
```

Do not turn the harness into a planner, agent framework, semantic world model, behavior tree, social simulation layer, orchestration platform, dialogue manager, or second ECS.

A local operation may be tree-shaped or DAG-shaped because it resolves several CSV references/functions. The whole game is a graph because systems/entities reference each other and accepted state transitions feed later operations.

## Current fixture root

The current executable fixture uses `world/world.csv` as its search list for what exists or matters. In the current probe, `type,name` resolves the referenced CSV record.

That is the current fixture arrangement, not a frozen final topology. Preserve it until an executable operation requires a different minimum representation. Do not generalize the current file-per-name resolver into a permanent world schema merely because it exists first.

## CSV-described function graph

Game-specific wiring belongs in CSV-backed configuration.

CSV-backed configuration may select/reference, as actual operations require:

- the operation/function being performed;
- the generic function/system to call;
- Granite/model configuration when that function is Granite;
- caller/actor/world/system references;
- the applicable system prompt;
- scoped input facts/populations for Witness to retrieve;
- required output shape/population; and
- the next operation/function edge when real execution requires one.

Generic executable functions implement operations. They do not own the world or encode a second game-specific state machine.

Do not freeze a universal function-graph CSV schema before real execution reveals the minimum required shape.

## Three operation shapes

Unless execution proves another primitive is required, reduce game work to:

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
CSV → JSON → NPC / HUMAN → JSON → deterministic mapping → CSV → deterministic consequence → CSV
```

Do not force Granite into direct deterministic controls or systems that do not need fuzzy generation/mapping.

## Behavioral freedom and ontology boundary

The harness asks what an action/dialogue corresponds to in the currently represented world.

It does not ask whether behavior is true, wise, moral, polite, socially appropriate, or optimal.

Language or behavior cannot create game ontology by mentioning it. If the current operation contains no spaceship, saying `use the spaceship` does not create one.

Mapping and mechanical success are different. `hand_over(stone)` may be a valid expressed action even when deterministic mechanics later reject the consequence because the actor does not currently hold the stone.

Preserve behavioral freedom. Constrain only what can become authoritative CSV-backed state.

## Player and NPC symmetry

The player and NPCs enter the same behavioral boundary from the perspective of game truth.

NPC behavior may use Granite to generate/evaluate actions or dialogue from the bounded current possibility-space.

Human behavior enters as external action/dialogue and may use Granite when fuzzy mapping or natural-language interpretation is required.

Direct deterministic controls do not need Granite merely because Granite exists.

Do not create separate hidden semantic universes for human and NPC behavior.

## Witness role

Witness is the scoped CSV → JSON Granite-call constructor.

A Witness call:

1. receives the caller/operation and CSV-backed references/configuration selected for that call;
2. resolves only that scoped CSV state;
3. includes the system prompt, model/function configuration, current situation, bounded possibilities, and required output shape actually requested; and
4. constructs the transient JSON packet Granite receives.

Witness owns no state. It does not inspect Granite output, decide consequences, repair output, maintain NPC memory, or mutate CSV.

There is no required separate `Resolver` architecture. CSV reference resolution is ordinary generic work performed during Witness packet construction.

Do not turn Witness into a model wrapper framework or stateful service. It is just the outbound edge of the harness.

## Granite role

Granite is a bounded JSON → JSON game function.

Its exact role is:

> Generate or evaluate actions and natural-language dialogue from the bounded game possibilities supplied in one operation packet.

Granite does not own an NPC, own world state, read arbitrary CSV, choose its own scope, decide objective truth, execute physical consequences, mutate CSV, write directly to UI, or carry hidden game truth between calls.

## Return edge

Granite returns raw JSON. That JSON is non-authoritative until the deterministic harness maps it into the configured game representation and explicitly writes any durable result into CSV-backed state.

```text
raw JSON
        ↓
parse / validate / map against configured output bounds
        ↓
accepted game representation or REJECT
        ↓
CSV-backed write when persistent
```

Do not create another named subsystem merely for this return edge.

The return edge must not become a behavior corrector, truth engine, or social-state interpreter.

## Dialogue boundary

Natural-language communication is not a separate subsystem. It is another actor-mediated transition through the same harness.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed dialogue stage graph.

Start with the smallest mapping that completes the real interaction. If one Granite transformation is sufficient, use one. Add another transformation, retry, check, or correction pass only when an executed case demonstrates a concrete need. Any additional routing belongs in CSV-backed function configuration.

For NPC-to-NPC communication, the actual utterance crosses between actors. Never replace the delivered utterance with hidden sender-side structured data.

A completed communication that must affect later operations returns through the harness into CSV-backed factual/attributed state. Recording `A said Y` makes the speech event factual; it does not make the proposition inside `Y` objectively true.

See `docs/DIALOGUE_BOUNDARY.md`.

## Deterministic consequence boundary

Granite may generate/evaluate a game-defined expressed action. The deterministic return edge maps it into the game. Deterministic mechanics then decide what physically happens from current CSV-backed facts.

Do not encode physical success into Granite merely to prevent failed attempts.

Do not let Granite directly mutate arbitrary world state.

Do not let deterministic mechanics invent social interpretations that were never factual state.

## Backing structure must fall out of the game

Do not freeze the final CSV topology, ECS schema, packet schema, spatial index, component model, file-per-entity policy, event schema, or world database in advance.

Lock the authority boundary and the categories the game must be able to describe. Let concrete schemas emerge as actual first-person game assets and mechanics are forced through the real lifecycle.

Use this test:

> If Granite, the player, an NPC, deterministic mechanics, or a future operation may need to refer to a fact/event after the current operation ends, that fact/event needs a CSV-backed representation.

Rendering-only detail does not need independent authoritative state.

## World categories

The backing state must eventually be able to describe whatever implemented mechanics require from categories including:

- world/space: terrain, regions, water, positions, orientations, containment, adjacency, occupancy, reachability, time/environment;
- actors: player, NPCs, creatures, physical condition, holdings/equipment, factual observations/history when later behavior requires them;
- natural resources and objects: trees, rocks, branches/logs, vegetation, water/resources, materials, tools, food, containers, equipment;
- built world: shelters, houses, storage, workshops, fires, walls, doors, bridges, roads, farms, wells, furniture, construction-in-progress;
- game actions/transformations: only those actually implemented by game assets/mechanics;
- factual events/history: actor expressions, speech, transfers, observations, construction, destruction, extraction, injury/death, and other events actual mechanics require;
- systems/functions: deterministic mechanics, model configuration, prompts, scoped inputs/outputs, function routing; and
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

If transient runtime machinery is discarded and rebuilt from CSV-backed state plus referenced resources, the same continuing game world must be recoverable.

## Work scratchpad handshake

When ChatGPT Work is used on this repository, `scratchpad/` is the required communication surface between Work, the user, and normal ChatGPT sessions.

Before Work changes game code, world CSVs, project architecture, runtime machinery, dependencies, hosting configuration, or other implementation files, it must read `scratchpad/README.md`, write one narrowly scoped proposal into `scratchpad/WORK.md`, set `status: PROPOSED`, and stop for review.

Work may proceed only when `scratchpad/REVIEW.md` explicitly approves the same `proposal_id`, or when the user explicitly tells Work in the active Work conversation to proceed with that exact proposal. Approval is proposal-specific and is never standing permission.

If approved work later requires more files, different machinery, architecture changes, a new service, cost/quota exposure, or another material scope change, Work must stop again.

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

## Evidence

Save only enough evidence to establish the operation being tested.

For a Granite-backed actor operation, preserve the relevant CSV-backed input, the actual Witness packet, the raw Granite output/error, the deterministic map/accept/reject result, any accepted CSV-backed actor expression/event, deterministic consequence if any, and resulting CSV-backed state if it changed.

For communication tests, preserve the actual executed model calls and the utterance that crossed. Do not invent evidence for hypothetical stages that did not run.

For lifecycle tests, prove that the next operation works from mutated CSV-backed state with transient runtime/model state discarded or irrelevant.

## Before changing the repo

Read current `main` and the user's latest MochEpoch instructions.

Do not import architecture from retired prototypes. A retired prototype may establish examples of game objects/assets that the real game must eventually describe, but its code structure, state ownership, behavior systems, and schemas are not architectural authority.

When unsure whether to add machinery, do not add it. Build the next missing executable operation.

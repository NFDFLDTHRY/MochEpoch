# MOCH EPOCH — IMPLEMENTATION PLAN

## QUESTION

Can a civilization-like first-person game emerge from CSV-backed world truth, bounded JSON transformations, human/NPC behavior, and deterministic consequences without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

Read `docs/GAME_BLUEPRINT.md` first. It is the architectural blueprint.

## GAME TRUTH

The compact lifecycle is:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

CSV-backed state is authoritative continuing game truth/history/configuration.

JSON is temporary operational structure.

The harness that performs this transition is the game's state-transition lifecycle, not a separate simulation subsystem.

The first-person renderer and asset/runtime machinery project that state but do not own it.

## ACTOR-MEDIATED LIFECYCLE

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
deterministic game resolution where physical consequence is required
        ↓
write resulting durable facts/events to CSV-backed state
        ↓
AUTHORITATIVE CSV WORLD'
```

The human or NPC may behave chaotically. They may lie, misunderstand, contradict themselves, make a poor choice, attempt an impossible action, use strange language, cooperate, refuse, or otherwise surprise the designer.

Do not add machinery merely to normalize that behavior. The variation is part of the experiment.

The harness constrains what behavior can map back into the represented world. It does not decide whether that behavior is wise, moral, truthful, socially appropriate, or optimal.

Language/behavior cannot create authoritative world ontology by mention alone.

## FUNCTION GRAPH

The harness executes a CSV-described graph of generic operations.

CSV-backed configuration may select/reference, as real operations require:

- operation/function identity;
- generic function/system selection;
- Granite/model/runtime resource when applicable;
- caller/actor/world/system references;
- system prompt;
- scoped input facts/populations for Witness to retrieve;
- output schema/population; and
- next function/operation edge when execution proves one is needed.

Executable functions are generic/stateless with respect to game truth.

Do not hard-code a second per-NPC/per-object control architecture merely to make the graph convenient.

Do not freeze a universal function-graph CSV schema before real execution proves the minimum representation.

## THREE OPERATION SHAPES

Unless execution proves another primitive is required, game operations reduce to:

### Projection

```text
CSV → renderer / audio / UI
```

### Deterministic transition

```text
CSV → deterministic function → CSV
```

### Actor-mediated transition

```text
CSV → JSON → NPC / HUMAN → JSON → deterministic mapping → CSV → deterministic consequence → CSV
```

Do not put Granite into deterministic systems that do not need fuzzy generation/mapping.

## GRANITE CONTRACT

Granite is a bounded JSON → JSON game function.

Its exact job is:

> Generate or evaluate actions and natural-language dialogue from the bounded game possibilities supplied in one operation packet.

Granite does not own NPCs, own world state, inspect arbitrary CSV directly, choose its own scope, decide objective truth, execute physical consequences, mutate CSV, or carry hidden game truth between calls.

## WITNESS CONTRACT

Witness is the scoped CSV → JSON Granite-call constructor.

A Witness call:

1. receives the caller/operation and the CSV-backed references/configuration selected for the call;
2. resolves only that scoped CSV state;
3. includes the system prompt, model/function configuration, current situation, bounded possibilities, and required output shape actually requested; and
4. constructs the transient JSON packet Granite receives.

Conceptually:

```text
CSV-backed operation/world/configuration
        ↓
Witness
retrieve scoped CSV + construct packet
        ↓
bounded JSON packet
        ↓
Granite
        ↓
raw JSON return
```

Witness owns no game state and does not inspect or validate Granite output.

There is no required separate Resolver architecture. CSV reference resolution is simply part of Witness packet construction using generic CSV machinery.

## RETURN EDGE

The deterministic harness/game runner handles the Granite return:

```text
raw JSON
        ↓
parse / validate / map against configured output bounds
        ↓
accepted game representation or REJECT
        ↓
write durable actor event/fact when needed
        ↓
deterministic physical consequence where applicable
        ↓
write resulting durable facts/events
```

Do not invent another named subsystem merely for this edge.

JSON does not become game truth merely because it parses or matches a schema. Only accepted CSV-backed writes change continuing game truth/history.

## PLAYER / NPC SYMMETRY

NPC behavior may use Granite to generate/evaluate actions or dialogue from a bounded current possibility-space.

Human behavior enters as external action/dialogue and may use Granite when fuzzy mapping or natural-language interpretation is required.

Direct deterministic controls do not require Granite merely because the model exists.

Do not build two separate semantic worlds for player and NPC behavior.

## SEMANTIC MAPPING VERSUS PHYSICAL SUCCESS

An actor can express a game-defined action that fails physically.

Example:

```text
hand_over(stone)
```

This can map because `hand_over` and `stone` exist in the current game possibilities.

The accepted expression/event may return to CSV-backed state when it must persist.

Deterministic mechanics then inspect current CSV-backed state. If the actor no longer holds the stone, the physical consequence fails according to the implemented mechanic.

Do not force Granite to pre-solve every mechanical precondition merely to prevent failed attempts.

## COMMUNICATION

Natural-language communication is not a separate architecture.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed dialogue stage graph.

Use the same actor-mediated lifecycle:

```text
relevant CSV-backed world + utterance/source behavior
        ↓
Witness packet
        ↓
smallest Granite transformation actually required
        ↓
raw JSON result
        ↓
deterministic mapping / REJECT
        ↓
CSV-backed communication event/result when persistent
```

If one Granite call is sufficient, use one.

Add another model transformation, retry, check, or correction pass only when an executed communication case proves the extra step is necessary. Any additional routing belongs in CSV-backed function configuration.

For NPC → NPC communication, the actual utterance crosses between actors. Never hand the recipient hidden sender-side structured data in place of what was actually said.

Recording `A said Y` makes the speech event factual. It does not make the proposition inside `Y` objectively true.

## CSV BACKING STATE

Do not maintain authoritative gameplay truth in JavaScript objects, Maps, a runtime ECS, state stores, renderer objects, inventory managers, relationship graphs, NPC caches, model context, or another parallel representation.

If a game-relevant fact/event must survive the current operation, it needs a CSV-backed representation.

If something exists only to produce pixels, audio, animation, GPU work, model inference, decoding, or another backend representation, it is transient/resource machinery rather than independent game truth.

Repository CSV files may be seed/default state. The eventual browser persistence substrate must preserve authoritative world state/history/configuration as CSV-backed documents.

## BACKING STRUCTURE DISCOVERY

Do not freeze the final CSV topology before building the game.

The first-person world assets and mechanics reveal the required backing structure as they are implemented and forced through the lifecycle.

The repository should lock:

- the authority boundary;
- the harness lifecycle;
- the categories of things the world must be able to describe; and
- Granite's behavioral contract.

It should not prematurely lock:

- a final `ecs.csv`;
- file-per-entity storage;
- component tables;
- a database normalization scheme;
- an event schema;
- a spatial index;
- a universal Granite packet schema;
- a universal dialogue schema;
- a universal function-graph schema; or
- a fixed model-call count.

Use this test:

> If Granite, the player, an NPC, deterministic mechanics, or a future operation may need to refer to a fact/event after the current operation ends, that fact/event needs a CSV-backed representation.

## WORLD CATEGORIES

These are ontology categories, not fixed schemas.

The backing state must eventually be able to describe whatever implemented mechanics require from:

### World / space

Terrain, regions/clearings/forests/fields/settlements, water, positions/orientations, containment/adjacency/occupancy/reachability, extents, time/environment.

### Actors

Player, NPCs, creatures if added, identity, location/orientation, physical condition, holdings/equipment, persistent game-relevant state, factual observations/history when later behavior requires them.

### Physical / biological state

Only when mechanics require it: injury/health, hunger, thirst, fatigue/sleep, exposure, movement capability, carrying limits, sensory capability.

### Natural resources / objects

Trees, rocks/stone, branches/logs, vegetation, food plants, water/resources, materials, loose objects, tools, clothing/equipment, food/consumables, containers/storage, unique objects.

### Built world

When implemented: shelters/houses, storage, workshops, fires, walls/fences, gates/doors, bridges, roads/paths, farms/plots, wells, furniture, construction-in-progress.

### Actions / transformations

Only what actual mechanics require: movement, object handling, use, traversal, gathering, harvesting, crafting, building, repair, farming, storage/transport/consumption, combat if implemented, and later behaviors proven necessary.

### Events / history

Actor-mediated expressions/results that later operations need, plus other factual/attributed events actual mechanics require: speech, observations, attempted actions, transfers, construction/destruction, extraction, crafting, injury/death, and later event types proven necessary.

Exact event schema/retention is not fixed yet.

### Systems / function configuration

Deterministic mechanics, operation identity, generic function selection, model/runtime selection, prompts, scoped inputs, output definitions, function routing, and other configuration proven necessary.

### Assets / resources

Actor models/rigs, terrain geometry/generators, world-object resources, materials/textures, water, animation, audio, shaders, model resources, and other backend assets.

## RENDERER / RESOURCE BOUNDARY

Scene objects, meshes, GPU buffers, animation mixers, LOD state, particles, shadows, fog, camera internals, renderer caches, model caches, workers, and backend handles are not game truth.

Destroying and rebuilding transient runtime machinery from CSV-backed state plus referenced resources must reproduce the same continuing game facts/events.

## NO ENCODED CIVILIZATION

Store factual state and attributed events, not designer interpretations.

Do not add authoritative trust, morality, friendship, loyalty, resentment, faction sentiment, civilization scores, or similar social abstractions unless the research question is explicitly changed.

A civilization-like pattern must emerge from repeated actor behavior and deterministic consequences over factual state, or fail to emerge.

Failure is valid experimental evidence.

## CURRENT FIXTURE

The current seed is intentionally tiny:

```text
world: one room
player: player
game-controlled character: Ada
object: stone
initial fact: Ada holds the stone
configured decision system: interaction
bounded action output: hand_over | wait
```

The fixture is plumbing evidence, not the final game ontology.

Ada is game-controlled. Granite may be called by her configured operation as an ordinary function. Granite does not embody Ada.

Do not generalize the current `interaction.csv` shape into the final game architecture merely because it exists first.

## CURRENT EVIDENCE

The Chrome read/resolve/render milestone established that current CSV-backed seed state can be read, references resolved, rendered diagnostically, changed by editing the backing CSV, and failed closed when a required referenced CSV is missing.

It did not establish:

- a real Granite call;
- a real Witness packet;
- actor-event admission;
- actor-mediated mutation;
- browser persistence;
- the first-person 3D renderer;
- final world/event/function-graph schemas; or
- civilization-like emergence.

Do not report any of those as established.

## NEXT EXECUTABLE OPERATION

Establish the concrete Granite 350M browser/WebApp calling machinery.

The smallest useful proof is:

1. load the real Granite runtime/model in the target browser path;
2. make one real bounded JSON-in → JSON-out call;
3. parse the actual return;
4. record success/failure and runtime evidence;
5. do not attach fake game authority or synthetic fallback.

After that interface is proven:

1. build the thinnest Witness required to retrieve the current fixture's scoped CSV inputs and construct the proven call packet;
2. build the smallest deterministic JSON-return mapping required by that same operation;
3. connect the current fixture through a real `CSV → Witness JSON → Granite → JSON → deterministic map → CSV actor event → deterministic consequence → CSV` operation;
4. render the changed CSV-backed result;
5. prove the next interaction reads the mutated CSV-backed world without hidden model/runtime game state.

Do not freeze future packet/world/event/function-graph/dialogue schemas before these runs reveal their requirements.

## PASS CONDITION

For the first complete actor-mediated fixture:

- one authoritative CSV-backed world begins in a known state;
- one Witness call constructs the operation packet from scoped CSV-backed state/configuration;
- one real Granite result is produced where the operation requires Granite;
- deterministic code parses/maps the result against the configured bounds;
- any durable actor expression/event is written to CSV-backed state;
- deterministic mechanics compute the permitted physical consequence;
- resulting durable facts/events are written to CSV-backed state;
- rendering reflects the new state; and
- the next operation works correctly from that mutated CSV-backed state without hidden model memory or hidden authoritative runtime state.

## BUILD POLICY

```text
Question
  ↓
Define operation
  ↓
Build smallest version
  ↓
Run
  ↓
Save evidence
  ↓
Try to break
  ↓
Report only what the run established
  ↓
Add machinery only when a failure requires it
```

Do not add cloud/metered automation, GitHub Actions, hosted inference, databases, generic agent frameworks, generalized dialogue systems, or speculative infrastructure without explicit user approval and an observed need.

Deployment, authentication, payments, and other product-shell work remain separate from the core civilization experiment unless explicitly requested.

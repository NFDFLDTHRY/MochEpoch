# MOCH EPOCH — IMPLEMENTATION PLAN

## QUESTION

Can a civilization-like first-person game emerge from CSV-backed world truth, bounded JSON transformations, human/NPC behavior, and deterministic consequences without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

Read `docs/GAME_BLUEPRINT.md` first. It is the architectural blueprint.

## GAME TRUTH

The compact lifecycle is:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

CSV-backed state is authoritative continuing game truth.

JSON is temporary operational structure.

The harness that performs this transition is the game's state-transition lifecycle, not a separate simulation subsystem.

The first-person renderer and asset/runtime machinery project that state but do not own it.

## ACTOR-MEDIATED LIFECYCLE

```text
TRUSTED CSV WORLD
        ↓
resolve only the state relevant to this operation
        ↓
bounded JSON packet
        ↓
NPC or HUMAN
(action and/or natural-language dialogue)
        ↓
JSON expression/result
        ↓
map / validate against CSV-defined possibilities
        ↓
deterministic game resolution where physical consequence is required
        ↓
write durable accepted facts/events to CSV
        ↓
TRUSTED CSV WORLD'
```

The player or Granite may behave chaotically. They may lie, misunderstand, contradict themselves, make a poor choice, attempt an impossible action, use strange language, cooperate, refuse, or otherwise surprise the designer.

Do not add machinery merely to normalize that behavior. The variation is part of the experiment.

The harness constrains what behavior can map back into the represented world. It does not decide whether that behavior is wise, moral, truthful, socially appropriate, or optimal.

Language/behavior cannot create authoritative world ontology by mention alone.

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
CSV → JSON → NPC / HUMAN → JSON → mapping / deterministic consequence → CSV
```

Do not put Granite into deterministic systems that do not need fuzzy generation/mapping.

## GRANITE CONTRACT

Granite is a bounded JSON → JSON game function.

Its exact job is:

> Generate or evaluate actions and natural-language dialogue against the finite behavioral possibilities exposed by the current CSV-described world.

Granite does not own NPCs, own world state, inspect arbitrary CSV directly, decide objective truth, execute physical consequences, mutate arbitrary world state, or carry hidden game truth between calls.

One Granite transformation is:

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

Resolver projects only the permitted input for one transformation.

Granite performs one requested JSON → JSON transformation.

Witness checks schema, allowed references/values, identity, scope, and other deterministic bounds. Witness does not perform semantic CHECK and does not execute consequences.

Use terminology precisely:

```text
CSV-bounded
= transient value constrained by possibilities derived from trusted CSV

CSV-backed
= authoritative continuing state/configuration represented in CSV
```

Only an explicit accepted CSV-backed write changes continuing game truth.

## PLAYER / NPC SYMMETRY

NPC behavior may use Granite to generate/evaluate actions or dialogue from a bounded current possibility-space.

Human behavior enters as external action/dialogue and may use Granite when fuzzy mapping or natural-language interpretation is required.

Direct deterministic controls do not require Granite merely because the model exists.

Do not build two separate semantic worlds for player and NPC behavior.

## SEMANTIC VALIDITY VERSUS PHYSICAL SUCCESS

An actor can express a valid game action that fails physically.

Example:

```text
hand_over(stone)
```

This can map correctly because `hand_over` and `stone` exist in the bounded game population.

Deterministic mechanics then inspect current CSV-backed state. If the actor no longer holds the stone, the physical consequence fails according to the implemented mechanic.

Do not force Granite to pre-solve every mechanical precondition merely to prevent failed attempts.

## COMMUNICATION

Natural-language communication may use several small Granite transformations.

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

Every named stage is the same primitive:

```text
Resolver → Granite(stage) → Witness
```

Intermediate stage results are bounded transient structures. They are not authoritative CSV-backed world state.

`CHECK` asks whether language is coherently matchable to the corresponding bounded world packet. It does not decide objective truth.

Falsehood, ambiguity, deception, mistakes, contradiction, and misunderstanding are allowed when language remains grounded in the supplied possibilities.

For NPC → NPC communication, preserve:

```text
A intended X → said Y → B interpreted Z
```

including `X ≠ Z`.

## CSV BACKING STATE

Do not maintain authoritative gameplay truth in JavaScript objects, Maps, a runtime ECS, state stores, renderer objects, inventory managers, relationship graphs, NPC caches, model context, or another parallel representation.

If a game-relevant fact must survive the current operation, it needs a CSV-backed representation.

If something exists only to produce pixels, audio, animation, GPU work, model inference, decoding, or another backend representation, it is transient/resource machinery rather than independent game truth.

Repository CSV files may be seed/default state. The eventual browser persistence substrate must preserve authoritative world state as CSV-backed documents.

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
- a spatial index;
- a universal Granite packet schema;
- a universal dialogue schema.

Use this test:

> If Granite, the player, an NPC, deterministic mechanics, or a future operation may need to refer to a fact after the current operation ends, that fact needs a CSV-backed representation.

## WORLD CATEGORIES

These are ontology categories, not fixed schemas.

The backing state must eventually be able to describe whatever implemented mechanics require from:

### World / space

Terrain, regions/clearings/forests/fields/settlements, water, positions/orientations, containment/adjacency/occupancy/reachability, extents, time/environment.

### Actors

Player, NPCs, creatures if added, identity, location/orientation, physical condition, holdings/equipment, persistent game-relevant action/state, factual observations/history when later behavior requires them.

### Physical / biological state

Only when mechanics require it: injury/health, hunger, thirst, fatigue/sleep, exposure, movement capability, carrying limits, sensory capability.

### Natural resources / objects

Trees, rocks/stone, branches/logs, vegetation, food plants, water/resources, materials, loose objects, tools, clothing/equipment, food/consumables, containers/storage, unique objects.

### Built world

When implemented: shelters/houses, storage, workshops, fires, walls/fences, gates/doors, bridges, roads/paths, farms/plots, wells, furniture, construction-in-progress.

### Actions / transformations

Only what actual mechanics require: movement, object handling, use, traversal, gathering, harvesting, crafting, building, repair, farming, storage/transport/consumption, combat if implemented, and later behaviors proven necessary.

### Events / history

Only factual/attributed information future operations need: transfers, construction/destruction, extraction, crafting, injury/death, speech/observation events, and other mechanically relevant history.

### Systems / function configuration

Deterministic mechanics, model/runtime selection, prompts, bounded input/output definitions, function routing, and other configuration proven necessary.

### Assets / resources

Actor models/rigs, terrain geometry/generators, world-object resources, materials/textures, water, animation, audio, shaders, model resources, and other backend assets.

## RENDERER / RESOURCE BOUNDARY

Scene objects, meshes, GPU buffers, animation mixers, LOD state, particles, shadows, fog, camera internals, renderer caches, model caches, workers, and backend handles are not game truth.

Destroying and rebuilding transient runtime machinery from CSV-backed state plus referenced resources must reproduce the same continuing game facts.

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
- actor-mediated mutation;
- browser persistence;
- the first-person 3D renderer;
- final world/ECS schemas;
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

1. build the thinnest Resolver required by the proven call shape;
2. build the matching Witness;
3. connect the current fixture through a real `CSV → JSON → Granite → JSON → deterministic consequence → CSV` operation;
4. render the changed CSV-backed result;
5. prove the next interaction reads the mutated CSV-backed world without hidden model/runtime game state.

Do not freeze future packet/world schemas before these runs reveal their requirements.

## PASS CONDITION

For the first complete actor-mediated fixture:

- one authoritative CSV-backed world begins in a known state;
- one player/NPC operation is projected into bounded JSON;
- one real Granite result is produced where the operation requires Granite;
- the result is mapped/validated against the bounded world;
- deterministic mechanics compute the permitted consequence;
- the accepted durable result is written to CSV-backed state;
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

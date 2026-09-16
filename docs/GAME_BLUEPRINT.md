# MochEpoch game blueprint

This document is the architectural blueprint for MochEpoch.

It fixes the authority boundary and game lifecycle while allowing concrete CSV files, JSON packet shapes, assets, mechanics, persistence details, and rendering structures to fall out of executable game work.

## One game truth

CSV-backed state is the game truth.

JSON is temporary operational structure.

The player, NPCs, Granite, renderer, model runtime, scene graph, caches, JavaScript objects, and function instances are not independent sources of game truth.

The compact game lifecycle is:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

That is not a subsystem inside the game. It is the game-state lifecycle.

For an actor-mediated transition:

```text
TRUSTED CSV WORLD
        ↓
resolve relevant world + function configuration
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
WRITE ACCEPTED ACTOR EXPRESSION / EVENT TO CSV
        ↓
deterministic game resolution where physical consequence is required
        ↓
WRITE RESULTING FACTS / EVENTS TO CSV
        ↓
TRUSTED CSV WORLD'
```

The accepted actor expression itself may be game history. A physical consequence is a separate deterministic transition from current CSV-backed facts.

## The harness is the game lifecycle

The harness has a small job:

1. read and resolve the relevant CSV-backed world state/configuration;
2. project only the required bounded state into transient JSON;
3. route that packet through the required CSV-described function graph;
4. accept human actions/dialogue or call Granite where fuzzy generation/mapping is required;
5. map/validate the resulting expression against the entities, objects, properties, actions, systems, and concepts represented by the supplied CSV-backed world;
6. admit the accepted actor expression/result into CSV-backed factual/attributed state when it must persist;
7. run deterministic mechanics for any physical consequence;
8. write resulting durable facts/events to CSV-backed state; and
9. let rendering project the resulting CSV world.

A local operation may look tree-shaped or DAG-shaped because it resolves several CSV branches/functions before converging on a result. The whole game is a graph because systems/entities reference each other and accepted state transitions feed later operations.

```text
CSV₀
 ↓
operation graph
 ↓
CSV₁
 ↓
operation graph
 ↓
CSV₂
 ↓
...
```

Do not add a second world model to make this graph easier to execute.

## Current fixture search root

The current executable seed uses `world/world.csv` as the search list for what exists or matters.

In the current probe, each `type,name` row resolves a referenced CSV-backed record. This establishes the current fixture's lookup path only. It does not freeze a permanent file-per-entity topology, ECS schema, component model, or final world index.

Preserve the current arrangement until a real executable operation proves a different minimum representation is required.

## CSV-described function graph

Game-specific wiring belongs in CSV-backed configuration rather than a hidden hard-coded per-entity runtime architecture.

CSV-backed configuration may select/reference, as actual operations require:

- the operation being performed;
- the generic function/system to call;
- Granite/model/runtime resources when that function is Granite;
- required actor/world/system references;
- the applicable system prompt;
- bounded input populations;
- required output shape/population; and
- the next function/operation edge when execution proves one is needed.

Executable classes/functions are generic machinery. They do not own game state and do not become a second game-specific control graph.

Do not freeze a universal function-graph schema before real execution reveals the minimum representation.

## Three operation shapes

Unless execution proves another primitive is required, every game operation reduces to one of these shapes.

### Projection

```text
CSV → renderer / audio / UI
```

Projection does not mutate authoritative state.

### Deterministic transition

```text
CSV → deterministic function → CSV
```

Examples may include movement resolution, time advancement, physical preconditions, resource consumption, construction, damage, weather, growth, or other non-fuzzy mechanics.

### Actor-mediated transition

```text
CSV
 ↓
bounded JSON
 ↓
NPC / HUMAN action or dialogue
 ↓
JSON
 ↓
bounded mapping / validation
 ↓
CSV-backed actor expression/event
 ↓
deterministic consequence where applicable
 ↓
CSV-backed resulting facts/events
```

Granite may appear inside the actor-mediated transition. Granite is not the game loop itself.

## Preserve the chaos

MochEpoch does not require an NPC or human to be sensible, truthful, moral, cooperative, optimal, consistent, or mechanically successful.

An actor may lie, misunderstand, contradict itself, make a bad decision, attempt an impossible action, use strange wording, refuse, cooperate unexpectedly, threaten, bargain, mislead, or otherwise behave unpredictably.

This variation is experimental material.

The harness asks:

> What does this action or utterance correspond to in the currently represented world?

It does not ask whether the behavior is wise, good, true, socially appropriate, or strategically optimal.

A false statement about an existing stone can be valid dialogue. An attempt to hand over a stone the actor no longer possesses can be a valid expressed action. Deterministic mechanics may then make the physical attempt fail because the current CSV-backed precondition is false.

Language or behavior cannot create new game ontology merely by mentioning it. If nothing in the bounded world corresponds to a spaceship, saying `use the spaceship` does not create one.

The design rule is:

> Preserve behavioral freedom. Constrain the boundary between actor expression and authoritative world state.

## Player and NPC symmetry

The player and NPCs occupy the same behavioral boundary from the perspective of authoritative world state.

### NPC

```text
CSV world slice
 ↓
bounded JSON possibilities
 ↓
Granite generates/evaluates action or dialogue
 ↓
JSON expression
 ↓
harness mapping / validation
 ↓
CSV-backed actor expression/event
 ↓
deterministic consequence where applicable
 ↓
CSV-backed resulting facts/events
```

### Human player

```text
CSV world slice + external human action / utterance
 ↓
Granite mapping/evaluation only when fuzzy interpretation is required
 ↓
JSON game representation
 ↓
harness mapping / validation
 ↓
CSV-backed actor expression/event
 ↓
deterministic consequence where applicable
 ↓
CSV-backed resulting facts/events
```

A direct deterministic player control does not need Granite merely because Granite exists.

Do not build separate semantic universes for player behavior and NPC behavior.

## Granite's exact job

Granite is a bounded JSON → JSON game function used for fuzzy actor behavior.

Its role is:

> Generate or evaluate actions and natural-language dialogue against the finite behavioral possibilities exposed by the current CSV-described world.

Granite may help with generating/selecting NPC actions, generating NPC dialogue, mapping human language into game-defined possibilities, or another narrowly defined fuzzy actor-behavior transformation proven necessary by execution.

Granite does not:

- own an NPC;
- own world state;
- read arbitrary CSV directly;
- decide its own scope;
- create authoritative entities/actions/properties by mentioning them;
- carry hidden game truth between calls;
- decide objective truth;
- execute physical consequences;
- mutate arbitrary CSV;
- write directly to the renderer; or
- implement trust, friendship, morality, loyalty, civilization, or similar social scores.

Granite input/output JSON is disposable operational structure. Model weights/runtime may remain loaded for performance, but model context is not authoritative game state.

## Resolver, Granite, Witness

One Granite transformation uses:

```text
CSV-BACKED WORLD / BOUNDED TRANSIENT INPUT
        ↓
Resolver
        ↓
bounded JSON parameters
        ↓
Granite(operation)
        ↓
untrusted JSON result
        ↓
Witness
        ↓
bounded transient result or REJECT
```

Resolver projects only the permitted input for one transformation.

Granite performs one requested JSON → JSON transformation.

Witness deterministically checks the raw Granite return against the operation's schema, allowed references, values, identities, scope, and other game-defined bounds. Witness does not execute consequences or create world ontology.

A Witness result is not automatically durable world state. It may be a bounded transient intermediate used by another transformation when execution actually requires another transformation.

Use terminology precisely:

```text
CSV-bounded
= transient value constrained by possibilities derived from trusted CSV

CSV-backed
= authoritative continuing state/history/configuration represented in CSV
```

Only an explicit accepted write into CSV-backed state changes continuing game truth/history.

Do not use a transient intermediate as hidden game state merely because it passed Witness.

## Communication is not a separate architecture

Natural-language communication is another actor-mediated transition through the same harness.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed dialogue stage graph.

Start with the smallest transformation that can complete the real interaction. If one Granite call is sufficient, use one. Add another model transformation only when an executed case demonstrates a concrete need. Any additional routing belongs in the CSV-described function graph.

Human → NPC may be as small as:

```text
recipient-relevant CSV + human utterance
 ↓
Granite mapping when needed
 ↓
bounded result / REJECT
 ↓
CSV-backed communication event/result
```

NPC → Human may be as small as:

```text
speaker-relevant CSV
 ↓
Granite-generated utterance
 ↓
validate/map
 ↓
CSV-backed speech event
 ↓
delivery to human
```

NPC → NPC connects the same two sides with the actual utterance that crossed the world:

```text
NPC A relevant CSV
 ↓
Granite-generated utterance Y
 ↓
CSV-backed A-said-Y event
 ↓
deliver Y
 ↓
NPC B relevant CSV + Y
 ↓
Granite mapping only as required by B's next operation
 ↓
B result returns to CSV-backed state
```

Never give the recipient hidden sender-side structured data in place of the utterance actually delivered.

Recording `A said Y` makes the speech event factual. It does not make the proposition inside `Y` objectively true.

Do not add extra checks, retries, correction passes, or dialogue stages to normalize behavior. Add them only if a real run proves a specific requirement.

## Deterministic consequence boundary

Semantic validity and physical success are different questions.

Example:

```text
NPC expression: hand_over(stone)
```

The expression may be valid because `hand_over` and `stone` exist in the bounded game population.

The accepted expression can be recorded as an attributed CSV-backed actor event.

Deterministic mechanics then check actual current CSV facts. If the NPC no longer holds the stone, the physical consequence fails or becomes a no-op according to the implemented mechanic.

Granite may return failure-prone actor behavior. Deterministic mechanics decide what actually happens.

## Backing-state discovery rule

Do not design the final CSV topology from the armchair.

The game assets and mechanics reveal the backing structure as they are built.

The repository should lock:

- the authority boundary;
- the harness lifecycle;
- the categories the game must be able to describe; and
- Granite's behavioral contract.

It should allow concrete CSV files, columns, indexes, references, function-graph representation, event representation, and JSON packet shapes to emerge from executable operations.

Use this practical test:

> If Granite, the player, an NPC, deterministic mechanics, or a future operation may need to refer to a fact/event after the current operation ends, that fact/event needs a CSV-backed representation.

If something exists only to turn those facts into pixels, sound, animation, GPU work, inference, or another backend representation, it is rendering/resource machinery rather than independent game truth.

Examples:

- thousands of rendered grass blades may correspond to one terrain/vegetation fact or resource;
- a forest may initially be represented by a region/generator/seed rather than one authoritative record per decorative tree;
- an individual branch that can be picked up, carried, discussed, stored, burned, or revisited needs game-relevant identity/state represented in CSV somehow;
- an individual tree that can be chopped, damaged, named, harvested, blocked by, discussed, or revisited needs enough CSV-backed identity/state for those operations.

Do not infer a particular file-per-entity, ECS table, component schema, event schema, or spatial index from these examples. Execution determines the smallest correct representation.

## World categories the backing state must eventually be able to describe

These are ontology categories, not fixed CSV schemas.

### World / space

Terrain/elevation, ground/surface types, regions/clearings/forests/fields/settlements, water, positions/orientations, containment/adjacency/occupancy/reachability, extents, time, season, weather, temperature, light, and other environment facts when implemented.

### Actors

Player, NPC humans, creatures if added, identity, position/orientation, physical condition, held/carried/stored/equipped objects, current persistent game-relevant state, and factual observations/history when later behavior requires them.

### Physical / biological state

Only when implemented and mechanically relevant: injury/health, hunger, thirst, fatigue/sleep, temperature exposure, movement capability, carrying limits, sensory capability.

### World objects and natural resources

Trees, rocks/stone, branches/logs, vegetation, plants/food resources, water resources, ores, clay, fiber, hides, fuel, loose objects, tools, equipment/clothing, food/consumables, containers/storage, and unique/special objects as mechanics require.

### Built world

When implemented: shelters/houses, storage, workshops, fires/hearths, walls/fences, gates/doors, bridges, roads/paths, farms/plots, wells, furniture, construction-in-progress.

### Game actions and transformations

Only behaviors actually required by implemented assets/mechanics. Examples may include movement, object handling, use, traversal, gathering, harvesting, crafting, building, repair, farming, transport, storage, consumption, or combat if implemented.

### Events / history

Actor-mediated behavior that successfully crosses the harness may return to CSV-backed factual/attributed state, including speech events, attempted actions, transfers, observations, construction/destruction, extraction, crafting, injury/death, and other mechanically relevant events.

Recording an attributed event does not turn its semantic content into objective truth.

The exact event schema and retention policy are not fixed yet.

### Systems / function definitions

CSV-backed configuration may describe deterministic mechanics, model/function selection, system prompts, required input references, bounded populations, output schemas, function-graph routing, and other configuration required by proven operations.

### Assets / referenced resources

CSV may identify actor models/rigs, terrain geometry/generators, trees, rocks, vegetation, buildings, tools, item models, materials/textures, water representation, animation, audio, shaders, model/runtime resources, and other backend resources.

The resource file may use the format required by its backend. The game's knowledge that the resource exists, what game thing it represents, and any game-relevant metadata belongs in CSV-backed state/configuration.

### Rendering-only machinery

Scene graph objects, meshes, GPU buffers, animation mixers, LOD state, particles, shadows, fog, camera internals, renderer caches, and backend handles are not game truth unless a corresponding fact is represented in CSV.

## No encoded civilization

Do not add authoritative abstractions such as trust scores, friendship scores, loyalty scores, morality scores, resentment scores, faction sentiment, civilization score, or other designer interpretations of social meaning.

Store factual state and attributed events. Let repeated actor behavior and deterministic consequences produce whatever higher-order pattern actually emerges.

A settlement can emerge because CSV eventually contains houses, paths, stored food, tools, fields, people, speech/events, construction, exchanges, conflict, cooperation, and other factual consequences. No `civilization = true` variable is required.

Failure to produce civilization-like behavior is a valid experimental result.

## Full game lifecycle

### World birth / load

```text
seed or persisted CSV
 ↓
resolve references / function configuration
 ↓
load referenced resources / backend machinery
 ↓
render the CSV-described world
```

Runtime objects are reconstructed from CSV/resource references and remain disposable.

### Play

Repeatedly:

```text
CSVₙ
 ↓
projection / deterministic transition / actor-mediated transition
 ↓
CSVₙ₊₁
```

Rendering may run continuously at frame rate. Authoritative world transitions occur only when game operations produce changed CSV-backed state/history.

### Save / close

Transient JSON, Granite call context, scene objects, GPU buffers, caches, renderer state, and function instances may be discarded.

The continuing world/history/configuration must survive as CSV-backed state plus referenced resources.

### Reload

```text
persisted CSV
 ↓
reconstruct runtime machinery
 ↓
continue from the same authoritative world
```

If hidden model memory or hidden runtime state is required to recover the same continuing game facts, the architecture has failed its reconstruction requirement.

## Reconstruction test

At any point, discard renderer internals, model call context, transient JSON, JavaScript function/class instances, caches, workers, and backend handles.

Then reconstruct from authoritative CSV-backed state plus referenced resource files.

No game-relevant fact/event may disappear or change merely because transient runtime machinery was discarded.

## Build rule

Do not invent future machinery.

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

The architecture fixes the truth boundary and lifecycle. Concrete schemas and extra transformation stages must fall out of the game as real assets and mechanics are forced through that lifecycle.

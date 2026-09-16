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
AUTHORITATIVE CSV WORLD
        ↓
Witness resolves scoped CSV and constructs the JSON operation packet
        ↓
NPC or HUMAN behavior
(Granite is called where fuzzy generation/mapping is required)
        ↓
raw JSON expression/result
        ↓
deterministic parse / map / resolve or REJECT
        ↓
write only the resulting game-relevant facts/events required by this operation
        ↓
AUTHORITATIVE CSV WORLD'
```

There is no mandatory intermediate actor-event write between JSON mapping and game resolution.

The mapped behavior may lead directly to a state mutation, may persist an attributed event/history fact, may do both, or may produce no world change. The actual mechanic decides which CSV-backed result is required.

## The harness is the game lifecycle

The harness has a small job:

1. read the CSV-described operation/function wiring;
2. use Witness to resolve only the scoped CSV-backed inputs needed for a model call and construct transient JSON;
3. accept human behavior directly or call Granite where fuzzy generation/mapping is required;
4. deterministically parse/map the resulting JSON against the configured output contract and current CSV-described possibilities;
5. run the deterministic game operation required by that mapped result; and
6. write only the durable facts/events the operation actually produces back to CSV-backed state.

Rendering then projects the resulting CSV world.

That is the entire authoritative loop.

A local operation may look tree-shaped or DAG-shaped because it resolves several CSV references/functions before converging on a result. The whole game is a graph because systems/entities reference each other and accepted state transitions feed later operations.

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

- the operation/function being performed;
- the generic function/system to call;
- Granite/model/runtime resources when that function is Granite;
- caller/actor/world/system references;
- the system prompt;
- the input facts/populations Witness should retrieve;
- the required output shape/population; and
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

### Actor-mediated transition

```text
CSV
 ↓
JSON operation packet
 ↓
NPC / HUMAN behavior
 ↓
JSON
 ↓
deterministic mapping + operation resolution
 ↓
CSV
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

Language or behavior cannot create new game ontology merely by mentioning it. If nothing in the current operation corresponds to a spaceship, saying `use the spaceship` does not create one.

The design rule is:

> Preserve behavioral freedom. Constrain only what can become authoritative CSV-backed state.

## Player and NPC symmetry

The player and NPCs occupy the same behavioral slot from the perspective of authoritative world state.

### NPC

```text
CSV world slice
 ↓
Witness JSON packet
 ↓
Granite-generated/evaluated behavior
 ↓
raw JSON
 ↓
deterministic map + game operation
 ↓
CSV
```

### Human player

```text
CSV world slice + external human action / utterance
 ↓
Witness JSON packet only when fuzzy mapping is required
 ↓
Granite mapping only when needed
 ↓
raw JSON game representation
 ↓
deterministic map + game operation
 ↓
CSV
```

A direct deterministic player control does not need Granite merely because Granite exists.

Do not build separate semantic universes for player behavior and NPC behavior.

## Granite's exact job

Granite is a bounded JSON → JSON game function used for fuzzy actor behavior.

Its role is:

> Generate or evaluate actions and natural-language dialogue from the bounded game possibilities supplied in one operation packet.

Granite may help with generating/selecting NPC actions, generating NPC dialogue, mapping human language into game-defined possibilities, or another narrowly defined fuzzy actor-behavior transformation proven necessary by execution.

Granite does not own an NPC, own world state, read arbitrary CSV directly, choose its own scope, create authoritative ontology by mention, carry hidden game truth between calls, decide objective truth, execute physical consequences, mutate CSV, write directly to the renderer, or implement social scores.

Granite input/output JSON is disposable operational structure. Model weights/runtime may remain loaded for performance, but model context is not authoritative game state.

## Witness is the CSV → JSON edge

Witness is not an inbound validator and not a separate simulation subsystem.

Witness does one generic outbound job:

```text
CSV-backed operation/world/configuration
        ↓
Witness
retrieve scoped CSV + construct packet
        ↓
bounded JSON packet
        ↓
Granite
```

Witness owns no state. It does not interpret Granite output, decide consequences, repair output, or mutate CSV.

There is no required separate Resolver architecture. Reference resolution is simply work Witness performs while constructing the packet using generic CSV machinery.

## JSON → CSV return edge

Granite returns raw JSON. That JSON is not authoritative game state.

The deterministic harness/game runner performs only the return work required by the operation:

```text
raw JSON
 ↓
parse / validate / map against configured output bounds
 ↓
accepted game representation or REJECT
 ↓
deterministic operation/resolution
 ↓
CSV-backed facts/events required by that operation
```

The accepted game representation may remain transient while deterministic mechanics resolve it. It does not need to be written as a separate actor event merely to cross the harness.

Persist an attributed action, utterance, observation, or other event only when the implemented game needs that fact later.

Do not invent another named subsystem around this edge unless execution proves one is needed.

If a later Granite transformation is actually required, its input may include a transient prior result, but intermediate JSON remains disposable unless explicitly written into CSV-backed state.

## Communication is not a separate architecture

Natural-language communication is another actor-mediated transition through the same harness.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed dialogue stage graph.

Start with the smallest transformation that completes the real interaction. If one Granite call is sufficient, use one. Add another model transformation only when an executed case demonstrates a concrete need. Any additional routing belongs in the CSV-described function graph.

For NPC-to-NPC communication, the actual utterance that crossed the world is what the recipient receives. Never substitute hidden sender-side structured data.

If later operations need to know that `A said Y`, that speech occurrence must be CSV-backed. Recording it makes the speech event factual; it does not make the proposition inside `Y` objectively true.

Do not add extra checks, retries, correction passes, dialogue stages, or universal conversation history merely to normalize behavior.

## Deterministic consequence boundary

Mapping an actor expression into the game and physically succeeding are different things.

Example:

```text
NPC expression: hand_over(stone)
```

The expression may map because `hand_over` and `stone` exist in the current game possibilities.

Deterministic mechanics then check actual current CSV facts. If the NPC no longer holds the stone, the physical consequence fails or becomes a no-op according to the implemented mechanic.

The attempted hand-over itself needs CSV-backed history only if a later implemented operation requires that attempt as a fact.

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

Events/history are optional backing facts, not a mandatory universal log.

Persist only events that later implemented operations need to reference, such as particular speech, observations, attempted actions, transfers, construction/destruction, extraction, crafting, injury/death, or other mechanically relevant occurrences.

An operation may instead require only the resulting current-state mutation.

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

Store the factual state and factual/attributed history the actual game needs. Let repeated actor behavior and deterministic consequences produce whatever higher-order pattern actually emerges.

A settlement can emerge because CSV eventually contains houses, paths, stored food, tools, fields, people, construction, exchanges, conflict, cooperation, speech/history where needed, and other factual consequences. No `civilization = true` variable is required.

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

The architecture fixes the truth boundary and lifecycle. Concrete schemas must fall out of the game as real assets and mechanics are forced through that lifecycle.

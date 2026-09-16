# MochEpoch game blueprint

This document is the architectural blueprint for MochEpoch.

It fixes the authority boundary and game lifecycle while allowing the concrete CSV topology, JSON packet shapes, assets, mechanics, persistence details, and rendering structures to fall out of executable game work.

## One game truth

CSV-backed state is the game truth.

JSON is temporary operational structure.

The player, NPCs, Granite, renderer, model runtime, scene graph, caches, JavaScript objects, and function instances are not independent sources of continuing game truth.

The compact lifecycle is:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

That is not a subsystem inside the game. It is the game-state lifecycle.

For an actor-mediated transition:

```text
AUTHORITATIVE CSV WORLD
        ↓
Witness resolves scoped CSV and constructs the JSON packet needed for this call
        ↓
NPC or HUMAN behavior
(Granite is called only where fuzzy generation/mapping is required)
        ↓
raw JSON expression/result
        ↓
deterministic parse / map / resolve or REJECT
        ↓
write only the resulting game-relevant CSV facts/history required by this operation
        ↓
AUTHORITATIVE CSV WORLD'
```

The mapped behavior may directly mutate current state, persist factual/attributed history when later behavior needs it, do both, or produce no world change. The actual mechanic decides the minimum CSV-backed result.

## The harness is the game lifecycle

The harness has a small job:

1. read the CSV-backed facts/configuration required by the current operation;
2. use Witness to resolve the scoped CSV inputs needed for a Granite call and construct transient JSON;
3. accept human behavior directly or call Granite where fuzzy generation/mapping is required;
4. deterministically map the returned JSON back into what the current CSV-described world and implemented mechanic can represent;
5. run the deterministic game operation required by the mapped result; and
6. write only the durable facts/history the operation actually produces back to CSV-backed state.

Rendering then projects the resulting CSV world.

That is the entire authoritative loop.

## The function graph is descriptive, not a required data structure

A real operation can look tree-shaped or DAG-shaped because several CSV references and generic functions may feed one result. Repeated operations form the game's larger graph because resulting CSV state becomes input to later operations.

```text
CSV₀
 ↓
actual operation path
 ↓
CSV₁
 ↓
actual operation path
 ↓
CSV₂
 ↓
...
```

This does **not** require a universal stored graph, routing table, operation-id field, next-edge field, node schema, or graph executor.

The graph is simply the shape formed by the references and function calls a real implemented operation actually uses.

Game-specific choices that must survive outside executable code belong in CSV-backed configuration, but add each such reference only when the concrete operation needs it.

The current fixture already proves one minimal relationship:

```text
Ada CSV
  decision_system = interaction
        ↓
interaction.csv
  system_prompt = ...
  output_schema = hand_over | wait
```

That establishes a real CSV-backed call relationship. It does **not** establish a universal operation record, function-routing schema, model registry, next-step pointer, or output-population table.

If a future operation proves another game-specific reference is required, add the minimum reference then.

Executable classes/functions are generic machinery. They do not own game state and do not become a second game-specific control graph.

## Current fixture search root

The current executable seed uses `world/world.csv` as the search list for what exists or matters.

In the current probe, each `type,name` row resolves a referenced CSV-backed record. This establishes the current fixture's lookup path only. It does not freeze a permanent file-per-entity topology, ECS schema, component model, or final world index.

Preserve the current arrangement until a real executable operation proves a different minimum representation is required.

## Useful execution views, not operation types

The following shapes are only useful ways to describe paths through the same lifecycle. They are not runtime types, enums, dispatch categories, or primitives that require their own machinery.

### Projection view

```text
CSV → renderer / audio / UI
```

Projection does not mutate authoritative state.

### Direct deterministic transition

```text
CSV → deterministic function → CSV
```

### Actor-mediated transition

```text
CSV
 ↓
JSON packet when needed
 ↓
NPC / HUMAN behavior
 ↓
JSON when needed
 ↓
deterministic mapping + operation resolution
 ↓
CSV
```

Granite may appear inside an actor-mediated transition. A direct human control or deterministic mechanic can skip Granite entirely.

Do not create an `operation_type`, dispatcher, scheduler, or class hierarchy merely because these descriptions are useful in documentation.

## Preserve the chaos

MochEpoch does not require an NPC or human to be sensible, truthful, moral, cooperative, optimal, consistent, or mechanically successful.

An actor may lie, misunderstand, contradict itself, make a bad decision, attempt an impossible action, use strange wording, refuse, cooperate unexpectedly, threaten, bargain, mislead, or otherwise behave unpredictably.

That variation is experimental material.

The harness asks only:

> What does this action, utterance, or other actor expression map to in the currently represented world?

It does not ask whether the behavior is wise, good, true, socially appropriate, strategically optimal, or even likely to succeed.

A false statement about an existing stone can be valid dialogue. An attempt to hand over a stone the actor no longer possesses can be a valid expressed action. Deterministic mechanics may then make the physical attempt fail because the current CSV-backed precondition is false.

Language or behavior cannot create authoritative world ontology by mention alone. If nothing in the current world/mechanics corresponds to a spaceship, saying `use the spaceship` does not create one.

The design rule is:

> Preserve behavioral freedom. Constrain only what can become authoritative CSV-backed state.

## Scoped does not mean behavior-whitelisted

Witness gives Granite a **scoped** slice of the CSV-backed world plus whatever prompt/resource/return constraints the current call actually needs.

That scope limits what information the call receives and what the deterministic harness can map back into the game. It does **not** mean that actors must choose from a universal finite menu of acceptable behavior.

A particular fixture may deliberately use a narrow output schema such as `hand_over | wait`. That is a property of that fixture, not the architecture.

Granite or a human may produce arbitrary language or behavior. The game only cares whether the result can be mapped back into the CSV-described world and an implemented mechanic. Behavior that cannot map does not become authoritative game truth.

## Player and NPC symmetry

The player and NPCs occupy the same behavioral slot from the perspective of authoritative world state.

### NPC

```text
scoped CSV world/context
 ↓
Witness packet when Granite is needed
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
CSV world/context + external human action / utterance
 ↓
Witness packet only when fuzzy mapping is required
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

Granite is a call-scoped JSON → JSON game function used where fuzzy actor behavior needs generation or mapping.

Its role is:

> Generate or evaluate actor actions and natural-language dialogue from the scoped CSV-backed world/context supplied in one call packet, subject only to whatever return shape the current call actually requires.

Granite may help generate NPC actions, generate NPC dialogue, map human language into game-relevant representations, map a fuzzy human action, or perform another narrowly defined JSON → JSON transformation proven necessary by execution.

Granite does not own an NPC, own world state, read arbitrary CSV directly, choose its own scope, create authoritative ontology by mention, carry hidden game truth between calls, decide objective truth, execute physical consequences, mutate CSV, write directly to the renderer, or implement social scores.

Granite input/output JSON is disposable operational structure. Model weights/runtime may remain loaded for performance, but model context is not authoritative game state.

## Witness is the CSV → JSON edge

Witness is the project name for the generic outbound operation used when Granite is called:

```text
scoped CSV-backed state/configuration
        ↓
Witness
retrieve scoped CSV + construct packet
        ↓
JSON packet
        ↓
Granite
```

Witness owns no state. It does not interpret Granite output, decide consequences, repair output, or mutate CSV.

There is no required separate Resolver architecture. Reference resolution is simply work Witness performs while constructing the packet using generic CSV machinery.

Witness packet shape is not frozen. Build only the packet fields the proven Granite interface and current game operation require.

## JSON → CSV return edge

Granite returns raw JSON. That JSON is not authoritative game state.

The deterministic harness/game runner performs only the return work required by the operation:

```text
raw JSON
 ↓
parse / map against the current CSV-described world and implemented mechanic
 ↓
accepted game representation or REJECT
 ↓
deterministic operation/resolution
 ↓
CSV-backed facts/history actually required by that operation
```

The accepted game representation may remain transient while deterministic mechanics resolve it. It does not need a separate event record merely to cross the harness.

Persist an attributed action, utterance, observation, or other occurrence only when the implemented game needs that fact later.

Do not invent another named subsystem around this edge unless execution proves one is needed.

## Communication is not a separate architecture

Natural-language communication is another actor-mediated transition through the same harness.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed dialogue stage graph.

Start with the smallest transformation that completes the real interaction. If one Granite call is sufficient, use one. Add another model transformation only when an executed case demonstrates a concrete need.

If a later communication operation genuinely requires game-specific routing between calls, encode only the minimum CSV-backed reference needed by that operation at that time. Do not prebuild dialogue routing machinery.

For NPC-to-NPC communication, the actual utterance that crossed the world is what the recipient receives. Never substitute hidden sender-side structured data.

If later operations need to know that `A said Y`, that speech occurrence must be CSV-backed. Recording it makes the occurrence factual; it does not make the proposition inside `Y` objectively true.

Do not add extra checks, retries, correction passes, dialogue stages, or universal conversation history merely to normalize behavior.

## Mapping versus physical success

Mapping an actor expression into the game and physically succeeding are different things.

Example:

```text
NPC expression: hand_over(stone)
```

The expression can map because the current CSV-described world contains the referenced stone and the game has an implemented `hand_over` mechanic.

Deterministic mechanics then inspect current CSV facts. If the NPC no longer holds the stone, the physical consequence fails or becomes a no-op according to the implemented mechanic.

The attempted hand-over itself needs CSV-backed history only if a later implemented operation requires that attempt as a fact.

Granite may return failure-prone actor behavior. Deterministic mechanics decide what actually happens.

## Backing-state discovery rule

Do not design the final CSV topology from the armchair.

The first-person game assets and mechanics reveal the backing structure as they are built.

The repository should lock:

- the authority boundary;
- the harness lifecycle;
- the categories the game must be able to describe; and
- Granite's behavioral contract.

It should allow concrete CSV files, columns, indexes, references, call configuration, history representation, and JSON packet shapes to emerge from executable operations.

Use this practical test:

> If Granite, the player, an NPC, deterministic mechanics, or a later operation may need to refer to a fact after the current operation ends, that fact needs a CSV-backed representation.

If something exists only to turn those facts into pixels, sound, animation, GPU work, inference, or another backend representation, it is resource/rendering machinery rather than independent game truth.

Examples:

- thousands of rendered grass blades may correspond to one terrain/vegetation fact or resource;
- a forest may initially be represented by a region/generator/seed rather than one authoritative record per decorative tree;
- an individual branch that can be picked up, carried, discussed, stored, burned, or revisited needs enough CSV-backed identity/state for those operations;
- an individual tree that can be chopped, damaged, named, harvested, blocked by, discussed, or revisited needs enough CSV-backed identity/state for those operations.

Do not infer a particular file-per-entity policy, ECS table, component schema, event schema, routing table, or spatial index from these examples. Execution determines the smallest correct representation.

## World categories the backing state must eventually be able to describe

These are ontology categories, not fixed CSV schemas.

### World / space

Terrain/elevation, ground/surface types, regions/clearings/forests/fields/settlements, water, positions/orientations, containment/adjacency/occupancy/reachability, extents, time, season, weather, temperature, light, and other environment facts when implemented.

### Actors

Player, NPC humans, creatures if added, identity, position/orientation, physical condition, held/carried/stored/equipped objects, persistent game-relevant state, and factual observations/history only when later behavior needs them.

### Physical / biological state

Only when implemented and mechanically relevant: injury/health, hunger, thirst, fatigue/sleep, temperature exposure, movement capability, carrying limits, sensory capability.

### World objects and natural resources

Trees, rocks/stone, branches/logs, vegetation, plants/food resources, water resources, ores, clay, fiber, hides, fuel, loose objects, tools, equipment/clothing, food/consumables, containers/storage, and unique/special objects as mechanics require.

### Built world

When implemented: shelters/houses, storage, workshops, fires/hearths, walls/fences, gates/doors, bridges, roads/paths, farms/plots, wells, furniture, construction-in-progress.

### Game actions and transformations

Only behaviors actual assets/mechanics require. Examples may include movement, object handling, use, traversal, gathering, harvesting, crafting, building, repair, farming, transport, storage, consumption, or combat if implemented.

### Events / history

Events/history are optional backing facts, not a mandatory universal log.

Persist only occurrences that later implemented operations need to reference, such as particular speech, observations, attempted actions, transfers, construction/destruction, extraction, crafting, injury/death, or other mechanically relevant history.

An operation may instead require only its resulting current-state mutation.

### Systems / function configuration

CSV-backed configuration describes only the game-specific function choices and parameters that implemented operations actually need to preserve outside executable code.

The current fixture proves only a narrow relationship such as `Ada → interaction` plus `interaction` prompt/schema data.

Future operations may prove a need for additional model/resource references, scoped input references, mechanic selection, or call chaining. Add those references only when proven. Do not assume a universal operation identity, routing field, next edge, output-population field, or graph schema.

### Assets / referenced resources

CSV may identify actor models/rigs, terrain geometry/generators, trees, rocks, vegetation, buildings, tools, item models, materials/textures, water representation, animation, audio, shaders, model/runtime resources, and other backend resources.

The resource itself may use whatever format its backend requires. The game's knowledge that the resource exists, what game thing it represents, and any game-relevant metadata belongs in CSV-backed state/configuration.

### Rendering-only machinery

Scene graph objects, meshes, GPU buffers, animation mixers, LOD state, particles, shadows, fog, camera internals, renderer caches, and backend handles are not game truth unless a corresponding game fact is represented in CSV.

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
resolve only the references implemented systems/assets actually use
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
actual operation path
 ↓
CSVₙ₊₁
```

Rendering may run continuously at frame rate without creating authoritative state transitions.

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

No game-relevant fact may disappear or change merely because transient runtime machinery was discarded.

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

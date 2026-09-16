# MochEpoch game blueprint

This document is the architectural blueprint for MochEpoch.

It fixes the authority boundary and lifecycle while allowing concrete CSV files, JSON packet shapes, assets, mechanics, and renderer details to fall out of executable game work.

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

The accepted actor expression itself is game history. A physical consequence is a separate deterministic transition from current CSV-backed facts.

## The harness is the game lifecycle

The harness has a small job:

1. read and resolve the relevant CSV-backed world state/configuration;
2. project only the required bounded state into transient JSON;
3. route that packet through the required function graph;
4. accept human actions/dialogue or call Granite for NPC actions/dialogue where fuzzy generation or mapping is required;
5. map/validate the resulting expression against the entities, objects, properties, actions, systems, and concepts represented by the supplied CSV-backed world;
6. admit the accepted actor expression/result into CSV-backed factual/attributed state;
7. run deterministic mechanics for any physical consequence;
8. write resulting durable facts/events to CSV-backed state; and
9. let rendering project the resulting CSV world.

A local operation may look tree-shaped or DAG-shaped because it resolves several CSV branches/functions before converging on a result. The whole game is a graph because systems/entities reference each other and every accepted transition becomes input for later transitions.

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

## CSV-described function graph

Game-specific wiring belongs in CSV-backed configuration rather than a hidden hard-coded per-entity runtime architecture.

CSV-backed configuration may select/reference, as actual operations require:

- the operation/stage being performed;
- the generic function/system to call;
- Granite/model/runtime resources when that function is Granite;
- required actor/world/system references;
- the applicable system prompt;
- bounded input populations;
- required output shape/population; and
- the next function/operation edge.

Executable classes/functions are generic machinery. They do not own game state and do not become a second game-specific control graph.

Do not freeze a universal function-graph schema before real execution reveals the minimal representation.

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

An actor may:

- lie;
- misunderstand;
- contradict itself;
- make a bad decision;
- attempt an impossible action;
- use strange wording;
- refuse;
- cooperate unexpectedly;
- behave inefficiently;
- threaten, bargain, mislead, or confuse; or
- produce any other behavior that still maps to the bounded world represented by the current operation.

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
bounded operation
 ↓
Granite mapping/evaluation when fuzzy interpretation is required
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

A direct deterministic player control does not need Granite merely because Granite exists. Use Granite only when the operation actually requires fuzzy generation, correspondence, or natural-language handling.

Do not build separate semantic universes for player behavior and NPC behavior.

## Granite's exact job

Granite is a bounded JSON → JSON game function used for fuzzy actor behavior.

Its role is:

> Generate or evaluate actions and natural-language dialogue against the finite behavioral possibilities exposed by the current CSV-described world.

Granite may help with:

- selecting/generating an NPC action from a bounded current possibility-space;
- composing NPC language from a bounded current possibility-space;
- mapping human language into game-defined possibilities;
- mapping a fuzzy human action into game-defined possibilities when required; and
- checking whether supplied/generated language is coherently matchable to the bounded world packet.

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
Granite(stage)
        ↓
untrusted JSON result
        ↓
Witness
        ↓
bounded transient result or REJECT
```

Resolver projects only the permitted input for one transformation.

Granite performs one requested JSON → JSON transformation.

Witness deterministically checks the raw Granite return against the operation's schema, allowed references, values, identities, scope, and other game-defined bounds. Witness does not perform the semantic judgment assigned to Granite `CHECK` and does not execute consequences.

A Witness result is not automatically durable world state. It may be a bounded transient intermediate used by another transformation.

Use terminology precisely:

```text
CSV-bounded
= transient value constrained by possibilities derived from trusted CSV

CSV-backed
= authoritative continuing state/history/configuration represented in CSV
```

Trust returns to the game when the completed accepted result is admitted into CSV-backed state.

Do not use a transient intermediate as hidden game state merely because it passed Witness.

## Communication paths

Natural-language communication may require several Granite transformations before the completed communication returns to authoritative CSV-backed state.

Human → NPC:

```text
INTAKE → CHECK → COMMIT
        ↓
CSV-backed attributed utterance / recipient result
```

NPC → Human:

```text
COMPOSE → CHECK → EMIT
        ↓
CSV-backed attributed speech event
        ↓
delivery to human
```

NPC → NPC:

```text
sender:    COMPOSE → CHECK → EMIT
                       ↓
        CSV-backed A-said-Y event
                       ↓
                actual utterance Y
                       ↓
recipient: INTAKE  → CHECK → COMMIT
                       ↓
        CSV-backed B-interpreted-Z result/event
```

Each named stage is still the same primitive:

```text
Resolver → Granite(stage) → Witness
```

Intermediate stage results are bounded transient structures. They are not authoritative CSV merely because they are legal inputs to the next stage.

For NPC → NPC communication, only the actual emitted utterance crosses between actors. Preserve:

```text
A intended X → said Y → B interpreted Z
```

including `X ≠ Z`.

The fact that `A said Y` is authoritative as an attributed event does not make the proposition inside `Y` objectively true.

`CHECK` asks whether language is coherently matchable to the supplied bounded world, not whether the statement is objectively true. Falsehood, ambiguity, deception, mistakes, contradiction, and misunderstanding are allowed when language remains grounded in the supplied possibilities.

## Deterministic consequence boundary

Semantic validity and physical success are different questions.

Example:

```text
NPC expression: hand_over(stone)
```

The expression may be valid because `hand_over` and `stone` exist in the bounded game population.

The accepted `hand_over(stone)` expression can be recorded as an attributed CSV-backed actor event.

Deterministic mechanics then check actual current CSV facts. If the NPC no longer holds the stone, the physical consequence fails or becomes a no-op according to the implemented mechanic.

Granite is allowed to propose failure-prone behavior. Deterministic mechanics decide what actually happens.

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

- world identity/seed when required;
- terrain/elevation relevant to mechanics;
- ground/surface types;
- regions, clearings, forests, fields, settlements, named locations;
- creeks, rivers, ponds, lakes, and other game-relevant water;
- positions, orientations, containment, adjacency, occupancy, reachability where required;
- world extents/boundaries; and
- time, season, weather, temperature, light, or other environment facts when implemented.

### Actors

- player;
- NPC humans;
- animals/creatures if added;
- identity;
- position/orientation;
- physical condition;
- held/carried/stored/equipped objects;
- current game-relevant state when it must persist;
- factual observations or remembered events when later behavior requires them; and
- other factual actor state proven necessary by mechanics.

### Physical / biological state

Only when implemented and mechanically relevant:

- injury/health;
- hunger;
- thirst;
- fatigue/sleep;
- temperature exposure;
- movement capability;
- carrying limits;
- sensory capability.

### World objects and natural resources

- trees;
- rocks/stone;
- branches/logs;
- grass/vegetation where game-relevant;
- plants/food resources;
- water resources;
- ores, clay, fiber, hides, fuel, or other implemented materials;
- loose objects;
- tools;
- equipment/clothing;
- food/consumables;
- containers/storage;
- unique/special objects.

Object facts may include identity/type, position or holder, quantity, material, condition, contents, usable actions, dimensions, or other properties only when actual mechanics require them.

### Built world

When implemented:

- shelters/houses;
- storage;
- workshops;
- fires/hearths;
- walls/fences;
- gates/doors;
- bridges;
- roads/paths;
- farms/plots;
- wells;
- furniture;
- construction-in-progress.

Relevant facts may include location/footprint, materials, construction progress, damage/condition, occupancy, contents, usable functions, and accessibility.

### Game actions and transformations

Possible examples include:

- move/walk/run/turn/look;
- approach/follow/stop;
- pick up/put down/carry/hand over;
- use/open/close/enter/leave/climb;
- gather/harvest/cut/mine/hunt;
- cook/craft/build/repair/farm;
- transport/store/consume;
- attack/defend if combat is actually implemented.

This is not a command list to implement in advance. Add behaviors only when actual game assets/mechanics require them.

### Events / history

Actor-mediated behavior that successfully crosses the harness returns to CSV-backed factual/attributed state.

Examples include:

- `A said Y`;
- `B interpreted Z`;
- an accepted attempted action;
- transfers;
- construction/destruction;
- resource extraction;
- crafting;
- injury/death;
- observations attributed to an actor;
- other mechanically relevant events.

Recording an attributed event does not turn its semantic content into objective truth.

The exact event schema and retention policy are not fixed yet.

### Systems / function definitions

CSV-backed configuration may describe:

- deterministic mechanics;
- model/function selection;
- system prompts;
- required input references;
- bounded populations;
- output schemas;
- function-graph routing;
- other configuration required by proven operations.

The exact schemas are not fixed yet.

### Assets / referenced resources

CSV may identify resources such as:

- human/animal models and rigs;
- terrain geometry/generators;
- trees, rocks, vegetation, buildings, tools, and item models;
- materials/textures;
- water representation;
- animation resources;
- audio;
- shaders;
- model/runtime resources;
- other renderer/backend resources.

The resource file may use the format required by its backend. The game's knowledge that the resource exists, what game thing it represents, and any game-relevant metadata belongs in CSV-backed state/configuration.

### Rendering-only machinery

These are not game truth unless a corresponding fact is represented in CSV:

- scene graph objects;
- meshes;
- GPU buffers;
- animation mixers;
- LOD state;
- particles;
- shadows;
- fog;
- camera internals;
- renderer caches;
- backend handles.

## No encoded civilization

Do not add authoritative abstractions such as:

- trust scores;
- friendship scores;
- loyalty scores;
- morality scores;
- resentment scores;
- faction sentiment;
- civilization score;
- other designer interpretations of social meaning.

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

At any point, discard:

- renderer internals;
- model call context;
- transient JSON;
- JavaScript function/class instances;
- caches;
- workers;
- backend handles.

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

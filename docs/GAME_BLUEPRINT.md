# MochEpoch game blueprint

This document is the architectural blueprint for MochEpoch.

It defines the game at the level that must remain true while the concrete CSV files, JSON packet shapes, assets, renderer, and mechanics are allowed to grow from implementation evidence.

## One game truth

CSV-backed state is the game truth.

JSON is temporary operational structure.

The player, NPCs, Granite, renderer, model runtime, scene graph, caches, JavaScript objects, and function instances are not independent sources of game truth.

The core actor-mediated lifecycle is:

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
map / validate against the CSV-defined world
        ↓
deterministic game resolution where a physical consequence is required
        ↓
WRITE RESULTING FACTS / EVENTS TO CSV
        ↓
TRUSTED CSV WORLD'
```

In compact form:

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

That loop is not a subsystem inside the game. It is the game-state lifecycle.

The world changes only when an operation produces a permitted CSV-backed state transition.

## The harness is the game lifecycle

The harness has a small job:

1. read and resolve the relevant CSV-backed world state;
2. project only the required bounded state into transient JSON;
3. route that packet through the required function graph;
4. accept human actions/dialogue or call Granite for NPC actions/dialogue where fuzzy generation or mapping is required;
5. map and validate the resulting expression against the population of entities, objects, properties, actions, systems, and concepts represented by the supplied CSV-backed world;
6. run deterministic game mechanics for any physical consequence;
7. write any durable accepted result back into CSV-backed state; and
8. let rendering project the resulting CSV world.

A local operation may look tree-shaped because it resolves several relevant CSV branches into one bounded packet and may branch through several functions before converging on a result. The whole game is a graph because systems and entities can reference each other and every accepted transition becomes the input world for later transitions.

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

## Three operation shapes

Every game operation should reduce to one of these shapes unless execution proves another primitive is required.

### Projection

```text
CSV → renderer / audio / UI
```

Projection does not mutate authoritative state.

### Deterministic transition

```text
CSV → deterministic function → CSV
```

Examples may include time advancement, physical preconditions, resource consumption, construction progress, damage, weather mechanics, movement resolution, or other non-fuzzy mechanics.

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
deterministic consequence where applicable
 ↓
CSV
```

The actor-mediated transition is where Granite may be used. Granite is not the game loop itself.

## Preserve the chaos

MochEpoch does not require an NPC or a human to be sensible, truthful, moral, cooperative, optimal, consistent, or mechanically successful.

An actor may:

- lie;
- misunderstand;
- contradict itself;
- make a bad decision;
- attempt an impossible action;
- use strange wording;
- refuse a request;
- cooperate unexpectedly;
- behave inefficiently; or
- produce any other behavior that still maps to the bounded world represented by the current operation.

This is not noise to be designed away. The resulting behavioral variation is experimental material.

The harness asks a narrower question:

> What does this action or utterance correspond to in the currently represented world?

The harness does not ask whether the behavior is wise, good, true, socially appropriate, or strategically optimal.

A false statement about an existing stone can be valid dialogue. An attempt to hand over a stone the actor no longer possesses can be a valid expressed action. Deterministic mechanics may then make the physical attempt fail because the current CSV-backed precondition is false.

Language or behavior cannot create new game ontology merely by mentioning it. If nothing in the bounded world corresponds to a spaceship, an actor saying "use the spaceship" does not create one.

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
Granite generates or evaluates an action / utterance
 ↓
JSON expression
 ↓
harness mapping / validation
 ↓
deterministic consequence where applicable
 ↓
CSV
```

### Human player

```text
CSV world slice + external human action / utterance
 ↓
bounded JSON operation
 ↓
Granite mapping / evaluation when fuzzy interpretation is required
 ↓
JSON game representation
 ↓
harness mapping / validation
 ↓
deterministic consequence where applicable
 ↓
CSV
```

A direct deterministic player control does not need a Granite call merely because Granite exists. Use Granite only when the operation actually requires fuzzy generation, correspondence, or natural-language handling.

Do not build separate semantic universes for player behavior and NPC behavior.

## Granite's exact job

Granite is a bounded JSON → JSON game function used for fuzzy actor behavior.

Its role is:

> Generate or evaluate actions and natural-language dialogue against the finite behavioral possibilities exposed by the current CSV-described world.

Granite may help with:

- selecting or generating an NPC action from a bounded current possibility-space;
- composing NPC language from a bounded current possibility-space;
- mapping human language into game-defined possibilities;
- mapping a fuzzy human action into game-defined possibilities when required; and
- checking whether generated or supplied language is coherently matchable to the bounded world packet.

Granite does not:

- own an NPC;
- own world state;
- read arbitrary CSV directly;
- decide its own scope;
- create authoritative entities, actions, or properties by mentioning them;
- carry hidden game truth between calls;
- decide objective truth;
- execute physical consequences;
- mutate arbitrary CSV;
- write directly to the renderer; or
- implement trust, friendship, morality, loyalty, civilization, or similar social scores.

Granite input/output JSON is disposable operational structure. The model weights/runtime may remain loaded for performance, but model context is not authoritative game state.

## Resolver, Granite, Witness

One Granite transformation uses this primitive:

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

Witness deterministically checks the raw Granite return against the operation's schema, allowed references, values, identities, scope, and other game-defined bounds. Witness does not perform the semantic judgment assigned to a Granite `CHECK` transformation and does not execute consequences.

A Witness result is not automatically durable world state. It may be a bounded transient intermediate used by another transformation. Only an explicit accepted write into CSV-backed state changes authoritative game truth.

This is the distinction:

```text
CSV-bounded
= constrained by the possibilities defined from trusted CSV

CSV-backed / written to CSV
= authoritative continuing game state
```

Do not use a transient intermediate as hidden game state merely because it passed Witness.

## Communication paths

Natural-language communication may require several Granite transformations before anything becomes authoritative game state.

Human → NPC:

```text
INTAKE → CHECK → COMMIT
```

NPC → Human:

```text
COMPOSE → CHECK → EMIT
```

NPC → NPC:

```text
sender:    COMPOSE → CHECK → EMIT
                       ↓
                actual utterance Y
                       ↓
recipient: INTAKE  → CHECK → COMMIT
```

Each named stage is still the same primitive:

```text
Resolver → Granite(stage) → Witness
```

Intermediate stage results remain bounded transient structures. They are not authoritative CSV merely because they are legal inputs to the next stage.

For NPC → NPC communication, only the actual emitted utterance crosses between actors. Preserve:

```text
A intended X → said Y → B interpreted Z
```

including `X ≠ Z`.

`CHECK` asks whether language is coherently matchable to the supplied bounded world, not whether the statement is objectively true. Falsehood, ambiguity, deception, mistakes, and misunderstanding are allowed when the language remains grounded in the supplied possibilities.

## Deterministic consequence boundary

Semantic validity and physical success are different questions.

Example:

```text
NPC expression: hand_over(stone)
```

The expression may be valid because `hand_over` and `stone` exist in the bounded game population.

Deterministic mechanics then check the actual current CSV facts. If the NPC no longer holds the stone, the physical consequence fails or becomes a no-op according to the implemented mechanic.

Granite is allowed to propose failure-prone behavior. Deterministic mechanics decide what actually happens.

## Backing-state discovery rule

Do not design the final CSV topology from the armchair.

The game assets and mechanics reveal the backing structure as they are built.

The repository should lock the authority boundary and the categories of things the game must be able to describe, while allowing concrete CSV files, columns, indexes, references, and JSON packet shapes to emerge from executable operations.

The practical test is:

> If Granite, the player, an NPC, deterministic mechanics, or a future operation may need to refer to a fact after the current operation ends, that fact needs a CSV-backed representation.

If something exists only to turn those facts into pixels, sound, animation, GPU work, or another backend representation, it is rendering/resource machinery rather than independent game truth.

Examples:

- thousands of rendered grass blades may correspond to one terrain/vegetation fact or resource;
- a forest may initially be represented by a region/generator/seed rather than one authoritative record per decorative tree;
- an individual branch that can be picked up, carried, discussed, stored, burned, or revisited needs game-relevant identity/state somehow represented in CSV;
- an individual tree that can be chopped, damaged, named, harvested, blocked by, discussed, or revisited needs enough CSV-backed identity/state for those operations.

Do not infer a particular file-per-entity, ECS table, component schema, or spatial index from these examples. Execution determines the smallest correct representation.

## World categories the backing state must eventually be able to describe

These are ontology categories, not fixed CSV schemas.

### World / space

- world identity / seed when required;
- terrain and elevation relevant to mechanics;
- ground/surface types;
- regions, clearings, forests, fields, settlements, and named locations;
- creeks, rivers, ponds, lakes, and other game-relevant water;
- positions, orientations, containment, adjacency, occupancy, and reachability where required;
- world extents / boundaries; and
- time, season, weather, temperature, light, or other environment facts when implemented.

### Actors

- player;
- NPC humans;
- animals or other creatures if added;
- identity;
- position / orientation;
- physical condition;
- held, carried, stored, or equipped objects;
- current game-relevant action/state when it must persist;
- observed or remembered factual events when later behavior requires them; and
- other factual actor state proven necessary by mechanics.

### Physical / biological state

Only when implemented and mechanically relevant:

- injury / health;
- hunger;
- thirst;
- fatigue / sleep;
- temperature exposure;
- movement capability;
- carrying limits; and
- sensory capability.

### World objects and natural resources

- trees;
- rocks / stone;
- branches / logs;
- grass / vegetation where game-relevant;
- plants / food resources;
- water resources;
- ores, clay, fiber, hides, fuel, or other implemented materials;
- loose objects;
- tools;
- equipment / clothing;
- food / consumables;
- containers / storage; and
- unique or special objects.

Object facts may include identity/type, position or holder, quantity, material, condition, contents, usable actions, dimensions, or other properties only when actual mechanics require them.

### Built world

When implemented:

- shelters / houses;
- storage;
- workshops;
- fires / hearths;
- walls / fences;
- gates / doors;
- bridges;
- roads / paths;
- farms / plots;
- wells;
- furniture; and
- construction-in-progress.

Relevant facts may include location/footprint, materials, construction progress, damage/condition, occupancy, contents, usable functions, and accessibility.

### Game actions and transformations

The game may eventually expose behaviors such as:

- move / walk / run / turn / look;
- approach / follow / stop;
- pick up / put down / carry / hand over;
- use / open / close / enter / leave / climb;
- gather / harvest / cut / mine / hunt;
- cook / craft / build / repair / farm;
- transport / store / consume; and
- attack / defend if combat is actually implemented.

This is not a command list to implement in advance. Add behaviors only when the game asset/mechanic requires them.

### Events / history

Persist only factual or attributed information that future operations actually need, such as:

- transfers;
- construction / destruction;
- resource extraction;
- crafting;
- injury / death;
- speech events when future behavior needs them;
- observations attributed to an actor; and
- other mechanically relevant events.

Do not precompute social interpretations from these events.

### Systems / function definitions

CSV-backed configuration may describe:

- deterministic mechanics;
- model function selection;
- system prompts;
- required input references;
- bounded populations;
- output schemas;
- function-graph routing; and
- other configuration required by proven operations.

The exact schemas are not fixed yet.

### Assets / referenced resources

CSV may identify resources such as:

- human / animal models and rigs;
- terrain geometry or generators;
- trees, rocks, vegetation, buildings, tools, and item models;
- materials / textures;
- water representation;
- animation resources;
- audio;
- shaders; and
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
- renderer caches; and
- backend handles.

## No encoded civilization

Do not add authoritative abstractions such as:

- trust scores;
- friendship scores;
- loyalty scores;
- morality scores;
- resentment scores;
- faction sentiment;
- civilization score; or
- other designer interpretations of social meaning.

Store factual state and attributed events. Let repeated actor behavior and deterministic consequences produce whatever higher-order pattern actually emerges.

A settlement can emerge because CSV eventually contains houses, paths, stored food, tools, fields, people, repeated exchanges, speech events, construction, conflict, cooperation, and other factual consequences. No `civilization = true` variable is required.

Failure to produce civilization-like behavior is a valid experimental result.

## Full game lifecycle

### World birth / load

```text
seed or persisted CSV
 ↓
resolve references
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

Rendering may run continuously at frame rate. Authoritative world transitions occur only when game operations produce changed CSV-backed state.

### Save / close

Transient JSON, Granite call context, scene objects, GPU buffers, caches, renderer state, and function instances may be discarded.

The continuing world must survive as CSV-backed state plus referenced resources.

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
- workers; and
- backend handles.

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

The architecture fixes the truth boundary and the lifecycle. Concrete schemas must fall out of the game as real assets and mechanics are forced through that lifecycle.

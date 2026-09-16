# MochEpoch CSV backing-state boundary

This document is a hard architectural constraint for MochEpoch.

Read `docs/GAME_BLUEPRINT.md` first for the complete game lifecycle.

## Hard rule

CSV-backed state is the game truth.

There is no second authoritative game-state representation.

The renderer may project the world, functions may transform it, Granite may generate/evaluate actor behavior, and the browser/model runtime may maintain transient backend machinery, but none of those become a second source of continuing game facts.

If a game-relevant fact must survive the current operation, it needs a CSV-backed representation.

## CSV and JSON

The project's DNA/RNA analogy is mechanical:

- CSV is DNA: durable, inspectable, authoritative backing state/configuration.
- JSON is RNA: temporary operational expression/transport for one operation or transformation.

Do not import biological semantics beyond that analogy.

The core relationship is:

```text
CSV → JSON → operation / actor → JSON → accepted CSV transition
```

Dynamic JSON is never authoritative merely because it exists, parses, passes a schema, or was returned by Granite.

A JSON packet may be built from CSV-backed facts, passed through Granite or another function, validated, compared, used by another bounded transformation, and then discarded.

Only an explicit accepted update to CSV-backed state changes continuing game truth.

## `CSV-bounded` is not the same as `CSV-backed`

Use these terms precisely.

```text
CSV-bounded
= a transient value constrained to possibilities derived from trusted CSV

CSV-backed
= authoritative continuing state/configuration represented in CSV
```

A Witness result may be CSV-bounded and still remain a transient intermediate for the next transformation.

Do not silently promote such an intermediate into authoritative state.

This distinction is especially important in multi-stage natural-language communication.

## Game-relevance test

The backing structure should fall out of the game as real first-person assets and mechanics are implemented.

Use this test:

> If Granite, the player, an NPC, deterministic mechanics, or a future operation may need to refer to a fact after the current operation ends, that fact needs a CSV-backed representation.

If something exists only to produce pixels, sound, animation, GPU work, inference, decoding, or another backend effect, it is rendering/resource machinery rather than independent game truth.

Examples:

- thousands of decorative grass instances may correspond to one game-relevant terrain/vegetation description;
- a forest can be represented by a region/generator/seed until individual trees need game-relevant identity/state;
- a branch that can be picked up, carried, discussed, stored, burned, or revisited needs enough CSV-backed identity/state for those operations;
- a tree that can be chopped, damaged, named, harvested, blocked by, discussed, or revisited needs enough CSV-backed identity/state for those operations.

These examples do not prescribe file-per-entity storage, ECS tables, components, or any other final schema.

## Do not freeze the topology early

The repository may define the categories of game-relevant things that must eventually be describable, but the exact CSV files, columns, indexes, references, packet shapes, entity/component arrangement, and spatial structures must emerge from executable operations.

Do not invent a final `ecs.csv`, file-per-entity policy, database-style normalization, component schema, or spatial index because it sounds useful.

Build the actual game asset/mechanic, force it through the lifecycle, and add only the minimum backing representation the run proves necessary.

## Backing-state categories

These are ontology categories, not fixed schemas.

The CSV backing must eventually be able to describe whatever implemented mechanics require from the following kinds of things.

### World / space

- terrain and mechanically relevant elevation/surface;
- regions, clearings, forests, fields, settlements, and named locations;
- water such as creeks, rivers, ponds, and lakes when game-relevant;
- positions and orientations;
- containment, adjacency, occupancy, reachability, and world extents when needed;
- time, season, weather, temperature, lighting, or other environment facts when implemented.

### Actors

- player;
- NPC humans;
- animals/creatures if added;
- identity;
- location/orientation;
- physical condition;
- held/carried/stored/equipped objects;
- current action/state when it must persist;
- factual observations or remembered events when later behavior requires them.

### Physical / biological state

Only when actual mechanics require it:

- injury/health;
- hunger;
- thirst;
- fatigue/sleep;
- temperature exposure;
- movement capability;
- carrying limits;
- sensory capability.

### Natural resources / objects

As actual mechanics require:

- trees;
- rocks/stone;
- branches/logs;
- grass/vegetation;
- food plants;
- water resources;
- ores, clay, fiber, hides, fuel, or other materials;
- loose objects;
- tools;
- clothing/equipment;
- food/consumables;
- containers/storage;
- unique/special objects.

Object facts may include identity/type, position or holder, quantity, material, condition, contents, usable actions, dimensions, or other properties only when implemented mechanics need them.

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

### Actions / transformations

Only behaviors actually required by implemented assets/mechanics, for example:

- move/walk/run/turn/look;
- approach/follow/stop;
- pick up/put down/carry/hand over;
- use/open/close/enter/leave/climb;
- gather/harvest/cut/mine/hunt;
- cook/craft/build/repair/farm;
- transport/store/consume;
- attack/defend if combat is actually implemented.

This is not an implementation checklist.

### Events / history

Persist factual or attributed information only when later operations need it, such as:

- transfers;
- construction/destruction;
- resource extraction;
- crafting;
- injury/death;
- speech events;
- observations attributed to an actor;
- other mechanically relevant events.

Do not precompute social interpretations from these events.

### Systems / function configuration

CSV-backed configuration may describe:

- deterministic mechanics;
- model/runtime selection;
- system prompts;
- bounded inputs and output populations/schemas;
- function-graph routing;
- other configuration proven necessary by an operation.

### Assets / resources

CSV may identify:

- actor models/rigs;
- terrain geometry/generators;
- tree/rock/vegetation/building/tool/item resources;
- materials/textures;
- water representation;
- animations;
- audio;
- shaders;
- model resources;
- other backend assets.

The asset file itself may use whatever format its backend requires. The game's knowledge that an asset exists, what game thing it represents, and any game-relevant metadata belongs in CSV-backed state/configuration.

## Allowed game-code shape

MochEpoch game code is limited to these roles unless a concrete execution failure proves another is required:

1. first-person 3D rendering/audio/UI that projects the CSV-described world;
2. CSV-backed documents that describe authoritative game state/configuration and resource references;
3. deterministic functions that read/resolve/transform CSV-backed state; and
4. transient JSON/model/backend machinery required to execute an operation.

Function classes own no game state.

Do not introduce a fourth game-state layer.

## Renderer boundary

The renderer is a projection of CSV-backed state, not a state container.

Transient renderer/backend state may include:

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
- workers;
- backend handles.

Those may exist because the backend requires them. They must not become authoritative gameplay facts.

If rendering machinery is discarded and rebuilt from CSV-backed state plus referenced resources, the same continuing game world must be recoverable.

## Model-runtime boundary

Granite weights/runtime may remain loaded for performance.

Call-local prompts, JSON packets, decoder state, model context, KV cache, workers, or similar inference machinery are not authoritative game state.

If a later actor operation needs a fact, that fact must come from CSV-backed state rather than hidden model memory.

## Runtime persistence

A Chrome WebApp cannot directly rewrite repository files. That is a persistence-substrate problem, not permission to create a non-CSV runtime world model.

Repository CSV files may be seed/default state.

The eventual browser persistence mechanism must preserve authoritative world state as CSV-backed documents. Do not turn CSV into import/export around a different authoritative object model.

Do not build a backend merely to make repository CSV files writable.

## No encoded civilization

Store facts and attributed events, not designer interpretations.

Do not add authoritative trust, friendship, loyalty, morality, resentment, faction sentiment, civilization scores, or similar social abstractions unless the research question is explicitly changed.

A world may contain houses, paths, stored food, tools, fields, speech events, transfers, conflict, cooperation, construction, and other factual consequences without storing a `civilization` variable.

Failure to produce civilization-like behavior is valid evidence.

## Reconstruction test

At any point, discard:

- renderer internals;
- model call context;
- transient JSON;
- function/class instances;
- caches;
- workers;
- backend handles.

Then reconstruct from authoritative CSV-backed state plus referenced resources.

No continuing game-relevant fact may disappear or change merely because transient runtime machinery was discarded.

## Implementation instruction

Before changing world-state handling, rendering state, assets, persistence, actor state, inventory, JSON handling, model integration, or other game-state machinery, read this document and `docs/GAME_BLUEPRINT.md`.

Do not import a conventional game-engine state architecture into MochEpoch.

If an implementation appears to require non-CSV authoritative game state, stop and identify the exact concrete requirement before adding it.

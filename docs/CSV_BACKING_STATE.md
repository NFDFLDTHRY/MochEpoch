# MochEpoch CSV backing-state boundary

This document is a hard architectural constraint for MochEpoch.

Read `docs/GAME_BLUEPRINT.md` first for the complete game lifecycle.

## Hard rule

CSV-backed state is the game truth.

There is no second authoritative game-state representation.

The renderer may project the world, deterministic functions may transform it, Witness may construct model-call packets, Granite may generate/evaluate actor behavior, and browser/model runtimes may maintain transient backend machinery, but none of those become a second source of continuing game facts/history.

If a game-relevant fact or history item must survive the current operation, it needs a CSV-backed representation.

## CSV and JSON

The project's DNA/RNA analogy is mechanical:

- CSV is DNA: durable, inspectable, authoritative backing state/history/configuration.
- JSON is RNA: temporary operational expression/transport for one operation or transformation.

Do not import biological semantics beyond that analogy.

The core relationship is:

```text
CSV → JSON → operation / actor → JSON → CSV
```

JSON is never authoritative merely because it exists, parses, matches a schema, or was returned by Granite.

Only an explicit write into CSV-backed state by the concrete game operation changes continuing game truth/history.

If an operation uses multiple model/function calls, intermediate JSON remains disposable unless the game explicitly needs some result to persist.

## Witness does not own state

Witness is the scoped CSV → JSON call constructor used when an operation calls Granite.

Witness may read the current call's CSV-backed references/configuration, resolve only that scoped state, and construct the transient JSON packet.

Witness does not own state, interpret Granite output, decide consequences, or mutate CSV.

There is no required separate Resolver architecture. Reference resolution is ordinary generic CSV work performed while constructing the packet.

## Return handling does not create another architecture

The JSON → CSV side belongs to the concrete deterministic game operation.

There is no universal semantic mapper, acceptance stage, rejection object/state, or shared validator that every Granite return must cross.

The current operation parses only what it actually needs and either uses that data to perform its implemented mechanic or produces no authoritative write.

Example:

```text
Granite → {"action":"hand_over"}
        ↓
current interaction operation parses that action
        ↓
hand_over mechanic reads current CSV facts
        ↓
write holder change OR no state change
```

If the current operation cannot consume the return:

```text
unusable JSON
   ↓
no authoritative CSV write
   ↓
failed run remains evidence
```

A different future operation may require different deterministic handling. Build only what that operation proves necessary.

“Mapping” is shorthand only when useful for a concrete local conversion. It is not an architectural subsystem.

## No mandatory event layer

An actor expression does not automatically require a separate event record before a mechanic runs.

The concrete operation may:

- directly mutate current CSV state;
- write factual/attributed history when later behavior needs that history;
- do both; or
- produce no CSV change.

For example, `hand_over(stone)` may cause the current operation to invoke the `hand_over` mechanic and directly change the holder. The attempt itself needs a history record only if a later implemented operation must know the attempt happened.

Likewise, speech such as `Ada said Y` needs CSV-backed history only when later game behavior must reference that occurrence.

If recorded, the occurrence of the speech is factual. The proposition inside `Y` is not thereby objective world truth.

There is no universal event ledger, mandatory actor-event admission step, or required event schema.

## Game-relevance test

The backing structure should fall out of the game as real first-person assets and mechanics are implemented.

Use this test:

> If Granite, the player, an NPC, deterministic mechanics, or a later operation needs a fact after the current operation ends, that fact needs a CSV-backed representation.

If something exists only to produce pixels, sound, animation, GPU work, inference, decoding, or another backend effect, it is rendering/resource machinery rather than independent game truth.

Examples:

- thousands of decorative grass instances may correspond to one game-relevant terrain/vegetation description;
- a forest can be represented by a region/generator/seed until individual trees need game-relevant identity/state;
- a branch that can be picked up, carried, discussed, stored, burned, or revisited needs enough CSV-backed identity/state for those operations;
- a tree that can be chopped, damaged, named, harvested, blocked by, discussed, or revisited needs enough CSV-backed identity/state for those operations.

These examples do not prescribe file-per-entity storage, ECS tables, components, or any other final schema.

## Do not freeze the topology early

The repository may define categories of game-relevant things that must eventually be describable, but exact CSV files, columns, indexes, references, packet shapes, call-configuration representation, history representation, and spatial structures must emerge from executable operations.

Do not invent a final `ecs.csv`, file-per-entity policy, database-style normalization, component schema, event schema, event log, routing table, universal function graph, return-mapping framework, rejection layer, or spatial index because it sounds useful.

Build the actual game asset/mechanic, force it through the lifecycle, and add only the minimum backing representation the run proves necessary.

## Function configuration follows real calls

Game-specific function choices that must survive outside executable code belong in CSV-backed configuration.

That rule does not imply a universal operation record or stored graph schema.

The current fixture proves a much smaller relationship:

```text
Ada CSV
  decision_system = interaction
        ↓
interaction.csv
  system_prompt = ...
  output_schema = hand_over | wait
```

That is authoritative configuration because those CSV facts select/configure Ada's current decision path.

Nothing in the current evidence proves a need for a generic operation-id column, function-id column, model registry, next-edge field, routing table, output-population table, or function-graph CSV.

If a real browser call or later mechanic requires an additional game-specific reference, add that minimum reference at that time.

Generic executable functions remain stateless with respect to game truth.

## Backing-state categories

These are ontology categories, not fixed schemas.

### World / space

Terrain, mechanically relevant elevation/surface, regions, clearings, forests, fields, settlements, water, positions/orientations, containment, adjacency, occupancy, reachability, world extents, time, season, weather, temperature, lighting, and other environment facts when implemented.

### Actors

Player, NPC humans, animals/creatures if added, identity, location/orientation, physical condition, held/carried/stored/equipped objects, persistent current state, and factual observations/history when later behavior requires them.

### Physical / biological state

Only when actual mechanics require it: injury/health, hunger, thirst, fatigue/sleep, temperature exposure, movement capability, carrying limits, sensory capability.

### Natural resources / objects

As actual mechanics require: trees, rocks/stone, branches/logs, vegetation, food plants, water resources, ores, clay, fiber, hides, fuel, loose objects, tools, clothing/equipment, food/consumables, containers/storage, unique/special objects.

Object facts may include identity/type, position or holder, quantity, material, condition, contents, usable actions, dimensions, or other properties only when mechanics need them.

### Built world

When implemented: shelters/houses, storage, workshops, fires/hearths, walls/fences, gates/doors, bridges, roads/paths, farms/plots, wells, furniture, construction-in-progress.

### Actions / transformations

Only behaviors actually required by implemented assets/mechanics, for example movement, object handling, use, traversal, gathering, harvesting, crafting, building, repair, farming, transport, storage, consumption, or combat if implemented.

This is not an implementation checklist.

### Events / history

Optional factual/attributed history only when later implemented operations need it, such as speech, observations, attempted actions, transfers, construction/destruction, resource extraction, crafting, injury/death, and other mechanically relevant occurrences.

An operation may need only its resulting current-state mutation and no historical record.

Do not precompute social interpretations such as trust, friendship, morality, loyalty, resentment, or civilization from history.

### Systems / function configuration

CSV-backed configuration may describe only the concrete game-specific selections and parameters proven necessary by implemented systems and calls.

Examples may eventually include a mechanic selection, model/resource reference, prompt reference, scoped input reference, or another call reference, but none of those fields is universal merely because one future system might need it.

### Assets / resources

CSV may identify actor models/rigs, terrain geometry/generators, tree/rock/vegetation/building/tool/item resources, materials/textures, water representation, animations, audio, shaders, model resources, and other backend assets.

The asset file itself may use whatever format its backend requires. The game's knowledge that an asset exists, what game thing it represents, and any game-relevant metadata belongs in CSV-backed state/configuration.

## Allowed game-code shape

MochEpoch game code is limited to these roles unless a concrete execution failure proves another is required:

1. first-person 3D rendering/audio/UI that projects the CSV-described world;
2. CSV-backed documents that describe authoritative game state/history/configuration and resource references;
3. generic deterministic functions that read/resolve/transform CSV-backed state according to the current implemented operation; and
4. Witness packet construction plus other transient JSON/model/backend machinery needed to execute an operation.

Function classes own no game state.

Do not introduce another authoritative game-state layer.

## Renderer boundary

The renderer is a projection of CSV-backed state, not a state container.

Scene graph objects, meshes, GPU buffers, animation mixers, LOD state, particles, shadows, fog, camera internals, renderer caches, workers, and backend handles may exist because the renderer needs them. They must not become authoritative gameplay facts.

If rendering machinery is discarded and rebuilt from CSV-backed state plus referenced resources, the same continuing game world must be recoverable.

## Model-runtime boundary

Granite weights/runtime may remain loaded for performance.

Call-local prompts, JSON packets, decoder state, model context, KV cache, workers, or similar inference machinery are not authoritative game state.

If a later actor operation needs a fact/history item, that information must come from CSV-backed state rather than hidden model memory.

## Runtime persistence

A Chrome WebApp cannot directly rewrite repository files. That is a persistence-substrate problem, not permission to create a non-CSV runtime world model.

Repository CSV files may be seed/default state.

The eventual browser persistence mechanism must preserve authoritative world state/history/configuration as CSV-backed documents. Do not turn CSV into import/export around a different authoritative object model.

Do not build a backend merely to make repository CSV files writable.

## No encoded civilization

Store the factual state and factual/attributed history the actual game needs, not designer interpretations.

Do not add authoritative trust, friendship, loyalty, morality, resentment, faction sentiment, civilization scores, or similar social abstractions unless the research question is explicitly changed.

A world may contain houses, paths, stored food, tools, fields, speech where relevant, transfers, conflict, cooperation, construction, and other factual consequences without storing a `civilization` variable.

Failure to produce civilization-like behavior is valid evidence.

## Reconstruction test

At any point, discard renderer internals, model call context, transient JSON, function/class instances, caches, workers, and backend handles.

Then reconstruct from authoritative CSV-backed state/history/configuration plus referenced resources.

No continuing game-relevant fact may disappear or change merely because transient runtime machinery was discarded.

## Implementation instruction

Before changing world-state handling, rendering state, assets, persistence, actor state, inventory, JSON handling, model integration, or other game-state machinery, read this document and `docs/GAME_BLUEPRINT.md`.

Do not import a conventional game-engine state architecture into MochEpoch.

If an implementation appears to require non-CSV authoritative game state, stop and identify the exact concrete requirement before adding it.

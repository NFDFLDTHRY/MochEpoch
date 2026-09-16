# MochEpoch game blueprint

This document is the architectural blueprint for MochEpoch.

It fixes the authority boundary and game lifecycle while allowing concrete CSV topology, JSON packet shapes, assets, mechanics, persistence details, and rendering structures to fall out of executable game work.

## One game truth

CSV-backed state is the authoritative continuing game truth, history, and configuration.

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
(Granite is called only where fuzzy generation/evaluation is required)
        ↓
JSON expression/result where applicable
        ↓
operation-local deterministic handling
        ↓
CSV facts/history produced by this operation, if any
        ↓
AUTHORITATIVE CSV WORLD'
```

The operation may directly mutate current state, persist factual/attributed history when later behavior needs it, do both, or produce no world change. The concrete mechanic decides the minimum CSV-backed result.

## The harness is the game lifecycle

The harness has a small job:

1. read the CSV-backed facts/configuration required by the current operation;
2. use Witness to resolve scoped CSV inputs and construct transient JSON when Granite is called;
3. accept human behavior directly or call Granite where fuzzy generation/evaluation is required;
4. let the current operation's smallest deterministic code consume the returned JSON it actually understands;
5. run the concrete deterministic mechanic, deliver the utterance, or perform whatever real operation follows; and
6. write only durable facts/history the operation actually produces back to CSV-backed state.

Rendering then projects the resulting CSV world.

That is the entire authoritative loop.

## The function graph is descriptive, not a required data structure

A real operation can look tree-shaped or DAG-shaped because several CSV references and generic functions may feed one result. Repeated operations form the larger game graph because resulting CSV state becomes input to later operations.

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

This does not require a universal stored graph, routing table, operation-id field, next-edge field, node schema, or graph executor.

The graph is simply the shape formed by the references and function calls a real implemented operation actually uses.

Game-specific choices that must survive outside executable code belong in CSV-backed configuration, but add each reference only when the concrete operation needs it.

The current fixture proves one minimal relationship:

```text
Ada CSV
  decision_system = interaction
        ↓
interaction.csv
  system_prompt = ...
  output_schema = hand_over | wait
```

That establishes a real CSV-backed call relationship. The `output_schema` key is fixture-local configuration. It does not establish a universal operation record, universal output-schema field, return-constraint field, function-routing schema, model registry, next-step pointer, or output-population table.

If a future operation proves another game-specific reference is required, add the minimum reference then.

Executable classes/functions are generic machinery. They do not own game state and do not become a second game-specific control graph.

## Current fixture search root

The current executable seed uses `world/world.csv` as the search list for what exists or matters.

In the current probe, each `type,name` row resolves a referenced CSV-backed record. This establishes the current fixture's lookup path only. It does not freeze a permanent file-per-entity topology, ECS schema, component model, or final world index.

Preserve the current arrangement until a real executable operation proves a different minimum representation is required.

## Useful execution views, not operation types

These are documentation views of paths through the same lifecycle. They are not runtime types, enums, dispatch categories, or primitives that require their own machinery.

```text
projection:      CSV → renderer / audio / UI

deterministic:   CSV → deterministic function → CSV

actor-mediated: CSV → JSON when needed → NPC / HUMAN
                → JSON when needed → operation-local deterministic handling → CSV
```

Granite may appear inside an actor-mediated transition. A direct human control or deterministic mechanic can skip Granite entirely.

Do not create an `operation_type`, dispatcher, scheduler, class hierarchy, or orchestration layer merely because these descriptions are useful.

## Preserve the chaos

MochEpoch does not require an NPC or human to be sensible, truthful, moral, cooperative, optimal, consistent, or mechanically successful.

An actor may lie, misunderstand, contradict itself, make a bad decision, attempt an impossible action, use strange wording, refuse, cooperate unexpectedly, threaten, bargain, mislead, or otherwise behave unpredictably.

That variation is experimental material.

The harness asks only whether the concrete operation can do something game-relevant with what the actor expressed.

It does not ask whether the behavior is wise, good, true, socially appropriate, strategically optimal, or likely to succeed.

A false statement about an existing stone can be valid dialogue. An attempt to hand over a stone the actor no longer possesses can be a valid expressed action. Deterministic mechanics may then make the physical attempt fail because the current CSV-backed precondition is false.

Language or behavior cannot create authoritative world ontology by mention alone. If nothing in the current CSV-described world and implemented mechanics supports a spaceship, saying `use the spaceship` does not create one.

The design rule is:

> Preserve behavioral freedom. Constrain only what can become authoritative CSV-backed state.

## Scoped does not mean behavior-whitelisted

Witness gives Granite a scoped slice of the CSV-backed world plus whatever prompt/resource information and operation-specific output guidance the concrete call actually uses.

That scope limits what information the call receives. It does not mean actors must choose from a universal finite menu of acceptable behavior.

A particular fixture may deliberately use a narrow output schema such as `hand_over | wait`. That is fixture-local configuration, not the architecture or a general behavior ontology. Another concrete call may use a different schema, a prompt convention, a parser-specific format, or no explicit output schema at all.

The harness does not require an `output_schema`, enum, grammar, return-constraint field, or structured-output mechanism for every Granite call. Add such configuration only when the executable call actually needs it.

Granite or a human may produce arbitrary language or behavior. A concrete operation may only consume the subset its implemented code understands. Anything else remains non-authoritative and causes no CSV transition unless a later executable requirement defines different handling.

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
JSON
 ↓
current operation consumes what it understands
 ↓
concrete mechanic / consequence
 ↓
CSV
```

### Human player

```text
CSV world/context + external human action / utterance
 ↓
Witness packet only when Granite is needed for fuzzy interpretation
 ↓
Granite transformation only when needed
 ↓
JSON where applicable
 ↓
current operation consumes what it understands
 ↓
concrete mechanic / consequence
 ↓
CSV
```

A direct deterministic player control does not need Granite merely because Granite exists.

Do not build separate semantic universes for player behavior and NPC behavior.

## Granite's exact job

Granite is a call-scoped JSON → JSON game function used where fuzzy actor behavior needs generation or evaluation.

Its role is:

> Generate or evaluate actor actions and natural-language dialogue from the scoped CSV-backed world/context supplied in one call packet and return JSON in whatever concrete form that operation actually uses.

A JSON Schema, enum, grammar, constrained decoder, or other explicit return-shape mechanism is optional operation-local machinery. It is not part of Granite's universal MochEpoch contract.

Granite may help generate NPC actions, generate NPC dialogue, transform human language into a game-relevant representation, transform a fuzzy human action, or perform another narrowly defined JSON → JSON transformation proven necessary by execution.

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

There is no required separate Resolver architecture. Reference resolution is ordinary generic CSV work performed while Witness constructs the packet.

Witness packet shape is not frozen. Build only the packet fields the proven Granite interface and current game operation require. Do not add an output-schema or return-constraint field merely because the current fixture has one.

## JSON return handling is operation-local

There is no universal semantic mapper, validator framework, acceptance stage, `REJECT` state, or `accepted_game_representation` layer in MochEpoch.

After Granite returns JSON, the concrete operation uses only the deterministic code that operation actually requires.

For the current fixture the path can be as small as:

```text
Granite → {"action":"hand_over"}
        ↓
parse this fixture's output schema
        ↓
call hand_over mechanic
        ↓
check current CSV facts
        ↓
write holder change OR make no world change
```

That parser exists because this fixture explicitly defines `output_schema`. It is not evidence that every Granite-backed operation needs schema validation or a structured-output API.

If Granite returns malformed or unusable data:

```text
Granite → unusable return
        ↓
current operation cannot consume it
        ↓
no authoritative CSV write
        ↓
save the failed run as evidence
```

A later operation may require a different parser, reference lookup, mechanic selection, language transformation, or no explicit schema machinery at all. Add only what that executed operation proves necessary.

“Mapping” may be used as shorthand for operation-local conversion from actor/model material into something a concrete mechanic can use. It is not a shared subsystem or universal semantic judgment.

## Communication is not a separate architecture

Natural-language communication is another actor-mediated transition through the same harness.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed dialogue stage graph.

Start with the smallest transformation that completes the real interaction. If one Granite call is sufficient, use one. Add another model transformation only when an executed case demonstrates a concrete need.

NPC-to-NPC communication crosses the actual utterance that was delivered. Never substitute hidden sender-side structured data.

If later operations need to know that `A said Y`, persist that speech occurrence in CSV-backed history. Recording the occurrence does not make the proposition inside `Y` objectively true.

Do not add retries, correction passes, dialogue stages, universal conversation history, or dialogue routing merely to normalize behavior.

## Expressed action versus physical success

Understanding what operation-local code should attempt and physically succeeding are different things.

Example:

```text
NPC expression: hand_over(stone)
```

If this concrete operation recognizes `hand_over` and the referenced stone exists, it can invoke the implemented `hand_over` mechanic.

The mechanic then inspects current CSV facts. If the NPC no longer holds the stone, the physical consequence fails or becomes a no-op according to the mechanic.

The attempted hand-over itself needs CSV-backed history only if a later implemented operation requires that attempt as a fact.

Granite may produce failure-prone actor behavior. Deterministic mechanics decide what actually happens.

## Backing-state discovery rule

Do not design the final CSV topology from the armchair.

The first-person game assets and mechanics reveal the backing structure as they are built.

The repository should lock the authority boundary, harness lifecycle, categories the game must be able to describe, and Granite's behavioral contract. Concrete CSV files, columns, indexes, references, call configuration, history representation, and JSON packet shapes must emerge from executable operations.

Use this practical test:

> If Granite, the player, an NPC, deterministic mechanics, or a later operation needs a fact after the current operation ends, that fact needs a CSV-backed representation.

If something exists only to turn those facts into pixels, sound, animation, GPU work, inference, or another backend representation, it is resource/rendering machinery rather than independent game truth.

## World categories the backing state must eventually be able to describe

These are ontology categories, not fixed CSV schemas.

- World / space: terrain, regions, water, positions, orientations, containment, adjacency, occupancy, reachability, time/environment.
- Actors: player, NPCs, creatures if added, physical condition, holdings/equipment, persistent factual observations/history only when later behavior needs them.
- Natural resources / objects: trees, rocks, branches/logs, vegetation, water/resources, materials, tools, food, containers, equipment.
- Built world: shelters, houses, storage, workshops, fires, walls, doors, bridges, roads, farms, wells, furniture, construction-in-progress.
- Game actions / transformations: only behaviors actual assets/mechanics require.
- Events / history: optional factual/attributed occurrences only when later operations need them.
- Systems / function configuration: only concrete game-specific selections/references/parameters proven necessary by implemented operations.
- Assets / resources: models, rigs, terrain, textures, materials, animation, audio, shaders, generators, model resources, and other backend assets.

Rendering-only scene objects, GPU buffers, animation mixers, particles, shadows, fog, camera internals, caches, workers, and backend handles are not game truth unless a corresponding fact is represented in CSV.

## No encoded civilization

Do not add authoritative abstractions such as trust scores, friendship scores, loyalty scores, morality scores, resentment scores, faction sentiment, civilization score, or other designer interpretations of social meaning.

Store factual state and factual/attributed history the game actually needs. Let repeated actor behavior and deterministic consequences produce whatever higher-order pattern actually emerges.

A settlement can emerge because CSV eventually contains houses, paths, stored food, tools, fields, people, construction, exchanges, conflict, cooperation, speech/history where needed, and other factual consequences. No `civilization = true` variable is required.

Failure to produce civilization-like behavior is valid experimental evidence.

## Full game lifecycle

### World birth / load

```text
seed or persisted CSV
 ↓
resolve only references implemented systems/assets actually use
 ↓
load referenced resources / backend machinery
 ↓
render the CSV-described world
```

Runtime objects are reconstructed from CSV/resource references and remain disposable.

### Play

```text
CSVₙ
 ↓
actual operation path
 ↓
CSVₙ₊₁
```

Repeat. Rendering may run continuously at frame rate without creating authoritative state transitions.

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

No continuing game-relevant fact may disappear or change merely because transient runtime machinery was discarded.

## Build rule

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

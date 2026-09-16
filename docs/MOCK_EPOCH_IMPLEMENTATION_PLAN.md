# MOCH EPOCH — IMPLEMENTATION PLAN

## QUESTION

Can a civilization-like first-person game emerge from CSV-backed world truth, scoped JSON transformations, human/NPC behavior, and deterministic consequences without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

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
Witness resolves scoped CSV and constructs one JSON packet when Granite is needed
        ↓
NPC or HUMAN behavior
        ↓
JSON expression/result where applicable
        ↓
operation-local deterministic handling
        ↓
write only game-relevant CSV facts/history produced by this operation
        ↓
AUTHORITATIVE CSV WORLD'
```

There is no mandatory actor-event write before game resolution.

The operation may directly mutate current state, persist an attributed fact/history item for later use, do both, or produce no world change. The actual implemented operation determines the minimum CSV-backed result.

The human or NPC may behave chaotically. They may lie, misunderstand, contradict themselves, make a poor choice, attempt an impossible action, use strange language, cooperate, refuse, or otherwise surprise the designer.

Do not add machinery merely to normalize that behavior. The variation is part of the experiment.

## FUNCTION GRAPH

The harness can be understood as a function graph because one operation may resolve several CSV references and call several generic functions before producing the next CSV state.

That is a description of execution shape, not a requirement for a stored graph structure.

Do not create a universal operation-id field, function-id table, graph table, routing table, next-edge field, node schema, output-population table, or generic orchestration layer.

Game-specific choices that must survive outside executable code belong in CSV-backed configuration, but only when a real implemented operation requires them.

The current fixture proves only this narrow call relationship:

```text
Ada CSV
  decision_system = interaction
        ↓
interaction.csv
  system_prompt = ...
  output_schema = hand_over | wait
```

The `output_schema` key is fixture-local configuration. Do not infer a universal output-schema field, return-constraint field, or structured-output layer from it.

If the real Granite browser call proves that a model/resource reference is required, add the minimum CSV-backed reference then. If a later operation proves another call must follow, add only the minimum game-specific reference needed by that operation then.

Executable functions are generic/stateless with respect to game truth.

## EXECUTION VIEWS, NOT OPERATION TYPES

Projection, direct deterministic transitions, and actor-mediated transitions are useful ways to describe paths through the same lifecycle. They are not runtime types, enums, dispatcher cases, or required primitives.

```text
projection:      CSV → renderer / audio / UI

deterministic:   CSV → deterministic function → CSV

actor-mediated: CSV → JSON when needed → NPC / HUMAN
                → JSON when needed → operation-local deterministic handling → CSV
```

Do not create an `operation_type`, dispatcher, scheduler, class hierarchy, or orchestration layer merely to encode these descriptions.

Do not put Granite into deterministic systems that do not need fuzzy generation/evaluation.

## GRANITE CONTRACT

Granite is a call-scoped JSON → JSON game function.

Its exact job is:

> Generate or evaluate actor actions and natural-language dialogue from the scoped CSV-backed world/context supplied in one call packet and return JSON in whatever concrete form that operation actually uses.

A JSON Schema, enum, grammar, constrained decoder, or other explicit return-shape mechanism is optional operation-local machinery, not part of Granite's universal contract.

The scope is about what information Witness supplies. It is not a universal behavior whitelist.

A particular operation may use a narrow output enum. The current `hand_over | wait` fixture is one local example, not the general behavior ontology and not proof that every Granite call needs a schema.

Granite may represent arbitrary actor language/behavior, including strange, false, contradictory, foolish, hostile, cooperative, or mechanically impossible behavior.

Granite does not own NPCs, own world state, inspect arbitrary CSV directly, choose its own scope, decide objective truth, execute physical consequences, mutate CSV, or carry hidden game truth between calls.

## WITNESS CONTRACT

Witness is the scoped CSV → JSON Granite-call constructor.

A Witness call:

1. receives the caller/current operation and whatever CSV-backed references the implemented call actually uses;
2. resolves only that scoped CSV state;
3. includes only the prompt, situation, facts/context, model/resource information, and any operation-specific output guidance/configuration the real call actually uses; and
4. constructs the transient JSON packet Granite receives.

No `output_schema`, enum, grammar, or return-constraint field is mandatory merely because Witness exists.

```text
scoped CSV-backed state/configuration
        ↓
Witness
retrieve scoped CSV + construct packet
        ↓
JSON packet
        ↓
Granite
        ↓
raw JSON return
```

Witness owns no game state and does not inspect or validate Granite output.

There is no required separate Resolver architecture. CSV reference resolution is simply part of Witness packet construction using generic CSV machinery.

The Witness packet schema is not frozen before the real browser call establishes its minimum shape.

## RETURN HANDLING

There is no universal semantic mapper, acceptance layer, generic validator framework, `REJECT` state, or `accepted game representation` stage.

The current operation uses only the deterministic code it actually needs to consume the Granite return.

For the first fixture:

```text
Granite → {"action":"hand_over"}
        ↓
parse interaction.csv's local output shape
        ↓
call hand_over mechanic
        ↓
mechanic reads current CSV-backed state
        ↓
stone holder = player OR no state change
```

For `wait`:

```text
Granite → {"action":"wait"}
        ↓
parse local output shape
        ↓
wait mechanic / no world mutation
```

Those parsing steps exist because this fixture explicitly defines `output_schema`. They are not evidence that every Granite-backed operation needs schema validation or structured-output machinery.

For an unusable return:

```text
Granite → malformed / out-of-schema / unusable JSON
        ↓
this operation cannot consume it
        ↓
no authoritative CSV write
        ↓
save failure evidence
```

Do not build a generic return-mapping, schema-validation, or rejection subsystem around this fixture.

A later operation may require a different parser, reference lookup, language transformation, mechanic selection, explicit schema, prompt-only convention, or no schema machinery at all. Add only what that executed operation proves necessary.

“Mapping” is shorthand only when useful for an operation-local conversion. It is not architecture.

## PLAYER / NPC SYMMETRY

NPC behavior may use Granite to generate/evaluate actions or dialogue from scoped current CSV-backed world/context.

Human behavior enters as external action/dialogue and may use Granite when fuzzy interpretation or natural-language transformation is required.

Direct deterministic controls do not require Granite merely because the model exists.

Do not build two separate semantic worlds for player and NPC behavior.

## EXPRESSED ACTION VERSUS PHYSICAL SUCCESS

An actor can express an action that a concrete operation understands and still fail physically.

Example:

```text
hand_over(stone)
```

If this operation recognizes `hand_over` and the stone exists, it can invoke the implemented mechanic.

The mechanic then inspects current CSV-backed state. If the actor no longer holds the stone, the physical consequence fails according to the mechanic.

The failed attempt itself only needs CSV-backed history if a later operation requires it.

Do not force Granite to pre-solve every mechanical precondition merely to prevent failed attempts.

## COMMUNICATION

Natural-language communication is not a separate architecture.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed dialogue stage graph.

Use the same actor-mediated lifecycle.

If one Granite call is sufficient, use one.

Add another model transformation, retry, check, or correction pass only when an executed communication case proves the extra step is necessary.

If that later step requires game-specific CSV-backed configuration, add only the minimum reference required at that time. Do not prebuild dialogue routing.

For NPC → NPC communication, the actual utterance crosses between actors. Never hand the recipient hidden sender-side structured data in place of what was actually said.

If later operations need to know `A said Y`, store that factual occurrence in CSV. Doing so does not make the proposition inside `Y` objectively true.

## CSV BACKING STATE

Do not maintain authoritative gameplay truth in JavaScript objects, Maps, a runtime ECS, state stores, renderer objects, inventory managers, relationship graphs, NPC caches, model context, or another parallel representation.

If a game-relevant fact/history item must survive the current operation, it needs a CSV-backed representation.

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
- an event schema or universal event log;
- a spatial index;
- a universal Granite packet schema;
- a universal output-schema or structured-output policy;
- a universal dialogue schema;
- a universal function-graph/routing schema;
- a return-mapping/acceptance/rejection framework; or
- a fixed model-call count.

Use this test:

> If Granite, the player, an NPC, deterministic mechanics, or a later operation needs a fact after the current operation ends, that fact needs a CSV-backed representation.

## WORLD CATEGORIES

These are ontology categories, not fixed schemas.

The backing state must eventually be able to describe whatever implemented mechanics require from world/space, actors, physical/biological state, natural resources/objects, built world, actions/transformations, optional factual history, systems/function configuration, and assets/resources.

Only add the concrete facts and references real mechanics require.

## RENDERER / RESOURCE BOUNDARY

Scene objects, meshes, GPU buffers, animation mixers, LOD state, particles, shadows, fog, camera internals, renderer caches, model caches, workers, and backend handles are not game truth.

Destroying and rebuilding transient runtime machinery from CSV-backed state plus referenced resources must reproduce the same continuing game facts.

## NO ENCODED CIVILIZATION

Store factual state and factual/attributed history the game actually needs, not designer interpretations.

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
Ada decision_system: interaction
interaction system_prompt: CSV-backed
interaction output_schema: hand_over | wait
```

The fixture is plumbing evidence, not the final game ontology, function configuration schema, or universal Granite output policy.

Ada is game-controlled. Granite may be called by her configured operation as an ordinary function. Granite does not embody Ada.

Do not generalize the current `interaction.csv` shape into the final game architecture merely because it exists first.

## CURRENT EVIDENCE

The Chrome read/resolve/render milestone established that current CSV-backed seed state can be read, references resolved, rendered diagnostically, changed by editing backing CSV, and failed closed when a required referenced CSV is missing.

It did not establish:

- a real Granite call;
- a real Witness packet;
- actor-mediated mutation;
- browser persistence;
- the first-person 3D renderer;
- final world/history/call-configuration/output-schema structures; or
- civilization-like emergence.

Do not report any of those as established.

## NEXT EXECUTABLE OPERATION

Establish the concrete Granite 350M browser/WebApp calling machinery.

The smallest useful proof is:

1. load the real Granite runtime/model in the target browser path;
2. make one real scoped JSON-in → JSON-out call using only whatever output convention the smallest real call actually needs;
3. parse the actual return with only the minimum parser that call requires;
4. record success/failure and runtime evidence;
5. do not add a structured-output/schema layer merely because the current game fixture has `output_schema`; and
6. do not attach fake game authority or synthetic fallback.

After that interface is proven:

1. build the thinnest Witness required to retrieve the current fixture's scoped CSV inputs and construct the proven call packet;
2. use the current fixture's `output_schema` only if the concrete connected operation actually needs/uses it;
3. build the smallest operation-local deterministic JSON consumer required by that same fixture;
4. connect the current fixture through `CSV → Witness JSON → Granite → JSON → operation-local deterministic handling → CSV`;
5. render the changed CSV-backed result; and
6. prove the next interaction reads the mutated CSV-backed world without hidden model/runtime game state.

Add no extra call-configuration, output-schema, or return-handling machinery until those runs prove it necessary.

## PASS CONDITION

For the first complete actor-mediated fixture:

- one authoritative CSV-backed world begins in a known state;
- one Witness call constructs the minimum packet from the scoped CSV-backed state/configuration actually required;
- one real Granite result is produced;
- operation-local deterministic code consumes that result or fails without an authoritative write;
- the concrete mechanic writes the resulting minimum CSV-backed world fact change when applicable;
- rendering reflects the new state; and
- the next operation works correctly from that mutated CSV-backed state without hidden model memory or hidden authoritative runtime state.

No event log, graph table, routing field, generalized operation schema, universal output-schema layer, generic mapper, acceptance layer, or `REJECT` state is required for this pass.

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

Do not add cloud/metered automation, GitHub Actions, hosted inference, databases, generic agent frameworks, generalized dialogue systems, graph/orchestration frameworks, generic validation/mapping layers, universal structured-output/schema machinery, or speculative infrastructure without explicit user approval and an observed need.

Deployment, authentication, payments, and other product-shell work remain separate from the core civilization experiment unless explicitly requested.

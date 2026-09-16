# Granite role and experimental framing

This document defines exactly what MochEpoch expects Granite to do.

Read `docs/GAME_BLUEPRINT.md` first for the full lifecycle and `docs/CSV_BACKING_STATE.md` for the authority boundary.

## Exact role

Granite is not an NPC brain, autonomous agent, world model, authority, truth engine, civilization simulator, or owner of character state.

Granite is used like another game function:

```text
parameters → Granite → return value
```

Its exact job is:

> Generate or evaluate actions and natural-language dialogue against the finite behavioral possibilities exposed by the current CSV-described world.

That is the model contract.

## What Granite may be used for

When an operation requires fuzzy generation or correspondence, Granite may:

- select/generate an NPC action from a bounded current possibility-space;
- generate NPC natural-language dialogue from a bounded current possibility-space;
- map human natural-language input into game-defined possibilities;
- map a fuzzy human action into game-defined possibilities when required;
- check whether supplied/generated language is coherently matchable to the bounded packet; and
- perform another narrowly defined JSON → JSON actor-behavior transformation if an executable operation proves it necessary.

A direct deterministic player control or deterministic world mechanic does not require Granite merely because the model is available.

## What Granite must never own

Granite does not:

- own an NPC;
- own the player;
- own world state;
- read arbitrary CSV directly;
- decide which world facts it is allowed to receive;
- decide its own operation scope;
- invent new authoritative entities/actions/properties merely by mentioning them;
- maintain hidden game truth between calls;
- decide objective truth;
- execute physical consequences;
- mutate arbitrary CSV;
- write directly to rendering/UI;
- implement trust, friendship, morality, loyalty, resentment, civilization, or similar social scores.

Model weights/runtime may remain loaded for performance. Call-local model state is not game state.

## One model-call primitive

Every Granite transformation uses the same game-side boundary:

```text
CSV-backed world / bounded transient input
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

Every Granite call is one bounded JSON → JSON transformation.

Stage names describe the requested transformation. They do not create separate model agents or model-owned subsystems.

## Resolver

Resolver does one thing:

> Read/resolve only the CSV-backed facts and bounded transient inputs permitted for the current transformation and project them into the JSON packet Granite receives.

Resolver may include only what the current operation requires, such as:

- actor identity;
- relevant nearby/known actors;
- relevant objects/resources/structures;
- current factual state;
- available actions/behaviors;
- grounded dialogue concepts;
- system prompt;
- operation/stage identity;
- required output shape/population;
- external human action/dialogue when applicable.

This list is conceptual, not a frozen JSON schema.

Resolver does not interpret Granite output, perform semantic CHECK, own world state, execute consequences, or mutate authoritative state.

## Granite

Granite does one thing:

> Transform the supplied bounded JSON packet into one JSON return for the requested operation.

Calls are independent with respect to game truth.

Granite has no direct CSV access, no hidden world authority, no permission to choose its own scope, and no automatic game-relevant memory carried into later calls.

Every Granite return is untrusted.

## Witness

Witness does one thing:

> Deterministically validate one raw Granite return against that transformation's schema, allowed values/references, identity, scope, and other game-defined bounds, then return the corresponding bounded transient result or reject it.

Witness does not:

- perform the semantic natural-language judgment assigned to Granite `CHECK`;
- invent missing meaning;
- silently repair malformed output;
- enlarge the allowed world population;
- execute consequences;
- turn a transient intermediate into authoritative world state merely because it passed validation.

## CSV-bounded versus CSV-backed

Use these terms precisely:

```text
CSV-bounded
= transient value constrained by possibilities derived from trusted CSV

CSV-backed
= authoritative continuing state/configuration represented in CSV
```

A Witness result may be legal input to another transformation without becoming authoritative game state.

Only an explicit accepted write into CSV-backed state changes continuing game truth.

This preserves the project relationship:

```text
CSV persists
JSON expresses/transports
Granite transforms
Witness bounds
Deterministic mechanics resolve consequences
accepted durable result returns to CSV
```

## Behavioral freedom

Granite is not required to behave sensibly.

It may produce a bad choice, lie, misunderstand, contradict itself, attempt an impossible action, refuse, cooperate, use odd language, or otherwise behave unpredictably.

That variation is part of the experiment.

The boundary constrains what the result can correspond to in the represented game world. It does not optimize behavior toward designer expectations.

Example:

```text
Granite result: hand_over(stone)
```

That may be a semantically valid expressed action because `hand_over` and `stone` are represented in the operation's bounded population.

Deterministic mechanics may still make the action fail if the current CSV state says the actor does not hold the stone.

Do not make Granite pre-solve every physical precondition merely to avoid failed attempts.

## Bounded world population

Each Granite call operates over a game-defined finite population of possibilities supplied by Resolver.

Depending on the operation, that population may contain relevant:

- actors;
- objects/resources/structures;
- systems/actions/behaviors;
- properties/relations;
- factual state;
- grounded dialogue concepts;
- output choices/references.

Granite may combine, select, phrase, or evaluate within the supplied operation, but it does not enlarge authoritative world ontology by mentioning unsupported concepts.

Natural language may be free-form text inside a packet. Free-form text is not game authority.

## Human and NPC symmetry

The actor boundary is symmetrical at the world-state level.

For an NPC:

```text
CSV world slice
 ↓
bounded JSON
 ↓
Granite generates/evaluates action or dialogue
 ↓
JSON expression
 ↓
harness
 ↓
CSV if an accepted durable transition occurs
```

For a human:

```text
CSV world slice + external human action/dialogue
 ↓
bounded operation
 ↓
Granite mapping/evaluation when fuzzy interpretation is needed
 ↓
JSON game representation
 ↓
harness
 ↓
CSV if an accepted durable transition occurs
```

Granite is machinery used by the game on either side where fuzzy transformation is required. It is not synonymous with NPC control.

## Dialogue transformations

Natural-language communication may use these sequences:

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

Every named stage is independently:

```text
Resolver → Granite(stage) → Witness
```

Intermediate stage outputs are bounded transient structures. They do not become authoritative CSV-backed state merely because Witness validated them.

See `docs/DIALOGUE_BOUNDARY.md` for the communication contract.

## CHECK role

`Granite.CHECK` asks:

> Is this utterance/candidate language coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by this bounded packet?

CHECK does not decide objective truth.

A false statement about an existing stone can pass.

Automotive-engine discourse must fail when the bounded packet contains nothing corresponding to automotive machinery.

Lies, mistakes, ambiguity, deception, and misunderstanding are allowed when the language remains grounded in the supplied possibilities.

CHECK is local to the side being checked. Do not provide omniscient hidden state merely to force two speakers to understand one another identically.

Witness validates CHECK's structured return. Witness does not reproduce CHECK's semantic task.

## NPC-to-NPC communication

The recipient receives the actual emitted utterance, never the sender's hidden candidate/structured representation.

Preserve:

```text
sender intended X → said Y → recipient interpreted Z
```

including `X ≠ Z`.

This difference is allowed experimental behavior.

## Consequence boundary

A bounded action result is not automatically a physical world mutation.

Deterministic game code checks current CSV-backed preconditions and computes the permitted consequence.

Granite may propose behavior. Deterministic mechanics decide what actually happens.

An emitted utterance may be delivered without automatically becoming a durable historical fact. If future operations need the fact that it was spoken/heard, persist an appropriate attributed event in CSV-backed state.

## Schema rule

Do not freeze the final Granite packet shape before the real browser model integration is executed.

The behavioral contract is fixed. The serialization shape is not.

First establish the concrete Granite 350M browser/WebApp calling interface. Then build the smallest Resolver/Witness and packet needed for a real operation. Let later packet fields emerge from later executable operations.

Do not design a general model protocol merely because it might be useful.

## Preserve the experiment

Do not add hidden conversational memory, relationship scores, personality engines, social-state abstractions, model-owned memories, or generic agent frameworks because they seem useful.

Do not optimize away lies, failed attempts, misunderstandings, strange choices, or conflict.

Preserve the apparatus and let runs establish what behavior emerges.

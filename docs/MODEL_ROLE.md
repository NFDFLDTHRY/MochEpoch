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

- generate/select an NPC action from the bounded current possibility-space;
- generate NPC natural-language dialogue from bounded current world/context;
- map human natural-language input into game-defined possibilities;
- map a fuzzy human action into game-defined possibilities when required; and
- perform another narrowly defined JSON → JSON actor-behavior transformation only when an executable operation proves it necessary.

A direct deterministic player control or deterministic world mechanic does not require Granite merely because the model is available.

## What selects a Granite call

Granite is a callable node in the CSV-described function graph.

CSV-backed configuration may determine/reference, as the proven operation requires:

- the operation being performed;
- the model/runtime resource;
- the actor/context references;
- the system prompt;
- the CSV-backed facts/populations Resolver may project;
- the required output shape/population; and
- the next function/operation edge when execution proves one is needed.

Executable code provides generic call machinery. Do not hard-code a second NPC/game-specific control architecture around Granite.

The exact CSV and JSON schemas are not fixed yet. They must fall out of the real browser call and real game operations.

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
Granite(operation)
        ↓
untrusted JSON result
        ↓
Witness
        ↓
bounded transient result or REJECT
```

Every Granite call is one bounded JSON → JSON transformation.

Operation names describe only the requested transformation. They do not create agents, subsystems, privileged stages, or a fixed dialogue pipeline.

## Resolver

Resolver does one thing:

> Read/resolve only the CSV-backed facts and bounded transient inputs permitted for the current transformation and project them into the JSON packet Granite receives.

Resolver may include only what the current operation requires, such as actor identity, relevant actors/objects/resources/structures, current factual state, available behaviors, system prompt, required output shape/population, and external human action/dialogue when applicable.

This is conceptual, not a frozen JSON schema.

Resolver does not interpret Granite output, own game state, execute consequences, or mutate authoritative state.

## Granite

Granite does one thing:

> Transform the supplied bounded JSON packet into one JSON return for the requested operation.

Calls are independent with respect to game truth.

Granite has no direct CSV access, no hidden world authority, no permission to choose its own scope, and no automatic game-relevant memory carried into later calls.

Every Granite return is untrusted.

## Witness

Witness does one thing:

> Deterministically validate one raw Granite return against that transformation's schema, allowed values/references, identity, scope, and other game-defined bounds, then return the corresponding bounded transient result or reject it.

Witness does not invent missing meaning, silently repair malformed output, enlarge the allowed world population, execute consequences, or turn a transient intermediate into authoritative world state merely because it passed validation.

If the operation itself asks Granite to perform fuzzy semantic correspondence, that semantic work belongs to that configured Granite transformation. It is not a permanently named `CHECK` subsystem.

## CSV-bounded versus CSV-backed

Use these terms precisely:

```text
CSV-bounded
= transient value constrained by possibilities derived from trusted CSV

CSV-backed
= authoritative continuing state/history/configuration represented in CSV
```

A Witness result may be legal input to another transformation without becoming authoritative game state.

Only an explicit accepted write into CSV-backed state changes continuing game truth/history.

This preserves the project relationship:

```text
CSV persists
JSON expresses/transports
Granite transforms
Witness bounds
accepted actor expression/event returns to CSV
deterministic mechanics resolve physical consequence
resulting durable facts/events return to CSV
```

## Behavioral freedom

Granite output is not required to encode sensible actor behavior.

A Granite return may represent an NPC making a bad choice, lying, misunderstanding, contradicting prior speech, attempting an impossible action, refusing, cooperating, using odd language, or otherwise behaving unpredictably.

Those are properties of the actor behavior represented by the return, not evidence that Granite itself is an in-world actor.

That variation is part of the experiment.

The boundary constrains what the result can correspond to in the represented game world. It does not optimize behavior toward designer expectations.

Example:

```text
Granite return representing Ada's expression: hand_over(stone)
```

That may be a valid expressed action because `hand_over` and `stone` are represented in the operation's bounded population.

The accepted actor expression can be written to CSV-backed factual/attributed state. Deterministic mechanics may then make the physical action fail if current CSV-backed state says the actor does not hold the stone.

Do not make Granite pre-solve every physical precondition merely to avoid failed attempts.

## Bounded world population

Each Granite call operates over a game-defined finite population of possibilities supplied by Resolver.

Depending on the operation, that population may contain relevant actors, objects/resources/structures, systems/actions/behaviors, properties/relations, factual state, dialogue concepts, and output choices/references.

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
harness mapping / validation
 ↓
write accepted actor expression/event to CSV-backed state
 ↓
deterministic consequence where applicable
 ↓
CSV-backed resulting facts/events
```

For a human:

```text
CSV world slice + external human action/dialogue
 ↓
Granite mapping/evaluation only when fuzzy interpretation is needed
 ↓
JSON game representation
 ↓
harness mapping / validation
 ↓
write accepted actor expression/event to CSV-backed state
 ↓
deterministic consequence where applicable
 ↓
CSV-backed resulting facts/events
```

Granite is machinery used by the game on either side where fuzzy transformation is required. It is not synonymous with NPC control.

## Communication

Natural-language communication has no fixed Granite stage graph.

The smallest valid communication operation is one bounded transformation when one transformation can complete the required mapping.

If an executed case proves that an additional model transformation is required, the CSV-described function graph may route through another ordinary `Resolver → Granite(operation) → Witness` call. That extra call must solve a concrete observed requirement, not exist because a general dialogue architecture seems useful.

For NPC-to-NPC communication, the actual utterance delivered by the sender crosses to the recipient. Never substitute a hidden sender-side structured candidate for what the recipient actually received.

See `docs/DIALOGUE_BOUNDARY.md` for the communication contract.

## Consequence boundary

A bounded action result is not automatically a physical world mutation.

The accepted actor expression/event returns through CSV-backed state. Deterministic game code then checks current CSV-backed preconditions and computes the permitted physical consequence.

Granite may produce a return representing proposed actor behavior. Deterministic mechanics decide what actually happens.

For dialogue, the factual event that an utterance occurred may be CSV-backed game history. The semantic claim inside that utterance remains attributed speech and is not automatically objective world truth.

## Schema rule

Do not freeze the final Granite packet shape before the real browser model integration is executed.

The behavioral contract is fixed. The serialization shape and model-call count are not.

First establish the concrete Granite 350M browser/WebApp calling interface. Then build the smallest Resolver/Witness and packet needed for a real operation. Let later packet fields and additional calls emerge only from later executable operations.

Do not design a general model protocol merely because it might be useful.

## Preserve the experiment

Do not add hidden conversational memory, relationship scores, personality engines, social-state abstractions, model-owned memories, fixed dialogue stage pipelines, or generic agent frameworks because they seem useful.

Do not optimize away lies, failed attempts, misunderstandings, strange choices, or conflict.

Preserve the apparatus and let runs establish what behavior emerges.

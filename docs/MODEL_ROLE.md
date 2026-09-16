# Granite role and experimental framing

This document defines exactly what MochEpoch expects Granite and the model-call edge to do.

Read `docs/GAME_BLUEPRINT.md` first for the full lifecycle and `docs/CSV_BACKING_STATE.md` for the authority boundary.

## Exact role

Granite is not an NPC brain, autonomous agent, world model, authority, truth engine, civilization simulator, or owner of character state.

Granite is an ordinary call-scoped game function:

```text
JSON parameters → Granite → JSON return
```

Its job is:

> Generate or evaluate actor actions and natural-language dialogue from the scoped CSV-backed world/context supplied in one call packet, subject only to whatever return shape the current call actually requires.

Granite may generate an NPC action, generate NPC language, map human language into a game-relevant representation, map a fuzzy human action, or perform another narrowly defined JSON → JSON transformation only when an executable operation proves it necessary.

A deterministic player control or deterministic world mechanic does not require Granite merely because the model exists.

## Scoped does not mean behavior-whitelisted

The call is scoped because Witness selects the CSV-backed state/configuration supplied to Granite.

That scope limits the information available to the call. It does not require the represented actor to choose from a universal finite action menu, behave sensibly, or stay within a designer-approved social script.

A particular operation may deliberately use a narrow return schema. The current fixture's `hand_over | wait` enum is one such local constraint. It is not the general MochEpoch behavior ontology.

Granite may produce strange, false, contradictory, foolish, hostile, cooperative, impossible, or otherwise surprising actor behavior. The authoritative question comes later: can the result map back into the current CSV-described world and an implemented mechanic?

## Witness is the outbound wrapper

`Witness` is the project name for the scoped CSV → Granite-call edge.

A Witness call does only this:

1. receive the caller/current operation and whatever CSV-backed references the implemented call actually uses;
2. resolve only that scoped CSV state/configuration;
3. include only the prompt, situation, facts/context, model/resource information, and return constraint the real call actually needs; and
4. construct the transient JSON packet passed to Granite.

Conceptually:

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

Witness owns no game state. It does not reason about the world, interpret Granite output, decide consequences, repair output, maintain NPC memory, or mutate CSV.

Witness is not a separate simulation subsystem. It is a generic stateless edge operation in the same harness.

There is no required separate `Resolver` architecture. Reference resolution is ordinary generic CSV work performed while constructing the packet.

The Witness packet schema is not frozen before the real browser call establishes its minimum shape.

## What selects a Granite call

Game-specific choices that must survive outside executable code belong in CSV-backed configuration only when a real operation requires them.

The current fixture proves only this narrow relationship:

```text
Ada decision_system = interaction
interaction.csv supplies system_prompt + output_schema
```

Do not infer a universal operation record, model registry, function-routing table, next-step field, or output-population schema from that fixture.

If the real Granite browser interface proves that another model/resource reference is required, add the minimum reference then. If a later operation proves another call must follow, add only the minimum game-specific reference required by that operation.

Executable code supplies generic machinery. Do not hard-code a second NPC/game-specific control architecture around Granite.

## Granite owns nothing

Granite does not:

- own an NPC or the player;
- own world state;
- read arbitrary CSV directly;
- choose what world scope it receives;
- create authoritative ontology merely by mentioning something;
- maintain hidden game truth between calls;
- decide objective truth;
- execute physical consequences;
- mutate CSV;
- write directly to rendering/UI; or
- implement trust, friendship, morality, loyalty, resentment, civilization, or similar social scores.

Model weights/runtime may remain loaded for performance. Call-local model context is not game state.

## Return edge

Granite returns JSON. JSON is temporary and non-authoritative.

The deterministic harness/game runner performs only the return work required by the current operation:

```text
raw Granite JSON
        ↓
parse / map against the current CSV-described world and implemented mechanic
        ↓
accepted game representation or REJECT
        ↓
deterministic game operation / consequence
        ↓
write only the CSV-backed facts/history the operation actually requires
```

The accepted representation can remain transient while deterministic mechanics resolve it. It does not require its own CSV event merely because Granite produced it.

The operation may:

- mutate current CSV state directly;
- write factual/attributed history when later behavior needs that history;
- do both; or
- produce no CSV change when resolution fails or is a no-op.

This return edge is not Witness. Do not invent a second named subsystem merely to perform it.

A schema-valid Granite return is still not game truth. Only the CSV-backed facts/history actually written by the accepted operation become continuing game truth/history.

If another Granite transformation is actually required, a transient prior result may be used to construct another scoped Witness packet. Intermediate JSON remains disposable unless a later implemented operation genuinely needs it persisted.

## Behavioral freedom

Granite output is not required to represent sensible actor behavior.

A return may represent an NPC lying, misunderstanding, contradicting prior speech, making a poor choice, attempting an impossible action, refusing, cooperating, using odd language, or otherwise behaving unpredictably.

Those are properties of the represented actor behavior, not evidence that Granite is an in-world actor.

Example:

```text
Granite return representing Ada's action: hand_over(stone)
```

That action can map if the current CSV-described world contains the referenced stone and the game has an implemented `hand_over` mechanic. Deterministic mechanics may still make the physical hand-over fail if current CSV-backed state says Ada no longer holds the stone.

The failed attempt does not need a permanent history record unless later implemented behavior requires it.

Do not make Granite pre-solve every physical precondition merely to avoid failed attempts.

## Human and NPC symmetry

At the game-truth boundary, humans and NPCs occupy the same behavioral slot.

NPC path:

```text
CSV → Witness packet when needed → Granite-generated behavior JSON → deterministic map/resolve → CSV
```

Human path when fuzzy mapping is needed:

```text
CSV + human action/dialogue → Witness packet → Granite-mapped JSON → deterministic map/resolve → CSV
```

A direct deterministic human control can skip Granite entirely.

Granite is machinery used where fuzzy generation/mapping is required. It is not synonymous with NPC control.

## Communication

Natural-language communication has no fixed Granite stage graph.

Start with one scoped Witness call when one call can complete the required transformation. Add another model call only when an executed case demonstrates a concrete need.

For NPC-to-NPC communication, the actual utterance delivered by the sender crosses to the recipient. Never substitute hidden sender-side structured data for what the recipient actually received.

Persist speech/history only when later game behavior needs it. See `docs/DIALOGUE_BOUNDARY.md`.

## Schema rule

The behavioral contract is fixed. The serialization shape is not.

First establish the concrete Granite 350M browser/WebApp calling interface. Then build the smallest Witness packet and deterministic return mapping required by the real operation. Let later packet fields, history representation, and additional calls emerge only from later executable operations.

Do not design a general model protocol, behavior whitelist, graph protocol, or event layer merely because it might be useful.

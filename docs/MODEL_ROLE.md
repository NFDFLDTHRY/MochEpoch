# Granite role and experimental framing

This document defines exactly what MochEpoch expects Granite and the model-call edge to do.

Read `docs/GAME_BLUEPRINT.md` first for the full lifecycle and `docs/CSV_BACKING_STATE.md` for the authority boundary.

## Exact role

Granite is not an NPC brain, autonomous agent, world model, authority, truth engine, civilization simulator, or owner of character state.

Granite is an ordinary callable game function:

```text
JSON parameters → Granite → JSON return
```

Its job is:

> Generate or evaluate actor actions and natural-language dialogue from the bounded game possibilities supplied in one call packet.

Granite may generate an NPC action, generate NPC language, map human language into game-defined possibilities, map a fuzzy human action, or perform another narrowly defined JSON → JSON transformation only when an executable operation proves it necessary.

A deterministic player control or deterministic world mechanic does not require Granite merely because the model exists.

## Witness is the outbound wrapper

`Witness` is the project name for the scoped CSV → Granite-call edge.

A Witness call does only this:

1. receive the caller/operation and the CSV-backed references/configuration selected for that call;
2. resolve only that scoped CSV state;
3. include the CSV-backed system prompt, model/function configuration, current situation, bounded possibilities, and required output shape actually requested by the operation; and
4. construct the one transient JSON packet passed to Granite.

Conceptually:

```text
CSV-backed world/configuration
        ↓
Witness
resolve scoped CSV + construct packet
        ↓
bounded JSON packet
        ↓
Granite
        ↓
raw JSON return
```

Witness owns no game state. It does not reason about the world, interpret Granite output, decide consequences, repair output, maintain NPC memory, or mutate CSV.

Witness is not a separate simulation subsystem. It is a generic stateless edge operation in the same harness.

There is no required separate `Resolver` architecture. Reference resolution is simply work Witness performs while constructing the packet, using generic CSV machinery.

## What selects a Granite call

Game-specific call wiring belongs in CSV-backed configuration.

As an actual operation requires, CSV may reference:

- the operation/function to call;
- the Granite/model/runtime resource;
- caller/actor/world/system references;
- the system prompt;
- the CSV-backed facts/populations to include;
- the required output shape/population; and
- the next function/operation edge when real execution proves one is needed.

Executable code supplies generic machinery. Do not hard-code a second NPC/game-specific control architecture around Granite.

The exact CSV and JSON schemas are not fixed yet. They must fall out of the real browser call and real game operations.

## Granite owns nothing

Granite does not:

- own an NPC or the player;
- own world state;
- read arbitrary CSV directly;
- choose what world scope it receives;
- enlarge authoritative ontology merely by mentioning something;
- maintain hidden game truth between calls;
- decide objective truth;
- execute physical consequences;
- mutate CSV;
- write directly to rendering/UI; or
- implement trust, friendship, morality, loyalty, resentment, civilization, or similar social scores.

Model weights/runtime may remain loaded for performance. Call-local model context is not game state.

## Return edge

Granite returns JSON. JSON is temporary and non-authoritative.

The deterministic harness/game runner performs only the return work required by the configured operation:

```text
raw Granite JSON
        ↓
parse / validate / map against the configured output contract
        ↓
accepted game representation or REJECT
        ↓
deterministic operation / consequence
        ↓
write the resulting CSV-backed facts/events the operation actually requires
```

The accepted game representation can remain transient while deterministic mechanics resolve it. It does not require its own CSV event merely because Granite produced it.

The operation may:

- mutate current CSV state directly;
- write factual/attributed history when later behavior needs that history;
- do both; or
- produce no CSV change when resolution fails or is a no-op.

This return edge is not Witness. Do not invent a second named subsystem merely to perform it. Use the smallest generic deterministic mapping/write functions the executed operation requires.

A schema-valid Granite return is still not game truth. Only the CSV-backed facts/events actually written by the accepted operation become continuing game truth/history.

If another Granite transformation is actually required, a transient prior result may be used to construct another scoped Witness packet. Intermediate JSON remains disposable unless a later implemented operation genuinely needs it persisted.

## Behavioral freedom

Granite output is not required to represent sensible actor behavior.

A return may represent an NPC lying, misunderstanding, contradicting prior speech, making a poor choice, attempting an impossible action, refusing, cooperating, using odd language, or otherwise behaving unpredictably.

Those are properties of the represented actor behavior, not evidence that Granite is an in-world actor.

The harness only needs the result to map back into the game world represented by CSV-backed possibilities.

Example:

```text
Granite return representing Ada's action: hand_over(stone)
```

That action can map correctly because `hand_over` and `stone` are represented in the current operation. Deterministic mechanics may still make the physical hand-over fail if current CSV-backed state says Ada no longer holds the stone.

The failed attempt does not need a permanent event record unless later implemented behavior requires it.

Do not make Granite pre-solve every physical precondition merely to avoid failed attempts.

## Human and NPC symmetry

At the game-truth boundary, humans and NPCs occupy the same behavioral slot.

NPC path:

```text
CSV → Witness packet → Granite-generated behavior JSON → deterministic map/resolve → CSV
```

Human path when fuzzy mapping is needed:

```text
CSV + human action/dialogue → Witness packet → Granite-mapped JSON → deterministic map/resolve → CSV
```

A direct deterministic human control can skip Granite entirely.

Granite is machinery used where fuzzy generation/mapping is required. It is not synonymous with NPC control.

## Communication

Natural-language communication has no fixed Granite stage graph.

Start with one scoped Witness call when one call can complete the required mapping. Add another model call only when an executed case demonstrates a concrete need. Any extra routing belongs in CSV-backed function configuration.

For NPC-to-NPC communication, the actual utterance delivered by the sender crosses to the recipient. Never substitute hidden sender-side structured data for what the recipient actually received.

Persist speech/history only when later game behavior needs it. See `docs/DIALOGUE_BOUNDARY.md`.

## Schema rule

The behavioral contract is fixed. The serialization shape is not.

First establish the concrete Granite 350M browser/WebApp calling interface. Then build the smallest Witness packet and deterministic return mapping required by the real operation. Let later packet fields, history representation, and additional calls emerge only from later executable operations.

Do not design a general model protocol or event layer merely because it might be useful.

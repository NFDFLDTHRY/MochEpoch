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

> Generate or evaluate actor actions and natural-language dialogue from the scoped CSV-backed world/context supplied in one call packet and return JSON in whatever concrete form the executing game path actually uses.

Here, `packet` means the one transient JSON object supplied to that Granite call. It is not a separate wrapper protocol or runtime object.

A JSON Schema, enum, grammar, constrained decoder, or other explicit return-shape mechanism is optional local machinery. It is not part of Granite's universal MochEpoch contract.

Granite may generate an NPC action, generate NPC language, transform human language into a game-relevant representation, transform a fuzzy human action, or perform another narrowly defined JSON → JSON transformation only when an executable game path proves it necessary.

A deterministic player control or deterministic world mechanic does not require Granite merely because the model exists.

## “Operation” is descriptive language, not a runtime object

This documentation uses words such as `operation`, `current operation`, and `operation-local` to mean the concrete game code path that is executing right now.

Those words do not require an `Operation` class, operation object, operation context, caller object, dispatch token, request envelope, lifecycle record, operation registry, or operation identifier.

An ordinary function call with the actual references/parameters it needs is sufficient.

Do not add operation metadata to CSV or JSON merely because the documentation uses the word “operation.” Add a field only when a real executable call needs that field.

## Scoped does not mean behavior-whitelisted

The call is scoped because Witness selects the CSV-backed state/configuration supplied to Granite.

That limits the information available to the call. It does not require the represented actor to choose from a universal finite action menu, behave sensibly, or stay within a designer-approved social script.

A particular call may deliberately use a narrow return schema. The current fixture's `hand_over | wait` enum is one such local constraint. It is not the general MochEpoch behavior ontology and does not imply that every Granite call needs an output schema.

Another concrete call may use a different schema, a prompt convention, a parser-specific format, or no explicit output-schema mechanism at all.

Granite may produce strange, false, contradictory, foolish, hostile, cooperative, impossible, or otherwise surprising actor behavior.

## Witness is the outbound wrapper

`Witness` is the project name for the scoped CSV → Granite-call edge.

A Witness call does only this:

1. receive whatever CSV-backed references/parameters the concrete call site actually supplies;
2. resolve only that scoped CSV state/configuration;
3. include only the prompt, situation, facts/context, model/resource information, and any output guidance/configuration that this call actually uses; and
4. construct the one transient JSON object passed to Granite.

That JSON object is what this repository calls the `packet` or `calling packet`.

`Packet` does not imply a packet class, nested payload wrapper, header/body format, transport layer, fixed top-level field set, universal packet schema, stored packet record, caller metadata, or operation metadata.

Witness does not require a caller object or current-operation object.

No output-schema, enum, grammar, return-constraint field, operation-id field, or operation-context field is mandatory merely because Witness exists.

```text
scoped CSV-backed state/configuration
        ↓
Witness
retrieve scoped CSV + construct call JSON
        ↓
JSON packet
        ↓
Granite
        ↓
raw JSON return
```

Witness owns no game state. It does not reason about the world, interpret Granite output, decide consequences, repair output, maintain NPC memory, or mutate CSV.

There is no required separate `Resolver` architecture. Reference resolution is ordinary generic CSV work performed while constructing the call JSON.

The Witness packet shape is not frozen before the real browser call establishes its minimum fields.

## What selects a Granite call

Game-specific choices that must survive outside executable code belong in CSV-backed configuration only when a real executing path requires them.

The current fixture proves only this narrow relationship:

```text
Ada decision_system = interaction
interaction.csv supplies system_prompt + output_schema
```

The `output_schema` key belongs to this fixture. Do not infer a universal output-schema field, return-constraint field, operation record, model registry, function-routing table, next-step field, output-population schema, or universal packet envelope from it.

If the real Granite browser interface proves another model/resource reference is required, add the minimum reference then. If a later game path proves another call must follow, add only the minimum game-specific reference required by that path.

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

## Return handling stays with the concrete game path

Granite returns JSON. JSON is temporary and non-authoritative.

There is no universal semantic mapper, acceptance stage, `REJECT` state, validator framework, or intermediate authoritative representation between Granite and the concrete game code that consumes the return.

That code uses only the deterministic handling it actually needs.

For the current fixture:

```text
Granite → {"action":"hand_over"}
        ↓
parse interaction.csv output shape
        ↓
call hand_over mechanic
        ↓
mechanic checks current CSV facts
        ↓
write holder change OR make no world change
```

That parser exists because the current fixture explicitly defines `output_schema`. It does not establish schema validation or structured-output machinery as a universal return step.

If the return is malformed, outside the current fixture's schema, references something this code path cannot use, or otherwise cannot be consumed:

```text
Granite → unusable return
        ↓
concrete code path cannot consume it
        ↓
no authoritative CSV write
        ↓
record the failed run as evidence
```

That failure does not require a universal `REJECT` object or state.

A later game path may need a different parser, reference lookup, language transformation, deterministic mechanic, or no explicit schema machinery at all. Build only what that path proves necessary.

“Mapping” is acceptable shorthand for a local conversion when useful. It is not the name of a shared subsystem or universal semantic judgment.

Only CSV-backed facts/history actually written by the concrete game code become continuing game truth/history.

## Behavioral freedom

Granite output is not required to represent sensible actor behavior.

A return may represent an NPC lying, misunderstanding, contradicting prior speech, making a poor choice, attempting an impossible action, refusing, cooperating, using odd language, or otherwise behaving unpredictably.

Those are properties of the represented actor behavior, not evidence that Granite is an in-world actor.

Example:

```text
Granite return representing Ada's action: hand_over(stone)
```

If the executing code recognizes that action and the referenced stone exists, it can invoke the implemented `hand_over` mechanic. The mechanic may still produce no holder change if current CSV facts say Ada no longer holds the stone.

The failed attempt does not need permanent history unless later implemented behavior requires it.

Do not make Granite pre-solve every physical precondition merely to avoid failed attempts.

## Human and NPC symmetry

At the game-truth boundary, humans and NPCs occupy the same behavioral slot.

NPC path:

```text
CSV → Witness packet when needed → Granite behavior JSON
→ local deterministic handling → concrete mechanic → CSV
```

Human path when fuzzy interpretation is needed:

```text
CSV + human action/dialogue → Witness packet → Granite JSON
→ local deterministic handling → concrete mechanic → CSV
```

A direct deterministic human control can skip Granite entirely.

Granite is machinery used where fuzzy generation/evaluation is required. It is not synonymous with NPC control.

## Communication

Natural-language communication has no fixed Granite stage graph.

Start with one scoped Witness call when one call can complete the required transformation. Add another model call only when an executed case demonstrates a concrete need.

For NPC-to-NPC communication, the actual utterance delivered by the sender crosses to the recipient. Never substitute hidden sender-side structured data for what the recipient actually received.

Persist speech/history only when later game behavior needs it. See `docs/DIALOGUE_BOUNDARY.md`.

## Schema rule

The behavioral contract is fixed. The serialization shape is not.

The current fixture has an `output_schema`; MochEpoch as a whole does not require one for every Granite call.

First establish the concrete Granite 350M browser/WebApp calling interface. Then build the smallest Witness packet and local deterministic return handling required by the real game path. Let later packet fields, optional output guidance/schema, history representation, parsers, mechanics, and additional calls emerge only from later executable work.

Do not design a general model protocol, universal packet envelope, universal output-schema layer, behavior whitelist, graph protocol, operation-object protocol, return-mapping framework, rejection layer, or event layer merely because it might be useful.

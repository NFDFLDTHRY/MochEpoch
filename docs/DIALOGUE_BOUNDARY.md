# Dialogue and model boundary

This document defines how MochEpoch handles natural-language communication without inventing a separate dialogue architecture.

Read `docs/GAME_BLUEPRINT.md` and `docs/MODEL_ROLE.md` first.

## Dialogue is just another actor-mediated operation

Dialogue uses the same lifecycle as every other actor-mediated game operation:

```text
CSV-backed world
        ↓
Witness resolves the scoped CSV and constructs one JSON call packet when Granite is needed
        ↓
NPC or HUMAN language
        ↓
JSON return where applicable
        ↓
operation-local deterministic handling
        ↓
CSV-backed communication fact/history only when later gameplay needs it
        ↓
next world operation
```

There is no separate conversation engine.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or any other fixed dialogue stage graph.

Start with the smallest transformation that completes the real interaction. If one Granite call is enough, use one. Add another call only when an executed communication case proves another transformation is necessary.

If a later communication step requires game-specific CSV-backed configuration, add only the minimum reference required by that step. Do not prebuild dialogue routing fields or a dialogue graph.

## Witness in dialogue

Witness has the same job here that it has everywhere else: retrieve only the scoped CSV-backed state/configuration needed by the call and construct the transient JSON packet Granite receives.

Witness does not interpret the utterance, decide what it means, inspect Granite output, or write dialogue history.

There is no separate Resolver subsystem. CSV reference resolution is ordinary packet-construction work.

## Scoped does not mean speech-whitelisted

The call is scoped because the packet contains only the CSV-backed world/context selected for that interaction.

That does not require a human or NPC to choose from a finite set of approved utterances, speak truthfully, remain coherent, or behave socially well.

Actors may say arbitrary things. A narrow return schema may be used for a particular operation. That is local configuration, not a universal dialogue ontology or a universal Granite-call requirement.

A communication call may instead use a different schema, a prompt convention, parser-specific output, or no explicit output-schema mechanism at all. Do not add `output_schema`, grammar, enum, or structured-output machinery until the concrete executed call needs it.

## There is no universal dialogue return mapper

After a model call, the current communication operation uses only the deterministic handling it actually needs.

There is no shared semantic acceptance layer, universal validator, `REJECT` state, or `accepted communication representation` that every utterance must cross.

Examples:

```text
NPC-generated utterance JSON
        ↓
current operation extracts the utterance field it expects
        ↓
deliver the actual utterance
```

or:

```text
human utterance + scoped world
        ↓
Granite performs the fuzzy interpretation required by this operation
        ↓
JSON result
        ↓
current operation consumes the specific fields it understands
        ↓
concrete game mechanic, fact write, or no world change
```

If the return cannot be consumed by the current operation, that operation produces no authoritative CSV transition and the failed run is evidence. Do not invent a global rejection protocol merely to name that outcome.

“Mapping” may be used as shorthand for a concrete operation's local conversion when useful. It is not a separate dialogue subsystem.

## What the game does not judge

Dialogue handling does not judge whether a human or NPC is sensible, truthful, polite, moral, cooperative, consistent, or strategically competent.

A human or NPC may lie, misunderstand, contradict earlier speech, threaten, bargain, insult, cooperate, refuse, speak ambiguously, or say something foolish.

That variation is the game.

Language cannot create authoritative ontology by mention alone. If the scoped CSV-described world and implemented mechanics contain nothing corresponding to a spaceship, mentioning a spaceship does not create one.

A false statement about an existing stone can still be delivered speech. Recording that the statement occurred does not make the statement objectively true.

## Speech as factual history

Communication does not automatically require a permanent transcript or event record.

When later game operations need to know that a speech occurrence happened, that occurrence needs CSV-backed factual/attributed history.

For example:

```text
Ada said: "I already gave you the stone."
```

may be a true game-history fact while authoritative object state still says Ada holds the stone.

The proposition inside the utterance remains attributed speech, not objective world truth.

The exact CSV representation and retention policy for speech, hearing, interpretation, or communication history are not fixed in advance. They must fall out of actual game interactions.

## Human → NPC

Human language enters as external data.

The smallest valid path is whatever the real interaction needs:

```text
recipient-relevant CSV world + human utterance
        ↓
Witness packet only when Granite is needed
        ↓
Granite fuzzy interpretation only when needed
        ↓
JSON where applicable
        ↓
operation-local deterministic handling
        ↓
CSV-backed result only when the game needs one persisted
```

Do not add extra interpretation/check/commit calls unless a real run proves they are necessary.

Do not require a schema/grammar layer merely because another dialogue operation uses one.

## NPC → Human

```text
speaker-relevant CSV world
        ↓
Witness packet
        ↓
Granite generates the NPC utterance
        ↓
JSON return
        ↓
current operation extracts/delivers the actual utterance
        ↓
persist speech only when later gameplay needs it
```

Do not add a compose/check/emit stack merely to normalize or improve what the NPC says.

## NPC → NPC

NPC-to-NPC communication is two ordinary actor boundaries connected by the actual utterance.

```text
NPC A relevant CSV world
        ↓
Witness packet
        ↓
Granite generates utterance Y
        ↓
deliver actual utterance Y
        ↓
NPC B relevant CSV world + Y
        ↓
Witness packet only when B needs Granite
        ↓
Granite transformation only as required by B's next operation
        ↓
operation-local deterministic handling
        ↓
CSV only for facts/history the game actually needs
```

Never pass hidden sender-side structured data directly to the recipient in place of the utterance that actually crossed the world.

The sender's generated expression and the recipient's later interpretation may differ. Do not automatically repair that mismatch.

## Dialogue and physical consequence

Speech and action are actor expressions crossing the same world boundary.

An understood action may still fail mechanically.

Example:

```text
hand_over(stone)
```

If a concrete operation recognizes `hand_over` and the referenced stone exists, it can invoke the implemented mechanic. Deterministic mechanics then read current CSV-backed facts and decide whether anything physically happens.

Dialogue machinery must not become a physics engine, truth engine, social-state engine, behavior corrector, semantic acceptance service, return-mapping framework, or universal structured-output layer.

## Invariants

1. CSV-backed state is the only authoritative continuing game state/history/configuration.
2. JSON is transient operational material unless the game explicitly persists a result into CSV-backed state.
3. Witness is only the scoped CSV → JSON Granite-call constructor.
4. Granite is only a call-scoped JSON → JSON transformation function.
5. Scoped input does not imply a universal behavior or speech whitelist.
6. Return handling belongs to the concrete operation. There is no universal mapper or rejection layer.
7. Output schemas/grammars are optional operation-local configuration, not a dialogue-wide or Granite-wide requirement.
8. Human and NPC language may remain chaotic.
9. Communication history is persisted only when later gameplay needs it.
10. Recording `A said Y` does not make the proposition inside `Y` objectively true.
11. NPC-to-NPC communication crosses the actual utterance, not hidden sender structure.
12. No fixed dialogue stage graph is part of the architecture.
13. Additional Granite calls, retries, checks, or correction passes may be added only when execution demonstrates a concrete need.
14. Do not build a general chatbot, agent loop, dialogue manager, semantic world model, social simulation layer, dialogue-routing framework, generic semantic validator, or universal structured-output layer.

## Evidence rule

For a communication test, preserve only what is needed to inspect the actual executed path:

- relevant authoritative CSV-backed input;
- the Witness packet actually sent to Granite;
- the raw Granite return/error actually produced;
- the operation-local deterministic handling actually performed;
- the utterance that actually crossed between actors;
- CSV-backed communication history only if the operation actually persisted it;
- any deterministic consequence; and
- resulting CSV-backed state when it changed.

Do not record hypothetical stages that did not run.

## Implementation rule

Implement the smallest communication path required by the next concrete game interaction.

Do not freeze a universal dialogue packet, behavior whitelist, output-schema/grammar policy, event schema, stage sequence, retry policy, routing graph, return-mapping layer, rejection protocol, or model-call count before real execution proves it necessary.

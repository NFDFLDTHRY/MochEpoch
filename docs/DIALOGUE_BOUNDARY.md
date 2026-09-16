# Dialogue and model boundary

This document defines how MochEpoch handles natural-language communication without inventing a separate dialogue architecture.

Read `docs/GAME_BLUEPRINT.md` and `docs/MODEL_ROLE.md` first.

## Dialogue is just another actor-mediated operation

Dialogue uses the same lifecycle as every other actor-mediated game operation:

```text
CSV-backed world
        ↓
Witness resolves the scoped CSV and constructs one JSON call packet
        ↓
Granite only when fuzzy generation/mapping is required
        ↓
raw JSON return
        ↓
deterministic parse / map / accept or REJECT
        ↓
CSV-backed communication event/result when it must persist
        ↓
next world operation
```

There is no separate conversation engine.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or any other fixed dialogue stage graph.

Start with the smallest mapping that can complete the real interaction. If one Granite call is enough, use one. Add another call only when an executed communication case proves the additional transformation is necessary. Any such routing belongs in CSV-backed function configuration rather than in a hard-coded dialogue subsystem.

## Witness in dialogue

Witness has the same job here that it has everywhere else: retrieve only the scoped CSV-backed state/configuration for the call and construct the transient JSON packet Granite receives.

Witness does not interpret the utterance, decide what it means, inspect Granite output, or write dialogue history.

There is no separate Resolver subsystem. CSV reference resolution is part of constructing the scoped packet.

## What the return edge cares about

The deterministic return edge does not judge whether a human or NPC is sensible, truthful, polite, moral, cooperative, consistent, or strategically competent.

It asks only whether the returned representation can map back into the current CSV-described game possibilities and required output shape.

A human or NPC may lie, misunderstand, contradict earlier speech, threaten, bargain, insult, cooperate, refuse, speak ambiguously, or say something foolish.

That variation is the game.

Language cannot create authoritative ontology merely by mentioning it. If the bounded world contains nothing corresponding to a spaceship, mentioning a spaceship does not create one.

A false statement about an existing stone can still be a valid speech event. Recording that the statement occurred does not make the statement objectively true.

## Speech as factual history

When communication actually occurs in the game and later operations need to know it happened, that occurrence needs CSV-backed factual/attributed history.

For example:

```text
Ada said: "I already gave you the stone."
```

may be a true game event while authoritative object state still says Ada holds the stone.

The proposition inside the utterance remains attributed speech, not objective world truth.

The exact CSV representation and retention policy for speech, hearing, interpretation, or communication history are not fixed in advance. They must fall out of actual game interactions.

## Human → NPC

Human language enters as external data.

The smallest valid shape is:

```text
recipient-relevant CSV world + human utterance
        ↓
Witness packet
        ↓
Granite mapping only if fuzzy language mapping is required
        ↓
raw JSON
        ↓
deterministic map / REJECT
        ↓
CSV-backed communication result when persistent
```

Do not add extra interpretation/check/commit calls unless a real run proves one call cannot perform the required mapping.

## NPC → Human

The smallest valid shape is:

```text
speaker-relevant CSV world
        ↓
Witness packet
        ↓
Granite generates the NPC utterance
        ↓
raw JSON
        ↓
deterministic validate/map
        ↓
CSV-backed speech event when persistent
        ↓
deliver the actual utterance to the human
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
deterministic map
        ↓
Y maps back to CSV-backed speech event when persistent
        ↓
deliver actual utterance Y
        ↓
NPC B relevant CSV world + Y
        ↓
Witness packet only when B needs a Granite mapping
        ↓
Granite maps/evaluates Y only as required by B's next operation
        ↓
deterministic map
        ↓
B result maps back to CSV-backed state when persistent
```

Never pass hidden sender-side structured data directly to the recipient in place of the utterance that actually crossed the world.

The sender's generated expression and the recipient's mapped result may differ. Do not automatically repair that mismatch.

## Dialogue and physical consequence

Speech and action are both actor expressions crossing the same world boundary.

A mapped action may still fail mechanically.

Example:

```text
hand_over(stone)
```

may map correctly because the action and object exist in the current game possibilities. Deterministic mechanics then read current CSV-backed facts and decide whether anything physically happens.

Dialogue machinery must not become a physics engine, truth engine, social-state engine, or behavior corrector.

## Invariants

1. CSV-backed state is the only authoritative continuing game state/history/configuration.
2. JSON is transient operational material unless explicitly admitted into CSV-backed state.
3. Witness is only the scoped CSV → JSON Granite-call constructor.
4. Granite is only a bounded JSON → JSON transformation function.
5. The return edge is deterministic parse/map/write machinery, not another model-owned authority.
6. Human and NPC language may remain chaotic.
7. Communication that must affect later operations must map back into CSV-backed factual/attributed state.
8. Recording `A said Y` does not make the proposition inside `Y` objectively true.
9. NPC-to-NPC communication crosses the actual utterance, not hidden sender structure.
10. No fixed dialogue stage graph is part of the architecture.
11. Additional Granite calls, retries, checks, or correction passes may be added only when execution demonstrates a concrete need, and their routing belongs in CSV-backed function configuration.
12. Do not build a general chatbot, agent loop, dialogue manager, semantic world model, or social simulation layer.

## Evidence rule

For a communication test, preserve only what is needed to inspect the actual executed path:

- relevant authoritative CSV-backed input;
- the Witness packet actually sent to Granite;
- the raw Granite return/error actually produced;
- the deterministic map/accept/reject result;
- the utterance that actually crossed between actors;
- the CSV-backed communication event/result, if persisted;
- any deterministic consequence; and
- resulting CSV-backed state when it changed.

Do not record hypothetical stages that did not run.

## Implementation rule

Implement the smallest communication path required by the next concrete game interaction.

Do not freeze a universal dialogue packet, event schema, stage sequence, retry policy, or model-call count before real execution proves it necessary.

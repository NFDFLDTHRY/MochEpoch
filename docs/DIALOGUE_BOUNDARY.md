# Dialogue and model boundary

This document defines how MochEpoch handles natural-language communication without inventing a separate dialogue architecture.

Read `docs/GAME_BLUEPRINT.md` and `docs/MODEL_ROLE.md` first.

## Dialogue is just another actor-mediated operation

Dialogue uses the same lifecycle as every other actor-mediated game operation:

```text
CSV-backed world
        ↓
Witness resolves the scoped CSV and constructs one JSON packet when Granite is needed
        ↓
Granite only when fuzzy generation/mapping is required
        ↓
raw JSON return
        ↓
deterministic parse / map / resolve or REJECT
        ↓
CSV-backed communication fact/history only when later game behavior needs it
        ↓
next world operation
```

There is no separate conversation engine.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or any other fixed dialogue stage graph.

Start with the smallest mapping that can complete the real interaction. If one Granite call is enough, use one. Add another call only when an executed communication case proves the additional transformation is necessary.

If that later call requires game-specific CSV-backed configuration, add only the minimum reference required by that proven case. Do not prebuild routing fields, a dialogue graph, or a universal multi-call protocol.

## Witness in dialogue

Witness has the same job here that it has everywhere else: retrieve only the scoped CSV-backed state/configuration needed for the current call and construct the transient JSON packet Granite receives.

Witness does not interpret the utterance, decide what it means, inspect Granite output, or write dialogue history.

There is no separate Resolver subsystem. CSV reference resolution is part of constructing the scoped packet.

The packet fields are not fixed before a real call proves they are needed.

## What the return edge cares about

The deterministic return edge does not judge whether a human or NPC is sensible, truthful, polite, moral, cooperative, consistent, or strategically competent.

It asks only whether the returned representation can map back into the current CSV-described game possibilities required by this operation.

A human or NPC may lie, misunderstand, contradict earlier speech, threaten, bargain, insult, cooperate, refuse, speak ambiguously, or say something foolish.

That variation is the game.

Language cannot create authoritative ontology merely by mentioning it. If the bounded world contains nothing corresponding to a spaceship, mentioning a spaceship does not create one.

A false statement about an existing stone can still be valid speech. Recording that the statement occurred does not make the statement objectively true.

## Speech as factual history

Communication does not automatically create a permanent history record.

When later implemented behavior needs to know that an utterance occurred, that occurrence needs CSV-backed factual/attributed history.

For example:

```text
Ada said: "I already gave you the stone."
```

may be a true game fact while authoritative object state still says Ada holds the stone.

The proposition inside the utterance remains attributed speech, not objective world truth.

The exact CSV representation and retention policy for speech, hearing, interpretation, or communication history are not fixed in advance. They must fall out of actual game interactions.

## Human → NPC

Human language enters as external data.

The smallest valid shape is:

```text
recipient-relevant CSV world + human utterance
        ↓
Witness packet when Granite is needed
        ↓
Granite mapping only if fuzzy language mapping is required
        ↓
raw JSON
        ↓
deterministic map / REJECT
        ↓
CSV-backed result/history only when the operation requires persistence
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
deliver the actual utterance to the human
        ↓
CSV-backed speech history only if later game behavior needs it
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
deliver actual utterance Y
        ↓
NPC B relevant CSV world + Y
        ↓
Witness packet only when B needs a Granite mapping
        ↓
Granite maps/evaluates Y only as required by B's current operation
        ↓
deterministic map/resolve
        ↓
CSV-backed result/history only when later game behavior needs it
```

If later operations need to know that A said Y, store that occurrence in CSV-backed factual history. Do not require that write merely as a transport step between A and B unless the implemented operation needs persistence at that point.

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
2. JSON is transient operational material unless the game explicitly writes a durable result into CSV-backed state.
3. Witness is only the scoped CSV → JSON Granite-call constructor.
4. Granite is only a bounded JSON → JSON transformation function.
5. The return edge is deterministic mapping/resolution, not another model-owned authority.
6. Human and NPC language may remain chaotic.
7. Communication history is persisted only when later implemented behavior needs it.
8. Recording `A said Y` does not make the proposition inside `Y` objectively true.
9. NPC-to-NPC communication crosses the actual utterance, not hidden sender structure.
10. No fixed dialogue stage graph is part of the architecture.
11. Additional Granite calls, retries, checks, or correction passes may be added only when execution demonstrates a concrete need.
12. A later call does not imply a universal routing schema. Add only the minimum CSV-backed reference a proven operation needs.
13. Do not build a general chatbot, agent loop, dialogue manager, semantic world model, or social simulation layer.

## Evidence rule

For a communication test, preserve only what is needed to inspect the actual executed path:

- relevant authoritative CSV-backed input;
- the Witness packet actually sent to Granite;
- the raw Granite return/error actually produced;
- the deterministic map/resolve result;
- the utterance that actually crossed between actors;
- any CSV-backed communication fact/history actually persisted;
- any deterministic consequence; and
- resulting CSV-backed state when it changed.

Do not record hypothetical stages, routing edges, or history writes that did not run.

## Implementation rule

Implement the smallest communication path required by the next concrete game interaction.

Do not freeze a universal dialogue packet, event schema, stage sequence, retry policy, model-call count, or call-routing schema before real execution proves it necessary.

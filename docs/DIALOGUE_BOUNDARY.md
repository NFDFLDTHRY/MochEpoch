# Dialogue and model boundary

This document defines how MochEpoch handles natural-language communication without inventing a separate dialogue architecture.

Read `docs/GAME_BLUEPRINT.md` and `docs/MODEL_ROLE.md` first.

## Dialogue is an actor-mediated game operation

Dialogue uses the same lifecycle as every other actor-mediated operation:

```text
CSV-backed world
        ↓
resolve only the relevant world / actor / function configuration
        ↓
bounded JSON
        ↓
NPC or HUMAN produces language
        ↓
JSON mapping / result where Granite is required
        ↓
validate / map against CSV-defined possibilities
        ↓
write the accepted communication event/result to CSV-backed state
        ↓
next world operation
```

There is no separate conversation engine.

There is no mandatory `INTAKE → CHECK → COMMIT` pipeline.

There is no mandatory `COMPOSE → CHECK → EMIT` pipeline.

Those named multi-stage sequences were speculative machinery introduced before a real Granite communication loop existed. They are not architectural requirements.

Start with the smallest mapping that can complete the real operation. If one Granite transformation is sufficient, use one. Add another transformation only when an executed communication case proves that the additional step is required. Any such routing belongs in CSV-backed function configuration rather than in a hard-coded dialogue subsystem.

## Granite-call primitive

Whenever a communication operation actually uses Granite, the model call still has the same generic boundary:

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
bounded result or REJECT
```

Resolver projects only the data permitted for that call.

Granite performs one requested JSON → JSON transformation.

Witness checks the raw return against the operation's deterministic schema/reference/scope bounds. Witness does not decide physical consequences and does not create world ontology.

If an executed communication operation later requires multiple Granite calls, each call repeats this same primitive. Intermediate JSON remains transient unless explicitly written into CSV-backed game state.

## What the boundary actually cares about

The harness does not care whether the human or NPC is sensible, truthful, polite, moral, cooperative, consistent, or strategically competent.

The only relevant question is whether the resulting behavior can map back into the world represented by the supplied CSV-backed possibilities.

A human or NPC may lie, misunderstand, contradict earlier speech, threaten, bargain, insult, cooperate, refuse, speak ambiguously, or say something foolish.

That behavioral variation is the game.

Language cannot create authoritative ontology merely by mentioning it. If the current bounded world contains no machinery corresponding to a spaceship, mentioning a spaceship does not create one.

A false statement about an existing stone can still be a valid speech event because the statement uses world-grounded concepts. Recording the speech event does not make the statement objectively true.

## Speech as factual history

When communication actually occurs in the game, the occurrence itself may need to survive as factual/attributed CSV-backed history.

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
Granite mapping only if fuzzy language mapping is required
        ↓
bounded game representation / REJECT
        ↓
CSV-backed communication event/result
```

Do not add extra interpretation/check/commit calls unless a real run demonstrates that one mapping cannot perform the required operation reliably enough for the game.

## NPC → Human

The smallest valid shape is:

```text
speaker-relevant CSV world
        ↓
Granite generates the NPC utterance
        ↓
validate/map the result against the bounded operation
        ↓
CSV-backed speech event
        ↓
deliver the actual utterance to the human
```

Do not add a compose/check/emit stack merely to normalize or improve what the NPC says.

## NPC → NPC

NPC-to-NPC communication is two ordinary actor boundaries connected by the actual utterance.

```text
NPC A relevant CSV world
        ↓
Granite generates utterance Y
        ↓
Y maps back to CSV-backed speech event
        ↓
deliver actual utterance Y
        ↓
NPC B relevant CSV world + Y
        ↓
Granite maps/evaluates Y only as required by B's next operation
        ↓
B's accepted result maps back to CSV-backed state
```

Never pass a hidden sender-side structured candidate directly to the recipient in place of the utterance that actually crossed the world.

The sender's generated expression and the recipient's mapped result may differ. Do not automatically repair that mismatch.

## Dialogue and physical consequence

Speech and action are both actor expressions crossing the same world boundary.

A mapped action may still fail mechanically.

Example:

```text
hand_over(stone)
```

may map correctly because the action and object exist in the bounded game world. Deterministic mechanics then read current CSV-backed facts and decide whether anything physically happens.

Dialogue machinery must not become a physics engine, truth engine, social-state engine, or behavior corrector.

## Invariants

1. CSV-backed state is the only authoritative continuing game state/history/configuration.
2. JSON is transient operational material unless explicitly admitted into CSV-backed state.
3. Human and NPC language may remain chaotic.
4. Granite is a bounded transformation function, not a character or conversation owner.
5. Every raw Granite return is untrusted until deterministically bounded by the current operation.
6. Communication that must affect later operations must map back into CSV-backed factual/attributed state.
7. Recording `A said Y` does not make the proposition inside `Y` objectively true.
8. NPC-to-NPC communication crosses the actual utterance, not hidden sender structure.
9. No fixed dialogue stage graph is part of the architecture.
10. Additional Granite calls, retries, checks, or correction passes may be added only when execution demonstrates a concrete need, and their routing belongs in CSV-backed function configuration.
11. Do not build a general chatbot, agent loop, dialogue manager, semantic world model, or social simulation layer.

## Evidence rule

For a communication test, preserve only what is needed to inspect the actual executed path:

- relevant authoritative CSV-backed input;
- each Resolver packet actually used;
- each raw Granite return/error actually produced;
- each Witness acceptance/rejection actually performed;
- the utterance that actually crossed between actors;
- the CSV-backed communication event/result;
- any deterministic consequence; and
- resulting CSV-backed state when it changed.

Do not record hypothetical stages that did not run.

## Implementation rule

Implement the smallest communication path required by the next concrete game interaction.

Do not freeze a universal dialogue packet, event schema, stage sequence, retry policy, or model-call count before real execution proves it necessary.

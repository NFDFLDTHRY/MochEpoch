# Dialogue and model trust boundary

This document defines how MochEpoch moves information between authoritative CSV-backed game state, human language, Granite, and deterministic game execution.

## One invariant primitive

Every model stage uses exactly the same primitive:

```text
CSV-bounded trusted state
        ↓
Resolver
CSV → bounded JSON parameters
        ↓
Granite(stage)
JSON → JSON
        ↓
untrusted JSON result
        ↓
Witness
JSON → CSV-bounded trusted result or REJECT
```

A dialogue operation is a sequence of these primitives. The components do not change jobs between stages.

- **Resolver does one thing:** project the CSV-bounded trusted state needed for the current stage into a bounded JSON packet.
- **Granite does one thing:** transform the supplied bounded JSON packet into one untrusted JSON return.
- **Witness does one thing:** verify that return against the stage schema, allowed values/references/scope, then produce the corresponding CSV-bounded trusted result or reject it.

There is no PRECHECK Witness, FINAL Witness, hidden transaction authority, second world model, or special model-side state. Each stage ends at Witness. The next stage begins again from CSV-bounded state through Resolver.

`trusted` means legal for that stage's CSV representation. It does not mean a proposition is true, that dialogue is final, or that a world consequence has happened.

Granite calls are independent. Call-local model state is discarded at the end of each call. Anything needed by a later call must be present in CSV-bounded state and supplied again by Resolver.

## Bounded transformation rule

Each Granite stage is one transformation from a game-defined bounded population of possibilities.

The Resolver packet defines the allowed population for that stage: entities, objects, systems, properties, actions, references, output choices, and any current utterance or candidate text needed by the operation. Granite does not enlarge that population.

Witness checks only deterministic structure: schema, types, enums, references, identities, scope, and other game-defined allowed values. Witness does not interpret the meaning of free-form language.

Natural-language correspondence is therefore a separate Granite transformation: `CHECK`.

## Checker contract

`Granite.CHECK` is mandatory anywhere human- or Granite-produced language could influence later dialogue or game processing.

Checker receives the utterance/candidate language and the corresponding bounded JSON context. Its narrow question is:

> Is this language coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by this packet?

Checker must reject discourse whose content has no match in the supplied packet. If the packet contains Ada, player, room, and stone, a false statement about the stone may still be valid dialogue. An automotive-engine discussion is not valid unless corresponding automotive concepts are represented in the packet.

Checker does **not** decide objective truth. It does not require two NPCs to understand one another identically. It does not see hidden state from both sides merely to force agreement.

Checker is still just Granite:

```text
CSV-bounded stage state
        ↓
Resolver
utterance + corresponding bounded context → JSON
        ↓
Granite.CHECK
        ↓
untrusted checked JSON
        ↓
Witness
        ↓
CSV-bounded checked result or REJECT
```

Witness does not reproduce Checker's semantic job. It only verifies that Checker's return is one of the legal structured results for that stage.

## Human → NPC

Human language enters through three ordinary transformations:

```text
1. INTAKE

human utterance + recipient CSV context
        ↓
Resolver
        ↓
Granite.INTAKE
        ↓
Witness
        ↓
CSV-bounded interpretation

2. CHECK

utterance + interpretation + recipient-bounded state
        ↓
Resolver
        ↓
Granite.CHECK
        ↓
Witness
        ↓
CSV-bounded checked interpretation

3. COMMIT

checked interpretation + game-valid possibilities
        ↓
Resolver
        ↓
Granite.COMMIT
        ↓
Witness
        ↓
CSV-bounded structured return
```

`COMMIT` does not directly mutate arbitrary world state. It produces the bounded structured result that deterministic game machinery may act on according to current CSV-backed rules and preconditions.

## NPC → Human

NPC language leaving the structured game uses the same primitive in the other semantic direction:

```text
1. COMPOSE

NPC CSV communicative state + allowed context
        ↓
Resolver
        ↓
Granite.COMPOSE
        ↓
Witness
        ↓
CSV-bounded candidate utterance

2. CHECK

candidate utterance + corresponding speaker-bounded state
        ↓
Resolver
        ↓
Granite.CHECK
        ↓
Witness
        ↓
CSV-bounded checked utterance

3. EMIT

checked utterance + allowed output possibilities
        ↓
Resolver
        ↓
Granite.EMIT
        ↓
Witness
        ↓
CSV-bounded final utterance/result
        ↓
deterministic delivery to human
```

The human receives only the result that has completed the sender-side `CHECK` and `EMIT` transformations.

## NPC → NPC

NPC-to-NPC communication is the sender path followed by the recipient path. The receiver never receives the sender's hidden structured intention.

```text
NPC A CSV communicative state
        ↓
COMPOSE: Resolver → Granite → Witness
        ↓
CHECK:   Resolver → Granite → Witness
        ↓
EMIT:    Resolver → Granite → Witness
        ↓
deterministic delivery of actual utterance Y
        ↓
NPC B receives Y
        ↓
INTAKE:  Resolver → Granite → Witness
        ↓
CHECK:   Resolver → Granite → Witness
        ↓
COMMIT:  Resolver → Granite → Witness
        ↓
NPC B CSV-bounded structured result
```

This deliberately permits:

```text
NPC A intended X
      ↓
said Y
      ↓
NPC B interpreted Z
```

`X` and `Z` may differ. Each side is bounded only by the state available to that side and the actual utterance crossing between them.

## Dialogue invariants

1. CSV remains the only game backing state.
2. Resolver, Granite, and Witness retain the same single responsibility at every stage.
3. Every Granite call is independent and reset at call end with respect to game truth.
4. Human input is data, not authority over schema, identity, scope, or world state.
5. Every Granite return is untrusted until Witness converts or rejects it.
6. Checker is mandatory for human-originated and Granite-originated language before that language can drive the next semantic/game stage.
7. Checker tests matchability to the corresponding bounded packet, not objective truth.
8. Falsehood, ambiguity, imprecision, deception, and misunderstanding are permitted when the utterance remains matchable to the bounded context.
9. Ungrounded subject matter is rejected. Human or Granite language cannot introduce a new game ontology merely by mentioning it.
10. NPC-to-NPC communication crosses the actual emitted utterance. Hidden sender structure is never handed directly to the recipient.
11. Any history or result needed later must survive as CSV-bounded state. Hidden model memory is never continuity.
12. No Granite stage directly performs UI delivery or arbitrary world mutation. Deterministic game machinery consumes the final CSV-bounded result.
13. Retry behavior, if later required, must be explicit and finite in deterministic game code.
14. Do not replace these repeated small transformations with a general chatbot, agent loop, semantic engine, or orchestration subsystem.

## Implementation rule

Implement only the next concrete transformation required by the current fixture. For each stage, define the smallest bounded JSON input population and output schema needed to prove that transformation.

Evidence for a stage records the Resolver packet, raw Granite return/error, Witness result/rejection, and resulting CSV-bounded state. Report only what the executed stage establishes.

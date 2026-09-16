# Dialogue and model trust boundary

This document defines how MochEpoch moves information between authoritative CSV-backed game state, human language, Granite, and deterministic game execution.

## One invariant primitive

Resolver, Granite, and Witness keep the same single responsibility everywhere. A dialogue path chains three bounded transformations, but **trust is an end-to-end property of the completed pipeline, not a property granted after every Witness**.

The trust shape is:

```text
TRUSTED CSV INPUT
        ↓
Resolver
CSV-bounded state → bounded JSON parameters
        ↓
Granite(stage 1)
JSON → JSON
        ↓
UNTRUSTED JSON
        ↓
Witness
JSON → CSV-bounded intermediate or REJECT
        ↓
CSV-BOUNDED INTERMEDIATE — STILL UNTRUSTED
        ↓
Resolver
        ↓
Granite(stage 2)
        ↓
UNTRUSTED JSON
        ↓
Witness
        ↓
CSV-BOUNDED INTERMEDIATE — STILL UNTRUSTED
        ↓
Resolver
        ↓
Granite(stage 3)
        ↓
UNTRUSTED JSON
        ↓
Witness
        ↓
FINAL CSV-BOUNDED RESULT
        ↓
TRUSTED
```

`CSV-bounded` and `trusted` are not synonyms. CSV-bounded means the result has been constrained to the representation and legal population allowed for that transformation. Intermediate Witness results remain untrusted because the dialogue pipeline has not completed.

There are no PRECHECK/FINAL Witness implementations and no Witness modes. The same Witness operation is used after every Granite call. Only the pipeline position differs: the first two Witness results are bounded intermediates; the result of the third successful transformation is the final result eligible to become trusted CSV-backed game structure.

The components do not change jobs:

- **Resolver does one thing:** project the CSV-bounded input available to the current transformation into its bounded JSON packet. That input may be the initial trusted CSV state or a prior CSV-bounded untrusted intermediate.
- **Granite does one thing:** transform the supplied bounded JSON packet into one untrusted JSON return.
- **Witness does one thing:** verify the Granite return against that transformation's schema, allowed values/references/scope, then convert it into the corresponding CSV-bounded result or reject it.

Witness does not itself promote an intermediate result to trust. The completed three-transformation pipeline is what returns from trusted CSV through untrusted model work back to trusted CSV.

Granite calls are independent. Call-local model state is discarded at the end of each call. Anything needed by the next transformation must be represented in the CSV-bounded intermediate supplied to the next Resolver.

## Bounded transformation rule

Each Granite call is one transformation from a game-defined bounded population of possibilities.

The Resolver packet defines the allowed population for that transformation: entities, objects, systems, properties, actions, references, output choices, and any current utterance or candidate text needed by that transformation. Granite does not enlarge that population.

Witness checks deterministic structure: schema, types, enums, references, identities, scope, and other game-defined allowed values. Witness does not perform the semantic language judgment assigned to Checker.

Natural-language correspondence is its own Granite transformation: `CHECK`.

## Checker contract

`Granite.CHECK` is mandatory anywhere human- or Granite-produced language could influence the final dialogue/game result.

Checker receives the utterance or candidate language and the corresponding bounded JSON packet. Its narrow question is:

> Is this language coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by this packet?

Checker must reject discourse whose content has no match in the supplied packet. If the packet contains Ada, player, room, and stone, a false statement about the stone may still be valid dialogue. An automotive-engine discussion is not valid unless corresponding automotive concepts are represented in the packet.

Checker does **not** decide objective truth. It does not require two NPCs to understand one another identically. It does not see hidden state from both sides merely to force agreement.

Checker is still just Granite:

```text
CSV-bounded untrusted intermediate
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
CSV-bounded checked intermediate or REJECT
        ↓
STILL UNTRUSTED
```

Witness does not reproduce Checker's semantic job. It only verifies that Checker's structured return is legal for the CHECK transformation.

## Human → NPC

Human language enters through three ordinary transformations:

```text
TRUSTED CSV + external human utterance

1. INTAKE
human utterance + recipient CSV context
        ↓
Resolver → Granite.INTAKE → Witness
        ↓
CSV-bounded interpretation
STILL UNTRUSTED

2. CHECK
utterance + interpretation + recipient-bounded state
        ↓
Resolver → Granite.CHECK → Witness
        ↓
CSV-bounded checked interpretation
STILL UNTRUSTED

3. COMMIT
checked interpretation + game-valid possibilities
        ↓
Resolver → Granite.COMMIT → Witness
        ↓
FINAL CSV-bounded structured return
        ↓
TRUSTED
```

`COMMIT` does not directly mutate arbitrary world state. It produces the final bounded structured result that deterministic game machinery may act on according to current CSV-backed rules and preconditions.

## NPC → Human

NPC language leaving the structured game uses the same trust path in the other semantic direction:

```text
TRUSTED NPC CSV communicative state

1. COMPOSE
NPC CSV communicative state + allowed context
        ↓
Resolver → Granite.COMPOSE → Witness
        ↓
CSV-bounded candidate utterance
STILL UNTRUSTED

2. CHECK
candidate utterance + corresponding speaker-bounded state
        ↓
Resolver → Granite.CHECK → Witness
        ↓
CSV-bounded checked utterance
STILL UNTRUSTED

3. EMIT
checked utterance + allowed output possibilities
        ↓
Resolver → Granite.EMIT → Witness
        ↓
FINAL CSV-bounded utterance/result
        ↓
TRUSTED
        ↓
deterministic delivery to human
```

The human receives only the result that has completed `COMPOSE → CHECK → EMIT`.

## NPC → NPC

NPC-to-NPC communication is the sender pipeline followed by the recipient pipeline. The receiver never receives the sender's hidden structured intention.

```text
NPC A TRUSTED CSV communicative state
        ↓
COMPOSE → CSV-bounded untrusted intermediate
        ↓
CHECK   → CSV-bounded untrusted intermediate
        ↓
EMIT    → FINAL TRUSTED CSV-bounded utterance
        ↓
deterministic delivery of actual utterance Y
        ↓
NPC B receives Y as external language input
        ↓
INTAKE  → CSV-bounded untrusted intermediate
        ↓
CHECK   → CSV-bounded untrusted intermediate
        ↓
COMMIT  → FINAL TRUSTED CSV-bounded structured result
```

Every named transformation above is independently:

```text
Resolver → Granite(stage) → Witness
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

1. CSV remains the only authoritative game backing state.
2. Resolver, Granite, and Witness retain the same single responsibility at every transformation.
3. `CSV-bounded` does not mean `trusted`.
4. The first two Witness outputs in a three-transformation dialogue pipeline are bounded but remain untrusted.
5. Only the successful final `COMMIT` or `EMIT` result returns the pipeline to trusted CSV-bounded structure.
6. Every Granite call is independent and reset at call end with respect to game truth.
7. Human input is external data, not authority over schema, identity, scope, or world state.
8. Every Granite return is untrusted.
9. Checker is mandatory for human-originated and Granite-originated language before that language can drive the final transformation.
10. Checker tests matchability to the corresponding bounded packet, not objective truth.
11. Falsehood, ambiguity, imprecision, deception, and misunderstanding are permitted when the utterance remains matchable to the bounded context.
12. Ungrounded subject matter must not reach the final trusted result. Human or Granite language cannot introduce a new game ontology merely by mentioning it.
13. NPC-to-NPC communication crosses the actual emitted utterance. Hidden sender structure is never handed directly to the recipient.
14. No Granite transformation directly performs UI delivery or arbitrary world mutation. Deterministic game machinery consumes only the final trusted CSV-bounded result.
15. Retry behavior, if later required, must be explicit and finite in deterministic game code.
16. Do not replace these repeated small transformations with a general chatbot, agent loop, semantic engine, or orchestration subsystem.

## Implementation rule

Implement only the next concrete transformation required by the current fixture. For each transformation, define the smallest bounded JSON input population and output schema needed to prove it.

Evidence must preserve trust state as well as shape: record the Resolver packet, raw Granite return/error, Witness result/rejection, whether the result is an untrusted intermediate or the final trusted pipeline result, and the resulting CSV-bounded representation. Report only what execution establishes.

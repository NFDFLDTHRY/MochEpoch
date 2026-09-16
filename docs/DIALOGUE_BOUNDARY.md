# Dialogue and model trust boundary

This document defines how MochEpoch moves natural-language communication between authoritative CSV-backed world state, humans, NPCs, Granite, and deterministic game execution.

Read `docs/GAME_BLUEPRINT.md` and `docs/MODEL_ROLE.md` first.

## Why the communication boundary exists

The communication pipeline is not designed to make actors sensible, truthful, moral, polite, cooperative, or mutually consistent.

It exists to answer a narrower question:

> Does this action/dialogue expression map coherently to the possibilities represented by the current CSV-described world?

Human and NPC language is allowed to be chaotic.

The boundary prevents that chaos from silently creating unsupported game ontology or bypassing deterministic world mechanics.

## One invariant Granite-call primitive

Every model transformation uses:

```text
CSV-backed world / bounded transient input
        ↓
Resolver
        ↓
bounded JSON parameters
        ↓
Granite(stage)
        ↓
untrusted JSON result
        ↓
Witness
        ↓
bounded transient result or REJECT
```

The components never change jobs:

- **Resolver** projects only the CSV-backed facts and bounded transient inputs permitted for the current transformation into JSON.
- **Granite** performs one requested JSON → JSON transformation.
- **Witness** deterministically validates one raw Granite return against the transformation's schema, allowed values/references, identity, scope, and other game-defined bounds.

Witness does not perform Granite `CHECK`'s semantic language job and does not execute game consequences.

## CSV-bounded versus CSV-backed

Communication uses bounded transient intermediates.

```text
CSV-bounded
= constrained by possibilities derived from trusted CSV

CSV-backed
= authoritative continuing state/configuration represented in CSV
```

A Witness-accepted intermediate may be legal input to the next dialogue transformation without becoming authoritative game state.

Only an explicit accepted CSV-backed write changes continuing world truth.

This is the trust shape for a three-stage communication path:

```text
AUTHORITATIVE CSV-BACKED INPUT
        ↓
transformation 1
        ↓
bounded transient intermediate
        ↓
transformation 2
        ↓
bounded transient intermediate
        ↓
transformation 3
        ↓
final accepted bounded result
        ↓
WRITE ATTRIBUTED RESULT / EVENT TO CSV-BACKED STATE
        ↓
TRUSTED GAME EVENT / STATE
        ↓
delivery or deterministic consequence as applicable
```

Do not create PRECHECK/FINAL Witness implementations or special Witness modes. The same Witness operation follows every Granite call.

The trust return occurs when the completed bounded result is admitted into authoritative CSV-backed state, not merely because an intermediate passed Witness.

## Speech as fact, speech content as attribution

When an accepted utterance occurs in the game, the fact that it was spoken/heard/interpreted is game history and returns through the harness into CSV-backed state.

That does **not** make the proposition inside the utterance objectively true.

For example, the game may authoritatively store the factual event:

```text
Ada said: "I already gave you the stone."
```

while the current object state still authoritatively says Ada holds the stone.

The attributed speech event is true as an event. The claim inside it may be false.

Exact CSV schemas for speech, hearing, interpretation, or event history are intentionally not fixed yet. The invariant is that completed communication which occurs in the game maps back to CSV-backed factual/attributed state rather than living only in model context or transient JSON.

## Bounded transformation rule

Each Granite call receives only the game-defined bounded population needed for that transformation.

Depending on the operation, Resolver may expose relevant:

- actors;
- objects/resources/structures;
- properties/relations;
- actions/behaviors;
- factual state;
- grounded dialogue concepts;
- allowed references/output choices;
- current utterance/candidate text.

Granite does not enlarge authoritative world ontology.

Witness checks deterministic structure and allowed population membership.

Natural-language correspondence is a separate Granite transformation: `CHECK`.

## CHECK contract

`Granite.CHECK` is mandatory wherever human- or Granite-produced natural language could influence the final semantic/game result.

CHECK receives the utterance/candidate language and its corresponding bounded packet.

Its narrow question is:

> Is this language coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by this packet?

CHECK does not decide objective truth.

If the packet contains Ada, the player, a room, and a stone, a false statement about the stone may still be valid dialogue.

Automotive-engine discourse is invalid when nothing in the packet corresponds to automotive machinery.

Lies, mistakes, ambiguity, deception, contradiction, and misunderstanding are allowed when the language remains grounded in the supplied possibilities.

CHECK is local to the side being checked. Do not provide both parties' hidden state merely to force agreement.

Witness validates CHECK's structured return. Witness does not reproduce the semantic CHECK task.

## Human → NPC

Human language enters as external untrusted data.

```text
AUTHORITATIVE RECIPIENT CSV-BACKED STATE
        +
external human utterance

1. INTAKE
utterance + recipient-bounded world
        ↓
Resolver → Granite.INTAKE → Witness
        ↓
bounded transient interpretation

2. CHECK
utterance + interpretation + recipient-bounded world
        ↓
Resolver → Granite.CHECK → Witness
        ↓
bounded transient checked interpretation

3. COMMIT
checked interpretation + game-valid possibilities
        ↓
Resolver → Granite.COMMIT → Witness
        ↓
final accepted bounded structured result
        ↓
write accepted attributed utterance / recipient result to CSV-backed state
```

`COMMIT` does not directly mutate arbitrary physical world state.

The completed communication returns to CSV-backed game history/state first. If the committed result expresses or causes a game action, deterministic mechanics then evaluate current CSV-backed physical preconditions and compute any permitted physical consequence, which also returns to CSV.

## NPC → Human

NPC language leaving the game uses the same bounded transformation primitive in the other semantic direction.

```text
AUTHORITATIVE NPC CSV-BACKED STATE

1. COMPOSE
NPC-bounded state + allowed context
        ↓
Resolver → Granite.COMPOSE → Witness
        ↓
bounded transient candidate utterance

2. CHECK
candidate utterance + speaker-bounded world
        ↓
Resolver → Granite.CHECK → Witness
        ↓
bounded transient checked utterance

3. EMIT
checked utterance + allowed output population
        ↓
Resolver → Granite.EMIT → Witness
        ↓
final accepted emitted utterance/result
        ↓
write attributed speech event to CSV-backed state
        ↓
deterministic delivery to human
```

The emitted utterance is allowed to be false, strange, rude, contradictory, inefficient, manipulative, mistaken, or otherwise unexpected as long as it remains coherently grounded in the bounded speaker-side world.

The fact that the utterance occurred is authoritative as an attributed CSV-backed event. The semantic claim inside the utterance is not thereby promoted to objective world truth.

## NPC → NPC

NPC-to-NPC communication is the sender pipeline followed by the recipient pipeline.

Only the actual emitted utterance crosses between them.

```text
NPC A AUTHORITATIVE CSV-BACKED STATE
        ↓
COMPOSE
        ↓
bounded transient candidate
        ↓
CHECK
        ↓
bounded transient checked candidate
        ↓
EMIT
        ↓
final utterance Y
        ↓
write A-said-Y attributed event to CSV-backed state
        ↓
deterministic delivery of Y
        ↓
NPC B receives Y as external language input
        ↓
INTAKE
        ↓
bounded transient interpretation
        ↓
CHECK
        ↓
bounded transient checked interpretation
        ↓
COMMIT
        ↓
final accepted bounded result Z for B
        ↓
write B-heard/interpreted-Z attributed result/event to CSV-backed state
```

Never give the recipient the sender's hidden candidate/structured representation.

Preserve:

```text
NPC A candidate expression X
      ↓
said Y
      ↓
NPC B interpreted Z
```

`X` and `Z` may differ.

That mismatch is valid experimental behavior, not something the harness should automatically repair.

## Action/dialogue boundary

The same world-bounding principle applies to both actions and natural language.

An actor may express a game-defined action that later fails mechanically.

Example:

```text
expressed action: hand_over(stone)
```

The expression may map correctly because `hand_over` and `stone` exist in the bounded world.

The accepted actor expression can return to CSV as an attributed action/event. Deterministic mechanics then check the actual current CSV-backed state. If the actor no longer holds the stone, the physical hand-over fails according to the implemented mechanic, and that resulting factual state/event is likewise CSV-backed if durable.

Do not make CHECK or Witness into a physical consequence engine.

## Human/NPC freedom

Do not add dialogue machinery whose purpose is to suppress behavioral chaos.

The human or NPC may:

- lie;
- make a bad request;
- misunderstand;
- contradict earlier speech;
- insult someone;
- refuse;
- cooperate;
- threaten;
- bargain;
- communicate poorly;
- speak ambiguously;
- attempt something mechanically impossible.

The communication boundary cares about mapping to the represented world, not designer approval of behavior.

## Dialogue invariants

1. CSV-backed state remains the only authoritative continuing game state/history.
2. JSON and dialogue-stage intermediates are transient operational structure.
3. Resolver, Granite, and Witness keep the same single responsibility at every transformation.
4. Every raw Granite return is untrusted.
5. Witness constrains structure/population membership but does not automatically create authoritative world state.
6. Human input is external data, not authority over schema, scope, identity, or world state.
7. CHECK is mandatory wherever natural language can influence the final semantic/game result.
8. CHECK tests coherent matchability to the supplied bounded packet, not objective truth.
9. Falsehood, ambiguity, imprecision, deception, contradiction, and misunderstanding are permitted when grounded.
10. Ungrounded subject matter cannot create authoritative game ontology by mention alone.
11. NPC-to-NPC communication crosses the actual emitted utterance, never hidden sender structure.
12. A completed communication that occurs in the game returns to CSV-backed factual/attributed state.
13. Recording `A said Y` does not make the proposition expressed by `Y` objectively true.
14. Deterministic game code decides physical consequences from current CSV-backed facts.
15. Retry/correction behavior, if later required, must be explicit, deterministic, finite, and justified by an observed failure.
16. Do not replace these small transformations with a general chatbot, agent loop, semantic world model, or orchestration subsystem.

## Evidence rule

For a communication test, save enough to inspect what actually happened:

- relevant authoritative CSV-backed input;
- Resolver packet for each tested transformation;
- raw Granite return/error;
- Witness result/rejection;
- actual utterance that crossed between speakers;
- final accepted bounded result;
- CSV-backed attributed communication event/result;
- deterministic consequence if any; and
- resulting CSV-backed physical state if it changed.

Report what the run established. Do not infer social meaning that the run did not encode or demonstrate.

## Implementation rule

Implement only the next concrete communication transformation required by the current executable operation.

Do not freeze a universal dialogue/event packet schema before the real Granite interface and real game interactions prove what fields are necessary.

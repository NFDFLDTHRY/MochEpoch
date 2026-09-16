# Granite role and experimental framing

This document records the operational framing that must be preserved while building MochEpoch. It does not state the experiment's hidden hypothesis or predicted result.

## Structural model role

MochEpoch does not treat Granite as an intelligent agent, NPC brain, world model, authority, or source of meaning.

For this project, Granite is used exactly like another game function:

```text
parameters → Granite → return value
```

Each invocation performs one bounded JSON → JSON transformation. Granite does not own the character, the world, or the conversation.

Language is treated operationally as structure. Do not invent a second hidden semantic world merely to explain language processing.

Do not replace this framing with generic "AI agent," "NPC brain," chatbot, model-as-reasoner, or model-as-world assumptions.

## One model-call primitive

Every Granite stage has exactly the same shape:

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

Resolver and Witness are deterministic game-side boundaries around one Granite call.

### Resolver

Resolver does one thing: it reads/resolves only the CSV-bounded state permitted for the current stage and constructs the bounded JSON parameters Granite may receive.

Resolver does not interpret model output, own game state, perform semantic checking, or mutate authoritative state.

### Granite

Granite does one thing: transform the supplied JSON packet into one JSON return.

Calls are independent and reset at call end with respect to game truth. Granite has no direct CSV access, no hidden world authority, no permission to choose its own scope, and no game-relevant memory carried automatically into the next call.

Anything needed by a later call must survive in CSV-bounded state and be supplied again through Resolver.

Every Granite return is untrusted.

Stage names such as `INTAKE`, `CHECK`, `COMPOSE`, `COMMIT`, and `EMIT` describe the transformation requested from that call. They do not create agents or model-owned subsystems.

### Witness

Witness does one thing: deterministically validate one raw Granite return against that stage's schema, allowed values/references, identity, scope, and authority, then produce the corresponding CSV-bounded result or reject it.

Witness does not perform the semantic language judgment assigned to `Granite.CHECK`. It does not infer missing meaning, silently repair malformed output, invent world facts, or enlarge the allowed population.

A result becoming trusted after Witness means it is a legal CSV-bounded representation for that stage. It does not mean a spoken claim is true, that dialogue is final, or that a world consequence has happened.

There are no PRECHECK/FINAL Witness modes. Every stage simply ends at Witness, and any next stage begins again from CSV-bounded state through Resolver.

## Bounded transformation workload

Each Granite call receives a game-defined bounded population of possibilities and produces one structured return in the supplied output shape.

Field populations change according to the current CSV-bounded state, but Granite is not asked to invent a protocol or extend the game's ontology from call to call.

Natural language may be included as a field in a stage packet, but free-form language itself is never game authority.

## Dialogue transformations

Dialogue is a chain of independent model calls, not a conversation living inside Granite.

### Human → NPC

```text
INTAKE: Resolver → Granite → Witness
  ↓
CSV-bounded interpretation
  ↓
CHECK: Resolver → Granite → Witness
  ↓
CSV-bounded checked interpretation
  ↓
COMMIT: Resolver → Granite → Witness
  ↓
CSV-bounded structured return
```

`INTAKE` maps the human utterance into the operation's bounded possibilities. `CHECK` separately asks whether the utterance is coherently matchable to the corresponding bounded packet. `COMMIT` transforms the checked state into the bounded structured result available to deterministic game machinery.

### NPC → Human

```text
COMPOSE: Resolver → Granite → Witness
  ↓
CSV-bounded candidate utterance
  ↓
CHECK: Resolver → Granite → Witness
  ↓
CSV-bounded checked utterance
  ↓
EMIT: Resolver → Granite → Witness
  ↓
CSV-bounded final utterance/result
  ↓
deterministic delivery
```

`COMPOSE` proposes language from the NPC-side bounded state. `CHECK` separately asks whether that candidate language is coherently matchable to the corresponding speaker-side packet. `EMIT` transforms the checked state into the bounded result that may be delivered.

### NPC → NPC

NPC-to-NPC communication uses the sender path followed by the receiver path. The actual emitted utterance crosses between them. The recipient never receives the sender's hidden structured intent.

This permits:

```text
sender intended X → said Y → recipient interpreted Z
```

including `X ≠ Z`.

## Checker role

`Granite.CHECK` is mandatory wherever human- or Granite-produced language can influence a later semantic/game stage.

Checker's narrow question is whether the utterance/candidate language is coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by the supplied bounded packet.

Checker does not decide objective truth. A false statement about the stone can be valid if the packet contains the relevant stone/actors/state. Automotive-engine discourse is invalid when nothing in the packet corresponds to automotive machinery.

Checker is local to the side being checked. It must not receive both parties' private structures merely to force mutual understanding.

Checker's return is still untrusted and goes through ordinary Witness exactly like every other Granite return.

## JSON is operational, CSV is backing state

Granite input and output JSON packages are transient operational structures. They are not game state.

CSV is the durable backing state; JSON is temporary expression or transport for one transformation.

Any stage result that must be available to a later stage survives as CSV-bounded state after Witness. The next Resolver rebuilds the next JSON packet from that state.

Do not create model-owned state, JSON-owned state, or a second runtime world model around Granite.

See `docs/CSV_BACKING_STATE.md` for the hard state boundary and `docs/DIALOGUE_BOUNDARY.md` for dialogue sequencing.

## World and consequence boundary

Granite does not own world state, memory, motives, relationships, permissions, identities, or consequences.

Authoritative world state remains external, inspectable, and CSV-backed. Speaker, recipient, actor, operation identity, event identity, and permitted schemas/populations come from trusted game code/CSV rather than Granite.

A final witnessed game-action result may be consumed by deterministic game code. Deterministic code checks current CSV-backed preconditions and performs any allowed world mutation.

A final witnessed emitted utterance may be presented by deterministic delivery code.

## Preserve the experiment

Do not add semantic abstractions, hidden conversational memory, relationship scores, or model-centered interpretations of intelligence because they seem useful.

Do not let dialogue controls turn into a truth engine. Falsehood, imprecision, ambiguity, deception, and misunderstanding are permitted when language remains matchable to the bounded packet. Ungrounded subject matter must not drive later game processing.

The deeper hypothesis being tested by MochEpoch is intentionally unspecified here. Do not infer it, encode it, or optimize the implementation toward a presumed conclusion. Preserve the apparatus and let observed runs establish what emerges.

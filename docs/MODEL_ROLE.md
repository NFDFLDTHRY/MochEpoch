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

Every Granite transformation has exactly the same shape:

```text
CSV-bounded input
        ↓
Resolver
CSV-bounded input → bounded JSON parameters
        ↓
Granite(stage)
JSON → JSON
        ↓
untrusted JSON result
        ↓
Witness
JSON → CSV-bounded result or REJECT
```

Resolver and Witness are deterministic game-side boundaries around one Granite call.

### Resolver

Resolver does one thing: it reads/resolves the CSV-bounded input permitted for the current transformation and constructs the bounded JSON parameters Granite may receive.

The Resolver input may be the initial trusted CSV state or a prior CSV-bounded intermediate that is still untrusted within the dialogue pipeline.

Resolver does not interpret model output, own game state, perform semantic checking, grant trust, or mutate authoritative state.

### Granite

Granite does one thing: transform the supplied JSON packet into one JSON return.

Calls are independent and reset at call end with respect to game truth. Granite has no direct CSV access, no hidden world authority, no permission to choose its own scope, and no game-relevant memory carried automatically into the next call.

Every Granite return is untrusted.

Stage names such as `INTAKE`, `CHECK`, `COMPOSE`, `COMMIT`, and `EMIT` describe the transformation requested from that call. They do not create agents or model-owned subsystems.

### Witness

Witness does one thing: deterministically validate one raw Granite return against that transformation's schema, allowed values/references, identity, scope, and authority, then produce the corresponding CSV-bounded result or reject it.

Witness does not perform the semantic language judgment assigned to `Granite.CHECK`. It does not infer missing meaning, silently repair malformed output, invent world facts, enlarge the allowed population, or independently grant trust.

**CSV-bounded does not mean trusted.** In a three-transformation dialogue pipeline, Witness outputs from the first two transformations remain untrusted intermediates. The same Witness operation follows the third transformation; only after the complete pipeline succeeds is that final CSV-bounded result eligible to be trusted.

There are no PRECHECK/FINAL Witness modes. The Witness implementation does not change roles. Trust is a property of successful completion of the whole pipeline, not of an intermediate Witness return.

## End-to-end trust rule

Dialogue runs from trusted CSV through untrusted model transformations and back to trusted CSV:

```text
TRUSTED CSV INPUT
        ↓
transformation 1
        ↓
CSV-bounded UNTRUSTED intermediate
        ↓
transformation 2
        ↓
CSV-bounded UNTRUSTED intermediate
        ↓
transformation 3
        ↓
FINAL CSV-bounded result
        ↓
TRUSTED
```

This distinction is architectural. An intermediate result may be structurally legal for the next transformation while still being untrusted as a dialogue/game result.

## Bounded transformation workload

Each Granite call receives a game-defined bounded population of possibilities and produces one structured return in the supplied output shape.

Field populations change according to the current CSV-bounded input, but Granite is not asked to invent a protocol or extend the game's ontology from call to call.

Natural language may be included as a field in a transformation packet, but free-form language itself is never game authority.

## Dialogue transformations

Dialogue is a chain of independent model calls, not a conversation living inside Granite.

### Human → NPC

```text
TRUSTED CSV + external human utterance

INTAKE: Resolver → Granite → Witness
  ↓
CSV-bounded interpretation — UNTRUSTED
  ↓
CHECK: Resolver → Granite → Witness
  ↓
CSV-bounded checked interpretation — UNTRUSTED
  ↓
COMMIT: Resolver → Granite → Witness
  ↓
FINAL CSV-bounded structured return — TRUSTED
```

`INTAKE` maps the human utterance into the operation's bounded possibilities. `CHECK` separately asks whether the utterance is coherently matchable to the corresponding bounded packet. `COMMIT` transforms the checked intermediate into the final bounded structured result available to deterministic game machinery.

### NPC → Human

```text
TRUSTED NPC CSV communicative state

COMPOSE: Resolver → Granite → Witness
  ↓
CSV-bounded candidate utterance — UNTRUSTED
  ↓
CHECK: Resolver → Granite → Witness
  ↓
CSV-bounded checked utterance — UNTRUSTED
  ↓
EMIT: Resolver → Granite → Witness
  ↓
FINAL CSV-bounded utterance/result — TRUSTED
  ↓
deterministic delivery
```

`COMPOSE` proposes language from the NPC-side bounded state. `CHECK` separately asks whether that candidate language is coherently matchable to the corresponding speaker-side packet. `EMIT` transforms the checked intermediate into the final bounded result that may be delivered.

### NPC → NPC

NPC-to-NPC communication uses the sender pipeline followed by the receiver pipeline. The actual trusted emitted utterance crosses between them. The recipient never receives the sender's hidden structured intent.

This permits:

```text
sender intended X → said Y → recipient interpreted Z
```

including `X ≠ Z`.

## Checker role

`Granite.CHECK` is mandatory wherever human- or Granite-produced language can influence the final semantic/game result.

Checker's narrow question is whether the utterance/candidate language is coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by the supplied bounded packet.

Checker does not decide objective truth. A false statement about the stone can be valid if the packet contains the relevant stone/actors/state. Automotive-engine discourse is invalid when nothing in the packet corresponds to automotive machinery.

Checker is local to the side being checked. It must not receive both parties' private structures merely to force mutual understanding.

Checker's return is still untrusted and goes through ordinary Witness exactly like every other Granite return. After Witness it becomes a CSV-bounded checked intermediate, but remains untrusted until the final `COMMIT` or `EMIT` transformation succeeds.

## JSON is operational, CSV is backing state

Granite input and output JSON packages are transient operational structures. They are not game state.

CSV is the durable backing state; JSON is temporary expression or transport for one transformation.

A CSV-bounded intermediate is not authoritative merely because it has passed Witness. Only the completed pipeline's final trusted result may become authoritative dialogue/game state.

Do not create model-owned state, JSON-owned state, or a second runtime world model around Granite.

See `docs/CSV_BACKING_STATE.md` for the hard state boundary and `docs/DIALOGUE_BOUNDARY.md` for dialogue sequencing.

## World and consequence boundary

Granite does not own world state, memory, motives, relationships, permissions, identities, or consequences.

Authoritative world state remains external, inspectable, and CSV-backed. Speaker, recipient, actor, operation identity, event identity, and permitted schemas/populations come from trusted game code/CSV rather than Granite.

A final trusted game-action result may be consumed by deterministic game code. Deterministic code checks current CSV-backed preconditions and performs any allowed world mutation.

A final trusted emitted utterance may be presented by deterministic delivery code.

Intermediate Witness outputs must not be mistaken for final authoritative results.

## Preserve the experiment

Do not add semantic abstractions, hidden conversational memory, relationship scores, or model-centered interpretations of intelligence because they seem useful.

Do not let dialogue controls turn into a truth engine. Falsehood, imprecision, ambiguity, deception, and misunderstanding are permitted when language remains matchable to the bounded packet. Ungrounded subject matter must not reach the final trusted result.

The deeper hypothesis being tested by MochEpoch is intentionally unspecified here. Do not infer it, encode it, or optimize the implementation toward a presumed conclusion. Preserve the apparatus and let observed runs establish what emerges.

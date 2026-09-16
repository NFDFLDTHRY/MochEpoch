# Granite role and experimental framing

This document records the operational framing that must be preserved while building MochEpoch. It does not state the experiment's hidden hypothesis or predicted result.

## Structural model role

MochEpoch does not treat Granite as an intelligent agent, NPC brain, world model, authority, or source of meaning.

For this project, Granite is a statistical structural transformer used exactly like another game function:

```text
parameters → Granite → return value
```

Supplied structure goes in and a probable supplied-shape structure comes out. Intelligence is not assigned to the model by the game architecture.

Language is treated operationally as structure. Words do not need intrinsic semantic content for MochEpoch to work. Definitions recurse through other words and relationships, so the game should not invent a separate hidden semantic layer merely to explain language processing.

Do not replace this framing with generic "AI agent," "NPC brain," chatbot, model-as-reasoner, or model-as-world assumptions.

## Trust boundary

The stable model-call primitive is:

```text
trusted CSV-backed state
        ↓
Resolver
CSV → bounded JSON parameters
        ↓
Granite(operation)
JSON → JSON
        ↓
untrusted JSON result
        ↓
Witness
JSON → bounded CSV-backed result or REJECT
        ↓
trusted CSV-backed structure again
```

Resolver and Witness are deterministic game-side boundaries around Granite.

### Resolver

Resolver is the outbound boundary from authoritative CSV-backed state to one Granite call. Resolver reads and resolves only the state permitted for the operation and constructs the bounded JSON parameters Granite may receive.

Resolver does not interpret model output, own game state, or mutate authoritative state.

### Granite

Granite receives only the bounded parameters supplied by Resolver and returns JSON. Calls are independent and stateless with respect to game truth. Granite has no direct CSV access, no hidden world authority, no permission to choose its own scope, and no ability to make a consequence happen merely by returning it.

Every Granite return is untrusted, including the output of any coherence/checking operation.

For natural-language operations, Granite may assist with interpretation, composition, coherence, and proposed grounding labels or referents. Granite's judgment never establishes that an utterance is grounded in game state. Grounding admission is deterministic and belongs to Witness.

### Witness

Witness is the inbound boundary from untrusted Granite JSON back to bounded CSV-backed game structure. Witness validates the exact operation schema, permitted references, scope, and authority. It accepts only a representation the current operation is allowed to produce, or rejects the result.

For dialogue operations, schema validity alone is insufficient. Any content-bearing referents required by the operation must resolve deterministically against the Resolver-bounded JSON population before the utterance, interpretation, or checked result may become CSV-backed dialogue. Granite may propose those referents, but Witness establishes whether they are actually permitted.

Witness does not reason, infer missing meaning, silently repair malformed output, invent world facts, or grant world authority to plausible model text.

A result becoming trusted after Witness means only that it is structurally, referentially, and authoritatively legal for the game to represent. It does not mean a claim is true, an interpretation is correct, or an NPC is honest.

See `docs/DIALOGUE_BOUNDARY.md` for the dialogue-specific rules and directional flows.

## Fixed-shape transformation workload

Granite is invoked at specific transformation boundaries. Calls are independent and stateless with respect to game truth. Any facts required for a call must be supplied from external inspectable CSV-backed state through Resolver.

The JSON packages used by a given operation have game-defined shape and semantics. Field values change according to game-defined populations, but the model is not asked to invent a new protocol from call to call.

Granite therefore acts primarily as a reducer or transformer: it receives a bounded structured package and returns the required smaller structured candidate.

Operation names such as `INTAKE`, `CHECK`, `COMPOSE`, `DECIDE`, or `FINALIZE` name requested transformations. They do not create model agents or privileged subsystems.

Natural language is a field population handled inside this structural machinery, not a separate chatbot architecture.

## JSON is operational, CSV is backing state

Granite input and output JSON packages are transient operational structures. They are not game state.

The DNA/RNA analogy used by this project is mechanical only: CSV is the durable backing state; JSON is the temporary expression or transport package for a particular operation.

A Granite result may propose an interpretation, utterance, decision, action, or other bounded structure, but it does not become authoritative by existing. Every result returns through Witness before it can become a legal CSV-backed representation.

If a witnessed result proposes a world consequence, deterministic game code still checks current CSV-backed preconditions and performs any permitted world mutation. Granite never commits a world mutation directly.

Do not create model-owned state, JSON-owned state, or a second runtime world model around Granite. Do not literalize the DNA/RNA analogy into biological mechanics.

See `docs/CSV_BACKING_STATE.md` for the hard state boundary.

## Natural-language communication

Human and NPC communication use the same trust primitive: `Resolver → Granite → Witness`.

The primitive does not reverse. What changes is whether language is entering the structured game world or being composed for delivery out of it.

Every language-bearing dialogue path requires a local `Granite.CHECK` before final dialogue admission or delivery. The check is mandatory but remains probabilistic and untrusted; its result must pass through Witness, and Witness still performs deterministic grounding/reference admission.

### Human → NPC

Human-to-NPC intake uses the human utterance as explicitly labeled external input plus recipient-bounded CSV context. A Granite `INTAKE` call may propose a structured interpretation and its content-bearing referents. After the intake result crosses Witness as a bounded candidate, a recipient-side `CHECK` must test the candidate against the actual utterance and recipient-bounded packet before final dialogue admission.

### NPC → Human

NPC-to-human composition begins from trusted NPC-side communicative structure in CSV. A Granite `COMPOSE` call may propose surface language and its content-bearing referents. After the compose result crosses Witness as a bounded candidate, a speaker-side `CHECK` must test the candidate against the supplied NPC communicative structure and speaker-bounded packet. Only the final checked and witnessed utterance may be delivered to the human.

### NPC → NPC

NPC-to-NPC communication must traverse the actual delivered utterance. Do not pass one NPC's hidden structured intent directly to another NPC. The sender performs `COMPOSE`, then a mandatory sender-side `CHECK`, before deterministic delivery. The recipient receives that actual utterance, performs `INTAKE`, then a separate mandatory recipient-side `CHECK` against its own bounded context before final interpretation admission. Misunderstanding remains possible and is not automatically a failure.

Checker calls are local to the transformation being checked. They are not omniscient, must not compare both characters' private structures to force perfect mutual understanding, and do not decide objective truth.

Packet-bounded discourse is a hard admission rule. A candidate may be false, mistaken, deceptive, imprecise, or ambiguous about concepts grounded in the permitted bounded population, but content-bearing entities, objects, systems, capabilities, or subject matter absent from that population must not enter CSV-backed dialogue. Surface-language glue, pronouns, morphology, and synonyms need not be literal CSV tokens so long as their content maps back to permitted grounded referents.

Speech is an attributed event, not a world fact. A character may say something false without the statement mutating unrelated authoritative state.

Do not collapse communication into a single chatbot-style prompt/response turn. Granite is not the NPC. Game/NPC processing and authoritative state remain outside the model calls.

## World and consequence boundary

Granite does not own world state, memory, motives, relationships, permissions, identities, or consequences. It does not become authoritative merely because natural language passes through it.

Authoritative world state remains external, inspectable, and CSV-backed. Speaker, recipient, actor, operation identity, event identity, and permitted schema are bound by trusted game code/CSV rather than chosen by Granite.

If prior events or communication matter to a later Granite call, they must reach that call through inspectable CSV-backed state rather than hidden model memory.

A witnessed action result may become a trusted action proposal. Deterministic game code decides whether the current authoritative state permits the consequence and performs the mutation if allowed.

A checked and witnessed utterance may become trusted dialogue CSV. Deterministic game code presents the accepted utterance to its recipient.

## Preserve the experiment

Do not add semantic abstractions, conversational memory hidden in model context, relationship scores, or model-centered interpretations of intelligence because they seem conceptually useful.

Do not let dialogue controls turn into a truth engine. Coherence is not truth. Claims, lies, mistakes, ambiguity, and misunderstanding may be valid game events only when their content remains grounded in the operation's permitted bounded population, passes the mandatory local Checker, and passes the deterministic Witness admission boundary. Schema validity alone does not admit natural-language content.

The deeper hypothesis being tested by MochEpoch is intentionally unspecified here. Do not infer it, encode it, or optimize the implementation toward a presumed conclusion. Preserve the apparatus and let observed runs establish what emerges.

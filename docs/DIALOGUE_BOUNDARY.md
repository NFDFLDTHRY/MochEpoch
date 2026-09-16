# Dialogue and model trust boundary

This document defines how MochEpoch moves information between authoritative CSV-backed game state, human language, Granite, and deterministic game execution.

The model is not an actor or authority. The stable primitive is:

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

`Resolver → Granite → Witness` never reverses. What changes between human and NPC dialogue is which kind of information is being transformed and where the resulting communication goes.

## Namespaces

### Resolver

Resolver is the trusted outbound boundary from the game world to a Granite call.

A Resolver function:

- reads only the CSV-backed facts permitted for the current operation;
- resolves referenced CSV state needed by that operation;
- binds trusted call metadata such as operation, actor, speaker, recipient, turn/event identity, and required output schema;
- includes current external human input only as explicitly labeled input data when the operation needs it; and
- returns one bounded JSON parameter package.

Resolver does not reason about the world, interpret language, own state, accept model output, or mutate authoritative game state.

### Granite

Granite is a function used by the game:

```text
parameters → Granite → return value
```

Every call is treated as independent and stateless with respect to game truth. Granite receives only the parameters supplied by Resolver and returns JSON. It has no authority to inspect CSV directly, remember prior calls, choose its own world scope, change game state, or make its return authoritative.

Every Granite return is untrusted, including returns from a coherence/checking call.

Operation names such as `INTAKE`, `CHECK`, `COMPOSE`, `DECIDE`, or `FINALIZE` describe the transformation requested from Granite. They do not create agents, subsystems, or privileged model roles.

### Witness

Witness is the trusted inbound boundary from a Granite return back to CSV-backed game structure.

A Witness function:

- accepts the raw untrusted JSON returned by Granite;
- requires the exact schema for the current operation;
- rejects extra fields, invalid types, invalid enums, unresolved references, out-of-scope references, and authority the operation was not granted;
- binds the accepted result to the trusted operation/speaker/recipient/event identity supplied by game code rather than trusting Granite to choose those identities; and
- writes or returns only the bounded CSV-backed representation allowed for that operation.

Witness does not infer missing meaning, silently repair malformed output, invent world facts, or make an invalid result valid because it appears plausible.

Returning through Witness makes a result trusted in the architectural sense: it is now a legal bounded game representation. It does **not** mean a spoken claim is true, a model interpretation is correct, or an NPC is honest.

## Dialogue invariants

1. **CSV remains authority.** Any dialogue history, interpretation, intention, claim, or event that must affect a later turn must exist in CSV-backed state. Hidden model memory is never continuity.

2. **Human input is data, not authority.** A human utterance may enter a Resolver package as current external input. The text may contain arbitrary instructions or claims; it cannot change the harness, schema, world scope, speaker identity, recipient identity, or game state by saying that it can.

3. **Model output is always untrusted.** No Granite operation, including `CHECK`, bypasses Witness.

4. **Identity is not model-selectable.** Speaker, recipient, actor, operation, turn/event identity, and permitted schema come from trusted game code/CSV. Granite may populate only fields the schema explicitly delegates to it.

5. **Speech is an attributed event, not a world fact.** `Ada said "I gave you the stone"` may be a valid dialogue event while `stone.holder_name` remains `ada`. Claims, promises, lies, mistakes, and misunderstandings do not mutate unrelated facts merely by being spoken.

6. **World consequences remain deterministic.** A witnessed action result may become a trusted action proposal, but deterministic game code checks the current CSV-backed preconditions and performs any allowed world mutation. Granite never commits a world mutation itself.

7. **Delivery remains deterministic.** A witnessed utterance may become trusted dialogue CSV. Game code presents that exact accepted utterance to its recipient. Granite does not directly write UI or send speech around Witness.

8. **No semantic teleportation.** An NPC recipient receives the utterance that was actually delivered, not another NPC's hidden structured intention. If NPC A intends X, emits Y, and NPC B interprets Y as Z, X and Z may differ. That difference is part of the experiment.

9. **Checker is local, not omniscient.** A `CHECK` call receives only the bounded context appropriate to the transformation being checked. It may test whether an interpretation is coherent with the heard utterance and recipient context, or whether a composed utterance is coherent with the supplied speaker-side structure. It must not secretly compare both characters' private structures to enforce perfect communication.

10. **Checker is not a security boundary.** Its result is another probabilistic Granite return and is untrusted until Witness accepts its exact schema. Deterministic schema/reference/authority checks remain outside Granite.

11. **Coherence is not truth.** Dialogue control checks structural correspondence and bounded contextual coherence. It does not force characters to be truthful, agreeable, rational, or mutually understood. False claims and mistaken interpretations may be valid game events.

12. **Ambiguity is allowed to remain ambiguity.** If a model result cannot be accepted under the operation schema, Witness rejects it or records an explicitly allowed unresolved/ambiguous result. It must not silently manufacture certainty.

13. **Retries must be explicit and bounded.** If an operation later requires retry/correction behavior, deterministic game code defines the finite policy. Granite cannot recursively call itself or continue until it likes its own answer.

14. **Context is scoped per operation.** Resolver must not dump the whole world or entire conversation history into a call merely because it exists. Supply only the CSV-backed state required and permitted for that actor and operation.

## Directional dialogue

### Human → NPC intake

The human's surface utterance is external input. The recipient's available game context is trusted CSV state.

```text
human utterance + recipient-bounded CSV
                ↓
             Resolver
                ↓
       Granite.INTAKE
                ↓
        untrusted JSON
                ↓
             Witness
                ↓
 trusted interpretation/event CSV
```

If a coherence pass is required for the operation:

```text
utterance + witnessed interpretation + recipient-bounded CSV
                ↓
             Resolver
                ↓
        Granite.CHECK
                ↓
        untrusted JSON
                ↓
             Witness
                ↓
 trusted checked-result CSV
```

The check asks whether the proposed interpretation is a coherent interpretation of what this recipient actually received within the recipient's bounded context. It does not ask whether the human's statement is objectively true.

### NPC → Human composition

NPC-side communicative intent or response state begins as trusted CSV-backed structure. Surface language must cross the same trust boundary.

```text
NPC communicative structure + speaker-bounded CSV
                ↓
             Resolver
                ↓
       Granite.COMPOSE
                ↓
        untrusted JSON
                ↓
             Witness
                ↓
       trusted utterance CSV
                ↓
      deterministic delivery
                ↓
              human
```

A speaker-side `CHECK` may be inserted before delivery when the operation requires it. It receives the intended structure, candidate utterance, and only the speaker-side bounded context required to ask whether the candidate coherently expresses that structure. Its return still passes through Witness.

### NPC → NPC communication

NPC-to-NPC dialogue uses both halves. Do not hand the recipient the sender's hidden structure.

```text
NPC A trusted communicative structure
                ↓
             Resolver
                ↓
       Granite.COMPOSE
                ↓
             Witness
                ↓
      trusted utterance CSV
                ↓
      deterministic delivery
                ↓
        actual utterance Y
                ↓
Resolver with NPC B's bounded context
                ↓
        Granite.INTAKE
                ↓
             Witness
                ↓
 NPC B trusted interpretation CSV
```

Optional speaker-side and recipient-side `CHECK` operations remain separate and bounded to their respective sides.

## Emit versus commit

`emit` and `commit` are consequences outside Granite, not privileges granted to the model.

A Granite operation may return an untrusted candidate describing what kind of result it proposes. Witness may accept that candidate into a bounded CSV-backed structure only if the operation schema permits it.

After Witness:

- an **emit** result is deterministically delivered/presented from trusted dialogue CSV;
- a **commit** result is deterministically checked against current authoritative CSV and, if legal, applied as a world-state mutation.

The trust chain therefore remains:

```text
CSV → Resolver → JSON → Granite → JSON(untrusted) → Witness → CSV(trusted)
```

Any later emit or commit consumes the trusted CSV result. Granite never emits directly and never commits directly.

## Implementation rule

Do not build a general conversation framework. Implement only the next concrete Resolver/Granite/Witness operation required by the current fixture. Each model call must expose its exact bounded input JSON, raw output JSON, Witness acceptance/rejection, and resulting CSV-backed structure as inspectable evidence.

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
- binds trusted call metadata such as operation, actor, speaker, recipient, turn/event identity, required output schema, and the operation's allowed grounding population;
- includes current external human input only as explicitly labeled input data when the operation needs it; and
- returns one bounded JSON parameter package.

Resolver does not reason about the world, interpret language, own state, accept model output, or mutate authoritative game state.

### Granite

Granite is a function used by the game:

```text
parameters → Granite → return value
```

Every call is treated as independent and stateless with respect to game truth. Granite receives only the parameters supplied by Resolver and returns JSON. It has no authority to inspect CSV directly, remember prior calls, choose its own world scope, change game state, or make its return authoritative.

Every Granite return is untrusted, including returns from a coherence/grounding check.

Operation names such as `INTAKE`, `CHECK`, `COMPOSE`, `DECIDE`, or `FINALIZE` describe the transformation requested from Granite. They do not create agents, subsystems, or privileged model roles.

### Witness

Witness is the trusted inbound boundary from a Granite return back to CSV-backed game structure.

A Witness function:

- accepts the raw untrusted JSON returned by Granite;
- requires the exact schema for the current operation;
- rejects extra fields, invalid types, invalid enums, unresolved references, out-of-scope references, and authority the operation was not granted;
- for dialogue operations, requires the operation-defined structured grounding map/reference fields and rejects every grounding reference that is not present in the Resolver-bounded population;
- binds the accepted result to the trusted operation/speaker/recipient/event identity supplied by game code rather than trusting Granite to choose those identities; and
- writes or returns only the bounded CSV-backed representation allowed for that operation.

Witness does not infer missing meaning, silently repair malformed output, invent world facts, create new ontology from free-form language, or make an invalid result valid because it appears plausible.

Returning through Witness makes a result trusted in the architectural sense: it is now a legal bounded game representation. It does **not** mean a spoken claim is true, a model interpretation is correct, or an NPC is honest.

## Hard dialogue grounding contract

Free-form language is never sufficient authority to introduce game structure.

Every dialogue operation that may place an utterance, interpretation, communicative intent, or other language-derived result into CSV-backed state must use an operation-specific schema containing explicit structured grounding alongside the free-form language. The exact field shape may differ by operation, but the mechanical rule does not:

```text
bounded JSON population from Resolver
                ↓
       candidate language/result
                ↓
 explicit structured grounding references
                ↓
      Witness deterministic match
                ↓
      ACCEPT into CSV or REJECT
```

The grounding structure may point to permitted entities, objects, systems, events, properties, actions/capabilities, or other operation-defined references contained in the Resolver package. It may not create a new reference by naming it in text.

A candidate cannot become CSV-backed dialogue merely because Granite says it is grounded. `Granite.CHECK` is a probabilistic semantic/coherence test. The hard structural admission condition is that the required grounding structure exists and every reference in it deterministically resolves inside the operation's Resolver-bounded population.

The operation schema must make grounding mandatory wherever free-form content could otherwise introduce game-relevant subject matter. Witness rejects missing grounding fields, unknown references, references outside the bounded population, or structural claims outside the operation's authority.

Human and Granite language are treated identically at this boundary. A human cannot expand the game's ontology by typing a new subject, and Granite cannot expand it by producing fluent text. External human text remains external input until its intake and mandatory check have completed. Granite-composed text remains a candidate until its mandatory speaker-side check has completed.

Falsehood is different from ontology drift. An utterance may be imprecise, mistaken, deceptive, or false while remaining grounded in allowed packet content. For example, `I already gave you the stone` can be admissible when `Ada`, `player`, and `stone` are grounded even if the current stone holder makes the proposition false. `The carburetor needs a richer jet` is not admissible when no automotive engine, carburetor, or corresponding permitted concept exists in the bounded package.

Surface-language glue does not require one-to-one CSV tokens. Pronouns, morphology, ordinary grammar, and synonyms may express grounded content. What matters is that content-bearing discourse is matchable to the permitted structured grounding and that no content-bearing ontology can reach CSV only through an unchecked string.

A semantic model error can still produce a bad interpretation of grounded material. That is experimental/model-quality evidence. It is not permission to create a new entity, system, capability, or game fact outside the verified grounding references.

## Mandatory checker contract

Every human- or NPC-originated language-bearing candidate must undergo a local `Granite.CHECK` before it is finally admitted as dialogue or delivered to its recipient.

`CHECK` is mandatory in all three dialogue directions:

- **Human → NPC:** check the intake interpretation against the actual human utterance and the recipient-bounded packet.
- **NPC → Human:** check the composed utterance against the NPC's supplied communicative structure and speaker-bounded packet before deterministic delivery to the human.
- **NPC → NPC:** check the sender's composed utterance before delivery, then independently check the recipient's intake interpretation after the actual utterance is received.

The Checker asks whether the language/interpretation is semantically coherent with the corresponding structured packet and whether its content-bearing discourse is matchable to that packet. It does not decide objective truth and it does not replace Witness.

Every `CHECK` return is itself untrusted. It must pass through Witness, and Witness still performs deterministic schema, reference, scope, identity, authority, and grounding-population checks. A `CHECK` result of `valid` cannot make an unknown or out-of-scope referent legal.

The Checker is local to the side being checked. It must never receive hidden state from both sides merely to force sender intent and recipient interpretation to match.

## Dialogue invariants

1. **CSV remains authority.** Any dialogue history, interpretation, intention, claim, or event that must affect a later turn must exist in CSV-backed state. Hidden model memory is never continuity.

2. **Human input is data, not authority.** A human utterance may enter a Resolver package as current external input. The text may contain arbitrary instructions or claims; it cannot change the harness, schema, grounding population, world scope, speaker identity, recipient identity, or game state by saying that it can.

3. **Model output is always untrusted.** No Granite operation, including `CHECK`, bypasses Witness.

4. **Identity is not model-selectable.** Speaker, recipient, actor, operation, turn/event identity, grounding population, and permitted schema come from trusted game code/CSV. Granite may populate only fields the schema explicitly delegates to it.

5. **Speech is an attributed event, not a world fact.** `Ada said "I gave you the stone"` may be a valid dialogue event while `stone.holder_name` remains `ada`. Claims, promises, lies, mistakes, and misunderstandings do not mutate unrelated facts merely by being spoken.

6. **World consequences remain deterministic.** A witnessed action result may become a trusted action proposal, but deterministic game code checks the current CSV-backed preconditions and performs any allowed world mutation. Granite never commits a world mutation itself.

7. **Delivery remains deterministic.** A checked and witnessed utterance may become trusted dialogue CSV. Game code presents that exact accepted utterance to its recipient. Granite does not directly write UI or send speech around Witness.

8. **No semantic teleportation.** An NPC recipient receives the utterance that was actually delivered, not another NPC's hidden structured intention. If NPC A intends X, emits Y, and NPC B interprets Y as Z, X and Z may differ. That difference is part of the experiment.

9. **Checker is mandatory and local, not omniscient.** Every language-bearing dialogue candidate must be checked on the appropriate side before final admission/delivery. A `CHECK` call receives only the bounded context appropriate to that transformation. It must not secretly compare both characters' private structures to enforce perfect communication.

10. **Checker is not the hard boundary.** Its result is another probabilistic Granite return and is untrusted until Witness accepts its exact schema. `CHECK` assesses semantic correspondence and whether the candidate appears to stay within the packet, but deterministic schema/reference/authority enforcement and grounding-reference membership remain Witness responsibilities.

11. **Coherence is not truth.** Dialogue control checks structural correspondence and bounded contextual coherence. It does not force characters to be truthful, agreeable, rational, or mutually understood. False claims and mistaken interpretations may be valid game events when their discourse remains grounded.

12. **Discourse is packet-bounded.** A candidate utterance or interpretation may make a false, mistaken, deceptive, or ambiguous proposition about concepts grounded in the operation's bounded JSON package, but it must not introduce new content-bearing entities, objects, systems, capabilities, or subject matter that have no grounding in that package.

13. **Grounding is explicit and structurally checked.** Any language-derived result admitted to CSV must carry the operation-required structured grounding. Witness must deterministically verify each grounding reference against the Resolver-bounded population before admission. A fluent string or a `CHECK` result saying `valid` is insufficient by itself.

14. **Grounding applies to both human and model speech.** Human input does not gain permission to expand the game's ontology merely because a person typed it, and Granite output does not gain permission merely because it is fluent.

15. **Ambiguity is allowed to remain ambiguity.** If a model result cannot be accepted under the operation schema, Witness rejects it or records an explicitly allowed unresolved/ambiguous result whose own grounding is valid. It must not silently manufacture certainty.

16. **Retries must be explicit and bounded.** If an operation later requires retry/correction behavior, deterministic game code defines the finite policy. Granite cannot recursively call itself or continue until it likes its own answer.

17. **Context is scoped per operation.** Resolver must not dump the whole world or entire conversation history into a call merely because it exists. Supply only the CSV-backed state required and permitted for that actor and operation.

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
  interpretation + grounding
                ↓
             Witness
                ↓
 bounded intake candidate
                ↓
             Resolver
                ↓
        Granite.CHECK
                ↓
        untrusted JSON
                ↓
             Witness
                ↓
 final checked grounded interpretation/event
                ↓
     eligible for dialogue admission
```

The mandatory check asks whether the proposed interpretation is a coherent interpretation of what this recipient actually received within the recipient's bounded context and whether the content-bearing discourse corresponds to the supplied grounding. It does not ask whether the human's statement is objectively true. Regardless of the check's opinion, admission still requires Witness to verify the structured grounding references against the bounded population.

### NPC → Human composition

NPC-side communicative intent or response state begins as trusted CSV-backed structure. Surface language must cross the same trust boundary and cannot be delivered merely because `COMPOSE` produced fluent text.

```text
NPC communicative structure + speaker-bounded CSV
                ↓
             Resolver
                ↓
       Granite.COMPOSE
                ↓
        untrusted JSON
    utterance + grounding
                ↓
             Witness
                ↓
 bounded utterance candidate
                ↓
             Resolver
                ↓
        Granite.CHECK
                ↓
        untrusted JSON
                ↓
             Witness
                ↓
 final checked grounded utterance
                ↓
      deterministic delivery
                ↓
              human
```

The mandatory speaker-side check receives the intended communicative structure, candidate utterance, candidate grounding, and only the speaker-side bounded context required to ask whether the candidate coherently expresses that structure and whether the language corresponds to its grounding. The human receives only the final checked and witnessed utterance.

### NPC → NPC communication

NPC-to-NPC dialogue uses both halves. The recipient receives the actual delivered utterance, never the sender's hidden structured intention.

```text
NPC A trusted communicative structure
                ↓
             Resolver
                ↓
       Granite.COMPOSE
                ↓
             Witness
                ↓
 bounded utterance candidate
                ↓
             Resolver
                ↓
        Granite.CHECK
                ↓
             Witness
                ↓
 final checked grounded utterance
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
 bounded interpretation candidate
                ↓
             Resolver
                ↓
        Granite.CHECK
                ↓
             Witness
                ↓
 NPC B final checked grounded interpretation
```

The sender-side and recipient-side checks are separate and bounded to their respective sides. Each side independently satisfies its own coherence and grounding contract. This preserves `sender intended X → said Y → recipient interpreted Z`, including X ≠ Z.

## Emit versus commit

`emit` and `commit` are consequences outside Granite, not privileges granted to the model.

A Granite operation may return an untrusted candidate describing what kind of result it proposes. Witness may accept that candidate into a bounded game-side structure only if the operation schema and grounding contract permit it. For language-bearing dialogue, the required local Checker must also complete before final dialogue admission or delivery.

After final dialogue admission:

- an **emit** result is deterministically delivered/presented from trusted dialogue CSV;
- a **commit** result is deterministically checked against current authoritative CSV and, if legal, applied as a world-state mutation.

The trust chain for each Granite call remains:

```text
CSV → Resolver → JSON → Granite → JSON(untrusted) → Witness → bounded trusted result
```

Dialogue may require several such calls in sequence. Granite never emits directly and never commits directly.

## Implementation rule

Do not build a general conversation framework. Implement only the next concrete Resolver/Granite/Witness operation required by the current fixture. For every language-bearing operation, define the smallest explicit grounding schema needed by that operation rather than introducing a global semantic ontology.

Every human→NPC, NPC→human, and NPC→NPC language-bearing path must include the appropriate mandatory local `CHECK` stage before final dialogue admission or delivery.

Each model call must expose its exact bounded input JSON, raw output JSON, grounding references, Witness acceptance/rejection, and resulting bounded structure as inspectable evidence.
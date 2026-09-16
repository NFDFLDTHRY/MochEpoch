# MOCH EPOCH — IMPLEMENTATION PLAN

## QUESTION

Can a civilization-like game emerge from CSV world state + bounded Resolver/Granite/Witness transformations + deterministic game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## CORE MODEL CALL

Every Granite transformation uses the same primitive:

```text
CSV-bounded input
  │
  ▼
RESOLVER
CSV-bounded input → bounded JSON parameters
  │
  ▼
GRANITE(stage)
JSON → JSON
  │
  ▼
UNTRUSTED JSON RESULT
  │
  ▼
WITNESS
JSON → CSV-bounded result or REJECT
```

Each Granite call is one transformation from a game-defined bounded population of possibilities.

Resolver, Granite, and Witness never change roles:

- Resolver projects the CSV-bounded input required for one transformation into bounded JSON.
- Granite performs one JSON → JSON transformation and is reset at the end of that call with respect to game truth.
- Witness checks the return against that transformation's schema, allowed values/references/scope, then converts it into a CSV-bounded result or rejects it.

**Witness does not automatically make every intermediate trusted.** In a three-transformation dialogue pipeline, the first two Witness outputs are CSV-bounded but remain untrusted. Only the successful output of the final `COMMIT` or `EMIT` transformation returns the pipeline to trusted CSV-bounded structure.

The end-to-end trust shape is:

```text
TRUSTED CSV INPUT
  ↓
transformation 1 → CSV-bounded UNTRUSTED intermediate
  ↓
transformation 2 → CSV-bounded UNTRUSTED intermediate
  ↓
transformation 3 → FINAL CSV-bounded result
  ↓
TRUSTED
```

There are no PRECHECK/FINAL Witness modes and no special Witness implementation at the end. The same Witness operation follows every Granite call. Trust comes from successful completion of the whole pipeline, not from Witness alone.

## WORLD RULES

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files are the inspectable factual state. Type + name resolve the file.

System prompts are CSV data. A prompt may belong to one character/entity or be shared by reference. Do not move prompts into executable code merely for convenience.

Granite is a one-shot JSON transformation function. It receives only the bounded packet supplied by Resolver and returns JSON. It does not own state, inspect CSV directly, remember prior calls as game truth, or execute consequences.

Every Granite output is untrusted.

World consequences remain deterministic. Granite may help produce the final bounded structured result; ordinary game code checks current CSV-backed preconditions and performs any permitted mutation only after the pipeline returns to trusted CSV-bounded structure.

The first-person 3D renderer is a projection of the CSV-described world. It must not become a second source of gameplay state.

Store facts and attributed events, not meta-interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar abstractions are intentionally outside the authoritative world state. Failure to produce civilization-like behavior is experimental evidence, not permission to add those abstractions. Only an explicit change to the research question should change that boundary.

## CSV BACKING STATE

CSV files are the backing state of the game. There is no parallel active-world representation.

Do not maintain gameplay truth in JavaScript objects, Maps, an ECS, a state store, renderer objects, inventory managers, relationship graphs, NPC caches, model context, or any other runtime structure.

Game code is limited to:

1. the first-person 3D client that reads the CSV-described world and renders it;
2. CSV files containing world, entity, system, asset, communication, event, and other game-relevant backing state; and
3. classes containing functions that read, resolve, validate, or transform that CSV backing state at explicit operation boundaries.

Function classes do not own game state.

JSON is transient operational structure only. `CSV-bounded` is a representation constraint and must not be mistaken for trust status. Intermediate dialogue results may be CSV-bounded for the next Resolver while remaining untrusted until the full three-transformation pipeline succeeds.

A Chrome WebApp cannot directly rewrite repository files. This is a persistence problem, not permission to replace CSV with an in-memory game model. The later persistence mechanism must act as a storage substrate for CSV-backed documents. Repository CSV files may be seed/default state; runtime-mutated authoritative state must remain CSV-backed.

See `docs/CSV_BACKING_STATE.md` for the full hard boundary.

## DIALOGUE RULES

Dialogue is not one model turn. It is a three-transformation pipeline built from the same small `Resolver → Granite → Witness` primitive.

`CHECK` is mandatory whenever human- or Granite-produced language could influence the final dialogue/game result. Checker receives the utterance and its corresponding bounded packet and asks whether that language is coherently matchable to the possibilities represented by the packet.

A statement may be false, imprecise, deceptive, or misunderstood and still pass if its content is matchable to the bounded context. Ungrounded subject matter must fail. With only Ada, player, room, and stone in the packet, language about the stone can be wrong; automotive-engine discourse has no valid match.

Checker does not decide objective truth and does not force two NPCs to agree. Witness does not reproduce Checker's semantic task; it only verifies that each Granite transformation returned one of the legal structured results for that transformation.

### Human → NPC

```text
TRUSTED CSV INPUT + external human utterance

1. INTAKE
human utterance + recipient CSV state
  ↓
Resolver → Granite.INTAKE → Witness
  ↓
CSV-bounded interpretation
UNTRUSTED

2. CHECK
utterance + interpretation + recipient-bounded state
  ↓
Resolver → Granite.CHECK → Witness
  ↓
CSV-bounded checked interpretation
UNTRUSTED

3. COMMIT
checked interpretation + game-valid possibilities
  ↓
Resolver → Granite.COMMIT → Witness
  ↓
FINAL CSV-bounded structured return
TRUSTED
```

The final trusted structured return may be consumed by deterministic game machinery. Granite does not directly mutate arbitrary world state.

### NPC → Human

```text
TRUSTED NPC CSV communicative state

1. COMPOSE
NPC CSV communicative state + allowed context
  ↓
Resolver → Granite.COMPOSE → Witness
  ↓
CSV-bounded candidate utterance
UNTRUSTED

2. CHECK
candidate utterance + corresponding speaker-bounded state
  ↓
Resolver → Granite.CHECK → Witness
  ↓
CSV-bounded checked utterance
UNTRUSTED

3. EMIT
checked utterance + allowed output possibilities
  ↓
Resolver → Granite.EMIT → Witness
  ↓
FINAL CSV-bounded utterance/result
TRUSTED
  ↓
deterministic delivery to human
```

### NPC → NPC

The sender completes the NPC→human production pipeline, then the receiver completes the human→NPC intake pipeline. The receiver sees the actual emitted utterance, never the sender's hidden structured intention.

```text
NPC A TRUSTED CSV state
  ↓
COMPOSE → CSV-bounded UNTRUSTED intermediate
  ↓
CHECK   → CSV-bounded UNTRUSTED intermediate
  ↓
EMIT    → FINAL TRUSTED CSV-bounded utterance
  ↓
actual utterance Y delivered
  ↓
NPC B receives Y as external language input
  ↓
INTAKE  → CSV-bounded UNTRUSTED intermediate
  ↓
CHECK   → CSV-bounded UNTRUSTED intermediate
  ↓
COMMIT  → FINAL TRUSTED CSV-bounded structured result
```

This permits `sender intended X → said Y → recipient interpreted Z`, including `X ≠ Z`.

### Dialogue control invariants

- Each Granite call is one bounded transformation and ends at Witness.
- A three-transformation dialogue pipeline begins from trusted CSV and returns to trusted CSV only after successful `COMMIT` or `EMIT`.
- `CSV-bounded` does not mean `trusted`.
- The first two Witness outputs are bounded intermediates and remain untrusted.
- Human text is input data, not authority over the harness or world.
- Every Granite return is untrusted.
- Checker is mandatory and local to the side being checked.
- Checker tests semantic matchability to the supplied bounded packet, not objective truth.
- Human and Granite language cannot create game ontology merely by mentioning it.
- The final `EMIT` or `COMMIT` transformation can only return values allowed by its bounded JSON possibilities.
- Speech is an attributed event, not automatically a world fact.
- NPC-to-NPC communication traverses the actual emitted utterance.
- Granite call-local state does not carry forward automatically.
- Retry/correction policy, if later needed, is deterministic and finite.

See `docs/DIALOGUE_BOUNDARY.md` for the complete contract.

## FIRST OPERATION

Use the smallest fixture that can prove the complete world-action loop:

```text
world: one room
player: player
game-controlled character: Ada
object: stone
initial fact: Ada holds the stone
player event: ask Ada for the stone
Granite action output schema: hand_over | wait
world mutation: deterministic code transfers the stone only if the final trusted CSV-bounded result and current CSV state permit it
```

Ada is game-controlled. Her `decision_system` may invoke Granite as an ordinary function. Granite does not control or embody Ada.

The exact seed is disposable. It proves plumbing, not civilization.

## IMPLEMENTATION ORDER

1. Load `world/world.csv`.
2. Resolve each indexed type + name to its CSV file.
3. Render only enough CSV-described state to show the first fixture, without creating a parallel active-world state layer.
4. Finish the real Chrome read/resolve/render verification.
5. Establish the concrete Granite 350M WebApp machinery and prove one real fixed-shape JSON-in → JSON-out Granite call with no game authority attached.
6. Implement the smallest Resolver needed for that proven call interface.
7. Implement the matching Witness for that same single transformation.
8. Prove one `Resolver → Granite → Witness` transformation without falsely treating its Witness result as a completed trusted dialogue result.
9. For natural-language ingress, add `INTAKE`, then `CHECK`, then `COMMIT`; keep the first two CSV-bounded outputs untrusted and trust only the completed final result.
10. For natural-language egress, add `COMPOSE`, then `CHECK`, then `EMIT`; keep the first two CSV-bounded outputs untrusted and trust only the completed final result.
11. Feed final trusted game-action results into ordinary deterministic code and check current CSV-backed preconditions.
12. Write any permitted world mutation back into authoritative CSV-backed state and render from that changed CSV state.
13. Add browser persistence only when surviving reload/restart is the operation being tested, and keep persisted authoritative representation CSV-backed.

Do not build a general-purpose dialogue framework before these operations require one.

## PASS CONDITION

The next interaction must operate correctly from the resulting authoritative CSV-backed state without hidden model memory or hidden game state.

## BUILD POLICY

```text
Question
  ↓
Define operation
  ↓
Build smallest version
  ↓
Run
  ↓
Save evidence
  ↓
Try to break
  ↓
Report only what the run established
  ↓
Add machinery only when a failure requires it
```

Do not add cloud or metered automation, including GitHub Actions, without explicit user approval.

Deployment, authentication, payments, and similar product-shell work are separate from the core civilization experiment. Add them only when the user explicitly asks for that operation; do not let them reshape the world-state architecture.

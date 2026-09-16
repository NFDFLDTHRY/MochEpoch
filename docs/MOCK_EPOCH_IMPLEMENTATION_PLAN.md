# MOCH EPOCH — IMPLEMENTATION PLAN

## QUESTION

Can a civilization-like game emerge from CSV world state + bounded Resolver/Granite/Witness transformations + deterministic game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## CORE MODEL CALL

Every Granite stage uses the same primitive:

```text
TRUSTED CSV-BOUNDED STATE
  │
  ▼
RESOLVER
CSV → bounded JSON parameters
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
JSON → CSV-bounded trusted result or REJECT
```

Each stage is one transformation from a game-defined bounded population of possibilities.

Resolver, Granite, and Witness never change roles:

- Resolver projects the CSV-bounded state needed for one stage into bounded JSON.
- Granite performs one JSON → JSON transformation and is reset at the end of that call with respect to game truth.
- Witness checks the return against that stage's schema, allowed values/references/scope, then converts it into CSV-bounded trusted structure or rejects it.

There are no PRECHECK/FINAL Witness modes and no hidden dialogue state between stages. A later stage starts again from CSV-bounded state through Resolver.

A witnessed result being trusted means it is a legal representation for that stage. It does not mean a proposition is true or a world consequence has happened.

## WORLD RULES

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files are the inspectable factual state. Type + name resolve the file.

System prompts are CSV data. A prompt may belong to one character/entity or be shared by reference. Do not move prompts into executable code merely for convenience.

Granite is a one-shot JSON transformation function. It receives only the bounded packet supplied by Resolver and returns JSON. It does not own state, inspect CSV directly, remember prior calls as game truth, or execute consequences.

Every Granite output is untrusted until Witness processes it.

World consequences remain deterministic. Granite may help produce a bounded structured result; ordinary game code checks current CSV-backed preconditions and performs any permitted mutation.

The first-person 3D renderer is a projection of the CSV-described world. It must not become a second source of gameplay state.

Store facts and attributed events, not meta-interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar abstractions are intentionally outside the authoritative world state. Failure to produce civilization-like behavior is experimental evidence, not permission to add those abstractions. Only an explicit change to the research question should change that boundary.

## CSV BACKING STATE

CSV files are the backing state of the game. There is no parallel active-world representation.

Do not maintain gameplay truth in JavaScript objects, Maps, an ECS, a state store, renderer objects, inventory managers, relationship graphs, NPC caches, model context, or any other runtime structure.

Game code is limited to:

1. the first-person 3D client that reads the CSV-described world and renders it;
2. CSV files containing world, entity, system, asset, communication, event, and other game-relevant backing state; and
3. classes containing functions that read, resolve, validate, or transform that CSV backing state at explicit operation boundaries.

Function classes do not own game state. Any game-relevant result that must survive an operation is represented back in CSV-backed state.

Assets are discovered through CSV manifests. The referenced resource may be any format required by the renderer or another backend, but asset identity, location, role, and game-relevant metadata belong in CSV.

Transient JSON is permitted only for the duration of one transformation. Granite input/output JSON is transport/expression, never backing state.

A Chrome WebApp cannot directly rewrite repository files. This is a persistence problem, not permission to replace CSV with an in-memory game model. The later persistence mechanism must act as a storage substrate for CSV-backed documents. Repository CSV files may be seed/default state; runtime-mutated state must remain CSV-backed.

See `docs/CSV_BACKING_STATE.md` for the full hard boundary.

## DIALOGUE RULES

Dialogue is not one model turn. It is a sequence of the same small `Resolver → Granite → Witness` transformation.

`CHECK` is a mandatory Granite stage whenever human- or Granite-produced language could influence a later dialogue/game stage. Checker receives the utterance and its corresponding bounded packet and asks whether that language is coherently matchable to the possibilities represented by the packet.

A statement may be false, imprecise, deceptive, or misunderstood and still pass if its content is matchable to the bounded context. Ungrounded subject matter must fail. With only Ada, player, room, and stone in the packet, language about the stone can be wrong; automotive-engine discourse has no valid match.

Checker does not decide objective truth and does not force two NPCs to agree. Witness does not reproduce Checker's semantic task; it only verifies that each Granite stage returned one of the legal structured results for that stage.

### Human → NPC

```text
INTAKE
human utterance + recipient CSV state
  ↓
Resolver → Granite.INTAKE → Witness
  ↓
CSV-bounded interpretation
  ↓
CHECK
utterance + interpretation + recipient-bounded state
  ↓
Resolver → Granite.CHECK → Witness
  ↓
CSV-bounded checked interpretation
  ↓
COMMIT
checked interpretation + game-valid possibilities
  ↓
Resolver → Granite.COMMIT → Witness
  ↓
CSV-bounded structured return
```

The final structured return may be consumed by deterministic game machinery. Granite does not directly mutate arbitrary world state.

### NPC → Human

```text
COMPOSE
NPC CSV communicative state + allowed context
  ↓
Resolver → Granite.COMPOSE → Witness
  ↓
CSV-bounded candidate utterance
  ↓
CHECK
candidate utterance + corresponding speaker-bounded state
  ↓
Resolver → Granite.CHECK → Witness
  ↓
CSV-bounded checked utterance
  ↓
EMIT
checked utterance + allowed output possibilities
  ↓
Resolver → Granite.EMIT → Witness
  ↓
CSV-bounded final utterance/result
  ↓
deterministic delivery to human
```

### NPC → NPC

The sender completes the NPC→human-style production path, then the receiver completes the human→NPC-style intake path. The receiver sees the actual emitted utterance, never the sender's hidden structured intention.

```text
NPC A state
  ↓
COMPOSE: Resolver → Granite → Witness
  ↓
CHECK:   Resolver → Granite → Witness
  ↓
EMIT:    Resolver → Granite → Witness
  ↓
actual utterance Y delivered
  ↓
NPC B
  ↓
INTAKE:  Resolver → Granite → Witness
  ↓
CHECK:   Resolver → Granite → Witness
  ↓
COMMIT:  Resolver → Granite → Witness
  ↓
NPC B CSV-bounded structured result
```

This permits `sender intended X → said Y → recipient interpreted Z`, including `X ≠ Z`.

### Dialogue control invariants

- Every stage is one bounded transformation and ends at Witness.
- The next stage always begins again from CSV-bounded state through Resolver.
- Human text is input data, not authority over the harness or world.
- Every Granite return is untrusted until Witness accepts/rejects it for that stage.
- Checker is mandatory and local to the side being checked.
- Checker tests semantic matchability to the supplied bounded packet, not objective truth.
- Human and Granite language cannot create game ontology merely by mentioning it.
- The final EMIT/COMMIT stage can only return values allowed by its bounded JSON possibilities.
- Speech is an attributed event, not automatically a world fact.
- NPC-to-NPC communication traverses the actual emitted utterance.
- Any history/result needed by a later call must exist in CSV-backed state; Granite call-local state does not carry forward.
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
world mutation: deterministic code transfers the stone only if the final CSV-bounded result and current CSV state permit it
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
8. Prove the first complete `Resolver → Granite → Witness` stage before chaining another stage.
9. For natural-language ingress, add `INTAKE`, then its separate mandatory `CHECK`, then `COMMIT`, proving each transformation independently.
10. For natural-language egress, add `COMPOSE`, then its separate mandatory `CHECK`, then `EMIT`, proving each transformation independently.
11. Feed final game-action results into ordinary deterministic code and check current CSV-backed preconditions.
12. Write any permitted world mutation back into CSV-backed state and render from that changed CSV state.
13. Add browser persistence only when surviving reload/restart is the operation being tested, and keep persisted representation CSV-backed.

Do not build a general-purpose dialogue framework before these operations require one.

## PASS CONDITION

The next interaction must operate correctly from the resulting CSV-backed state without hidden model memory or hidden game state.

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

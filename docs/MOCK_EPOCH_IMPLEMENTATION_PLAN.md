# MOCH EPOCH — IMPLEMENTATION PLAN

## QUESTION

Can a civilization-like game emerge from CSV world state + bounded Resolver/Granite/Witness transformations + deterministic game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## CORE MODEL CALL

Every Granite call crosses the same trust boundary:

```text
TRUSTED CSV-BACKED STATE
  │
  ▼
RESOLVER
CSV → bounded JSON parameters
  │
  ▼
GRANITE(operation)
JSON → JSON
  │
  ▼
UNTRUSTED JSON RESULT
  │
  ▼
WITNESS
JSON → bounded CSV-backed result or REJECT
  │
  ▼
TRUSTED CSV-BACKED STRUCTURE AGAIN
```

Resolver and Witness are deterministic game-side boundaries. Granite is a called function between them.

Resolver is outbound: trusted CSV → bounded JSON.

Witness is inbound: untrusted Granite JSON → bounded CSV-backed structure or rejection.

Do not reverse these names.

## WORLD RULES

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files are the inspectable factual state. Type + name resolve the file.

System prompts are CSV data. A prompt may belong to one character/entity or be shared by reference. Do not move prompts into executable code merely for convenience.

Granite is a one-shot JSON transformation function. It receives only the bounded package supplied by Resolver and returns JSON. It does not own state, inspect CSV directly, remember prior calls, or execute consequences.

Every Granite output is untrusted. Witness validates the exact operation schema, references, identity, scope, and permitted authority before any result becomes legal CSV-backed structure.

A witnessed result being trusted means it is valid game representation, not that its natural-language claims are true or that the model's interpretation is correct.

World consequences remain deterministic. A witnessed action result may become an action proposal; ordinary game code checks current CSV-backed preconditions and performs any allowed mutation.

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

Transient JSON is permitted only for the duration of an operation. Granite input/output JSON is transport/expression, never backing state.

A Chrome WebApp cannot directly rewrite repository files. This is a persistence problem, not permission to replace CSV with an in-memory game model. The later persistence mechanism must act as a storage substrate for CSV-backed documents. Repository CSV files may be seed/default state; runtime-mutated state must remain CSV-backed.

See `docs/CSV_BACKING_STATE.md` for the full hard boundary.

## DIALOGUE RULES

Human and NPC communication uses the same core call primitive: `Resolver → Granite → Witness`.

The trust machinery never reverses. What changes is whether surface language is entering the structured game world or being composed for delivery out of it.

### Human → NPC

```text
human utterance + recipient-bounded CSV
                ↓
             Resolver
                ↓
        Granite.INTAKE
                ↓
             Witness
                ↓
 trusted interpretation/event CSV
```

A bounded `Granite.CHECK` call may then test whether the witnessed interpretation is coherent with the actual utterance and the recipient's permitted context. The checker output is itself untrusted and must pass through Witness.

The check tests coherence, not objective truth.

### NPC → Human

```text
trusted NPC communicative structure
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
              human
```

A speaker-side bounded `Granite.CHECK` call may be used when required to test whether the candidate utterance coherently expresses the supplied structure. The result still passes through Witness.

### NPC → NPC

NPC-to-NPC communication uses both halves. The recipient must receive the actual delivered utterance, not the sender's hidden structured intention.

```text
NPC A trusted communicative structure
        ↓
Resolver → Granite.COMPOSE → Witness
        ↓
trusted utterance CSV
        ↓
deterministic delivery
        ↓
actual utterance
        ↓
Resolver using NPC B's bounded context
        ↓
Granite.INTAKE → Witness
        ↓
NPC B trusted interpretation CSV
```

This permits `sender intended X → said Y → recipient interpreted Z`. X and Z are not required to match.

### Dialogue control invariants

- Human text is input data, not authority over the harness or world.
- Speaker, recipient, actor, operation, event/turn identity, world scope, and output schema come from trusted game state/code rather than Granite.
- Every Granite return is untrusted, including checker returns.
- Speech is an attributed event, not a world fact. Saying a thing does not make it true in unrelated CSV state.
- Checker is local to one side/transformation and must not become an omniscient perfect-communication engine.
- Coherence is not truth. Lies, mistakes, ambiguity, and misunderstanding remain possible.
- Any communication/history that affects later behavior must be CSV-backed rather than hidden in model context.
- Any retry/correction policy must be explicit, deterministic, and finite.
- Emit/deliver and world commit are deterministic consequences after Witness, not powers granted to Granite.

See `docs/DIALOGUE_BOUNDARY.md` for the complete boundary contract.

## FIRST OPERATION

Use the smallest fixture that can prove the complete world-action loop:

```text
world: one room
player: player
model-using character: Ada
object: stone
initial fact: Ada holds the stone
player event: ask Ada for the stone
Granite action output schema: hand_over | wait
world mutation: deterministic code transfers the stone only if the witnessed action proposal and current CSV state permit it
```

The exact seed is disposable. It proves plumbing, not civilization.

The phrase `model-using character` means only that one of the game operations associated with Ada calls Granite as a function. Granite does not control or embody Ada.

## IMPLEMENTATION ORDER

1. Load `world/world.csv`.
2. Resolve each indexed type + name to its CSV file.
3. Render only enough CSV-described state to show the first fixture, without creating a parallel active-world state layer.
4. Finish the real Chrome read/resolve/render verification.
5. Establish the concrete Granite 350M WebApp machinery and prove one real fixed-shape JSON-in → JSON-out Granite call with no game authority attached.
6. Implement the smallest Resolver function required for the first operation against that proven Granite interface: relevant trusted CSV → exact bounded JSON parameters.
7. Feed the raw Granite return into the smallest Witness function required for that operation: exact untrusted JSON → accepted bounded CSV-backed result or rejection.
8. Feed the witnessed action proposal into ordinary deterministic game code and check current CSV-backed preconditions.
9. Write any permitted game-relevant mutation back into CSV-backed state.
10. Render the visible consequence from the changed CSV-backed state.
11. Construct the next interaction from that changed CSV-backed state.
12. Add the first concrete dialogue transformation only when the fixture reaches actual natural-language ingress/egress; use the rules in `docs/DIALOGUE_BOUNDARY.md` rather than building a generic conversation framework.
13. Add browser persistence only when surviving reload/restart is the operation being tested, and keep the persisted representation CSV-backed.

Do not build a general-purpose framework before these operations require one.

## FIRST TEST

One world.
One player.
One character whose operation calls Granite.
One Resolver package.
One Granite 350M JSON response.
One Witness acceptance/rejection.
One deterministic consequence decision.
One CSV state mutation when permitted.
One visible consequence.

## PASS CONDITION

The next interaction must operate correctly from the mutated CSV-backed state without hidden model memory or hidden game state.

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

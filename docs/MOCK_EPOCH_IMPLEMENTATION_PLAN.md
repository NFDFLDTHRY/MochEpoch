# MOCK EPOCH — IMPLEMENTATION PLAN

## QUESTION

Can a civilization-like game emerge from CSV world state + scoped Witness calls + Granite 350M JSON reasoning + deterministic game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## DESIGN

```text
PLAYER
  │
  ▼
GAME RUNNER
  │
  ▼
WORLD.CSV search list
  │
  ├─ type + name → character CSV
  ├─ type + name → object CSV
  └─ type + name → system CSV
  │
  ▼
decision required
  │
  ▼
WITNESS
scoped CSV caller + calling-packet constructor
  │
  ▼
ONE GRANITE CALLING PACKET
  ├─ world_descriptive_summation
  ├─ system_prompt
  ├─ current_situational_state
  └─ output_schema
  │
  ▼
GRANITE 350M
JSON → JSON
  │
  ▼
MODEL OUTPUT
  │
  ▼
IF / ELSE / THEN RESOLVER
  │
  ▼
GAME RUNNER
  │
  ▼
UPDATE CSV-BACKED STATE
  │
  ▼
NEXT WORLD
  └──────── LOOP
```

## WORLD RULES

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files are the inspectable factual state. Type + name resolve the file.

System prompts are CSV data. A prompt may belong to one character/entity or be shared by reference. Do not move prompts into executable code merely for convenience.

Witness is a class of scoped database-calling and packet-construction functions. It does not reason, interpret, or own state.

Each model call is one JSON packet containing the world descriptive summation, the relevant CSV system prompt, the current situational state, and the output JSON schema.

Granite is a one-shot JSON processing black box. It receives the packet and returns JSON.

The model output is fed into deterministic IF / ELSE / THEN code. Deterministic code decides what actually happens and which CSV-backed values change.

The renderer shows the committed world state. It must not become a second hidden source of truth.

Store facts and attributed events, not meta-interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar abstractions are intentionally outside the authoritative world state. Failure to produce civilization-like behavior is experimental evidence, not permission to add those abstractions. Only an explicit change to the research question should change that boundary.

## RUNTIME STATE

The CSV files committed under `world/` are the seed/default world and the human-inspectable shape of state.

A Chrome WebApp cannot directly rewrite repository files. Runtime code may therefore parse the CSVs into a mutable in-memory representation. When persistence is needed, save the active CSV-backed state using the simplest browser storage that works.

That runtime storage is not a second world model. The active world must remain serializable/exportable back to the same inspectable CSV shape, and the next Witness call must be constructed from the mutated active state.

Do not build a backend solely to make the repository CSV files writable.

## FIRST OPERATION

Use the smallest fixture that can prove the complete loop:

```text
world: one room
player: player
model character: Ada
object: stone
initial fact: Ada holds the stone
player event: ask Ada for the stone
model output schema: hand_over | wait
resolver: ordinary deterministic code
visible mutation: stone holder changes if the resolved result produces a transfer
```

The exact seed is disposable. It proves plumbing, not civilization.

## IMPLEMENTATION ORDER

1. Load `world/world.csv`.
2. Resolve each indexed type + name to its CSV file.
3. Create the active CSV-backed world state in memory.
4. Render only enough state to show the first fixture.
5. Implement `Witness` only far enough to construct the one complete Granite packet for Ada.
6. Make one real Granite 350M call in the target Chrome WebApp.
7. Parse the returned JSON.
8. Feed it into the smallest deterministic resolver for this fixture.
9. Mutate the relevant active CSV-backed state.
10. Render the visible consequence.
11. Construct the next interaction from that changed state.
12. Add browser persistence only when the experiment reaches the point where surviving reload/restart is the operation being tested.

Do not build a general-purpose framework before these operations require one.

## FIRST TEST

One world.
One player.
One model-controlled character.
One Witness call.
One Granite 350M JSON response.
One deterministic resolver.
One CSV state mutation.
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

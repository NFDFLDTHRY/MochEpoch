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
UPDATE CSV STATE
  │
  ▼
NEXT WORLD
  └──────── LOOP
```

## WORLD RULES

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files are the inspectable factual state. Type + name resolve the file.

System prompts are stored as CSV data.

Witness is a class of scoped database-calling and packet-construction functions. It does not reason, interpret, or own state.

Each model call is one JSON packet containing the world descriptive summation, the relevant CSV system prompt, the current situational state, and the output JSON schema.

Granite is a one-shot JSON processing black box. It receives the packet and returns JSON.

The model output is fed into deterministic IF / ELSE / THEN code. Deterministic code decides what actually happens and which CSV values change.

The renderer shows the committed world state. It must not become a second hidden source of truth.

Store facts and attributed events, not meta-interpretations. Do not add trust, morality, friendship, loyalty, resentment, civilization scores, or similar abstractions merely because a conventional game architecture might contain them.

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
3. Render enough of that state to show the first fixture.
4. Implement `Witness` only far enough to construct the one complete Granite packet for Ada.
5. Make one real Granite 350M call in the target Chrome WebApp.
6. Parse the returned JSON.
7. Feed it into the smallest deterministic resolver for this fixture.
8. Update the relevant CSV-backed state.
9. Render the visible consequence.
10. Start the next interaction from that changed state.

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

The next interaction must operate correctly from the mutated CSV state without hidden model memory or hidden game state.

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

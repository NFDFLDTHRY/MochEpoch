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
class functions for scoped CSV access + calling-packet construction
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

Witness is a class containing scoped CSV-access and packet-construction functions. It does not reason, interpret, or own state.

Each model call is one JSON packet containing the world descriptive summation, the relevant CSV system prompt, the current situational state, and the output JSON schema.

Granite is a one-shot JSON processing black box. It receives the packet and returns JSON.

The model output is fed into deterministic IF / ELSE / THEN code. Deterministic code decides what actually happens and which CSV-backed values change.

The first-person 3D renderer is a projection of the CSV-described world. It must not become a second source of gameplay state.

Store facts and attributed events, not meta-interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar abstractions are intentionally outside the authoritative world state. Failure to produce civilization-like behavior is experimental evidence, not permission to add those abstractions. Only an explicit change to the research question should change that boundary.

## CSV BACKING STATE

CSV files are the backing state of the game. There is no parallel active-world representation.

Do not maintain gameplay truth in JavaScript objects, Maps, an ECS, a state store, renderer objects, inventory managers, relationship graphs, NPC caches, model context, or any other runtime structure.

Game code is limited to:

1. the first-person 3D client that reads the CSV-described world and renders it;
2. CSV files containing world, entity, system, asset, and other game-relevant backing state; and
3. classes containing functions that read, resolve, or transform that CSV backing state.

Function classes do not own game state. Any game-relevant result that must survive an operation is represented back in CSV-backed state.

Assets are discovered through CSV manifests. The referenced resource may be any format required by the renderer or another backend, but asset identity, location, role, and game-relevant metadata belong in CSV.

Transient state is permitted only when specifically required by third-party backend machinery such as the browser, Three.js/WebGPU, model inference, decoding, or another explicitly used runtime. That transient machinery is never game authority and may not hold a game fact that exists nowhere in CSV.

A Chrome WebApp cannot directly rewrite repository files. This is a persistence problem, not permission to replace CSV with an in-memory game model. The later persistence mechanism must act as a storage substrate for CSV-backed documents. Repository CSV files may be seed/default state; runtime-mutated state must remain CSV-backed.

See `docs/CSV_BACKING_STATE.md` for the full hard boundary.

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
3. Render only enough CSV-described state to show the first fixture, without creating a parallel active-world state layer.
4. Finish the real Chrome read/resolve/render verification.
5. Establish the concrete Granite 350M WebApp machinery and prove one real fixed-shape JSON-in → JSON-out Granite call.
6. Only after the Granite call interface is proven, implement `Witness` as a class containing only the functions needed to gather scoped CSV state and construct the one complete Granite packet for Ada.
7. Feed the returned JSON into the smallest deterministic resolver for this fixture.
8. Write the resulting game-relevant mutation back into CSV-backed state.
9. Render the visible consequence from the changed CSV-backed state.
10. Construct the next interaction from that changed CSV-backed state.
11. Add browser persistence only when surviving reload/restart is the operation being tested, and keep the persisted representation CSV-backed.

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

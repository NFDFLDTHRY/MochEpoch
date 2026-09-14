# MochEpoch

Tiny Model Civilizations Browser Game.

## Question

Can a civilization-like game emerge from CSV world state + scoped Witness calls + Granite 350M JSON reasoning + deterministic game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## Design

```text
                         PLAYER
                           │
                           ▼
                    ┌─────────────┐
                    │ GAME RUNNER │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  WORLD.CSV  │
                    │ search list │
                    └──────┬──────┘
                           │
             type + name resolve state
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   character CSV      object CSV       system CSV
          └────────────────┼────────────────┘
                           │
                    decision required
                           │
                           ▼
                    ┌─────────────┐
                    │   WITNESS   │
                    │ scoped CSV  │
                    │ caller +    │
                    │ constructor │
                    └──────┬──────┘
                           │
                           ▼
        ┌─────────────────────────────────┐
        │ ONE GRANITE CALLING PACKET      │
        │                                 │
        │ world descriptive summation     │
        │ system prompt from CSV          │
        │ current situational state       │
        │ output JSON schema              │
        └────────────────┬────────────────┘
                         │
                         ▼
                   GRANITE 350M
                    JSON → JSON
                         │
                         ▼
                   MODEL OUTPUT
                         │
                         ▼
               IF / ELSE / THEN TREE
                         │
                         ▼
                  GAME RUNNER
                         │
                         ▼
            UPDATE CSV-BACKED STATE
                         │
                         ▼
                    NEXT WORLD
                         │
                         └───────── LOOP
```

## World rules

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files contain inspectable factual state. Type selects the folder and name selects the CSV state file.

System prompts are data inside relevant CSV state. They may be specific to one entity or shared by reference.

Witness only retrieves state and constructs one complete model call.

Granite only converts the supplied packet into the required JSON output.

Deterministic code decides what actually happens. The runner changes CSV-backed state and renders the resulting world.

Store facts and events, not interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar social abstractions are intentionally not authoritative game state. If the experiment fails to produce them, that failure is a result unless the research question itself is explicitly changed.

## Runtime state

The CSV files in `world/` are the inspectable seed/default world.

A Chrome WebApp may parse those CSVs into an active in-memory copy and, when persistence is needed, save that active copy using simple browser storage. Browser storage is persistence for the CSV-backed world, not a second hidden world model.

The active world must remain exportable/serializable back to the same inspectable CSV shape. Renderer state and model context do not become authoritative gameplay state.

## First test

One world. One player. One model-controlled character. One Witness call. One Granite 350M JSON response. One deterministic resolver. One CSV state mutation. One visible consequence.

The current seed uses one room, the player, Ada, and one stone held by Ada. The fixture exists only to prove the loop.

**Pass condition:** the next interaction operates correctly from the mutated CSV-backed state without hidden model memory or hidden game state.

## Current status

`index.html` and `app.js` implement the first read/resolve/render operation. The loader reads `world/world.csv` and its indexed files into one active CSV-backed representation: index rows and key/value maps keyed by `type/name`. Values remain CSV strings, including the prompt and output schema. Each render derives possession from the object's `holder_type` and `holder_name` fields.

Local read/resolve checks passed for the original seed, a changed stone holder, and a missing referenced file. The connected browser blocked the local URL, so the three visible browser checks remain unverified. See [the run evidence and remaining checks](evidence/read-render.md).

The next step is to finish those browser checks before beginning Witness. Witness, the real Granite call, the deterministic resolver, gameplay mutation, and persistence remain unimplemented. The complete first-test pass condition has not been established.

## Run locally

Serve the repository directory over local HTTP. For example, with Python 3 installed, run this from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765) in Chrome. The expected seed display is one room, player holding nothing, and Ada holding the stone. This command only serves the static files for a manual check; the application runs in the browser. Reload reads the seed CSVs again.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

No GitHub Actions or other metered hosted automation without explicit approval.

See [AGENTS.md](AGENTS.md) for implementation constraints and [docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md](docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md) for the current minimal build target.

## License and attribution

Apache License 2.0. See [LICENSE](LICENSE).

Copyright 2026 487bc LLC. See [NOTICE](NOTICE) for attribution information.

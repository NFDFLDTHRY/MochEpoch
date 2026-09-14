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
                 UPDATE CSV STATE
                         │
                         ▼
                    NEXT WORLD
                         │
                         └───────── LOOP
```

## World rules

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files contain inspectable factual state. Type selects the folder and name selects the CSV state file.

System prompts are data inside the relevant CSV.

Witness only retrieves state and constructs one complete model call.

Granite only converts the supplied packet into the required JSON output.

Deterministic code decides what actually happens. The runner changes CSV state and renders the resulting world.

Store facts and events, not interpretations. Do not encode social abstractions such as trust, morality, friendship, loyalty, or civilization scores unless an observed failure proves a concrete need for them.

## First test

One world. One player. One model-controlled character. One Witness call. One Granite 350M JSON response. One deterministic resolver. One CSV state mutation. One visible consequence.

The current seed uses one room, the player, Ada, and one stone held by Ada. The fixture exists only to prove the loop.

**Pass condition:** the next interaction operates correctly from the mutated CSV state without hidden model memory or hidden game state.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

No GitHub Actions or other metered hosted automation without explicit approval.

See [AGENTS.md](AGENTS.md) for implementation constraints and [docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md](docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md) for the current minimal build target.

## License

Apache License 2.0. See [LICENSE](LICENSE).

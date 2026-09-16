# MochEpoch

Tiny Model Civilizations Browser Game.

## Question

Can a civilization-like game emerge from CSV world state + scoped Witness calls + Granite 350M JSON reasoning + deterministic browser game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

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
                    │ class funcs │
                    │ CSV + packet│
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

Witness is a class containing only the ordinary functions needed for scoped CSV access and packet construction.

Granite only converts the supplied packet into the required JSON output.

Deterministic code decides what actually happens. The runner changes CSV-backed state and renders the resulting world.

Store facts and events, not interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar social abstractions are intentionally not authoritative game state. If the experiment fails to produce them, that failure is a result unless the research question itself is explicitly changed.

## CSV backing state

CSV files are the backing state of MochEpoch. There is no parallel active-world representation.

The first-person 3D client reads the CSV-described world and renders it. Classes may contain functions that read, resolve, or transform CSV-backed state, but class instances do not own game state.

MochEpoch game code must not maintain gameplay truth in JavaScript objects, Maps, an ECS, state stores, renderer objects, inventory managers, NPC caches, model context, or other parallel runtime structures.

Assets are also discovered through CSV manifests. The referenced asset resource may use whatever file format its renderer or backend requires, but the game's knowledge of that asset, its location, role, and game-relevant metadata belongs in CSV.

Transient state is permitted only when specifically required by third-party backend machinery such as the browser, Three.js/WebGPU, model inference, decoding, or another explicitly used runtime. That machinery is never gameplay authority.

A browser storage API may eventually be required to persist runtime mutations, but it must act as a storage substrate for CSV-backed documents rather than become another game-state model. Repository CSV files may be seed/default state; runtime-mutated state must remain CSV-backed.

See [docs/CSV_BACKING_STATE.md](docs/CSV_BACKING_STATE.md) for the hard state boundary and [docs/MODEL_ROLE.md](docs/MODEL_ROLE.md) for Granite's operational role.

## First test

One world. One player. One model-controlled character. One Witness call. One Granite 350M JSON response. One deterministic resolver. One CSV state mutation. One visible consequence.

The current seed uses one room, the player, Ada, and one stone held by Ada. The fixture exists only to prove the loop.

**Pass condition:** the next interaction operates correctly from the mutated CSV-backed state without hidden model memory or hidden game state.

## Current status

`index.html` and `app.js` implement the read/resolve/render probe. The CSV backing-state correction removed `activeWorld` and the parsed index/record Maps. The `CSV` class contains only static functions: CSV text, parser rows, and decoded fields are local computation during a call. The existing display reads through those functions; it is never read back as gameplay authority. This diagnostic display does not establish the first-person 3D client.

Local checks of the corrected CSV functions passed for the original seed, a changed stone holder using the same class and execution context, and a missing referenced file. All six CSV files matched an independent Python CSV read, including the quoted prompt/schema fields. Restoring the seed and creating a fresh execution context reproduced the original facts. These checks did not execute the browser entry point or renderer. See [the run evidence and remaining checks](evidence/read-render.md).

The earlier connected-browser attempt blocked the local URL. The subsequent Chrome run reached the commit-pinned GitHack URL, but GitHack returned its own 404 before the game loaded because the repository was private. The owner has now chosen to make MochEpoch public so the existing commit-pinned GitHack development path can be used directly. The three visible Chrome checks remain unverified until that visibility change is complete and the public snapshot is exercised.

Finish the real Chrome read/resolve/render verification before establishing the concrete Granite 350M WebApp call machinery. Witness functions are built only after that real Granite interface is proven. The deterministic resolver, gameplay mutation, and persistence remain unimplemented. The complete first-test pass condition has not been established.

## Development in Chrome through GitHack

MochEpoch's product target remains an installable WebApp browser game. GitHub holds source and version history. GitHack is temporary HTTPS delivery for running committed builds in Chrome. The application has no GitHack-specific code or runtime API dependency.

The development URL convention is:

```text
https://raw.githack.com/NFDFLDTHRY/MochEpoch/<full-commit-sha>/index.html
```

Use a full commit SHA and keep `index.html` at the repository root so its relative `app.js` and `world/` requests use the same committed snapshot. A reload reruns that snapshot. To test changed CSVs, commit the temporary variant on a test branch, open its new commit-pinned URL, and reload. Restore the original seed afterward. Reloading an old commit URL cannot pick up a newer commit.

GitHack serves source files with browser-appropriate content types and caches responses. Its HTML confirmation may appear before the game: verify the repository and commit, then choose **Open the page**. See [GitHack's delivery and caching documentation](https://raw.githack.com/).

This path requires source files that GitHack can retrieve without GitHub account credentials. Do not put credentials into a GitHack URL.

No helper, build system, backend, manifest, or service worker is needed for this development URL. Installability will be tested in its own later operation.

## Run locally

Serve the repository directory over local HTTP. For example, with Python 3 installed, run this from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765) in Chrome. The expected seed display is one room, player holding nothing, and Ada holding the stone. This command only serves the static files for a manual check; the application runs in the browser.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

No GitHub Actions or other metered hosted automation without explicit approval.

See [AGENTS.md](AGENTS.md) for implementation constraints and [docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md](docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md) for the current minimal build target.

## License and attribution

Apache License 2.0. See [LICENSE](LICENSE).

Copyright 2026 487bc LLC. See [NOTICE](NOTICE) for attribution information.
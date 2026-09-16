# MochEpoch

Tiny Model Civilizations Browser Game.

## Question

Can a civilization-like game emerge from CSV world state + bounded Resolver/Granite/Witness transformations + deterministic browser game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## Core model boundary

Every model stage uses the same primitive:

```text
CSV-BOUNDED TRUSTED STATE
        ↓
     RESOLVER
CSV → bounded JSON parameters
        ↓
 GRANITE(stage)
   JSON → JSON
        ↓
UNTRUSTED JSON RESULT
        ↓
      WITNESS
JSON → CSV-bounded trusted result or REJECT
```

Each Granite call is one transformation from a game-defined bounded population of possibilities.

Resolver projects the CSV-bounded state needed for that stage into JSON. Granite performs one JSON → JSON transformation and is reset at call end with respect to game truth. Witness validates that one return against the stage's allowed structure and converts it back into CSV-bounded trusted structure or rejects it.

If another stage is needed, it starts again from CSV-bounded state through Resolver. There are no special Witness modes or hidden conversation state.

Granite is a function used by the game. It has no game authority, direct CSV access, hidden world memory, or permission to execute consequences.

See [docs/MODEL_ROLE.md](docs/MODEL_ROLE.md) for the model contract and [docs/DIALOGUE_BOUNDARY.md](docs/DIALOGUE_BOUNDARY.md) for human/NPC communication rules.

## World rules

`world/world.csv` is the current search list for what exists or matters.

Referenced CSV files contain inspectable factual state. Type selects the folder and name selects the CSV state file.

System prompts are data inside relevant CSV state. They may be specific to one entity or shared by reference.

CSV files are the backing state of MochEpoch. There is no parallel active-world representation.

The first-person 3D client reads the CSV-described world and renders it. Classes may contain functions that read, resolve, validate, or transform CSV-backed state at explicit operation boundaries, but class instances do not own game state.

MochEpoch game code must not maintain gameplay truth in JavaScript objects, Maps, an ECS, state stores, renderer objects, inventory managers, NPC caches, model context, or other parallel runtime structures.

Assets are discovered through CSV manifests. The referenced asset resource may use whatever file format its renderer or backend requires, but the game's knowledge of that asset, its location, role, and game-relevant metadata belongs in CSV.

Transient JSON is operational structure only. Any game-relevant result that must survive an operation belongs back in CSV-backed state.

Store facts and attributed events, not designer interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar abstractions are intentionally not authoritative game state. If the experiment fails to produce them, that failure is a result unless the research question itself is explicitly changed.

See [docs/CSV_BACKING_STATE.md](docs/CSV_BACKING_STATE.md) for the hard state boundary.

## Dialogue

Dialogue is a sequence of repeated `Resolver → Granite → Witness` transformations, not one chatbot turn.

```text
Human → NPC
INTAKE → CHECK → COMMIT

NPC → Human
COMPOSE → CHECK → EMIT

NPC → NPC
COMPOSE → CHECK → EMIT
actual utterance crosses
INTAKE → CHECK → COMMIT
```

Every named stage above is independently:

```text
Resolver → Granite(stage) → Witness
```

`CHECK` is mandatory wherever human- or Granite-produced language can influence a later semantic/game stage. Checker asks whether the utterance is coherently matchable, even if imprecisely or factually incorrectly, to the possibilities represented by the corresponding bounded packet.

Checker does not decide objective truth. A false statement about a grounded stone may be valid; automotive-engine discourse is invalid if nothing in the packet corresponds to automotive machinery.

NPC-to-NPC communication crosses the actual emitted utterance. The receiving NPC never gets the sender's hidden structured intent. `intended X → said Y → interpreted Z` is allowed, including `X ≠ Z`.

## First test

One world. One player. One game-controlled character whose decision path may call Granite. One stone. One bounded action result. One deterministic consequence. One visible mutation.

The current seed uses one room, the player, Ada, and one stone held by Ada. Ada is game-controlled; Granite is an ordinary function used by her configured decision path.

**Pass condition:** the next interaction operates correctly from the resulting CSV-backed state without hidden model memory or hidden game state.

## Current status

`index.html` and `app.js` implement the read/resolve/render probe. The CSV backing-state correction removed `activeWorld` and the parsed index/record Maps. The `CSV` class contains only static functions: CSV text, parser rows, and decoded fields are local computation during a call. The existing display reads through those functions; it is never read back as gameplay authority. This diagnostic display does not establish the first-person 3D client.

The real Chrome read/resolve/render milestone passes on public commit-pinned GitHack snapshots:

1. original seed rendered player holding nothing and Ada holding the stone;
2. a disposable branch changing only `stone.csv` holder from Ada to player rendered player holding the stone and Ada holding nothing; and
3. a disposable branch removing `stone.csv` kept the world hidden and displayed `Could not load world: world/objects/stone.csv: HTTP 404`.

These browser checks establish the current CSV read/reference-resolution/projection behavior. They do not establish a Granite call, Resolver/Witness runtime machinery, gameplay mutation, persistence, or the complete first-test loop.

The next executable operation is to establish the concrete Granite 350M WebApp machinery and prove one real fixed-shape JSON-in → JSON-out call with no game authority attached. Only after that interface is proven should the first operation-specific Resolver and Witness functions be implemented.

## Development in Chrome through GitHack

MochEpoch's product target remains an installable WebApp browser game. GitHub holds source and version history. GitHack is temporary HTTPS delivery for running committed builds in Chrome. The application has no GitHack-specific code or runtime API dependency.

The development URL convention is:

```text
https://raw.githack.com/NFDFLDTHRY/MochEpoch/<full-commit-sha>/index.html
```

Use a full commit SHA and keep `index.html` at the repository root so its relative `app.js` and `world/` requests use the same committed snapshot. A reload reruns that snapshot. To test changed CSVs, commit the temporary variant on a test branch, open its new commit-pinned URL, and reload. Reloading an old commit URL cannot pick up a newer commit.

GitHack serves source files with browser-appropriate content types and caches responses. Its HTML confirmation may appear before the game: verify the repository and commit, then choose **Open the page**.

No helper, build system, backend, manifest, or service worker is needed for this development URL. Installability will be tested in its own later operation.

## Run locally

Serve the repository directory over local HTTP. For example, with Python 3 installed, run this from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765` in Chrome. The expected seed display is one room, player holding nothing, and Ada holding the stone. This command only serves the static files for a manual check; the application runs in the browser.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

No GitHub Actions or other metered hosted automation without explicit approval.

See [AGENTS.md](AGENTS.md) for implementation constraints and [docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md](docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md) for the current minimal build target.

## License and attribution

Apache License 2.0. See [LICENSE](LICENSE).

Copyright 2026 487bc LLC. See [NOTICE](NOTICE) for attribution information.

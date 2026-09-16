# MochEpoch

Tiny Model Civilizations Browser Game.

## Question

Can a civilization-like game emerge from CSV world state + bounded Resolver/Granite/Witness transformations + deterministic browser game execution, without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## Core model boundary

```text
TRUSTED CSV-BACKED STATE
        ↓
     RESOLVER
CSV → bounded JSON parameters
        ↓
 GRANITE(operation)
   JSON → JSON
        ↓
UNTRUSTED JSON RESULT
        ↓
      WITNESS
JSON → bounded CSV-backed result or REJECT
        ↓
TRUSTED CSV-BACKED STRUCTURE AGAIN
```

Resolver is outbound from the game world. It resolves only the trusted CSV-backed state permitted for the current operation and constructs Granite's bounded JSON parameters.

Granite is a function used by the game: `parameters → Granite → return value`. It has no game authority, direct CSV access, hidden world memory, or permission to execute consequences. Every Granite return is untrusted.

Witness is inbound to the game world. It validates a raw Granite return against the exact schema, references, scope, identities, and authority permitted for the operation, then produces only the allowed CSV-backed structure or rejects the result.

A witnessed result becoming trusted means it is legal game structure. It does not mean a spoken claim is true or a model interpretation is correct.

If a witnessed result proposes a world consequence, deterministic game code checks the current authoritative CSV state and applies any permitted mutation. Granite never commits world state directly.

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

Human and NPC dialogue uses the same trust primitive: `Resolver → Granite → Witness`.

The primitive does not reverse. What changes is whether language is entering the structured game world or being composed for delivery out of it.

Human-to-NPC intake uses the human utterance as explicitly labeled external input plus the recipient's bounded CSV context. Granite may propose a structured interpretation; Witness accepts or rejects it into CSV-backed communication structure.

NPC-to-human composition starts from trusted NPC-side communicative structure in CSV. Granite may propose surface language; Witness accepts or rejects the utterance into dialogue CSV before deterministic delivery.

NPC-to-NPC communication must traverse the actual delivered utterance. Do not give a recipient another NPC's hidden structured intention. `intended X → said Y → interpreted Z` is allowed, including X ≠ Z.

Checker/coherence calls are also ordinary Granite calls. Their returns are untrusted until Witness accepts them. They are local to the transformation being checked and must not become an omniscient truth engine or enforce perfect communication.

Speech is an attributed event, not automatically a world fact. Lies, mistakes, ambiguity, and misunderstanding remain possible.

## First test

One world. One player. One character whose operation calls Granite. One Resolver package. One Granite 350M JSON response. One Witness acceptance/rejection. One deterministic consequence decision. One CSV state mutation when permitted. One visible consequence.

The current seed uses one room, the player, Ada, and one stone held by Ada. The fixture exists only to prove the loop.

**Pass condition:** the next interaction operates correctly from the mutated CSV-backed state without hidden model memory or hidden game state.

## Current status

`index.html` and `app.js` implement the read/resolve/render probe. The CSV backing-state correction removed `activeWorld` and the parsed index/record Maps. The `CSV` class contains only static functions: CSV text, parser rows, and decoded fields are local computation during a call. The existing display reads through those functions; it is never read back as gameplay authority. This diagnostic display does not establish the first-person 3D client.

The real Chrome read/resolve/render milestone now passes on public commit-pinned GitHack snapshots:

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

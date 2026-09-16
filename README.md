# MochEpoch

Tiny Model Civilizations Browser Game.

## Question

Can a civilization-like first-person game emerge from CSV-backed world truth, bounded JSON transformations, human/NPC behavior, and deterministic consequences without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## The game in one line

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

CSV-backed state is the authoritative continuing world/history/configuration.

JSON is temporary operational structure.

The harness that performs this transition is not a subsystem inside the game. It is the game's state-transition lifecycle.

Rendering and assets project that world for the human. They are not independent sources of game truth.

See [docs/GAME_BLUEPRINT.md](docs/GAME_BLUEPRINT.md) for the complete architectural blueprint.

## Core lifecycle

For an actor-mediated operation:

```text
TRUSTED CSV WORLD
        ↓
resolve relevant world + function configuration
        ↓
bounded JSON packet
        ↓
NPC or HUMAN
(action and/or natural-language dialogue)
        ↓
JSON expression/result
        ↓
map / validate against the CSV-defined world
        ↓
write accepted actor expression/event to CSV-backed state
        ↓
deterministic game resolution where a physical consequence is required
        ↓
write resulting durable facts/events to CSV
        ↓
TRUSTED CSV WORLD'
```

The player or an NPC may lie, misunderstand, contradict themselves, make a bad decision, attempt an impossible action, use strange wording, cooperate, refuse, or otherwise behave unpredictably. That behavioral variation is part of the experiment.

The harness does not decide whether behavior is sensible, moral, truthful, socially appropriate, or optimal. It asks what the behavior corresponds to in the currently represented world. Language or behavior cannot create new game ontology merely by mentioning it.

Semantic validity and physical success are separate. An actor can validly express `hand_over(stone)` even when deterministic mechanics later reject the physical consequence because the actor no longer holds the stone.

## Function graph

A game operation may look like a small tree/DAG of generic function calls over CSV-backed references.

CSV-backed configuration may select/reference the operation, function/system, Granite/model resource, actor/world inputs, system prompt, bounded populations, output shape, and next function edge as real execution requires.

Generic functions execute the graph. They do not own game state or become a second game-specific runtime architecture.

The exact function-graph schema is intentionally not fixed before executable operations prove it.

## Granite

Granite is used like another game function:

```text
parameters → Granite → return value
```

Its job is to generate or evaluate actions and natural-language dialogue against the finite behavioral possibilities exposed by the current CSV-described world.

Granite does not own an NPC, own world state, read arbitrary CSV directly, decide objective truth, execute physical consequences, mutate arbitrary world state, or carry hidden game truth between calls.

One Granite transformation uses:

```text
CSV-backed world / bounded transient input
        ↓
RESOLVER
        ↓
bounded JSON parameters
        ↓
GRANITE(stage)
        ↓
untrusted JSON result
        ↓
WITNESS
        ↓
bounded transient result or REJECT
```

`CSV-bounded` means constrained to possibilities defined from trusted CSV. It does not mean the intermediate is itself authoritative CSV-backed state.

Trust returns to the game only when the completed accepted result is admitted into CSV-backed state.

See [docs/MODEL_ROLE.md](docs/MODEL_ROLE.md) for the model contract.

## Player and NPC symmetry

The player and NPCs enter the same behavioral boundary.

NPC behavior may use Granite to generate/evaluate actions or dialogue from a bounded current possibility-space.

Human behavior enters as external action/dialogue and may use Granite when fuzzy mapping or natural-language interpretation is actually required.

Direct deterministic controls do not need Granite merely because Granite exists.

## Communication

Natural-language communication may require several bounded Granite transformations.

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

Every named stage is the same primitive:

```text
Resolver → Granite(stage) → Witness
```

Intermediate stage results are bounded transient structures, not authoritative CSV-backed world state.

Completed communication returns through the harness into CSV-backed factual/attributed state. Recording `A said Y` makes the speech event authoritative, not the proposition inside `Y` objectively true.

`CHECK` asks whether language is coherently matchable to the corresponding bounded world packet. It does not decide objective truth. Lies, mistakes, ambiguity, deception, contradiction, and misunderstanding are allowed when language remains grounded in the supplied possibilities.

NPC-to-NPC communication crosses the actual emitted utterance. Preserve `A candidate expression X → said Y → B interpreted Z`, including `X ≠ Z`.

See [docs/DIALOGUE_BOUNDARY.md](docs/DIALOGUE_BOUNDARY.md) for the communication contract.

## CSV backing state

CSV is the only authoritative game backing state. There is no parallel active-world representation.

MochEpoch game code must not maintain authoritative gameplay truth in JavaScript objects, Maps, an ECS, state stores, renderer objects, inventory managers, NPC caches, model context, or other parallel runtime structures.

If a game-relevant fact/event must survive the current operation, it needs a CSV-backed representation.

If something exists only to turn those facts into pixels, sound, animation, GPU work, inference, or another backend representation, it is rendering/resource machinery rather than independent game truth.

The concrete CSV topology is intentionally not fixed in advance. World assets and mechanics reveal the smallest correct backing structure as they are built and forced through the actual lifecycle.

The current fixture uses `world/world.csv` as its search list for what exists or matters. In the current probe, each `type,name` entry resolves the corresponding CSV-backed record. That is the current executable arrangement, not a promise that the finished game's backing topology must keep the same file-per-name shape.

The backing state must eventually be able to describe the game-relevant world categories actual mechanics require: world/space, actors, physical actor state, natural resources/objects, built structures, actions/transformations, factual/attributed events/history, system/function/model configuration, and asset/resource references. These are ontology categories, not a preselected ECS or file-per-entity schema.

See [docs/CSV_BACKING_STATE.md](docs/CSV_BACKING_STATE.md) for the hard state boundary and [docs/GAME_BLUEPRINT.md](docs/GAME_BLUEPRINT.md) for the backing-state discovery rules and world categories.

## Rendering and assets

The first-person 3D renderer is a projection of the CSV-described world.

Game assets are discovered through CSV-backed references/manifests. Referenced models, textures, audio, shaders, model weights, generators, and other resources may use whatever format their backend requires.

Scene objects, meshes, GPU buffers, animation mixers, particles, shadows, fog, camera internals, renderer caches, and backend handles are disposable runtime machinery unless a corresponding game fact is represented in CSV.

Destroying and rebuilding renderer/model runtime machinery must not destroy or alter a continuing game fact/event.

## No encoded civilization

Store factual state and attributed events, not designer interpretations.

Do not add authoritative trust, morality, friendship, loyalty, resentment, faction sentiment, civilization scores, or similar social abstractions merely because they seem useful.

A settlement may emerge because the world eventually contains factual houses, paths, stored food, tools, fields, people, speech events, construction, exchanges, conflict, cooperation, and other consequences. No `civilization = true` variable is required.

Failure to produce civilization-like behavior is valid experimental evidence.

## First test

One world. One player. One game-controlled character whose decision path may call Granite. One stone. One bounded action result. One CSV-backed actor event. One deterministic consequence. One CSV-backed world mutation. One visible consequence.

The current seed uses one room, the player, Ada, and one stone held by Ada. `world/world.csv` is the current seed search list. Ada is game-controlled; Granite is an ordinary function used by her configured decision path.

**Pass condition:** the next interaction operates correctly from the resulting authoritative CSV-backed state without hidden model memory or hidden game state.

## Current status

`index.html` and `app.js` implement the read/resolve/render probe. The current display reads through stateless CSV functions and is never read back as gameplay authority. This diagnostic display does not establish the first-person 3D client.

The real Chrome read/resolve/render milestone passes on public commit-pinned GitHack snapshots:

1. original seed rendered player holding nothing and Ada holding the stone;
2. a disposable branch changing only `stone.csv` holder from Ada to player rendered player holding the stone and Ada holding nothing; and
3. a disposable branch removing `stone.csv` kept the world hidden and displayed `Could not load world: world/objects/stone.csv: HTTP 404`.

These checks establish current CSV read/reference-resolution/projection behavior. They do not establish a Granite call, actor-event write, gameplay mutation, persistence, or the complete first-test loop.

The next executable operation is to establish the concrete Granite 350M WebApp machinery and prove one real bounded JSON-in → JSON-out call. Then build the thinnest actual CSV → JSON → Granite → JSON → CSV path the proven interface requires. Do not freeze future world/ECS/packet schemas before execution reveals them.

## Development in Chrome through GitHack

MochEpoch's product target remains an installable WebApp browser game. GitHub holds source and version history. GitHack is temporary HTTPS delivery for running committed builds in Chrome. The application has no GitHack-specific runtime dependency.

The development URL convention is:

```text
https://raw.githack.com/NFDFLDTHRY/MochEpoch/<full-commit-sha>/index.html
```

Use a full commit SHA and keep `index.html` at the repository root so its relative `app.js` and `world/` requests use the same committed snapshot.

## Run locally

Serve the repository directory over local HTTP. For example:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765` in Chrome.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

Do not add frameworks, services, schemas, subsystems, or abstractions because they might be useful later.

No GitHub Actions or other metered hosted automation without explicit approval.

See [AGENTS.md](AGENTS.md) for implementation constraints and [docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md](docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md) for the current minimal build target.

## License and attribution

Apache License 2.0. See [LICENSE](LICENSE).

Copyright 2026 487bc LLC. See [NOTICE](NOTICE) for attribution information.

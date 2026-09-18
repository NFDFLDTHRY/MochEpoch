# MochEpoch

Tiny Model Civilizations Browser Game.

## Required team control prompts

Read [AGENTS.md](AGENTS.md) before repository work. Opus must read
[Opus_readme.md](Opus_readme.md); Grok Bot must read
[GrokBot_readme.md](GrokBot_readme.md), using current `main` even when their task
branch is older. These files define development roles and handoffs. Codex handles
implementation and integration; Opus reviews read-only; Grok builds assigned
runtime-debugging patches and regression checks.

## Question

Can a civilization-like first-person game emerge from CSV-backed world truth, scoped JSON transformations, human/NPC behavior, and deterministic consequences without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization?

## The game in one line

```text
CSV → JSON → NPC / HUMAN → JSON → CSV
```

CSV-backed state is the authoritative continuing world/history/configuration.

JSON is temporary operational structure.

The harness that performs this transition is not a subsystem inside the game. It is the game's state-transition lifecycle.

Rendering and assets project that world for the human. They are not independent sources of game truth.

See [docs/GAME_BLUEPRINT.md](docs/GAME_BLUEPRINT.md) for the architectural blueprint.

## Core lifecycle

For an actor-mediated transition:

```text
AUTHORITATIVE CSV WORLD
        ↓
Witness resolves scoped CSV and constructs a JSON packet when Granite is needed
        ↓
NPC or HUMAN behavior
        ↓
JSON expression/result where applicable
        ↓
local deterministic handling
        ↓
CSV facts/history actually produced, if any
        ↓
AUTHORITATIVE CSV WORLD'
```

The human or NPC may lie, misunderstand, contradict themselves, make a bad decision, attempt an impossible action, use strange wording, cooperate, refuse, or otherwise behave unpredictably. That variation is part of the experiment.

The harness does not decide whether behavior is sensible, moral, truthful, socially appropriate, optimal, or likely to succeed.

Language or behavior cannot create authoritative world ontology by mention alone.

## “Operation” is just descriptive wording

Project documents sometimes use `operation`, `current operation`, and `operation-local` to mean the concrete game code path or state transition being executed.

That does not imply an `Operation` class/object, operation context, caller object, request envelope, dispatcher token, operation registry, or operation identifier.

Ordinary functions can call Witness and other functions with only the references/parameters they actually need. Do not add operation metadata to CSV or JSON unless executable work proves it necessary.

## “Packet” is just the Granite call JSON

`Packet`, `calling packet`, and `Witness packet` mean the one transient JSON object supplied to a single Granite call.

The term does not imply a packet class, header/body protocol, payload wrapper, transport layer, fixed top-level fields, universal packet schema, stored packet record, caller metadata, or operation metadata.

Witness simply builds that one JSON object from the scoped CSV-derived values/configuration the concrete call needs.

## Scoped does not mean behavior-whitelisted

Witness gives Granite a scoped slice of CSV-backed world/configuration plus whatever prompt/resource information and call-specific output guidance the concrete call actually uses.

That does not require actors to choose from a universal finite behavior menu.

The current fixture's `hand_over | wait` output enum and `output_schema` key are local test configuration, not MochEpoch's general behavior ontology or a universal Granite-call requirement.

A different concrete call may use a different schema, a prompt convention, parser-specific output, or no explicit output-schema mechanism at all.

Granite or a human may produce arbitrary language or behavior. Concrete game code only consumes what it understands.

## Function graph

The harness may look tree-shaped or DAG-shaped during a particular game path because several CSV references/functions feed one result. Repeated transitions form the larger game graph.

That is an execution shape, not a required graph data structure.

Do not infer a universal operation record, graph table, routing table, next-edge field, node schema, output-population table, output-schema field, or graph executor.

The current fixture proves only a narrow relationship:

```text
Ada decision_system = interaction
interaction.csv supplies system_prompt + output_schema
```

Add more CSV-backed call/configuration references only when real executable behavior proves they are needed.

## Useful execution views

These are descriptions, not runtime operation types:

```text
projection:      CSV → renderer / audio / UI

deterministic:   CSV → deterministic function → CSV

actor-mediated: CSV → JSON when needed → NPC / HUMAN
                → JSON when needed → local deterministic handling → CSV
```

Do not create an operation-type enum, dispatcher, scheduler, class hierarchy, operation object, or orchestration layer merely to encode those descriptions.

## Witness

Witness is the scoped CSV → JSON Granite-call constructor.

It retrieves only the CSV-backed state/configuration needed for the current call and constructs the one transient JSON object Granite receives.

That object is the Witness/calling packet. It is not a wrapper around another hidden payload.

Witness owns no game state. It does not inspect Granite output, decide consequences, repair output, or mutate CSV.

There is no required separate Resolver subsystem.

Witness does not require a caller/current-operation object, operation id/context, packet metadata, `output_schema`, or return-constraint field merely because another call has one.

## Granite

Granite is used like another game function:

```text
JSON parameters → Granite → JSON return
```

Its job is to generate or evaluate actor actions and natural-language dialogue from the scoped CSV-backed world/context supplied in one call packet and return JSON in whatever concrete form the executing game code actually uses.

An explicit JSON Schema, enum, grammar, constrained decoder, or other return-shape mechanism is optional local machinery, not a universal Granite contract.

Granite does not own an NPC, own world state, read arbitrary CSV directly, choose its own scope, decide objective truth, execute physical consequences, mutate CSV, or carry hidden game truth between calls.

## Return handling is local to the real game path

There is no universal semantic mapper, acceptance stage, `REJECT` state, generic validator, or `accepted game representation` layer.

For the current fixture the return path can be as small as:

```text
Granite → {"action":"hand_over"}
        ↓
parse this fixture's expected JSON
        ↓
run hand_over mechanic
        ↓
check current CSV facts
        ↓
write holder change OR no world change
```

That fixture parser exists because `interaction.csv` explicitly defines an `output_schema`. It is not evidence that every Granite call needs schema validation or structured-output machinery.

If the return cannot be consumed by the concrete game code, there is no authoritative CSV write and the failed run is evidence.

See [docs/MODEL_ROLE.md](docs/MODEL_ROLE.md) for the model contract.

## Player and NPC symmetry

The player and NPCs enter the same behavioral boundary.

NPC behavior may use Granite to generate/evaluate actions or dialogue from scoped current CSV-backed world/context.

Human behavior enters as external action/dialogue and may use Granite when fuzzy interpretation or natural-language transformation is actually required.

Direct deterministic controls do not need Granite merely because Granite exists.

## Communication

Natural-language communication is not a separate dialogue architecture. It uses the same actor-mediated harness.

There is no mandatory `INTAKE → CHECK → COMMIT`, `COMPOSE → CHECK → EMIT`, or other fixed stage graph.

Start with the smallest transformation that completes the real interaction. Add another transformation, retry, check, or correction pass only when execution demonstrates a concrete need.

For NPC-to-NPC communication, the actual utterance crosses between actors. Never replace what was actually said with hidden sender-side structured data.

If later game behavior needs to know that `A said Y`, persist that occurrence as CSV-backed factual history. Recording it makes the occurrence factual, not the proposition inside `Y` objectively true.

See [docs/DIALOGUE_BOUNDARY.md](docs/DIALOGUE_BOUNDARY.md).

## CSV backing state

CSV is the only authoritative game backing state. There is no parallel active-world representation.

MochEpoch game code must not maintain authoritative gameplay truth in JavaScript objects, Maps, an ECS, state stores, renderer objects, inventory managers, NPC caches, model context, or other parallel runtime structures.

If a game-relevant fact/history item must survive the current executing path, it needs a CSV-backed representation.

If something exists only to turn those facts into pixels, sound, animation, GPU work, inference, or another backend representation, it is rendering/resource machinery rather than independent game truth.

The concrete CSV topology is intentionally not fixed in advance. World assets and mechanics reveal the smallest correct backing structure as they are built and forced through the actual lifecycle.

The backing state must eventually be able to describe the game-relevant world categories actual mechanics require: world/space, actors, physical actor state, natural resources/objects, built structures, actions/transformations, optional factual history, system/function/model configuration, and asset/resource references.

These are ontology categories, not a preselected ECS or file-per-entity schema.

See [docs/CSV_BACKING_STATE.md](docs/CSV_BACKING_STATE.md).

## Rendering and assets

The first-person 3D renderer is a projection of the CSV-described world.

Game assets are discovered through CSV-backed references/manifests. Referenced models, textures, audio, shaders, model weights, generators, and other resources may use whatever format their backend requires.

Scene objects, meshes, GPU buffers, animation mixers, particles, shadows, fog, camera internals, renderer caches, and backend handles are disposable runtime machinery unless a corresponding game fact is represented in CSV.

## No encoded civilization

Store factual state and factual/attributed history the game actually needs, not designer interpretations.

Do not add authoritative trust, morality, friendship, loyalty, resentment, faction sentiment, civilization scores, or similar social abstractions merely because they seem useful.

A settlement may emerge because the world eventually contains factual houses, paths, stored food, tools, fields, people, construction, exchanges, conflict, cooperation, speech/history where needed, and other consequences. No `civilization = true` variable is required.

Failure to produce civilization-like behavior is valid experimental evidence.

## First test

One world. One player. One game-controlled character whose decision path may call Granite. One stone. One Witness call. One real Granite JSON return. One local deterministic consumer. One deterministic mechanic. One CSV-backed world mutation. One visible consequence.

The current seed uses one room, the player, Ada, and one stone held by Ada. Ada is game-controlled; Granite is an ordinary function used by her configured decision path.

No event log, graph table, operation object/context/type enum, packet envelope/protocol, universal output-schema layer, return-mapping layer, rejection state, or actor-history record is required for this first fixture unless the run itself demonstrates a need.

**Pass condition:** the next interaction operates correctly from the resulting authoritative CSV-backed state without hidden model memory or hidden game state.

## Current status

`index.html` and `app.js` implement the read/resolve/render probe. The current display reads through stateless CSV functions and is never read back as gameplay authority. This diagnostic display does not establish the first-person 3D client.

The real Chrome read/resolve/render milestone passed on public commit-pinned GitHack snapshots:

1. original seed rendered player holding nothing and Ada holding the stone;
2. a disposable branch changing only `stone.csv` holder from Ada to player rendered player holding the stone and Ada holding nothing; and
3. a disposable branch removing `stone.csv` kept the world hidden and displayed `Could not load world: world/objects/stone.csv: HTTP 404`.

These checks establish current CSV read/reference-resolution/projection behavior. They do not establish a Granite call, Witness packet, actor-mediated gameplay mutation, persistence, or the complete first-test loop.

The next executable operation means the next concrete experiment/state transition, not a runtime Operation object. It is to establish the concrete Granite 350M WebApp machinery and prove one real scoped JSON-in → JSON-out call. That proof should use only whatever output convention the real runtime and smallest test actually require; it does not need a structured-output or schema layer merely because the current game fixture has `output_schema`.

Then build the thinnest actual:

```text
CSV → Witness JSON → Granite → JSON → local deterministic handling → CSV
```

path the proven interface requires.

Do not freeze future world/ECS/packet-envelope/dialogue/history/output-schema/operation-context structures before execution reveals them.

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

`Define operation` means define the concrete behavior/state transition being tested, not create an Operation runtime abstraction.

Do not add frameworks, services, schemas, subsystems, or abstractions because they might be useful later.

No GitHub Actions or other metered hosted automation without explicit approval.

See [AGENTS.md](AGENTS.md) for implementation constraints and [docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md](docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md) for the current minimal build target.

## License and attribution

Apache License 2.0. See [LICENSE](LICENSE).

Copyright 2026 487bc LLC. See [NOTICE](NOTICE) for attribution information.

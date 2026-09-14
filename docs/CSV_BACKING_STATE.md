# MochEpoch CSV backing-state boundary

This document is an architectural constraint for MochEpoch.

## Hard rule

CSV files are the backing state of the game.

There is no second game-state representation.

The game client may render the world, and code may transform the CSV backing state, but MochEpoch game code must not maintain a parallel in-memory world model, ECS, state store, object graph, inventory store, relationship graph, NPC state cache, or other hidden gameplay state.

If a game-relevant fact matters after an operation, it belongs in CSV-backed state.

## CSV and JSON boundary

A useful mechanical analogy is DNA and RNA:

- CSV is the DNA: the durable backing state that persists, can be inspected, matched, compared, and deterministically transformed.
- JSON is the RNA: a transient operational expression or transport package produced for a particular operation.

This is an analogy only. Do not import biological machinery, genetics, replication rules, mutation rules, or other biological semantics into the game architecture.

Dynamic JSON is not backing state. A JSON package may be constructed from CSV-backed facts, passed to Granite or another operation, returned from Granite, compared, validated, or otherwise handled, and then discarded when that operation is complete.

If a JSON result affects the continuing game world, deterministic game functions must resolve that result against the relevant CSV-backed facts, references, schemas, and game-defined populations as applicable. Only the resulting CSV transformation becomes continuing game state.

Do not let a JSON object, parsed JavaScript object, model response, message payload, or transport structure become authoritative merely because it exists during an operation.

Any game-relevant JSON field must be grounded by the CSV backing appropriate to that field. Dynamic natural-language payloads may exist inside JSON packages, but their presence does not turn the JSON package into backing state.

The core relationship is:

CSV persists. JSON expresses or transports an operation. Deterministic functions compare and operate against CSV. Accepted consequences return to CSV.

## Allowed game-code shape

MochEpoch game code is limited to these roles:

1. A first-person 3D client that reads the CSV-described world and renders it.
2. CSV files that describe the world, systems, entities, assets, and other game-relevant backing state.
3. Classes that exist only to contain functions which read, resolve, or transform that CSV backing state.

A function class does not own game state. Its functions operate on CSV-backed state and any game-relevant result of an operation must be represented back in CSV.

Do not introduce a fourth game-state layer.

## Renderer boundary

The renderer is a projection of CSV state, not a state container.

The 3D renderer may use transient buffers, handles, scene objects, caches, workers, or other internal machinery only when required by the browser, Three.js/WebGPU, or another explicitly used third-party backend. That backend-required transient machinery must never become authoritative gameplay state and must never contain a game fact that exists nowhere in CSV.

MochEpoch game code must not create its own transient gameplay state for convenience.

If the rendering machinery is discarded and rebuilt from the CSV backing state, the same game world must be recoverable.

## Asset boundary

Game assets are also discovered through CSV.

An asset manifest in CSV identifies the asset, its role, and the resource that contains it. The referenced asset file itself may use whatever format the renderer or other backend requires, such as a 3D model, texture, audio file, shader, binary model, or other resource.

The asset file is a referenced resource. The game's knowledge that the asset exists, where it is located, and any game-relevant metadata about it belongs in CSV.

Game code should resolve assets from the CSV manifest rather than hard-code an independent asset registry.

## Runtime persistence

The fact that a browser cannot rewrite files in a Git repository does not authorize a non-CSV runtime world model.

The eventual browser persistence mechanism is a storage substrate for the CSV backing state. Whatever browser API is selected later must preserve the world as CSV-backed documents rather than becoming a second authoritative state representation.

Do not solve browser persistence by creating an active JavaScript world model and treating CSV as merely import/export format.

Repository CSV files may serve as seed/default state. Runtime-mutated state must still remain CSV-backed.

## Third-party machinery exception

Transient state is permitted only when it is specifically required by third-party backend machinery used to execute or render the game, such as rendering, browser runtime, model inference, decoding, or similar external machinery.

This exception does not permit MochEpoch game logic to store gameplay facts in that transient machinery.

## Reconstruction test

At any point, the continuing game world must be reconstructable from the CSV backing state plus the referenced asset/resource files.

Discarding renderer internals, model runtime internals, caches, workers, function-class instances, and transient JSON packages must not destroy or alter a game fact.

## Implementation instruction

Before changing world-state handling, rendering state, assets, persistence, NPC state, inventory, JSON handling, or other game-state machinery, read this document.

Do not import a conventional game-engine state architecture into MochEpoch. If an implementation appears to require non-CSV game state, stop and identify the concrete requirement before adding it.

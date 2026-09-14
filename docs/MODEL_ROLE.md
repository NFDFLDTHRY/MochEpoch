# Granite role and experimental framing

This document records the operational framing that must be preserved while building MochEpoch. It does not state the experiment's hidden hypothesis or predicted result.

## Structural model role

MochEpoch does not treat Granite as an intelligent agent, NPC brain, world model, or source of meaning.

For this project, Granite is treated as a statistical structural transformer: supplied structure goes in and a probable supplied-shape structure comes out. The model is useful because it can match and transform learned structural patterns. Intelligence is not assigned to the model by the game architecture.

Language is treated operationally as structure. Words do not need intrinsic semantic content for MochEpoch to work. Definitions recurse through other words and relationships, so the game should not invent a separate hidden semantic layer merely to explain language processing.

This is an operational design stance for the experiment. Do not replace it with generic "AI agent," "NPC brain," or model-as-reasoner assumptions.

## Fixed-shape transformation workload

Granite is invoked at specific transformation boundaries. Calls are independent and stateless with respect to game truth. Any facts required for a call must be supplied from the external inspectable world state.

The JSON packages used by a given operation have game-defined shape and semantics. Field values change according to game-defined populations, but the model is not asked to invent a new protocol from call to call.

Granite therefore acts primarily as a reducer: it receives a bounded structured package and reduces or transforms it into the required smaller structured result.

Natural language is a field population handled inside this structural machinery, not a separate conversational architecture.

## JSON is operational, CSV is backing state

Granite input and output JSON packages are transient operational structures. They are not game state.

The DNA/RNA analogy used by this project is mechanical only: CSV is the durable backing state; JSON is the temporary expression or transport package for a particular operation.

A Granite packet may be built from CSV-backed facts and a Granite result may propose or describe an operation, but neither becomes authoritative by existing. If a Granite result affects the continuing world, deterministic game functions must compare and resolve it against the relevant CSV backing and write the accepted consequence into CSV-backed state.

Do not create model-owned state, JSON-owned state, or a second runtime world model around Granite. Do not literalize the DNA/RNA analogy into biological mechanics.

See `docs/CSV_BACKING_STATE.md` for the hard state boundary.

## Natural-language communication uses separate Granite calls

Player-to-NPC communication and NPC-to-player communication are not one Granite run.

A player-to-NPC ingress call receives the player's natural-language communication inside the defined JSON input package and transforms it into the structured JSON ingress required by the NPC process. That Granite invocation ends before the NPC process runs.

After NPC/game processing, NPC-to-player egress uses a separate Granite invocation. That call transforms the NPC-side structured package into the natural-language reply presented to the player and the required small structured JSON update package or packages.

Do not collapse these boundaries into a single chatbot-style prompt/response turn. Granite is not the NPC. The NPC/game process exists between the two model invocations.

## World and consequence boundary

Granite does not own world state, memory, motives, relationships, permissions, or consequences. It does not become authoritative merely because natural language passes through it.

Authoritative world state remains external, inspectable, and CSV-backed. Deterministic game code decides what actually happens. If prior events or communication matter to a later Granite call, they must reach that call through inspectable game state rather than hidden model memory.

## Witness is only a class

Witness is not an agent, service, subsystem, framework, query language, memory layer, policy layer, or semantic engine.

Witness is a class containing the small set of ordinary functions needed to perform scoped CSV access and construct Granite calling packets for the current operation. Add functions only when an observed operation requires them.

Do not design the Witness functions against an imagined Granite interface. First establish the concrete Granite WebApp machinery and real call shape. Then make the Witness class functions feed that proven interface.

## Preserve the experiment

Do not add semantic abstractions, conversational memory, hidden model state, relationship scores, or model-centered interpretations of intelligence because they seem conceptually useful.

The deeper hypothesis being tested by MochEpoch is intentionally unspecified here. Do not infer it, encode it, or optimize the implementation toward a presumed conclusion. Preserve the apparatus and let observed runs establish what emerges.

# MochEpoch architecture closure

status: CLOSED
closed_against_main: 8dfde456c59c36318f2bdab6fa4f9e44a105907c
closed_on: 2026-09-16

This file records the end of the architecture-audit phase. It is not a new architecture layer. `docs/GAME_BLUEPRINT.md` remains the architectural blueprint.

## Closure basis

The agreed project blueprint and current repository agree on the following invariants:

1. The authoritative lifecycle is `CSV → JSON → NPC / HUMAN → JSON → CSV`.
2. CSV-backed state is the only continuing game truth/history/configuration.
3. `world/world.csv` is the current fixture search list for what exists or matters; the current `type,name` lookup is fixture plumbing, not a frozen final topology.
4. Witness retrieves only the scoped CSV-backed state/configuration required for one Granite call and constructs the one transient JSON object supplied to that call.
5. Granite is only the JSON → JSON transformation for the supplied call. It does not own world state, actor state, objective truth, persistence, rendering, or physical consequence.
6. Deterministic game code decides what actually happens and writes only the resulting game-relevant facts/history that must persist back into CSV-backed state.
7. System prompts and other game-specific call configuration that must persist belong in CSV-backed data. The current `interaction.csv` prompt/schema are fixture-local configuration.
8. Store factual state and factual/attributed history when the game actually needs it. Do not encode designer interpretations such as trust, morality, friendship, loyalty, resentment, faction sentiment, or civilization scores.
9. Human and NPC behavior may remain chaotic. The harness is not a behavior-correction, truth, morality, or strategy system.
10. The first complete fixture remains one world, one player, one game-controlled character, one Witness call, one real Granite result, one deterministic return-handling/mechanic path, one CSV-backed world mutation, and one visible consequence.
11. The pass condition remains that the next interaction operates correctly from the mutated CSV-backed state without hidden model memory or hidden authoritative runtime state.

## Terminology reconciliation

The original blueprint's phrase `deterministic resolver` means the concrete deterministic code that consumes the Granite result, applies the relevant mechanic, and decides the resulting CSV transition. It does not require the separate `Resolver` subsystem that was previously introduced and then removed during the audit.

Likewise:

- `operation` is descriptive English for a concrete executing path/state transition, not an Operation runtime object;
- `packet` / `calling packet` is the one transient JSON object supplied to one Granite call, not a packet protocol or envelope framework;
- `output_schema` is current fixture configuration, not a universal Granite requirement;
- `function graph` describes the shape produced by ordinary references/function calls, not a required stored graph/routing system.

## Closure result

The final closure sweep found no remaining contradiction between the agreed blueprint and the current authoritative architecture documents that requires another architecture rewrite.

The current executable repository still establishes only the CSV read/resolve/render probe. It does not yet establish a real Granite call, a real Witness call, actor-mediated CSV mutation, browser persistence, or the complete first-test loop.

## Stop rule

Do not continue vocabulary-by-vocabulary architecture auditing.

Reopen architecture only when at least one of these occurs:

- the user changes the research question or blueprint;
- executable evidence contradicts a current invariant;
- the next concrete implementation cannot be completed without machinery that conflicts with the blueprint; or
- two current authoritative repository documents materially contradict each other.

Absent one of those triggers, the next work is executable, not architectural.

## Next executable work

Establish one real Granite 350M browser/WebApp JSON-in → JSON-out call, save the actual evidence, then build only the thinnest Witness and deterministic CSV-return path that the proven interface requires.

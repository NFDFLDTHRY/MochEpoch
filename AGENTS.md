# MochEpoch implementation rules

## Read first

Read [README.md](README.md) and [the implementation plan](docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md) before changing the project. Check the current files and evidence before deciding which gate is complete.

Use the user's latest project instructions and established Mock Epoch decisions. Do not import requirements or machinery from unrelated projects.

## Preserve the question

The experiment asks whether civilization-like behavior can emerge from factual CSV state, scoped Witness calls, Granite 350M decisions, and deterministic execution without programming social abstractions.

Do not narrow the project into a schema demonstration or present the first stone fixture as the whole game. Use that fixture to prove the smallest complete loop.

## Keep authority explicit

- `world/world.csv` indexes what exists or matters. Resolve type to folder and name to CSV.
- Facts, prompts, and output schemas live in the relevant CSVs. Distinguish instructions from factual state.
- Witness retrieves only the permitted scope and constructs one complete calling packet.
- The packet contains the world description, CSV system prompt, situational state, and output JSON schema together.
- Granite proposes a JSON action. It cannot write files, create world facts, or execute effects.
- The runner validates references, output structure, and physical preconditions, then commits CSV and renders the committed result.
- Reconstruct every gameplay value needed by the next interaction from saved CSV and fixed executable rules.
- Reset model conversation and generation context between decisions. Loaded weights do not constitute gameplay memory.
- Diagnostic evidence must not become an undeclared source of gameplay state.
- Preserve the distinction between seed CSVs and the player's active save.

## Work by experiment

1. State the question and observable result.
2. Build the smallest missing operation.
3. Run it on the stated environment.
4. Save inputs, outputs, errors, and consequences.
5. Try to break the path that was exercised.
6. Report what the evidence establishes and what remains unresolved.

Add machinery only for a documented failure or demonstrated limitation. Start with plain HTML and JavaScript modules. Avoid speculative frameworks, social-stat systems, general rule engines, memory services, model-training pipelines, and schedulers.

## Evidence discipline

- Never mark model loading, API advertisement, a synthetic response, or source validation as successful real inference.
- Distinguish real generation, synthetic resolver tests, and replay of previously recorded output.
- Keep unsuccessful attempts, invalid responses, and valid no-ops.
- A valid `wait` does not satisfy the first test's mutation requirement.
- Reject malformed or illegal output without silently repairing it or inventing a replacement action.
- Record the model/revision, runtime/backend, generation settings, executable revision, input CSV, packet, raw output, resolver result, and committed CSV.
- Preserve observed events with attribution. Do not store trust, friendship, morality, loyalty, or civilization scores as factual state.
- Keep Gate 0 through Gate 3 pending until evidence establishes their individual conditions.

## Checks and changes

Run `python3 scripts/check_seed.py` (or `npm run check`) after changing the plan or seed data. This checks the initial fixture; it is not the runtime's world loader or a model test.

Keep the prompt and schema in `world/systems/interaction.csv` aligned with the plan's complete packet. Do not keep another editable prompt in executable code.

When a later experiment deliberately changes the fixture, update its documented operation and the applicable checks together. Do not silently weaken checks to hide a failure.

Keep code, plans, and small experimental evidence in version control. Keep model weight downloads, generated build output, and local active saves out of Git.

Finish reports with the question, the run/evidence, what was established, and what remains unresolved.

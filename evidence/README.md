# Experiment evidence

Evidence exists to answer the operation being tested, not to create a reporting framework.

Evidence files are historical records of what a particular run established at a particular repository state. They are not architectural authority and may describe superseded code or next steps. Current architecture comes from `AGENTS.md` and the authoritative documents under `docs/`, led by `docs/GAME_BLUEPRINT.md`.

For a Granite-backed actor operation, save only what is needed to establish what actually happened:

- relevant authoritative CSV-backed state before the operation;
- the actual Witness packet constructed from scoped CSV-backed input;
- the raw Granite output or error;
- the deterministic parse/map/accept/reject result;
- any factual/attributed actor expression/event only if the operation actually persisted one;
- the deterministic game consequence, if any;
- relevant authoritative CSV-backed state after the operation; and
- a visible capture when the experiment has a visible consequence.

Witness is the outbound CSV → JSON call constructor. Do not report a separate Resolver subsystem or an inbound Witness validation stage unless real executable code later establishes such machinery for a concrete reason.

For communication, preserve the actual utterance that crossed between speakers, any CSV-backed attributed communication history actually persisted, and only the transient JSON/model-call material needed to diagnose the run. Do not invent a history record merely for evidence.

Failed runs are evidence too. Do not silently normalize, repair, reinterpret, or discard them.

Do not treat a source check, model download, API advertisement, synthetic response, example packet, or render-only demonstration as proof that inference, deterministic mapping/resolution, CSV mutation, persistence, or the complete actor-mediated lifecycle worked.

No required directory hierarchy, report template, CI job, hosted automation, or evidence framework is part of the system. Add structure only if accumulated runs become difficult to inspect manually.

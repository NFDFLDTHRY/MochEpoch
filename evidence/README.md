# Experiment evidence

Evidence exists to answer the operation being tested, not to create a reporting framework.

Evidence files are historical records of what a particular run established at a particular repository state. They are not architectural authority and may describe superseded code or next steps. Current architecture comes from `AGENTS.md` and the authoritative documents under `docs/`, led by `docs/GAME_BLUEPRINT.md`.

For a Granite-backed actor operation, save only what is needed to establish what actually happened:

- relevant authoritative CSV-backed state before the operation;
- the actual transient JSON call data Witness constructed from scoped CSV-backed input;
- the raw Granite output or error;
- the operation-local deterministic handling actually performed on that return;
- any factual/attributed actor expression/history only if the operation actually persisted one;
- the deterministic game consequence, if any;
- relevant authoritative CSV-backed state after the operation; and
- a visible capture when the experiment has a visible consequence.

`Packet` is only shorthand for the transient JSON data/arguments actually supplied to one Granite call. Evidence should not invent or imply a universal packet envelope, header, metadata block, payload wrapper, packet id, version field, actor field, call field, or packet schema unless the executed call really had it.

Witness is the outbound CSV → JSON call constructor. Do not report a separate Resolver subsystem, inbound Witness validation stage, generic return mapper, acceptance layer, rejection protocol, or packet protocol unless real executable code later establishes such machinery for a concrete reason.

For communication, preserve the actual utterance that crossed between speakers, any CSV-backed attributed communication history actually persisted, and only the transient JSON/model-call material needed to diagnose the run. Do not invent a history record merely for evidence.

Failed runs are evidence too. If a concrete operation cannot consume a Granite return, record that failure and the absence of an authoritative CSV write. Do not silently normalize, repair, reinterpret, or discard it.

Do not treat a source check, model download, API advertisement, synthetic response, example JSON object, or render-only demonstration as proof that inference, operation-local return handling, CSV mutation, persistence, or the complete actor-mediated lifecycle worked.

No required directory hierarchy, report template, CI job, hosted automation, or evidence framework is part of the system. Add structure only if accumulated runs become difficult to inspect manually.
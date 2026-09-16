# Experiment evidence

Evidence exists to answer the operation being tested, not to create a reporting framework.

Evidence files are historical records of what a particular run established at a particular repository state. They are not architectural authority and may describe superseded code or next steps. Current architecture comes from `AGENTS.md` and the authoritative documents under `docs/`, led by `docs/GAME_BLUEPRINT.md`.

For a Granite-backed actor operation, save only what is needed to establish what actually happened:

- relevant authoritative CSV-backed state before the operation;
- the bounded JSON packet produced by Resolver;
- the raw Granite output or error;
- the Witness result or rejection;
- the accepted CSV-backed actor expression/event, if the boundary succeeded;
- the deterministic game consequence, if any;
- relevant authoritative CSV-backed state after the operation; and
- a visible capture when the experiment has a visible consequence.

For multi-stage communication, preserve the actual utterance that crossed between speakers, the CSV-backed attributed communication event/result, and enough bounded transient stage output to diagnose the run. Do not treat transient intermediates as authoritative world state.

Failed runs are evidence too. Do not silently normalize, repair, reinterpret, or discard them.

Do not treat a source check, model download, API advertisement, synthetic response, example packet, or render-only demonstration as proof that inference, actor-event admission, deterministic consequence, or gameplay mutation worked.

No required directory hierarchy, report template, CI job, hosted automation, or evidence framework is part of the system. Add structure only if accumulated runs become difficult to inspect manually.

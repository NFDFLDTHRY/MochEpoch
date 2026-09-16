# Experiment evidence

Evidence exists to answer the operation being tested, not to create a reporting framework.

For a Granite-backed operation, save only what is needed to establish what actually happened:

- relevant authoritative CSV-backed state before the operation;
- the bounded JSON packet produced by Resolver;
- the raw Granite output or error;
- the Witness result or rejection;
- the deterministic game consequence, if any;
- relevant authoritative CSV-backed state after the operation, if it changed; and
- a visible capture when the experiment has a visible consequence.

For multi-stage communication, preserve the actual utterance that crossed between speakers and enough bounded transient stage output to diagnose the run. Do not treat those intermediates as authoritative world state.

Failed runs are evidence too. Do not silently normalize, repair, reinterpret, or discard them.

Do not treat a source check, model download, API advertisement, synthetic response, example packet, or render-only demonstration as proof that inference or gameplay mutation worked.

No required directory hierarchy, report template, CI job, hosted automation, or evidence framework is part of the system. Add structure only if accumulated runs become difficult to inspect manually.

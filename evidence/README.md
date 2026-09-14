# Experiment evidence

Evidence exists to answer the experiment being run, not to create a reporting system.

For a run, save only what is needed to establish what happened:

- relevant CSV state before the call
- the complete Witness calling packet
- the raw Granite output or error
- the deterministic resolver result
- relevant CSV state after the resolver
- a visible capture when the experiment has a visible consequence

Failed runs are evidence too. Do not silently normalize, repair, or discard them.

Do not treat a source check, model download, API advertisement, synthetic response, or example packet as proof that inference or gameplay worked.

No required directory hierarchy, report template, CI job, or hosted automation is part of the evidence system. Add structure only if accumulated runs become difficult to inspect manually.

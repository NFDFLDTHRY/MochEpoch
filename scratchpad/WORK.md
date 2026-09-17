# Claptrap crash isolation result

proposal_id: 20260917-claptrap-crash-isolation
status: COMPLETE
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
code_commit: 7d6d8fb7cfe4299ce1346c5dd73bf6c4151be6a0
remaining_gate: target-phone trials; crash cause and stabilization repair unresolved

## Changed

Implemented the approved separate diagnostic page and optional worker diagnostics.
It replays the same recorded CPU input in three fresh runtimes: CPU alone, both
sessions loaded before CPU generation, and GPU generation before the fixed CPU
input. It checks the messages, rendered prompt, and token count before inference.

The worker waits for successful diagnostic checkpoint writes before loading and
generation, reports token progress and tensor cleanup, and observes an existing
GPU device's loss promise when exposed. Diagnostic files are separate from the
chat conversation and evidence. The default chat still loads both q4 sessions.
Model/runtime versions, template, sampling, response length, and retrieval rules
are unchanged.

The two original exports are published byte-for-byte. The user explicitly
approved publication if no personal identifiers were present. Inspection found
no names, contact details, locations, credentials, or unique device IDs. Only
model text, timestamps, generic runtime/browser metadata, and the public
experiment URL were present. The earlier automatic-review blocker is resolved.

## Executed results

Eighteen synthetic checks pass, including checkpoint gating and failed writes,
fixed-input replay, explicit retrieval, restoration, and conversation-file
separation. Syntax and whitespace checks passed.

The published CPU-only trial executed in cloud Chrome. The recorded 351-token
input matched; one generation produced all 100 conversational tokens in
80,089.30 ms, with no retrieval, and completed tensor cleanup. The JSON export
arrived and was verified despite a browser download-event timeout. Reload
restored all 36 saved events and the exact generated output without inference.
The actual parsed export and verification details are committed in
experiments/granite-single-ort-dual-session/claptrap-chat/evidence/stability-checks-20260917.json.

Main and the locked architecture remain unchanged. No crash cause, memory leak,
OOM, or successful stabilization repair is claimed. The cloud has no WebGPU
adapter; it cannot run the two GPU trials.

## Smallest next operation

Run the published stability.html on the phone: trial 1, reload, trial 2, reload,
trial 3. Export each result. After a crash, reload the same page and export the
restored trial. Compare the saved phases before selecting a runtime change.
The real 100-response, 50-CPU/50-GPU conversation remains outstanding.

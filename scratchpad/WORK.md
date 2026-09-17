# Claptrap crash isolation result

proposal_id: 20260917-claptrap-crash-isolation
status: IN_PROGRESS
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
code_commit: 7d6d8fb7cfe4299ce1346c5dd73bf6c4151be6a0
remaining_gate: repair and verify incomplete exports from the approved diagnostic collector

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

## Received phone evidence

The user supplied all three trial exports. They were inspected for personal
identifiers and retained as exact UTF-8 text with verified byte counts and
SHA-256 values in the existing stability-checks evidence file. No new runtime
change has been made from these observations.

All three exports have status running, no error, and no completed result:

- CPU alone: CPU loaded; the exact 351-token input was saved in generation-start
  at 17:59:39.523 UTC. No first-token progress was recorded.
- Both loaded, then CPU: the last saved event is CPU model transfer at 21.90%,
  at 17:59:51.583 UTC. No GPU load is recorded.
- GPU generation, then CPU: both sessions loaded and runtime-ready was saved
  at 18:00:23.707 UTC. No generation-start is recorded.

These snapshots cannot distinguish export during execution from a crash,
manual reload, or another interruption. Their filenames contain trial creation
times, not export times. Missing later events do not prove they never happened.

## Operator correction and reproduced collector defects

The user reports that the evidence collector stopped before the tasks completed.
These uploads must not be described as three reported Chrome crashes or blamed
on early manual export. The exact phone collector failure is absent from the
old export format.

Two defects were reproduced synthetically against the published controller:
an injected save failure produces a FAILED page while the exported file still
says running with no error; and export during a held final write returns the
older running file despite a generated response, until that write completes.

Reopen the same approved diagnostic work to repair these defects. Expected
files remain stability.js, stability.html, checks.mjs,
evidence/stability-checks-20260917.json, VERIFICATION.md, and this WORK.md.
No model/runtime, prompts, topology, or normal chat changes are part of this
collector repair. Final export will await queued saves, while a clearly labeled
incomplete checkpoint remains available. Failed persistence must be visible and
downloadable from the current in-memory diagnostic record without pretending
that it was saved. No automatic retry or inference after a failed checkpoint.

Run focused slow-write and rejected-write checks, then verify real CPU generation,
export, and reload in the available browser. The original phone instability
and full 100-response conversation remain unresolved.

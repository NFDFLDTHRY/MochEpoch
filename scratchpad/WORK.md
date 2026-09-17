# Claptrap crash isolation proposal

proposal_id: 20260917-claptrap-crash-isolation
status: IN_PROGRESS
approval: User approved this exact repository-recorded plan in the active Work conversation on 2026-09-17.
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
base_commit: c97649d213bc78340b4388a6bed200bf96bb135e
baseline_code_commit: 37aef813ac2490a87325dca66377eef41ac4a594

## Question

Does the recorded CPU turn fail by itself, with an idle GPU session resident,
or only after GPU generation? Locate the failing phase before choosing a
memory/runtime change.

## Current observations and limits

The supplied pre-crash export records both q4 sessions resident in one worker,
one completed GPU response (100 generated tokens, approximately 14.04 seconds),
then CPU turn 2 beginning with 351 input tokens. It contains no completed CPU
response or error. The later screenshot shows Chrome's Aw, Snap page, without
an error code. The export predates that screenshot; it does not identify the
last operation before the crash.

Model loading reports 575,914,563 bytes of files per session. This is file size,
not measured RAM consumption. Memory pressure, a runtime fault, and a graphics
driver fault remain hypotheses. The diagnostic export is only 30,210 bytes;
there is no evidence here of a large accumulated transcript.

Source inspection shows sequential generation and no cross-turn cache input.
The pinned Transformers.js successful-return path disposes GPU cache tensors;
CPU tensor lifetime relies on ordinary object reclamation. This does not
measure memory reclamation or prove that the phone leaked memory.

A targeted synthetic worker check confirms that generation starts without any
acknowledgement that its start event was persisted. Existing browser checks
establish a missing WebGPU adapter in the cloud environment. The current chat
UI requires both sessions before generation, so no isolated CPU generation was
executed in that browser.

Main remains be56f62590be8897f479f33b84877fb3a7f98f13. Its blueprint blob is
5a3e9ae1a5e0d3bcc058ffab599c7cb8d65f0945, matching the architecture lock.
Relevant local authority files match the fetched main tree.

## Proposed operation

Add one separate diagnostic page that reuses the existing worker and the
supplied input. Each test starts in a fresh page/worker:

1. Load CPU only; replay the exact recorded CPU turn-2 input.
2. Load CPU then GPU; replay that identical CPU input before GPU generation.
3. Load CPU then GPU; replay the recorded GPU turn-1 input, then replay the
   identical recorded CPU turn-2 input.

The CPU input remains fixed in all three tests. The third test does not replace
it with the new GPU output. This is a runtime replay, not a conversational run
or a behavioral comparison.

Preserve the pinned model, q4 artifacts, runtime, rendered tool template,
timestamps, greedy decoding, 100 conversational tokens, and local retrieval
rules. Each CPU replay has the same single saved CSV row available only through
explicit retrieval. The GPU replay begins with no saved conversation.

Persist phase checkpoints and acknowledge their successful writes before
session loading and each generation. Record the first emitted token and
progress every ten raw generated tokens, generation return, and completion of
the existing tensor cleanup. Progress posts are best-effort; a renderer crash
can prevent later events reaching storage. Capture ordinary worker/runtime
errors and an existing runtime GPU device's loss event if that device is
exposed. Do not create another GPU device to observe it.

Use separate diagnostic OPFS files and provide restore/export controls. Keep
the actual chat CSV and evidence intact. Report unavailable memory APIs as
unavailable; never label JS heap readings as total process/GPU memory.

## Exact anticipated files

Paths below are relative to
experiments/granite-single-ort-dual-session/claptrap-chat/:

- runtime-worker.js: optional diagnostic initialization of selected lanes,
  checkpoint acknowledgement, and bounded generation progress; retain the
  chat's default single-worker/two-resident-session behavior.
- stability.html: three labeled diagnostic trials and evidence export.
- stability.js: fixed-input replay, deterministic CSV retrieval, separate
  checkpoint persistence, and restoration/export.
- checks.mjs: targeted tests of checkpoint ordering, rejected writes, identical
  CPU inputs across trials, and separation from conversation storage.
- evidence/phone-precrash-20260917.json: exact supplied diagnostic export.
- evidence/phone-precrash-20260917.csv: exact supplied conversation export.
- evidence/stability-checks-20260917.json: only executed local/browser check
  results, explicitly distinguishing synthetic checks from model inference.
- VERIFICATION.md: findings, diagnostic instructions, and unresolved device gate.

Also update scratchpad/WORK.md with actual results after approved work.

## Verification and success

Verify that a blocked/failed checkpoint write prevents inference. Compare
replayed message text, timestamp, template output and token count against the
supplied record. Confirm diagnostic trials cannot overwrite the conversation
files. Run the CPU-only trial in the available browser once the diagnostic
control exists; its result is cloud-WASM evidence only. Run the three trials
on the phone to distinguish isolated CPU failure, combined residency failure,
and failure following GPU work.

Success for this proposal is a trustworthy saved boundary and a controlled
reproduction or discriminating outcome, not a claim that stability is fixed.
A successful probe does not replace the outstanding real 100-response,
50-CPU/50-GPU conversation run.

Do not change model precision, backend, prompts, output length, sampling,
runtime version, or the two-resident-session baseline as a speculative fix.
Do not add automatic retry, behavior correction, a new service, CI, or hosting.
Choose the smallest actual stabilization change from the resulting evidence.

## Approval received

The user confirmed that the repository-recorded plan is approved. Implementation
is complete within the files and scope above; eighteen synthetic checks pass.

Automatic approval review previously blocked publication of the two uploaded
exports. On 2026-09-17 the user explicitly approved adding the evidence to this
public repository if no personal identifiers are present. Inspection of every
unique string found model-generated text, the public experiment URL, timestamps,
and generic browser/runtime metadata. There are no names, contact details,
locations, credentials, or unique device identifiers. The supplied bytes are
preserved. This resolves the recorded publication blocker.

The CPU-only browser trial and target-phone trials remain unexecuted. No crash
cause or stabilization success is claimed. Publication and CPU testing are next.

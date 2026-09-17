# Claptrap experiment completion

proposal_id: 20260917-claptrap-completion
status: IN_PROGRESS
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
base_commit: 8f9e86f36177f4525edbd80a54650e696405bf95

## Authorization and scope

Continuation of the existing committed Claptrap experiment plan. The active user
instruction is: "Figure out where Sol stalled. The claptrap experiment is your's
to complete now." This supersedes this conversation's earlier read-only request.
The user also confirmed 50 CPU plus 50 GPU conversational responses, excluding
the seed. Proceed under that explicit completion instruction; this record does
not approve unrelated work or reopen the rejected Site experiment.

## Operation

Complete and verify the existing single-worker, shared-runtime, dual-q4-session
conversation experiment. Offer native search_conversation during the actor turn,
with extra inference only following an actual emitted tool call, rather than
discarding a compulsory preliminary generation. Keep exactly 100 conversational
tokens per completed turn; native tool tokens are separately recorded. Keep
fresh turn inputs, no cross-turn KV cache, exact keyword retrieval, and CSV-only
conversation memory. Repair evidence restoration and preserve saved rows on
startup/failure.

Expected files:

- scratchpad/WORK.md: this handoff and final result.
- experiments/granite-single-ort-dual-session/claptrap-chat/runtime-worker.js:
  actor/tool execution and call-local tensor cleanup.
- experiments/granite-single-ort-dual-session/claptrap-chat/main.js:
  CSV appends/retrieval, controls, evidence persistence, completion checks.
- experiments/granite-single-ort-dual-session/claptrap-chat/index.html:
  accurate runtime/progress state and safe saved-run controls.
- experiments/granite-single-ort-dual-session/claptrap-chat/turn-boundary.js:
  small pure helpers for this fixture's native token boundary and CSV handling.
- experiments/granite-single-ort-dual-session/claptrap-chat/checks.mjs:
  local checks of isolation, retrieval, token accounting, save ordering, failures.
- experiments/granite-single-ort-dual-session/claptrap-chat/VERIFICATION.md
  and evidence/: actual checks, source trace, and browser observation.

## Verification and limits

The locked blueprint blob matches
5a3e9ae1a5e0d3bcc058ffab599c7cb8d65f0945. Architecture documents and lock stay fixed.
Current main remains authoritative; experiment work stays on its existing branch.

Run focused local boundary/failure checks, syntax checks, and actual browser
startup/export/reload checks. Do not describe synthetic model fixtures as real
Granite behavior. Do not claim a completed 100-turn phone run without its CSV
and machine evidence.

Observed before edits: the original build loaded CPU q4 in this cloud browser,
then WebGPU session creation reported no GPU adapter. No conversation ran here.
This environment limitation does not negate the user's successful dual-residency
phone evidence and does not authorize replacing GPU with CPU.

## Implementation checkpoint

The native-tool turn path, CSV save/reload boundary, and evidence recovery are
implemented. Eleven synthetic plumbing checks and the actual pinned Jinja /
StoppingCriteria API checks pass. Source and evidence are being published on the
existing experiment branch for live page verification. A real 100-turn target
device run remains outstanding; the available cloud browser has no GPU adapter.

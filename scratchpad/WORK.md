# Claptrap collector repair and completed phone trials

proposal_id: 20260917-claptrap-crash-isolation
status: COMPLETE
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
code_commit: a21b07a2a454bff6db3dc457547e88330f4c6466
remaining_gate: original Chrome crash cause, full conversation endurance, and multicore CPU performance unresolved

## Operator correction

The user reported that the evidence collector stopped before the tasks completed.
The three prior phone exports are not three reported Chrome crashes. Their exact
bytes and the user's correction are retained in the existing evidence file.

## Reproduced and repaired

Synthetic execution of the published collector reproduced two defects: a save
failure exported the stale running file without its error, and a pending final
write allowed an older running snapshot to be exported after a response existed.

Repaired stability.js and stability.html within the approved diagnostic scope:
final export waits until the trial completes or fails and queued saves settle;
a separate live checkpoint remains downloadable during a storage stall; a failed
save provides an explicitly unsaved report containing the error and received
events. Saved-event and pending-write counts are visible. Exports identify time,
source, outcome, and save status. No storage retry or inference continuation after
a rejected checkpoint is added. Existing files remain readable.

Worker/runtime code, prompts, sampling, token budget, model precision, dual
residency, and the normal conversation are unchanged by this collector repair.
Main and the locked architecture remain unchanged.

## Executed checks

Twenty-one synthetic checks pass. They cover rejected writes before inference,
a write failure during a turn, and a stalled final write with a live export.
Syntax and whitespace checks pass.

A real cloud CPU-only replay with the repaired collector completed the identical
351-token input and 100-token response in 79,877.60 ms. A live export at 23 events
was labeled unfinished; collection continued after download. The final export
contained all 36 events, zero pending writes, and a complete result. The live
23-event record exactly matched its prefix. Both downloaded files were verified,
and reload restored the exact full event list and output. The browser's download
event notifications timed out, although the actual files arrived.

Reproduction results, source hashes, and real browser exports are retained in
experiments/granite-single-ort-dual-session/claptrap-chat/evidence/stability-checks-20260917.json.

## Completed phone evidence

All three subsequent phone trials at the repaired code commit completed and
exported fully committed final snapshots, with no recorded error or pending
write. Their exact bytes and hashes are retained in the existing evidence file.
The collector-on-phone gate is now satisfied for these trials.

CPU alone generated 100 tokens in 164.95 seconds; CPU with the GPU loaded and
idle took 169.87 seconds. In the third trial, the WebGPU session generated 100
tokens in 27.60 seconds, followed by CPU generation in 172.12 seconds. Every CPU
input and output token sequence matched across conditions. GPU output matched
the original phone's first turn. The two sessions generated sequentially.

The CPU configuration explicitly forces one WASM inference thread. The phone
reports eight logical processors, no cross-origin isolation, and no shared
array buffer. Multicore performance has not been tested. GPU and CPU inputs
differ, and diagnostic writes affect timing, so these are not controlled
CPU/GPU speed comparisons. No runtime or hosting configuration was changed
while recording these results.

## Smallest next operation

The original Chrome crash remains unexplained; all short replays succeeded.
Full 100-response conversation endurance remains outstanding. CPU performance
work would first require a scoped proposal for a cross-origin-isolated serving
environment and an identical-input thread-count comparison. Increasing a
number alone cannot enable threading on the measured page. No new hosting or
runtime work is included in this completed diagnostic operation.

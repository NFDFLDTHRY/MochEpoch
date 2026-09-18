# Claptrap: preserve files and recover storage reads

proposal_id: 20260918-claptrap-storage-read-recovery
status: IN_PROGRESS
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
base_commit: dccdf380d31968cffb4a4053826808dc854f0e17

## Authorization and observed need

The active conversation authorizes completing/stabilizing Claptrap and explicitly
instructs putting the plan in the repo so the user can track it before proceeding.
The new reload screenshot continues that repair: after the recorded turn-4 CSV
NotFoundError, setup now reports InvalidStateError about cached interface state.
The previous prompt repair is complete; its code is 08acbb8 and its subsequent
phone evidence is preserved in the preceding commits. This operation changes
only storage access/recovery and the associated display and evidence.

The screenshot shows neither model loaded. Setup currently reads CSV before
saved diagnostics, creates handles with create:true before inspecting existing
history, and leaves the initial 0/100 and "checking OPFS" display after failure.
This does not establish that the three recorded replies were deleted or which
specific storage API rejected. The earlier JSON has no operation-level stack.

## Exact operation

1. Read existing evidence and CSV independently, by name with create:false.
   Restore readable evidence even if CSV fails, and display readable CSV even
   if evidence fails. Initialize only a confirmed empty new store; never
   recreate a missing conversation or reconstruct it from diagnostic JSON.
2. On InvalidStateError or NotFoundError during an existing-file read, retry
   once with a fresh root, handle and File. Preserve exact error name, operation,
   filename, attempt and stack in exportable diagnostics. Do not retry writes
   or model calls, or treat a failed read as empty history.
3. Use that read path during restore, retrieval, append preparation and CSV
   export. Reuse the returned fresh handle for the subsequent append.
4. Show unknown/unavailable counts on read failure, remove the unverified
   "saved CSV remains available" claim, retain saved evidence exports, and add
   a read-only "Retry saved storage" control that does not start models.
5. Preserve experiment prompts, query handling, two calls per turn, 50/50 count,
   both resident sessions, installed/isolation behavior and CSV authority.

## Exact files

- experiments/granite-single-ort-dual-session/claptrap-chat/main.js:
  existing-file reads, bounded fresh-handle retry, independent recovery,
  accurate failure/export state and retry control.
- experiments/granite-single-ort-dual-session/claptrap-chat/index.html:
  initial unknown count and retry control.
- experiments/granite-single-ort-dual-session/claptrap-chat/sw.js:
  shell cache revision so the repaired files install together.
- experiments/granite-single-ort-dual-session/claptrap-chat/checks.mjs:
  realistic missing-file behavior and focused storage-failure cases.
- experiments/granite-single-ort-dual-session/claptrap-chat/VERIFICATION.md:
  screenshot attribution, executed checks, browser outcome and remaining limit.
- experiments/granite-single-ort-dual-session/claptrap-chat/evidence/storage-read-recovery-20260918.json:
  actual check/browser results and screenshot text/hash, with no invented phone
  recovery or duplicate normalized copy of the existing run.
- scratchpad/WORK.md: this plan and completion/handoff.

## Verification and success

Exercise transient and persistent read failures at handle/File/text boundaries;
prove one retry, byte-preserved existing files, saved evidence retained when CSV
is missing/unreadable, CSV export retained when evidence is unreadable, no
inference or implicit history creation during recovery, and unchanged normal
50/50 completion and write-failure behavior. Check the published page and
reload/export using real browser OPFS. No synthetic test is phone evidence.

Success is recoverable transient reads and truthful, exportable failure when the
file remains unavailable. The phone's underlying storage cause and recovery
cannot be claimed until the repaired build accesses that phone's existing files.
No new service, dependency, hosting arrangement or architecture is introduced.
Current main is be56f62590be8897f479f33b84877fb3a7f98f13; its blueprint blob matches
locked 5a3e9ae1a5e0d3bcc058ffab599c7cb8d65f0945. Neither locked file changes.

## Progress

Plan published at 259ec89c0a00dfd2751f725a3836d3bea229e84b before runtime edits.
Storage recovery and truthful display changes implemented. All 45 synthetic
checks pass, including the 11 added storage cases and existing 50/50 checks.
Browser reload/export verification is in progress; phone recovery is not claimed.

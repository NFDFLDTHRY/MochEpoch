# Work scratchpad protocol

This folder is a communication surface between the user, normal ChatGPT sessions, and ChatGPT Work.

It is not game state, not experimental evidence, not architecture authority, and not a substitute for the repository documentation. Nothing in this folder may override `AGENTS.md`, `docs/GAME_BLUEPRINT.md`, `docs/CSV_BACKING_STATE.md`, `docs/MODEL_ROLE.md`, `docs/DIALOGUE_BOUNDARY.md`, or the current implementation plan.

## Purpose

Work must expose what it intends to do in the repository before it does it so the proposal can be inspected and discussed outside the Work session.

Use only these two files for the current exchange:

- `WORK.md` — Work writes its current proposal, blocker, or completed result.
- `REVIEW.md` — the user or another ChatGPT session writes the response to that proposal.

These files may be rewritten in place for each operation. Do not turn the scratchpad into a framework, queue, database, log system, or hidden source of project state.

## Required Work handshake

Before modifying game code, world CSVs, project architecture, runtime machinery, dependencies, hosting configuration, or other implementation files, Work must:

1. Read `AGENTS.md`, `docs/GAME_BLUEPRINT.md`, and the current relevant authoritative docs from `main`.
2. Overwrite `scratchpad/WORK.md` with one narrowly scoped proposal.
3. Give that proposal a unique `proposal_id` such as a UTC timestamp plus a short slug.
4. Set `status: PROPOSED`.
5. State the exact operation, exact files it expects to touch, why each file is needed, what it will run or inspect, what result would count as success, and any unresolved question or risk.
6. Stop before making the proposed implementation changes.

Work may proceed only after `scratchpad/REVIEW.md` explicitly contains `decision: APPROVED` and names the same `proposal_id`, or the user explicitly instructs Work in the active Work conversation to proceed with that exact proposal.

An approval applies only to the matching proposal. It is not standing permission for later work.

If Work discovers that the approved operation requires additional files, new machinery, a different architecture, a new service, a cost/quota exposure, or any material scope change, it must update `WORK.md` with `status: BLOCKED` or a new proposal and stop again.

## Completion

After an approved operation, Work must update `WORK.md` with `status: COMPLETE` and record only:

- what it actually changed;
- what it actually ran or observed;
- the resulting commit SHA or branch if applicable;
- any failure or unresolved blocker;
- the smallest next operation, if one is evident.

Do not silently promote scratchpad statements into project truth. Durable architectural decisions belong in the authoritative docs only after explicit approval. Experimental evidence belongs in the repository evidence area only when the run actually established it.

## For normal ChatGPT sessions

When asked what Work is trying to do, read `scratchpad/WORK.md` and the matching `scratchpad/REVIEW.md` before reconstructing its intent from chat memory.

When reviewing a Work proposal, write the response into `scratchpad/REVIEW.md` so Work can read the decision from the repository rather than relying on conversational context transfer.

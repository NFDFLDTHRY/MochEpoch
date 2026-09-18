# Claptrap: separate prompts and recover from malformed retrieval

proposal_id: 20260917-claptrap-separate-system-prompts
status: COMPLETE
remaining_gate: phone startup interrupted at the GPU-start checkpoint; full 100-reply run still outstanding
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
code_commit: 08acbb86b444c477563ae92f07b24b257e36055a

## Authorization and changes

The user's "Yeah let's fix it because this happens on last creation" approved
the proposed separate retrieval and response systems. The proposal and subsequent
executed findings were committed before the corresponding edits. The reproduced
failure justified correcting local malformed-retrieval handling and isolating
the response inputs within the requested repair.

- Call 1 system tells Granite to select three words from the incoming message
  and call search_conversation. It receives that message alone. The native tool
  schema, markers and JSON instructions remain; the generic assistant preface
  that an executed query copied is omitted.
- Call 2 system is `You are Claptrap. Respond to the incoming message.` Its input
  contains only actual retrieved CSV rows, the original timestamp and incoming
  message. Query prose, native call history and diagnostics stay in evidence.
- Malformed retrieval records a durable failed attempt with no search executed
  and no retrieved rows, then runs the independent response call. It does not
  rewrite a query, invent matches or retry. Actual runtime/storage errors still
  stop. The UI labels skipped searches accurately.
- Only the second 100-token response is conversation/CSV/next-seat input. Both
  resident models, one runtime/tokenizer, fresh inputs, 50/50 alternation, seed
  exclusion, shared memory, persistence and original legacy replay are retained.

## Executed results

All 34 synthetic checks pass, including malformed-query recovery, checkpoint
failure stopping before reply generation, first-pass exclusion from response
input, CSV persistence, 50-per-seat counts and installed runtime requirements.

Three real CPU trials established:
- 5131172: two turns/four generations completed, but 23-word and 29-word queries
  echoed the generic assistant preface and contaminated both replies.
- 2b0e72f: one reply saved; CPU turn 2 retrieval consumed all 96 tokens while
  repeating prose, ending at token 2650 without the native closing marker. This
  reproduced the screenshot's error category without loading or running GPU.
- 08acbb8: the final repair completed two turns/four calls, two 100-token replies
  and 69 saved events with no pending writes/error. Exact second-call outputs
  alone became CSV and next input. The second query retrieved the first CSV row.
  Actual response prompts contain only the stated system/rows/timestamp/message.
  Reload restored both replies and all 69 saved events.

The final run's queries had 25 and 5 words; three-word compliance is not proven.
The replies were identical requests for context already supplied. This model
behavior is preserved. Both final native calls closed, so recovery from a bad
marker is verified synthetically, not claimed as an executed final-run branch.

Exact exports, hashes, source hashes and check results are saved in
experiments/granite-single-ort-dual-session/claptrap-chat/evidence/separate-prompts-20260917.json.
No personal identifiers were found in publication review. Original phone exports
remain byte-identical. The blueprint still matches its locked blob
5a3e9ae1a5e0d3bcc058ffab599c7cb8d65f0945; main and the lock were not changed.

## Remaining limit

The final build's initial offline-shell installation failed; retrying after the
explicit failure recovered it and permitted the final CPU run. The exact cause
of that temporary installation failure was not established.

No new real GPU execution or full 100-turn endurance is claimed. The smallest
next operation is the final 08acbb8 phone run using the verified entry-point link
in VERIFICATION.md. Preserve the prior phone exports before clearing them. The
raw export of the original reported marker failure was not supplied, so the
CPU reproduction does not prove that phone call's exact stopping condition.

## Latest phone evidence — 2026-09-18

The new 00:29:52 export identifies 08acbb8 and confirms installed mode, isolation,
shared memory, persistent storage and four WASM threads. CPU loaded successfully.
The last of 61 recovered events is GPU session-load-start, checkpoint 5. No GPU
completion/runtime-ready or generation followed in the recovered log; zero turns
were saved. Restoration marked the unfinished run interrupted, with no exception
or memory measurement. The pre-factory checkpoint does not prove that GPU model
creation was actually entered after its acknowledgement.

The exact public-safe export and a source-grounded interpretation are committed
under evidence/phone-startup-interrupted-20260918.json and VERIFICATION.md. This
review changes evidence/documentation only. The earlier prompt-repair checks and
CPU execution remain valid; the phone startup/endurance gate remains open. The
next concrete investigation is GPU startup with the CPU still resident, before
any retrieval or response generation. No OOM or driver cause has been established.

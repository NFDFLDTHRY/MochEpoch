# Current Work proposal

proposal_id: 20260915T020507Z-csv-read-projection
status: PROPOSED
base_branch: main
base_commit: baf29393e8074afa4a249470e6a18021cef85a2a

## Question

Can the existing read/render probe obtain and display the seed facts directly through CSV-access functions without maintaining a parsed active world?

## Repository basis

Read `AGENTS.md`, all three `docs/` documents, root `README.md`, the scratchpad protocol and current exchange, all six `world/` CSVs, `app.js`, `index.html`, `package.json`, and both evidence Markdown files at the base commit. The attached implementation plan was inspected as a reference; current main governs this proposal.

`app.js` retains `activeWorld`, parsed index rows, and nested record `Map` objects. Root `README.md` explicitly identifies that representation as violating the CSV backing-state boundary. The current implementation plan requires a compliant read/render path before the Chrome verification and Granite operations.

## Exact proposed operation

Correct only the existing probe's CSV-access and display path:

- Replace the active-world loader and record Maps with stateless class functions that read CSV text, resolve indexed type/name references, and scan the cells needed for the current read or display operation.
- Keep CSV parsing cursors and decoded fields local to the individual scan. Do not assemble a replacement parsed world, including an operation-local copy of the same index-and-record model.
- Feed the existing display from those CSV reads. Browser DOM output remains a projection and must never be read back as gameplay authority.
- Preserve resolution of every indexed file, quoted CSV decoding, and the existing loading/error behavior. Prompts and schemas remain CSV data.

This is a correction to the existing diagnostic probe. It does not establish the first-person 3D client.

## Exact repository files to change after approval

| File | Reason |
| --- | --- |
| `app.js` | Remove the parallel world representation and implement the narrowly scoped CSV-access/projection functions. |
| `evidence/read-render.md` | Append the actual correction-run results and limitations, preserving the earlier evidence. |
| `README.md` | Update only Current status to match the observed correction results. |
| `scratchpad/WORK.md` | Record completion or a blocker under the scratchpad protocol. |

No other repository file is included. In particular, this proposal adds no world mutation, persistence substrate, dependencies, Granite/Witness machinery, hosting change, public source copy, or installability machinery.

## What will run or be inspected

1. Run `node --check app.js`.
2. Execute the actual CSV-access functions against a disposable copy served over local HTTP, using native Node fetch. Compare decoded values with Python's standard-library CSV reader, including the existing quoted prompt/schema fields.
3. Repeat the three existing cases: original seed resolves Ada as stone holder; changing only the disposable stone CSV's `holder_name` to `player` changes the newly read holder; removing that disposable file produces an explicit HTTP 404 load failure.
4. Inspect data lifetimes: no retained parsed world, record Maps, inventory cache, class-owned game facts, or gameplay reads from the DOM. Discard each operation's working values and repeat from the CSV files.
5. Record exact commands, executable reference, observed outputs, and failures in the existing evidence file. The committed seed stays unchanged; temporary checks add no repository test harness.

## Success and unresolved limits

Success for this operation means the source inspection finds no parallel world representation and the local read/resolve cases reproduce their expected results from CSV. Node checks do not establish visible rendering.

The saved evidence records two browser-delivery blockers: the connected browser rejected localhost by policy, and GitHack returned its own error for the private repository. This proposal does not attempt a workaround or choose another service. The three real Chrome display/reload/error checks remain unverified until an authorized reachable test surface is available.

Repeated CSV reads may expose a concrete consistency or performance limitation. If execution requires a cache, storage layer, additional file, or other material scope change, record the requirement and stop for another review.

## Review gate

Only this proposal file is being changed in the current resync. Implementation has not begun. Stop for review as requested and as required by `scratchpad/README.md`; proceeding requires approval of this exact proposal ID.

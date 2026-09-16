# Historical evidence notice

This file is a chronological record of earlier implementation attempts and observations. It is **not architectural authority**. Some planning statements, terminology, and next-step instructions below were superseded later. Current MochEpoch architecture is defined by `AGENTS.md` and the authoritative documents under `docs/`, led by `docs/GAME_BLUEPRINT.md`. Preserve the observations below as evidence; do not reconstruct the current design from them.

# Read/resolve/render iteration

Run: 2026-09-14, 21:10 UTC. Base: `88938bd723356f4bb88c00da62eede3981d3863e`.

Question: can the indexed CSV facts be loaded into one direct in-memory representation and displayed, with possession derived from the object's holder references?

## Implementation

`app.js` holds index rows and a map of key/value maps keyed by indexed `type/name` references. The CSV cells remain strings. The renderer reads those records and derives displayed holdings afresh; it keeps no character inventory or other independent gameplay facts. `index.html` supplies the display and a loading/error message.

## What ran

The application's unchanged `loadWorld` and CSV reader functions were executed in Node.js v24.19.0 against a disposable copy served over local HTTP by Python 3.12.14. A temporary execution context supplied native HTTP fetch with the local base URL. It did not execute the browser entry point or renderer, and did not simulate a DOM.

For the original seed, the index and every referenced key/value row were compared with an independent Python standard-library CSV read. All matched, including the exact decoded `system_prompt` and `output_schema` strings. The schema string also parsed as JSON with the existing `hand_over` and `wait` choices. This was a data-read check, with no model call.

| Agreed case | Input in disposable copy | Observed read/resolve result | Visible browser result |
| --- | --- | --- | --- |
| Original seed | Stone has `holder_type,character` and `holder_name,ada` | PASS: six CSV requests returned 200; five records resolved; holder was `character/ada` | Blocked; not verified |
| Changed holder | Only `holder_name,ada` changed to `holder_name,player` | PASS: a fresh load read `character/player` as holder | Blocked; not verified |
| Missing reference | Original holder restored, then `world/objects/stone.csv` temporarily removed | PASS: loading rejected with `world/objects/stone.csv: HTTP 404` | Blocked; not verified |

`node --check app.js` also passed. The original test seed was restored. The committed seed CSVs were never changed. No test harness or dependency was added to the project.

## Blocked execution

The connected Cloud browser rejected `http://127.0.0.1:8765` with `net::ERR_BLOCKED_BY_CLIENT`. Its subsequent diagnostic explicitly identified the Cloud browser URL policy and prohibited workarounds. No application screenshot or visual outcome was obtained.

An initial local reader attempt also failed before assertions with `ECONNREFUSED` against a separately launched server. The successful reader run started and stopped its local server within the same execution session.

These results establish CSV reading, indexed resolution, and loader rejection for the three inputs. They do not establish browser module execution, visible rendering, browser reload behavior, or visible error handling. The complete read/resolve/render milestone remains unproven.

## Remaining manual checks

Use a disposable copy and the local server command in the README:

1. Open the original seed in Chrome. Confirm `One room.`, both characters at `room`, player holding nothing, and Ada holding `stone`.
2. Change only the stone's `holder_name` to `player` and reload. Confirm player now holds `stone` and Ada holds nothing.
3. Restore the stone CSV, temporarily remove that file, and reload. Confirm the world stays hidden and the page says `Could not load world: world/objects/stone.csv: HTTP 404`.

Restore the original seed after the checks and record the actual visible results. Finish this verification before beginning Witness. No Witness packet, Granite response, resolver outcome, gameplay mutation, persistence, or civilization-like behavior was exercised in this iteration.

## GitHack delivery attempt: 2026-09-14, 22:14 UTC

The current `main` was re-read at `db7be782418816d54ddc65310d76ec3c43d2d864`. The app code, index, and all five referenced CSV files were unchanged from the preceding iteration. The existing installable WebApp product framing remains in place; this operation only introduces a documented development URL.

In the connected real Chrome browser, opened:

[Commit-pinned development URL](https://raw.githack.com/NFDFLDTHRY/MochEpoch/db7be782418816d54ddc65310d76ec3c43d2d864/index.html)

Observed sequence:

1. GitHack displayed its HTML confirmation, showing the expected repository, commit, and `index.html` path.
2. Selected **Open the page**.
3. The same URL displayed GitHack's own `404` page: `Something is wrong. That's all we know.` The MochEpoch interface did not appear.
4. Authenticated GitHub repository metadata returned `private: true` and `visibility: private`. The documented GitHack path requires publicly retrievable source; it cannot use this connector's authenticated access to the private repository.

![GitHack's delivery error before MochEpoch loaded](githack-delivery-404.jpg)

This is an entry-page delivery failure, not the required missing-CSV test. No browser execution of the game was established.

| Required Chrome check | Result in this attempt |
| --- | --- |
| Original seed renders Ada holding the stone | Not reached; GitHack returned its own error page |
| Temporary holder change appears after reload | Not run; no test branch or altered seed was created |
| Missing referenced CSV produces the game's visible load failure | Not run; GitHack's 404 does not satisfy this check |

Only the development URL documentation and this delivery evidence were added. The seed remains intact, so no restoration was necessary. App code, world architecture, repository visibility, and runtime dependencies were not changed. Witness was not begun.

Next prerequisite: explicit owner authorization for source visibility sufficient for GitHack retrieval. After that, run the three existing game checks against commit-pinned snapshots and record their actual Chrome outcomes.

## CSV backing-state correction: 2026-09-15, 02:21 UTC

Question: can the existing probe read and project the fixture through CSV-access functions without a retained parsed world?

Approved operation: `20260915T020507Z-csv-read-projection`. Implementation base: `e4084c5be65629e677eeb4c14cffd908f8f24cd9`.

Executable tested: `app.js`, Git blob `927218480a08b7832448d79a262e53d28fecc25d`, SHA-256 `5efdfb8d20f22b6f664f4cac23bfd16e7b05874d25df8f7866f3bba9b7615923`.

### What changed

Removed `activeWorld`, the retained index rows, and both levels of record Maps. The `CSV` class contains only the static functions `rows`, `read`, `path`, `checkReferences`, and `value`. A read scans one row at a time; its callback receives decoded cell strings. CSV text, parser rows, lookup flags, and the requested value remain local to the operation. No class instance, class field, parsed document cache, or replacement world object was introduced.

`value` resolves the requested type/name through a fresh read of `world/world.csv` and then scans the referenced CSV for the requested key. `checkReferences` reads every indexed file. The asynchronous display calls these functions and emits holdings from the object's holder cells. The entry point waits for the display operation before revealing the world. DOM content is output only; game facts are never read from it.

The original six CSVs, `index.html`, dependencies, and hosting configuration were unchanged. The existing text/card display remains a diagnostic probe.

### What ran

Runtime: Node.js `v24.19.0`; Python `3.12.14`. Run completed at `2026-09-15T02:21:04.164681+00:00`.

Commands actually run:

```sh
# Working directory: /workspace/scratch/eaa9ac5e319d/MochEpoch
node --check app.js
python3 /workspace/scratch/eaa9ac5e319d/csv-read-projection-run/verify.py /workspace/scratch/eaa9ac5e319d/MochEpoch
```

Both commands exited `0`. The temporary check scripts lived outside the repository. The Python command created a disposable copy of `world/`, started a local HTTP server, ran the checks, restored the disposable seed, and stopped the server within the same process lifetime. It verified that the repository CSV bytes were unchanged.

The Node check executed the unchanged `CSV` class extracted from the tested `app.js` before `render`. Its execution context supplied native HTTP fetch with the disposable server's base URL. It did not execute the browser entry point or renderer and did not emulate a DOM. Every request used the application's `cache: "no-store"` option.

For each complete input package, decoded rows in all six files were compared with Python's standard-library `csv.reader`. All five index entries and all ten referenced key/value rows matched. Each key was also read through `CSV.value` and compared with the independently decoded value. The quoted `system_prompt` and `output_schema` strings matched exactly; the latter parsed as JSON with `hand_over` and `wait` choices. This was a CSV-read check, with no model call.

| Case | Disposable input and execution | Observed result |
| --- | --- | --- |
| Original seed | Exact six CSVs from the implementation base | PASS: six reference-check requests returned 200; six files and ten key/value lookups matched Python; holder was `character/ada`. |
| Changed holder | Only `holder_name,ada` changed to `holder_name,player`; reused the same class and execution context | PASS: six reference-check requests returned 200; all independent comparisons matched; holder was `character/player`. |
| Missing reference | Restored the original stone CSV, then removed that disposable file | PASS: the index and four other indexed files returned 200; the stone request returned 404; `checkReferences` rejected with `world/objects/stone.csv: HTTP 404`. |
| Restoration control | Restored the original stone bytes; read once with the existing class, then repeated the complete checks with a fresh class and execution context | PASS: both returned Ada as holder; the fresh context's six-file and ten-value comparisons matched the original seed. |

The changed-holder case was an external fixture edit between reads. It was not a gameplay mutation or a persistence test.

### State-lifetime inspection

Source inspection found no retained parsed index, record Maps, inventory cache, class-owned facts, or DOM reads of gameplay values. Each generator, callback, decoded row, and scalar lookup belongs to its enclosing read/projection call. Only browser display output survives that operation.

Runtime inspection of the reused class found these own properties before and after the cases:

```text
length, name, prototype, rows, read, path, checkReferences, value
```

Its prototype contained only `constructor`. Beyond the built-in class metadata, every own property was a function; the property lists were unchanged across calls. This inspection and the same-context changed-holder check support the absence of class-owned retained CSV data in the exercised code. They do not measure garbage collection.

### Established and unresolved

Established: the parallel world representation was removed from the source, and the corrected CSV-access functions passed the original, changed-holder, missing-file, and restoration checks. Quoted seed values remained intact. No unexpected failure occurred in this run.

Still unresolved: actual browser module execution, visible rendering, browser reload behavior, and visible error handling. The earlier browser-delivery blockers remain recorded above; no browser, GitHack, visibility, or hosting operation was attempted here. Atomic reads across concurrent source edits and target-device request cost were not tested. No cache or storage mechanism was added.

The next missing verification is the existing three real Chrome checks on an authorized reachable test surface. This run does not establish the first-person 3D client, a Granite call, Witness construction, a resolver outcome, gameplay mutation, persistence, or the complete first-test pass condition.
# Current Work proposal

proposal_id: 20260915T024510Z-sites-exact-history
status: PROPOSED
repository: NFDFLDTHRY/MochEpoch
branch: main
planning_base: 295f66c69f0e5c83ecdf987f2758d86cef424bb8

## Question

Will a private Site's source branch accept the exact current MochEpoch main commit and its unchanged Git history, and can Sites privately deploy a version identified by that same commit?

The earlier inspection established the exposed API shape, not the remote's acceptance or deployment behavior. This experiment tests those behaviors directly.

## Source pin

After matching approval, re-read current main and its instructions, then record its full commit SHA as `S`. Pin it for the entire experiment. Proposal/review commits precede this pin; evidence and completion commits follow the experiment. No new commit may replace `S` during the trial. If GitHub main later advances, record that separately without switching the tested revision.

## Exact operation after approval

1. **Obtain the original Git history.** Use an authorized ordinary Git clone/fetch of the private MochEpoch repository. Verify local HEAD equals `S`, the checkout is unchanged, and the complete reachable history is available. The existing workspace is a file-materialized directory, not a Git repository; it is not a valid substitute. If authenticated Git history cannot be obtained, stop with that access blocker. Do not rebuild a repository from connector file responses or export/import source files.

2. **Obtain only the required Site remote.** Reuse an empty Site already identified for this experiment if one exists; otherwise create one private, empty Site solely to obtain its configured source remote and branch. Do not initialize a starter, generate source, or request publish-on-push. Record the returned Site identity and non-secret remote/branch information. Required registration metadata stays in a separate temporary administration directory, never in the MochEpoch checkout or tested commit.

3. **Test unchanged Git acceptance.** Read the Site branch's initial HEAD with `git ls-remote`. Push the existing commit using the ordinary refspec `S:refs/heads/<returned-source-branch>`, without generating a commit. Record the exact push result and re-read the remote HEAD. Fetch the accepted branch into a fresh temporary Git repository and compare its HEAD and reachable history/object identities with the original source. Do not force-push over pre-existing history, merge an unrelated Site seed, squash, amend, rewrite, or replace rejected history. Record any such required change or rejection and stop.

4. **Test version/deployment identity only if the remote HEAD is S.** Re-read local HEAD with `git rev-parse --verify HEAD` and supply that exact value to `save_site_version`. Use an archive only if the unchanged source already satisfies the documented packaging contract; do not insert configuration or copied files into an archive to manufacture compliance. If local packaging cannot complete from the unchanged source, attempt the documented source-only remote-build fallback at `S`, where supported. Verify the saved version's `source.commit_sha` equals `S`. Privately deploy only that version, inspect its terminal status and private-access metadata, and recheck source HEAD and version identity. Record any backend rejection, generated commit, changed SHA, or required source transformation. Do not satisfy a rejection by modifying source or adding deployment configuration.

## Exact file and resource scope

| Location | Purpose |
| --- | --- |
| `scratchpad/WORK.md` | This proposal; later the actual result or blocker and evidence reference. |
| `evidence/sites-exact-history.md` | After the trial, record executed commands/results, tested SHA, remote behavior, version/deployment identities, and limitations. |
| Temporary directories outside MochEpoch | Original Git checkout, independent verification fetch, transient logs, and Site registration metadata. No permanent scripts. |
| At most one private empty Site | Its source branch, and only after exact Git acceptance, a version and private deployment of `S`. |

The Sites skill requires registration metadata in `.openai/hosting.json`; it will be held under the separate administration directory. It must not be committed, included as an unrecorded source change, or used to claim that an altered archive came from `S`.

Only `scratchpad/WORK.md` changes during this proposal turn. After approval, the two repository paths above are communication/evidence only; no MochEpoch game source, CSV, visibility, dependency, or hosting architecture changes are included.

## Success, failure, and incomplete results

- **PASS:** the Site source branch HEAD equals `S`; the unchanged history is retrievable; the saved version identifies `S`; and the private deployment succeeds from that same version/SHA.
- **FAIL under the stated constraints:** actual behavior requires rewritten history, a new generated commit, transformed source, or detached-copy semantics, or rejects deployment of the unchanged accepted revision. Preserve the exact rejection and the boundary reached. Git acceptance alone is not full success.
- **BLOCKED / not established:** a transport, authentication, permission, or service failure prevents testing a boundary. Do not turn inability to run into a claim that Sites requires rewritten history.

Record initial/final remote HEADs, the source SHA/tree identity, commands and responses with credentials excluded, any transformation, saved-version source SHA, deployment status, and private access. A source-only saved version without a successful deployment is not a pass.

## Known unresolved requirements

Current main has no Sites hosting manifest. The published save/package contract requires one for archive-backed deployment; whether the unmodified source-only path can proceed is not established. Do not add a manifest, relocate files, generate a build configuration, or create a new commit to clear that requirement.

Access to the original private Git history is also unproven. The local `git rev-parse --show-toplevel` check returned `fatal: not a git repository`; connector file access has not established clone/fetch access.

Stop after this bounded experiment. No synchronization scripts, recurring update process, permanent deployment machinery, other hosting service, or public mirror is included.

## Review gate

No Site creation, source-remote push, version save, or deployment has been attempted. Stop for review under `scratchpad/README.md`. Execution requires approval naming this exact proposal ID.

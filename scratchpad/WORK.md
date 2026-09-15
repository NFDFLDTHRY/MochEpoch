# Current Work blocker

proposal_id: 20260915T023730Z-sites-repo-link
status: BLOCKED
source_repository: NFDFLDTHRY/MochEpoch
source_branch: main
source_commit_inspected: 6420029b00aa2461fb8283e04fc9dff239c6e10a

## Requested operation and stop condition

Create a private ChatGPT Site as a browser-visible development surface for current GitHub main. GitHub remains authoritative. The user prohibited changing repository visibility, creating a public mirror, or adding deployment machinery, and explicitly required stopping if Sites cannot maintain a real link to the existing repository.

## Capability inspection

Read the current repository instructions and scratchpad exchange, Sites building and hosting skills, their Registration and Publishing references, and the available Sites tool schemas. This was a capability inspection, not an attempted deployment.

The exposed `create_site` input accepts a title, slug, description, and optional private publication-on-push request. It has no input for an existing GitHub repository or source branch. Its returned source credential identifies the repository and branch provisioned/bound for the Site. The credential-renewal tool accepts a Site ID and optional publication-on-push request, not an external repository binding. No exposed Sites tool binds or retargets a Site to `NFDFLDTHRY/MochEpoch` main.

Consequently, a native update connection from this existing GitHub main is not available through the tools exposed here. A separate Site source repository must not be presented as that connection.

## Exact available update mechanism

The documented ordinary Sites publishing sequence is:

1. Register the private Site and persist its ID in the Site checkout's `.openai/hosting.json`.
2. Obtain the Site source repository's remote URL, configured branch, and short-lived Git write credential.
3. Commit the intended Site source and push it to that configured repository/branch.
4. Package the static assets or validated build output from that exact source revision.
5. Call `save_site_version` with the archive and the full pushed commit SHA. That SHA must match the HEAD of the Site's configured remote source branch.
6. Call `deploy_private_site_version` for the saved version and confirm the deployment reaches success.

There is also a conditional `publish_on_push: "private"` option. It is usable only when the returned `publish_on_push_accepted` is true and the push occurs within the returned expiry window. It publishes pushes to the Site's configured source repository/branch. It does not establish a link to, or synchronize from, the existing MochEpoch GitHub main. Eligibility was not tested because doing so would require Site creation.

To keep GitHub authoritative under this model, each update would require an explicit synchronization of the selected GitHub main revision into the Site checkout, followed by the Site push/publication sequence. Git history could be preserved in a deliberately arranged two-remote workflow, but that would be a separately designed synchronization process. It is not an exposed native GitHub binding, has not been implemented or verified here, and has not been substituted for the user's requirement.

## Actions and result

Stopped before creating a Site, obtaining Site credentials, importing a source copy, adding hosting configuration, saving a Site version, or deploying. No repository visibility, game code, CSV, dependency, or deployment configuration changed.

Only `scratchpad/WORK.md` records this blocker. The previous CSV correction remains complete in implementation commit `4ad423fdc3735553c02c4bbaace999b655d26e8e`; its completion record is preserved in commit `6420029b00aa2461fb8283e04fc9dff239c6e10a`.

No alternative synchronization mechanism is being proposed as approved work. The user's requested stop condition has been reached.

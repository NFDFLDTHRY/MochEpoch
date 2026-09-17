# Claptrap experiment handoff

proposal_id: 20260917-claptrap-completion
status: BLOCKED
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
base_commit: 8f9e86f36177f4525edbd80a54650e696405bf95
published_code_commit: 37aef813ac2490a87325dca66377eef41ac4a594

## Completed implementation

Removed the compulsory retrieval-planning inference and exposed the native
search tool inside each fresh actor turn. Additional generation follows only
an emitted tool call. Kept the same single worker/runtime, pinned Granite q4
weights on CPU/WASM and GPU/WebGPU, exact system prompt, CSV-only conversation
memory, and no cross-turn cache input. Completed-turn accounting requires 100
conversational tokens, excluding native tool output, and 50 responses per seat,
excluding the seed.

Made CSV writes finish before the next turn, preserved saved rows on startup
and failure, persisted diagnostics separately in OPFS, restored the visible
machine log after reload, and made session-load failures explicit in the UI.
Changes and evidence are confined to the existing Claptrap experiment and this
handoff. The architecture lock and main branch remain unchanged.

## Executed verification

Eleven synthetic plumbing checks pass, including both 100-response seed orders,
exact retrieval, native tool boundaries, fresh turn inputs, CSV commit ordering,
reload restoration, and failure preservation. Syntax and whitespace checks pass.
The actual pinned Granite Jinja template and Transformers stopping API checks
pass. These checks do not establish real Granite conversational behavior.

The published page loaded CPU q4 in the cloud browser, then failed because no
WebGPU adapter was available. Its final UI displayed the failure correctly.
Reload preserved the error and all eight non-progress runtime events, with
zero saved conversation turns. The evidence download control was clicked, but
automation did not receive a download event within 15 seconds; download delivery
is not verified here. Exact selected observations are in the experiment's
evidence directory and explained in VERIFICATION.md.

## Remaining blocker and smallest next operation

The real 100-response CPU/GPU conversation needs the working target-device
WebGPU environment. Open the commit-pinned page from VERIFICATION.md on that
device, press Start, then retain Download conversation CSV and Download evidence
JSON. Preserve both files on any failure before clearing. Inspect those files
to establish the real 50/50 outcome and actual model/tool behavior. No completed
device run or end-to-end experiment pass is claimed.

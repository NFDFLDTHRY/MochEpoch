# MochEpoch agent rules

## Preserve the experiment

Mock Epoch asks whether civilization-like behavior can emerge from factual CSV world state, scoped Witness calls, Granite 350M JSON reasoning, and deterministic game execution without explicitly programming social abstractions such as trust, morality, friendship, loyalty, or civilization.

Preserve this machine:

```text
PLAYER
  ↓
GAME RUNNER
  ↓
WORLD.CSV search list
  ↓
type + name resolve referenced CSV state
  ↓
WITNESS scoped database caller + packet constructor
  ↓
ONE Granite calling packet
  ↓
GRANITE 350M JSON → JSON
  ↓
MODEL OUTPUT
  ↓
IF / ELSE / THEN resolver
  ↓
GAME RUNNER updates CSV-backed state
  ↓
NEXT WORLD
```

The one Granite packet contains the world descriptive summation, system prompt from CSV, current situational state, and output JSON schema together.

Witness retrieves state and constructs the call. It does not reason about the world.

Granite only processes the supplied packet and returns JSON. It does not own world state or execute consequences.

Deterministic code decides what actually happens. The next interaction must operate from the changed CSV-backed state without hidden model memory or hidden game state.

Store facts and attributed events, not designer interpretations. Trust, morality, friendship, loyalty, resentment, civilization scores, and similar social abstractions are outside this experiment unless the user explicitly changes the research question. A failed emergence experiment is evidence, not permission to add a trust meter.

System prompts are data in CSV state. They may be character-specific or shared by reference; do not centralize them in executable code merely for convenience.

## Runtime state boundary

The CSV files under `world/` are the inspectable seed/default world. A Chrome WebApp cannot rewrite repository files directly.

At runtime, the game may parse those CSVs into memory and maintain a mutable active copy. When persistence is needed, store that active copy in the simplest browser storage that works. This storage is only persistence for the CSV-backed world, not a second hidden world model.

The active state must remain serializable back to the same inspectable CSV shape. Witness and the runner read the active CSV-backed state. Renderer objects, DOM state, caches, and model context are not independent game authority.

Do not build a backend merely to make static repository CSV files writable.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

Do not add frameworks, services, validators, test harnesses, schedulers, databases, deployment systems, account systems, abstractions, or dependencies because they may be useful later.

Prefer plain HTML, JavaScript, CSV, and local/manual checks until an observed requirement needs something more.

Documentation describes the machine. Code must not parse project documentation as an authority or dependency.

## Cost boundary

Never create, enable, configure, or rely on GitHub Actions or any other metered or hosted execution without the user's explicit approval.

Without explicit approval, do not add CI/CD, scheduled cloud jobs, Codespaces, CodeQL jobs, Pages deployment automation, Dependabot automation, hosted builds, hosted databases, serverless functions, hosted inference, analytics, telemetry, monitoring, or third-party services with billing or quota exposure.

A free tier is not permission.

An explicit user request may authorize a specific external service for that task. Deployment, authentication, payments, and other product-shell work are separate from the core civilization experiment and should not be pulled into the game runtime unless the user asks for them.

If an external service is genuinely required and has not been approved, stop and explain what is needed, why the local/simple path is insufficient, and what cost or quota exposure exists.

## Evidence

Save enough to establish the current run: relevant before-state, the Witness packet, raw model output or error, resolver result, relevant after-state, and visible consequence when useful. Failed runs count.

Do not turn evidence collection into a framework unless accumulated runs become hard to inspect manually.

## Before changing the repo

Read the current repository and the user's latest Mock Epoch instructions. Do not import architecture from unrelated projects or generic best-practice templates.

When unsure whether to add machinery, do not add it. Build the next missing executable operation.

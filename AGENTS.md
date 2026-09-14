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
GAME RUNNER updates CSV state
  ↓
NEXT WORLD
```

The one Granite packet contains the world descriptive summation, system prompt from CSV, current situational state, and output JSON schema together.

Witness retrieves state and constructs the call. It does not reason about the world.

Granite only processes the supplied packet and returns JSON. It does not own world state or execute consequences.

Deterministic code decides what actually happens. The next interaction must operate from the changed CSV state without hidden model memory or hidden game state.

Store facts and attributed events, not designer interpretations such as trust, morality, friendship, loyalty, resentment, or civilization scores.

## Build policy

Question → define operation → build smallest version → run → save evidence → try to break → report only what the run established → add machinery only when a failure requires it.

Do not add frameworks, services, validators, test harnesses, schedulers, databases, deployment systems, account systems, abstractions, or dependencies because they may be useful later.

Prefer plain HTML, JavaScript, CSV, and local/manual checks until an observed failure requires something more.

Documentation describes the machine. Code must not parse project documentation as an authority or dependency.

## Cost boundary

Never create, enable, configure, or rely on GitHub Actions or any other metered or hosted execution without the user's explicit approval.

Without explicit approval, do not add CI/CD, scheduled cloud jobs, Codespaces, CodeQL jobs, Pages deployment automation, Dependabot automation, hosted builds, hosted databases, serverless functions, hosted inference, analytics, telemetry, monitoring, or third-party services with billing or quota exposure.

A free tier is not permission.

If an external service is genuinely required, stop and explain what is needed, why the local/simple path is insufficient, and what cost or quota exposure exists. Wait for approval.

## Before changing the repo

Read the current repository and the user's latest Mock Epoch instructions. Do not import architecture from unrelated projects or from generic best-practice templates.

When unsure whether to add machinery, do not add it. Build the next missing executable operation.

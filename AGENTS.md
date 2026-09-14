# MochEpoch implementation rules

## Project shape

Mock Epoch asks whether civilization-like behavior can emerge from factual CSV world state, scoped Witness calls, Granite 350M JSON reasoning, and deterministic execution without programming social abstractions such as trust, morality, friendship, loyalty, or civilization.

Preserve this machine:

`world.csv -> referenced CSV state -> Witness constructor -> ONE Granite calling packet -> Granite JSON output -> deterministic IF/ELSE/THEN resolver -> CSV mutation -> rendered next world`

- `world/world.csv` is the current search list for what exists or matters.
- Type + name resolve the corresponding CSV state file.
- System prompts are data inside the relevant CSV state.
- Witness is only a scoped database caller and packet constructor.
- One model packet contains the world descriptive summation, CSV system prompt, current situational state, and output JSON schema together.
- Granite is JSON in / JSON out. It does not own world state or execute consequences.
- Deterministic code decides what actually happens and changes CSV state.
- The next interaction must operate from the changed CSV state without hidden model memory or hidden game state.
- Store facts and attributed events, not designer interpretations such as trust, morality, friendship, loyalty, or civilization scores.

## Build rule

Question -> define operation -> build the smallest version -> run -> save evidence -> try to break -> report only what the run established -> add machinery only when a failure requires it.

Do not add architecture because it may be useful later. Do not build frameworks, services, validators, test harnesses, schemas, schedulers, account systems, deployment systems, or abstractions ahead of the operation currently being tested.

Prefer plain HTML, JavaScript, CSV, and local/manual checks until an observed failure requires something more.

Documentation must describe the machine. Do not make documentation itself an executable dependency or require code to parse project Markdown in order for the game to work.

## Cost and external-service boundary

The repository is version control, not permission to activate hosted services.

**Never create, enable, configure, or rely on GitHub Actions or any other GitHub-hosted execution without the user's explicit approval.**

Without explicit user approval, also do not add or enable:

- CI/CD or scheduled cloud jobs
- GitHub Pages deployment machinery
- Codespaces
- CodeQL / Advanced Security jobs
- Dependabot automation
- hosted build services
- hosted databases
- serverless functions
- hosted inference
- analytics, telemetry, error-reporting SaaS, or monitoring
- third-party services that require an account, API key, billing method, usage quota, or can incur metered charges

Do not assume a free tier makes a service acceptable. Do not spend the user's money, consume metered credits/minutes, create recurring infrastructure, or create a path that can begin doing so automatically.

If the current operation genuinely requires an external or metered service, stop and explain exactly what is required, why the local/simple path is insufficient, and what cost or quota exposure exists. Wait for explicit approval before adding it.

## Dependencies

Do not add packages merely for convenience or future use. Add a dependency only when the current experiment requires it and the dependency directly enables that operation.

Keep model weights, generated builds, local saves, secrets, and machine-specific files out of Git.

## Evidence

Evidence exists to answer the current experimental question, not to create bureaucracy.

For an actual run, preserve only what is needed to establish what happened: relevant input state, the Witness packet, raw model output or error, resolver result, resulting CSV state, and visible consequence when applicable.

Do not claim that source validation, model loading, API advertisement, synthetic output, or a fixture example proves real inference or gameplay behavior.

## Before changing the project

Read the current repo and the user's latest Mock Epoch instructions first. Do not import machinery or decisions from unrelated projects.

When unsure whether to add something, default to not adding it. Build the next missing executable operation instead.
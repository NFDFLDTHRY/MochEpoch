# Experiment evidence

No game or model run is recorded by the repository setup.

Create a directory for each actual run, for example `gate-0/2026-09-14-run-001/`. Use the real date and a distinct attempt identifier. Keep failed and interrupted attempts.

Save the evidence required by the [implementation plan](../docs/MOCK_EPOCH_IMPLEMENTATION_PLAN.md):

- Exact before CSV, validated player input, scoped references, complete packet, and formatted model input.
- Raw generated response, errors, token counts when available, and timings.
- Validation result, physical checks, resolver branch, CSV diff, commit outcome, and after CSV.
- Executable commit, actual device/browser, model revision, runtime version, graph/quantization, backend, and generation settings.
- A visible result capture when that experiment includes a visible consequence.

Identify the mode as real generation, synthetic resolver test, or recorded-output replay. A source check or fixture example is not model evidence. Diagnostic files never supply hidden gameplay memory.

Use these four fields in each run's `REPORT.md`:

## Question

The operation and result this run investigates.

## Run and evidence

What ran, where it ran, and relative links to the saved inputs and results.

## Established

Only conclusions supported by that run.

## Still unresolved

Failures, untested behavior, and the next specific operation required.

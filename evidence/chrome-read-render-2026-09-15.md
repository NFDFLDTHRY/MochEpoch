# Chrome read/resolve/render verification — 2026-09-15

Question: does the corrected CSV read/reference-resolution path execute in real Chrome through the public commit-pinned GitHack delivery surface and visibly reflect the tested CSV inputs without relying on retained hidden world state?

This evidence records user-run Chrome observations supplied as screenshots in the active ChatGPT session. It does not claim an automated browser run by repository tooling.

## Delivery surface

Repository: `NFDFLDTHRY/MochEpoch`

GitHub repository visibility was changed to public before these checks. The base commit used for the original seed was:

`eb07cf5f6de45713dc7a77940aef34a6e6e9ba6f`

Commit-pinned GitHack convention:

```text
https://raw.githack.com/NFDFLDTHRY/MochEpoch/<full-commit-sha>/index.html
```

## Check 1 — original seed

Commit:

`eb07cf5f6de45713dc7a77940aef34a6e6e9ba6f`

Expected visible state:

- `One room.`
- player at `room`, holding `nothing`
- ada at `room`, holding `stone`

Observed in the user-supplied Chrome screenshot:

- MochEpoch loaded rather than GitHack's previous private-repository 404.
- `One room.` was visible.
- player showed `Holds: nothing`.
- ada showed `Holds: stone`.

Result: **PASS**.

## Check 2 — changed holder

Disposable branch: `test/chrome-holder-player`

Commit:

`dc3d73aa95477cdb33650e9778bd62ce08446854`

The branch was created from the passing base. Git comparison established that the only changed file was `world/objects/stone.csv`, with one value changed from:

```text
holder_name,ada
```

to:

```text
holder_name,player
```

Expected visible state:

- player holds `stone`
- ada holds `nothing`

Observed in the user-supplied Chrome screenshot:

- player showed `Holds: stone`.
- ada showed `Holds: nothing`.

Result: **PASS**.

This was an external fixture variation, not a gameplay mutation or persistence test.

## Check 3 — missing referenced CSV

Disposable branch: `test/chrome-missing-stone`

Commit:

`d89bf4e8cab7b14fee2a2ef5d0470e01c77a6530`

The branch was created from the passing base. Git comparison established that the only change was removal of `world/objects/stone.csv`.

Expected behavior:

- world remains hidden
- visible error reports `Could not load world: world/objects/stone.csv: HTTP 404`

Observed in the user-supplied Chrome screenshot:

- the normal world cards were not displayed;
- the page visibly reported `Could not load world: world/objects/stone.csv: HTTP 404`.

Result: **PASS**.

## Established

The three required real-Chrome checks passed on public commit-pinned snapshots:

1. original CSV seed projected the expected possession state;
2. changing only the stone holder changed the visible projection accordingly; and
3. removing a referenced CSV failed closed with the expected visible loader error rather than rendering partial world state.

Together with the earlier local CSV-reader evidence, this completes the current diagnostic read/resolve/render milestone.

## Not established

These checks did **not** establish:

- a Granite runtime or model call;
- Resolver runtime machinery;
- Witness runtime machinery;
- natural-language intake, checking, or composition;
- a model-derived action proposal;
- deterministic gameplay mutation;
- runtime CSV persistence; or
- the complete MochEpoch first-test loop.

The next executable operation is the concrete Granite 350M WebApp JSON-in → JSON-out call, with no game authority attached.

# openclaw Actions drain — KILLED (2026-07-13)

_Estate consolidation (ASCENSION 2026-07-11 KILL order: "ClawSweeper's `openclaw/*` scheduled Actions —
draining SteadyWrk compute for an external estate"). Branch `claude/steadywrk-repo-consolidation-o0eb85`._

## Design: schedules removed, artifacts preserved

Unlike clownfish (workflow files deleted), clawsweeper's workflow files **stay** — the Actions
script-injection security hardening lives *inside* them, and the test suite asserts their content.
The kill removes exactly the self-firing part:

- **`schedule:` blocks stripped from 9 workflows** — `sweep` (**17 crons**: 2× every-5-min hot intake,
  4×/hour apply + comment-sync, hourly retries, 6-hourly audits), `dashboard-ci` (*/5),
  `repair-comment-router` (*/5), `repair-self-heal` (2×/hr), `repair-conflict-self-heal` +
  `spam-scanner` (hourly), `repair-cluster-intake`, `proof-nudges`, `maintainer-report-discord`
  (daily). All YAML-validated post-edit; only `workflow_dispatch` / `repository_dispatch` /
  `workflow_run` triggers remain (manual/API-only — nothing self-fires).
- **`codeql.yml` keeps its weekly cron** (this repo's own security scanning, not openclaw drain).
- **Tests updated to enforce the kill**: the three cron-presence assertions now assert
  `schedule:` **absence** (anti-resurrection guards); two slice boundaries that used `\n  schedule:`
  as a sentinel repointed to `\npermissions:`. Full unit suite: **550 pass / 0 fail** (3 pre-existing
  `dashboard-worker` async-cancel artifacts, file untouched, present before these changes).

## Drain evidence

Run history (2026-07-13 audit): 93 recent runs; scheduled fleet runs fired every few minutes on
`main` until **2026-07-11 12:41Z**, then stopped — the 07-11 session's Actions-level disable is
already holding. This branch makes the kill durable in git so a workflow re-enable cannot silently
resurrect the crons.

## What was kept

- All 24 workflow files (hardened content intact) — now manual-dispatch-only for the fleet.
- `ci.yml` + `codeql.yml` untouched.
- Every security fix in code and workflows.

## V one-tap (belt-and-braces until merge)

The Actions-level disable from 07-11 already holds (no runs since). To also disable manual
dispatchability of the fleet, or if anything re-enables:

```bash
for wf in sweep.yml dashboard-ci.yml repair-comment-router.yml repair-self-heal.yml \
          repair-conflict-self-heal.yml spam-scanner.yml repair-cluster-intake.yml \
          proof-nudges.yml maintainer-report-discord.yml; do
  gh workflow disable "$wf" --repo karimalsalah/clawsweeper
done
```

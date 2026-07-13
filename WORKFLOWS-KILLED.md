# openclaw Actions drain — KILLED (2026-07-13)

_Estate consolidation (ASCENSION 2026-07-11 KILL order: "ClawSweeper's `openclaw/*` scheduled Actions —
draining SteadyWrk compute for an external estate"). Branch `claude/steadywrk-repo-consolidation-o0eb85`._

## What was removed (22 workflows — the openclaw maintainer fleet)

All scheduled + fleet workflows serving the external openclaw estate, including the heavy crons
(`sweep`/`dashboard-ci`/`repair-comment-router` every **5 minutes**, `repair-self-heal` 2×/hour,
`spam-scanner` + `repair-conflict-self-heal` hourly, daily report/nudge/intake jobs) and the
`*.openclaw.ai` Pages deploy. Several ran on paid `blacksmith-*` runners:

`assist` · `commit-review` · `crabbox-hydrate` · `dashboard-ci` · `dashboard` · `github-activity` ·
`maintainer-activity-report` · `maintainer-report-discord` · `pages` · `proof-nudges` ·
`repair-cluster-intake` · `repair-cluster-worker` · `repair-comment-router` ·
`repair-commit-finding-intake` · `repair-conflict-self-heal` · `repair-finalize-open-prs` ·
`repair-issue-implementation-intake` · `repair-publish-results` · `repair-self-heal` ·
`spam-comment-intake` · `spam-scanner` · `sweep`

## What was kept

- `ci.yml` + `codeql.yml` — this repo's own hygiene (build validation + weekly security scan).
- **All security fixes in code** (e.g. authed exact-review write routes, Actions script-injection fix)
  are untouched — the kill removes automation for the external estate, not the fixes.
- Repo content (scripts, docs, job specs) — pointer-value reference; repo disposition is
  KILL-drain/pointer per `ESTATE-DISPOSITION.md`.

## ⚠️ The schedules keep firing until this merges

Scheduled workflows run from the **default branch** — this branch stops nothing until merged.
Immediate kill (V one-tap, reversible with `enable`):

```bash
for wf in sweep.yml dashboard-ci.yml repair-comment-router.yml repair-self-heal.yml \
          repair-conflict-self-heal.yml spam-scanner.yml repair-cluster-intake.yml \
          proof-nudges.yml maintainer-report-discord.yml; do
  gh workflow disable "$wf" --repo karimalsalah/clawsweeper
done
```

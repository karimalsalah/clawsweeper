import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const ALL_WORKFLOWS = readdirSync(".github/workflows")
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => `.github/workflows/${name}`);

const HARDENED_SHELL_WORKFLOWS = [
  ".github/workflows/commit-review.yml",
  ".github/workflows/repair-comment-router.yml",
  ".github/workflows/repair-commit-finding-intake.yml",
  ".github/workflows/spam-scanner.yml",
  ".github/workflows/sweep.yml",
];

test("repository dispatch payloads enter shell steps through environment variables", () => {
  const unsafeInterpolations = ALL_WORKFLOWS.flatMap((file) =>
    interpolationsInRunBlocks(file, /github\.event\.client_payload/),
  );

  assert.deepEqual(unsafeInterpolations, []);
});

test("workflow dispatch inputs enter shell steps through environment variables", () => {
  const unsafeInterpolations = HARDENED_SHELL_WORKFLOWS.flatMap((file) =>
    interpolationsInRunBlocks(file, /(?:github\.event\.inputs|\binputs)\./),
  );

  assert.deepEqual(unsafeInterpolations, []);
});

test("tainted plan outputs enter shell steps through environment variables", () => {
  const unsafeInterpolations = interpolationsInRunBlocks(
    ".github/workflows/sweep.yml",
    /(?:needs\.plan|steps\.target)\.outputs\.(?:batch_size|codex_timeout_ms|target_branch|target_checkout_dir|target_repo)/,
  );

  assert.deepEqual(unsafeInterpolations, []);
});

test("workflow inputs are canonical before arithmetic and command-file writes", () => {
  const workflow = readFileSync(".github/workflows/sweep.yml", "utf8").replace(/\r\n/g, "\n");
  const applyStep = workflowStep(workflow, "Apply unchanged proposed decisions with checkpoints");
  const validationIndex = applyStep.indexOf('limit="$(normalize_uint "apply_limit"');
  const arithmeticIndex = applyStep.indexOf("remaining=$((limit - closed_total))");

  assert.ok(validationIndex >= 0);
  assert.ok(arithmeticIndex > validationIndex);
  assert.match(applyStep, /case "\$apply_kind" in\n\s+issue\|pull_request\|all\)/);
  assert.match(applyStep, /Invalid apply_close_reasons/);
  assert.match(applyStep, /Invalid apply_item_numbers/);
  assert.equal(
    workflow.match(/Invalid target_repo: \$target_repo/g)?.length,
    workflow.match(/echo "target_repo=\$target_repo"/g)?.length,
  );
});

test("exact-review claim and complete requests sign the exact forwarded body", () => {
  const workflow = readFileSync(".github/workflows/sweep.yml", "utf8").replace(/\r\n/g, "\n");

  for (const name of [
    "Claim exact-review queue lease",
    "Complete exact-review queue lease",
  ]) {
    const step = workflowStep(workflow, name);
    assert.match(
      step,
      /CLAWSWEEPER_WEBHOOK_SECRET: \$\{\{ secrets\.CLAWSWEEPER_WEBHOOK_SECRET \}\}/,
    );
    assert.match(step, /test -n "\$CLAWSWEEPER_WEBHOOK_SECRET"/);
    assert.match(step, /createHmac\("sha256", process\.env\.CLAWSWEEPER_WEBHOOK_SECRET\)/);
    assert.match(step, /\.update\(process\.env\.PAYLOAD\)/);
    assert.match(step, /--header "x-clawsweeper-exact-review-signature: \$signature"/);
  }
});

function interpolationsInRunBlocks(file: string, unsafePattern: RegExp): string[] {
  const lines = readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  const findings: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)run:\s*(.*)$/.exec(lines[index]);
    if (!match) continue;
    const runIndent = match[1].length;
    const inline = match[2];
    if (unsafePattern.test(inline)) {
      findings.push(`${file}:${index + 1}`);
    }
    if (!/^\|[+-]?$/.test(inline.trim())) continue;

    for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex += 1) {
      const line = lines[bodyIndex];
      const indentation = /^\s*/.exec(line)?.[0].length ?? 0;
      if (line.trim() && indentation <= runIndent) break;
      if (unsafePattern.test(line)) {
        findings.push(`${file}:${bodyIndex + 1}`);
      }
    }
  }

  return findings;
}

function workflowStep(workflow: string, name: string): string {
  const start = workflow.indexOf(`- name: ${name}`);
  assert.ok(start >= 0, `missing workflow step: ${name}`);
  const nextStep = workflow.indexOf("\n      - ", start + 1);
  return workflow.slice(start, nextStep >= 0 ? nextStep : undefined);
}

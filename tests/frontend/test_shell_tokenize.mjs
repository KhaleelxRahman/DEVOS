/**
 * Phase 10 - D1 regression: the REAL terminal tokenizer.
 *
 * This runs the actual shipped source
 * `frontend/src/lib/shellTokenize.ts` via Node 22+ type stripping, so it
 * cannot drift from the file that ships. The Python suite
 * (`tests/api/test_terminal_config_10.py`) asserts the backend security
 * boundary; this file asserts the client-side argument boundaries.
 *
 * The original defect: `trimmed.split(/\s+/)` shredded any argument
 * containing whitespace and forwarded quote characters as literal text.
 *
 * Run: node tests/frontend/test_shell_tokenize.mjs
 */
import assert from 'node:assert/strict';
import { tokenizeCommandLine } from '../../frontend/src/lib/shellTokenize.ts';

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

const tokensOf = (line) => {
  const result = tokenizeCommandLine(line);
  assert.equal(result.error, undefined, `unexpected error: ${result.error}`);
  return result.tokens;
};

// --- the exact D1 reproduction ------------------------------------------

check('D1: python -c quoted program becomes two clean args', () => {
  assert.deepEqual(tokensOf(`python -c "print('REAL_STDOUT_OK')"`), [
    'python',
    '-c',
    "print('REAL_STDOUT_OK')",
  ]);
});

check('D1: no quote characters leak into any token', () => {
  for (const token of tokensOf(`python -c "print('REAL_STDOUT_OK')"`)) {
    assert.ok(!token.includes('"'), `leaked double quote in ${token}`);
  }
});

check('D1: old naive split produced a different (wrong) shape', () => {
  const naive = `python -c "print('REAL_STDOUT_OK')"`.split(/\s+/);
  assert.notDeepEqual(naive, ['python', '-c', "print('REAL_STDOUT_OK')"]);
});

// --- argument boundaries ------------------------------------------------

const BOUNDARY_CASES = [
  ['echo "hello world"', ['echo', 'hello world']],
  ["git commit -m 'my commit message'", ['git', 'commit', '-m', 'my commit message']],
  ['node -e "console.log(1)"', ['node', '-e', 'console.log(1)']],
  ['npm run build -- --flag "a b"', ['npm', 'run', 'build', '--', '--flag', 'a b']],
  ['git status', ['git', 'status']],
  ['  git   status  ', ['git', 'status']],
  ['echo ""', ['echo', '']],
  ['echo "a  b"', ['echo', 'a  b']],
  ['echo "it\'s"', ['echo', "it's"]],
  ['echo a\\"b', ['echo', 'a"b']],
  ['echo "" ""', ['echo', '', '']],
];

for (const [line, expected] of BOUNDARY_CASES) {
  check(`boundary: ${JSON.stringify(line)}`, () => {
    assert.deepEqual(tokensOf(line), expected);
  });
}

// --- malformed input is reported, never guessed -------------------------

check('unterminated double quote reports an error', () => {
  const result = tokenizeCommandLine('echo "unterminated');
  assert.ok(result.error, 'expected an error for an unterminated quote');
  assert.deepEqual(result.tokens, []);
});

check('unterminated single quote reports an error', () => {
  assert.ok(tokenizeCommandLine("echo 'oops").error);
});

check('empty input yields no tokens and no error', () => {
  const result = tokenizeCommandLine('   ');
  assert.deepEqual(result.tokens, []);
  assert.equal(result.error, undefined);
});

// --- the tokenizer must NOT interpret dangerous syntax ------------------
// It only decides argument boundaries. Substitution/pipe/redirection stay as
// literal text so the backend policy sees and rejects them.

check('command substitution is left as literal text for the backend to reject', () => {
  assert.deepEqual(tokensOf('echo $(whoami)'), ['echo', '$(whoami)']);
  assert.deepEqual(tokensOf('echo `whoami`'), ['echo', '`whoami`']);
});

check('pipes and chaining are left as literal text', () => {
  assert.deepEqual(tokensOf('echo a | tee b'), ['echo', 'a', '|', 'tee', 'b']);
  assert.deepEqual(tokensOf('echo a; whoami'), ['echo', 'a;', 'whoami']);
});

check('traversal argument is preserved verbatim, not normalised away', () => {
  assert.deepEqual(tokensOf('cat ../../etc/passwd'), ['cat', '../../etc/passwd']);
});

// --- report -------------------------------------------------------------

console.log(`shellTokenize: ${passed} passed, ${failures.length} failed`);
for (const failure of failures) console.error(`  FAIL ${failure}`);
if (failures.length > 0) process.exit(1);
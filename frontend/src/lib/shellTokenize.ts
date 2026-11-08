// Shell-like tokenizer for the terminal input box.
//
// Why this exists: the terminal previously did `trimmed.split(/\s+/)`, which
// shredded any argument containing a space and passed quote characters
// through as literal text. `python -c "print('X')"` became
// `["-c", "\"print('X')\""]`, so Python received the quotes as part of the
// program and failed with an empty stdout.
//
// This tokenizer only decides WHERE ONE ARGUMENT ENDS. It never interprets
// the argument: the backend remains the authoritative security boundary and
// still validates every resulting argument (allowlist, shell-metacharacter
// rejection, traversal and sensitive-file checks). Quotes are grouping
// syntax, so they are consumed as delimiters and not forwarded.
//
// Deliberately NOT supported: command substitution, pipes, redirection,
// globbing and variable expansion. Those are rejected by the backend
// policy, and implementing them client-side would only widen the attack
// surface. Backslash escapes are honoured inside double quotes and outside
// quotes, matching POSIX shell behaviour closely enough for an allowlisted
// command box.
export interface TokenizeResult {
  tokens: string[];
  /** Set when the input cannot be tokenized (e.g. an unterminated quote). */
  error?: string;
}

export const tokenizeCommandLine = (input: string): TokenizeResult => {
  const tokens: string[] = [];
  let current = '';
  // Tracks whether the current token exists at all, so an explicit empty
  // quoted argument (`echo ""`) is preserved instead of silently vanishing.
  let started = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quote) {
      if (char === quote) { quote = null; continue; }
      // Inside single quotes a backslash is literal, as in POSIX shells.
      if (char === '\\' && quote === '"' && i + 1 < input.length) {
        current += input[i + 1];
        i += 1;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'") { quote = char; started = true; continue; }
    if (char === '\\' && i + 1 < input.length) {
      current += input[i + 1];
      started = true;
      i += 1;
      continue;
    }
    if (/\s/.test(char)) {
      if (started) { tokens.push(current); current = ''; started = false; }
      continue;
    }
    current += char;
    started = true;
  }

  if (quote) {
    return { tokens: [], error: `Unterminated ${quote === '"' ? 'double' : 'single'} quote` };
  }
  if (started) tokens.push(current);
  return { tokens };
};
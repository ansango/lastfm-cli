/**
 * args.ts — declarative flag parser shared by every `lastfm insights <sub>`
 * command. Each command defines a schema (name -> FlagSpec) and a usage
 * line; `parseFlags` walks argv, applies short-flag aliases, validates
 * types, and returns the merged values plus a `help` flag for the
 * caller's --help handling.
 *
 * No side effects: parseFlags does NOT print or exit on --help. The caller
 * inspects `result.help` and decides what to do (typically write the
 * command's usage line and `process.exit(0)`).
 */
export interface FlagSpec<T = unknown> {
  /** Apply the spec's parser to the next argv element. Throws on invalid input. */
  parse(value: string, flag: string): T;
  /** Value used when the flag is absent from argv. */
  default: T;
  /** Alternative flag spellings (e.g. ['-u'] for `--user`). */
  aliases?: readonly string[];
}

/** Constructor helpers for the common flag shapes. */
export const flag = {
  /** Plain string flag. Default '' means "unset" — callers validate required-ness. */
  string(opts: { default?: string; aliases?: readonly string[] } = {}): FlagSpec<string> {
    return {
      parse: (v) => v,
      default: opts.default ?? '',
      aliases: opts.aliases,
    };
  },
  /** Numeric flag. Throws if the value is not a finite number. */
  number(opts: { default: number; aliases?: readonly string[] }): FlagSpec<number> {
    return {
      parse: (v, f) => {
        const n = Number(v);
        if (!Number.isFinite(n)) throw new Error(`${f} must be a number, got "${v}"`);
        return n;
      },
      default: opts.default,
      aliases: opts.aliases,
    };
  },
  /**
   * Days flag — accepts `Nd` strings like `30d` and returns the number.
   * Matches the convention used across the insights commands (`--since 30d`,
   * `--min-length` is a plain number, so this is for the "since" family).
   */
  days(opts: { default: number; aliases?: readonly string[] }): FlagSpec<number> {
    return {
      parse: (v, f) => {
        const m = /^(\d+)d$/.exec(v);
        if (!m) throw new Error(`${f} must be Nd (e.g. 30d), got "${v}"`);
        return Number(m[1]);
      },
      default: opts.default,
      aliases: opts.aliases,
    };
  },
  /** Enum flag — accepts only one of the listed literal strings. */
  enum<T extends string>(
    choices: readonly T[],
    opts: { default: T; aliases?: readonly string[] },
  ): FlagSpec<T> {
    return {
      parse: (v, f) => {
        if (!(choices as readonly string[]).includes(v)) {
          throw new Error(`${f} must be one of: ${choices.join(', ')}`);
        }
        return v as T;
      },
      default: opts.default,
      aliases: opts.aliases,
    };
  },
};

export interface ParsedFlags {
  /** Merged values: every schema key is present (with its default if unset). */
  values: Record<string, unknown>;
  /** True if `--help` / `-h` was seen. Caller handles the actual help display. */
  help: boolean;
}

/**
 * Walk argv and apply the schema. Order-independent for flags; the first
 * occurrence of a flag wins. `--help` / `-h` are recognised before the
 * schema and only flip the `help` flag — they don't touch `values`.
 *
 * Throws on unknown flags, missing values, or values that fail their
 * spec's parser. The caller is expected to wrap the call in a try/catch
 * and surface a clear error.
 */
export function parseFlags(argv: string[], schema: Record<string, FlagSpec>): ParsedFlags {
  const values: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(schema)) {
    values[name] = spec.default;
  }
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      help = true;
      continue;
    }

    let matchedName: string | null = null;
    let matchedSpec: FlagSpec | null = null;
    for (const [name, spec] of Object.entries(schema)) {
      if (a === `--${name}` || (spec.aliases && spec.aliases.includes(a))) {
        matchedName = name;
        matchedSpec = spec;
        break;
      }
    }
    if (!matchedName || !matchedSpec) {
      throw new Error(`unknown argument: ${a}`);
    }
    const next = argv[i + 1];
    if (next === undefined) {
      throw new Error(`${a} requires a value`);
    }
    values[matchedName] = matchedSpec.parse(next, a);
    i++;
  }

  return { values, help };
}

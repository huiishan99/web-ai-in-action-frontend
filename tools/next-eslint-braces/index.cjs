'use strict';

// Prototype: only the normalized Next rootDir -> fast-glob -> micromatch call.
// Directory traversal and pattern matching remain in the official packages.
const { expand } = require('brace-expansion');
const MAX_PATTERN_LENGTH = 4096;
const MAX_GROUP_SYMBOLS = 128;
const MAX_NESTING = 32;
const MAX_EXPANSIONS = 4096;
const MAX_EXPANDED_LENGTH = 1000000;

function braces(pattern, options) {
  if (typeof pattern !== 'string' || pattern.includes('\\') || options?.expand !== true || options?.nodupes !== true || Object.keys(options).some(key => key !== 'expand' && key !== 'nodupes')) {
    throw new TypeError('Unsupported normalized Next brace expansion interface');
  }
  if (pattern.length > MAX_PATTERN_LENGTH) throw new RangeError('Next root glob exceeds the supported pattern length');
  if (pattern.includes('\0')) throw new TypeError('Next root glob cannot contain a null character');
  let index = 0;
  let symbols = 0;
  const literals = new Map();
  let codePoint = 0xe000;
  function literal(value) {
    while (pattern.includes(String.fromCharCode(codePoint)) || literals.has(String.fromCharCode(codePoint))) codePoint++;
    if (codePoint > 0xf8ff) throw new RangeError('Next root glob exceeds the literal token budget');
    const token = String.fromCharCode(codePoint++);
    literals.set(token, value);
    return { value: token, count: 1, maxLength: value.length };
  }
  function budget(result) {
    if (result.count > MAX_EXPANSIONS || result.count * result.maxLength > MAX_EXPANDED_LENGTH) {
      throw new RangeError('Next root glob exceeds the conservative expansion budget');
    }
    return result;
  }
  function lastLiteralCharacter(value) {
    for (let position = value.length - 1; position >= 0; position--) {
      const decoded = literals.get(value[position]) ?? value[position];
      if (decoded.length) return decoded.slice(-1);
    }
    return '';
  }
  function range(body) {
    const match = /^(-?\d+|[A-Za-z])\.\.(-?\d+|[A-Za-z])(?:\.\.(-?\d+))?$/.exec(body);
    if (!match || /^-?\d+$/.test(match[1]) !== /^-?\d+$/.test(match[2])) return null;
    if (match[3] && /^-?0\d+$/.test(match[3])) throw new RangeError('Next root glob has unsupported padded range step');
    const numeric = /^-?\d+$/.test(match[1]);
    const first = numeric ? BigInt(match[1]) : BigInt(match[1].charCodeAt(0));
    const last = numeric ? BigInt(match[2]) : BigInt(match[2].charCodeAt(0));
    const supplied = BigInt(match[3] || 1);
    const step = supplied === 0n ? 1n : supplied < 0n ? -supplied : supplied;
    if (numeric && [first, last, step].some(value => value > 9007199254740991n || value < -9007199254740991n)) throw new RangeError('Next root glob range must use safe integers');
    const distance = last > first ? last - first : first - last;
    const count = distance / step + 1n;
    // Keep the original braces default limit for numeric sequences, and fail
    // explicitly on other over-budget sequences before any library expansion.
    if (numeric && count > 1000n || count > BigInt(MAX_EXPANSIONS)) throw new RangeError('Next root glob exceeds the range limit');
    if (numeric) return budget({ value: `{${body}}`, count: Number(count), maxLength: body.length + 2 });
    const tokens = [];
    const direction = first <= last ? step : -step;
    for (let current = first; direction > 0n ? current <= last : current >= last; current += direction) tokens.push(literal(String.fromCharCode(Number(current))).value);
    return { value: tokens.length === 1 ? tokens[0] : `{${tokens.join(',')}}`, count: Number(count), maxLength: 1 };
  }
  function sequence(closing, depth, brace = false) {
    if (depth > MAX_NESTING) throw new RangeError('Next root glob exceeds the supported group depth');
    const alternatives = [];
    let directRangeSyntax = false;
    let hasNestedGroup = false;
    let result = { value: '', count: 1, maxLength: 0 };
    const append = part => { result = budget({ value: result.value + part.value, count: result.count * part.count, maxLength: result.maxLength + part.maxLength }); };
    while (index < pattern.length) {
      const character = pattern[index];
      if (character === closing) break;
      if (character === '.' && pattern[index + 1] === '.') directRangeSyntax = true;
      if (character === '}' || closing === ')' && character === '}') throw new TypeError('Next root glob has unbalanced groups');
      if (character === ',' && brace) { alternatives.push(result); result = { value: '', count: 1, maxLength: 0 }; index++; continue; }
      if ('"\'`'.includes(character)) {
        const end = pattern.indexOf(character, index + 1);
        if (end < 0) throw new TypeError('Next root glob has an unclosed quote');
        append(literal(pattern.slice(index + 1, end))); index = end + 1; continue;
      }
      if (character === '[') {
        const start = index++;
        let brackets = 1;
        while (index < pattern.length && brackets) { if (pattern[index] === '[') brackets++; if (pattern[index] === ']') brackets--; index++; }
        append(literal(pattern.slice(start, index))); continue;
      }
      if (character === '{' || character === '(') {
        hasNestedGroup = true;
        if (++symbols > MAX_GROUP_SYMBOLS) throw new RangeError('Next root glob exceeds the supported group count');
        const start = index++;
        const isBrace = character === '{';
        if (isBrace && lastLiteralCharacter(result.value) === '$' && pattern[start - 1] !== '$') throw new TypeError('Next root glob has unsupported quoted dollar context');
        const child = sequence(isBrace ? '}' : ')', depth + 1, isBrace);
        if (pattern[index] !== (isBrace ? '}' : ')')) throw new TypeError('Next root glob has unbalanced groups');
        index++; symbols++;
        if (symbols > MAX_GROUP_SYMBOLS) throw new RangeError('Next root glob exceeds the supported group count');
        if (!isBrace) { append({ value: `(${child.value})`, count: child.count, maxLength: child.maxLength + 2 }); continue; }
        if (pattern[start - 1] === '$') {
          if (/["'`\[\]{}\u00a0\ufeff]/.test(pattern.slice(start + 1, index - 1))) throw new TypeError('Next root glob has unsupported dollar brace context');
          append(literal(pattern.slice(start, index))); continue;
        }
        if (child.directRangeSyntax) {
          if (child.alternatives > 1 || child.hasNestedGroup) throw new RangeError('Next root glob has unsupported combined range syntax');
          const ranged = range(pattern.slice(start + 1, index - 1));
          if (!ranged) throw new RangeError('Next root glob has unsupported range syntax');
          append(ranged); continue;
        }
        if (child.alternatives > 1) { append({ value: `{${child.value}}`, count: child.count, maxLength: child.maxLength }); continue; }
        append({ value: literal('{').value + child.value + literal('}').value, count: child.count, maxLength: child.maxLength + 2 });
        continue;
      }
      if (character === '\u00a0' || character === '\ufeff') { index++; continue; }
      append(character === ']' ? literal('\\]') : character === ',' ? literal(',') : { value: character, count: 1, maxLength: 1 });
      index++;
    }
    alternatives.push(result);
    return budget({ value: alternatives.map(item => item.value).join(','), count: alternatives.reduce((sum, item) => sum + item.count, 0), maxLength: Math.max(...alternatives.map(item => item.maxLength)), alternatives: alternatives.length, directRangeSyntax, hasNestedGroup });
  }
  const prepared = sequence(undefined, 0);
  // A literal prefix retains empty branches. Preflight counts *all* branches,
  // including duplicate/empty intermediates, so upstream caps cannot hide an
  // omitted match. Tokenization prevents sentinel growth and brace rewrites.
  const prefixed = 'x' + prepared.value;
  const expanded = expand(prefixed, {
    max: MAX_EXPANSIONS + 1,
    maxLength: (prefixed.length + 1) * (MAX_EXPANSIONS + 1) + 1,
    maxDepth: MAX_GROUP_SYMBOLS + 1,
    maxRewrites: 0,
  });
  const restored = expanded.map(item => {
    if (!item.startsWith('x')) throw new Error('Unexpected upstream brace expansion prefix');
    return [...item.slice(1)].map(character => literals.get(character) ?? character).join('');
  });
  if (restored.length !== prepared.count || restored.length > MAX_EXPANSIONS || restored.reduce((sum, item) => sum + item.length, 0) > MAX_EXPANDED_LENGTH) {
    throw new RangeError('Next root glob exceeds the supported expansion budget');
  }
  return [...new Set(restored)];
}

module.exports = braces;

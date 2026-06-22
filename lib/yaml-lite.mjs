// lib/yaml-lite.mjs
// Zero-dependency minimal YAML — covers only the subset agent-path-forge itself uses:
//   comments (whole-line / inline), key: value, nested maps, inline arrays [a,b] and block arrays (- item),
//   single/double quotes and bare scalars, true/false/null, numbers, empty [] {}.
// Unsupported syntax (tab indentation, anchors & aliases, block scalars | >, multi-document, list-of-maps) -> throws outright, never silently guesses.
// Used only to read "our own simple config" (skill.yaml / rule frontmatter); machine-read files like manifests use JSON.

// Strip inline comments: from the first # that is "preceded by whitespace (or at line start) and not inside quotes", to end of line.
function stripComment(line) {
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

// Split on a delimiter, but respect quotes and bracket depth (used for inline arrays).
function splitTopLevel(str, delim) {
  const out = []; let cur = '', inS = false, inD = false, depth = 0;
  for (const c of str) {
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (!inS && !inD && (c === '[' || c === '{')) depth++;
    else if (!inS && !inD && (c === ']' || c === '}')) depth--;
    if (c === delim && !inS && !inD && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseFlowArray(s) {
  const inner = s.slice(1, -1).trim();
  if (inner === '') return [];
  const parts = splitTopLevel(inner, ',');
  if (parts.length > 1 && parts[parts.length - 1].trim() === '') parts.pop();   // allow trailing comma
  return parts.map((p) => {
    if (p.trim() === '') throw new Error(`yaml-lite: empty element in flow array: ${s}`);  // [a,,b]
    return parseScalar(p.trim());
  });
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || /^null$/i.test(s)) return null;
  if (/^true$/i.test(s)) return true;                                      // case-insensitive (matches js-yaml core)
  if (/^false$/i.test(s)) return false;
  if (s === '[]') return [];
  if (s === '{}') return {};
  if (s[0] === '"') return JSON.parse(s);                                  // double-quoted ≈ JSON string (throws if invalid)
  if (s[0] === "'") {
    if (s.length < 2 || s[s.length - 1] !== "'") throw new Error(`yaml-lite: bad single-quoted scalar: ${s}`);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s[0] === '[') {
    if (s[s.length - 1] !== ']') throw new Error(`yaml-lite: unclosed flow array: ${s}`);  // do not silently guess
    return parseFlowArray(s);
  }
  if (s[0] === '{') throw new Error(`yaml-lite: inline maps not supported: ${s}`);
  if (s[0] === '&' || s[0] === '*') throw new Error(`yaml-lite: anchors/aliases not supported: ${s}`);
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return s;                                                                // bare string
}

// Look ahead to the next meaningful line: a deeper list item -> 'list', a deeper key -> 'map', nothing deeper -> 'none'
function childKind(lines, ln, indent) {
  for (let i = ln + 1; i < lines.length; i++) {
    const l = stripComment(lines[i]);
    if (l.trim() === '') continue;
    const ind = l.length - l.trimStart().length;
    if (ind <= indent) return 'none';
    return l.trim().startsWith('- ') ? 'list' : 'map';
  }
  return 'none';
}

export function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, container: root }];
  const lines = text.replace(/^﻿/, '').split('\n');
  for (let ln = 0; ln < lines.length; ln++) {
    if (/^\s*\t/.test(lines[ln])) throw new Error(`yaml-lite: tab indentation not supported (line ${ln + 1})`);
    const line = stripComment(lines[ln]);
    const content = line.trim();
    if (content === '' || content === '---' || content === '...') continue;
    const indent = line.length - line.trimStart().length;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].container;

    if (content.startsWith('- ')) {
      if (!Array.isArray(parent)) throw new Error(`yaml-lite: list item outside a list (line ${ln + 1})`);
      const item = content.slice(2).trim();
      if (/^[^[{"'].*:\s/.test(item)) throw new Error(`yaml-lite: list of maps not supported (line ${ln + 1})`);
      parent.push(parseScalar(item));
      continue;
    }

    const m = /^([^:]+):(.*)$/.exec(content);
    if (!m) throw new Error(`yaml-lite: cannot parse line ${ln + 1}: ${content}`);
    if (Array.isArray(parent)) throw new Error(`yaml-lite: key inside a list (line ${ln + 1})`);
    const key = m[1].trim();
    const rest = m[2].trim();
    if (rest === '') {
      const kind = childKind(lines, ln, indent);
      if (kind === 'none') { parent[key] = null; continue; }   // bare key: -> null (matches js-yaml)
      const child = kind === 'list' ? [] : {};
      parent[key] = child;
      stack.push({ indent, container: child });
    } else {
      parent[key] = parseScalar(rest);
    }
  }
  return root;
}

// ---- Output: serialize our small frontmatter object into valid YAML (a JSON string is itself valid YAML) ----
function needsQuote(s) {
  if (s === '') return true;
  if (/^\s|\s$/.test(s)) return true;
  if (/[\n\r\t]/.test(s)) return true;             // control chars -> must quote, otherwise produces invalid multi-line YAML
  if (/:(\s|$)|\s#/.test(s)) return true;          // ": " / ends with ":" / " #"
  if (/^[-?:,[\]{}&*!|>'"%@`]/.test(s)) return true;
  if (/^(true|false|null|~)$/i.test(s) || /^-?\d/.test(s)) return true;
  return false;
}

function emitScalar(v) {
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.map(emitScalar).join(', ')}]`;
  return needsQuote(v) ? JSON.stringify(v) : v;
}

// Single-level frontmatter: { description, allowed-tools?, globs?, alwaysApply? }
export function toFrontmatter(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}: ${emitScalar(v)}`).join('\n');
}

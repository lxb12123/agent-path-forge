// lib/managed-block.mjs
// Maintain an "agent-path-forge managed" content block inside shared host files (.gitignore / CLAUDE.md, etc.).
// Delimited by clear start/end markers; repeated runs only update this block and leave the rest of the user's content untouched (strictly idempotent).

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Return the full file content after inserting/replacing the managed block.
//   existing    current file content (pass '' when it does not exist)
//   startMarker / endMarker  the start/end marker lines of the managed block
//   body        the body to write into this block (between the markers; must not itself contain the markers)
export function upsertBlock(existing, startMarker, endMarker, body) {
  if (body.includes(startMarker) || body.includes(endMarker)) {
    throw new Error('managed-block: body must not contain the block markers');
  }
  const block = `${startMarker}\n${body}\n${endMarker}`;
  // Only match paired "start then end" regions (non-greedy):
  //  - a marker appearing alone in the user's prose is not mistaken for a block;
  //  - when multiple blocks already exist, converge to one (update the first in place, delete the rest).
  const pattern = `${escapeRe(startMarker)}[\\s\\S]*?${escapeRe(endMarker)}`;
  const hasBlock = (existing.match(new RegExp(pattern, 'g')) || []).length > 0;
  if (hasBlock) {
    let seen = 0;
    const out = existing.replace(new RegExp(pattern, 'g'), () => (seen++ === 0 ? block : ''));
    return out.replace(/\n{3,}/g, '\n\n');   // collapse extra blank lines left behind after deleting duplicate blocks
  }
  const base = existing.trimEnd();
  return base ? `${base}\n\n${block}\n` : `${block}\n`;   // append (separated from existing content by a blank line)
}

// lib/managed-block.mjs
// 在共享宿主文件(.gitignore / CLAUDE.md 等)里维护一段"geneprint 托管"的内容块。
// 用清晰的起止标记界定;重复运行只更新本块、不动用户的其余内容(严格幂等)。

// 返回插入/替换托管块后的完整文件内容。
//   existing    现有文件内容(不存在时传 '')
//   startMarker / endMarker  托管块的起止标记行
//   body        本块要写入的正文(标记之间)
export function upsertBlock(existing, startMarker, endMarker, body) {
  const block = `${startMarker}\n${body}\n${endMarker}`;
  const start = existing.indexOf(startMarker);
  const end = existing.indexOf(endMarker);
  if (start !== -1 && end !== -1 && end > start) {
    const before = existing.slice(0, start);
    const after = existing.slice(end + endMarker.length);
    return before + block + after;                 // 原位替换,前后内容保持不变
  }
  const base = existing.trimEnd();
  return base ? `${base}\n\n${block}\n` : `${block}\n`;  // 追加(与已有内容空行隔开)
}

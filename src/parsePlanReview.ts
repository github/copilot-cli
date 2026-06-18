export type MenuItem = {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
};

function tryParseJsonCandidate(candidate: string): MenuItem[] | null {
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) {
      return parsed.map((it: any, idx: number) => {
        if (typeof it === 'string') {
          return { id: String(idx + 1), label: it } as MenuItem;
        }
        return {
          id: it.id ? String(it.id) : String(idx + 1),
          label: it.label || it.title || it.name || String(it.id || idx + 1),
          description: it.description || it.desc || undefined,
          recommended: !!it.recommended,
        } as MenuItem;
      });
    }
    if (parsed && typeof parsed === 'object') {
      // single object -> try to convert to array
      const obj = parsed as any;
      if (Array.isArray(obj.items)) return tryParseJsonCandidate(JSON.stringify(obj.items));
      // fallback: treat keys as options
      return Object.keys(obj).map((k, i) => ({ id: k, label: obj[k] && typeof obj[k] === 'string' ? obj[k] : String(k) }));
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function parsePlanReviewOptions(text: string, metadata?: any): MenuItem[] {
  // 1) If metadata contains tool/function call structured actions, prefer that
  if (metadata && metadata.function_call && metadata.function_call.arguments) {
    try {
      const args = JSON.parse(metadata.function_call.arguments);
      if (Array.isArray(args)) return tryParseJsonCandidate(JSON.stringify(args)) || [];
    } catch {
      // ignore and fallthrough
    }
  }

  const results: MenuItem[] = [];

  // 2) Extract fenced code blocks (json/yaml/none) and try JSON.parse first
  const fenceRegex = /```(?:json|yaml|yml)?\n([\s\S]*?)\n```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(text)) !== null) {
    const candidate = m[1].trim();
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed && parsed.length) return parsed;
  }

  // 3) Try to find inline JSON arrays/objects anywhere
  const inlineJsonRegex = /(\[[\s\S]*?\]|\{[\s\S]*?\})/g;
  while ((m = inlineJsonRegex.exec(text)) !== null) {
    const candidate = m[1];
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed && parsed.length) return parsed;
  }

  // 4) Numbered list heuristic
  const lines = text.split(/\r?\n/);
  const numbered: MenuItem[] = [];
  for (const line of lines) {
    const numMatch = line.match(/^\s*(\d+)\.\s*(.+)$/);
    if (numMatch) {
      numbered.push({ id: numMatch[1], label: numMatch[2].trim() });
    }
  }
  if (numbered.length) return numbered;

  // 5) Bulleted list heuristic
  const bullets: MenuItem[] = [];
  let bulletIndex = 1;
  for (const line of lines) {
    const b = line.match(/^\s*[-*+]\s+(.+)$/);
    if (b) {
      bullets.push({ id: String(bulletIndex++), label: b[1].trim() });
    }
  }
  if (bullets.length) return bullets;

  // 6) Minimal fallback: Accept / Request changes
  return [
    { id: 'accept', label: 'Accept plan', description: 'Apply the plan as-is' },
    { id: 'request_changes', label: 'Request changes', description: 'Ask the model for updates' },
  ];
}

// Export default for CommonJS ease
export default parsePlanReviewOptions;

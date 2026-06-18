import YAML from 'js-yaml';

export type MenuItem = {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
};

function normalizeMenuItem(raw: any, idx: number): MenuItem {
  if (typeof raw === 'string') {
    // try to extract [id] or (id) at start, and (recommended)
    const idMatch = raw.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
    const parenIdMatch = raw.match(/^\s*\(([^)]+)\)\s*(.*)$/);
    const recommendedMatch = /\brecommended\b/i.test(raw);
    let label = raw.trim();
    let id = String(idx + 1);
    if (idMatch) {
      id = idMatch[1].trim();
      label = idMatch[2].trim();
    } else if (parenIdMatch) {
      id = parenIdMatch[1].trim();
      label = parenIdMatch[2].trim();
    } else {
      // remove leading numeric markers like "1. " or "- "
      label = label.replace(/^\s*\d+\.\s*/, '').replace(/^\s*[-*+]\s*/, '').trim();
    }
    return { id, label, recommended: recommendedMatch };
  }
  if (raw && typeof raw === 'object') {
    const id = raw.id !== undefined ? String(raw.id) : String(raw.name ?? raw.key ?? idx + 1);
    const label = raw.label || raw.title || raw.name || String(raw.description || id);
    const recommended = !!raw.recommended || /recommended/i.test(String(raw.recommended || ''));
    return { id, label, description: raw.description, recommended };
  }
  return { id: String(idx + 1), label: String(raw) };
}

function tryParseJsonCandidate(candidate: string): MenuItem[] | null {
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) {
      return parsed.map((it: any, idx: number) => normalizeMenuItem(it, idx));
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as any;
      if (Array.isArray(obj.items)) return obj.items.map((it: any, idx: number) => normalizeMenuItem(it, idx));
      return Object.keys(obj).map((k, i) => normalizeMenuItem({ id: k, label: obj[k] }, i));
    }
  } catch (e) {
    return null;
  }
  return null;
}

function tryParseYamlCandidate(candidate: string): MenuItem[] | null {
  try {
    const parsed = YAML.load(candidate);
    if (Array.isArray(parsed)) return parsed.map((it: any, idx: number) => normalizeMenuItem(it, idx));
    if (parsed && typeof parsed === 'object') {
      const obj: any = parsed as any;
      if (Array.isArray(obj.items)) return obj.items.map((it: any, idx: number) => normalizeMenuItem(it, idx));
      // map keys
      return Object.keys(obj).map((k, i) => normalizeMenuItem({ id: k, label: obj[k] }, i));
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
      if (Array.isArray(args)) return (args as any[]).map((it, idx) => normalizeMenuItem(it, idx));
    } catch {
      // ignore and fallthrough
    }
  }

  // 2) Extract fenced code blocks (json/yaml/none)
  const fenceRegex = /```(?:json|yaml|yml)?\n([\s\S]*?)\n```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(text)) !== null) {
    const candidate = m[1].trim();
    // try JSON
    const j = tryParseJsonCandidate(candidate);
    if (j && j.length) return j;
    // try YAML
    const y = tryParseYamlCandidate(candidate);
    if (y && y.length) return y;
  }

  // 3) Try to find inline JSON arrays/objects anywhere
  const inlineJsonRegex = /(\[[\s\S]*?\]|\{[\s\S]*?\})/g;
  while ((m = inlineJsonRegex.exec(text)) !== null) {
    const candidate = m[1];
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed && parsed.length) return parsed;
  }

  // 4) Try to find YAML-like blocks without fences (look for lines starting with ---)
  const yamlDocRegex = /(^---[\s\S]*?\n(?:\.{3}\s*$|$))/gm;
  while ((m = yamlDocRegex.exec(text)) !== null) {
    const candidate = m[1];
    const y = tryParseYamlCandidate(candidate);
    if (y && y.length) return y;
  }

  // 5) Numbered list heuristic with stronger id extraction
  const lines = text.split(/\r?\n/);
  const numbered: MenuItem[] = [];
  for (const line of lines) {
    const numMatch = line.match(/^\s*(\d+)\.\s*(.+)$/);
    if (numMatch) {
      const raw = numMatch[2].trim();
      numbered.push(normalizeMenuItem(raw, numbered.length));
    }
  }
  if (numbered.length) return numbered;

  // 6) Bulleted list heuristic
  const bullets: MenuItem[] = [];
  for (const line of lines) {
    const b = line.match(/^\s*[-*+]\s+(.+)$/);
    if (b) {
      bullets.push(normalizeMenuItem(b[1].trim(), bullets.length));
    }
  }
  if (bullets.length) return bullets;

  // 7) Minimal fallback: Accept / Request changes
  return [
    { id: 'accept', label: 'Accept plan', description: 'Apply the plan as-is' },
    { id: 'request_changes', label: 'Request changes', description: 'Ask the model for updates' },
  ];
}

export default parsePlanReviewOptions;

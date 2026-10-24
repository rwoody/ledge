// The pure half of relative Markdown note links: `[map](reports/map.md)` and
// `[x](../daily/2026-10-22.md#Focus)`. It sits in shared/ beside links.ts and
// wikilinks.ts so the editor's draw side and its click side give one answer
// about what counts as a note link. Resolution against the note list stays
// view-side (App.tsx openNoteLink): the path here is workspace-relative text,
// never something sent over the RPC (architecture.md §2).

import { openableUrl } from "./links";

/** A note link's target: `path` is workspace-relative with forward slashes
 * ("reports/map.md"), `heading` the optional `#fragment`. */
export interface NoteLink {
  path: string;
  heading: string | null;
}

// A link href splits into path and `#fragment`. A query string is not part of
// a note's address, so `?x` stays on the path and fails the `.md` test.
function splitHref(raw: string): { path: string; fragment: string | null } | null {
  const text = raw.trim();
  if (!text || /\s/.test(text)) return null;
  // Anything openableUrl takes goes outside the app, and any other scheme
  // (file:, javascript:) is refused as before. Neither is a note link.
  if (openableUrl(text) !== null || /^[a-z][a-z0-9+.-]*:/i.test(text)) return null;
  const hash = text.indexOf("#");
  const path = hash < 0 ? text : text.slice(0, hash);
  if (!/\.md$/i.test(path)) return null;
  return { path, fragment: hash < 0 ? null : text.slice(hash + 1) };
}

function decode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null; // a stray "%" is not an escape, and guessing could open the wrong file
  }
}

/** True when `href` is a relative `.md` link: no scheme, not `www.` or an
 * email, a path ending in `.md` with an optional `#fragment`. The click side
 * uses it to keep such a link in the app instead of handing it to the OS. */
export function isNoteLink(href: string): boolean {
  return splitHref(href) !== null;
}

/**
 * The note `href` addresses, or null when it is not a note link or cannot be
 * resolved. `fromFolder` is the linking note's own folder, workspace-relative
 * ("" at the top level). A leading `/` resolves from the workspace root. `.`
 * and `..` are normalized, and a path that climbs above the root is null.
 */
export function resolveNoteLink(href: string, fromFolder: string): NoteLink | null {
  const parts = splitHref(href);
  if (!parts) return null;
  const path = decode(parts.path);
  if (path === null || path.includes("\\") || path.includes("\0")) return null;
  const segs = path.startsWith("/") ? [] : fromFolder.split("/").filter(Boolean);
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (segs.pop() === undefined) return null;
    } else segs.push(seg);
  }
  const last = segs[segs.length - 1];
  if (!last || !/\.md$/i.test(last)) return null; // "a/.." ends elsewhere
  const fragment = parts.fragment === null ? null : decode(parts.fragment);
  return { path: segs.join("/"), heading: fragment?.trim() || null };
}

/** A note's workspace-relative path, the form `resolveNoteLink` yields:
 * its root-relative `folder` (NoteMeta.folder) plus the file's own name. */
export function noteRelPath(note: { path: string; folder?: string }): string {
  const name = note.path.split(/[\\/]/).pop() ?? "";
  return note.folder ? `${note.folder}/${name}` : name;
}

/** The comparison key for two note paths: Unicode-normalized and case-folded,
 * so a link typed `Notes/Café.md` still finds the file on a case-insensitive
 * or decomposed-filename volume (APFS keeps the spelling it was created with). */
export function noteKey(relPath: string): string {
  return relPath.normalize("NFC").toLowerCase();
}

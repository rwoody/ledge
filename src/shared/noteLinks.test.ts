import { describe, expect, test } from "bun:test";
import { isNoteLink, noteKey, noteRelPath, resolveNoteLink } from "./noteLinks";

describe("resolveNoteLink", () => {
  test("a sibling resolves in the linking note's own folder", () => {
    expect(resolveNoteLink("b.md", "")).toEqual({ path: "b.md", heading: null });
    expect(resolveNoteLink("./b.md", "projects")).toEqual({ path: "projects/b.md", heading: null });
  });

  test("a subfolder path is appended to the linking note's folder", () => {
    expect(resolveNoteLink("reports/map.md", "a/b")).toEqual({ path: "a/b/reports/map.md", heading: null });
  });

  test("`..` climbs out of the linking note's folder", () => {
    expect(resolveNoteLink("../daily/2026-10-22.md", "projects")).toEqual({
      path: "daily/2026-10-22.md",
      heading: null,
    });
    expect(resolveNoteLink("x/../y.md", "")).toEqual({ path: "y.md", heading: null });
  });

  test("a leading slash resolves from the workspace root", () => {
    expect(resolveNoteLink("/daily/d.md", "projects/api")).toEqual({ path: "daily/d.md", heading: null });
  });

  test("a path that climbs above the root is null, from either start", () => {
    expect(resolveNoteLink("../x.md", "")).toBeNull();
    expect(resolveNoteLink("../../x.md", "a")).toBeNull();
    expect(resolveNoteLink("/../x.md", "a")).toBeNull();
  });

  test("a #fragment is the heading to reveal", () => {
    expect(resolveNoteLink("../daily/d.md#Focus", "a")).toEqual({ path: "daily/d.md", heading: "Focus" });
    expect(resolveNoteLink("b.md#My%20Head", "")).toEqual({ path: "b.md", heading: "My Head" });
    expect(resolveNoteLink("b.md#", "")).toEqual({ path: "b.md", heading: null });
  });

  test("percent-encoding in the path is decoded", () => {
    expect(resolveNoteLink("my%20note.md", "")).toEqual({ path: "my note.md", heading: null });
  });

  test("a malformed escape or an encoded traversal is not guessed at", () => {
    expect(resolveNoteLink("100%.md", "")).toBeNull();
    expect(resolveNoteLink("%2e%2e/x.md", "")).toBeNull();
  });

  test(".md matches case-insensitively", () => {
    expect(resolveNoteLink("B.MD", "")).toEqual({ path: "B.MD", heading: null });
  });

  test("a relative path that is not .md is null", () => {
    expect(resolveNoteLink("pic.png", "")).toBeNull();
    expect(resolveNoteLink("notes.md.txt", "")).toBeNull();
    expect(resolveNoteLink("b.md?x=1", "")).toBeNull();
    expect(resolveNoteLink("dir/..", "")).toBeNull();
  });

  test("a link with a scheme, www. or an email is null", () => {
    expect(resolveNoteLink("https://example.com/a.md", "")).toBeNull();
    expect(resolveNoteLink("file:///etc/a.md", "")).toBeNull();
    expect(resolveNoteLink("www.example.com/a.md", "")).toBeNull();
    expect(resolveNoteLink("dev@example.com", "")).toBeNull();
  });
});

describe("isNoteLink", () => {
  test("is true for what resolves, and for an escaping link, so it stays in the app", () => {
    expect(isNoteLink("b.md#h")).toBe(true);
    expect(isNoteLink("../../x.md")).toBe(true);
  });

  test("is false for URLs and other files", () => {
    expect(isNoteLink("https://example.com")).toBe(false);
    expect(isNoteLink("pic.png")).toBe(false);
    expect(isNoteLink("")).toBe(false);
  });
});

describe("noteRelPath and noteKey", () => {
  test("a note's relative path is its folder plus its file name", () => {
    expect(noteRelPath({ path: "/w/a/b/c.md", folder: "a/b" })).toBe("a/b/c.md");
    expect(noteRelPath({ path: "/w/c.md" })).toBe("c.md");
  });

  test("keys ignore case and Unicode normalization", () => {
    expect(noteKey("Notes/Café.md")).toBe(noteKey("notes/café.MD"));
  });
});

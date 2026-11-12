import { describe, expect, it } from "vitest";
import {
  DEFAULT_READER_PREFERENCES,
  parseReaderBookmarks,
  parseReaderPreferences,
  parseReaderScrollPosition,
  readerPositionKey,
  toggleReaderBookmark,
  type ReaderBookmark,
} from "@/lib/reader-local-state";

const bookmark: ReaderBookmark = {
  id: "under-blue-skies:2",
  bookId: "under-blue-skies",
  bookTitle: "Under Blue Skies",
  chapterIndex: 2,
  chapterTitle: "The Long Way Home",
  createdAt: "2026-11-11T18:00:00.000Z",
};

describe("reader preferences", () => {
  it("returns defaults for invalid stored data", () => {
    expect(parseReaderPreferences(null)).toEqual(DEFAULT_READER_PREFERENCES);
    expect(parseReaderPreferences("night")).toEqual(DEFAULT_READER_PREFERENCES);
  });

  it("keeps supported settings and clamps font size", () => {
    expect(parseReaderPreferences({
      theme: "night",
      font: "sans",
      fontSize: 99,
      lineSpacing: "airy",
      contentWidth: "wide",
    })).toEqual({
      theme: "night",
      font: "sans",
      fontSize: 30,
      lineSpacing: "airy",
      contentWidth: "wide",
    });
  });

  it("falls back field-by-field when stored values are unknown", () => {
    expect(parseReaderPreferences({ theme: "ultraviolet", fontSize: 11 })).toEqual({
      ...DEFAULT_READER_PREFERENCES,
      fontSize: 14,
    });
  });
});

describe("reader bookmarks", () => {
  it("rejects malformed entries and duplicate ids", () => {
    expect(parseReaderBookmarks([
      bookmark,
      bookmark,
      { id: "bad", bookId: "book" },
      null,
    ])).toEqual([bookmark]);
  });

  it("adds then removes a bookmark by chapter identity", () => {
    const added = toggleReaderBookmark([], bookmark);
    expect(added.saved).toBe(true);
    expect(added.bookmarks).toEqual([bookmark]);

    const removed = toggleReaderBookmark(added.bookmarks, bookmark);
    expect(removed.saved).toBe(false);
    expect(removed.bookmarks).toEqual([]);
  });
});

describe("reading position", () => {
  it("builds a stable, chapter-specific storage key", () => {
    expect(readerPositionKey("spook", 4)).toBe("storyhouse.reader.position.v1:spook:4");
  });

  it("parses safe scroll positions", () => {
    expect(parseReaderScrollPosition(null)).toBe(0);
    expect(parseReaderScrollPosition("-10")).toBe(0);
    expect(parseReaderScrollPosition("not-a-number")).toBe(0);
    expect(parseReaderScrollPosition("123.9")).toBe(123);
    expect(parseReaderScrollPosition("3000000")).toBe(2_000_000);
  });
});

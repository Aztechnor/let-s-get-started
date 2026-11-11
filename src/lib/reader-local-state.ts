export type ReaderTheme = "paper" | "sepia" | "night";
export type ReaderFont = "serif" | "sans";
export type ReaderLineSpacing = "comfortable" | "relaxed" | "airy";
export type ReaderContentWidth = "narrow" | "medium" | "wide";

export interface ReaderPreferences {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;
  lineSpacing: ReaderLineSpacing;
  contentWidth: ReaderContentWidth;
}

export interface ReaderBookmark {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  createdAt: string;
}

export const READER_PREFERENCES_KEY = "storyhouse.reader.preferences.v1";
export const READER_BOOKMARKS_KEY = "storyhouse.reader.bookmarks.v1";

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  theme: "paper",
  font: "serif",
  fontSize: 19,
  lineSpacing: "relaxed",
  contentWidth: "medium",
};

const themes = new Set<ReaderTheme>(["paper", "sepia", "night"]);
const fonts = new Set<ReaderFont>(["serif", "sans"]);
const lineSpacings = new Set<ReaderLineSpacing>(["comfortable", "relaxed", "airy"]);
const contentWidths = new Set<ReaderContentWidth>(["narrow", "medium", "wide"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseReaderPreferences(value: unknown): ReaderPreferences {
  if (!isRecord(value)) return { ...DEFAULT_READER_PREFERENCES };

  const fontSize = typeof value["fontSize"] === "number" && Number.isFinite(value["fontSize"])
    ? Math.round(Math.min(30, Math.max(14, value["fontSize"])))
    : DEFAULT_READER_PREFERENCES.fontSize;

  return {
    theme: themes.has(value["theme"] as ReaderTheme) ? value["theme"] as ReaderTheme : DEFAULT_READER_PREFERENCES.theme,
    font: fonts.has(value["font"] as ReaderFont) ? value["font"] as ReaderFont : DEFAULT_READER_PREFERENCES.font,
    fontSize,
    lineSpacing: lineSpacings.has(value["lineSpacing"] as ReaderLineSpacing)
      ? value["lineSpacing"] as ReaderLineSpacing
      : DEFAULT_READER_PREFERENCES.lineSpacing,
    contentWidth: contentWidths.has(value["contentWidth"] as ReaderContentWidth)
      ? value["contentWidth"] as ReaderContentWidth
      : DEFAULT_READER_PREFERENCES.contentWidth,
  };
}

export function parseReaderBookmarks(value: unknown): ReaderBookmark[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const valid: ReaderBookmark[] = [];

  for (const candidate of value) {
    if (!isRecord(candidate)) continue;
    const { id, bookId, bookTitle, chapterIndex, chapterTitle, createdAt } = candidate;
    if (
      typeof id !== "string" ||
      typeof bookId !== "string" ||
      typeof bookTitle !== "string" ||
      typeof chapterIndex !== "number" ||
      !Number.isInteger(chapterIndex) ||
      chapterIndex < 0 ||
      typeof chapterTitle !== "string" ||
      typeof createdAt !== "string" ||
      !Number.isFinite(Date.parse(createdAt)) ||
      !id ||
      !bookId ||
      !bookTitle ||
      !chapterTitle ||
      seen.has(id)
    ) {
      continue;
    }
    seen.add(id);
    valid.push({
      id: id.slice(0, 180),
      bookId: bookId.slice(0, 120),
      bookTitle: bookTitle.slice(0, 180),
      chapterIndex,
      chapterTitle: chapterTitle.slice(0, 240),
      createdAt,
    });
    if (valid.length >= 100) break;
  }

  return valid;
}

export function toggleReaderBookmark(
  bookmarks: ReaderBookmark[],
  bookmark: ReaderBookmark,
): { bookmarks: ReaderBookmark[]; saved: boolean } {
  const exists = bookmarks.some((entry) => entry.id === bookmark.id);
  if (exists) {
    return { bookmarks: bookmarks.filter((entry) => entry.id !== bookmark.id), saved: false };
  }
  return { bookmarks: [bookmark, ...bookmarks].slice(0, 100), saved: true };
}

export function readerPositionKey(bookId: string, chapterIndex: number): string {
  return `storyhouse.reader.position.v1:${bookId}:${chapterIndex}`;
}

export function parseReaderScrollPosition(value: string | null): number {
  if (value === null || value.trim() === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(2_000_000, Math.floor(parsed));
}

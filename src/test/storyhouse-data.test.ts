import { describe, expect, it, beforeAll } from "vitest";
import {
  getLibrary,
  findBook,
  getChapter,
  getCollectionStats,
  searchChapters,
  type BookSummary,
  type ChapterSummary,
} from "@/server/storyhouse-data";

// Load the library data once
let library: BookSummary[];
let firstBookId: string;

beforeAll(() => {
  library = getLibrary();
  firstBookId = library[0]?.id || "";
});

describe("storyhouse-data.ts", () => {
  describe("getLibrary", () => {
    it("returns an array of books", () => {
      expect(Array.isArray(library)).toBe(true);
      expect(library.length).toBeGreaterThan(0);
    });

    it("each book has required properties", () => {
      library.forEach((book) => {
        expect(book).toHaveProperty("id");
        expect(book).toHaveProperty("title");
        expect(book).toHaveProperty("subtitle");
        expect(book).toHaveProperty("author");
        expect(book).toHaveProperty("kind");
        expect(book).toHaveProperty("description");
        expect(book).toHaveProperty("cover");
        expect(book).toHaveProperty("pdf_pages");
        expect(book).toHaveProperty("story_count");
        expect(book).toHaveProperty("chapters");
      });
    });

    it("each chapter has required properties", () => {
      library.forEach((book) => {
        book.chapters.forEach((chapter: ChapterSummary) => {
          expect(chapter).toHaveProperty("index");
          expect(chapter).toHaveProperty("title");
          expect(chapter).toHaveProperty("word_count");
          expect(chapter).toHaveProperty("minutes");
          expect(chapter).toHaveProperty("start_pdf_page");
          expect(chapter).toHaveProperty("end_pdf_page");
          expect(chapter).toHaveProperty("preview");
        });
      });
    });

    it("contains expected books", () => {
      const bookTitles = library.map((book) => book.title);
      // Check if we have at least 2 books
      expect(library.length).toBeGreaterThanOrEqual(2);
      // If the books are loaded, they should contain these titles
      if (library.length >= 2) {
        expect(bookTitles).toContain("Under Blue Skies");
        expect(bookTitles).toContain("SPOOK");
      }
    });

    it("books have cover URLs", () => {
      library.forEach((book) => {
        expect(book.cover).toBeTruthy();
        // Cover should be a URL (either absolute or starting with /)
        expect(typeof book.cover).toBe("string");
      });
    });
  });

  describe("findBook", () => {
    it("finds a book by ID", () => {
      if (firstBookId) {
        const book = findBook(firstBookId);
        expect(book).not.toBeNull();
        expect(book?.id).toBe(firstBookId);
      }
    });

    it("returns null for non-existent book ID", () => {
      const book = findBook("non-existent-id");
      expect(book).toBeNull();
    });

    it("returns null for empty ID", () => {
      const book = findBook("");
      expect(book).toBeNull();
    });
  });

  describe("getChapter", () => {
    it("returns a chapter for valid book and index", () => {
      if (firstBookId) {
        const book = findBook(firstBookId);
        if (book && book.chapters.length > 0) {
          const result = getChapter(firstBookId, 0);
          expect(result).not.toBeNull();
          expect(result?.book.id).toBe(firstBookId);
          expect(result?.chapter.index).toBe(0);
        }
      }
    });

    it("returns null for non-existent book ID", () => {
      const result = getChapter("non-existent-id", 0);
      expect(result).toBeNull();
    });

    it("returns null for out-of-bounds chapter index", () => {
      if (firstBookId) {
        const result = getChapter(firstBookId, 9999);
        expect(result).toBeNull();
      }
    });

    it("returns null for negative chapter index", () => {
      if (firstBookId) {
        const result = getChapter(firstBookId, -1);
        expect(result).toBeNull();
      }
    });
  });

  describe("getCollectionStats", () => {
    it("returns book count and story count", () => {
      const stats = getCollectionStats();
      expect(stats).toHaveProperty("bookCount");
      expect(stats).toHaveProperty("storyCount");
      expect(stats.bookCount).toBeGreaterThan(0);
      expect(stats.storyCount).toBeGreaterThan(0);
    });

    it("book count matches library length", () => {
      const stats = getCollectionStats();
      expect(stats.bookCount).toBe(library.length);
    });

    it("story count is sum of all book story counts", () => {
      const stats = getCollectionStats();
      const expectedStoryCount = library.reduce(
        (sum, book) => sum + book.story_count,
        0
      );
      expect(stats.storyCount).toBe(expectedStoryCount);
    });
  });

  describe("searchChapters", () => {
    it("returns empty array for queries shorter than 2 characters", () => {
      const results = searchChapters("a");
      expect(results).toEqual([]);
    });

    it("returns empty array for empty query", () => {
      const results = searchChapters("");
      expect(results).toEqual([]);
    });

    it("returns results for valid search query", () => {
      const results = searchChapters("story");
      expect(Array.isArray(results)).toBe(true);
      // Should find something with "story" in the text
      expect(results.length).toBeGreaterThan(0);
    });

    it("results have required properties", () => {
      const results = searchChapters("the");
      results.forEach((result) => {
        expect(result).toHaveProperty("book_id");
        expect(result).toHaveProperty("book_title");
        expect(result).toHaveProperty("chapter_index");
        expect(result).toHaveProperty("chapter_title");
        expect(result).toHaveProperty("excerpt");
      });
    });

    it("excerpt contains the search term", () => {
      const query = "under";
      const results = searchChapters(query);
      results.forEach((result) => {
        expect(result.excerpt.toLowerCase()).toContain(query);
      });
    });

    it("limits results to maximum count", () => {
      const results = searchChapters("the");
      // Should not return more than 40 results
      expect(results.length).toBeLessThanOrEqual(40);
    });

    it("handles case-insensitive search", () => {
      const resultsLower = searchChapters("under");
      const resultsUpper = searchChapters("UNDER");
      // Both should return similar results (case shouldn't matter)
      expect(resultsLower.length).toBeGreaterThan(0);
      expect(resultsUpper.length).toBeGreaterThan(0);
    });

    it("matches chapter titles", () => {
      if (firstBookId) {
        const book = findBook(firstBookId);
        const firstChapter = book?.chapters[0];
        if (firstChapter) {
          const firstChapterTitle = firstChapter.title;
          const results = searchChapters(firstChapterTitle);
          expect(results.length).toBeGreaterThan(0);
        }
      }
    });

    it("handles special characters in query", () => {
      // Should not crash with special characters
      const results = searchChapters("test [special]");
      expect(Array.isArray(results)).toBe(true);
    });

    it("handles unicode characters in query", () => {
      // Should not crash with unicode
      const results = searchChapters("café");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("book structure validation", () => {
    it("all books have non-empty titles", () => {
      library.forEach((book) => {
        expect(book.title.length).toBeGreaterThan(0);
      });
    });

    it("all books have author field (may be empty)", () => {
      library.forEach((book) => {
        expect(book).toHaveProperty("author");
        // Author may be empty for some books (like SPOOK in the test data)
        expect(typeof book.author).toBe("string");
      });
    });

    it("all books have non-negative story counts", () => {
      library.forEach((book) => {
        expect(book.story_count).toBeGreaterThanOrEqual(0);
      });
    });

    it("all books have non-negative PDF page counts", () => {
      library.forEach((book) => {
        expect(book.pdf_pages).toBeGreaterThanOrEqual(0);
      });
    });

    it("all chapters have non-negative word counts", () => {
      library.forEach((book) => {
        book.chapters.forEach((chapter: ChapterSummary) => {
          expect(chapter.word_count).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it("all chapters have non-negative minutes", () => {
      library.forEach((book) => {
        book.chapters.forEach((chapter: ChapterSummary) => {
          expect(chapter.minutes).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it("all chapters have valid PDF page ranges", () => {
      library.forEach((book) => {
        book.chapters.forEach((chapter: ChapterSummary) => {
          expect(chapter.start_pdf_page).toBeGreaterThanOrEqual(0);
          expect(chapter.end_pdf_page).toBeGreaterThanOrEqual(chapter.start_pdf_page);
        });
      });
    });

    it("chapter indices are sequential", () => {
      library.forEach((book) => {
        const indices = book.chapters.map((c: ChapterSummary) => c.index);
        for (let i = 0; i < indices.length; i++) {
          expect(indices[i]).toBe(i);
        }
      });
    });
  });
});

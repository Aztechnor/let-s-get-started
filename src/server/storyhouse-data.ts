import booksJson from "./books.json";
import underBlueSkiesCover from "@/assets/under-blue-skies-cover.png.asset.json";
import spookCover from "@/assets/spook-cover.png.asset.json";

interface RawChapter {
  index: number;
  title: string;
  start_pdf_page: number;
  end_pdf_page: number;
  word_count: number;
  minutes: number;
  preview: string;
  text: string;
}

interface RawBook {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  kind: string;
  description: string;
  cover: string;
  pdf_pages: number;
  story_count: number;
  chapters: RawChapter[];
}

const data = booksJson as unknown as { books: RawBook[] };

// The original cover paths mapped to static files; map them to the CDN assets instead.
const coverUrls: Record<string, string> = {
  "/static/images/under-blue-skies-cover.png": underBlueSkiesCover.url,
  "/static/images/spook-cover.png": spookCover.url,
};

export interface ChapterSummary {
  index: number;
  title: string;
  word_count: number;
  minutes: number;
  start_pdf_page: number;
  end_pdf_page: number;
  preview: string;
}

export interface BookSummary {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  kind: string;
  description: string;
  cover: string;
  pdf_pages: number;
  story_count: number;
  chapters: ChapterSummary[];
}

export interface BookRef {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  kind: string;
  cover: string;
}

export interface SearchHit {
  book_id: string;
  book_title: string;
  chapter_index: number;
  chapter_title: string;
  excerpt: string;
}

function books(): RawBook[] {
  return data.books;
}

export function getLibrary(): BookSummary[] {
  return books().map((book) => ({
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    kind: book.kind,
    description: book.description,
    cover: coverUrls[book.cover] ?? book.cover,
    pdf_pages: book.pdf_pages,
    story_count: book.story_count,
    chapters: book.chapters.map((c) => ({
      index: c.index,
      title: c.title,
      word_count: c.word_count,
      minutes: c.minutes,
      start_pdf_page: c.start_pdf_page,
      end_pdf_page: c.end_pdf_page,
      preview: c.preview,
    })),
  }));
}

export function findBook(id: string): RawBook | null {
  return books().find((b) => b.id === id) ?? null;
}

export function bookRef(book: RawBook): BookRef {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    kind: book.kind,
    cover: coverUrls[book.cover] ?? book.cover,
  };
}

export function getChapter(
  bookId: string,
  chapterIndex: number,
): { book: BookRef; chapter: RawChapter } | null {
  const book = findBook(bookId);
  if (!book) return null;
  const chapter = book.chapters[chapterIndex];
  if (!chapter) return null;
  return { book: bookRef(book), chapter };
}

export function getCollectionStats(): { bookCount: number; storyCount: number } {
  const all = books();
  return { bookCount: all.length, storyCount: all.reduce((sum, b) => sum + b.story_count, 0) };
}

export function searchChapters(query: string): SearchHit[] {
  const q = query.toLowerCase();
  if (q.length < 2) return [];
  const results: SearchHit[] = [];
  for (const book of books()) {
    for (const chapter of book.chapters) {
      const text = chapter.text.toLowerCase();
      const idx = text.indexOf(q);
      const titleMatch = chapter.title.toLowerCase().includes(q);
      if (idx < 0 && !titleMatch) continue;
      const start = Math.max(0, idx - 95);
      const end = Math.min(chapter.text.length, idx >= 0 ? idx + 220 : 260);
      let excerpt = chapter.text.slice(start, end).replace(/\n/g, " ");
      if (start > 0) excerpt = "…" + excerpt;
      if (end < chapter.text.length) excerpt += "…";
      results.push({
        book_id: book.id,
        book_title: book.title,
        chapter_index: chapter.index,
        chapter_title: chapter.title,
        excerpt,
      });
      if (results.length >= 40) return results;
    }
  }
  return results;
}

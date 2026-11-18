import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import alexandriaLogo from "@/assets/library-of-alexandria-logo.png.asset.json";

function Brand({ small }: { small?: boolean }) {
  return (
    <Link
      to="/"
      className={"brand" + (small ? " brand-small" : "")}
      aria-label="Library of Alexandria — home"
    >
      <img
        className="brand-logo"
        src={alexandriaLogo.url}
        alt="Library of Alexandria — Where stories come alive"
      />
    </Link>
  );
}

export function SiteHeader({
  active,
  right,
}: {
  active: "library" | "cards" | "read" | "admin";
  right?: ReactNode;
}) {
  return (
    <header className="site-header">
      <Brand />
      {active === "read" ? (
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/#collection">The collection</a>
          <Link to="/cards">Share the books</Link>
        </nav>
      ) : active === "admin" ? (
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/">Public library</a>
          <Link to="/cards">Share the books</Link>
        </nav>
      ) : (
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/#collection" className={active === "library" ? "active" : undefined}>
            The collection
          </a>
          <Link to="/cards" className={active === "cards" ? "active" : undefined}>
            Share the books
          </Link>
          <Link to="/read">Reader access</Link>
        </nav>
      )}
      {right ?? (
        <Link to="/read" className="nav-pill">
          {active === "cards" ? (
            <>
              Back to the library <span aria-hidden="true">↗</span>
            </>
          ) : (
            <>
              Enter the room <span aria-hidden="true">↗</span>
            </>
          )}
        </Link>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Brand small />
      <p>A quieter place for stories that stay.</p>
      <div className="footer-links">
        <Link to="/cards">Share the books</Link>
        <Link to="/read">Reader access</Link>
      </div>
      <span className="footer-year">
        © <span data-year>{new Date().getFullYear()}</span> THE LIBRARY OF ALEXANDRIA
      </span>
    </footer>
  );
}

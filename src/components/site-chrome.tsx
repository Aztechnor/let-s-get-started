import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import alexandriaLogo from "@/assets/library-of-alexandria-logo.png.asset.json";

function Brand({ small }: { small?: boolean }) {
  return (
    <Link to="/" className={"brand" + (small ? " brand-small" : "")} aria-label="Library of Alexandria — Storyhouse home">
      <img className="brand-logo" src={alexandriaLogo.url} alt="Library of Alexandria — Where stories come alive" />
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
          <a href="/#library">The library</a>
          <Link to="/cards">Quote studio</Link>
        </nav>
      ) : active === "admin" ? (
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/">Public site</a>
          <Link to="/cards">Quote studio</Link>
        </nav>
      ) : (
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/#library" className={active === "library" ? "active" : undefined}>
            The library
          </a>
          <Link to="/cards" className={active === "cards" ? "active" : undefined}>
            Quote studio
          </Link>
          <Link to="/read">
            Reader access
          </Link>
        </nav>
      )}
      {right ?? (
        <Link to="/read" className="nav-pill">
          {active === "cards" ? (
            <>
              Back to reading <span aria-hidden="true">↗</span>
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
      <p>Built for stories that linger.</p>
      <div className="footer-links">
        <Link to="/cards">Quote studio</Link>
        <Link to="/admin">Admin</Link>
      </div>
      <span className="footer-year">
        © <span data-year>{new Date().getFullYear()}</span> STORYHOUSE
      </span>
    </footer>
  );
}


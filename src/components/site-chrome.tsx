import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/loading";
import alexandriaLogo from "@/assets/library-of-alexandria-logo.png.asset.json";

function Brand({ small }: { small?: boolean }) {
  return (
    <Link to="/" className={"brand" + (small ? " brand-small" : "")} aria-label="Library of Alexandria - Storyhouse home">
      <img className="brand-logo" src={alexandriaLogo.url} alt="Library of Alexandria - Where stories come alive" />
    </Link>
  );
}

// Mobile navigation menu
function MobileNav({
  active,
  onClose,
}: {
  active: "library" | "cards" | "read" | "admin";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex flex-col p-6">
        <button
          onClick={onClose}
          className="self-end rounded-lg p-2 hover:bg-muted"
          aria-label="Close menu"
        >
          ✕
        </button>
        <nav className="flex flex-col gap-4 pt-8">
          <Link
            to="/"
            className="text-xl font-medium"
            onClick={onClose}
          >
            Home
          </Link>
          <Link
            to="/#library"
            className={cn("text-xl font-medium", active === "library" && "text-primary")}
            onClick={onClose}
          >
            The Library
          </Link>
          <Link
            to="/cards"
            className={cn("text-xl font-medium", active === "cards" && "text-primary")}
            onClick={onClose}
          >
            Quote Studio
          </Link>
          <Link
            to="/read"
            className={cn("text-xl font-medium", active === "read" && "text-primary")}
            onClick={onClose}
          >
            Enter the Room
          </Link>
          <Link
            to="/admin"
            className={cn("text-xl font-medium", active === "admin" && "text-primary")}
            onClick={onClose}
          >
            Admin
          </Link>
        </nav>
      </div>
    </div>
  );
}

export function SiteHeader({
  active,
  right,
}: {
  active: "library" | "cards" | "read" | "admin";
  right?: ReactNode;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [navigate.location.pathname]);

  return (
    <>
      <header className="site-header sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <Brand />
        
        {/* Desktop Navigation */}
        <nav className="main-nav hidden md:flex">
          {active === "read" ? (
            <>
              <a href="/#library" className="nav-link">
                The library
              </a>
              <Link to="/cards" className="nav-link">
                Quote studio
              </Link>
            </>
          ) : active === "admin" ? (
            <>
              <a href="/" className="nav-link">
                Public site
              </a>
              <Link to="/cards" className="nav-link">
                Quote studio
              </Link>
            </>
          ) : (
            <>
              <a href="/#library" className={cn("nav-link", active === "library" && "active")}>
                The library
              </a>
              <Link to="/cards" className={cn("nav-link", active === "cards" && "active")}>
                Quote studio
              </Link>
              <Link to="/read" className="nav-link">
                Reader access
              </Link>
            </>
          )}
        </nav>
        
        {/* Right side content */}
        <div className="hidden md:block">
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
        </div>
        
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="md:hidden rounded-lg p-2 hover:bg-muted"
          aria-label="Open menu"
        >
          ☰
        </button>
      </header>
      
      {/* Mobile Navigation */}
      {isMobileNavOpen && <MobileNav active={active} onClose={() => setIsMobileNavOpen(false)} />}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Brand small />
      <p>Built for stories that linger.</p>
      <div className="footer-links">
        <Link to="/cards">Quote studio</Link>
        <Link to="/admin">
          <Badge variant="secondary">Admin</Badge>
        </Link>
      </div>
      <span className="footer-year">
        © <span data-year>{new Date().getFullYear()}</span> STORYHOUSE
      </span>
    </footer>
  );
}

// Enhanced nav link with hover effects
export function NavLink({
  to,
  children,
  active = false,
  className,
}: {
  to: string;
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "nav-link transition-colors",
        active && "active",
        className
      )}
    >
      {children}
    </Link>
  );
}

// User avatar/indicator for signed-in state
export function UserIndicator({
  email,
  className,
}: {
  email: string;
  className?: string;
}) {
  const initial = email.charAt(0).toUpperCase();
  
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground",
        className
      )}
      aria-label={`Signed in as ${email}`}
    >
      {initial}
    </div>
  );
}

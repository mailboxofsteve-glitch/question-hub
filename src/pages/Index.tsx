import { Search, X, Stethoscope, ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef, useCallback, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useNodeSearch } from "@/hooks/use-node-search";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { Skeleton } from "@/components/ui/skeleton";

const SearchSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="rounded-lg p-5 border border-border surface-elevated">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-20 mt-2" />
      </div>
    ))}
  </div>
);

const Index = () => {
  const {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    results,
    isSearching,
    categories,
    clearSearch,
    hasActiveSearch,
  } = useNodeSearch();

  const { items: recentlyViewed } = useRecentlyViewed();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchFocus = useCallback(() => {
    setTimeout(() => {
      searchContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }, []);

  // Keyboard shortcuts: "/" to focus search, Escape to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        clearSearch();
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [clearSearch]);

  return (
    <AppLayout>
      {/* Hero + Search */}
      <section className={`container pb-16 md:pb-20 transition-all duration-300 ${hasActiveSearch ? 'pt-6 md:pt-10' : 'pt-24 md:pt-32'}`}>
        <div className="max-w-2xl mx-auto text-center">
          {!hasActiveSearch && (
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-[1.1] animate-fade-up">
              Faith<span className="text-gradient-amber">Examined</span>
            </h1>
          )}
          {!hasActiveSearch && (
            <p
              className="mt-4 text-muted-foreground font-body text-lg opacity-0 animate-fade-up"
              style={{ animationDelay: "0.1s" }}
            >
              "Examine yourselves as to whether you are in the faith. Test Yourselves."
              <br /> (2 Corinthians 13:5)
            </p>
          )}

          {/* Search bar */}
          <div ref={searchContainerRef} className="mt-8 relative opacity-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative" role="search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={handleSearchFocus}
                placeholder="Search questions, keywords, topics… (press / to focus)"
                aria-label="Search questions, keywords, and topics"
                className="w-full h-14 pl-12 pr-12 rounded-xl border border-border bg-background text-foreground font-body text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {hasActiveSearch && (
        <section className="container pb-12" aria-label="Search results">
          <div className="max-w-2xl mx-auto">
            <h2 className="sr-only">Search Results</h2>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-body" aria-live="polite" aria-atomic="true">
                {isSearching ? "Searching…" : `${results.length} result${results.length !== 1 ? "s" : ""}`}
              </p>
              <button onClick={clearSearch} className="text-sm text-accent hover:underline font-medium" aria-label="Clear search results">
                Clear
              </button>
            </div>
            {isSearching ? (
              <SearchSkeleton />
            ) : (
              <div className="space-y-2" aria-busy={isSearching}>
                {results.map((node) => (
                  <Link
                    key={node.id}
                    to={`/node/${node.id}`}
                    className="block surface-elevated rounded-lg p-5 border border-border hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base font-semibold text-foreground group-hover:text-accent transition-colors leading-snug">
                          {node.title}
                        </h3>
                        {node.layer1 && (
                          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 font-body">{node.layer1}</p>
                        )}
                        {node.category && (
                   <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-subtle text-accent-foreground" aria-label={`Category: ${node.category}`}>
                            {node.category}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0 group-hover:text-accent transition-colors" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
                {results.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground font-body">No results found. Try a different search term.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recently Viewed + Category Tiles + Diagnostic */}
      {!hasActiveSearch && (
        <section className="container pb-20">
          <div className="max-w-2xl mx-auto space-y-10">
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.25s" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold text-foreground">Recently Viewed</h2>
                </div>
                <div className="space-y-2">
                  {recentlyViewed.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      to={`/node/${item.id}`}
                      className="flex items-center justify-between gap-3 surface-elevated rounded-lg p-4 border border-border hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm font-semibold text-foreground group-hover:text-accent transition-colors leading-snug truncate">
                          {item.title}
                        </p>
                        {item.category && (
                          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-subtle text-accent-foreground">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-accent transition-colors" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Start Diagnostic */}
            <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <Link
                to="/diagnostic"
                className="flex items-center gap-4 p-5 rounded-xl border border-border surface-elevated hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
              >
                <div className="w-11 h-11 rounded-lg bg-amber-subtle flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                    Start Diagnostic
                  </h3>
                  <p className="text-sm text-muted-foreground font-body mt-0.5">
                    Answer guided questions to find the right information.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" aria-hidden="true" />
              </Link>
            </div>

            {/* Category Tiles */}
            {categories.length > 0 && (
              <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">Browse by Category</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      aria-label={`Browse category: ${cat}`}
                      className="p-4 rounded-lg border border-border surface-elevated text-left hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
                    >
                      <span className="font-display text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        {cat}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            <div className="h-px bg-border" aria-hidden="true" />
            <div className="grid md:grid-cols-3 gap-8" role="region" aria-label="Features">
              {[
                {
                  title: "Connected Nodes",
                  desc: "Questions link to related questions, forming a navigable knowledge graph.",
                },
                {
                  title: "Layered Depth",
                  desc: "Each node reveals progressively deeper detail — from summary to expert analysis.",
                },
                {
                  title: "Smart Search",
                  desc: "Find answers by title, keywords, alternative phrasings, or content.",
                },
              ].map((feature) => (
              <div key={feature.title} className="space-y-3">
                  <div className="w-10 h-10 rounded-md bg-amber-subtle flex items-center justify-center" aria-hidden="true">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-body">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border" role="contentinfo">
        <div className="container py-8 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-display">Question Node</span>
          <span>Built for clarity.</span>
        </div>
      </footer>
    </AppLayout>
  );
};

export default Index;

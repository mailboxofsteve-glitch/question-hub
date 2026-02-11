import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, ChevronRight, ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useNodeSearch } from '@/hooks/use-node-search';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const urlCategory = searchParams.get('category') ?? '';

  const {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    results,
    isSearching,
    clearSearch,
    hasActiveSearch,
  } = useNodeSearch();

  // Sync URL params into hook state on mount / URL change
  useEffect(() => {
    if (urlQuery && urlQuery !== query) setQuery(urlQuery);
    if (urlCategory && urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery, urlCategory]);

  // Sync hook state back to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (query.trim()) params.q = query.trim();
    if (selectedCategory) params.category = selectedCategory;
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedCategory]);

  return (
    <AppLayout>
      <section className="container pt-10 pb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="font-display text-3xl font-bold text-foreground mb-6">
          Search Results
        </h1>

        {/* Search bar */}
        <div className="relative max-w-2xl mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search questions, keywords, topics…"
            className="w-full h-12 pl-12 pr-12 rounded-xl border border-border bg-background text-foreground font-body text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category filter pill */}
        {selectedCategory && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtering:</span>
            <button
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-amber-subtle text-accent-foreground hover:opacity-80 transition-opacity"
            >
              {selectedCategory}
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="container pb-20">
        <div className="max-w-2xl">
          {hasActiveSearch && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-body">
                {isSearching
                  ? 'Searching…'
                  : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
              </p>
              <button
                onClick={clearSearch}
                className="text-sm text-accent hover:underline font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="space-y-2">
            {results.map((node, index) => (
              <Link
                key={node.id}
                to={`/node/${node.id}`}
                className="block surface-elevated rounded-lg p-5 border border-border hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        #{index + 1}
                      </span>
                      <h3 className="font-display text-base font-semibold text-foreground group-hover:text-accent transition-colors leading-snug">
                        {node.title}
                      </h3>
                    </div>
                    {node.layer1 && (
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 font-body">
                        {node.layer1}
                      </p>
                    )}
                    {node.category && (
                      <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-subtle text-accent-foreground">
                        {node.category}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0 group-hover:text-accent transition-colors" />
                </div>
              </Link>
            ))}

            {!isSearching && hasActiveSearch && results.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground font-body text-lg">
                  No results found.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search term or remove the category filter.
                </p>
              </div>
            )}

            {!hasActiveSearch && (
              <div className="text-center py-16">
                <p className="text-muted-foreground font-body">
                  Start typing to search across all published nodes.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default SearchResults;

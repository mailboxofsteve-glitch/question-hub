import AppLayout from '@/components/layout/AppLayout';
import QuestionCard from '@/features/questions/QuestionCard';
import { useQuestions } from '@/hooks/use-questions';

const Index = () => {
  const { data, isLoading } = useQuestions();

  return (
    <AppLayout>
      {/* Hero */}
      <section className="container py-20 md:py-28">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] animate-fade-up">
            Think in{' '}
            <span className="text-gradient-amber">connected questions</span>
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground font-body leading-relaxed opacity-0 animate-fade-up"
            style={{ animationDelay: '0.15s' }}
          >
            Question Node is a structured knowledge platform where every question
            links to its context. Explore ideas as a graph, not a list.
          </p>
          <div
            className="mt-8 flex gap-3 opacity-0 animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            <button className="px-6 py-3 rounded-md bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity">
              Start Exploring
            </button>
            <button className="px-6 py-3 rounded-md border border-border text-foreground font-medium text-sm hover:bg-secondary transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container">
        <div className="h-px bg-border" />
      </div>

      {/* Recent Questions */}
      <section className="container py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground mb-8">
          Recent Questions
        </h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-44 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.data.map(q => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        )}
      </section>

      {/* Architecture Info */}
      <section className="container py-16">
        <div className="h-px bg-border mb-16" />
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Connected Nodes',
              desc: 'Questions link to related questions, forming a navigable knowledge graph.',
            },
            {
              title: 'Migration-Safe',
              desc: 'Decoupled data models and API abstraction — swap backends without rewriting UI.',
            },
            {
              title: 'Content-First',
              desc: 'Clean typography, structured tags, and distraction-free reading experience.',
            },
          ].map(feature => (
            <div key={feature.title} className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-amber-subtle flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-body">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container py-8 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-display">Question Node</span>
          <span>Built for clarity.</span>
        </div>
      </footer>
    </AppLayout>
  );
};

export default Index;

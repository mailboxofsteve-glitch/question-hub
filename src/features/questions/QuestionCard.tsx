import type { QuestionNode } from '@/types';
import { Link } from 'react-router-dom';

interface QuestionCardProps {
  question: QuestionNode;
}

const QuestionCard = ({ question }: QuestionCardProps) => {
  return (
    <Link
      to={`/question/${question.id}`}
      className="block surface-elevated rounded-lg p-6 border border-border hover:border-accent/40 hover:glow-amber transition-all duration-300 group"
    >
      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors leading-snug">
        {question.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 font-body">
        {question.body}
      </p>
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {question.tags.map(tag => (
          <span
            key={tag}
            className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-subtle text-accent-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{new Date(question.createdAt).toLocaleDateString()}</span>
        {question.childIds.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-accent" />
            {question.childIds.length} linked
          </span>
        )}
      </div>
    </Link>
  );
};

export default QuestionCard;

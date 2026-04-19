import ReactMarkdown from 'react-markdown';
import { highlightTriggerWord } from '@/lib/highlight-trigger';

interface MarkdownTextProps {
  content: string;
  className?: string;
  triggerWord?: string | null;
}

const MarkdownText = ({ content, className, triggerWord }: MarkdownTextProps) => {
  if (!content) return null;

  return (
    <span className={className}>
      <ReactMarkdown
        allowedElements={['p', 'em', 'strong', 'a', 'br', 'ul', 'ol', 'li']}
        unwrapDisallowed
        components={{
          p: ({ children }) => <>{children}</>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-accent hover:text-accent/80 transition-colors">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          // Override default text node renderer so trigger-word highlighting
          // applies inside markdown text runs while preserving bold/links/lists.
          text: ({ children }) => {
            const value = typeof children === 'string' ? children : String(children ?? '');
            if (!triggerWord) return <>{value}</>;
            return <>{highlightTriggerWord(value, triggerWord)}</>;
          },
        } as any}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
};

export default MarkdownText;

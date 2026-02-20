import ReactMarkdown from 'react-markdown';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

const MarkdownText = ({ content, className }: MarkdownTextProps) => {
  if (!content) return null;

  return (
    <span className={className}>
      <ReactMarkdown
        allowedElements={['p', 'em', 'strong', 'a', 'br']}
        unwrapDisallowed
        components={{
          p: ({ children }) => <>{children}</>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-accent hover:text-accent/80 transition-colors">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
};

export default MarkdownText;

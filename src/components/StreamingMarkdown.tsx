import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function StreamingMarkdown({ content, isStreaming }: StreamingMarkdownProps) {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="leading-relaxed">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        code: ({ children, className }) => (
          <code className={className ? `bg-muted px-1.5 py-0.5 rounded text-xs font-mono ${className}` : "bg-muted px-1.5 py-0.5 rounded text-xs font-mono"}>
            {children}
          </code>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-4 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-4 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm">{children}</li>
        ),
      }}
    >
      {content}
      {isStreaming && ' ▊'}
    </ReactMarkdown>
  );
}

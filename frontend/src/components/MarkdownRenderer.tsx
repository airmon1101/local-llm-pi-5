import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-emerald max-w-none text-slate-100 leading-relaxed break-words text-sm md:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlock
                  language={match ? match[1] : 'text'}
                  value={codeString}
                />
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-xs md:text-sm border border-slate-700/50"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700 text-left text-xs md:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="bg-slate-800/90 px-4 py-2 font-semibold text-slate-200">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 border-t border-slate-700/60 text-slate-300">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline font-medium transition"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1 my-2 text-slate-200">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1 my-2 text-slate-200">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-emerald-500 pl-4 py-1 my-3 bg-slate-800/40 italic text-slate-300 rounded-r">
                {children}
              </blockquote>
            );
          },
          h1({ children }) {
            return <h1 className="text-xl md:text-2xl font-bold text-white mt-4 mb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg md:text-xl font-bold text-white mt-3 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base md:text-lg font-semibold text-white mt-2 mb-1">{children}</h3>;
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 text-slate-200">{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

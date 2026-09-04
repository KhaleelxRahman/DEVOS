import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

const inline = (value: string) => value.split(/(`[^`]+`)/g).map((part, index) =>
  part.startsWith('`') && part.endsWith('`')
    ? <code key={index} className="markdown-inline-code">{part.slice(1, -1)}</code>
    : <React.Fragment key={index}>{part}</React.Fragment>,
);

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const [copied, setCopied] = useState<number | null>(null);
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const fence = line.match(/^```([\w-]*)$/);
    if (fence) {
      const start = index;
      const code: string[] = [];
      index += 1;
      while (index < lines.length && lines[index] !== '```') code.push(lines[index++]);
      index += 1;
      blocks.push(
        <div className="markdown-code-block" key={start}>
          <div className="markdown-code-toolbar">
            <span>{fence[1] || 'code'}</span>
            <button type="button" onClick={() => {
              void navigator.clipboard.writeText(code.join('\n')).then(() => {
                setCopied(start);
                window.setTimeout(() => setCopied(null), 1200);
              });
            }} aria-label="Copy code">
              {copied === start ? <Check size={12} /> : <Copy size={12} />} {copied === start ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre><code>{code.join('\n')}</code></pre>
        </div>,
      );
      continue;
    }
    if (!line.trim()) { index += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const headingContent = inline(heading[2]);
      const headingProps = { key: index };
      if (heading[1].length === 1) blocks.push(<h1 {...headingProps}>{headingContent}</h1>);
      else if (heading[1].length === 2) blocks.push(<h2 {...headingProps}>{headingContent}</h2>);
      else if (heading[1].length === 3) blocks.push(<h3 {...headingProps}>{headingContent}</h3>);
      else if (heading[1].length === 4) blocks.push(<h4 {...headingProps}>{headingContent}</h4>);
      else if (heading[1].length === 5) blocks.push(<h5 {...headingProps}>{headingContent}</h5>);
      else blocks.push(<h6 {...headingProps}>{headingContent}</h6>);
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      blocks.push(<blockquote key={index}>{inline(line.replace(/^>\s?/, ''))}</blockquote>);
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        const task = lines[index].match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
        items.push(<li key={index}>{task ? <><input type="checkbox" checked={task[1].toLowerCase() === 'x'} readOnly /> {inline(task[2])}</> : inline(lines[index].replace(/^[-*]\s+/, ''))}</li>);
        index += 1;
      }
      blocks.push(<ul key={`ul-${index}`}>{items}</ul>);
      continue;
    }
    blocks.push(<p key={index}>{inline(line)}</p>);
    index += 1;
  }
  return <div className="markdown-content">{blocks}</div>;
};

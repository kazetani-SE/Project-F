import React from 'react';

interface ChatMarkdownProps {
    content: string;
}

const INLINE_TOKEN_REGEX = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;

function renderInline(text: string): React.ReactNode[] {
    const parts = text.split(INLINE_TOKEN_REGEX);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
                <strong key={idx} className="font-semibold text-slate-900">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            return (
                <code
                    key={idx}
                    className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[11px] text-slate-800"
                >
                    {part.slice(1, -1)}
                </code>
            );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return (
                <em key={idx} className="italic text-slate-700">
                    {part.slice(1, -1)}
                </em>
            );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content }) => {
    const lines = content.split(/\r?\n/);
    const blocks: React.ReactNode[] = [];
    let listItems: string[] = [];
    let isOrderedList = false;

    const flushList = (keyPrefix: number) => {
        if (listItems.length === 0) return;
        const items = [...listItems];
        const ordered = isOrderedList;
        listItems = [];
        isOrderedList = false;

        if (ordered) {
            blocks.push(
                <ol
                    key={`ol-${keyPrefix}`}
                    className="list-decimal pl-4 space-y-1 text-slate-700"
                >
                    {items.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                            {renderInline(item)}
                        </li>
                    ))}
                </ol>,
            );
        } else {
            blocks.push(
                <ul
                    key={`ul-${keyPrefix}`}
                    className="list-disc pl-4 space-y-1 text-slate-700"
                >
                    {items.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                            {renderInline(item)}
                        </li>
                    ))}
                </ul>,
            );
        }
    };

    lines.forEach((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
            flushList(idx);
            return;
        }

        const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
            flushList(idx);
            blocks.push(
                <h4
                    key={`h-${idx}`}
                    className="pt-1 text-xs font-bold text-slate-900"
                >
                    {renderInline(headingMatch[1])}
                </h4>,
            );
            return;
        }

        const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
            if (listItems.length > 0 && isOrderedList) {
                flushList(idx);
            }
            isOrderedList = false;
            listItems.push(bulletMatch[1]);
            return;
        }

        const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
        if (orderedMatch) {
            if (listItems.length > 0 && !isOrderedList) {
                flushList(idx);
            }
            isOrderedList = true;
            listItems.push(orderedMatch[1]);
            return;
        }

        flushList(idx);
        blocks.push(
            <p key={`p-${idx}`} className="leading-relaxed text-slate-800">
                {renderInline(line)}
            </p>,
        );
    });

    flushList(lines.length);

    return <div className="space-y-1.5">{blocks}</div>;
};

import React, { useMemo } from 'react';

export interface TextSegment {
  kind: 'plain' | 'ruby' | 'codex';
  text: string;
  ruby?: string;
  codexId?: string;
}

export function parseScriptText(raw: string): { segments: TextSegment[]; totalLength: number } {
  const segments: TextSegment[] = [];
  // Matches {ruby:base|rt} or [[codexId|label]] or [[codexId]]
  const regex = /\{ruby:([^|}]+)\|([^}]+)\}|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let totalLength = 0;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const plain = raw.slice(lastIndex, match.index);
      segments.push({ kind: 'plain', text: plain });
      totalLength += plain.length;
    }
    if (match[1] !== undefined) {
      const base = match[1];
      segments.push({ kind: 'ruby', text: base, ruby: match[2] });
      totalLength += base.length;
    } else if (match[3] !== undefined) {
      const id = match[3].trim();
      const label = (match[4] || match[3]).trim();
      segments.push({ kind: 'codex', text: label, codexId: id });
      totalLength += label.length;
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    const tail = raw.slice(lastIndex);
    segments.push({ kind: 'plain', text: tail });
    totalLength += tail.length;
  }

  return { segments, totalLength };
}

export function stripScriptMarkup(raw: string): string {
  return parseScriptText(raw)
    .segments.map((s) => s.text)
    .join('');
}

export function extractCodexIds(raw: string): string[] {
  const { segments } = parseScriptText(raw);
  return segments
    .filter((s) => s.kind === 'codex' && s.codexId)
    .map((s) => s.codexId as string);
}

interface RichTextProps {
  text: string;
  visibleChars?: number;
  onInspectCodex?: (codexId: string, e: React.MouseEvent) => void;
}

export const RichText: React.FC<RichTextProps> = ({
  text,
  visibleChars,
  onInspectCodex,
}) => {
  const { segments, totalLength } = useMemo(() => parseScriptText(text), [text]);
  const limit = visibleChars === undefined ? totalLength : visibleChars;

  let remaining = limit;
  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < segments.length; i++) {
    if (remaining <= 0) break;
    const seg = segments[i];
    const sliceText = seg.text.slice(0, remaining);
    remaining -= sliceText.length;

    if (seg.kind === 'plain') {
      rendered.push(<React.Fragment key={i}>{sliceText}</React.Fragment>);
    } else if (seg.kind === 'ruby') {
      const isComplete = sliceText.length === seg.text.length;
      rendered.push(
        <ruby key={i} className="vn-ruby">
          {sliceText}
          <rt>{isComplete ? seg.ruby : ''}</rt>
        </ruby>
      );
    } else if (seg.kind === 'codex' && seg.codexId) {
      const codexId = seg.codexId;
      rendered.push(
        <button
          key={i}
          type="button"
          className="vn-codex-inline"
          onClick={(e) => {
            e.stopPropagation();
            onInspectCodex?.(codexId, e);
          }}
          title="클릭하여 천문 기록원 용어 해설 열람"
        >
          {sliceText}
        </button>
      );
    }
  }

  return <>{rendered}</>;
};

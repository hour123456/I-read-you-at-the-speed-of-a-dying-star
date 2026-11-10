import React, { useEffect, useRef } from 'react';
import { ScrollText, X } from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';
import { stripScriptMarkup } from './RichText';

export interface BacklogItem {
  chapter: string;
  speaker?: string;
  speakerTitle?: string;
  text: string;
}

interface BacklogModalProps {
  items: BacklogItem[];
  onClose: () => void;
}

export const BacklogModal: React.FC<BacklogModalProps> = ({ items, onClose }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="vn-modal-backdrop" onClick={onClose}>
      <div className="vn-modal-panel vn-backlog-panel" onClick={(e) => e.stopPropagation()}>
        <div className="vn-modal-header">
          <div>
            <span className="vn-modal-eyebrow">MANUSCRIPT LOG · 지나간 문장의 잔향</span>
            <h2 className="vn-modal-title">
              <ScrollText size={20} style={{ display: 'inline', marginRight: 8 }} />
              지문 회상록 (BACKLOG)
            </h2>
          </div>
          <button
            type="button"
            className="vn-icon-btn"
            onClick={() => {
              audioEngine.playUiTick('click');
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="vn-backlog-scroll">
          {items.length === 0 ? (
            <p className="vn-backlog-empty">아직 기록된 문장이 없습니다.</p>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="vn-backlog-entry">
                {item.speaker ? (
                  <div className="vn-backlog-speaker">
                    <strong>{item.speaker}</strong>
                    {item.speakerTitle && <span>{item.speakerTitle}</span>}
                  </div>
                ) : (
                  <div className="vn-backlog-narration-mark">― 서술</div>
                )}
                <p className="vn-backlog-text">{stripScriptMarkup(item.text)}</p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

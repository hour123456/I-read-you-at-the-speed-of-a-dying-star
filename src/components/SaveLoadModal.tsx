import React from 'react';
import { Bookmark, Trash2, Upload, X } from 'lucide-react';
import { BACKGROUND_FILES, CG_MAP } from '../data/media';
import { audioEngine } from '../engine/audioEngine';
import { SaveSlotData } from '../types/vn';

interface SaveLoadModalProps {
  mode: 'save' | 'load';
  saves: Record<number, SaveSlotData>;
  onSaveSlot?: (slotId: number) => void;
  onLoadSlot: (slot: SaveSlotData) => void;
  onDeleteSlot: (slotId: number) => void;
  onClose: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  mode,
  saves,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onClose,
}) => {
  const specialSlots = [
    { id: 0, badge: 'AUTO SAVE · 자동 보존 기록' },
    { id: 99, badge: 'QUICK SAVE · 긴급 책갈피 (F5)' },
  ];
  const manualSlotIds = Array.from({ length: 12 }, (_, i) => i + 1);

  const getThumb = (slot?: SaveSlotData) => {
    if (!slot) return '';
    if (slot.cg && CG_MAP[slot.cg]) return CG_MAP[slot.cg].file;
    return BACKGROUND_FILES[slot.bg] || './assets/images/cg/cg_title_keyvisual.jpg';
  };

  return (
    <div className="vn-modal-backdrop" onClick={onClose}>
      <div className="vn-modal-panel vn-saveload-panel" onClick={(e) => e.stopPropagation()}>
        <div className="vn-modal-header">
          <div>
            <span className="vn-modal-eyebrow">
              {mode === 'save'
                ? 'CHRONICLE INSCRIPTION · 현재 인과율 기록 보존'
                : 'CHRONICLE RESTORATION · 보존된 기억 불러오기'}
            </span>
            <h2 className="vn-modal-title">
              {mode === 'save' ? (
                <>
                  <Bookmark size={20} style={{ display: 'inline', marginRight: 8 }} />
                  기억 서고 — 기록하기
                </>
              ) : (
                <>
                  <Upload size={20} style={{ display: 'inline', marginRight: 8 }} />
                  기억 서고 — 불러오기
                </>
              )}
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

        <div className="vn-saveload-body">
          {mode === 'load' && (
            <div className="vn-special-slots">
              {specialSlots.map(({ id, badge }) => {
                const slot = saves[id];
                return (
                  <div
                    key={id}
                    className={`vn-save-card special ${slot ? 'filled' : 'empty'}`}
                    onClick={() => {
                      if (slot) {
                        audioEngine.playUiTick('confirm');
                        onLoadSlot(slot);
                      }
                    }}
                  >
                    <div className="vn-save-thumb">
                      {slot ? (
                        <img src={getThumb(slot)} alt={slot.sceneTitle} />
                      ) : (
                        <span>NO RECORD</span>
                      )}
                    </div>
                    <div className="vn-save-info">
                      <span className="vn-save-badge">{badge}</span>
                      {slot ? (
                        <>
                          <h4>
                            {slot.chapterTitle} — {slot.sceneTitle}
                          </h4>
                          <p>{slot.previewText}</p>
                          <small>{slot.savedAt}</small>
                        </>
                      ) : (
                        <p className="empty-text">아직 자동·긴급 보존된 기록이 없습니다.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="vn-save-grid">
            {manualSlotIds.map((slotId) => {
              const slot = saves[slotId];
              return (
                <div
                  key={slotId}
                  className={`vn-save-card ${slot ? 'filled' : 'empty'}`}
                  onClick={() => {
                    if (mode === 'save') {
                      audioEngine.playUiTick('confirm');
                      onSaveSlot?.(slotId);
                    } else if (slot) {
                      audioEngine.playUiTick('confirm');
                      onLoadSlot(slot);
                    }
                  }}
                >
                  <div className="vn-save-thumb">
                    {slot ? (
                      <img src={getThumb(slot)} alt={slot.sceneTitle} />
                    ) : (
                      <span>SLOT {String(slotId).padStart(2, '0')}</span>
                    )}
                  </div>
                  <div className="vn-save-info">
                    <div className="vn-save-top-row">
                      <span className="vn-save-badge">
                        ARCHIVE #{String(slotId).padStart(2, '0')}
                      </span>
                      {slot && (
                        <button
                          type="button"
                          className="vn-delete-slot-btn"
                          title="기록 삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            audioEngine.playUiTick('click');
                            onDeleteSlot(slotId);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {slot ? (
                      <>
                        <h4>
                          {slot.chapterTitle} · {slot.sceneTitle}
                        </h4>
                        <p>{slot.previewText}</p>
                        <div className="vn-save-footer">
                          <small>{slot.savedAt}</small>
                          <small className="stats-tag">
                            공명 {slot.stats.resonance} · 기억 {slot.stats.memory}
                          </small>
                        </div>
                      </>
                    ) : (
                      <p className="empty-text">
                        {mode === 'save'
                          ? '클릭하여 현재 페이지를 이 서고에 기록합니다.'
                          : '비어 있는 기록 서고'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

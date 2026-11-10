import React, { useState } from 'react';
import { BookOpen, Disc3, Image as ImageIcon, Play, Sparkles, Trophy, X } from 'lucide-react';
import { CODEX_ENTRIES } from '../data/codex';
import { BGM_LIST, CG_LIST } from '../data/media';
import { audioEngine } from '../engine/audioEngine';
import { BGMId, CGMeta, PersistentMeta } from '../types/vn';

interface ArchiveModalProps {
  meta: PersistentMeta;
  initialTab?: 'codex' | 'cg' | 'music' | 'endings';
  initialCodexId?: string | null;
  onClose: () => void;
}

const ALL_ENDINGS_INFO = [
  {
    id: 'end_true_speed_star_dies',
    code: 'ENDING 01 · TRUE END',
    title: '별이 죽는 속도로 너를 읽는다',
    hint: '세라와의 공명률을 35 이상 축적한 뒤, 제4장 최후의 선택에서 유리 천구를 파쇄하십시오.',
  },
  {
    id: 'end_another_watchmen',
    code: 'ENDING 02 · ANOTHER END',
    title: '백야에 남는 파수꾼들',
    hint: '제4장 최후의 선택에서 100년간의 완만한 무소각 해동 프로토콜을 가동하십시오.',
  },
  {
    id: 'end_paradox_glass_garden',
    code: 'ENDING 03 · PARADOX END',
    title: '여덟 번째 유리 정원',
    hint: '제4장 최후의 선택에서 이별을 거부하고 자정 직전의 성당을 영원히 동결하십시오.',
  },
  {
    id: 'end_bad_01_erased',
    code: 'ENDING 04 · BAD END',
    title: '기록 말소된 페이지',
    hint: '제2장 자기부상열차 결전에서 무장을 포기하고 홀로 투항을 택할 경우 도달합니다.',
  },
] as const;

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  meta,
  initialTab = 'codex',
  initialCodexId = null,
  onClose,
}) => {
  const [tab, setTab] = useState<'codex' | 'cg' | 'music' | 'endings'>(initialTab);
  const [category, setCategory] = useState<string>('전체');
  const [selectedCodexId, setSelectedCodexId] = useState<string>(
    initialCodexId || CODEX_ENTRIES[0].id
  );
  const [zoomCg, setZoomCg] = useState<CGMeta | null>(null);
  const [playingBgm, setPlayingBgm] = useState<BGMId | 'stop'>(audioEngine.getCurrentBgm());

  const categories = ['전체', '세계관·천문', '기관·법률', '인물록', '현상·유물'];
  const filteredCodex = CODEX_ENTRIES.filter(
    (e) => category === '전체' || e.category === category
  );
  const activeCodex =
    CODEX_ENTRIES.find((e) => e.id === selectedCodexId) || CODEX_ENTRIES[0];
  const isActiveUnlocked = meta.unlockedCodex.includes(activeCodex.id);

  const handlePlayTrack = (id: BGMId) => {
    audioEngine.playUiTick('click');
    audioEngine.playBgm(id, true);
    setPlayingBgm(id);
  };

  return (
    <div className="vn-modal-backdrop" onClick={onClose}>
      <div className="vn-modal-panel vn-archive-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vn-modal-header">
          <div>
            <span className="vn-modal-eyebrow">ASTRAL ARCHIVE · 제0기록보존실 특별 서고</span>
            <h2 className="vn-modal-title">천문 기록원 아카이브</h2>
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

        {/* Navigation Tabs */}
        <div className="vn-archive-tabs">
          <button
            type="button"
            className={`vn-tab-btn ${tab === 'codex' ? 'active' : ''}`}
            onClick={() => {
              audioEngine.playUiTick('click');
              setTab('codex');
            }}
          >
            <BookOpen size={16} />
            <span>세계관 백과사전 ({meta.unlockedCodex.length}/{CODEX_ENTRIES.length})</span>
          </button>
          <button
            type="button"
            className={`vn-tab-btn ${tab === 'cg' ? 'active' : ''}`}
            onClick={() => {
              audioEngine.playUiTick('click');
              setTab('cg');
            }}
          >
            <ImageIcon size={16} />
            <span>이벤트 CG 갤러리 ({meta.unlockedCGs.length}/{CG_LIST.length})</span>
          </button>
          <button
            type="button"
            className={`vn-tab-btn ${tab === 'music' ? 'active' : ''}`}
            onClick={() => {
              audioEngine.playUiTick('click');
              setTab('music');
            }}
          >
            <Disc3 size={16} />
            <span>천문 음악실 ({BGM_LIST.length}곡)</span>
          </button>
          <button
            type="button"
            className={`vn-tab-btn ${tab === 'endings' ? 'active' : ''}`}
            onClick={() => {
              audioEngine.playUiTick('click');
              setTab('endings');
            }}
          >
            <Trophy size={16} />
            <span>결말 기록부 ({meta.unlockedEndings.length}/4)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="vn-archive-body">
          {tab === 'codex' && (
            <div className="vn-codex-layout">
              <div className="vn-codex-sidebar">
                <div className="vn-codex-cats">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`vn-cat-pill ${category === cat ? 'active' : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="vn-codex-list">
                  {filteredCodex.map((entry) => {
                    const unlocked = meta.unlockedCodex.includes(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={`vn-codex-item ${selectedCodexId === entry.id ? 'selected' : ''} ${
                          unlocked ? '' : 'locked'
                        }`}
                        onClick={() => {
                          audioEngine.playUiTick('hover');
                          setSelectedCodexId(entry.id);
                        }}
                      >
                        <span className="vn-codex-item-cat">{entry.category}</span>
                        <span className="vn-codex-item-title">
                          {unlocked ? entry.term : '？？？ (미관측 기록)'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="vn-codex-detail">
                {isActiveUnlocked ? (
                  <>
                    <div className="vn-codex-detail-head">
                      <span className="vn-badge">{activeCodex.category}</span>
                      {activeCodex.ruby && (
                        <span className="vn-codex-ruby-sub">{activeCodex.ruby}</span>
                      )}
                      <h3>{activeCodex.term}</h3>
                      <p className="vn-codex-summary">{activeCodex.shortDesc}</p>
                    </div>
                    <div className="vn-codex-paragraphs">
                      {activeCodex.fullDesc.map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}
                    </div>
                    {activeCodex.quote && (
                      <blockquote className="vn-codex-quote">{activeCodex.quote}</blockquote>
                    )}
                  </>
                ) : (
                  <div className="vn-codex-locked-placeholder">
                    <Sparkles size={32} />
                    <h4>인과 미관측 항목</h4>
                    <p>본편 스토리를 진행하거나 본문 내 황금빛 용어를 열람하면 해금됩니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'cg' && (
            <div className="vn-cg-grid">
              {CG_LIST.map((cg) => {
                const unlocked = meta.unlockedCGs.includes(cg.id);
                return (
                  <div
                    key={cg.id}
                    className={`vn-cg-card ${unlocked ? 'unlocked' : 'locked'}`}
                    onClick={() => {
                      if (unlocked) {
                        audioEngine.playUiTick('confirm');
                        setZoomCg(cg);
                      }
                    }}
                  >
                    <div className="vn-cg-thumb-wrap">
                      {unlocked ? (
                        <img src={cg.file} alt={cg.title} className="vn-cg-thumb" />
                      ) : (
                        <div className="vn-cg-locked-box">UNOBSERVED MEMORY</div>
                      )}
                    </div>
                    <div className="vn-cg-meta">
                      <span className="vn-cg-chapter">{cg.chapter}</span>
                      <h4>{unlocked ? cg.title : '미해금 이벤트 CG'}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'music' && (
            <div className="vn-music-list">
              {BGM_LIST.map((track) => {
                const isPlaying = playingBgm === track.id;
                return (
                  <div
                    key={track.id}
                    className={`vn-music-row ${isPlaying ? 'playing' : ''}`}
                    onClick={() => handlePlayTrack(track.id)}
                  >
                    <div className="vn-music-num">
                      {isPlaying ? (
                        <div className="vn-eq-bars">
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : (
                        <span>{track.trackNo}</span>
                      )}
                    </div>
                    <div className="vn-music-info">
                      <div className="vn-music-title-row">
                        <h4>{track.title}</h4>
                        <span className="vn-music-eng">{track.englishTitle}</span>
                      </div>
                      <p>{track.description}</p>
                    </div>
                    <div className="vn-music-spec">
                      <span>{track.keySignature}</span>
                      <small>{track.tempo}</small>
                    </div>
                    <button type="button" className="vn-music-play-btn">
                      <Play size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'endings' && (
            <div className="vn-endings-grid">
              {ALL_ENDINGS_INFO.map((ed) => {
                const unlocked = meta.unlockedEndings.includes(ed.id);
                return (
                  <div
                    key={ed.id}
                    className={`vn-ending-card ${unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <span className="vn-ending-code">{ed.code}</span>
                    <h4>{unlocked ? ed.title : '？？？ (미도달 결말)'}</h4>
                    <p>{unlocked ? '관측 완료 — 기록보존실에 영구 등재되었습니다.' : `해금 단서: ${ed.hint}`}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen CG Zoom Lightbox */}
      {zoomCg && (
        <div
          className="vn-cg-lightbox"
          onClick={(e) => {
            e.stopPropagation();
            setZoomCg(null);
          }}
        >
          <img src={zoomCg.file} alt={zoomCg.title} />
          <div className="vn-cg-lightbox-caption">
            <span>{zoomCg.chapter}</span>
            <h3>{zoomCg.title}</h3>
            <p>{zoomCg.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
};

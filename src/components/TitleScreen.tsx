import React, { useState } from 'react';
import {
  BookOpen,
  Compass,
  FolderOpen,
  GitBranch,
  Play,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';
import { PersistentMeta } from '../types/vn';
import { ParticleCanvas } from './ParticleCanvas';

interface TitleScreenProps {
  hasContinue: boolean;
  meta: PersistentMeta;
  isMuted: boolean;
  onToggleMute: () => void;
  onStartNew: () => void;
  onContinue: () => void;
  onOpenLoad: () => void;
  onOpenFlowchart: () => void;
  onOpenArchive: (tab?: 'codex' | 'cg' | 'music' | 'endings') => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasContinue,
  meta,
  isMuted,
  onToggleMute,
  onStartNew,
  onContinue,
  onOpenLoad,
  onOpenFlowchart,
  onOpenArchive,
  onOpenSettings,
}) => {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    audioEngine.unlock();
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    setParallax({ x: nx, y: ny });
  };

  const trueCleared = meta.unlockedEndings.includes('end_true_speed_star_dies');
  const bgSrc = trueCleared
    ? './assets/images/cg/cg_true_epilogue.jpg'
    : './assets/images/cg/cg_title_keyvisual.jpg';

  return (
    <div
      className="vn-title-screen"
      onMouseMove={handleMouseMove}
      onClick={() => audioEngine.unlock()}
    >
      {/* Parallax Key Visual */}
      <div
        className="vn-title-bg"
        style={{
          backgroundImage: `url('${bgSrc}')`,
          transform: `scale(1.055) translate3d(${-parallax.x * 14}px, ${-parallax.y * 10}px, 0)`,
        }}
      />

      {/* Rotating Astronomical Astrolabe SVG Filigree */}
      <svg className="vn-title-astrolabe" viewBox="0 0 600 600" aria-hidden="true">
        <circle cx="300" cy="300" r="260" fill="none" stroke="rgba(186,230,253,0.16)" strokeWidth="1" strokeDasharray="4 8" />
        <circle cx="300" cy="300" r="215" fill="none" stroke="rgba(253,224,71,0.15)" strokeWidth="0.9" />
        <circle cx="300" cy="300" r="165" fill="none" stroke="rgba(186,230,253,0.12)" strokeWidth="1.2" strokeDasharray="18 6 2 6" />
        <line x1="40" y1="300" x2="560" y2="300" stroke="rgba(186,230,253,0.09)" strokeWidth="0.8" />
        <line x1="300" y1="40" x2="300" y2="560" stroke="rgba(186,230,253,0.09)" strokeWidth="0.8" />
      </svg>

      <div className="vn-title-vignette" />
      <ParticleCanvas preset={trueCleared ? 'snow-petals' : 'stardust'} />

      {/* Left Literary Brand & Menu */}
      <div className="vn-title-content">
        <div className="vn-title-header">
          <div className="vn-title-eyebrow">
            <Compass size={14} />
            <span>CHRONO-ELEGY : 0.0004Hz · ARCHIVE ROOM ZERO</span>
          </div>
          <h1 className="vn-main-logo">
            별이 죽는 속도로
            <br />
            <span>너를 읽는다</span>
          </h1>
          <p className="vn-title-tagline">
            {trueCleared
              ? '「가장 어두운 유리 밤하늘을 건너, 마침내 너라는 첫 번째 아침에 도착했다.」'
              : '「이 수첩을 여는 순간, 너는 일곱 번 죽은 나를 여덟 번째로 살해하게 된다.」'}
          </p>
        </div>

        <nav className="vn-title-menu">
          {hasContinue && (
            <button
              type="button"
              className="vn-title-btn primary"
              onMouseEnter={() => audioEngine.playUiTick('hover')}
              onClick={() => {
                audioEngine.playUiTick('confirm');
                onContinue();
              }}
            >
              <Sparkles size={17} />
              <span className="ko">이어 읽기</span>
              <span className="en">CONTINUE CHRONICLE</span>
            </button>
          )}

          <button
            type="button"
            className={`vn-title-btn ${!hasContinue ? 'primary' : ''}`}
            onMouseEnter={() => audioEngine.playUiTick('hover')}
            onClick={() => {
              audioEngine.playUiTick('confirm');
              onStartNew();
            }}
          >
            <Play size={17} />
            <span className="ko">새 기록 시작</span>
            <span className="en">NEW CHRONICLE</span>
          </button>

          <button
            type="button"
            className="vn-title-btn"
            onMouseEnter={() => audioEngine.playUiTick('hover')}
            onClick={() => {
              audioEngine.playUiTick('click');
              onOpenLoad();
            }}
          >
            <FolderOpen size={17} />
            <span className="ko">기억 서고</span>
            <span className="en">LOAD ARCHIVE</span>
          </button>

          <button
            type="button"
            className="vn-title-btn"
            onMouseEnter={() => audioEngine.playUiTick('hover')}
            onClick={() => {
              audioEngine.playUiTick('click');
              onOpenFlowchart();
            }}
          >
            <GitBranch size={17} />
            <span className="ko">인과율 분기도</span>
            <span className="en">WORLDLINE FLOWCHART</span>
          </button>

          <button
            type="button"
            className="vn-title-btn"
            onMouseEnter={() => audioEngine.playUiTick('hover')}
            onClick={() => {
              audioEngine.playUiTick('click');
              onOpenArchive('codex');
            }}
          >
            <BookOpen size={17} />
            <span className="ko">천문 기록원</span>
            <span className="en">CODEX · GALLERY · OST</span>
          </button>

          <button
            type="button"
            className="vn-title-btn"
            onMouseEnter={() => audioEngine.playUiTick('hover')}
            onClick={() => {
              audioEngine.playUiTick('click');
              onOpenSettings();
            }}
          >
            <Sliders size={17} />
            <span className="ko">환경 설정</span>
            <span className="en">CONFIGURATION</span>
          </button>
        </nav>
      </div>

      {/* Bottom Right Status & Audio Bar */}
      <div className="vn-title-footer">
        <div className="vn-title-progress-pill">
          <span>ENDINGS {meta.unlockedEndings.length}/4</span>
          <span>·</span>
          <span>CG {meta.unlockedCGs.length}/7</span>
          <span>·</span>
          <span>CODEX {meta.unlockedCodex.length}/20</span>
        </div>

        <button
          type="button"
          className="vn-audio-pill"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          <span>{isMuted ? 'SOUND MUTED' : '♪ 0.0004Hz의 자장가'}</span>
        </button>
      </div>
    </div>
  );
};

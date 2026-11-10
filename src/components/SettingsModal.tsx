import React from 'react';
import { RotateCcw, Sliders, Volume2, X } from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';
import { DEFAULT_SETTINGS, VNSettings } from '../engine/storage';

interface SettingsModalProps {
  settings: VNSettings;
  onChange: (next: VNSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  const update = (patch: Partial<VNSettings>) => {
    const next = { ...settings, ...patch };
    onChange(next);
  };

  return (
    <div className="vn-modal-backdrop" onClick={onClose}>
      <div className="vn-modal-panel vn-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="vn-modal-header">
          <div>
            <span className="vn-modal-eyebrow">CHRONICLE CONFIGURATION · 관측기구 환경 설정</span>
            <h2 className="vn-modal-title">
              <Sliders size={20} style={{ display: 'inline', marginRight: 8 }} />
              환경 설정
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

        <div className="vn-settings-body">
          <div className="vn-setting-group">
            <h3>문장 및 독서 연출</h3>
            <label className="vn-slider-row">
              <div>
                <span>문장 출력 속도 (타자 호흡)</span>
                <strong>{settings.textSpeed >= 115 ? '즉시 표시' : `${settings.textSpeed} 자/초`}</strong>
              </div>
              <input
                type="range"
                min={20}
                max={120}
                step={5}
                value={settings.textSpeed}
                onChange={(e) => update({ textSpeed: Number(e.target.value) })}
              />
            </label>

            <label className="vn-slider-row">
              <div>
                <span>자동 진행(AUTO) 대기 호흡</span>
                <strong>{(settings.autoDelayMs / 1000).toFixed(1)}초</strong>
              </div>
              <input
                type="range"
                min={900}
                max={4500}
                step={200}
                value={settings.autoDelayMs}
                onChange={(e) => update({ autoDelayMs: Number(e.target.value) })}
              />
            </label>

            <label className="vn-toggle-row">
              <div>
                <span>미독(읽지 않은) 문장까지 고속 스킵 허용</span>
                <small>해제 시 이미 읽은 페이지까지만 안전하게 스킵합니다.</small>
              </div>
              <input
                type="checkbox"
                checked={settings.skipUnread}
                onChange={(e) => update({ skipUnread: e.target.checked })}
              />
            </label>
          </div>

          <div className="vn-setting-group">
            <h3>
              <Volume2 size={16} style={{ display: 'inline', marginRight: 6 }} />
              음향 및 오리지널 사운드트랙
            </h3>
            <label className="vn-slider-row">
              <div>
                <span>배경음악 (BGM) 음량</span>
                <strong>{Math.round(settings.bgmVolume * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={settings.bgmVolume}
                onChange={(e) => update({ bgmVolume: Number(e.target.value) })}
              />
            </label>

            <label className="vn-slider-row">
              <div>
                <span>효과음 (SFX · 연출 음향) 음량</span>
                <strong>{Math.round(settings.sfxVolume * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={settings.sfxVolume}
                onChange={(e) => {
                  update({ sfxVolume: Number(e.target.value) });
                  audioEngine.playUiTick('hover');
                }}
              />
            </label>

            <label className="vn-slider-row">
              <div>
                <span>활자 호흡음 (만년필·음성 파형 틱) 음량</span>
                <strong>{Math.round(settings.textTickVolume * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.02}
                value={settings.textTickVolume}
                onChange={(e) => update({ textTickVolume: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="vn-setting-shortcuts">
            <span>단축키 안내:</span>
            <code>Space / Enter / 클릭</code> 다음 문장 · <code>A</code> 오토 · <code>S / Ctrl</code> 스킵 · <code>L / 마우스 휠↑</code> 회상록 · <code>H</code> UI 숨기기 · <code>F5 / F9</code> 퀵세이브/로드
          </div>

          <div className="vn-settings-footer">
            <button
              type="button"
              className="vn-secondary-btn"
              onClick={() => {
                audioEngine.playUiTick('click');
                onChange(DEFAULT_SETTINGS);
              }}
            >
              <RotateCcw size={15} /> 기본값 복원
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

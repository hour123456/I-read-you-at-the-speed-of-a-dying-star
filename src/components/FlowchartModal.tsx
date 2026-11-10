import React from 'react';
import { GitBranch, Lock, Sparkles, X } from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';
import { PersistentMeta, SceneNode } from '../types/vn';

interface FlowchartModalProps {
  scenes: SceneNode[];
  currentSceneId?: string;
  meta: PersistentMeta;
  onJumpToScene: (sceneId: string) => void;
  onClose: () => void;
}

const COL_W = 240;
const ROW_H = 132;
const PAD_X = 70;
const PAD_Y = 75;

export const FlowchartModal: React.FC<FlowchartModalProps> = ({
  scenes,
  currentSceneId,
  meta,
  onJumpToScene,
  onClose,
}) => {
  const maxCol = Math.max(...scenes.map((s) => s.flowchartCol), 1);
  const maxRow = Math.max(...scenes.map((s) => s.flowchartRow), 2);
  const canvasWidth = (maxCol + 1) * COL_W + PAD_X * 2;
  const canvasHeight = (maxRow + 1) * ROW_H + PAD_Y * 2;

  const sceneMap = new Map(scenes.map((s) => [s.id, s]));

  return (
    <div className="vn-modal-backdrop" onClick={onClose}>
      <div className="vn-modal-panel vn-flowchart-panel" onClick={(e) => e.stopPropagation()}>
        <div className="vn-modal-header">
          <div>
            <span className="vn-modal-eyebrow">CAUSALITY OBSERVATORY · 인과율 관측 분기도</span>
            <h2 className="vn-modal-title">
              <GitBranch size={20} style={{ display: 'inline', marginRight: 8 }} />
              세계선 분기 플로우차트
            </h2>
          </div>
          <div className="vn-flowchart-legend">
            <span className="legend-dot visited" /> 관측 완료 (클릭 시 시간 도약)
            <span className="legend-dot current" /> 현재 위치
            <span className="legend-dot locked" /> 미관측 영역
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
        </div>

        <div className="vn-flowchart-scroll">
          <div
            className="vn-flowchart-stage"
            style={{ width: canvasWidth, height: canvasHeight }}
          >
            <svg width={canvasWidth} height={canvasHeight} className="vn-flowchart-svg">
              {scenes.map((node) =>
                (node.parentIds || []).map((pid) => {
                  const parent = sceneMap.get(pid);
                  if (!parent) return null;
                  const x1 = PAD_X + parent.flowchartCol * COL_W + 188;
                  const y1 = PAD_Y + parent.flowchartRow * ROW_H + 44;
                  const x2 = PAD_X + node.flowchartCol * COL_W;
                  const y2 = PAD_Y + node.flowchartRow * ROW_H + 44;
                  const mx = (x1 + x2) / 2;
                  const activeEdge =
                    meta.visitedScenes.includes(parent.id) &&
                    meta.visitedScenes.includes(node.id);
                  return (
                    <path
                      key={`${pid}->${node.id}`}
                      d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={activeEdge ? 'rgba(125, 211, 252, 0.72)' : 'rgba(100, 116, 139, 0.28)'}
                      strokeWidth={activeEdge ? 2.4 : 1.5}
                      strokeDasharray={activeEdge ? undefined : '5 5'}
                    />
                  );
                })
              )}
            </svg>

            {scenes.map((node) => {
              const visited = meta.visitedScenes.includes(node.id) || node.id === 'pro_01';
              const isCurrent = currentSceneId === node.id;
              const left = PAD_X + node.flowchartCol * COL_W;
              const top = PAD_Y + node.flowchartRow * ROW_H;

              return (
                <button
                  key={node.id}
                  type="button"
                  className={`vn-flow-node ${visited ? 'visited' : 'locked'} ${
                    isCurrent ? 'current' : ''
                  } ${node.endingKind ? `ending-${node.endingKind}` : ''}`}
                  style={{ left, top }}
                  onClick={() => {
                    if (!visited) return;
                    audioEngine.playUiTick('confirm');
                    onJumpToScene(node.id);
                  }}
                  title={visited ? `${node.summary}\n(클릭하여 이 세계선 지점으로 이동)` : '아직 관측되지 않은 세계선입니다.'}
                >
                  <div className="vn-flow-node-chap">
                    <span>{node.chapter}</span>
                    {isCurrent && <Sparkles size={13} />}
                    {!visited && <Lock size={12} />}
                  </div>
                  <div className="vn-flow-node-title">
                    {visited ? node.title : '？？？'}
                  </div>
                  <div className="vn-flow-node-sub">
                    {visited ? node.summary : '미관측 인과 영역'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

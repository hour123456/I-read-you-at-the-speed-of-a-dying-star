import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Compass,
  EyeOff,
  FastForward,
  FolderOpen,
  GitBranch,
  Home,
  Play,
  ScrollText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ArchiveModal } from './components/ArchiveModal';
import { BacklogItem, BacklogModal } from './components/BacklogModal';
import { FlowchartModal } from './components/FlowchartModal';
import { ParticleCanvas } from './components/ParticleCanvas';
import {
  extractCodexIds,
  parseScriptText,
  RichText,
  stripScriptMarkup,
} from './components/RichText';
import { SaveLoadModal } from './components/SaveLoadModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { CODEX_MAP } from './data/codex';
import { BACKGROUND_FILES, CG_MAP, CHARACTER_META } from './data/media';
import { ALL_SCENES, SCENE_MAP } from './data/storyIndex';
import { audioEngine } from './engine/audioEngine';
import {
  deleteSaveSlot,
  loadAllSaves,
  loadMeta,
  loadSettings,
  saveMeta,
  saveSettings,
  VNSettings,
  writeSaveSlot,
} from './engine/storage';
import {
  BackgroundId,
  BGMId,
  CGId,
  CharacterStageSlot,
  ChoiceOption,
  EndingMeta,
  GameStats,
  PersistentMeta,
  SaveSlotData,
  SceneNode,
  ScriptBeat,
  VFXPreset,
} from './types/vn';

interface ResolvedStage {
  bg: BackgroundId;
  cg: CGId | null;
  chars: CharacterStageSlot[];
  bgm: BGMId | 'stop';
  vfx: VFXPreset;
  locationTag: { date: string; place: string };
  nvlGroup: { beat: ScriptBeat; index: number }[];
}

function resolveStageAt(scene: SceneNode, beatIndex: number): ResolvedStage {
  let bg: BackgroundId = 'bg_black';
  let cg: CGId | null = null;
  let chars: CharacterStageSlot[] = [];
  let bgm: BGMId | 'stop' = 'bgm_01_title';
  let vfx: VFXPreset = 'none';
  let locationTag = { date: '박명력 347. 11', place: '아르카디아-09' };
  let nvlGroup: { beat: ScriptBeat; index: number }[] = [];

  const clamped = Math.min(beatIndex, scene.beats.length - 1);
  for (let i = 0; i <= clamped; i++) {
    const b = scene.beats[i];
    if (b.bg !== undefined) bg = b.bg;
    if (b.cg !== undefined) cg = b.cg;
    if (b.chars !== undefined) chars = b.chars;
    if (b.bgm !== undefined) bgm = b.bgm;
    if (b.vfx !== undefined) vfx = b.vfx;
    if (b.locationTag !== undefined) locationTag = b.locationTag;

    const mode = b.mode || 'adv';
    if (mode === 'nvl') {
      if (b.nvlClear) {
        nvlGroup = [{ beat: b, index: i }];
      } else {
        nvlGroup.push({ beat: b, index: i });
      }
    } else {
      nvlGroup = [];
    }
  }

  return { bg, cg, chars, bgm, vfx, locationTag, nvlGroup };
}

function estimateBaselineStatsForScene(sceneId: string): GameStats {
  const scene = SCENE_MAP[sceneId];
  if (!scene) return { resonance: 0, memory: 0, order: 0 };
  const col = scene.flowchartCol;
  if (col <= 2) return { resonance: 0, memory: 0, order: 0 };
  if (col <= 6) return { resonance: 15, memory: 10, order: 0 };
  if (col <= 9) return { resonance: 25, memory: 20, order: 5 };
  if (col <= 12) return { resonance: 40, memory: 30, order: 10 };
  return { resonance: 55, memory: 40, order: 15 };
}

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [sceneId, setSceneId] = useState<string>('pro_01');
  const [beatIndex, setBeatIndex] = useState<number>(0);
  const [stats, setStats] = useState<GameStats>({ resonance: 0, memory: 0, order: 0 });
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [visitedInRun, setVisitedInRun] = useState<string[]>(['pro_01']);

  const [meta, setMeta] = useState<PersistentMeta>(() => loadMeta());
  const [saves, setSaves] = useState<Record<number, SaveSlotData>>(() => loadAllSaves());
  const [settings, setSettings] = useState<VNSettings>(() => loadSettings());
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Playback / UI states
  const [visibleChars, setVisibleChars] = useState<number>(0);
  const [isAuto, setIsAuto] = useState<boolean>(false);
  const [isSkip, setIsSkip] = useState<boolean>(false);
  const [hideHud, setHideHud] = useState<boolean>(false);
  const [showChapterCard, setShowChapterCard] = useState<boolean>(false);
  const [flashClass, setFlashClass] = useState<string>('');
  const [vfxTriggerKey, setVfxTriggerKey] = useState<number>(0);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [activeCodexPopup, setActiveCodexPopup] = useState<string | null>(null);
  const [activeEnding, setActiveEnding] = useState<EndingMeta | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [modal, setModal] = useState<
    | null
    | { kind: 'archive'; tab?: 'codex' | 'cg' | 'music' | 'endings'; codexId?: string | null }
    | { kind: 'flowchart' }
    | { kind: 'save' }
    | { kind: 'load' }
    | { kind: 'settings' }
    | { kind: 'backlog' }
  >(null);

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Sync audio volumes
  useEffect(() => {
    audioEngine.setVolumes(
      settings.bgmVolume,
      settings.sfxVolume,
      settings.textTickVolume,
      isMuted
    );
    saveSettings(settings);
  }, [settings, isMuted]);

  // Title BGM when on Title Screen
  useEffect(() => {
    if (screen === 'title' && modal?.kind !== 'archive') {
      audioEngine.playBgm('bgm_01_title');
    }
  }, [screen, modal]);

  const currentScene = SCENE_MAP[sceneId] || ALL_SCENES[0];
  const currentBeat: ScriptBeat =
    currentScene.beats[Math.min(beatIndex, currentScene.beats.length - 1)] ||
    currentScene.beats[0];

  const stage = useMemo(
    () => resolveStageAt(currentScene, beatIndex),
    [currentScene, beatIndex]
  );

  const parsedCurrent = useMemo(
    () => parseScriptText(currentBeat.text),
    [currentBeat.text]
  );
  const isTyping = visibleChars < parsedCurrent.totalLength;
  const beatKey = `${currentScene.id}:${beatIndex}`;

  // Side effects when arriving at a new beat
  useEffect(() => {
    if (screen !== 'game') return;

    // Chapter card check
    if (currentBeat.chapterCard) {
      setShowChapterCard(true);
    } else {
      setShowChapterCard(false);
    }

    // BGM update
    audioEngine.playBgm(stage.bgm);

    // SFX trigger
    if (currentBeat.sfx) {
      audioEngine.playSfx(currentBeat.sfx);
    }
    if (currentBeat.vfx) {
      setVfxTriggerKey((k) => k + 1);
    }

    // Screen transition flashes
    if (currentBeat.bgTransition === 'flash-white') {
      setFlashClass('flash-white');
      const t = window.setTimeout(() => setFlashClass(''), 520);
      return () => window.clearTimeout(t);
    } else if (currentBeat.bgTransition === 'flash-crimson') {
      setFlashClass('flash-crimson');
      const t = window.setTimeout(() => setFlashClass(''), 520);
      return () => window.clearTimeout(t);
    }
  }, [screen, currentScene.id, beatIndex, currentBeat, stage.bgm]);

  // Unlock persistent CGs, Codex links, Visited Scenes, Read Beats, and Endings
  useEffect(() => {
    if (screen !== 'game') return;
    const inlineCodex = extractCodexIds(currentBeat.text);

    setMeta((prev) => {
      let changed = false;
      const nextCGs = [...prev.unlockedCGs];
      const nextCodex = [...prev.unlockedCodex];
      const nextVisited = [...prev.visitedScenes];
      const nextRead = [...prev.readBeatKeys];
      const nextEndings = [...prev.unlockedEndings];

      if (stage.cg && !nextCGs.includes(stage.cg)) {
        nextCGs.push(stage.cg);
        changed = true;
      }
      for (const cid of inlineCodex) {
        if (CODEX_MAP[cid] && !nextCodex.includes(cid)) {
          nextCodex.push(cid);
          changed = true;
        }
      }
      if (!nextVisited.includes(currentScene.id)) {
        nextVisited.push(currentScene.id);
        changed = true;
      }
      if (!nextRead.includes(beatKey)) {
        nextRead.push(beatKey);
        changed = true;
      }
      if (currentBeat.ending && !nextEndings.includes(currentBeat.ending.id)) {
        nextEndings.push(currentBeat.ending.id);
        changed = true;
      }

      if (!changed) return prev;
      const updated: PersistentMeta = {
        unlockedCGs: nextCGs,
        unlockedCodex: nextCodex,
        visitedScenes: nextVisited,
        readBeatKeys: nextRead,
        unlockedEndings: nextEndings,
      };
      saveMeta(updated);
      return updated;
    });

    // Append to Backlog
    setBacklog((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.text === currentBeat.text && last.speaker === currentBeat.speaker) {
        return prev;
      }
      const next = [
        ...prev.slice(-140),
        {
          chapter: currentScene.chapter,
          speaker: currentBeat.speaker,
          speakerTitle: currentBeat.speakerTitle,
          text: currentBeat.text,
        },
      ];
      return next;
    });
  }, [screen, currentScene.id, currentScene.chapter, beatIndex, beatKey, currentBeat, stage.cg]);

  // Typewriter effect
  useEffect(() => {
    if (screen !== 'game' || showChapterCard) return;

    if (settings.textSpeed >= 115 || isSkip) {
      setVisibleChars(parsedCurrent.totalLength);
      return;
    }

    setVisibleChars(0);
    const intervalMs = Math.max(10, Math.round(1000 / settings.textSpeed));
    let charCount = 0;
    let tickStep = 0;

    const timer = window.setInterval(() => {
      charCount += 1;
      tickStep += 1;
      if (tickStep % 3 === 0) {
        audioEngine.playTextCadence(currentBeat.speaker);
      }
      setVisibleChars(charCount);
      if (charCount >= parsedCurrent.totalLength) {
        window.clearInterval(timer);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [screen, showChapterCard, currentScene.id, beatIndex, parsedCurrent.totalLength, settings.textSpeed, isSkip, currentBeat.speaker]);

  // Create SaveSlotData snapshot helper
  const buildSaveSnapshot = useCallback(
    (slotId: number, label: string): SaveSlotData => ({
      slotId,
      label,
      savedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
      sceneId: currentScene.id,
      beatIndex,
      chapterTitle: currentScene.chapter,
      sceneTitle: currentScene.title,
      previewText: stripScriptMarkup(currentBeat.text).slice(0, 68),
      bg: stage.bg,
      cg: stage.cg,
      bgm: stage.bgm,
      chars: stage.chars,
      locationTag: stage.locationTag,
      stats,
      flags,
      visitedScenes: visitedInRun,
    }),
    [currentScene, beatIndex, currentBeat.text, stage, stats, flags, visitedInRun]
  );

  // Auto-save whenever entering a new scene
  useEffect(() => {
    if (screen !== 'game') return;
    if (beatIndex === 0) {
      const snap = buildSaveSnapshot(0, 'AUTO SAVE');
      setSaves(writeSaveSlot(0, snap));
    }
  }, [screen, currentScene.id, beatIndex, buildSaveSnapshot]);

  const goToScene = useCallback((nextId: string) => {
    if (!SCENE_MAP[nextId]) return;
    setSceneId(nextId);
    setBeatIndex(0);
    setActiveEnding(null);
    setActiveCodexPopup(null);
    setVisitedInRun((prev) => (prev.includes(nextId) ? prev : [...prev, nextId]));
  }, []);

  const advanceBeat = useCallback(() => {
    audioEngine.unlock();
    if (modal) return;
    if (activeCodexPopup) {
      setActiveCodexPopup(null);
      return;
    }
    if (hideHud) {
      setHideHud(false);
      return;
    }
    if (showChapterCard) {
      audioEngine.playUiTick('confirm');
      setShowChapterCard(false);
      return;
    }
    if (activeEnding) return;

    // If still typing, finish current line immediately
    if (isTyping) {
      setVisibleChars(parsedCurrent.totalLength);
      return;
    }

    // Stop if waiting on player choices
    if (currentBeat.choices && currentBeat.choices.length > 0) {
      setIsSkip(false);
      return;
    }

    // Check if this beat triggers an Ending Screen
    if (currentBeat.ending) {
      setIsAuto(false);
      setIsSkip(false);
      audioEngine.playUiTick('confirm');
      setActiveEnding(currentBeat.ending);
      return;
    }

    // Advance to next beat or next scene
    if (beatIndex + 1 < currentScene.beats.length) {
      if (currentBeat.nextSceneId) {
        goToScene(currentBeat.nextSceneId);
      } else {
        setBeatIndex((i) => i + 1);
      }
    } else if (currentBeat.nextSceneId) {
      goToScene(currentBeat.nextSceneId);
    }
  }, [
    modal,
    activeCodexPopup,
    hideHud,
    showChapterCard,
    activeEnding,
    isTyping,
    parsedCurrent.totalLength,
    currentBeat,
    beatIndex,
    currentScene.beats.length,
    goToScene,
  ]);

  // Auto-play timer
  useEffect(() => {
    if (screen !== 'game' || !isAuto || isSkip || modal || showChapterCard || activeEnding) return;
    if (isTyping) return;
    if (currentBeat.choices && currentBeat.choices.length > 0) return;

    const timer = window.setTimeout(() => {
      advanceBeat();
    }, settings.autoDelayMs);
    return () => window.clearTimeout(timer);
  }, [
    screen,
    isAuto,
    isSkip,
    modal,
    showChapterCard,
    activeEnding,
    isTyping,
    currentBeat.choices,
    settings.autoDelayMs,
    advanceBeat,
  ]);

  // Skip mode timer
  useEffect(() => {
    if (screen !== 'game' || !isSkip || modal || showChapterCard || activeEnding) return;
    if (currentBeat.choices && currentBeat.choices.length > 0) {
      setIsSkip(false);
      return;
    }
    const alreadyRead = meta.readBeatKeys.includes(beatKey);
    if (!settings.skipUnread && !alreadyRead) {
      setIsSkip(false);
      showToast('아직 읽지 않은 문장에 도달하여 스킵을 멈추었습니다.');
      return;
    }
    const timer = window.setTimeout(() => {
      advanceBeat();
    }, 95);
    return () => window.clearTimeout(timer);
  }, [
    screen,
    isSkip,
    modal,
    showChapterCard,
    activeEnding,
    currentBeat.choices,
    meta.readBeatKeys,
    beatKey,
    settings.skipUnread,
    advanceBeat,
    showToast,
  ]);

  // Choice handler
  const isChoiceUnlocked = (choice: ChoiceOption): boolean => {
    if (!choice.condition) return true;
    if (
      choice.condition.minResonance !== undefined &&
      stats.resonance < choice.condition.minResonance
    ) {
      return false;
    }
    if (
      choice.condition.minMemory !== undefined &&
      stats.memory < choice.condition.minMemory
    ) {
      return false;
    }
    if (choice.condition.requiredFlag && !flags[choice.condition.requiredFlag]) {
      return false;
    }
    return true;
  };

  const handleSelectChoice = (choice: ChoiceOption) => {
    if (!isChoiceUnlocked(choice)) {
      audioEngine.playUiTick('click');
      showToast(choice.lockedHint || '인과율 조건이 충족되지 않았습니다.');
      return;
    }
    audioEngine.playUiTick('choice');
    setIsSkip(false);

    if (choice.stats) {
      const dr = choice.stats.resonance || 0;
      const dm = choice.stats.memory || 0;
      const doStat = choice.stats.order || 0;
      setStats((prev) => ({
        resonance: prev.resonance + dr,
        memory: prev.memory + dm,
        order: prev.order + doStat,
      }));
      const parts: string[] = [];
      if (dr !== 0) parts.push(`공명률 ${dr > 0 ? `+${dr}` : dr}`);
      if (dm !== 0) parts.push(`기억보존율 ${dm > 0 ? `+${dm}` : dm}`);
      if (doStat !== 0) parts.push(`질서도 ${doStat > 0 ? `+${doStat}` : doStat}`);
      if (parts.length > 0) {
        showToast(`✦ 인과 변동 — ${parts.join(' · ')}`);
      }
    }
    if (choice.setFlags) {
      setFlags((prev) => ({ ...prev, ...choice.setFlags }));
    }
    goToScene(choice.nextSceneId);
  };

  // Save / Load handlers
  const handleQuickSave = useCallback(() => {
    if (screen !== 'game') return;
    audioEngine.playUiTick('confirm');
    const snap = buildSaveSnapshot(99, 'QUICK SAVE');
    setSaves(writeSaveSlot(99, snap));
    showToast('긴급 책갈피(Q.SAVE)에 현재 인과율을 보존했습니다.');
  }, [screen, buildSaveSnapshot, showToast]);

  const handleQuickLoad = useCallback(() => {
    const q = saves[99] || saves[0];
    if (!q) {
      showToast('불러올 긴급 책갈피 기록이 없습니다.');
      return;
    }
    audioEngine.playUiTick('confirm');
    setSceneId(q.sceneId);
    setBeatIndex(q.beatIndex);
    setStats(q.stats);
    setFlags(q.flags);
    setVisitedInRun(q.visitedScenes || [q.sceneId]);
    setActiveEnding(null);
    setScreen('game');
    showToast('보존된 책갈피로부터 기억을 복원했습니다.');
  }, [saves, showToast]);

  const handleLoadSlot = (slot: SaveSlotData) => {
    setSceneId(slot.sceneId);
    setBeatIndex(slot.beatIndex);
    setStats(slot.stats);
    setFlags(slot.flags);
    setVisitedInRun(slot.visitedScenes || [slot.sceneId]);
    setActiveEnding(null);
    setModal(null);
    setScreen('game');
    showToast(`${slot.chapterTitle} · ${slot.sceneTitle} 지점으로 복귀했습니다.`);
  };

  const handleStartNewGame = () => {
    setSceneId('pro_01');
    setBeatIndex(0);
    setStats({ resonance: 0, memory: 0, order: 0 });
    setFlags({});
    setVisitedInRun(['pro_01']);
    setBacklog([]);
    setActiveEnding(null);
    setIsAuto(false);
    setIsSkip(false);
    setScreen('game');
  };

  const handleJumpFromFlowchart = (targetSceneId: string) => {
    const baseline = estimateBaselineStatsForScene(targetSceneId);
    setSceneId(targetSceneId);
    setBeatIndex(0);
    setStats((prev) => ({
      resonance: Math.max(prev.resonance, baseline.resonance),
      memory: Math.max(prev.memory, baseline.memory),
      order: Math.max(prev.order, baseline.order),
    }));
    setActiveEnding(null);
    setModal(null);
    setScreen('game');
    showToast(`인과율 도약 완료 — 『${SCENE_MAP[targetSceneId]?.title}』`);
  };

  // Keyboard & Wheel Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modal) {
        if (e.key === 'Escape') setModal(null);
        return;
      }
      if (screen !== 'game') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advanceBeat();
      } else if (e.key === 'a' || e.key === 'A') {
        setIsAuto((v) => !v);
      } else if (e.key === 's' || e.key === 'S') {
        setIsSkip((v) => !v);
      } else if (e.key === 'h' || e.key === 'H') {
        setHideHud((v) => !v);
      } else if (e.key === 'l' || e.key === 'L') {
        setModal({ kind: 'backlog' });
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleQuickSave();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleQuickLoad();
      } else if (e.key === 'Escape') {
        setModal({ kind: 'settings' });
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (screen === 'game' && !modal && e.deltaY < -28) {
        setModal({ kind: 'backlog' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
    };
  }, [screen, modal, advanceBeat, handleQuickSave, handleQuickLoad]);

  const hasContinue = Object.keys(saves).length > 0;
  const mostRecentSave = useMemo(() => {
    const list = Object.values(saves);
    if (list.length === 0) return null;
    return saves[99] || saves[0] || list[0];
  }, [saves]);

  const bgUrl = stage.bg ? BACKGROUND_FILES[stage.bg] : '';
  const activeCgMeta = stage.cg ? CG_MAP[stage.cg] : null;
  const beatMode = currentBeat.mode || 'adv';
  const cameraClass = currentBeat.camera ? `cam-${currentBeat.camera}` : '';

  const inspectedCodex = activeCodexPopup ? CODEX_MAP[activeCodexPopup] : null;

  return (
    <div className="vn-app-root">
      {screen === 'title' ? (
        <TitleScreen
          hasContinue={hasContinue}
          meta={meta}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
          onStartNew={handleStartNewGame}
          onContinue={() => {
            if (mostRecentSave) handleLoadSlot(mostRecentSave);
            else handleStartNewGame();
          }}
          onOpenLoad={() => setModal({ kind: 'load' })}
          onOpenFlowchart={() => setModal({ kind: 'flowchart' })}
          onOpenArchive={(tab) => setModal({ kind: 'archive', tab })}
          onOpenSettings={() => setModal({ kind: 'settings' })}
        />
      ) : (
        <div
          className={`vn-game-stage ${cameraClass}`}
          onClick={advanceBeat}
        >
          {/* Background Layer */}
          <div
            className={`vn-bg-layer ${stage.bg === 'bg_white' ? 'is-white' : ''}`}
            style={bgUrl ? { backgroundImage: `url('${bgUrl}')` } : undefined}
          />

          {/* Character Standing Sprites Layer (Hidden when full-screen CG is active) */}
          {!activeCgMeta && (
            <div className="vn-char-layer">
              {stage.chars.map((slot) => {
                const charDef = CHARACTER_META[slot.id];
                const spriteUrl =
                  charDef?.sprites[slot.expr] || charDef?.sprites.normal || '';
                const isFocused =
                  slot.focus !== undefined
                    ? slot.focus
                    : currentBeat.speaker === charDef?.name;
                return (
                  <div
                    key={slot.id}
                    className={`vn-char-slot pos-${slot.pos} ${
                      isFocused ? 'focused' : 'dimmed'
                    } motion-${slot.motion || 'none'}`}
                  >
                    <img src={spriteUrl} alt={charDef.name} draggable={false} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Full-screen Event CG Layer */}
          {activeCgMeta && (
            <div className="vn-cg-stage-layer">
              <img src={activeCgMeta.file} alt={activeCgMeta.title} draggable={false} />
              <div className="vn-cg-letterbox top" />
              <div className="vn-cg-letterbox bottom" />
            </div>
          )}

          {/* Atmospheric Particle & Sword-Slash VFX Canvas */}
          <ParticleCanvas preset={stage.vfx} triggerKey={vfxTriggerKey} />
          <div className="vn-stage-vignette" />
          {flashClass && <div className={`vn-flash-overlay ${flashClass}`} />}

          {/* Top HUD: Astronomical Location & Causality Resonance Bar + Quick Menu */}
          {!hideHud && !showChapterCard && !activeEnding && (
            <header className="vn-top-hud" onClick={(e) => e.stopPropagation()}>
              <div className="vn-hud-location">
                <div className="vn-hud-astrolabe-icon">
                  <Compass size={16} />
                </div>
                <div>
                  <div className="vn-hud-date">{stage.locationTag.date}</div>
                  <div className="vn-hud-place">
                    <span>{currentScene.chapter}</span> · {stage.locationTag.place}
                  </div>
                </div>
                <div className="vn-hud-stats-pills" title="현재 축적된 인과율 공명 수치">
                  <span className="pill-res">공명 {stats.resonance}</span>
                  <span className="pill-mem">기억 {stats.memory}</span>
                </div>
              </div>

              <div className="vn-hud-controls">
                <button
                  type="button"
                  className={`vn-hud-btn ${isAuto ? 'active' : ''}`}
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setIsAuto((v) => !v);
                    setIsSkip(false);
                  }}
                >
                  <Play size={13} /> AUTO
                </button>
                <button
                  type="button"
                  className={`vn-hud-btn ${isSkip ? 'active' : ''}`}
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setIsSkip((v) => !v);
                    setIsAuto(false);
                  }}
                >
                  <FastForward size={13} /> SKIP
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setModal({ kind: 'backlog' });
                  }}
                >
                  <ScrollText size={13} /> LOG
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={handleQuickSave}
                >
                  Q.SAVE
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={handleQuickLoad}
                >
                  Q.LOAD
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setModal({ kind: 'save' });
                  }}
                >
                  <Bookmark size={13} /> SAVE
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setModal({ kind: 'load' });
                  }}
                >
                  <FolderOpen size={13} /> LOAD
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setModal({ kind: 'flowchart' });
                  }}
                >
                  <GitBranch size={13} /> 분기도
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setModal({ kind: 'archive', tab: 'codex' });
                  }}
                >
                  <BookOpen size={13} /> 기록원
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  title="화면 UI 숨기기 (H)"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setHideHud(true);
                  }}
                >
                  <EyeOff size={13} />
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setModal({ kind: 'settings' });
                  }}
                >
                  <Sliders size={13} />
                </button>
                <button
                  type="button"
                  className="vn-hud-btn"
                  title="타이틀 화면으로"
                  onClick={() => {
                    audioEngine.playUiTick('click');
                    setIsAuto(false);
                    setIsSkip(false);
                    setScreen('title');
                  }}
                >
                  <Home size={13} />
                </button>
              </div>
            </header>
          )}

          {/* 1) NVL Full-Screen Literary Novel Overlay Mode */}
          {!hideHud && !showChapterCard && !activeEnding && beatMode === 'nvl' && (
            <div className="vn-nvl-overlay">
              <div className="vn-nvl-manuscript">
                {stage.nvlGroup.map((entry, idx) => {
                  const isCurrent = entry.index === beatIndex;
                  return (
                    <p
                      key={entry.index}
                      className={`vn-nvl-paragraph ${isCurrent ? 'current' : 'past'}`}
                    >
                      <RichText
                        text={entry.beat.text}
                        visibleChars={isCurrent ? visibleChars : undefined}
                        onInspectCodex={(cid) => {
                          audioEngine.playUiTick('click');
                          setActiveCodexPopup(cid);
                        }}
                      />
                      {isCurrent && !isTyping && idx === stage.nvlGroup.length - 1 && (
                        <span className="vn-pen-cursor">✦</span>
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2) Cinematic Centered Subtitle Mode */}
          {!hideHud && !showChapterCard && !activeEnding && beatMode === 'cinematic' && (
            <div className="vn-cinematic-overlay">
              <p className="vn-cinematic-line">
                <RichText
                  text={currentBeat.text}
                  visibleChars={visibleChars}
                  onInspectCodex={(cid) => {
                    audioEngine.playUiTick('click');
                    setActiveCodexPopup(cid);
                  }}
                />
              </p>
            </div>
          )}

          {/* 3) ADV Bottom Glass Dialogue Window Mode */}
          {!hideHud && !showChapterCard && !activeEnding && beatMode === 'adv' && (
            <div className="vn-adv-container">
              <div className="vn-adv-box">
                {currentBeat.speaker && (
                  <div className="vn-speaker-plate">
                    <span className="vn-speaker-name">{currentBeat.speaker}</span>
                    {currentBeat.speakerTitle && (
                      <span className="vn-speaker-role">{currentBeat.speakerTitle}</span>
                    )}
                  </div>
                )}
                <div className="vn-adv-text">
                  <RichText
                    text={currentBeat.text}
                    visibleChars={visibleChars}
                    onInspectCodex={(cid) => {
                      audioEngine.playUiTick('click');
                      setActiveCodexPopup(cid);
                    }}
                  />
                  {!isTyping && !(currentBeat.choices && currentBeat.choices.length > 0) && (
                    <span className="vn-pen-cursor">▾</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Causality Branching Choice Overlay */}
          {!hideHud &&
            !showChapterCard &&
            !activeEnding &&
            !isTyping &&
            currentBeat.choices &&
            currentBeat.choices.length > 0 && (
              <div className="vn-choices-overlay" onClick={(e) => e.stopPropagation()}>
                <div className="vn-choices-header">
                  <Sparkles size={15} />
                  <span>CAUSALITY BIFURCATION · 인과율 분기 선택</span>
                </div>
                <div className="vn-choices-list">
                  {currentBeat.choices.map((ch, idx) => {
                    const unlocked = isChoiceUnlocked(ch);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        className={`vn-choice-card ${unlocked ? '' : 'locked'}`}
                        onMouseEnter={() => audioEngine.playUiTick('hover')}
                        onClick={() => handleSelectChoice(ch)}
                      >
                        <span className="vn-choice-num">0{idx + 1}</span>
                        <div className="vn-choice-body">
                          <div className="vn-choice-label">{ch.label}</div>
                          {ch.sublabel && (
                            <div className="vn-choice-sub">
                              {unlocked ? ch.sublabel : `🔒 ${ch.lockedHint}`}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Inline Codex Tooltip Popover */}
          {inspectedCodex && (
            <div
              className="vn-codex-popover"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vn-codex-popover-head">
                <span className="vn-badge">{inspectedCodex.category}</span>
                {inspectedCodex.ruby && <small>{inspectedCodex.ruby}</small>}
              </div>
              <h4>{inspectedCodex.term}</h4>
              <p>{inspectedCodex.fullDesc[0]}</p>
              <div className="vn-codex-popover-actions">
                <button
                  type="button"
                  onClick={() => {
                    const cid = inspectedCodex.id;
                    setActiveCodexPopup(null);
                    setModal({ kind: 'archive', tab: 'codex', codexId: cid });
                  }}
                >
                  천문 기록원에서 전문 열람 →
                </button>
                <button type="button" onClick={() => setActiveCodexPopup(null)}>
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* Chapter Intro Title Curtain */}
          {showChapterCard && currentBeat.chapterCard && (
            <div
              className="vn-chapter-curtain"
              onClick={(e) => {
                e.stopPropagation();
                audioEngine.playUiTick('confirm');
                setShowChapterCard(false);
              }}
            >
              <div className="vn-chapter-card-inner">
                <span className="vn-chap-part">{currentBeat.chapterCard.part}</span>
                <div className="vn-chap-ornament" />
                <h2 className="vn-chap-title">{currentBeat.chapterCard.title}</h2>
                <p className="vn-chap-sub">{currentBeat.chapterCard.subtitle}</p>
                <blockquote className="vn-chap-epigraph">
                  “{currentBeat.chapterCard.epigraph}”
                  <footer>{currentBeat.chapterCard.epigraphAuthor}</footer>
                </blockquote>
                <span className="vn-chap-prompt">클릭하여 장(章)을 엽니다 ▾</span>
              </div>
            </div>
          )}

          {/* Ending Finis Curtain */}
          {activeEnding && (
            <div
              className="vn-ending-curtain"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vn-ending-inner">
                <span className={`vn-ending-badge kind-${activeEnding.kind.split(' ')[0].toLowerCase()}`}>
                  {activeEnding.code}
                </span>
                <h2>{activeEnding.title}</h2>
                <p className="vn-ending-sub">{activeEnding.subtitle}</p>
                <div className="vn-chap-ornament" />
                <blockquote className="vn-ending-epigraph">
                  {activeEnding.epigraph}
                </blockquote>
                <div className="vn-ending-stats">
                  <span>최종 성핵 공명률: {stats.resonance}</span>
                  <span>·</span>
                  <span>기억보존율: {stats.memory}</span>
                  <span>·</span>
                  <span>도달 결말: {meta.unlockedEndings.length} / 4</span>
                </div>
                <div className="vn-ending-actions">
                  <button
                    type="button"
                    className="vn-title-btn primary"
                    onClick={() => {
                      audioEngine.playUiTick('confirm');
                      setActiveEnding(null);
                      setModal({ kind: 'flowchart' });
                    }}
                  >
                    <GitBranch size={16} />
                    <span className="ko">인과율 분기도에서 다른 결말 탐색</span>
                  </button>
                  <button
                    type="button"
                    className="vn-title-btn"
                    onClick={() => {
                      audioEngine.playUiTick('click');
                      setActiveEnding(null);
                      setScreen('title');
                    }}
                  >
                    <Home size={16} />
                    <span className="ko">타이틀 화면으로 복귀</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal?.kind === 'archive' && (
        <ArchiveModal
          meta={meta}
          initialTab={modal.tab}
          initialCodexId={modal.codexId}
          onClose={() => {
            setModal(null);
            if (screen === 'game') audioEngine.playBgm(stage.bgm);
            else audioEngine.playBgm('bgm_01_title');
          }}
        />
      )}

      {modal?.kind === 'flowchart' && (
        <FlowchartModal
          scenes={ALL_SCENES}
          currentSceneId={screen === 'game' ? currentScene.id : undefined}
          meta={meta}
          onJumpToScene={handleJumpFromFlowchart}
          onClose={() => setModal(null)}
        />
      )}

      {(modal?.kind === 'save' || modal?.kind === 'load') && (
        <SaveLoadModal
          mode={modal.kind}
          saves={saves}
          onSaveSlot={(slotId) => {
            const snap = buildSaveSnapshot(slotId, `ARCHIVE #${slotId}`);
            setSaves(writeSaveSlot(slotId, snap));
            showToast(`서고 #${String(slotId).padStart(2, '0')}에 현재 페이지를 기록했습니다.`);
          }}
          onLoadSlot={handleLoadSlot}
          onDeleteSlot={(slotId) => {
            setSaves(deleteSaveSlot(slotId));
            showToast(`서고 #${String(slotId).padStart(2, '0')} 기록을 삭제했습니다.`);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === 'backlog' && (
        <BacklogModal items={backlog} onClose={() => setModal(null)} />
      )}

      {/* Astronomical Toast Notification */}
      {toast && <div className="vn-toast">{toast}</div>}
    </div>
  );
};

export default App;

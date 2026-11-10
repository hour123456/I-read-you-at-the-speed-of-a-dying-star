export type BackgroundId =
  | 'bg_black'
  | 'bg_white'
  | 'bg_archive_zero'
  | 'bg_sirius_platform'
  | 'bg_clocktower_attic'
  | 'bg_arcadia_street'
  | 'bg_abyss_market'
  | 'bg_maglev_roof'
  | 'bg_astra_cathedral'
  | 'bg_spring_platform_dawn';

export type CGId =
  | 'cg_title_keyvisual'
  | 'cg_prologue_notebook'
  | 'cg_ch1_coffee_rain'
  | 'cg_ch2_harin_clash'
  | 'cg_ch3_memory_dive'
  | 'cg_ch4_laplace_climax'
  | 'cg_true_epilogue';

export type CharacterId = 'sera' | 'harin' | 'julius' | 'noel';

export type CharacterExpression =
  | 'normal'
  | 'smile'
  | 'sad'
  | 'combat'
  | 'vulnerable'
  | 'serious';

export type BGMId =
  | 'bgm_01_title'
  | 'bgm_02_archive'
  | 'bgm_03_starfall'
  | 'bgm_04_warm_rain'
  | 'bgm_05_abyss_noel'
  | 'bgm_06_atropos_blade'
  | 'bgm_07_laplace_cathedral'
  | 'bgm_08_thawing_dawn';

export type SFXType =
  | 'pen-scratch'
  | 'clock-chime'
  | 'star-fall'
  | 'glass-crack'
  | 'glass-shatter'
  | 'blade-draw'
  | 'blade-clash'
  | 'photon-slash'
  | 'heartbeat'
  | 'page-turn'
  | 'incinerate'
  | 'train-rumble'
  | 'door-knock'
  | 'coffee-pour'
  | 'terminal-beep'
  | 'resonance-pulse';

export type VFXPreset =
  | 'none'
  | 'stardust'
  | 'rain'
  | 'silver-rain'
  | 'embers'
  | 'snow-petals'
  | 'crimson-sparks'
  | 'memory-glitch'
  | 'slash-crimson'
  | 'slash-cyan'
  | 'chronicle-vignette';

export type CameraEffect =
  | 'still'
  | 'zoom-in'
  | 'zoom-deep'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'shake-sm'
  | 'shake-lg'
  | 'heartbeat-pulse'
  | 'dutch-left';

export type BgTransition =
  | 'fade'
  | 'slow-fade'
  | 'flash-white'
  | 'flash-crimson'
  | 'shatter'
  | 'instant';

export interface CharacterStageSlot {
  id: CharacterId;
  expr: CharacterExpression;
  pos: 'left' | 'center' | 'right' | 'far-left' | 'far-right';
  focus?: boolean;
  motion?: 'none' | 'step-in' | 'shake' | 'nod' | 'float';
}

export interface StatDelta {
  resonance?: number; // 세라와의 성핵 공명률
  memory?: number;    // 소각된 기억 보존율
  order?: number;     // 아스트라 질서/이성 수치
}

export interface ChoiceCondition {
  minResonance?: number;
  minMemory?: number;
  requiredFlag?: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  sublabel?: string;
  stats?: StatDelta;
  setFlags?: Record<string, boolean>;
  nextSceneId: string;
  condition?: ChoiceCondition;
  lockedHint?: string;
}

export type EndingId =
  | 'end_bad_01_erased'
  | 'end_paradox_glass_garden'
  | 'end_another_watchmen'
  | 'end_true_speed_star_dies';

export interface ChapterCardMeta {
  part: string;
  title: string;
  subtitle: string;
  epigraph: string;
  epigraphAuthor: string;
}

export interface EndingMeta {
  id: EndingId;
  code: string;
  kind: 'TRUE ENDING' | 'ANOTHER ENDING' | 'PARADOX ENDING' | 'BAD ENDING';
  title: string;
  subtitle: string;
  epigraph: string;
}

export interface ScriptBeat {
  id?: string;
  mode?: 'adv' | 'nvl' | 'cinematic';
  nvlClear?: boolean;
  speaker?: string;
  speakerTitle?: string;
  speakerColor?: string;
  text: string;
  bg?: BackgroundId;
  bgTransition?: BgTransition;
  cg?: CGId | null;
  chars?: CharacterStageSlot[];
  bgm?: BGMId | 'stop';
  sfx?: SFXType;
  vfx?: VFXPreset;
  camera?: CameraEffect;
  locationTag?: {
    date: string;
    place: string;
  };
  chapterCard?: ChapterCardMeta;
  choices?: ChoiceOption[];
  nextSceneId?: string;
  ending?: EndingMeta;
}

export interface SceneNode {
  id: string;
  chapter: string;
  title: string;
  summary: string;
  flowchartCol: number;
  flowchartRow: number;
  parentIds?: string[];
  isEnding?: boolean;
  endingKind?: 'true' | 'another' | 'paradox' | 'bad';
  beats: ScriptBeat[];
}

export interface GameStats {
  resonance: number;
  memory: number;
  order: number;
}

export interface SaveSlotData {
  slotId: number;
  label: string;
  savedAt: string;
  sceneId: string;
  beatIndex: number;
  chapterTitle: string;
  sceneTitle: string;
  previewText: string;
  bg: BackgroundId;
  cg: CGId | null;
  bgm: BGMId | 'stop';
  chars: CharacterStageSlot[];
  locationTag: { date: string; place: string };
  stats: GameStats;
  flags: Record<string, boolean>;
  visitedScenes: string[];
}

export interface PersistentMeta {
  unlockedCGs: CGId[];
  unlockedCodex: string[];
  unlockedEndings: EndingId[];
  visitedScenes: string[];
  readBeatKeys: string[];
}

export interface CodexEntry {
  id: string;
  category: '세계관·천문' | '기관·법률' | '인물록' | '현상·유물';
  term: string;
  ruby?: string;
  shortDesc: string;
  fullDesc: string[];
  quote?: string;
  unlockedByDefault?: boolean;
}

export interface BGMTrackMeta {
  id: BGMId;
  trackNo: string;
  title: string;
  englishTitle: string;
  tempo: string;
  keySignature: string;
  description: string;
  file: string;
}

export interface CGMeta {
  id: CGId;
  title: string;
  chapter: string;
  caption: string;
  file: string;
}

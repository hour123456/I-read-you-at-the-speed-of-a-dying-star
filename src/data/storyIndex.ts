import { SceneNode } from '../types/vn';
import { PROLOGUE_SCENES } from './chapters/prologue';
import { CHAPTER1_SCENES } from './chapters/chapter1';
import { CHAPTER2_SCENES } from './chapters/chapter2';
import { CHAPTER3_SCENES } from './chapters/chapter3';
import { CHAPTER4_SCENES } from './chapters/chapter4';
import { CHAPTER5_ENDING_SCENES } from './chapters/chapter5_endings';

export const ALL_SCENES: SceneNode[] = [
  ...PROLOGUE_SCENES,
  ...CHAPTER1_SCENES,
  ...CHAPTER2_SCENES,
  ...CHAPTER3_SCENES,
  ...CHAPTER4_SCENES,
  ...CHAPTER5_ENDING_SCENES,
];

export const SCENE_MAP: Record<string, SceneNode> = Object.fromEntries(
  ALL_SCENES.map((scene) => [scene.id, scene])
);

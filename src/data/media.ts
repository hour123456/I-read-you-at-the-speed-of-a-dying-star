import { BackgroundId, BGMTrackMeta, CGMeta, CharacterExpression, CharacterId } from '../types/vn';

export const BACKGROUND_FILES: Record<BackgroundId, string> = {
  bg_black: '',
  bg_white: '',
  bg_archive_zero: './assets/images/bg/bg_archive_zero.jpg',
  bg_sirius_platform: './assets/images/bg/bg_sirius_platform.jpg',
  bg_clocktower_attic: './assets/images/bg/bg_clocktower_attic.jpg',
  bg_arcadia_street: './assets/images/bg/bg_arcadia_street.jpg',
  bg_abyss_market: './assets/images/bg/bg_abyss_market.jpg',
  bg_maglev_roof: './assets/images/bg/bg_maglev_roof.jpg',
  bg_astra_cathedral: './assets/images/bg/bg_astra_cathedral.jpg',
  bg_spring_platform_dawn: './assets/images/bg/bg_spring_platform_dawn.jpg',
};

export const CHARACTER_META: Record<
  CharacterId,
  {
    name: string;
    title: string;
    accent: string;
    sprites: Partial<Record<CharacterExpression, string>>;
  }
> = {
  sera: {
    name: '세라',
    title: '성해의 소녀 · ASTRA-00',
    accent: '#7dd3fc',
    sprites: {
      normal: './assets/images/chars/sera_normal.png',
      smile: './assets/images/chars/sera_smile.png',
      sad: './assets/images/chars/sera_sad.png',
      serious: './assets/images/chars/sera_normal.png',
    },
  },
  harin: {
    name: '연하린',
    title: '천문법원 제1집행관',
    accent: '#fb7185',
    sprites: {
      normal: './assets/images/chars/harin_normal.png',
      combat: './assets/images/chars/harin_combat.png',
      vulnerable: './assets/images/chars/harin_vulnerable.png',
      serious: './assets/images/chars/harin_combat.png',
      sad: './assets/images/chars/harin_vulnerable.png',
    },
  },
  julius: {
    name: '유리우스',
    title: '원로원 수석 편찬관',
    accent: '#fcd34d',
    sprites: {
      normal: './assets/images/chars/julius_normal.png',
      smile: './assets/images/chars/julius_normal.png',
      serious: './assets/images/chars/julius_serious.png',
    },
  },
  noel: {
    name: '노엘',
    title: '어비스 공방 기공사',
    accent: '#5eead4',
    sprites: {
      normal: './assets/images/chars/noel_normal.png',
      smile: './assets/images/chars/noel_normal.png',
      serious: './assets/images/chars/noel_serious.png',
      sad: './assets/images/chars/noel_serious.png',
    },
  },
};

export const CG_LIST: CGMeta[] = [
  {
    id: 'cg_title_keyvisual',
    title: '창백한 테 아래의 관측자',
    chapter: 'KEY VISUAL · PROLOGUE',
    caption: '347년 동안 얼어붙은 밤하늘 아래, 폐역 시리우스 플랫폼에 내려앉은 은빛 성진의 소녀.',
    file: './assets/images/cg/cg_title_keyvisual.jpg',
  },
  {
    id: 'cg_prologue_notebook',
    title: '여덟 번째 공범자에게',
    chapter: 'PROLOGUE · 00:00의 낙성',
    caption: '유리 파편과 빗물 속에서 그녀가 내민 것은, 아직 내가 쓰지 않은 미래의 필체로 적힌 수첩이었다.',
    file: './assets/images/cg/cg_prologue_notebook.jpg',
  },
  {
    id: 'cg_ch1_coffee_rain',
    title: '시계탑 다락방의 온도',
    chapter: 'CHAPTER I · 백야에 내리는 은빛 비',
    caption: '우주가 멈춘 세계에서 처음 맛본 캔커피와 머그잔의 온기. 소녀는 김이 피어오르는 것을 기적처럼 바라보았다.',
    file: './assets/images/cg/cg_ch1_coffee_rain.jpg',
  },
  {
    id: 'cg_ch2_harin_clash',
    title: '단죄의 검 아트로포스',
    chapter: 'CHAPTER II · 방주 밑바닥의 태엽장치',
    caption: '은빛 폭우를 가르며 질주하는 자기부상열차 위, 진홍빛 광자 검섬과 푸른 성핵 결계가 정면으로 격돌한다.',
    file: './assets/images/cg/cg_ch2_harin_clash.jpg',
  },
  {
    id: 'cg_ch3_memory_dive',
    title: '일곱 번의 장례식',
    chapter: 'CHAPTER III · 유리 천구의 장례식',
    caption: '타오르는 원고지의 바다 한가운데서 거꾸로 솟구치던 은빛 눈물. 우리가 잊었던 여섯 번의 이별.',
    file: './assets/images/cg/cg_ch3_memory_dive.jpg',
  },
  {
    id: 'cg_ch4_laplace_climax',
    title: '천구 파쇄 (天球破碎)',
    chapter: 'CHAPTER IV · 라플라스의 심장',
    caption: '만년필 끝에서 쏘아 올린 마지막 문장이 유리 천구를 꿰뚫고, 마침내 멈춰 있던 별들의 시간이 다시 흐른다.',
    file: './assets/images/cg/cg_ch4_laplace_climax.jpg',
  },
  {
    id: 'cg_true_epilogue',
    title: '별이 죽는 속도로 너를 읽는다',
    chapter: 'TRUE ENDING · 첫 번째 봄의 페이지',
    caption: '얼음이 녹은 선로 위로 진짜 아침 해가 떠오르던 날, 다시 만난 네가 눈물 젖은 얼굴로 웃었다.',
    file: './assets/images/cg/cg_true_epilogue.jpg',
  },
];

export const CG_MAP: Record<string, CGMeta> = Object.fromEntries(
  CG_LIST.map((cg) => [cg.id, cg])
);

export const BGM_LIST: BGMTrackMeta[] = [
  {
    id: 'bgm_01_title',
    trackNo: '01',
    title: '0.0004Hz의 자장가',
    englishTitle: 'Lullaby of 0.0004Hz',
    tempo: '72 BPM · Andante Cantabile',
    keySignature: 'F# Minor / A Major',
    description: '메인 테마. 펠트 피아노와 첼레스타 오르골, 현악 4중주가 동결된 밤하늘의 고요한 맥동을 그린다.',
    file: './assets/bgm/bgm_01_title.wav',
  },
  {
    id: 'bgm_02_archive',
    trackNo: '02',
    title: '제0기록실의 만년필',
    englishTitle: 'Fountain Pen in Archive Zero',
    tempo: '64 BPM · Adagio Nocturne',
    keySignature: 'D Minor',
    description: '지하 120미터 폐기문서과의 테마. 회중시계의 초침 소리와 고독한 피아노 녹턴이 잊힌 이름들을 위로한다.',
    file: './assets/bgm/bgm_02_archive.wav',
  },
  {
    id: 'bgm_03_starfall',
    trackNo: '03',
    title: '백야를 가르는 낙성',
    englishTitle: 'Starfall Across White Night',
    tempo: '112 BPM · Allegro Misterioso',
    keySignature: 'C Minor',
    description: '347년 만에 움직인 별과 추락 현장의 긴장감. 유리 결정 같은 아르페지오가 미지의 조우를 알린다.',
    file: './assets/bgm/bgm_03_starfall.wav',
  },
  {
    id: 'bgm_04_warm_rain',
    trackNo: '04',
    title: '시계탑 다락방과 커피의 온도',
    englishTitle: 'Attic Rain & Warm Coffee',
    tempo: '76 BPM · Moderato Teneramente',
    keySignature: 'Ab Major / C Minor',
    description: '빗소리가 스미는 다락방 은신처의 일상 테마. 차가운 도시 속에서 잠시 허락된 다정한 온기.',
    file: './assets/bgm/bgm_04_warm_rain.wav',
  },
  {
    id: 'bgm_05_abyss_noel',
    trackNo: '05',
    title: '방주 밑바닥의 태엽 토끼',
    englishTitle: 'Clockwork Rabbit of the Abyss',
    tempo: '98 BPM · Cyber-Chill Groove',
    keySignature: 'A Dorian',
    description: '어비스 마켓과 노엘 공방의 테마. 진공관 모니터와 아날로그 태엽이 경쾌하게 맞물리는 지하 세계의 리듬.',
    file: './assets/bgm/bgm_05_abyss_noel.wav',
  },
  {
    id: 'bgm_06_atropos_blade',
    trackNo: '06',
    title: '단죄의 검 아트로포스',
    englishTitle: 'Blade of Atropos',
    tempo: '146 BPM · Presto Agitato',
    keySignature: 'E Phrygian / E Minor',
    description: '제1집행관 연하린과의 교전 테마. 질주하는 열차 위에서 부딪히는 검극과 절박한 신념의 충돌.',
    file: './assets/bgm/bgm_06_atropos_blade.wav',
  },
  {
    id: 'bgm_07_laplace_cathedral',
    trackNo: '07',
    title: '라플라스의 심장',
    englishTitle: 'Heart of Laplace',
    tempo: '70 BPM · Largo Solenne',
    keySignature: 'G# Minor',
    description: '성층권 대성당과 유리우스 본 에덴의 테마. 장엄한 파이프 오르간과 챔발로가 영원한 방주의 교리를 노래한다.',
    file: './assets/bgm/bgm_07_laplace_cathedral.wav',
  },
  {
    id: 'bgm_08_thawing_dawn',
    trackNo: '08',
    title: '별이 죽는 속도로 너를 읽는다',
    englishTitle: 'At the Speed a Star Dies',
    tempo: '78 BPM · Maestoso Espressivo',
    keySignature: 'A Major',
    description: '클라이맥스 및 트루 엔딩 테마. 단조로 갇혀 있던 메인 모티프가 찬란한 장조로 해방되며 첫 새벽을 연다.',
    file: './assets/bgm/bgm_08_thawing_dawn.wav',
  },
];

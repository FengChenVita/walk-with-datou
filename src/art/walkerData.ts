/**
 * The two human companions (Mei & An) and five moments from their shared life
 * with Datou. Their clothes are practical, soft, and activity-led: field notes,
 * workshop mornings, night walks, slow Sundays, and rain shelter.
 *
 * Geometry lives in the HumanRig; here we keep only identity (skin, hair,
 * personality stance) and wardrobe (top / bottom / shoes / accessories).
 */

import { WALKER as W } from './palette';

export type HumanCharId = 'mei' | 'an';
export type CharId = HumanCharId | 'nailong';
export type DirId = 'scout' | 'pajama' | 'cape' | 'picnic' | 'rain';
export type AgeId = 'kid' | 'teen' | 'adult';

export const AGE_ORDER: AgeId[] = ['kid', 'teen', 'adult'];

/**
 * Per-age figure metrics. The cast keeps a gently stylised animation silhouette
 * while moving toward believable human proportions as they age: roughly
 * 4.5 heads tall as kids, 5.5 as teens, and 6.5 as adults.
 */
export interface AgeMetrics {
  hrx: number;
  hry: number;
  /** Visible neck length between chin and collar — kids stay chibi, adults stretch. */
  neckL: number;
  torsoH: number;
  shW: number;
  hipW: number;
  legL: number;
  armL: number;
  limbW: number;
  legW: number;
}

export const AGE_M: Record<AgeId, AgeMetrics> = {
  kid: { hrx: 32, hry: 33, neckL: 3.5, torsoH: 45, shW: 45, hipW: 39, legL: 50, armL: 37, limbW: 8.2, legW: 9.5 },
  teen: { hrx: 28.5, hry: 30, neckL: 5, torsoH: 60, shW: 49, hipW: 42, legL: 75, armL: 55, limbW: 7.8, legW: 9 },
  adult: { hrx: 26, hry: 29, neckL: 6, torsoH: 70, shW: 53, hipW: 44, legL: 92, armL: 66, limbW: 8, legW: 9.5 },
};

export interface Cast {
  id: HumanCharId;
  name: string;
  skin: string;
  hair: string;
}

export const CAST: Record<HumanCharId, Cast> = {
  mei: { id: 'mei', name: 'Mei', skin: W.skinMei, hair: W.hairMei },
  an: { id: 'an', name: 'An', skin: W.skinAn, hair: W.hairAn },
};

export interface TopSpec {
  type: 'tee' | 'dress' | 'pjTop' | 'raincoat' | 'overshirt';
  color: string;
  sleeves: 'short' | 'long';
  stripes?: string;
  underColor?: string;
}

export interface BottomSpec {
  type: 'none' | 'pants' | 'pjPants' | 'overalls' | 'overallShorts' | 'shorts' | 'pinafore';
  color?: string;
}

export interface ShoeSpec {
  boot: boolean;
  color: string;
}

export type Extra =
  | 'satchel'
  | 'neckerchief'
  | 'bucketHat'
  | 'strawHat'
  | 'nightcap'
  | 'sleepMask'
  | 'cape'
  | 'hood';

export interface Fit {
  top: TopSpec;
  bottom: BottomSpec;
  socks: string | null;
  shoes: ShoeSpec;
  extras: Extra[];
  extraColors?: Partial<Record<'satchel' | 'scarf' | 'hat' | 'band' | 'cape' | 'mask', string>>;
}

export interface Direction {
  title: string;
  fits: Record<HumanCharId, Fit>;
}

export const DIRECTION_ORDER: DirId[] = ['scout', 'pajama', 'cape', 'picnic', 'rain'];

export const DIRECTIONS: Record<DirId, Direction> = {
  scout: {
    title: 'Field Notes',
    fits: {
      mei: {
        top: { type: 'tee', color: W.cream, sleeves: 'long' },
        bottom: { type: 'overallShorts', color: W.sage },
        socks: W.sageD,
        shoes: { boot: true, color: W.leather },
        extras: ['satchel'],
        extraColors: { satchel: W.leatherLight },
      },
      an: {
        top: { type: 'overshirt', color: W.creamD, underColor: W.sageD, sleeves: 'long' },
        bottom: { type: 'pants', color: W.sageD },
        socks: null,
        shoes: { boot: true, color: W.leather },
        extras: ['satchel'],
        extraColors: { satchel: W.leatherLight },
      },
    },
  },
  pajama: {
    title: 'Workshop Morning',
    fits: {
      mei: {
        top: { type: 'pjTop', color: W.creamD, sleeves: 'long' },
        bottom: { type: 'pjPants', color: W.sageL },
        socks: null,
        shoes: { boot: false, color: W.leather },
        extras: ['sleepMask'],
        extraColors: { mask: W.sage },
      },
      an: {
        top: { type: 'pjTop', color: W.sageL, sleeves: 'long' },
        bottom: { type: 'pjPants', color: W.creamD },
        socks: null,
        shoes: { boot: false, color: W.leather },
        extras: ['nightcap'],
        extraColors: { hat: W.creamD },
      },
    },
  },
  cape: {
    title: 'Night Walk',
    fits: {
      mei: {
        top: { type: 'overshirt', color: W.sageD, underColor: W.cream, sleeves: 'long' },
        bottom: { type: 'pants', color: W.charcoal },
        socks: null,
        shoes: { boot: true, color: W.leather },
        extras: ['satchel', 'neckerchief'],
        extraColors: { satchel: W.leather, scarf: W.signal },
      },
      an: {
        top: { type: 'overshirt', color: W.charcoal, underColor: W.creamD, sleeves: 'long' },
        bottom: { type: 'pants', color: W.sageD },
        socks: null,
        shoes: { boot: true, color: W.leather },
        extras: ['satchel', 'neckerchief'],
        extraColors: { satchel: W.leatherLight, scarf: W.signal },
      },
    },
  },
  picnic: {
    title: 'Slow Sunday',
    fits: {
      mei: {
        top: { type: 'tee', color: W.cream, sleeves: 'long' },
        bottom: { type: 'pinafore', color: W.sageL },
        socks: null,
        shoes: { boot: false, color: W.leather },
        extras: ['strawHat'],
        extraColors: { band: W.signal },
      },
      an: {
        top: { type: 'overshirt', color: W.creamD, underColor: W.sage, sleeves: 'long' },
        bottom: { type: 'pants', color: W.sageD },
        socks: null,
        shoes: { boot: false, color: W.leather },
        extras: ['strawHat'],
        extraColors: { band: W.signal },
      },
    },
  },
  rain: {
    title: 'Rain Shelter',
    fits: {
      mei: {
        top: { type: 'raincoat', color: W.sage, sleeves: 'long' },
        bottom: { type: 'none' },
        socks: null,
        shoes: { boot: true, color: W.leather },
        extras: ['hood'],
      },
      an: {
        top: { type: 'raincoat', color: W.creamD, sleeves: 'long' },
        bottom: { type: 'none' },
        socks: null,
        shoes: { boot: true, color: W.leather },
        extras: ['hood'],
      },
    },
  },
};

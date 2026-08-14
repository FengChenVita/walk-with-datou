/**
 * Datou's human companions as cutout plates. Their identity comes from how
 * they attend to him: practical maker clothes, listening faces, field-note
 * bags, and one shared amber signal motif. Three plates feed the HumanRig:
 *
 *   head  — skin · per-character hair & face · headgear        (bottom-anchored)
 *   torso — outfit top · over-torso bottom · arms · extras     (bottom-anchored)
 *   leg   — one leg with sock + shoe, drawn twice by the rig    (top-anchored)
 *
 * Head and torso come in two VIEWS: 'front' (facing the camera) and 'side'
 * (a true profile facing +x; the rig mirrors it for leftward walking). Plates
 * of both views share the same figure-frame vertical spans, so one
 * plateLayout() serves both. All art is deterministic per seed, keyed to
 * character + outfit + age. Geometry is derived per call from AGE_M so kid /
 * teen / adult read as the same cast — head stays big, limbs stretch.
 */

import { INK, WALKER as W } from './palette';
import { dot, limb, wEllipse, wShape, type Pen, type Pt } from './wobbleInk';
import { createCanvas, ctx2d } from './textures';
import {
  AGE_M,
  CAST,
  DIRECTIONS,
  type AgeId,
  type HumanCharId,
  type DirId,
  type Fit,
} from './walkerData';
import type { PropSprite } from './props';

/** Which way the plate faces — 'side' is a profile drawn facing +x. */
export type ViewId = 'front' | 'side';

/** A torso plate plus the leash-hand anchor as a 0..1 fraction of the plate. */
export interface TorsoSprite extends PropSprite {
  /** Leash-hand position within the plate: u = x fraction, v = y fraction (top→bottom). */
  hand: { u: number; v: number };
}

// Human plates use clean animation-cel contours. Datou and the world retain
// their handmade wobble, but the people need stable anatomy and calm linework.
const PEN: Pen = { ink: INK.line, sw: 1.45, amp: 0 };

const ARM_OUT = 8;

/** Resolved figure geometry for one age, in the shared ~210-wide frame. */
interface Geo {
  cx: number;
  ground: number;
  hipY: number;
  torsoTop: number;
  hcy: number;
  m: (typeof AGE_M)[AgeId];
}

const CX = 110;
const GROUND = 292;

function makeGeo(age: AgeId): Geo {
  const m = AGE_M[age];
  const hipY = GROUND - m.legL;
  const torsoTop = hipY - m.torsoH;
  // The head floats neckL above the collar so the drawn neck actually shows.
  const hcy = torsoTop - m.hry - m.neckL;
  return { cx: CX, ground: GROUND, hipY, torsoTop, hcy, m };
}

function sprite(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = createCanvas(w, h);
  return { c, g: ctx2d(c) };
}

/** Small ellipse-as-points helper for stroking pom/button outlines. */
function ellipseTip(cx: number, cy: number, r: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

// =====================================================================
//  HEAD PLATE  — skin, hair (per character), face (personality), hat
// =====================================================================

function signalClip(g: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  dot(g, x - 3.5, y + 3.5, 1.8, W.signal);
  wShape(g, PEN, [[x - 1, y + 3], [x + 1, y], [x - 1, y - 3]], {
    sw: 2,
    stroke: W.signal,
    seed,
  });
  wShape(g, PEN, [[x + 3, y + 5], [x + 6, y], [x + 3, y - 5]], {
    sw: 1.8,
    stroke: W.signal,
    seed: seed + 1,
  });
}

function faceBase(
  g: CanvasRenderingContext2D,
  geo: Geo,
  skin: string,
  side: boolean,
  seed: number,
): void {
  const { cx, hcy, m } = geo;
  const pts: Pt[] = side
    ? [
        [cx - m.hrx * 0.92, hcy - m.hry * 0.34],
        [cx - m.hrx * 0.55, hcy - m.hry * 0.86],
        [cx + m.hrx * 0.08, hcy - m.hry],
        [cx + m.hrx * 0.7, hcy - m.hry * 0.66],
        [cx + m.hrx * 0.9, hcy - m.hry * 0.18],
        [cx + m.hrx * 1.1, hcy + m.hry * 0.08],
        [cx + m.hrx * 0.91, hcy + m.hry * 0.28],
        [cx + m.hrx * 0.72, hcy + m.hry * 0.58],
        [cx + m.hrx * 0.38, hcy + m.hry * 0.86],
        [cx - m.hrx * 0.18, hcy + m.hry * 0.92],
        [cx - m.hrx * 0.72, hcy + m.hry * 0.58],
        [cx - m.hrx, hcy + m.hry * 0.06],
      ]
    : [
        [cx, hcy - m.hry],
        [cx + m.hrx * 0.72, hcy - m.hry * 0.8],
        [cx + m.hrx, hcy - m.hry * 0.2],
        [cx + m.hrx * 0.9, hcy + m.hry * 0.42],
        [cx + m.hrx * 0.5, hcy + m.hry * 0.8],
        [cx, hcy + m.hry * 0.98],
        [cx - m.hrx * 0.5, hcy + m.hry * 0.8],
        [cx - m.hrx * 0.9, hcy + m.hry * 0.42],
        [cx - m.hrx, hcy - m.hry * 0.2],
        [cx - m.hrx * 0.72, hcy - m.hry * 0.8],
      ];
  wShape(g, PEN, pts, { closed: true, step: 7, fill: skin, seed });

  g.save();
  g.globalAlpha = 0.1;
  g.fillStyle = '#9a6f5a';
  g.beginPath();
  if (side) {
    g.moveTo(cx - m.hrx * 0.15, hcy + m.hry * 0.78);
    g.quadraticCurveTo(cx + m.hrx * 0.48, hcy + m.hry * 0.88, cx + m.hrx * 0.72, hcy + m.hry * 0.5);
    g.lineTo(cx + m.hrx * 0.3, hcy + m.hry * 0.34);
  } else {
    g.moveTo(cx, hcy + m.hry * 0.94);
    g.quadraticCurveTo(cx + m.hrx * 0.72, hcy + m.hry * 0.76, cx + m.hrx * 0.86, hcy + m.hry * 0.3);
    g.quadraticCurveTo(cx + m.hrx * 0.45, hcy + m.hry * 0.52, cx, hcy + m.hry * 0.48);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function hairHighlight(g: CanvasRenderingContext2D, pts: Pt[], seed: number): void {
  g.save();
  g.globalAlpha = 0.2;
  wShape(g, PEN, pts, { sw: 1.1, stroke: '#fff7e8', seed });
  g.restore();
}

function hairStrand(g: CanvasRenderingContext2D, pts: Pt[], seed: number): void {
  g.save();
  g.globalAlpha = 0.58;
  wShape(g, PEN, pts, { sw: 0.9, stroke: INK.soft, seed });
  g.restore();
}

/** Mei's practical asymmetric bob sits behind the face and turns under. */
function meiHairBehind(g: CanvasRenderingContext2D, geo: Geo, hair: string, seed: number): void {
  const { cx, hcy, m } = geo;
  wShape(g, PEN, [
    [cx - m.hrx * 1.04, hcy - m.hry * 0.36],
    [cx - m.hrx * 0.72, hcy - m.hry * 0.95],
    [cx, hcy - m.hry * 1.1],
    [cx + m.hrx * 0.8, hcy - m.hry * 0.82],
    [cx + m.hrx * 1.05, hcy - m.hry * 0.18],
    [cx + m.hrx * 0.92, hcy + m.hry * 0.7],
    [cx + m.hrx * 0.45, hcy + m.hry * 0.92],
    [cx - m.hrx * 0.68, hcy + m.hry * 0.82],
    [cx - m.hrx * 1.04, hcy + m.hry * 0.34],
  ], { closed: true, step: 9, fill: hair, seed });
}

/** Mei front hair — side part, clear eyes, one Datou-amber signal clip. */
function meiHairFront(g: CanvasRenderingContext2D, geo: Geo, hair: string, seed: number): void {
  const { cx, hcy, m } = geo;
  const pts: Pt[] = [
    [cx - m.hrx * 1.02, hcy + m.hry * 0.02],
    [cx - m.hrx * 0.92, hcy - m.hry * 0.55],
    [cx - m.hrx * 0.42, hcy - m.hry * 1.02],
    [cx + m.hrx * 0.1, hcy - m.hry * 1.08],
    [cx + m.hrx * 0.62, hcy - m.hry * 0.92],
    [cx + m.hrx * 0.96, hcy - m.hry * 0.42],
    [cx + m.hrx * 0.96, hcy + m.hry * 0.06],
    [cx + m.hrx * 0.62, hcy - m.hry * 0.18],
    [cx + m.hrx * 0.22, hcy - m.hry * 0.34],
    [cx - m.hrx * 0.2, hcy - m.hry * 0.04],
    [cx - m.hrx * 0.62, hcy + m.hry * 0.1],
  ];
  wShape(g, PEN, pts, { closed: true, step: 9, fill: hair, seed });
  hairHighlight(g, [
    [cx - m.hrx * 0.42, hcy - m.hry * 0.84],
    [cx - m.hrx * 0.1, hcy - m.hry * 0.98],
    [cx + m.hrx * 0.24, hcy - m.hry * 0.9],
  ], seed + 4);
  hairStrand(g, [
    [cx - m.hrx * 0.28, hcy - m.hry * 0.9],
    [cx - m.hrx * 0.12, hcy - m.hry * 0.58],
    [cx + m.hrx * 0.02, hcy - m.hry * 0.3],
  ], seed + 5);
  signalClip(g, cx - m.hrx * 0.66, hcy - m.hry * 0.52, seed + 11);
}

/** An front hair — soft, slightly unruly waves with a rounded silhouette. */
function anHairFront(g: CanvasRenderingContext2D, geo: Geo, hair: string, seed: number): void {
  const { cx, hcy, m } = geo;
  const pts: Pt[] = [
    [cx - m.hrx * 1.02, hcy + m.hry * 0.08],
    [cx - m.hrx * 0.98, hcy - m.hry * 0.46],
    [cx - m.hrx * 0.68, hcy - m.hry * 0.86],
    [cx - m.hrx * 0.26, hcy - m.hry * 1.06],
    [cx + m.hrx * 0.16, hcy - m.hry * 1.0],
    [cx + m.hrx * 0.48, hcy - m.hry * 1.08],
    [cx + m.hrx * 0.82, hcy - m.hry * 0.76],
    [cx + m.hrx * 1.02, hcy - m.hry * 0.28],
    [cx + m.hrx * 0.96, hcy + m.hry * 0.08],
    [cx + m.hrx * 0.66, hcy - m.hry * 0.04],
    [cx + m.hrx * 0.38, hcy - m.hry * 0.28],
    [cx + m.hrx * 0.08, hcy - m.hry * 0.08],
    [cx - m.hrx * 0.22, hcy - m.hry * 0.3],
    [cx - m.hrx * 0.52, hcy - m.hry * 0.04],
    [cx - m.hrx * 0.76, hcy + m.hry * 0.06],
  ];
  wShape(g, PEN, pts, { closed: true, step: 8, fill: hair, seed });
  hairHighlight(g, [
    [cx - m.hrx * 0.48, hcy - m.hry * 0.82],
    [cx - m.hrx * 0.12, hcy - m.hry * 0.96],
    [cx + m.hrx * 0.2, hcy - m.hry * 0.88],
  ], seed + 4);
  hairStrand(g, [
    [cx - m.hrx * 0.32, hcy - m.hry * 0.92],
    [cx - m.hrx * 0.12, hcy - m.hry * 0.66],
    [cx + m.hrx * 0.04, hcy - m.hry * 0.3],
  ], seed + 5);
  hairStrand(g, [
    [cx + m.hrx * 0.2, hcy - m.hry * 0.9],
    [cx + m.hrx * 0.35, hcy - m.hry * 0.65],
    [cx + m.hrx * 0.48, hcy - m.hry * 0.35],
  ], seed + 6);
}

/** Both faces look ready to listen; temperament, not gender, differentiates them. */
function faceFront(g: CanvasRenderingContext2D, geo: Geo, isMei: boolean, seed: number): void {
  const { cx, hcy, m } = geo;
  const ey = hcy + m.hry * 0.02;
  const ex = m.hrx * 0.38;
  const my = hcy + m.hry * 0.5;
  for (const x of [cx - ex, cx + ex]) {
    g.fillStyle = INK.line;
    g.beginPath();
    g.ellipse(x, ey, isMei ? 2.7 : 2.5, isMei ? 4.2 : 3.8, 0, 0, Math.PI * 2);
    g.fill();
    dot(g, x - 0.8, ey - 1.5, 0.85, W.white);
    dot(g, x + 0.65, ey + 1.35, 0.4, W.white, 0.75);
  }
  wShape(g, PEN, [[cx - ex - 3.5, ey - 7.8], [cx - ex + 3.2, ey - 8.4]], { sw: 1.05, seed });
  wShape(g, PEN, [[cx + ex - 3.2, ey - 8.4], [cx + ex + 3.5, ey - 7.8]], { sw: 1.05, seed: seed + 1 });
  wShape(g, PEN, [[cx - 0.7, hcy + m.hry * 0.25], [cx + 0.4, hcy + m.hry * 0.29]], {
    sw: 0.9,
    stroke: INK.soft,
    seed: seed + 3,
  });
  const mouth = isMei
    ? [[cx - 3.2, my], [cx, my + 2], [cx + 3.2, my]] as Pt[]
    : [[cx - 3.5, my + 0.3], [cx + 0.2, my + 1.7], [cx + 4, my - 0.2]] as Pt[];
  wShape(g, PEN, mouth, { sw: 1.2, seed: seed + 2 });
  dot(g, cx - m.hrx * 0.58, hcy + m.hry * 0.37, m.hrx * 0.12, W.blush, 0.22);
  dot(g, cx + m.hrx * 0.58, hcy + m.hry * 0.37, m.hrx * 0.12, W.blush, 0.22);
}

/** Mei profile hair — a tucked bob, longer at the cheek than the nape. */
function meiHairSide(g: CanvasRenderingContext2D, geo: Geo, hair: string, seed: number): void {
  const { cx, hcy, m } = geo;
  const pts: Pt[] = [
    [cx + m.hrx * 0.94, hcy - m.hry * 0.38],
    [cx + m.hrx * 0.55, hcy - m.hry * 0.96],
    [cx - m.hrx * 0.08, hcy - m.hry * 1.08],
    [cx - m.hrx * 0.72, hcy - m.hry * 0.84],
    [cx - m.hrx * 1.04, hcy - m.hry * 0.22],
    [cx - m.hrx * 0.96, hcy + m.hry * 0.65],
    [cx - m.hrx * 0.4, hcy + m.hry * 0.82],
    [cx - m.hrx * 0.28, hcy + m.hry * 0.12],
    [cx + m.hrx * 0.2, hcy - m.hry * 0.28],
    [cx + m.hrx * 0.62, hcy - m.hry * 0.12],
  ];
  wShape(g, PEN, pts, { closed: true, step: 9, fill: hair, seed });
  hairHighlight(g, [
    [cx - m.hrx * 0.24, hcy - m.hry * 0.9],
    [cx + m.hrx * 0.18, hcy - m.hry * 0.92],
    [cx + m.hrx * 0.48, hcy - m.hry * 0.72],
  ], seed + 4);
  hairStrand(g, [
    [cx + m.hrx * 0.1, hcy - m.hry * 0.88],
    [cx + m.hrx * 0.3, hcy - m.hry * 0.58],
    [cx + m.hrx * 0.44, hcy - m.hry * 0.3],
  ], seed + 5);
  signalClip(g, cx + m.hrx * 0.3, hcy - m.hry * 0.58, seed + 11);
}

/** An profile hair — soft waves with a little volume at crown and nape. */
function anHairSide(g: CanvasRenderingContext2D, geo: Geo, hair: string, seed: number): void {
  const { cx, hcy, m } = geo;
  const pts: Pt[] = [
    [cx + m.hrx * 1.0, hcy - m.hry * 0.2],
    [cx + m.hrx * 0.76, hcy - m.hry * 0.76],
    [cx + m.hrx * 0.32, hcy - m.hry * 1.02],
    [cx - m.hrx * 0.18, hcy - m.hry * 1.08],
    [cx - m.hrx * 0.7, hcy - m.hry * 0.78],
    [cx - m.hrx * 1.02, hcy - m.hry * 0.24],
    [cx - m.hrx * 0.96, hcy + m.hry * 0.38],
    [cx - m.hrx * 0.62, hcy + m.hry * 0.32],
    [cx - m.hrx * 0.34, hcy - m.hry * 0.18],
    [cx + m.hrx * 0.04, hcy - m.hry * 0.38],
    [cx + m.hrx * 0.42, hcy - m.hry * 0.12],
    [cx + m.hrx * 0.68, hcy - m.hry * 0.38],
  ];
  wShape(g, PEN, pts, { closed: true, step: 8, fill: hair, seed });
  hairHighlight(g, [
    [cx - m.hrx * 0.22, hcy - m.hry * 0.92],
    [cx + m.hrx * 0.18, hcy - m.hry * 0.9],
    [cx + m.hrx * 0.48, hcy - m.hry * 0.68],
  ], seed + 4);
  hairStrand(g, [
    [cx + m.hrx * 0.04, hcy - m.hry * 0.9],
    [cx + m.hrx * 0.24, hcy - m.hry * 0.6],
    [cx + m.hrx * 0.38, hcy - m.hry * 0.34],
  ], seed + 5);
}

/** Profile face — one readable anime eye and a restrained expression. */
function faceSide(g: CanvasRenderingContext2D, geo: Geo, isMei: boolean, seed: number): void {
  const { cx, hcy, m } = geo;
  const ey = hcy + m.hry * 0.02;
  const ex = cx + m.hrx * 0.52;
  const my = hcy + m.hry * 0.5;
  g.fillStyle = INK.line;
  g.beginPath();
  g.ellipse(ex, ey, isMei ? 2.7 : 2.5, isMei ? 4.2 : 3.8, 0, 0, Math.PI * 2);
  g.fill();
  dot(g, ex - 0.7, ey - 1.4, 0.8, W.white);
  wShape(g, PEN, [[ex - 3.5, ey - 7.8], [ex + 3, ey - 8.3]], { sw: 1.05, seed });
  const mouth = isMei
    ? [[cx + m.hrx * 0.6, my], [cx + m.hrx * 0.75, my + 1.8], [cx + m.hrx * 0.88, my + 0.2]] as Pt[]
    : [[cx + m.hrx * 0.61, my + 0.6], [cx + m.hrx * 0.76, my + 1.4], [cx + m.hrx * 0.9, my - 0.1]] as Pt[];
  wShape(g, PEN, mouth, { sw: 1.15, seed: seed + 2 });
  dot(g, cx + m.hrx * 0.34, hcy + m.hry * 0.37, m.hrx * 0.12, W.blush, 0.22);
}

function pawPatch(g: CanvasRenderingContext2D, x: number, y: number, s = 1): void {
  g.fillStyle = W.cream;
  for (const [dx, dy, r] of [[0, 1.5, 2.6], [-2.6, -1.6, 1.2], [0, -2.4, 1.2], [2.6, -1.6, 1.2]] as const) {
    g.beginPath();
    g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    g.fill();
  }
}

/** Headgear — bucket / straw hat, nightcap, sleep mask. `side` = profile view. */
function headgear(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, seed: number, side = false): void {
  const { cx, hcy, m } = geo;
  const ec = fit.extraColors ?? {};
  if (fit.extras.includes('bucketHat')) {
    const col = ec.hat ?? W.sage;
    const by = hcy - m.hry * 0.48;
    wShape(g, PEN, [
      [cx - m.hrx * 0.78, by - 8], [cx - m.hrx * 0.5, hcy - m.hry * 1.18],
      [cx + m.hrx * 0.5, hcy - m.hry * 1.18], [cx + m.hrx * 0.78, by - 8],
      [cx + m.hrx * 1.16, by + 2], [cx + m.hrx * 1.05, by + 8],
      [cx - m.hrx * 1.05, by + 8], [cx - m.hrx * 1.16, by + 2],
    ], { closed: true, step: 8, fill: col, seed });
    pawPatch(g, cx + (side ? m.hrx * 0.3 : 0), hcy - m.hry * 0.85);
  }
  if (fit.extras.includes('strawHat')) {
    const band = ec.band ?? W.peachD;
    const by = hcy - m.hry * 0.62;
    wEllipse(g, PEN, cx, by, m.hrx * 1.5, m.hrx * 0.4, { fill: W.straw, seed: seed + 1, n: 16 });
    wShape(g, PEN, [
      [cx - m.hrx * 0.72, by - 2], [cx - m.hrx * 0.55, hcy - m.hry * 1.26],
      [cx, hcy - m.hry * 1.38], [cx + m.hrx * 0.55, hcy - m.hry * 1.26], [cx + m.hrx * 0.72, by - 2],
    ], { closed: true, step: 8, fill: W.straw, seed: seed + 2 });
    wShape(g, PEN, [[cx - m.hrx * 0.68, by - 5], [cx + m.hrx * 0.68, by - 5]], { sw: 3, stroke: band, seed: seed + 3 });
  }
  if (fit.extras.includes('nightcap')) {
    const col = ec.hat ?? W.butter;
    // In profile the floppy tip trails behind the head (−x), not to camera-right.
    const d = side ? -1 : 1;
    const tipX = cx + d * m.hrx * 1.25;
    const tipY = hcy - m.hry * 0.4;
    wShape(g, PEN, [
      [cx - d * m.hrx * 0.85, hcy - m.hry * 0.5], [cx - d * m.hrx * 0.4, hcy - m.hry * 1.2],
      [cx + d * m.hrx * 0.45, hcy - m.hry * 1.1], [tipX, tipY], [cx + d * m.hrx * 0.85, hcy - m.hry * 0.42],
    ], { closed: true, step: 8, fill: col, seed: seed + 4 });
    dot(g, tipX + 2 * d, tipY + 1, 3.6, W.peach);
    wShape(g, PEN, ellipseTip(tipX + 2 * d, tipY + 1, 3.6), { closed: true, step: 6, sw: 1.6, stroke: INK.line, seed: seed + 5 });
  }
  if (fit.extras.includes('sleepMask')) {
    const col = ec.mask ?? W.peach;
    if (side) {
      const mx = cx + m.hrx * 0.45;
      const my = hcy - m.hry * 0.72;
      wShape(g, PEN, [[mx - 6, my + 5], [cx - m.hrx * 0.95, my + 9]], { sw: 1.4, stroke: INK.line, seed: seed + 6 });
      wShape(g, PEN, [[mx - 10, my - 5], [mx + 10, my - 5], [mx + 12, my + 4], [mx - 12, my + 4]], {
        closed: true, step: 6, fill: col, seed: seed + 5,
      });
      wShape(g, PEN, [[mx - 5, my], [mx - 1, my + 1.5], [mx + 3, my]], { sw: 1.1, seed: seed + 7 });
    } else {
      const mx = cx - m.hrx * 0.42;
      const my = hcy - m.hry * 0.72;
      g.save();
      g.translate(mx, my);
      g.rotate((-14 * Math.PI) / 180);
      g.translate(-mx, -my);
      wShape(g, PEN, [[mx - 8, my + 6], [cx + m.hrx * 0.9, my + 2]], { sw: 1.4, stroke: INK.line, seed: seed + 6 });
      wShape(g, PEN, [[mx - 10, my - 5], [mx + 10, my - 5], [mx + 12, my + 4], [mx - 12, my + 4]], {
        closed: true, step: 6, fill: col, seed: seed + 5,
      });
      wShape(g, PEN, [[mx - 5, my], [mx - 1, my + 1.5], [mx + 3, my]], { sw: 1.1, seed: seed + 7 });
      g.restore();
    }
  }
}

/**
 * Head plate — pivot = bottom center, sitting in the sweater collar. Rendered
 * with a short neck running to the very bottom so it reads as one connected
 * figure when stacked under the torso plate.
 */
export function drawWalkerHead(char: HumanCharId, dir: DirId, age: AgeId, view: ViewId = 'front'): PropSprite {
  const ch = CAST[char];
  const fit = DIRECTIONS[dir].fits[char];
  const geo = makeGeo(age);
  const { cx, hcy, torsoTop, m } = geo;
  const isMei = char === 'mei';
  const side = view === 'side';
  const seed = 4 + char.charCodeAt(0) + dir.charCodeAt(1) + age.charCodeAt(0) + (side ? 17 : 0);

  const top = hcy - m.hry * 1.5;
  const neckBot = torsoTop + 8;
  const pad = 6;
  const figH = neckBot - top + pad * 2;
  const figW = m.hrx * 3.3;
  const scale = 220 / figW;
  const cw = Math.round(figW * scale);
  const chh = Math.round(figH * scale);
  const { c, g } = sprite(cw, chh);
  g.save();
  g.scale(scale, scale);
  g.translate(-(cx - figW / 2), -(top - pad));

  const nW = m.hrx * 0.3;
  const nCx = side ? cx - m.hrx * 0.06 : cx;
  wShape(g, PEN, [
    [nCx - nW * 0.72, hcy + m.hry * 0.72], [nCx + nW * 0.72, hcy + m.hry * 0.72],
    [nCx + nW, neckBot], [nCx - nW, neckBot],
  ], { closed: true, step: 8, fill: ch.skin, seed: seed + 30 });
  g.save();
  g.globalAlpha = 0.12;
  g.fillStyle = '#8f6754';
  g.fillRect(nCx - nW * 0.72, hcy + m.hry * 0.72, nW * 1.44, 3);
  g.restore();

  if (side) {
    faceBase(g, geo, ch.skin, true, seed);
    if (isMei) meiHairSide(g, geo, ch.hair, seed + 7);
    else anHairSide(g, geo, ch.hair, seed + 7);
    faceSide(g, geo, isMei, seed + 20);
  } else {
    if (isMei) meiHairBehind(g, geo, ch.hair, seed + 70);
    faceBase(g, geo, ch.skin, false, seed);
    if (isMei) meiHairFront(g, geo, ch.hair, seed + 7);
    else anHairFront(g, geo, ch.hair, seed + 7);
    faceFront(g, geo, isMei, seed + 20);
  }
  headgear(g, geo, fit, seed + 9, side);
  g.restore();

  return { canvas: c, aspect: cw / chh };
}

// =====================================================================
//  TORSO PLATE  — outfit top, over-torso bottom, two arms, extras
// =====================================================================

function torsoBasePts(geo: Geo, hemY: number, topW: number, botW: number, isMei: boolean): Pt[] {
  const { cx, torsoTop: t } = geo;
  const tw = topW;
  const bw = botW;
  const midY = (t + 10 + hemY - 5) / 2;
  const inset = isMei ? 2.5 : 0.8;
  const midW = (tw / 2 + bw / 2) / 2 - inset;
  return [
    [cx - tw / 2 + 4, t], [cx, t - 2], [cx + tw / 2 - 4, t],
    [cx + tw / 2, t + 10], [cx + midW, midY], [cx + bw / 2, hemY - 5], [cx + bw / 2 - 3, hemY],
    [cx - bw / 2 + 3, hemY], [cx - bw / 2, hemY - 5], [cx - midW, midY], [cx - tw / 2, t + 10],
  ];
}

function hemFor(geo: Geo, top: Fit['top']): number {
  if (top.type === 'dress') return geo.hipY + 16;
  if (top.type === 'raincoat') return geo.hipY + 14;
  return geo.hipY + 4;
}

function torsoWidths(geo: Geo, top: Fit['top']): { topW: number; botW: number } {
  const { m } = geo;
  if (top.type === 'dress') return { topW: m.shW * 0.96, botW: m.hipW * 1.5 };
  if (top.type === 'raincoat') return { topW: m.shW * 1.02, botW: m.hipW * 1.4 };
  return { topW: m.shW, botW: m.hipW * 1.08 };
}

/** Clip subsequent drawing to the wobbled garment outline (same seed = same wobble). */
function clipToShape(g: CanvasRenderingContext2D, pts: Pt[], seed: number): void {
  wShape(g, PEN, pts, { closed: true, step: 12, stroke: 'none', seed });
  g.clip();
}

function shadeGarment(
  g: CanvasRenderingContext2D,
  pts: Pt[],
  cx: number,
  top: number,
  bottom: number,
  seed: number,
  side = false,
): void {
  g.save();
  clipToShape(g, pts, seed);
  g.globalAlpha = 0.09;
  g.fillStyle = INK.line;
  g.beginPath();
  if (side) {
    g.moveTo(cx - 2, top);
    g.lineTo(cx + 42, top);
    g.lineTo(cx + 42, bottom);
    g.lineTo(cx + 7, bottom);
  } else {
    g.moveTo(cx + 6, top);
    g.lineTo(cx + 70, top);
    g.lineTo(cx + 70, bottom);
    g.lineTo(cx + 13, bottom);
    g.quadraticCurveTo(cx + 5, (top + bottom) / 2, cx + 6, top);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function drawTorsoTop(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, isMei: boolean, seed: number): void {
  const { cx, torsoTop: t } = geo;
  const top = fit.top;
  const hem = hemFor(geo, top);
  const { topW, botW } = torsoWidths(geo, top);
  const pts = torsoBasePts(geo, hem, topW, botW, isMei);
  wShape(g, PEN, pts, { closed: true, step: 12, fill: top.color, seed });
  shadeGarment(g, pts, cx, t, hem, seed);

  if (top.stripes) {
    g.save();
    clipToShape(g, pts, seed);
    for (let y = t + 6; y < hem; y += 9) {
      wShape(g, PEN, [[cx - 70, y], [cx + 70, y]], { step: 14, sw: 2.4, stroke: top.stripes, seed: seed + y });
    }
    g.restore();
  }
  if (top.type === 'tee') {
    wShape(g, PEN, [[cx - 7, t + 2], [cx, t + 6.5], [cx + 7, t + 2]], { sw: PEN.sw * 0.8, seed: seed + 2 });
  } else if (top.type === 'overshirt') {
    const under = top.underColor ?? W.cream;
    wShape(g, PEN, [[cx - 9, t + 2], [cx, t + 12], [cx + 9, t + 2]], {
      closed: true, step: 6, sw: 1.2, fill: under, seed: seed + 2,
    });
    wShape(g, PEN, [[cx - 12, t + 2], [cx - 2, t + 13], [cx, hem - 5]], {
      sw: 1.15, seed: seed + 3,
    });
    wShape(g, PEN, [[cx + 12, t + 2], [cx + 2, t + 13], [cx, hem - 5]], {
      sw: 1.15, seed: seed + 4,
    });
    wShape(g, PEN, [
      [cx + topW * 0.08, t + 17], [cx + topW * 0.32, t + 17],
      [cx + topW * 0.32, t + 28], [cx + topW * 0.08, t + 28],
    ], { closed: true, step: 5, sw: 1.1, fill: top.color, seed: seed + 5 });
    dot(g, cx, t + (hem - t) * 0.62, 1.7, W.signal);
  } else if (top.type === 'pjTop') {
    wShape(g, PEN, [[cx - 8, t + 1], [cx, t + 9]], { sw: PEN.sw * 0.7, seed: seed + 2 });
    wShape(g, PEN, [[cx + 8, t + 1], [cx, t + 9]], { sw: PEN.sw * 0.7, seed: seed + 3 });
    for (const f of [0.28, 0.5, 0.72]) {
      const cy = t + (hem - t) * f;
      dot(g, cx, cy, 2.2, W.cream);
      wShape(g, PEN, ellipseTip(cx, cy, 2.2), { closed: true, step: 6, sw: 1.4, stroke: INK.line, seed: seed + 40 });
    }
  } else if (top.type === 'raincoat') {
    wShape(g, PEN, [[cx, t + 8], [cx, hem - 4]], { sw: PEN.sw * 0.7, seed: seed + 2 });
    for (let i = 0; i < 2; i++) {
      const f = [0.3, 0.55][i];
      wShape(g, PEN, [
        [cx - 7, t + (hem - t) * f - 2], [cx - 1, t + (hem - t) * f - 2],
        [cx - 1, t + (hem - t) * f + 2], [cx - 7, t + (hem - t) * f + 2],
      ], { closed: true, sw: 1.1, step: 5, fill: W.cream, seed: seed + 6 + i });
    }
    wShape(g, PEN, [[cx + botW / 2 - 16, hem - 16], [cx + botW / 2 - 6, hem - 15]], { sw: PEN.sw * 0.8, seed: seed + 9 });
  } else if (top.type === 'dress' && !top.stripes) {
    wShape(g, PEN, [[cx - botW / 2 + 6, hem - 5], [cx + botW / 2 - 6, hem - 5]], { sw: 1.1, seed: seed + 4 });
  }
}

function bottomFB(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, seed: number): void {
  const b = fit.bottom;
  if (!b || b.type === 'none' || b.type === 'pants' || b.type === 'pjPants') return;
  const { cx, torsoTop: t, hipY, m } = geo;
  const col = b.color ?? W.sage;
  const bw = m.shW * 0.24;
  const blockTop = hipY - m.torsoH * 0.24;
  const strap = (sx: number): void => {
    wShape(g, PEN, [[cx + sx * (m.shW / 2 - 7), t + 5], [cx + sx * bw, blockTop - 14]], { sw: 4.6, stroke: INK.line, seed: seed + sx * 3 + 10 });
    wShape(g, PEN, [[cx + sx * (m.shW / 2 - 7), t + 5], [cx + sx * bw, blockTop - 14]], { sw: 3, stroke: col, seed: seed + sx * 3 + 10 });
  };
  if (b.type === 'shorts' || b.type === 'overallShorts') {
    const isOverall = b.type === 'overallShorts';
    const w = m.hipW / 2 + 3;
    if (isOverall) {
      strap(-1);
      strap(1);
    }
    wShape(g, PEN, [
      [cx - w, blockTop], [cx + w, blockTop], [cx + w + 2, hipY + 13],
      [cx + 4, hipY + 13], [cx, hipY + 6], [cx - 4, hipY + 13], [cx - w - 2, hipY + 13],
    ], { closed: true, step: 9, fill: col, seed });
    if (isOverall) {
      wShape(g, PEN, [[cx - bw, blockTop - 16], [cx + bw, blockTop - 16], [cx + bw + 1, blockTop + 2], [cx - bw - 1, blockTop + 2]], {
        closed: true, step: 8, fill: col, seed: seed + 5,
      });
      dot(g, cx - bw + 3, blockTop - 11, 2, W.butter);
      dot(g, cx + bw - 3, blockTop - 11, 2, W.butter);
    }
  } else if (b.type === 'overalls') {
    strap(-1);
    strap(1);
    wShape(g, PEN, [[cx - m.hipW / 2 - 2, blockTop], [cx + m.hipW / 2 + 2, blockTop], [cx + m.hipW / 2 + 3, hipY + 8], [cx - m.hipW / 2 - 3, hipY + 8]], {
      closed: true, step: 9, fill: col, seed,
    });
    wShape(g, PEN, [[cx - bw, blockTop - 16], [cx + bw, blockTop - 16], [cx + bw + 1, blockTop + 2], [cx - bw - 1, blockTop + 2]], {
      closed: true, step: 8, fill: col, seed: seed + 5,
    });
    dot(g, cx - bw + 3, blockTop - 11, 2, W.butter);
    dot(g, cx + bw - 3, blockTop - 11, 2, W.butter);
  } else if (b.type === 'pinafore') {
    const waist = t + m.torsoH * 0.42;
    const hem = hipY + 14;
    wShape(g, PEN, [[cx - (m.shW / 2 - 7), t + 5], [cx - bw, waist - 6]], { sw: 4.6, stroke: INK.line, seed: seed + 7 });
    wShape(g, PEN, [[cx - (m.shW / 2 - 7), t + 5], [cx - bw, waist - 6]], { sw: 3, stroke: col, seed: seed + 7 });
    wShape(g, PEN, [[cx + (m.shW / 2 - 7), t + 5], [cx + bw, waist - 6]], { sw: 4.6, stroke: INK.line, seed: seed + 13 });
    wShape(g, PEN, [[cx + (m.shW / 2 - 7), t + 5], [cx + bw, waist - 6]], { sw: 3, stroke: col, seed: seed + 13 });
    wShape(g, PEN, [
      [cx - m.shW * 0.3, waist], [cx + m.shW * 0.3, waist], [cx + m.hipW * 0.78 + 6, hem - 4],
      [cx + m.hipW * 0.7, hem], [cx, hem + 2], [cx - m.hipW * 0.7, hem], [cx - m.hipW * 0.78 - 6, hem - 4],
    ], { closed: true, step: 10, fill: col, seed });
    wShape(g, PEN, [[cx - bw, waist - 16], [cx + bw, waist - 16], [cx + bw + 1, waist + 2], [cx - bw - 1, waist + 2]], {
      closed: true, step: 8, fill: col, seed: seed + 5,
    });
  }
}

function frontArmPoints(geo: Geo, side: -1 | 1): Pt[] {
  const { cx, torsoTop, m } = geo;
  const shY = torsoTop + 10;
  const shX = m.shW / 2 - 2;
  return [
    [cx + side * shX, shY],
    [cx + side * (shX + ARM_OUT), shY + m.armL * 0.5],
    [cx + side * (shX + ARM_OUT * 0.35), shY + m.armL],
  ];
}

/** Both arms (front view), with a quiet elbow bend instead of tube limbs. */
function arms(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, skin: string, seed: number): Pt {
  const { cx, torsoTop, m } = geo;
  const long = fit.top.sleeves === 'long';
  const armColor = long ? fit.top.color : skin;
  const shY = torsoTop + 9;
  let leashHand: Pt = [cx, shY + m.armL];
  for (const s of [-1, 1] as const) {
    const pts = frontArmPoints(geo, s);
    limb(g, PEN, pts, m.limbW, armColor, seed + (s + 1) * 11);
    wEllipse(g, PEN, pts[2][0], pts[2][1] + 1.5, m.limbW * 0.54 + 0.8, m.limbW * 0.66 + 0.8, { fill: skin, seed: seed + 40 + s, n: 12 });
    if (!long) {
      wEllipse(g, PEN, pts[0][0], shY + 3, m.limbW * 0.85, m.limbW, { fill: fit.top.color, seed: seed + 50 + s, n: 12 });
    }
    if (s === 1) leashHand = [pts[2][0], pts[2][1] + 1.5];
  }
  return leashHand;
}

function signalClasp(g: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  dot(g, x, y, 2.4, W.signal);
  wShape(g, PEN, ellipseTip(x, y, 3.5), {
    closed: true,
    step: 6,
    sw: 1.2,
    stroke: INK.line,
    seed,
  });
}

function cape(g: CanvasRenderingContext2D, geo: Geo, color: string, seed: number): void {
  const { cx, torsoTop: t, m } = geo;
  const hem = t + m.torsoH * 0.74;
  const w = m.shW * 0.8;
  wShape(g, PEN, [
    [cx - w * 0.45, t + 1], [cx, t - 1], [cx + w * 0.45, t + 1],
    [cx + w * 0.8, t + 14], [cx + w, hem - 3],
    [cx + w * 0.55, hem + 3], [cx, hem - 2], [cx - w * 0.55, hem + 3],
    [cx - w, hem - 3], [cx - w * 0.8, t + 14],
  ], { closed: true, step: 10, fill: color, seed });
  dot(g, cx, t + 5, 3, W.cream);
  wShape(g, PEN, ellipseTip(cx, t + 5, 3), { closed: true, step: 6, sw: 1.6, stroke: INK.line, seed: seed + 1 });
}

function extraOverTorso(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, seed: number): void {
  const { cx, torsoTop: t, hipY, m } = geo;
  const ec = fit.extraColors ?? {};
  if (fit.extras.includes('satchel')) {
    const col = ec.satchel ?? W.sageD;
    wShape(g, PEN, [[cx - (m.shW / 2 - 6), t + 4], [cx + (m.hipW / 2 + 2), hipY - 10]], { sw: 2.6, stroke: col, seed });
    wShape(g, PEN, [
      [cx + (m.hipW / 2 - 8), hipY - 12], [cx + (m.hipW / 2 + 14), hipY - 12],
      [cx + (m.hipW / 2 + 15), hipY + 6], [cx + (m.hipW / 2 - 9), hipY + 6],
    ], { closed: true, step: 7, fill: col, seed: seed + 1 });
    wShape(g, PEN, [[cx + (m.hipW / 2 - 9), hipY - 4], [cx + (m.hipW / 2 + 14), hipY - 4]], { sw: 1.1, seed: seed + 2 });
    signalClasp(g, cx + m.hipW / 2 + 3, hipY + 1, seed + 3);
  }
  if (fit.extras.includes('neckerchief')) {
    const col = ec.scarf ?? W.peach;
    wShape(g, PEN, [[cx - 13, t + 4], [cx + 13, t + 4], [cx, t + 20]], { closed: true, sw: 2, step: 6, fill: col, seed: seed + 5 });
    dot(g, cx, t + 6, 2.4, col);
    wShape(g, PEN, ellipseTip(cx, t + 6, 2.4), { closed: true, step: 6, sw: 1.4, stroke: INK.line, seed: seed + 14 });
  }
}

function hoodBehind(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, seed: number): void {
  if (!fit.extras.includes('hood')) return;
  wEllipse(g, PEN, geo.cx, geo.torsoTop + 2, geo.m.shW * 0.42, 11, { fill: fit.top.color, seed: seed + 80, n: 12 });
}

// ----- profile (side-view) torso pieces — body has depth, one arm shows -----

/** Garment widths seen from the side: the body's depth, not its breadth. */
function sideWidths(geo: Geo, top: Fit['top']): { topW: number; botW: number } {
  const { topW, botW } = torsoWidths(geo, top);
  return { topW: topW * 0.68, botW: botW * 0.84 };
}

function drawTorsoTopSide(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, isMei: boolean, seed: number): void {
  const { cx, torsoTop: t } = geo;
  const top = fit.top;
  const hem = hemFor(geo, top);
  const { topW, botW } = sideWidths(geo, top);
  const pts = torsoBasePts(geo, hem, topW, botW, isMei);
  wShape(g, PEN, pts, { closed: true, step: 12, fill: top.color, seed });
  shadeGarment(g, pts, cx, t, hem, seed, true);

  if (top.stripes) {
    g.save();
    clipToShape(g, pts, seed);
    for (let y = t + 6; y < hem; y += 9) {
      wShape(g, PEN, [[cx - 70, y], [cx + 70, y]], { step: 14, sw: 2.4, stroke: top.stripes, seed: seed + y });
    }
    g.restore();
  }
  // The garment's leading edge, interpolated shoulder→hem.
  const frontX = (y: number): number =>
    cx + topW / 2 + ((botW - topW) / 2) * ((y - t) / (hem - t));
  if (top.type === 'overshirt') {
    const under = top.underColor ?? W.cream;
    wShape(g, PEN, [
      [frontX(t + 3) - 13, t + 3], [frontX(t + 12) - 6, t + 12],
      [frontX(t + 22) - 12, t + 22],
    ], { closed: true, step: 6, sw: 1.1, fill: under, seed: seed + 2 });
    wShape(g, PEN, [
      [frontX(t + 3) - 13, t + 3],
      [frontX(t + 14) - 5, t + 14],
      [frontX(hem - 5) - 5, hem - 5],
    ], { sw: 1.1, seed: seed + 3 });
    dot(g, frontX(t + (hem - t) * 0.62) - 5, t + (hem - t) * 0.62, 1.7, W.signal);
  } else if (top.type === 'pjTop') {
    for (const f of [0.28, 0.5, 0.72]) {
      const cy = t + (hem - t) * f;
      const bx = frontX(cy) - 5;
      dot(g, bx, cy, 2.2, W.cream);
      wShape(g, PEN, ellipseTip(bx, cy, 2.2), { closed: true, step: 6, sw: 1.4, stroke: INK.line, seed: seed + 40 });
    }
  } else if (top.type === 'raincoat') {
    wShape(g, PEN, [[frontX(t + 8) - 3, t + 8], [frontX(hem - 4) - 4, hem - 4]], { sw: PEN.sw * 0.7, seed: seed + 2 });
    wShape(g, PEN, [[cx - botW / 2 + 5, hem - 16], [cx - botW / 2 + 14, hem - 15]], { sw: PEN.sw * 0.8, seed: seed + 9 });
  } else if (top.type === 'dress' && !top.stripes) {
    wShape(g, PEN, [[cx - botW / 2 + 5, hem - 5], [cx + botW / 2 - 5, hem - 5]], { sw: 1.1, seed: seed + 4 });
  }
}

/** Side bottoms — block reads as depth; one strap arcs over the shoulder. */
function bottomFBSide(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, seed: number): void {
  const b = fit.bottom;
  if (!b || b.type === 'none' || b.type === 'pants' || b.type === 'pjPants') return;
  const { cx, torsoTop: t, hipY, m } = geo;
  const col = b.color ?? W.sage;
  const bw = m.shW * 0.22;
  const blockTop = hipY - m.torsoH * 0.24;
  const strapSide = (bibX: number, bibY: number): void => {
    const pts: Pt[] = [[bibX, bibY], [cx + 2, t + 3], [cx - m.shW * 0.24, bibY + 6]];
    wShape(g, PEN, pts, { sw: 4.6, stroke: INK.line, seed: seed + 10 });
    wShape(g, PEN, pts, { sw: 3, stroke: col, seed: seed + 10 });
  };
  const bib = (bibTop: number): void => {
    wShape(g, PEN, [[cx - bw, bibTop], [cx + bw, bibTop], [cx + bw + 1, bibTop + 18], [cx - bw - 1, bibTop + 18]], {
      closed: true, step: 8, fill: col, seed: seed + 5,
    });
    dot(g, cx + bw - 3, bibTop + 5, 2, W.butter);
  };
  if (b.type === 'shorts' || b.type === 'overallShorts' || b.type === 'overalls') {
    const isOverall = b.type !== 'shorts';
    const w = (m.hipW / 2 + 3) * 0.85;
    const bot = b.type === 'overalls' ? hipY + 8 : hipY + 13;
    if (isOverall) strapSide(cx + bw * 0.6, blockTop - 14);
    wShape(g, PEN, [
      [cx - w, blockTop], [cx + w, blockTop], [cx + w + 2, bot], [cx - w - 2, bot],
    ], { closed: true, step: 9, fill: col, seed });
    if (isOverall) bib(blockTop - 16);
  } else if (b.type === 'pinafore') {
    const waist = t + m.torsoH * 0.42;
    const hem = hipY + 14;
    strapSide(cx + bw * 0.6, waist - 14);
    wShape(g, PEN, [
      [cx - m.shW * 0.24, waist], [cx + m.shW * 0.24, waist],
      [cx + m.hipW * 0.62, hem - 2], [cx, hem + 2], [cx - m.hipW * 0.62, hem - 2],
    ], { closed: true, step: 10, fill: col, seed });
    bib(waist - 16);
  }
}

/** The single visible arm in profile — returns the hand point for the leash. */
function armSide(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, skin: string, seed: number): Pt {
  const { cx, torsoTop, m } = geo;
  const long = fit.top.sleeves === 'long';
  const armColor = long ? fit.top.color : skin;
  const shY = torsoTop + 9;
  const pts: Pt[] = [
    [cx + 1, shY],
    [cx + 6, shY + m.armL * 0.5],
    [cx + 2.5, shY + m.armL],
  ];
  limb(g, PEN, pts, m.limbW, armColor, seed + 11);
  wEllipse(g, PEN, pts[2][0], pts[2][1] + 1.5, m.limbW * 0.54 + 0.8, m.limbW * 0.66 + 0.8, { fill: skin, seed: seed + 40, n: 12 });
  if (!long) {
    wEllipse(g, PEN, pts[0][0], shY + 4, m.limbW * 0.95, m.limbW * 1.2, { fill: fit.top.color, seed: seed + 50, n: 10 });
  }
  return [pts[2][0], pts[2][1] + 1.5];
}

/** Cape in profile — trails behind the walker with a wavy hem. */
function capeSide(g: CanvasRenderingContext2D, geo: Geo, color: string, seed: number): void {
  const { cx, torsoTop: t, m } = geo;
  const hem = t + m.torsoH * 0.78;
  const back = m.shW * 1.05;
  wShape(g, PEN, [
    [cx + m.shW * 0.18, t + 1], [cx - m.shW * 0.1, t - 2],
    [cx - back * 0.55, t + 12], [cx - back, hem - 6],
    [cx - back * 0.7, hem + 2], [cx - back * 0.35, hem - 4], [cx - m.shW * 0.05, hem - 1],
  ], { closed: true, step: 10, fill: color, seed });
  dot(g, cx + m.shW * 0.14, t + 5, 3, W.cream);
  wShape(g, PEN, ellipseTip(cx + m.shW * 0.14, t + 5, 3), { closed: true, step: 6, sw: 1.6, stroke: INK.line, seed: seed + 1 });
}

function extrasSide(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, seed: number): void {
  const { cx, torsoTop: t, hipY, m } = geo;
  const ec = fit.extraColors ?? {};
  if (fit.extras.includes('satchel')) {
    const col = ec.satchel ?? W.sageD;
    const bagX = cx - m.hipW * 0.34;
    wShape(g, PEN, [[cx + m.shW * 0.2, t + 4], [bagX + 4, hipY - 11]], { sw: 2.6, stroke: col, seed });
    wShape(g, PEN, [
      [bagX - 11, hipY - 12], [bagX + 11, hipY - 12],
      [bagX + 12, hipY + 6], [bagX - 12, hipY + 6],
    ], { closed: true, step: 7, fill: col, seed: seed + 1 });
    wShape(g, PEN, [[bagX - 12, hipY - 4], [bagX + 11, hipY - 4]], { sw: 1.1, seed: seed + 2 });
    signalClasp(g, bagX, hipY + 1, seed + 3);
  }
  if (fit.extras.includes('neckerchief')) {
    const col = ec.scarf ?? W.peach;
    wShape(g, PEN, [[cx - 6, t + 4], [cx + 14, t + 4], [cx + 5, t + 19]], { closed: true, sw: 2, step: 6, fill: col, seed: seed + 5 });
    dot(g, cx + 11, t + 6, 2.4, col);
    wShape(g, PEN, ellipseTip(cx + 11, t + 6, 2.4), { closed: true, step: 6, sw: 1.4, stroke: INK.line, seed: seed + 14 });
  }
}

function hoodBehindSide(g: CanvasRenderingContext2D, geo: Geo, fit: Fit, seed: number): void {
  if (!fit.extras.includes('hood')) return;
  wEllipse(g, PEN, geo.cx - geo.m.shW * 0.26, geo.torsoTop + 2, geo.m.shW * 0.32, 11, { fill: fit.top.color, seed: seed + 80, n: 12 });
}

/**
 * Torso plate — pivot = bottom center. Canvas spans figure y∈[torsoTop − margin
 * .. a little below the hem], wide enough for outstretched arms + satchel.
 */
export function drawWalkerTorso(char: HumanCharId, dir: DirId, age: AgeId, view: ViewId = 'front'): TorsoSprite {
  const ch = CAST[char];
  const fit = DIRECTIONS[dir].fits[char];
  const geo = makeGeo(age);
  const { cx, torsoTop, hipY, m } = geo;
  const isMei = char === 'mei';
  const side = view === 'side';
  const seed = 3 + char.charCodeAt(0) * 2 + dir.charCodeAt(0) + age.charCodeAt(1) + (side ? 23 : 0);
  const top = torsoTop - 14;
  const bottom = hipY + 22;
  const figH = bottom - top;
  const figW = m.shW + ARM_OUT * 2 + 80;
  const scale = 256 / figW;
  const cw = 256;
  const chh = Math.round(figH * scale);
  const { c, g } = sprite(cw, chh);
  g.save();
  g.scale(scale, scale);
  g.translate(-(cx - figW / 2), -top);

  let handFx: number;
  let handFy: number;
  if (side) {
    if (fit.extras.includes('cape')) capeSide(g, geo, fit.extraColors?.cape ?? W.peach, seed + 6);
    hoodBehindSide(g, geo, fit, seed + 2);
    drawTorsoTopSide(g, geo, fit, isMei, seed + 3);
    bottomFBSide(g, geo, fit, seed + 4);
    const hand = armSide(g, geo, fit, ch.skin, seed + 5);
    extrasSide(g, geo, fit, seed + 7);
    handFx = hand[0];
    handFy = hand[1];
  } else {
    hoodBehind(g, geo, fit, seed + 2);
    drawTorsoTop(g, geo, fit, isMei, seed + 3);
    bottomFB(g, geo, fit, seed + 4);
    const hand = arms(g, geo, fit, ch.skin, seed + 5);
    if (fit.extras.includes('cape')) cape(g, geo, fit.extraColors?.cape ?? W.peach, seed + 6);
    extraOverTorso(g, geo, fit, seed + 7);
    handFx = hand[0];
    handFy = hand[1];
  }
  g.restore();

  const handU = (handFx - (cx - figW / 2)) / figW;
  const handV = (handFy - top) / figH;
  return { canvas: c, aspect: cw / chh, hand: { u: handU, v: handV } };
}

// =====================================================================
//  LEG PLATE  — one leg with sock + shoe (rig draws it twice, mirrored)
// =====================================================================

function shoeF(g: CanvasRenderingContext2D, x: number, ground: number, color: string, boot: boolean, seed: number): void {
  if (boot) {
    wShape(g, PEN, [
      [x - 5.5, ground - 23], [x + 5.5, ground - 23],
      [x + 6.5, ground - 10], [x + 10, ground - 6],
      [x + 9, ground - 2.5], [x - 8, ground - 2.5],
      [x - 9, ground - 6], [x - 6, ground - 10],
    ], { closed: true, step: 8, fill: color, seed });
    wShape(g, PEN, [[x - 8, ground - 5], [x + 8.5, ground - 5]], {
      sw: 1,
      stroke: INK.soft,
      seed: seed + 1,
    });
  } else {
    wShape(g, PEN, [
      [x - 7, ground - 10], [x + 5, ground - 10],
      [x + 10, ground - 5], [x + 8, ground - 2.5],
      [x - 8, ground - 2.5], [x - 9, ground - 5],
    ], { closed: true, step: 7, fill: color, seed });
  }
}

/**
 * Leg plate — pivot = top center (hip). One leg drawn into a tall canvas; the
 * rig instantiates it twice and offsets/mirrors for the two-beat walk.
 */
export function drawWalkerLeg(char: HumanCharId, dir: DirId, age: AgeId): PropSprite {
  const fit = DIRECTIONS[dir].fits[char];
  const ch = CAST[char];
  const geo = makeGeo(age);
  const { cx, ground, hipY, m } = geo;
  const b = fit.bottom;
  const pantsLike = b.type === 'pants' || b.type === 'pjPants' || b.type === 'overalls';
  const legColor = pantsLike ? (b.color ?? ch.skin) : ch.skin;
  const sock = !!fit.socks;
  const sockColor = fit.socks ?? legColor;
  const boot = fit.shoes.boot;
  const shoeColor = fit.shoes.color;
  const seed = 1 + char.charCodeAt(0) + dir.charCodeAt(0) + age.charCodeAt(0);

  const lx = cx;
  const top: Pt = [lx, hipY - 8];
  const footY = boot ? ground - 20 : ground - 9;
  const knee: Pt = [lx + 1, hipY + (footY - hipY) * 0.55];
  const bot: Pt = [lx + 2, footY];

  const figTop = hipY - 12;
  const figBot = ground + 4;
  const figH = figBot - figTop;
  const figW = 40;
  const scale = 90 / figW;
  const cw = 90;
  const chh = Math.round(figH * scale);
  const { c, g } = sprite(cw, chh);
  g.save();
  g.scale(scale, scale);
  g.translate(-(lx - figW / 2), -figTop);

  const segs = sock
    ? [
        { pts: [top, knee] as Pt[], color: legColor, w: m.legW },
        { pts: [knee, bot] as Pt[], color: sockColor, w: m.legW },
      ]
    : undefined;
  limb(g, PEN, [top, knee, bot], m.legW, legColor, seed, segs);
  wShape(g, PEN, [[knee[0] - m.legW * 0.35, knee[1]], [knee[0] + m.legW * 0.28, knee[1] + 0.8]], {
    sw: 0.9,
    stroke: INK.soft,
    seed: seed + 18,
  });
  shoeF(g, lx + 2.5, ground, shoeColor, boot, seed + 31);
  g.restore();

  return { canvas: c, aspect: cw / chh };
}

/**
 * Per-age plate placement, in metres, derived from the SAME figure frame the
 * plates are drawn in — so head / torso / leg planes line up into one figure
 * and kid / teen / adult share proportions (head stays big, limbs stretch).
 *
 * One figure-unit → U metres, fixed so the adult leg matches the rig's original
 * 0.78 m hip height. Everything else (torso, head, anchors) follows from the
 * frame, so changing AGE_M is enough to retune a whole age.
 */
const U = 0.78 / AGE_M.adult.legL;

export interface PlateLayout {
  /** Leg plate height (m) — pivot at top (hip). */
  legH: number;
  /** Hip height above the ground (m) — leg pivot + torso bottom reference. */
  hipY: number;
  /** Torso plate height (m) — pivot at bottom. */
  torsoH: number;
  /** Torso plate bottom-anchor height (m). */
  torsoBottomY: number;
  /** Head plate height (m) — pivot at bottom (in the collar). */
  headH: number;
  /** Head plate pivot height (m). */
  headY: number;
}

export function plateLayout(age: AgeId): PlateLayout {
  const geo = makeGeo(age);
  const { m, ground, hipY: figHip, torsoTop: figTorsoTop, hcy } = geo;

  // Leg plate spans figTop..figBot (matches drawWalkerLeg).
  const legFigTop = figHip - 12;
  const legFigBot = ground + 4;
  const legH = (legFigBot - legFigTop) * U;
  const hipY = m.legL * U;

  // Torso plate spans (torsoTop-14)..(hipY+22) (matches drawWalkerTorso).
  const torsoFigTop = figTorsoTop - 14;
  const torsoFigBot = figHip + 22;
  const torsoH = (torsoFigBot - torsoFigTop) * U;
  // The figure's ground (292) maps to y=0; a figure y maps to metres via
  // (ground - y) * U. Torso plate is bottom-anchored at its figure bottom edge.
  const torsoBottom = (ground - torsoFigBot) * U;

  // Head plate spans (hcy-hry*1.5 - pad)..(torsoTop+8) (matches drawWalkerHead).
  const headFigTop = hcy - m.hry * 1.5 - 6;
  const headFigBot = figTorsoTop + 8;
  const headH = (headFigBot - headFigTop) * U;
  const headY = (ground - headFigBot) * U;

  return {
    legH,
    hipY,
    torsoH,
    torsoBottomY: torsoBottom,
    headH,
    headY,
  };
}

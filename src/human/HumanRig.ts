/**
 * HumanRig — the player's cutout puppet, one of Datou's two human companions
 * (Mei or An) in a selectable shared-life outfit and age.
 * Billboarded plates — head, torso (with the leash arm + outfit), two legs —
 * driven by a simple two-beat walk cycle, breathing idle, and facing flip.
 *
 * Head and torso exist in TWO views: front (facing camera) and a true profile.
 * Walking across the screen shows the profile (mirrored for leftward); walking
 * toward/away or standing shows the front — so the walker turns to face you
 * when she stops. Plate sizes and stacking come from `plateLayout(age)`, so
 * kid / teen / adult share proportions (head stays big, limbs stretch). The
 * torso plate reports its drawn leash-hand position so the rope attaches
 * exactly in either view.
 */

import * as THREE from 'three';
import {
  drawWalkerHead,
  drawWalkerLeg,
  drawWalkerTorso,
  plateLayout,
  type PlateLayout,
  type ViewId,
} from '../art/walkerParts';
import { canvasTexture } from '../art/textures';
import type { AgeId, CharId, DirId, HumanCharId } from '../art/walkerData';
import type { PropSprite } from '../art/props';

const NAILONG_YOUNG_URL = new URL('../assets/avatars/nailong-young-v2.png', import.meta.url).href;
const NAILONG_ADULT_URL = new URL('../assets/avatars/nailong-adult.png', import.meta.url).href;
const NAILONG_HEIGHT: Record<AgeId, number> = { kid: 1.12, teen: 1.42, adult: 1.78 };

function partPlane(
  sprite: PropSprite,
  height: number,
  anchor: 'top' | 'bottom',
  tint = 1,
): THREE.Mesh {
  const w = height * sprite.aspect;
  const geo = new THREE.PlaneGeometry(w, height);
  geo.translate(0, anchor === 'top' ? -height / 2 : height / 2, 0);
  const mat = new THREE.MeshBasicMaterial({
    map: canvasTexture(sprite.canvas),
    transparent: true,
    alphaTest: 0.08,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  mat.color.setScalar(tint);
  return new THREE.Mesh(geo, mat);
}

/** One drawn view of the upper body: its two plates + the leash-hand anchor. */
interface BodyView {
  torso: THREE.Mesh;
  head: THREE.Mesh;
  hand: THREE.Vector3;
}

const VIEWS: ViewId[] = ['front', 'side'];

export class HumanRig {
  readonly group = new THREE.Group();

  private readonly flip = new THREE.Group();
  private bodies!: Record<ViewId, BodyView>;
  private nearLeg!: THREE.Mesh;
  private farLeg!: THREE.Mesh;
  private nailong!: THREE.Mesh;
  private nailongIdleTexture!: THREE.Texture;
  private nailongBasePositions!: Float32Array;
  private readonly shadow: THREE.Mesh;

  private char: CharId;
  private dir: DirId;
  private age: AgeId;
  private layout: PlateLayout;
  private view: ViewId = 'front';
  private readonly handWorld = new THREE.Vector3();

  private gait = 0;
  private facing = 1;
  private time = 0;

  constructor(
    shadowTexture: THREE.Texture,
    char: CharId = 'nailong',
    dir: DirId = 'scout',
    age: AgeId = 'adult',
  ) {
    this.char = char;
    this.dir = dir;
    this.age = age;
    this.layout = plateLayout(age);
    this.buildPlates();
    this.group.add(this.flip);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.7),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.006;
    this.shadow.renderOrder = 0.5;
    this.group.add(this.shadow);
  }

  /** The paper-puppet renderer remains the fallback behind Nailong's full sprite. */
  private get humanChar(): HumanCharId {
    return this.char === 'nailong' ? 'mei' : this.char;
  }

  private makeLeg(tint: number): THREE.Mesh {
    return partPlane(drawWalkerLeg(this.humanChar, this.dir, this.age), this.layout.legH, 'top', tint);
  }

  private makeBody(view: ViewId): BodyView {
    const sprite = drawWalkerTorso(this.humanChar, this.dir, this.age, view);
    const torso = partPlane(sprite, this.layout.torsoH, 'bottom');
    // Map the plate's reported hand fraction into the torso's local space.
    // Plate is bottom-anchored: v=1 → bottom (torsoBottomY), v=0 → top.
    const w = this.layout.torsoH * sprite.aspect;
    const hand = new THREE.Vector3(
      (sprite.hand.u - 0.5) * w,
      this.layout.torsoBottomY + (1 - sprite.hand.v) * this.layout.torsoH,
      0.05,
    );
    const head = partPlane(
      drawWalkerHead(this.humanChar, this.dir, this.age, view),
      this.layout.headH,
      'bottom',
    );
    return { torso, head, hand };
  }

  /** Nailong is a single authored cutout; adult age selects the laughing meme variant. */
  private makeNailong(): THREE.Mesh {
    const height = NAILONG_HEIGHT[this.age];
    // Subdivision lets the feet and belly move continuously without fading the
    // whole character between sprites (which produced translucent ghosts).
    const geometry = new THREE.PlaneGeometry(height, height, 16, 16);
    geometry.translate(0, height / 2, 0);
    this.nailongBasePositions = new Float32Array(geometry.attributes.position.array);
    this.nailongIdleTexture = new THREE.TextureLoader().load(
      this.age === 'adult' ? NAILONG_ADULT_URL : NAILONG_YOUNG_URL,
    );
    this.nailongIdleTexture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: this.nailongIdleTexture,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }

  /**
   * Deform the plate on every render update. Each foot gets an opposing
   * stride/lift phase while the belly lags behind the step. This stays fully
   * opaque and runs at the browser's 30–60+ fps.
   */
  private deformNailong(moving: boolean, phase: number): void {
    const position = this.nailong.geometry.attributes.position as THREE.BufferAttribute;
    const height = NAILONG_HEIGHT[this.age];
    const stride = Math.sin(phase);
    const adult = this.age === 'adult';

    for (let i = 0; i < position.count; i++) {
      const j = i * 3;
      const baseX = this.nailongBasePositions[j];
      const baseY = this.nailongBasePositions[j + 1];
      const baseZ = this.nailongBasePositions[j + 2];
      if (!moving || this.char !== 'nailong') {
        position.setXYZ(i, baseX, baseY, baseZ);
        continue;
      }

      const u = baseX / height + 0.5;
      const v = baseY / height;
      const side = u < 0.5 ? -1 : 1;
      const sideWeight = THREE.MathUtils.clamp(Math.abs(u - 0.5) * 5, 0, 1);
      const footWeight = THREE.MathUtils.clamp((0.34 - v) / 0.2, 0, 1) * sideWeight;
      const legPhase = -side * stride;
      let dx = footWeight * legPhase * height * (adult ? 0.042 : 0.06);
      let dy =
        footWeight * Math.max(0, legPhase) * height * (adult ? 0.025 : 0.04);

      const bellyVertical = THREE.MathUtils.clamp(1 - Math.abs(v - 0.4) / 0.24, 0, 1);
      const bellyHorizontal = THREE.MathUtils.clamp(1 - Math.abs(u - 0.5) / 0.46, 0, 1);
      dx -= bellyVertical * bellyHorizontal * stride * height * (adult ? 0.012 : 0.008);
      dy -= bellyVertical * bellyHorizontal * Math.abs(stride) * height * 0.004;
      position.setXYZ(i, baseX + dx, baseY + dy, baseZ);
    }
    position.needsUpdate = true;
  }

  /** Draw legs + both body views, add them to the rig, and lay everything out. */
  private buildPlates(): void {
    this.nailong = this.makeNailong();
    this.farLeg = this.makeLeg(0.82);
    this.nearLeg = this.makeLeg(1);
    this.bodies = { front: this.makeBody('front'), side: this.makeBody('side') };
    this.flip.add(this.nailong, this.farLeg, this.nearLeg);
    for (const v of VIEWS) this.flip.add(this.bodies[v].torso, this.bodies[v].head);
    this.placePlates();
    this.applyView();
  }

  /** Position every plate from the current age's layout (call after any build). */
  private placePlates(): void {
    const L = this.layout;
    this.nailong.position.set(0, 0, 0.05);
    this.farLeg.position.set(-0.05, L.hipY, -0.03);
    this.nearLeg.position.set(0.06, L.hipY, 0.03);
    for (const v of VIEWS) {
      this.bodies[v].torso.position.set(0, L.torsoBottomY, 0.01);
      this.bodies[v].head.position.set(v === 'side' ? 0 : 0.02, L.headY, 0.02);
    }
  }

  private applyView(): void {
    const isNailong = this.char === 'nailong';
    this.nailong.visible = isNailong;
    this.farLeg.visible = !isNailong;
    this.nearLeg.visible = !isNailong;
    for (const v of VIEWS) {
      const on = !isNailong && v === this.view;
      this.bodies[v].torso.visible = on;
      this.bodies[v].head.visible = on;
    }
  }

  /** Swap the playable walker (Nailong/Mei/An) live — redraws all plates. */
  setCharacter(char: CharId): void {
    if (char === this.char) return;
    this.char = char;
    this.rebuild();
  }

  /** Swap the walker's outfit direction live — redraws all plates. */
  setOutfit(dir: DirId): void {
    if (dir === this.dir) return;
    this.dir = dir;
    this.rebuild();
  }

  /** Swap the walker's age (kid/teen/adult) live — redraws + re-lays plates. */
  setAge(age: AgeId): void {
    if (age === this.age) return;
    this.age = age;
    this.layout = plateLayout(age);
    this.rebuild();
  }

  /** Re-draw every plate after a character / outfit / age change. */
  private rebuild(): void {
    const drop = (old: THREE.Mesh): void => {
      this.flip.remove(old);
      const mat = old.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
      old.geometry.dispose();
    };
    // Preserve the in-progress gait rotations on the legs across the swap.
    const nearRot = this.nearLeg.rotation.z;
    const farRot = this.farLeg.rotation.z;
    this.flip.remove(this.nailong);
    this.nailongIdleTexture.dispose();
    (this.nailong.material as THREE.MeshBasicMaterial).dispose();
    this.nailong.geometry.dispose();
    drop(this.farLeg);
    drop(this.nearLeg);
    for (const v of VIEWS) {
      drop(this.bodies[v].torso);
      drop(this.bodies[v].head);
    }
    this.buildPlates();
    this.nearLeg.rotation.z = nearRot;
    this.farLeg.rotation.z = farRot;
  }

  /** World position of the leash hand (for the rope), in the active view. */
  get handPosition(): THREE.Vector3 {
    if (this.char === 'nailong') {
      const h = NAILONG_HEIGHT[this.age];
      this.handWorld
        .set(-h * 0.12 * this.facing, h * 0.39, 0.05)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.flip.rotation.y)
        .add(this.group.position);
      return this.handWorld;
    }
    const hand = this.bodies[this.view].hand;
    this.handWorld
      .copy(hand)
      .setX(hand.x * this.facing)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.flip.rotation.y)
      .add(this.group.position);
    return this.handWorld;
  }

  update(dt: number, x: number, z: number, vx: number, vz: number, camYaw: number): void {
    this.time += dt;
    this.group.position.set(x, 0, z);
    this.flip.rotation.y = camYaw;

    const rightX = Math.cos(camYaw);
    const rightZ = -Math.sin(camYaw);
    const vScreen = vx * rightX + vz * rightZ;
    const vDepth = vx * Math.sin(camYaw) + vz * Math.cos(camYaw);
    if (Math.abs(vScreen) > 0.12) this.facing = vScreen > 0 ? 1 : -1;
    // The generated Nailong plates are authored facing screen-left, while the
    // human profile plates are authored facing +x (screen-right).
    this.flip.scale.x = this.char === 'nailong' ? -this.facing : this.facing;

    const speed = Math.hypot(vx, vz);
    const moving = speed > 0.1;
    // Profile when crossing the screen, front when coming/going — with
    // hysteresis so diagonals don't flicker. Standing still, she faces you.
    if (moving) {
      const aS = Math.abs(vScreen);
      const aD = Math.abs(vDepth);
      if (this.view === 'front' && aS > aD * 1.35) this.setView('side');
      else if (this.view === 'side' && aD > aS * 1.35) this.setView('front');
    } else if (this.view !== 'front') {
      this.setView('front');
    }

    this.gait += dt * (3 + speed * 3.2);
    const amp = moving ? 0.42 : 0;
    this.nearLeg.rotation.z = Math.sin(this.gait) * amp;
    this.farLeg.rotation.z = Math.sin(this.gait + Math.PI) * amp;

    const L = this.layout;
    const bob = moving ? Math.abs(Math.sin(this.gait)) * 0.04 : 0;
    const breath = moving ? 0 : Math.sin((this.time * Math.PI * 2) / 3.1) * 0.006;
    const adultNailong = this.age === 'adult';
    const nailongPhase = this.gait * (adultNailong ? 0.72 : 1.14);
    const step = Math.sin(nailongPhase);
    const impact = Math.abs(step);
    this.deformNailong(moving, nailongPhase);
    this.nailong.position.x = moving ? step * (adultNailong ? 0.055 : 0.035) : 0;
    this.nailong.position.y = moving
      ? impact * (adultNailong ? 0.025 : 0.055)
      : breath;
    this.nailong.rotation.z = moving ? step * (adultNailong ? 0.065 : 0.08) : 0;
    const squash = moving ? impact * (adultNailong ? 0.018 : 0.028) : 0;
    this.nailong.scale.set(1 + squash, 1 - squash, 1);
    const nailongShadow = this.char === 'nailong' ? NAILONG_HEIGHT[this.age] / 1.55 : 1;
    if (this.char === 'nailong') {
      this.shadow.scale.set(
        nailongShadow * (1 + impact * 0.05),
        nailongShadow * (1 - impact * 0.03),
        nailongShadow,
      );
    } else {
      this.shadow.scale.set(1, 1, 1);
    }
    const body = this.bodies[this.view];
    body.torso.position.y = L.torsoBottomY + bob + breath;
    body.head.position.y = L.headY + bob * 1.1 + breath;
    body.torso.rotation.z = moving ? Math.sin(this.gait) * 0.02 : 0;
  }

  private setView(view: ViewId): void {
    if (view === this.view) return;
    this.view = view;
    this.applyView();
  }
}

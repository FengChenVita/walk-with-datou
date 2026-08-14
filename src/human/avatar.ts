/**
 * The walker's identity — which human companion (Mei / An) and which shared-life
 * outfit the player walks as. Chosen in settings, persisted in localStorage,
 * and applied live to the HumanRig without breaking legacy saves.
 */

import { AGE_ORDER, DIRECTION_ORDER, type AgeId, type CharId, type DirId } from '../art/walkerData';

export type { AgeId, CharId, DirId };

const CHAR_KEY = 'wwd.walker.char';
const OUTFIT_KEY = 'wwd.walker.outfit';
const AGE_KEY = 'wwd.walker.age';

// Legacy boy/girl preference maps onto the new cast so existing saves carry over.
const LEGACY_KEY = 'wwd.avatar';

function legacyChar(): CharId | null {
  try {
    const v = localStorage.getItem(LEGACY_KEY);
    if (v === 'girl') return 'mei';
    if (v === 'boy') return 'an';
  } catch {
    /* ignore */
  }
  return null;
}

export function readSavedCharacter(): CharId {
  try {
    const q = new URLSearchParams(window.location.search).get('walker');
    if (q === 'mei' || q === 'an' || q === 'nailong') return q;
    const saved = localStorage.getItem(CHAR_KEY);
    if (saved === 'mei' || saved === 'an' || saved === 'nailong') return saved;
    return legacyChar() ?? 'nailong';
  } catch {
    return 'nailong';
  }
}

export function readSavedOutfit(): DirId {
  try {
    const q = new URLSearchParams(window.location.search).get('outfit');
    if (q && (DIRECTION_ORDER as string[]).includes(q)) return q as DirId;
    const saved = localStorage.getItem(OUTFIT_KEY);
    if (saved && (DIRECTION_ORDER as string[]).includes(saved)) return saved as DirId;
    return 'scout';
  } catch {
    return 'scout';
  }
}

export function readSavedAge(): AgeId {
  try {
    const q = new URLSearchParams(window.location.search).get('age');
    if (q && (AGE_ORDER as string[]).includes(q)) return q as AgeId;
    const saved = localStorage.getItem(AGE_KEY);
    if (saved && (AGE_ORDER as string[]).includes(saved)) return saved as AgeId;
    return 'adult';
  } catch {
    return 'adult';
  }
}

export function saveAgePreference(age: AgeId): void {
  try {
    localStorage.setItem(AGE_KEY, age);
  } catch {
    /* private mode */
  }
}

export function saveCharacterPreference(char: CharId): void {
  try {
    localStorage.setItem(CHAR_KEY, char);
  } catch {
    /* private mode — choice just won't survive a reload */
  }
}

export function saveOutfitPreference(dir: DirId): void {
  try {
    localStorage.setItem(OUTFIT_KEY, dir);
  } catch {
    /* private mode */
  }
}

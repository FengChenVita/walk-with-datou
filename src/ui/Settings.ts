import {
  readSavedBackend,
  saveBackendPreference,
  type PhysicsBackend,
} from '../physics/createPhysics';
import {
  readSavedAge,
  readSavedCharacter,
  readSavedOutfit,
  saveAgePreference,
  saveCharacterPreference,
  saveOutfitPreference,
  type AgeId,
  type CharId,
  type DirId,
} from '../human/avatar';
import { applyStaticI18n, getLang, onLangChange, setLang, t, type Lang } from '../i18n';

/**
 * In-game settings panel: a cog button that opens a small cozy popover for
 * switching the **language** and the **physics engine**. Because the backend is
 * constructed once at boot (the WASM engine must be loaded before the loop
 * starts), changing it persists the choice and reloads the page — the honest,
 * simple approach. Language switches live, no reload.
 *
 * The UI is plain DOM so it overlays the Three.js canvas without pulling in a
 * framework. Markup + styling live in index.html; this wires up behaviour and
 * drives the static i18n (data-i18n attributes).
 */
export interface SettingsOptions {
  /** The backend actually running this session (after any fallback). */
  activeBackend: PhysicsBackend;
  /** Applies the playable walker (Nailong/Mei/An) live (no reload needed). */
  onCharacterChange?: (char: CharId) => void;
  /** Applies the walker's outfit live (no reload needed). */
  onOutfitChange?: (dir: DirId) => void;
  /** Applies the walker's age (kid/teen/adult) live (no reload needed). */
  onAgeChange?: (age: AgeId) => void;
}

/** i18n key for each backend's short "now running" label. */
const BACKEND_LABEL_KEY: Record<PhysicsBackend, 'settings.lite' | 'settings.mujoco'> = {
  placeholder: 'settings.lite',
  mujoco: 'settings.mujoco',
};

export function mountSettings(opts: SettingsOptions): void {
  const button = document.getElementById('settings-button');
  const panel = document.getElementById('settings-panel');
  const radios = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="physics-choice"]'),
  );
  const note = document.getElementById('settings-note');
  const activeTag = document.getElementById('settings-active');
  const langButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.lang-btn[data-lang]'),
  );
  const charButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.char-btn[data-char]'),
  );
  const outfitButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.outfit-btn[data-outfit]'),
  );
  const ageButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.age-btn[data-age]'),
  );

  if (!button || !panel || radios.length === 0) return;

  // Drop a one-off ?param= override so a saved choice sticks across reloads.
  const dropParam = (name: string): void => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name);
      window.history.replaceState(null, '', url);
    }
  };

  // Reflect the active backend in the panel header (localised).
  const refreshActiveTag = (): void => {
    if (activeTag) activeTag.textContent = t(BACKEND_LABEL_KEY[opts.activeBackend]);
  };
  // Reflect the active language on the segmented toggle.
  const refreshLangButtons = (): void => {
    const lang = getLang();
    for (const b of langButtons) b.classList.toggle('active', b.dataset.lang === lang);
  };

  // Apply all static text in the current language at boot.
  applyStaticI18n();
  refreshActiveTag();
  refreshLangButtons();

  // Re-localise everything when the language changes (also fired by the toggle).
  onLangChange(() => {
    applyStaticI18n();
    refreshActiveTag();
    refreshLangButtons();
  });

  for (const b of langButtons) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      setLang(b.dataset.lang as Lang);
    });
  }

  // Playable walker (Nailong / Mei / An) — saved and applied live.
  let character = readSavedCharacter();
  const refreshCharButtons = (): void => {
    for (const b of charButtons) b.classList.toggle('active', b.dataset.char === character);
  };
  refreshCharButtons();
  for (const b of charButtons) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = b.dataset.char as CharId | undefined;
      if (next !== 'nailong' && next !== 'mei' && next !== 'an') return;
      if (next === character) return;
      character = next;
      saveCharacterPreference(next);
      dropParam('walker');
      refreshCharButtons();
      opts.onCharacterChange?.(next);
    });
  }

  // Walker outfit (5 directions) — saved and applied live.
  let outfit = readSavedOutfit();
  const refreshOutfitButtons = (): void => {
    for (const b of outfitButtons) b.classList.toggle('active', b.dataset.outfit === outfit);
  };
  refreshOutfitButtons();
  for (const b of outfitButtons) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = b.dataset.outfit as DirId | undefined;
      if (!next || next === outfit) return;
      outfit = next;
      saveOutfitPreference(next);
      dropParam('outfit');
      refreshOutfitButtons();
      opts.onOutfitChange?.(next);
    });
  }

  // Walker age (kid / teen / adult) — saved and applied live.
  let age = readSavedAge();
  const refreshAgeButtons = (): void => {
    for (const b of ageButtons) b.classList.toggle('active', b.dataset.age === age);
  };
  refreshAgeButtons();
  for (const b of ageButtons) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = b.dataset.age as AgeId | undefined;
      if (!next || next === age) return;
      age = next;
      saveAgePreference(next);
      dropParam('age');
      refreshAgeButtons();
      opts.onAgeChange?.(next);
    });
  }

  // Pre-select the *saved* choice (what will load next reload), falling back to
  // whatever is actually running this session.
  const selected = readSavedBackend() ?? opts.activeBackend;
  for (const r of radios) r.checked = r.value === selected;

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(panel.hidden);
  });

  // Close when clicking outside the panel.
  document.addEventListener('click', (e) => {
    if (panel.hidden) return;
    if (e.target instanceof Node && (panel.contains(e.target) || button.contains(e.target))) return;
    setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      const choice = radio.value as PhysicsBackend;
      const needsReload = choice !== opts.activeBackend;

      if (note) {
        if (choice === 'mujoco' && opts.activeBackend !== 'mujoco') {
          note.textContent = t('settings.reloadMujoco');
        } else if (needsReload) {
          note.textContent = t('settings.reloading');
        } else {
          note.textContent = '';
        }
      }

      saveBackendPreference(choice);

      if (needsReload) {
        // Drop any one-off ?physics= override so the saved choice takes effect.
        const url = new URL(window.location.href);
        url.searchParams.delete('physics');
        // Brief delay so the user sees the note before the reload.
        window.setTimeout(() => window.location.replace(url.toString()), 350);
      }
    });
  }
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ThemeLab } from '@/components/dev/ThemeLab';
import {
  applyThemePalette,
  clearThemePaletteOverrides,
  DEFAULT_THEME_PALETTE,
  loadThemeLabState,
  isThemePaletteAccessible,
  saveThemeLabState,
  THEME_LAB_OPEN_EVENT,
  type ThemeLabState,
  type ThemePalette,
  type ThemePreset,
} from '@/lib/theme-lab';

const createPresetId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `saved-${Date.now()}`;

export function ThemeLabGate() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ThemeLabState>({
    version: 1,
    palette: { ...DEFAULT_THEME_PALETTE },
    customPresets: [],
    hasOverrides: false,
  });
  const lastSafeStateRef = useRef<ThemeLabState>(state);

  useEffect(() => {
    const storedState = loadThemeLabState();
    setState(storedState);
    lastSafeStateRef.current = storedState;
    if (storedState.hasOverrides) applyThemePalette(storedState.palette);
  }, []);

  useEffect(() => {
    const openLab = () => setOpen(true);
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const usesCommandKey = event.ctrlKey || event.metaKey;
      if (!usesCommandKey || !event.shiftKey || event.key.toLowerCase() !== 'l') return;
      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener(THEME_LAB_OPEN_EVENT, openLab);
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => {
      window.removeEventListener(THEME_LAB_OPEN_EVENT, openLab);
      window.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, []);

  const commitState = useCallback((nextState: ThemeLabState) => {
    setState(nextState);
    lastSafeStateRef.current = nextState;
    saveThemeLabState(nextState);
  }, []);

  const updatePalette = useCallback((palette: ThemePalette) => {
    applyThemePalette(palette);
    setState((current) => {
      const nextState = { ...current, palette, hasOverrides: true };
      if (isThemePaletteAccessible(palette)) {
        lastSafeStateRef.current = nextState;
        saveThemeLabState(nextState);
      }
      return nextState;
    });
  }, []);

  const savePreset = useCallback((name: string) => {
    setState((current) => {
      const preset: ThemePreset = {
        id: createPresetId(),
        name,
        palette: { ...current.palette },
      };
      const nextState = { ...current, customPresets: [preset, ...current.customPresets] };
      saveThemeLabState(nextState);
      return nextState;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setState((current) => {
      const nextState = {
        ...current,
        customPresets: current.customPresets.filter((preset) => preset.id !== id),
      };
      saveThemeLabState(nextState);
      return nextState;
    });
  }, []);

  const restoreDefaults = useCallback(() => {
    clearThemePaletteOverrides();
    commitState({
      ...state,
      palette: { ...DEFAULT_THEME_PALETTE },
      hasOverrides: false,
    });
  }, [commitState, state]);

  const closeLab = useCallback(() => {
    if (!isThemePaletteAccessible(state.palette)) {
      const safeState = lastSafeStateRef.current;
      applyThemePalette(safeState.palette);
      setState(safeState);
    }
    setOpen(false);
  }, [state.palette]);

  return (
    <ThemeLab
      open={open}
      palette={state.palette}
      customPresets={state.customPresets}
      hasOverrides={state.hasOverrides}
      onClose={closeLab}
      onPaletteChange={updatePalette}
      onSavePreset={savePreset}
      onDeletePreset={deletePreset}
      onRestoreDefaults={restoreDefaults}
    />
  );
}

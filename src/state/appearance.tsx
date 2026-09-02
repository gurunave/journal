import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_THEME_ID, ThemeContext, themeFor, THEMES } from '../lib/theme';

const KEY = 'journal.theme';

type Appearance = {
  themeId: string;
  setThemeId: (id: string) => void;
  /** False until the stored choice has been read, so nothing flashes the default. */
  ready: boolean;
};

const AppearanceContext = createContext<Appearance>({
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
  ready: false,
});

/**
 * The chosen theme lives on the device rather than in the account: it is a
 * preference about this phone's screen, not a fact about the team, and writing
 * it locally means switching themes never waits on the network.
 */
export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setId] = useState(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((stored) => {
        // An unknown id (a theme removed since it was chosen) falls back rather
        // than leaving the app themeless.
        if (alive && stored && THEMES.some((t) => t.id === stored)) setId(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setThemeId = useCallback((id: string) => {
    setId(id);
    void AsyncStorage.setItem(KEY, id).catch(() => {});
  }, []);

  const appearance = useMemo(() => ({ themeId, setThemeId, ready }), [themeId, setThemeId, ready]);
  const theme = useMemo(() => themeFor(themeId), [themeId]);

  return (
    <AppearanceContext.Provider value={appearance}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): Appearance {
  return useContext(AppearanceContext);
}

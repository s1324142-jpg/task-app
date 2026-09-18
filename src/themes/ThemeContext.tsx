import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createThemeStyles } from '../ui/theme';
import { AppTheme, ThemeId, isThemeId, themesById } from '.';

const STORAGE_KEY = 'suke:appearance:theme:v1';
type ThemeContextValue = {
  theme: AppTheme; selectedThemeId: ThemeId; previewThemeId: ThemeId | null;
  styles: ReturnType<typeof createThemeStyles>;
  previewTheme: (id: ThemeId) => void; clearPreview: () => void; applyTheme: (id: ThemeId) => Promise<void>;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('default');
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then(value => { if (isThemeId(value)) setSelectedThemeId(value); }).catch(() => undefined);
  }, []);
  const theme = themesById[previewThemeId ?? selectedThemeId];
  const styles = useMemo(() => createThemeStyles(theme), [theme]);
  const previewTheme = useCallback((id: ThemeId) => setPreviewThemeId(id), []);
  const clearPreview = useCallback(() => setPreviewThemeId(null), []);
  const applyTheme = useCallback(async (id: ThemeId) => { await AsyncStorage.setItem(STORAGE_KEY, id); setSelectedThemeId(id); setPreviewThemeId(null); }, []);
  const value = useMemo<ThemeContextValue>(() => ({
    theme, styles, selectedThemeId, previewThemeId,
    previewTheme, clearPreview, applyTheme,
  }), [theme, styles, selectedThemeId, previewThemeId, previewTheme, clearPreview, applyTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is missing');
  return context;
}

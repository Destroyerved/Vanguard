import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    try {
      localStorage.setItem('vanguard_theme', 'dark');
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'dark',
        setTheme: () => {},
        toggleTheme: () => {},
        isDark: true,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark' as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: true,
    };
  }
  return context;
}


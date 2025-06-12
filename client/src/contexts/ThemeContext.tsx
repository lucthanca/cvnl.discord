import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'light' | 'dark' | 'purple' | 'blue' | 'green';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') as ThemeType;
    if (savedTheme && ['light', 'dark', 'purple', 'blue', 'green'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-theme', theme);
    
    // Apply theme classes to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'purple', 'blue', 'green');
    root.classList.add(theme);
  }, [theme]);

  const isDark = theme === 'dark' || theme === 'purple' || theme === 'blue';

  const value = React.useMemo(() => ({
    theme,
    setTheme,
    isDark
  }), [theme, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

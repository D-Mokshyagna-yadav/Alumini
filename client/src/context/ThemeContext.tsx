import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = 'auto' | Theme;

interface ThemeContextType {
    theme: Theme; // effective theme (light|dark) applied to document
    mode: ThemeMode; // user preference: auto|light|dark
    toggleTheme: () => void; // cycle: auto -> light -> dark -> auto
    setTheme: (mode: ThemeMode) => void; // set preference mode
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('themeMode') as ThemeMode | null;
            return saved || 'auto';
        }
        return 'auto';
    });

    const getSystemTheme = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' as Theme : 'light' as Theme;

    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'light';
        return mode === 'auto' ? getSystemTheme() : (mode as Theme);
    });

    // keep theme in sync whenever mode or system preference changes
    useEffect(() => {
        const root = window.document.documentElement;
        const apply = (effective: Theme) => {
            root.classList.remove('light', 'dark');
            root.classList.add(effective);
            setThemeState(effective);
        };

        if (mode === 'auto') {
            const system = getSystemTheme();
            apply(system);

            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const onChange = () => apply(getSystemTheme());
            try {
                mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange as any);
            } catch (e) {
                // older browsers fallback
                (mq as any).addListener(onChange as any);
            }

            localStorage.setItem('themeMode', 'auto');
            return () => {
                try {
                    mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange as any);
                } catch (e) {
                    try { (mq as any).removeListener(onChange as any); } catch (e) { }
                }
            };
        } else {
            apply(mode as Theme);
            localStorage.setItem('themeMode', mode);
        }
    }, [mode]);

    const toggleTheme = () => {
        // cycle: auto -> light -> dark -> auto
        setMode(prev => prev === 'auto' ? 'light' : prev === 'light' ? 'dark' : 'auto');
    };

    const setTheme = (newMode: ThemeMode) => {
        setMode(newMode);
    };

    return (
        <ThemeContext.Provider value={{ theme, mode, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

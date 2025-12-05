
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'var(--background)',
                surface: 'var(--surface)',
                primary: 'var(--primary)',
                secondary: 'var(--secondary)',
                accent: 'var(--accent)',
                success: 'var(--success)',
                warning: 'var(--warning)',
                error: 'var(--error)',
                text: 'var(--text)',
                muted: 'var(--muted)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Roboto Mono', 'monospace'],
            },
            keyframes: {
                'lifeline-shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-8px)' },
                    '75%': { transform: 'translateX(8px)' },
                },
                'lifeline-pop': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.15)' },
                },
                'lifeline-pulse': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.8', transform: 'scale(1.05)' },
                },
                'lifeline-slide': {
                    '0%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(10px)' },
                    '100%': { transform: 'translateX(0)' },
                },
                'flame-flicker': {
                    '0%, 100%': {
                        opacity: '1',
                        transform: 'scale(1)',
                        filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.8))'
                    },
                    '25%': {
                        opacity: '0.9',
                        transform: 'scale(1.05) translateY(-2px)',
                        filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.9))'
                    },
                    '50%': {
                        opacity: '1',
                        transform: 'scale(1.08)',
                        filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.7))'
                    },
                    '75%': {
                        opacity: '0.95',
                        transform: 'scale(1.03) translateY(-1px)',
                        filter: 'drop-shadow(0 0 11px rgba(251, 146, 60, 0.85))'
                    },
                },

            },
            animation: {
                'lifeline-shake': 'lifeline-shake 0.4s ease-in-out',
                'lifeline-pop': 'lifeline-pop 0.3s ease-out',
                'lifeline-pulse': 'lifeline-pulse 1.5s ease-in-out infinite',
                'lifeline-slide': 'lifeline-slide 0.4s ease-in-out',
                'flame-flicker': 'flame-flicker 1.2s ease-in-out infinite',

            },
        },
    },
    plugins: [],
}

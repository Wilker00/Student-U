/** Shared Tailwind theme for CDN fallback (index.html standalone loads). */
window.studentUTailwindConfig = {
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#FFFFFF',
          100: '#F7F7F7',
          200: '#EBEBEB',
          300: '#DCDCDC',
          400: '#ABABAB',
        },
        ink: {
          50: '#888888',
          100: '#666666',
          200: '#444444',
          300: '#2A2A2A',
          400: '#1A1A1A',
          500: '#0D0D0D',
        },
        accent: {
          red: '#E53935',
          blue: '#1E88E5',
          yellow: '#FDD835',
          warm: '#C4704A',
          muted: '#8D6E63',
          pink: '#F03893',
          cyan: '#29C5F6',
          orange: '#FF8C3A',
          teal: '#1B8B77',
        },
      },
    },
  },
};

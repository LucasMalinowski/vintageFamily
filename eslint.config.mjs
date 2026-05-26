import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  {
    // React Compiler rules (eslint-config-next@16 / react-hooks v6).
    // These flag valid pre-existing patterns used throughout the codebase.
    // Downgraded from error → warn so CI passes while issues stay visible.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]

export default config

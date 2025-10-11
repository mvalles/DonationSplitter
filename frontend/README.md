# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Donation Splitter UI Notes

This frontend has been adapted into a public transparency dashboard for a DonationSplitter contract. Key concepts:

- Pending: Unwithdrawn allocation per beneficiary (`pendingEth` inside the contract logic).
- Withdrawn: Historical amount already withdrawn (tracked via new `withdrawnEth` mapping).
- Lifetime: Pending + Withdrawn.
- Percent column still reflects share of distribution (BPS / 10000).

### Replacing Placeholder Beneficiaries
Update `src/beneficiaries.ts`:
- Replace `address` with verified beneficiary payout addresses.
- Keep `bps` sum equal to 10000 (100%).
- Update `logoSrc` to an SVG placed under `public/logos/` (opt). Provide an accessible color-agnostic version if possible.

### Adding / Removing Beneficiaries
If you change the number of beneficiaries you must:
1. Update the backend Ignition deployment (beneficiaries array passed to constructor).
2. Ensure BPS total = 10000.
3. Frontend automatically adapts (multicall uses `beneficiaryTotals`). No manual hook changes needed now.

### Testnet/Mainnet Safety
Inline chip indicates current chain. Mainnet donations trigger a confirmation modal. Network mismatch disables donate actions.

### Styling / Theming
Global variables in `src/index.css` (`:root`) control palette and radii. Adjust `--accent` and `--accent-alt` for brand colors.

### Extending Metrics
You can add more views:
- Historical timeseries: index events (DonationRecorded, Withdrawn) off-chain and build a chart.
- Proof export: generate a Merkle tree for pending balances (verifiable snapshot).

### Building
Run the frontend dev server:
```
npm install
npm run dev
```
Adjust Vite config if deploying under a subpath (`base` option).
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

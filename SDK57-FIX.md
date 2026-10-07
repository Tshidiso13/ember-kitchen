# Expo SDK 57 TypeScript fix

This revision fixes the VS Code/TypeScript errors reported in `App.tsx`.

## What changed

- Mobile dependencies are aligned with the official Expo SDK 57 TypeScript template:
  - `expo ~57.0.27`
  - `react 19.2.3`
  - `react-native 0.86.3`
  - `@types/react ~19.2.2`
  - `typescript ~6.0.3`
- `tsconfig.json` explicitly enables `jsx: react-jsx` and only checks the mobile source tree.
- `orderLine` is now a valid `ViewStyle` instead of a text style.
- Removed a duplicate `minWidth` style declaration.

## Important if you already ran npm install on the older archive

The old `node_modules` may still contain TypeScript 7.x. From the mobile project root in PowerShell, run:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm.cmd install
npx.cmd expo install --fix
npx.cmd expo start -c
```

If VS Code still displays stale red errors after reinstalling dependencies:

1. Press `Ctrl+Shift+P`.
2. Run `TypeScript: Select TypeScript Version` and choose `Use Workspace Version`.
3. Run `TypeScript: Restart TS Server`.

Do not upgrade this project to another Expo SDK while using Expo Go/client 57 for this project.

# GreenQuest (G-Quest) 🌍

A student-team sustainability gamification project: small everyday challenges, visible progress, and educational environmental-impact insights.

This repository contains the **GreenQuest NOVA React Native + Expo prototype**, adapted from our [eight-screen Figma design](https://www.figma.com/design/bfsT5gInmbXH07rarX9nSr).

## Technology

- **Expo SDK 58**, React Native, TypeScript
- **@expo/vector-icons** (Ionicons)
- **AsyncStorage** for local, on-device demonstration data
- Android & iPhone via Expo Go (with compatible SDK)

## Run locally (Ubuntu, macOS, Windows)

Use Node.js 22 LTS or newer supported by Expo.

```bash
git clone https://github.com/Sayeed843/GQuest.git
cd GQuest
npm install
npx expo install --fix
npx expo start --clear
```

Scan the QR code with **Expo Go** on your Android or iOS device. Keep the laptop and phone on the same network. If your network blocks local connections, try `npx expo start --tunnel`.

To diagnose dependency issues:

```bash
npx expo-doctor@latest
npm run typecheck
```

The app's source entry point is `index.ts` → `App.tsx`. There is no need to create a second Expo app or replace these files.

## Screens

| # | Figma design | Function |
|---|---|---|
| 1 | Welcome & Onboarding | Enter GreenQuest |
| 2 | Home Dashboard | Overview of active quest and XP |
| 3 | Lifestyle Assessment | Four questions about daily habits |
| 4 | Carbon Footprint Insight | Clearly marked example estimate |
| 5 | Smart Challenge Recommendations | Demo rule-based personalization |
| 6 | Green Challenges | Browse, search, filter quests |
| 7 | Challenge Details | Inspect and join a quest |
| 8 | Challenge Progress — Completed | Log activity, view rewards |

See [FIGMA_MAPPING.md](FIGMA_MAPPING.md) for frame IDs and interaction mapping.

## Prototype behavior & limitations

- **No account is needed.** Demo answers and progress are saved locally via AsyncStorage.
- The demo includes three quests: **Car-free commute**, **Plant-powered pair**, and **Switch it off**.
- XP is awarded when a quest reaches its target, not for each tap.
- **Carbon data (including 240 kg CO₂e/month and ~1.8 kg avoided) is illustrative, not calculated or verified.** Do not present it as a measured result.
- Recommendations use simple **rules, not machine learning**.
- The screens are native responsive interpretations of the Figma mockups; decorative assets are approximations, not guaranteed pixel-perfect copies.
- This project has not yet been verified on every Android/iPhone device. Please test your own device before demonstrating.

## Team workflow

Keep `main` stable. For subsequent work, create feature branches such as `feature/quest-progress`, push your changes, and open a pull request for review. Commit code and docs only; do not commit `node_modules/`, private user data, personal files, credentials, or build artifacts. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

Next milestones: separate screen files and reusable components, improved accessibility, validated environmental calculations, documented data provenance, user engagement evaluation, and optional scientifically justified recommendation algorithms.

**License:** no open-source license has been selected yet; the team should decide before granting reuse rights.

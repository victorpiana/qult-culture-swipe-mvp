<div align="center">
  <img width="585" height="475" alt="image" src="https://github.com/user-attachments/assets/fb5e2098-1810-4ef0-9e31-a62f9748482b" />

# QULT: Gamified Social Micro-Learning (MVP)

> This repository contains the MVP for a gamified micro-learning mobile application. Developed as a solo full-stack project, QULT aims to transform passive scrolling into active learning by hijacking the dopamine-driven UX of platforms like TikTok and applying it to general culture, science, and history.

[![Framework](https://img.shields.io/badge/Framework-React_Native-61DAFB.svg)](https://reactnative.dev/)
[![Toolchain](https://img.shields.io/badge/Toolchain-Expo-black.svg)](https://expo.dev/)
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg)](https://supabase.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Animations](https://img.shields.io/badge/Animations-Reanimated-blue.svg)](https://docs.swmansion.com/react-native-reanimated/)

---

## 🎯 Project Overview & The Vision

Modern users spend hours daily consuming short-form content, often addicted to the UI's instant gratification but left with a feeling of wasted time. **QULT** was born from a simple product hypothesis: *What if we reduced the friction of learning to zero by using the exact same interface?*

The goal was to combine bite-sized knowledge cards, engaging native-like vertical swipe gestures, and robust gamification to make daily intellectual enrichment as effortless as scrolling through social media.

### 💡 Lessons Learned & The Pivot

While I am incredibly proud of the technical execution — building a fully functional, real-time, full-stack application as a solo developer — this project served as a massive **wake-up call**.

During development, highly capitalized competitors entered the micro-learning market with similar concepts. It became obvious that **a flawless technical product is only 20% of a startup's success**. The remaining 80% relies on Go-To-Market strategy, user acquisition, competitive analysis, and clear product positioning.

Realizing that continuing to code features without a robust business strategy was a classic engineering trap, **I made the pragmatic decision to put the commercial launch of QULT on pause.** This experience solidified my desire to transition from a pure technical builder to a **Product Manager and Entrepreneur**. It is exactly why I am now pivoting toward a Master in Management at a top-tier business school: to acquire the strategic and business acumen necessary to bridge the gap between engineering execution and market success.

---

## ✨ Core Features (MVP)

I architected and developed the entire application from scratch, focusing on seamless UX and a scalable real-time backend:

- **Infinite Knowledge Feed:** A high-performance vertical flatlist featuring TikTok-style swiping, implemented with composed gesture handlers (double-tap to like, long-press to read detailed articles).
- **Gamified Daily Quiz:** A daily challenge dynamically generated from the database. It features streak tracking, performance analytics, and custom progress charts to drive Daily Active Users (DAU).
- **Real-Time Social Ecosystem:** A complete social graph allowing users to follow friends, view dynamic leaderboards, and engage in **real-time chat** powered by WebSockets.
- **Frictionless Sharing:** In-app content sharing directly into the chat system, seamlessly blending content discovery with social interaction.
- **User Analytics Dashboard:** Visualized personal data (interests broken down by categories via pie charts, historical win rates) to give users a sense of progression.

---

## 🛠️ Tech Stack

As the sole builder on this project, I managed the entire stack:

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React Native & Expo | Rapid cross-platform deployment |
| **Backend & BaaS** | Supabase (PostgreSQL) | Database, Auth & Real-time Subscriptions |
| **Animations & Gestures** | React Native Reanimated & Gesture Handler | 60fps native-like fluid interactions |
| **Performance** | Expo-Image | Advanced memory/disk caching for infinite scrolling |

---

## 🚀 How to Test (Local Setup)

To run this project locally on your machine:

**1. Clone the repository:**
```bash
git clone https://github.com/victorpiana/qult-culture-swipe-mvp.git
cd qult-culture-swipe-mvp
```

**2. Install dependencies:**
```bash
npm install
```
> Ensure you have the Expo CLI installed globally.

**3. Start the Expo server:**
```bash
npx expo start
```

**4. Run on device:**
Scan the generated QR code with the **Expo Go** app on your iOS or Android device, or press `i` / `a` to run on a local emulator.

---

## 👥 Author

**Victor PIANA** — Sole Developer / Product Architect


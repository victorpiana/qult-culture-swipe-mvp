<div align="center">
  <img width="2816" height="1536" alt="icon" src="https://github.com/user-attachments/assets/abff9331-468c-4d75-977a-280ad5ae6df9" />


  # QULT (Culture Swipe)

  **Transforming passive scrolling into active learning. A gamified, social micro-learning platform built for the TikTok generation.**
</div>

---

## 👁️ The Vision

Modern users spend hours daily consuming short-form content, often left with a feeling of wasted time but addicted to the UI's instant gratification. **QULT** was born from a simple product hypothesis: *What if we hijacked the dopamine-driven UX of infinite vertical scrolling and applied it to general culture, history, science, and art?*

The goal was to reduce the friction of learning to zero. By combining bite-sized knowledge cards, engaging native-like swipe gestures, and robust gamification, QULT aims to make daily intellectual enrichment as effortless as scrolling through social media.

## ✨ Core Features

I architected and developed the entire application from scratch, focusing on a seamless user experience and a scalable backend.

- **Infinite Knowledge Feed:** A high-performance vertical flatlist featuring TikTok-style swiping. Implemented composed gesture handlers (double-tap to like, long-press to deep-dive into detailed articles).
- **Gamified Daily Quiz:** A daily challenge dynamically generated from the database. Features include streak tracking, performance analytics, and custom progress charts to drive user retention (DAU).
- **Real-Time Social Ecosystem:** A complete social graph allowing users to follow friends, view leaderboards, and engage in **real-time chat** powered by WebSockets.
- **Frictionless Sharing:** In-app content sharing directly into the chat system, seamlessly blending content discovery with social interaction.
- **User Analytics Dashboard:** Visualized personal data (interests broken down by categories via pie charts, historical win rates) to give users a sense of progression.

## 🛠️ Tech Stack

As the sole builder on this project, I managed the entire stack — from UI/UX design to backend database architecture.

| Layer | Technology |
|---|---|
| **Frontend** | React Native, Expo |
| **Animations & Interactions** | React Native Reanimated, React Native Gesture Handler (60fps native-like fluidity) |
| **Backend & BaaS** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Email/Password, Session persistence) |
| **Real-Time** | Supabase Real-time Subscriptions (chat ecosystem) |
| **Performance** | `expo-image` for advanced memory/disk caching during infinite scrolling |

## 💡 Lessons Learned & The Pivot

While I am incredibly proud of the technical execution of QULT — successfully building a fully functional, real-time, full-stack application as a solo engineer — this project served as a massive **wake-up call**.

During the late stages of development, I observed highly capitalized competitors entering the micro-learning market with similar concepts. It became glaringly obvious that **a flawless technical product is only 20% of a startup's success**. The remaining 80% relies on Go-To-Market strategy, user acquisition, competitive analysis, monetization models, and clear product positioning.

I realized that continuing to code features without a robust business strategy was a classic engineering trap. Therefore, **I made the pragmatic decision to put the commercial launch of QULT on pause.**

This experience was a turning point. It solidified my desire to transition from a pure technical builder to a **Product Manager and Entrepreneur**. 

> QULT stands as proof of my ability to build. My next step is learning how to sell and scale.

## 🚀 Local Setup

To run this project locally:

**1. Clone the repository:**
```bash
git clone https://github.com/yourusername/culture-swipe.git
cd culture-swipe
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

<div align="center">
  <em>Built with passion, pragmatic thinking, and a focus on product value.</em>
</div>

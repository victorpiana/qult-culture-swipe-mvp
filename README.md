<div align="center">
  <img width="293" height="238" alt="image" src="https://github.com/user-attachments/assets/fb5e2098-1810-4ef0-9e31-a62f9748482b" />

# QULT: Gamified Social Micro-Learning (MVP)

> Ce dépôt contient le MVP (Minimum Viable Product) d'une application mobile de micro-learning développée en solo en parallèle de mes études d'ingénieur. L'objectif de ce prototype était de transformer le "doom-scrolling" (défilement passif négatif) en apprentissage actif, en reprenant l'UX addictive des plateformes comme TikTok pour l'appliquer à la culture générale.

[![Framework](https://img.shields.io/badge/Framework-React_Native-61DAFB.svg)](https://reactnative.dev/)
[![Toolchain](https://img.shields.io/badge/Toolchain-Expo-black.svg)](https://expo.dev/)
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg)](https://supabase.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Animations](https://img.shields.io/badge/Animations-Reanimated-blue.svg)](https://docs.swmansion.com/react-native-reanimated/)

---

## 🎯 Contexte & Leçons Apprises

Ce projet a initialement commencé comme un side-project. Ayant identifié un besoin non couvert sur le marché — aucune application n'appliquait la mécanique fluide du "swipe" au contenu éducatif —, j'ai développé ce MVP pour valider l'idée et tester la viabilité technique d'une telle interface.

Cependant, pris par la charge de travail de mes études et confronté à certaines difficultés techniques (notamment l'architecture d'une base de données d'images scalable et peu coûteuse), j'ai mis le développement en pause.

Quelques mois plus tard, j'ai eu un véritable **wake-up call** : je suis tombé sur la publicité d'une startup venant de lever des fonds pour lancer une application sur un concept identique.

Ce fut une leçon d'entrepreneuriat fondatrice. J'ai compris à la dure qu'**une bonne idée et une excellente exécution technique ne valent rien sans une stratégie Go-To-Market et une vitesse de lancement optimale**. Cette prise de conscience est la raison principale qui motive aujourd'hui ma volonté d'élargir mon profil technique vers des compétences purement stratégiques et "Business", afin d'exceller en tant que Product Manager.

---

## ✨ Fonctionnalités Principales (Périmètre du MVP)

Le prototype actuel est fonctionnel et permet les actions suivantes :

- **Feed de Savoir Infini :** Une FlatList verticale reprenant l'UX TikTok. L'utilisateur peut interagir via des gestes combinés (double-tap pour liker, appui long pour lire la fiche détaillée).
- **Quiz Quotidien Gamifié :** Un défi journalier (le même pour tous les utilisateurs afin de favoriser la comparaison sociale) généré dynamiquement. Suivi des séries (*streaks*) pour booster la rétention (DAU).
- **Écosystème Social Temps Réel :** Un graphe social permettant de suivre des amis, de consulter un classement dynamique et de discuter via une **messagerie en temps réel** (WebSockets).
- **Dashboard Analytique :** Visualisation des données de progression personnelles (répartition des intérêts par catégorie via des graphiques type camembert).

---

## 🗺️ Product Roadmap & Vision Stratégique (Backlog)

Le développement ayant été gelé pour des raisons stratégiques, la vision complète du produit (telle qu'imaginée lors de la phase d'idéation) comprend un backlog riche, pensé pour la rétention et la monétisation :

- **UX Matricielle (Swipe 2D) :**
  - *Vertical :* Découverte de nouveaux sujets (algorithme aléatoire ou "Pour Toi").
  - *Horizontal :* Approfondissement (swiper à droite sur une carte "Seconde Guerre Mondiale" propose d'autres faits de la même sous-catégorie).
- **Algorithme de Répétition Espacée :** Remplacement du like basique par un swipe gauche/droite signifiant "Je connais déjà" (ne plus afficher) ou "À revoir" (adapter la difficulté et reproposer plus tard).
- **Scalabilité du Contenu (Supply) :** Dilemme identifié entre la création de contenu manuelle (qualité) et l'ouverture à l'UGC (*User Generated Content* - volume). La roadmap prévoyait un modèle hybride avec une modération communautaire stricte pour éviter les doublons et les hors-sujets.
- **Stratégie de Monétisation (Freemium) :**
  - Phase 1 : Lancement 100% gratuit avec toutes les fonctionnalités pour maximiser l'acquisition utilisateur (Product-Led Growth).
  - Phase 2 : Modèle Freemium (abonnement pour des statistiques d'apprentissage avancées, quiz illimités, suppression des publicités).

---

## 🛠️ Stack Technique

| Couche | Technologie | Justification |
|---|---|---|
| **Frontend** | React Native & Expo | Développement et déploiement multiplateforme rapides |
| **Backend & BaaS** | Supabase (PostgreSQL) | Base de données relationnelle, authentification & abonnements temps réel |
| **Animations** | Reanimated & Gesture Handler | Fluidité native 60fps sur les interactions de swipe complexes |

---

## 🚀 Comment Tester (Installation Locale)

Pour lancer le projet en local sur votre machine ou votre téléphone :

**1. Cloner le dépôt :**
```bash
git clone https://github.com/victorpiana/qult-culture-swipe-mvp.git
cd qult-culture-swipe-mvp
```

**2. Installer les dépendances :**
```bash
npm install
```

**3. Lancer le serveur :**
```bash
npx expo start
```

**4. Tester sur appareil :**
Scannez le QR code généré avec l'application **Expo Go** sur votre smartphone (iOS/Android), ou utilisez un émulateur local.

---

## 👥 Auteur

**Victor PIANA** — Développeur / Architecte Produit


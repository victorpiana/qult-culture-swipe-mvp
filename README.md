<div align="center">
  <img width="293" height="238" alt="image" src="https://github.com/user-attachments/assets/fb5e2098-1810-4ef0-9e31-a62f9748482b" />
  
# QULT: Gamified Social Micro-Learning (MVP)

> Ce dépôt contient le MVP (Minimum Viable Product) d'une application mobile de micro-learning développée en solo en parallèle de mes études d'ingénieur. L'objectif de ce prototype était de transformer le défilement passif en apprentissage actif en reprenant l'UX addictive des plateformes comme TikTok pour l'appliquer à la culture générale.

[![Framework](https://img.shields.io/badge/Framework-React_Native-61DAFB.svg)](https://reactnative.dev/)
[![Toolchain](https://img.shields.io/badge/Toolchain-Expo-black.svg)](https://expo.dev/)
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg)](https://supabase.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Animations](https://img.shields.io/badge/Animations-Reanimated-blue.svg)](https://docs.swmansion.com/react-native-reanimated/)

---

## 🎯 Contexte & Leçons Apprises

Ce projet a initialement commencé comme un side-project à but lucratif. Ayant identifié un besoin non couvert sur le marché — aucune application n'appliquait la mécanique du "swipe" au contenu éducatif —, j'ai développé ce MVP pour valider l'idée et tester la viabilité technique.

Cependant, pris par la charge de travail de mes études et confronté à certaines difficultés techniques (notamment l'architecture d'une base de données d'images scalable et peu coûteuse), j'ai mis le développement en pause. 

Quelques mois plus tard, j'ai eu un véritable **wake-up call** : je suis tombé sur la publicité d'une startup venant de lancer une application sur un concept identique.

Ce fut une leçon d'entrepreneuriat fondatrice. J'ai compris à la dure qu'**une bonne idée et une excellente exécution technique ne valent rien sans une stratégie Go-To-Market et une vitesse de lancement optimale**. Cette prise de conscience est la raison principale qui motive aujourd'hui ma volonté d'élargir mon profil technique vers des compétences purement stratégiques et "Business", afin d'exceller en tant que Product Manager.

---

## ✨ Fonctionnalités Principales (MVP)

Le prototype fonctionnel permet les actions suivantes au sein de l'application :

* **Feed de Savoir Infini :** Une FlatList verticale reprenant l'UX TikTok. L'utilisateur peut interagir via des gestes combinés (double-tap pour liker, appui long pour lire l'article détaillé).
* **Quiz Quotidien Gamifié :** Un défi journalier généré dynamiquement depuis la base de données, avec un suivi des séries (*streaks*) pour booster la rétention (DAU).
* **Écosystème Social Temps Réel :** Un graphe social permettant de suivre des amis, de consulter un classement dynamique et de discuter via une **messagerie en temps réel** (WebSockets).
* **Dashboard Analytique :** Visualisation des données de progression personnelles (répartition des intérêts par catégorie via des graphiques).

---

## 🛠️ Stack Technique

* **Frontend:** **React Native & Expo** (Choisi pour un développement et un déploiement multiplateforme rapides).
* **Backend & BaaS:** **Supabase** (Utilisé pour la base de données PostgreSQL, l'authentification sécurisée, et les abonnements temps réel).
* **Animations:** **Reanimated & Gesture Handler** (Pour garantir une fluidité native de 60fps sur les interactions de swipe complexes).

---

## 🚀 Comment Tester (Installation Locale)

Pour lancer le projet en local sur votre machine ou votre téléphone :

1. **Cloner le dépôt :**
   ```bash
   git clone [https://github.com/victorpiana/qult-culture-swipe-mvp.git](https://github.com/victorpiana/qult-culture-swipe-mvp.git)
   cd qult-culture-swipe-mvp
Installer les dépendances :

Bash
npm install
Lancer le serveur :

Bash
npx expo start
Scannez le QR code généré avec l'application Expo Go sur votre smartphone (iOS/Android), ou utilisez un émulateur local.

👥 Auteur
Développeur / Architecte Produit :

Victor PIANA

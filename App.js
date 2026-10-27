import React, { useEffect, useState, useCallback, memo, useRef, useMemo } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Dimensions, 
  StatusBar, Modal, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Share 
} from 'react-native';
import { Image } from 'expo-image';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, ProgressChart } from 'react-native-chart-kit';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withDelay, runOnJS, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { MOCK_CARDS, MOCK_QUIZ_QUESTIONS, MOCK_LEADERBOARD, MOCK_FRIENDS, MOCK_MESSAGES } from './data/mockData';
import { COLORS } from './constants/theme';

// --- CONFIGURATION SUPABASE ---
const supabaseUrl = 'https://ukuddpsavypcokdfygze.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWRkcHNhdnlwY29rZGZ5Z3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTcyODcsImV4cCI6MjA4MjY5MzI4N30.kAsDasWahNqmRx_EDopF_4gDDTxF06FvTJl3Q2JpvJ4';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Clés de persistance locale (v2 propre avec vrais UUIDs)
const STORAGE_KEYS = {
  USER_PSEUDO: '@qult_v2_user_pseudo',
  LIKED_CARDS: '@qult_v2_liked_cards',
  MEMORIZED_CARDS: '@qult_v2_memorized_cards',
  TODAY_SCORE: '@qult_v2_today_score_',
  PLAYED_TODAY: '@qult_v2_played_today_'
};

const CATEGORIES_FILTER = [
  { id: 'all', label: 'Pour toi', emoji: '✨' },
  { id: 'Histoire', label: 'Histoire', emoji: '🏛️' },
  { id: 'Science', label: 'Science', emoji: '⚛️' },
  { id: 'Art', label: 'Art', emoji: '🎨' },
  { id: 'Nature', label: 'Nature', emoji: '🌿' },
  { id: 'Tech', label: 'Tech', emoji: '💻' },
  { id: 'saved', label: 'Mes Acquis', emoji: '📌' },
];

const FRIEND_META_MAP = {
  'SuperSophie': { avatar: '👩‍🎨', bio: 'Curieuse insatiable • Art & Histoire', streak: 8 },
  'Alexandre_Dev': { avatar: '💻', bio: 'Passionné Tech & Cybersécurité', streak: 5 },
  'Camille_Astro': { avatar: '🔭', bio: 'La tête dans les étoiles ✨', streak: 3 },
  'Titou': { avatar: '🌿', bio: 'Nature & Anecdotes insolites', streak: 2 },
};

// --- HELPERS ---
const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
};

const getLocalDateISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
};

const getFormattedDate = () => {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  return new Date().toLocaleDateString('fr-FR', options);
};

const getScoreColor = (s) => { 
  if (s >= 4) return COLORS.primary; 
  if (s === 3) return COLORS.orange; 
  return COLORS.wrong; 
};

const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight - now;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const seededShuffle = (array, extraSeed = 0) => {
  const dateStr = getLocalDateISO();
  let seed = extraSeed;
  for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i * 7) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Extraction intelligente du thème et de la catégorie d'une carte
const getCardThemeAndCategory = (card) => {
  const themeName = card?.themes?.name || 'Culture';
  const catName = card?.themes?.categories?.name || 'Savoir';
  // Si categories.name est générique ("Savoir" / "Insolite"), le vrai domaine est dans themes.name ("Histoire", "Art", etc.)
  const primaryTopic = ['Savoir', 'Insolite'].includes(catName) ? themeName : catName;
  const secondaryLabel = ['Savoir', 'Insolite'].includes(catName) ? catName : themeName;
  return { primaryTopic, secondaryLabel, themeName, catName };
};

// Découpage structuré en 4 parties : Titre, Accroche Feed (Insta), Corps approfondi (Lire +), et Bonus "Le Saviez-Vous ?"
const parseCardContent = (card) => {
  const title = card?.short_text || 'Découverte QULT';
  const rawLong = (card?.long_text || '').trim();
  const paragraphs = rawLong.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  const intro = paragraphs[0] || '';
  let funFact = null;
  const bodyParagraphs = [];

  for (let i = 1; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (p.startsWith('💡') || p.toLowerCase().includes('le saviez-vous')) {
      funFact = p.replace(/^💡\s*(Le saviez-vous\s*\?\s*)?/i, '').trim();
    } else {
      bodyParagraphs.push(p);
    }
  }

  const body = bodyParagraphs.length > 0 ? bodyParagraphs.join('\n\n') : intro;
  const wordCount = rawLong.split(/\s+/).length;
  const readTimeMin = Math.max(1, Math.round(wordCount / 130));

  return { title, intro, body, bodyParagraphs, funFact, full: rawLong, readTimeMin };
};

// Safe Haptic feedback triggers
const triggerHaptic = (type = 'light') => {
  try {
    if (Platform.OS === 'web') return;
    if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    // Ignore in unsupported environments
  }
};

// Catégories visuelles, émojis et dégradés OLED
const getCategoryMeta = (topicName) => {
  const norm = (topicName || '').toLowerCase();
  if (norm.includes('hist')) {
    return {
      emoji: '🏛️',
      color: '#f59e0b',
      bgTint: 'rgba(245, 158, 11, 0.16)',
      gradient: ['#291503', '#160b02', '#000000']
    };
  }
  if (norm.includes('sci')) {
    return {
      emoji: '⚛️',
      color: '#38bdf8',
      bgTint: 'rgba(56, 189, 248, 0.16)',
      gradient: ['#041d2e', '#020e17', '#000000']
    };
  }
  if (norm.includes('nat') || norm.includes('insol')) {
    return {
      emoji: '🌿',
      color: '#10b981',
      bgTint: 'rgba(16, 185, 129, 0.16)',
      gradient: ['#042316', '#02120a', '#000000']
    };
  }
  if (norm.includes('art')) {
    return {
      emoji: '🎨',
      color: '#ec4899',
      bgTint: 'rgba(236, 72, 153, 0.16)',
      gradient: ['#2e0420', '#170210', '#000000']
    };
  }
  if (norm.includes('tech')) {
    return {
      emoji: '💻',
      color: '#4ade80',
      bgTint: 'rgba(74, 222, 128, 0.16)',
      gradient: ['#042618', '#02130c', '#000000']
    };
  }
  if (norm.includes('philo')) {
    return {
      emoji: '📜',
      color: '#a855f7',
      bgTint: 'rgba(168, 85, 247, 0.16)',
      gradient: ['#1f0833', '#0e0318', '#000000']
    };
  }
  return {
    emoji: '🧠',
    color: COLORS.primary,
    bgTint: 'rgba(74, 222, 128, 0.16)',
    gradient: ['#141b18', '#0d110f', '#000000']
  };
};

// Helper image sécurisée haute résolution
const getSafeImageUrl = (card) => {
  const fallback = 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1080&q=80';
  if (!card?.image_url) return fallback;
  if (card.image_url.includes('loremflickr.com')) return fallback;
  return card.image_url;
};

// --- COMPOSANTS UI DE BASE ---

const NavIcon = ({ icon, label, active, onPress, badgeCount }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
    <View>
      <Ionicons name={active ? icon : `${icon}-outline`} size={24} color={active ? COLORS.primary : COLORS.textMuted} />
      {badgeCount > 0 && (
        <View style={styles.navBadge}>
          <Text style={styles.navBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.navLabel, { color: active ? COLORS.primary : COLORS.textMuted, fontWeight: active ? '700' : '500' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// --- MODALES POLIES ---

const DetailModal = ({ 
  visible, 
  card, 
  onClose, 
  isLiked, 
  isMemorized, 
  onToggleLike, 
  onToggleMemorize, 
  onShareCard,
  linkedQuestion 
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const [miniQuizAnswer, setMiniQuizAnswer] = useState(null);
  
  useEffect(() => { 
    if (visible) {
      setMiniQuizAnswer(null);
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }); 
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }); 
    }
  }, [visible, card?.id]);

  const pan = Gesture.Pan()
    .onChange((event) => { 
      if (event.translationY > 0) translateY.value = event.translationY; 
    })
    .onEnd((event) => { 
      if (event.translationY > 140) runOnJS(onClose)(); 
      else translateY.value = withTiming(0, { duration: 180 }); 
    });
  
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  
  if (!visible || !card) return null;
  
  const { primaryTopic, secondaryLabel } = getCardThemeAndCategory(card);
  const meta = getCategoryMeta(primaryTopic);
  const safeImg = getSafeImageUrl(card);
  const { title, intro, bodyParagraphs, funFact, readTimeMin } = parseCardContent(card);
  
  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          {/* Zone de drag */}
          <GestureDetector gesture={pan}>
            <View style={{ paddingBottom: 6 }}>
              <View style={styles.dragIndicator} />
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={[styles.modalTopicPill, { backgroundColor: meta.bgTint, borderColor: meta.color }]}>
                      <Text style={{ fontSize: 12 }}>{meta.emoji}</Text>
                      <Text style={[styles.modalCat, { color: meta.color }]}>{primaryTopic.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.modalReadTime}>⏱️ {readTimeMin} min de lecture</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeRoundBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#ffffff"/>
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
            {/* Titre Principal */}
            <Text style={styles.modalTitle}>{title}</Text>

            {/* Barre d'actions rapides dans l'article */}
            {onToggleLike && onToggleMemorize && (
              <View style={styles.modalQuickActionsRow}>
                <TouchableOpacity 
                  style={[styles.modalQuickBtn, isMemorized && { backgroundColor: 'rgba(74, 222, 128, 0.18)', borderColor: COLORS.primary }]} 
                  onPress={() => { triggerHaptic('success'); onToggleMemorize(card); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isMemorized ? "bookmark" : "bookmark-outline"} size={17} color={isMemorized ? COLORS.primary : "#fff"} />
                  <Text style={[styles.modalQuickBtnText, isMemorized && { color: COLORS.primary }]}>
                    {isMemorized ? 'Acquis enregistré' : 'Retenir cette fiche'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalQuickBtn, isLiked && { backgroundColor: 'rgba(255, 45, 85, 0.18)', borderColor: COLORS.secondary }]} 
                  onPress={() => { triggerHaptic('light'); onToggleLike(card); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isLiked ? "heart" : "heart-outline"} size={17} color={isLiked ? COLORS.secondary : "#fff"} />
                  <Text style={[styles.modalQuickBtnText, isLiked && { color: COLORS.secondary }]}>
                    {isLiked ? 'Aimé' : 'Favori'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Visuel Haute Définition */}
            {safeImg && (
              <View style={styles.modalImageWrapper}>
                <Image 
                  source={{ uri: safeImg }} 
                  style={styles.modalImage} 
                  contentFit="cover"
                  transition={250}
                  cachePolicy="memory-disk"
                />
                <LinearGradient 
                  colors={['transparent', 'rgba(18,18,20,0.9)']} 
                  style={styles.modalImageCaptionBar}
                >
                  <Text style={styles.modalImageCaptionText}>{meta.emoji} Collection {primaryTopic} • {secondaryLabel}</Text>
                </LinearGradient>
              </View>
            )}
            
            {/* 1. L'Essentiel (Accroche) */}
            {intro ? (
              <View style={[styles.modalLeadBox, { borderLeftColor: meta.color }]}>
                <Text style={[styles.modalLeadLabel, { color: meta.color }]}>L'ESSENTIEL EN BREF</Text>
                <Text style={styles.modalLeadText}>{intro}</Text>
              </View>
            ) : null}

            {/* 2. Histoire & Analyse Approfondie */}
            {bodyParagraphs.length > 0 && (
              <View style={styles.deepDiveSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={[styles.sectionIconCircle, { backgroundColor: meta.bgTint }]}>
                    <Ionicons name="book" size={16} color={meta.color} />
                  </View>
                  <Text style={styles.modalDeepDiveHeader}>Histoire & Analyse Complète</Text>
                </View>
                {bodyParagraphs.map((paragraph, idx) => (
                  <Text key={idx} style={[styles.modalText, idx > 0 && { marginTop: 14 }]}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            )}

            {/* 3. Encadré Bonus "Le Saviez-Vous ?" */}
            {funFact && (
              <View style={styles.funFactBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>💡</Text>
                  <Text style={styles.funFactTitle}>LE SAVIEZ-VOUS ? (ANECDOTE BONUS)</Text>
                </View>
                <Text style={styles.funFactText}>{funFact}</Text>
              </View>
            )}

            {/* 4. Mini-Quiz Express intégré à la fiche */}
            {linkedQuestion && (
              <View style={styles.inlineQuizBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Ionicons name="flash" size={18} color={COLORS.primary} />
                  <Text style={styles.inlineQuizHeader}>TESTE TA MÉMOIRE SUR CETTE FICHE</Text>
                </View>
                <Text style={styles.inlineQuizQuestion}>{linkedQuestion.question}</Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const isSelected = miniQuizAnswer === opt;
                    const isCorrect = opt === linkedQuestion.correct_option;
                    let bg = '#18181b';
                    let border = '#27272a';
                    if (miniQuizAnswer) {
                      if (isCorrect) { bg = '#064e3b'; border = COLORS.correct; }
                      else if (isSelected) { bg = '#7f1d1d'; border = COLORS.wrong; }
                    }
                    return (
                      <TouchableOpacity
                        key={opt}
                        disabled={!!miniQuizAnswer}
                        onPress={() => {
                          setMiniQuizAnswer(opt);
                          triggerHaptic(opt === linkedQuestion.correct_option ? 'success' : 'error');
                        }}
                        style={[styles.inlineQuizOption, { backgroundColor: bg, borderColor: border }]}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.inlineQuizOptLetter}>{opt}.</Text>
                        <Text style={styles.inlineQuizOptText}>{linkedQuestion[`option_${opt.toLowerCase()}`]}</Text>
                        {miniQuizAnswer && isCorrect && <Ionicons name="checkmark-circle" size={18} color={COLORS.correct} />}
                        {miniQuizAnswer && isSelected && !isCorrect && <Ionicons name="close-circle" size={18} color={COLORS.wrong} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {miniQuizAnswer && (
                  <Text style={styles.inlineQuizExplanation}>
                    {miniQuizAnswer === linkedQuestion.correct_option ? '✅ Exact ! ' : '❌ Presque ! '}
                    {linkedQuestion.explanation}
                  </Text>
                )}
              </View>
            )}
            
            {/* Bouton de partage en bas de fiche */}
            <View style={styles.modalFooterActions}>
              <TouchableOpacity 
                style={styles.modalShareAction} 
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  if (onShareCard) {
                    onClose();
                    setTimeout(() => onShareCard(card), 250);
                  } else {
                    Share.share({ message: `Découvre ça sur QULT : "${title}" 🔥\n\n${intro}` });
                  }
                }}
              >
                <Ionicons name="paper-plane" size={18} color="#000" />
                <Text style={styles.modalShareText}>Partager cette pépite à un ami</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const ChatModal = ({ visible, onClose, myPseudo, friendPseudo, allCards }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [viewCard, setViewCard] = useState(null);
  const scrollViewRef = useRef();

  const quickReplies = [
    "🔥 Incroyable cette fiche !",
    "🤯 Je ne savais pas du tout !",
    "🏆 Tu as fait combien au quiz ?"
  ];

  useEffect(() => {
    if (visible && friendPseudo) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3500);
      return () => clearInterval(interval);
    }
  }, [visible, friendPseudo]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, cards(*, themes(id, name, categories(name)))')
        .or(`and(sender_pseudo.eq.${myPseudo},receiver_pseudo.eq.${friendPseudo}),and(sender_pseudo.eq.${friendPseudo},receiver_pseudo.eq.${myPseudo})`)
        .order('created_at', { ascending: true });
      if (data && !error && data.length > 0) {
        setMessages(data);
        return;
      }
    } catch (e) {
      // Fallback local
    }
    setMessages(MOCK_MESSAGES[friendPseudo] || []);
  };

  const sendMessage = async (textOverride) => {
    const contentToSend = (typeof textOverride === 'string' ? textOverride : inputText).trim();
    if (!contentToSend) return;
    const newMsg = {
      id: 'm_' + Date.now(),
      sender_pseudo: myPseudo,
      receiver_pseudo: friendPseudo,
      content: contentToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMsg]);
    if (typeof textOverride !== 'string') setInputText('');
    triggerHaptic('light');

    try {
      await supabase.from('messages').insert({ 
        sender_pseudo: myPseudo, 
        receiver_pseudo: friendPseudo, 
        content: newMsg.content 
      });
    } catch (e) {
      // ignore
    }
  };

  const friendMeta = FRIEND_META_MAP[friendPseudo] || { avatar: '👤', bio: 'Membre du Cercle QULT' };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{flex: 1, backgroundColor: COLORS.bg}}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#fff"/>
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18 }}>{friendMeta.avatar}</Text>
              <Text style={styles.chatTitle}>{friendPseudo}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
              <View style={styles.onlineDot} />
              <Text style={styles.chatStatus}>En ligne • {friendMeta.bio}</Text>
            </View>
          </View>
          <View style={{width: 36}}/>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={{flex: 1, padding: 15}}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({animated: true})}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            const isMe = msg.sender_pseudo === myPseudo;
            const cardObj = msg.cards || (msg.shared_card_id && allCards?.find(c => c.id === msg.shared_card_id));
            return (
              <View key={msg.id} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', marginBottom: 14, maxWidth: '82%'}}>
                {cardObj && (
                  <TouchableOpacity onPress={() => setViewCard(cardObj)} style={styles.chatCardBubble} activeOpacity={0.88}>
                    <Image 
                      source={{ uri: getSafeImageUrl(cardObj) }} 
                      style={styles.chatCardImg} 
                      contentFit="cover"
                      transition={250}
                      cachePolicy="memory-disk"
                    />
                    <View style={{padding: 12}}>
                      <Text style={styles.chatCardCat}>
                        {getCardThemeAndCategory(cardObj).primaryTopic.toUpperCase()}
                      </Text>
                      <Text style={styles.chatCardTitle} numberOfLines={2}>{cardObj.short_text}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                        <Ionicons name="book-outline" size={13} color={COLORS.primary} />
                        <Text style={{color: COLORS.primary, fontSize: 11, fontWeight: 'bold'}}>Lire la fiche complète ➔</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                {msg.content && (
                  <View style={[
                    styles.chatBubble, 
                    isMe ? styles.chatBubbleMe : styles.chatBubbleOther
                  ]}>
                    <Text style={{color: isMe ? '#000' : '#fff', fontSize: 15, lineHeight: 21, fontWeight: '500'}}>
                      {msg.content}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{height: 20}}/>
        </ScrollView>

        {/* Suggestions de réponses rapides */}
        <View style={styles.quickReplyBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
            {quickReplies.map((reply, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.quickReplyChip} 
                onPress={() => sendMessage(reply)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.chatInputContainer}>
          <TextInput 
            style={styles.chatInput} 
            placeholder="Écrire un message..." 
            placeholderTextColor="#71717a"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity onPress={() => sendMessage()} style={styles.sendBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-up" size={22} color="#000"/>
          </TouchableOpacity>
        </View>

        <DetailModal visible={!!viewCard} card={viewCard} onClose={() => setViewCard(null)} />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const ShareModal = ({ visible, onClose, myPseudo, card }) => {
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (visible) { 
      fetchFriends(); 
      setCustomMessage('');
      setSelectedFriends(new Set());
    }
  }, [visible]);

  const fetchFriends = async () => {
    try {
      const { data } = await supabase.from('follows').select('following_pseudo').eq('follower_pseudo', myPseudo).eq('status', 'accepted');
      if (data && data.length > 0) {
        setFriends(data);
        return;
      }
    } catch (e) {
      // fallback
    }
    setFriends(MOCK_FRIENDS);
  };

  const toggleSelection = (pseudo) => {
    triggerHaptic('light');
    const newSet = new Set(selectedFriends);
    if (newSet.has(pseudo)) newSet.delete(pseudo);
    else newSet.add(pseudo);
    setSelectedFriends(newSet);
  };

  const sendToSelected = async () => {
    const msg = customMessage.trim() || "Regarde cette pépite sur QULT ! 🔥";
    triggerHaptic('success');
    try {
      for (const friend of Array.from(selectedFriends)) {
        await supabase.from('messages').insert({ 
          sender_pseudo: myPseudo, 
          receiver_pseudo: friend, 
          content: msg, 
          shared_card_id: card?.id 
        });
      }
    } catch (e) {
      // ignore
    }
    Alert.alert("Envoyé ! 🚀", `Fiche partagée dans le Cercle avec ${selectedFriends.size} ami(s) !`);
    onClose();
  };

  const shareExternal = async () => {
    triggerHaptic('light');
    const { title, intro } = parseCardContent(card);
    await Share.share({ message: `Découvre ça sur QULT : "${title}" 🧠\n\n${intro}` });
  };

  if (!card) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalContent, {height: '72%'}]}>
          <View style={styles.dragIndicator} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Partager la pépite 🚀</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeRoundBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#fff"/>
            </TouchableOpacity>
          </View>

          <View style={styles.sharePreviewBox}>
            <Image 
              source={{uri: getSafeImageUrl(card)}} 
              style={styles.sharePreviewImg} 
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <TextInput 
              style={styles.shareInput} 
              placeholder="Ajouter un mot pour tes amis..." 
              placeholderTextColor="#71717a" 
              value={customMessage} 
              onChangeText={setCustomMessage}
            />
          </View>

          <FlatList 
            data={friends}
            keyExtractor={item => item.following_pseudo || item.pseudo}
            renderItem={({item}) => {
              const name = item.following_pseudo || item.pseudo;
              const isSelected = selectedFriends.has(name);
              const fMeta = FRIEND_META_MAP[name] || { avatar: '👤', bio: 'Membre QULT' };
              return (
                <TouchableOpacity onPress={() => toggleSelection(name)} style={styles.friendRowSelect} activeOpacity={0.8}>
                  <View style={{flexDirection:'row', alignItems:'center', gap: 12}}>
                    <View style={styles.avatarCircle}><Text style={{fontSize: 18}}>{fMeta.avatar}</Text></View>
                    <View>
                      <Text style={styles.friendName}>{name}</Text>
                      <Text style={{ color: COLORS.textDark, fontSize: 11 }}>{fMeta.bio}</Text>
                    </View>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#000"/>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <TouchableOpacity onPress={shareExternal} style={styles.shareExternalBtn} activeOpacity={0.7}>
                <Ionicons name="share-outline" size={20} color={COLORS.blue} style={{marginRight: 8}} />
                <Text style={{color: COLORS.blue, fontWeight:'bold', fontSize: 15}}>Partager via WhatsApp, iMessage, Instagram...</Text>
              </TouchableOpacity>
            }
          />

          {selectedFriends.size > 0 && (
            <TouchableOpacity onPress={sendToSelected} style={styles.sendConfirmBtn} activeOpacity={0.85}>
              <Text style={styles.sendConfirmBtnText}>Envoyer dans le Cercle ({selectedFriends.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --- CARTE FULLSCREEN DU FEED (INSTAGRAM POST DESCRIPTION + LECTURE APPROFONDIE) ---

const CardFull = memo(({ 
  card, 
  currentIndex = 0, 
  totalCards = 1, 
  isLiked, 
  isMemorized, 
  onLike, 
  onMemorize, 
  onOpen, 
  onShare 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const wasLiked = usePrevious(isLiked);

  useEffect(() => {
    if (isLiked && wasLiked === false) {
      scale.value = withSequence(withSpring(1.3), withSpring(1), withDelay(500, withTiming(0)));
      opacity.value = withSequence(withTiming(1), withDelay(500, withTiming(0)));
    }
  }, [isLiked, wasLiked]);

  const animatedHeartStyle = useAnimatedStyle(() => ({ 
    transform: [{ scale: scale.value }], 
    opacity: opacity.value 
  }));
  
  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDelay(250).onEnd(() => { 
    runOnJS(triggerHaptic)('success');
    runOnJS(onLike)(); 
  });
  
  const longPress = Gesture.LongPress().minDuration(400).onEnd((e, success) => { 
    if (success) {
      runOnJS(triggerHaptic)('light');
      runOnJS(onOpen)(); 
    }
  });
  
  const composedGesture = Gesture.Race(doubleTap, longPress);

  const { primaryTopic, secondaryLabel } = getCardThemeAndCategory(card);
  const meta = getCategoryMeta(primaryTopic);
  const safeImgUri = getSafeImageUrl(card);
  const { title, intro, readTimeMin } = useMemo(() => parseCardContent(card), [card]);

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' }}>
      <GestureDetector gesture={composedGesture}>
        <View style={{ flex: 1 }}>
          {/* 1. Fond stylisé dégradé OLED (visible pendant chargement ou en cas de problème réseau) */}
          <LinearGradient colors={meta.gradient} style={StyleSheet.absoluteFill}>
            <View style={styles.cardPlaceholderPattern}>
              <Text style={styles.cardPlaceholderEmoji}>{meta.emoji}</Text>
              {!imageLoaded && !imageError && (
                <ActivityIndicator color={meta.color} size="small" style={{ marginTop: 14 }} />
              )}
            </View>
          </LinearGradient>

          {/* 2. Image Expo Ultra-Performante avec Cache Disque */}
          {!imageError && (
            <Image 
              source={{ uri: safeImgUri }} 
              style={StyleSheet.absoluteFill} 
              contentFit="cover"
              transition={280}
              cachePolicy="memory-disk"
              priority="high"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}

          {/* 3. Cœur animé au double-tap */}
          <View style={styles.heartOverlay} pointerEvents="none">
            <Animated.View style={animatedHeartStyle}>
              <Ionicons name="heart" size={120} color={COLORS.secondary} />
            </Animated.View>
          </View>

          {/* 4. Dégradé sombre progressif pour lisibilité parfaite de la description */}
          <LinearGradient 
            colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.93)', 'rgba(0,0,0,0.99)']} 
            locations={[0, 0.25, 0.52, 0.76, 1]}
            style={styles.cardUi} 
            pointerEvents="box-none"
          >
            {/* Contenu textuel type Post Instagram enrichi */}
            <View style={styles.cardContent}>
              
              {/* Ligne Méta : Badge Thème coloré + Sous-catégorie + Pagination 2D */}
              <View style={styles.metaRow}>
                <View style={styles.tagGroup}>
                  <View style={[styles.tag, { backgroundColor: meta.color }]}>
                    <Text style={styles.tagText}>{meta.emoji} {primaryTopic.toUpperCase()}</Text>
                  </View>
                  <View style={styles.themeTag}>
                    <Text style={styles.themeTagText}>{secondaryLabel}</Text>
                  </View>
                </View>

                {totalCards > 1 && (
                  <View style={styles.horizontalPill}>
                    <View style={styles.dotsRow}>
                      {Array.from({ length: totalCards }).map((_, i) => (
                        <View 
                          key={i} 
                          style={[
                            styles.indicatorDot, 
                            i === currentIndex ? styles.indicatorDotActive : styles.indicatorDotInactive
                          ]} 
                        />
                      ))}
                    </View>
                    <Text style={styles.horizontalPillText}>{currentIndex + 1}/{totalCards} ➔</Text>
                  </View>
                )}
              </View>

              {/* Titre Accrocheur */}
              <TouchableOpacity activeOpacity={0.9} onPress={onOpen}>
                <Text style={styles.cardTitle}>{title}</Text>
              </TouchableOpacity>

              {/* Description de base suffisante (4-5 lignes visibles direct au scroll comme sur Insta) */}
              {intro ? (
                <TouchableOpacity activeOpacity={0.85} onPress={onOpen} style={styles.captionTouchable}>
                  <Text style={styles.cardCaption} numberOfLines={4}>
                    {intro}
                  </Text>
                  
                  {/* Bouton "Lire +" clair qui invite à découvrir l'histoire complète & l'anecdote bonus */}
                  <View style={styles.readMorePillBtn}>
                    <Ionicons name="book" size={13} color="#000" />
                    <Text style={styles.readMorePillText}>Lire + d'infos & Anecdote bonus ({readTimeMin} min)</Text>
                    <Ionicons name="chevron-forward" size={14} color="#000" />
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Boutons d'actions verticaux (TikTok / Reels Style) */}
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('light'); onLike(); }}>
                <View style={[styles.actionIconCircle, isLiked && { backgroundColor: 'rgba(255, 45, 85, 0.25)', borderColor: COLORS.secondary }]}>
                  <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? COLORS.secondary : "#ffffff"} />
                </View>
                <Text style={[styles.actionText, isLiked && { color: COLORS.secondary, fontWeight: '700' }]}>
                  {isLiked ? 'Aimé' : 'Like'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('success'); onMemorize(); }}>
                <View style={[styles.actionIconCircle, isMemorized && { backgroundColor: 'rgba(74, 222, 128, 0.25)', borderColor: COLORS.primary }]}>
                  <Ionicons name={isMemorized ? "bookmark" : "bookmark-outline"} size={25} color={isMemorized ? COLORS.primary : "#ffffff"} />
                </View>
                <Text style={[styles.actionText, isMemorized && { color: COLORS.primary, fontWeight: '700' }]}>
                  {isMemorized ? 'Appris' : 'Retenir'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('light'); onOpen(); }}>
                <View style={[styles.actionIconCircle, { borderColor: COLORS.primary, backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                  <Ionicons name="reader-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={[styles.actionText, { color: COLORS.primary, fontWeight: '700' }]}>Lire +</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('light'); onShare(); }}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name="paper-plane-outline" size={23} color="#ffffff" />
                </View>
                <Text style={styles.actionText}>Partager</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </GestureDetector>
    </View>
  );
}, (prev, next) => 
  prev.isLiked === next.isLiked && 
  prev.isMemorized === next.isMemorized && 
  prev.card.id === next.card.id &&
  prev.currentIndex === next.currentIndex &&
  prev.totalCards === next.totalCards
);

// --- ÉCRANS PRINCIPAUX ---

// 1. ÉCRAN D'AUTHENTIFICATION & CONNEXION RAPIDE
const AuthScreen = ({ onDemoLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('victor@qult.app');
  const [password, setPassword] = useState('Password123!');
  const [pseudo, setPseudo] = useState('Victor');
  const [loading, setLoading] = useState(false);
  
  const handleAuth = async () => { 
    if (!email || !password) return Alert.alert("Champs requis", "Veuillez renseigner un email et un mot de passe."); 
    setLoading(true); 
    triggerHaptic('light');
    if (isLogin) { 
      const { error } = await supabase.auth.signInWithPassword({ email, password }); 
      if (error) {
        Alert.alert(
          "Connexion hors ligne", 
          error.message + "\n\nSouhaitez-vous continuer en mode Démo immédiat (Victor) ?",
          [
            { text: "Réessayer", style: "cancel" },
            { text: "Continuer en Démo ⚡️", onPress: () => onDemoLogin('Victor') }
          ]
        );
      } else {
        triggerHaptic('success');
      }
    } else { 
      if (!pseudo) { 
        setLoading(false); 
        return Alert.alert("Pseudo requis", "Choisis ton pseudo d'explorateur !"); 
      } 
      const { error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: { pseudo } } 
      }); 
      if (error) {
        Alert.alert("Erreur Inscription", error.message);
      } else { 
        try {
          await supabase.from('public_users').insert({ pseudo });
        } catch (e) {}
        Alert.alert("Bienvenue sur QULT !", "Ton compte a été créé avec succès."); 
      } 
    } 
    setLoading(false); 
  };

  return ( 
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginContainer}> 
      <View style={{alignItems:'center', marginBottom: 35}}> 
        <View style={styles.loginLogoBadge}>
          <Text style={{fontSize: 42}}>🧠</Text>
        </View>
        <Text style={styles.loginTitle}>QULT</Text> 
        <Text style={styles.loginSubtitle}>Transforme le scroll passif en savoir actif.</Text> 
      </View> 

      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color="#71717a" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          placeholderTextColor="#71717a" 
          autoCapitalize="none" 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address"
        /> 
      </View>

      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={20} color="#71717a" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="Mot de passe" 
          placeholderTextColor="#71717a" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword}
        /> 
      </View>

      {!isLogin && (
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#71717a" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Choisis ton Pseudo" 
            placeholderTextColor="#71717a" 
            value={pseudo} 
            onChangeText={setPseudo}
          />
        </View>
      )} 

      <TouchableOpacity style={styles.loginBtn} onPress={handleAuth} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.loginBtnText}>{isLogin ? "Se Connecter" : "Créer un compte"}</Text>
        )}
      </TouchableOpacity> 

      {/* Bouton de connexion rapide en 1 clic */}
      <TouchableOpacity 
        style={styles.quickLoginBtn} 
        onPress={() => onDemoLogin('Victor')}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={18} color={COLORS.primary} />
        <Text style={styles.quickLoginText}>Connexion Rapide (Compte Victor) ⚡️</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{marginTop: 22}}>
        <Text style={{color: COLORS.textMuted, textAlign: 'center'}}>
          {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <Text style={{color: COLORS.primary, fontWeight:'bold'}}>
            {isLogin ? "S'inscrire" : "Se connecter"}
          </Text>
        </Text>
      </TouchableOpacity> 
    </KeyboardAvoidingView> 
  );
};

// 2. ÉCRAN FEED DU SAVOIR (SWIPE 2D + FILTRE DE CATÉGORIES)
const HomeScreen = ({ 
  allCards, 
  allQuizQuestions,
  toggleLike, 
  toggleMemorize, 
  likedCards, 
  memorizedCards, 
  myPseudo,
  onGoToProfile 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const verticalListRef = useRef(null);

  // Construction intelligente de la matrice 2D :
  // - Verticalement : toutes les cartes correspondant au filtre (pour un scroll infini riche !)
  // - Horizontalement : pour chaque carte, glisser à droite permet d'explorer les autres cartes du MÊME thème !
  const rowsData = useMemo(() => {
    if (!allCards || allCards.length === 0) return [];
    let filtered = allCards;
    if (selectedCategory === 'saved') {
      filtered = allCards.filter(c => memorizedCards.has(c.id));
    } else if (selectedCategory !== 'all') {
      filtered = allCards.filter(c => {
        const { primaryTopic } = getCardThemeAndCategory(c);
        return primaryTopic.toLowerCase().includes(selectedCategory.toLowerCase());
      });
    }

    return filtered.map(primaryCard => {
      const sameThemeOthers = allCards.filter(
        c => c.id !== primaryCard.id && c.theme_id && c.theme_id === primaryCard.theme_id
      );
      return [primaryCard, ...sameThemeOthers];
    });
  }, [allCards, selectedCategory, memorizedCards]);

  const handleSelectCategory = (catId) => {
    triggerHaptic('light');
    setSelectedCategory(catId);
    verticalListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const linkedQuestionForSelected = useMemo(() => {
    if (!selectedCard || !allQuizQuestions) return null;
    return allQuizQuestions.find(q => q.card_id === selectedCard.id);
  }, [selectedCard, allQuizQuestions]);
  
  const renderRow = useCallback(({ item: rowCards }) => ( 
    <View style={{ height: SCREEN_HEIGHT, width: SCREEN_WIDTH }}> 
      <FlatList 
        data={rowCards} 
        horizontal 
        pagingEnabled={true} 
        showsHorizontalScrollIndicator={false} 
        initialNumToRender={2} 
        maxToRenderPerBatch={2} 
        windowSize={3} 
        removeClippedSubviews={false} 
        keyExtractor={card => card.id} 
        renderItem={({ item: card, index: cardIndex }) => ( 
          <CardFull 
            card={card} 
            currentIndex={cardIndex}
            totalCards={rowCards.length}
            isLiked={likedCards.has(card.id)} 
            isMemorized={memorizedCards.has(card.id)}
            onLike={() => toggleLike(card)} 
            onMemorize={() => toggleMemorize(card)}
            onOpen={() => { setSelectedCard(card); setModalVisible(true); }} 
            onShare={() => { setSelectedCard(card); setShareVisible(true); }}
          /> 
        )} 
      /> 
    </View> 
  ), [likedCards, memorizedCards, toggleLike, toggleMemorize]);

  return ( 
    <View style={{ flex: 1, backgroundColor: '#000' }}> 
      {/* Top Floating Header + Barre de filtres */}
      <View style={styles.feedHeaderContainer} pointerEvents="box-none">
        <View style={styles.feedHeaderTop} pointerEvents="box-none">
          <View style={styles.feedLogoBox}>
            <Text style={styles.feedLogoText}>QULT</Text>
            <View style={styles.neonDot} />
            <View style={styles.learnedCounterPill}>
              <Text style={styles.learnedCounterText}>📌 {memorizedCards.size} acquis</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.userStatusPill} onPress={onGoToProfile} activeOpacity={0.8}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={styles.streakNum}>3 j</Text>
            <View style={styles.statusDivider} />
            <Text style={styles.headerUserText}>👤 {myPseudo}</Text>
          </TouchableOpacity>
        </View>

        {/* Barre horizontale de filtres thématiques */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryFilterScroll}
        >
          {CATEGORIES_FILTER.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleSelectCategory(cat.id)}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12 }}>{cat.emoji}</Text>
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {rowsData.length === 0 ? (
        <View style={styles.emptyFeedContainer}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📌</Text>
          <Text style={styles.emptyFeedTitle}>Aucune fiche dans cette catégorie</Text>
          <Text style={styles.emptyFeedSub}>
            Touche l'icône « Retenir » sur les fiches du feed pour constituer ta bibliothèque personnelle d'acquis !
          </Text>
          <TouchableOpacity style={styles.emptyFeedBtn} onPress={() => handleSelectCategory('all')}>
            <Text style={styles.emptyFeedBtnText}>Explorer toutes les pépites ✨</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList 
          ref={verticalListRef}
          data={rowsData} 
          renderItem={renderRow} 
          pagingEnabled={true} 
          showsVerticalScrollIndicator={false} 
          keyExtractor={(item, index) => `${selectedCategory}_${item[0]?.id || index}`} 
          initialNumToRender={2} 
          windowSize={4} 
          removeClippedSubviews={false} 
        /> 
      )}

      <DetailModal 
        visible={modalVisible} 
        card={selectedCard} 
        onClose={() => setModalVisible(false)} 
        isLiked={selectedCard ? likedCards.has(selectedCard.id) : false}
        isMemorized={selectedCard ? memorizedCards.has(selectedCard.id) : false}
        onToggleLike={toggleLike}
        onToggleMemorize={toggleMemorize}
        onShareCard={(c) => { setSelectedCard(c); setShareVisible(true); }}
        linkedQuestion={linkedQuestionForSelected}
      /> 
      <ShareModal visible={shareVisible} onClose={() => setShareVisible(false)} myPseudo={myPseudo} card={selectedCard} />
    </View> 
  );
};

// 3. ÉCRAN QUIZ QUOTIDIEN GAMIFIÉ
const QuizDailyScreen = ({ 
  questions, 
  hasPlayed, 
  todayScore, 
  onFinish, 
  onResetForPractice,
  likedCards,
  memorizedCards,
  toggleLike,
  toggleMemorize
}) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [detailCard, setDetailCard] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  
  if (hasPlayed || finished) { 
    const finalScore = hasPlayed ? (todayScore !== null ? todayScore : score) : score; 
    const safeScore = Math.min(Math.max(finalScore || 0, 0), 5);
    const scoreColor = getScoreColor(safeScore); 
    const progressData = { labels: ["Score"], data: [safeScore / 5] }; 
    
    const praiseText = safeScore === 5 
      ? "Score Parfait ! Maître du Savoir 👑" 
      : safeScore >= 4 
      ? "Impressionnant ! Savoir d'Élite 🌟" 
      : safeScore === 3 
      ? "Bien joué ! Bel esprit curieux 👏" 
      : "Bien tenté ! Révise les fiches ci-dessous 🧠";

    const shareScoreResult = () => {
      triggerHaptic('light');
      const boxes = Array.from({ length: 5 }).map((_, i) => (i < safeScore ? '🟩' : '⬛')).join('');
      Share.share({
        message: `QULT Défi du Jour 🏆 : ${safeScore}/5\n${boxes}\nViens battre mon score sur QULT ! 🧠⚡️`
      });
    };

    return ( 
      <View style={styles.quizContainer}> 
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={styles.dateText}>{getFormattedDate().toUpperCase()}</Text> 
          <Text style={styles.quizTitle}>Défi Quotidien Terminé ! 🏆</Text> 
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>{praiseText}</Text>
          
          <View style={{alignItems: 'center', marginVertical: 14}}> 
            <View>
              <ProgressChart 
                data={progressData} 
                width={SCREEN_WIDTH - 80} 
                height={165} 
                strokeWidth={14} 
                radius={62} 
                chartConfig={{ 
                  backgroundGradientFrom: "#000", 
                  backgroundGradientTo: "#000", 
                  color: () => scoreColor, 
                  labelColor: () => `rgba(255, 255, 255, 0.8)`
                }} 
                hideLegend={true}
              /> 
            </View>
            <View style={styles.scoreCenteredBox}>
              <Text style={[styles.scoreBig, { color: scoreColor }]}>{safeScore}/5</Text>
              <Text style={{color: COLORS.orange, fontSize: 13, fontWeight: 'bold', marginTop: 2}}>Série : 🔥 4 j</Text>
            </View> 
          </View> 

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TouchableOpacity style={styles.shareScoreBtn} onPress={shareScoreResult} activeOpacity={0.85}>
              <Ionicons name="share-social" size={18} color="#000" />
              <Text style={styles.shareScoreBtnText}>Partager mon score ({safeScore}/5)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quizTimerBox}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.quizTimerText}>Prochain quiz officiel dans : <Text style={{fontWeight: 'bold', color: '#fff'}}>{countdown}</Text></Text>
          </View>

          <Text style={styles.recapTitle}>📚 Réviser les 5 fiches du Quiz :</Text> 
          {questions.map((q, i) => ( 
            <TouchableOpacity 
              key={q.id || i} 
              style={styles.recapItem} 
              activeOpacity={0.8}
              onPress={() => { 
                if(q.cards) { 
                  setDetailCard(q.cards); 
                  setModalVisible(true); 
                } else { 
                  Alert.alert("Info", "Pas de fiche liée."); 
                } 
              }}
            > 
              <View style={styles.recapBadge}>
                <Text style={{color: COLORS.primary, fontWeight:'bold'}}>{i+1}</Text>
              </View> 
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.recapText} numberOfLines={2}>{q.question}</Text>
                {q.cards?.short_text && (
                  <Text style={{ color: COLORS.primary, fontSize: 11, marginTop: 3, fontWeight: '600' }} numberOfLines={1}>
                    📖 Fiche : {q.cards.short_text}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" color="#71717a" size={20} /> 
            </TouchableOpacity> 
          ))} 

          <TouchableOpacity 
            style={styles.practiceBtn} 
            onPress={() => {
              triggerHaptic('light');
              setIndex(0);
              setScore(0);
              setFinished(false);
              setIsAnswered(false);
              setSelectedOption(null);
              if (onResetForPractice) onResetForPractice();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Nouveau tirage d'entraînement (5 questions)</Text>
          </TouchableOpacity>
        </ScrollView> 
        <DetailModal 
          visible={modalVisible} 
          card={detailCard} 
          onClose={() => setModalVisible(false)} 
          isLiked={detailCard ? likedCards?.has(detailCard.id) : false}
          isMemorized={detailCard ? memorizedCards?.has(detailCard.id) : false}
          onToggleLike={toggleLike}
          onToggleMemorize={toggleMemorize}
        /> 
      </View> 
    ); 
  }

  if (!questions || questions.length === 0) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={{ color: COLORS.textMuted, marginTop: 14, fontSize: 14 }}>Préparation du défi quotidien...</Text>
      </View>
    );
  }
  
  const currentQ = questions[index];
  
  const handlePress = (option) => { 
    if (isAnswered) return; 
    setSelectedOption(option); 
    setIsAnswered(true); 
    const isCorrect = option === currentQ.correct_option;
    if (isCorrect) {
      triggerHaptic('success');
      setScore(prev => prev + 1); 
    } else {
      triggerHaptic('error');
    }
  };

  const handleNext = () => { 
    triggerHaptic('light');
    if (index < questions.length - 1) { 
      setIndex(index + 1); 
      setIsAnswered(false); 
      setSelectedOption(null); 
    } else { 
      // Le score a déjà été incrémenté dans handlePress !
      setFinished(true); 
      onFinish(score); 
    } 
  };

  const getButtonBg = (option) => { 
    if (!isAnswered) return COLORS.surfaceElevated; 
    if (option === currentQ.correct_option) return '#064e3b'; 
    if (option === selectedOption) return '#7f1d1d'; 
    return COLORS.surfaceElevated; 
  };

  const getOptionBorder = (option) => {
    if (!isAnswered) return COLORS.border;
    if (option === currentQ.correct_option) return COLORS.correct;
    if (option === selectedOption) return COLORS.wrong;
    return COLORS.border;
  };
  
  return ( 
    <View style={styles.quizContainer}> 
      <View style={styles.quizHeader}> 
        <Text style={styles.dateText}>{getFormattedDate().toUpperCase()}</Text> 
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4}}>
          <Text style={styles.quizProgress}>Question {index + 1} sur {questions.length}</Text> 
          <View style={styles.pointsBadge}>
            <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>{score} pt(s)</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={{width: `${((index+1)/questions.length)*100}%`, height: '100%', backgroundColor: COLORS.primary, borderRadius: 3}} />
        </View> 
      </View> 

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.questionText}>{currentQ.question}</Text> 
        
        <View style={styles.optionsContainer}>
          {['A', 'B', 'C', 'D'].map((opt) => (
            <TouchableOpacity 
              key={opt} 
              style={[
                styles.optionBtn, 
                { backgroundColor: getButtonBg(opt), borderColor: getOptionBorder(opt) }
              ]} 
              onPress={() => handlePress(opt)} 
              disabled={isAnswered}
              activeOpacity={0.8}
            >
              <View style={[
                styles.optionLetterBox,
                isAnswered && opt === currentQ.correct_option && { backgroundColor: COLORS.correct },
                isAnswered && opt === selectedOption && opt !== currentQ.correct_option && { backgroundColor: COLORS.wrong }
              ]}>
                <Text style={styles.optionLetter}>{opt}</Text>
              </View>
              <Text style={styles.optionText}>{currentQ[`option_${opt.toLowerCase()}`]}</Text>
              {isAnswered && opt === currentQ.correct_option && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.correct} />
              )}
              {isAnswered && opt === selectedOption && opt !== currentQ.correct_option && (
                <Ionicons name="close-circle" size={22} color={COLORS.wrong} />
              )}
            </TouchableOpacity>
          ))}
        </View> 

        {isAnswered && (
          <View style={{marginTop: 20}}>
            <View style={styles.explanationBox}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
                <Ionicons 
                  name={selectedOption === currentQ.correct_option ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color={selectedOption === currentQ.correct_option ? COLORS.correct : COLORS.wrong} 
                />
                <Text style={styles.explanationTitle}>
                  {selectedOption === currentQ.correct_option ? "Excellente réponse !" : "Pas tout à fait..."}
                </Text>
              </View>
              <Text style={styles.explanationText}>{currentQ.explanation}</Text>

              {currentQ.cards && (
                <TouchableOpacity 
                  style={styles.quizOpenCardBtn} 
                  onPress={() => { setDetailCard(currentQ.cards); setModalVisible(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="book-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.quizOpenCardBtnText}>Lire la fiche complète : « {currentQ.cards.short_text} »</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{index < questions.length - 1 ? "Question Suivante" : "Voir mes Résultats 🏆"}</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        )} 
        <View style={{height: 120}} />
      </ScrollView>

      <DetailModal 
        visible={modalVisible} 
        card={detailCard} 
        onClose={() => setModalVisible(false)} 
        isLiked={detailCard ? likedCards?.has(detailCard.id) : false}
        isMemorized={detailCard ? memorizedCards?.has(detailCard.id) : false}
        onToggleLike={toggleLike}
        onToggleMemorize={toggleMemorize}
      />
    </View> 
  );
};

// 4. ÉCRAN SOCIAL (CERCLE & CLASSEMENT AVEC PODIUM)
const FriendsScreen = ({ myPseudo, todayScore, onOpenProfile, allCards }) => {
  const [friends, setFriends] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [chatModal, setChatModal] = useState({ visible: false, friend: null });
  const [newFriendInput, setNewFriendInput] = useState('');

  const fetchSocialData = async () => {
    try {
      const { data: followingData } = await supabase.from('follows').select('following_pseudo').eq('follower_pseudo', myPseudo).eq('status', 'accepted');
      if (followingData && followingData.length > 0) {
        setFriends(followingData);
      } else {
        setFriends(MOCK_FRIENDS);
      }
    } catch (e) {
      setFriends(MOCK_FRIENDS);
    }

    // Construire un classement riche combinant les amis et le score en direct de l'utilisateur
    const baseBoard = [...MOCK_LEADERBOARD];
    const myCurrentScore = todayScore !== null ? todayScore : 5;
    const existingMeIdx = baseBoard.findIndex(x => x.user_pseudo === myPseudo);
    const myEntry = {
      user_pseudo: myPseudo,
      score: myCurrentScore,
      streak: 3,
      finished_at: new Date().toISOString()
    };
    if (existingMeIdx >= 0) baseBoard[existingMeIdx] = myEntry;
    else baseBoard.push(myEntry);

    baseBoard.sort((a, b) => b.score - a.score || (b.streak || 0) - (a.streak || 0));
    setLeaderboard(baseBoard);
  };

  useEffect(() => { 
    fetchSocialData(); 
  }, [myPseudo, todayScore]);

  const handleAddFriend = async () => {
    const target = newFriendInput.trim();
    if (!target) return;
    triggerHaptic('success');
    setFriends(prev => {
      if (prev.some(f => (f.following_pseudo || f.pseudo) === target)) return prev;
      return [...prev, { following_pseudo: target, bio: 'Nouvel explorateur QULT ⚡️' }];
    });
    setNewFriendInput('');
    Alert.alert("Ami ajouté ! 🎉", `${target} fait maintenant partie de ton Cercle QULT.`);
    try {
      await supabase.from('follows').insert({ follower_pseudo: myPseudo, following_pseudo: target, status: 'accepted' });
    } catch (e) {}
  };

  return (
    <View style={[styles.container, {paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20}]}>
      <View style={styles.cercleHeader}>
        <Text style={styles.sectionHeaderTitle}>Cercle QULT 🌍</Text>
        <Text style={styles.sectionSubtitle}>Défie tes amis au quiz quotidien et partage tes découvertes</Text>
      </View>

      {/* Ajout d'ami rapide */}
      <View style={styles.addFriendBox}>
        <Ionicons name="search" size={18} color="#71717a" style={{ marginRight: 8 }} />
        <TextInput 
          style={styles.addFriendInput}
          placeholder="Ajouter un ami par son pseudo..."
          placeholderTextColor="#71717a"
          value={newFriendInput}
          onChangeText={setNewFriendInput}
          onSubmitEditing={handleAddFriend}
        />
        <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend} activeOpacity={0.8}>
          <Ionicons name="person-add" size={16} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PODIUM & CLASSEMENT */}
        <View style={styles.leaderboardBox}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="trophy" size={20} color={COLORS.gold} />
              <Text style={styles.leaderboardTitle}>CLASSEMENT DU JOUR</Text>
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{getFormattedDate()}</Text>
          </View>

          {leaderboard.map((item, index) => {
            const isTop3 = index < 3;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
            const isMe = item.user_pseudo === myPseudo;
            const fMeta = FRIEND_META_MAP[item.user_pseudo] || { avatar: isMe ? '🎓' : '👤' };
            return (
              <TouchableOpacity 
                key={item.user_pseudo + index} 
                onPress={() => onOpenProfile(item.user_pseudo)} 
                style={[styles.rankRow, isMe && styles.rankRowMe]}
                activeOpacity={0.8}
              >
                <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                  <Text style={[styles.rankBadge, isTop3 && {fontSize: 18}]}>{medal}</Text>
                  <Text style={{ fontSize: 18 }}>{fMeta.avatar}</Text>
                  <View>
                    <Text style={[styles.friendName, isMe && {color: COLORS.primary, fontWeight: 'bold'}]}>
                      {item.user_pseudo} {isMe ? '(Toi)' : ''}
                    </Text>
                    {item.streak >= 1 ? (
                      <Text style={{color: COLORS.orange, fontSize: 11, fontWeight: 'bold'}}>
                        🔥 {item.streak} j d'affilée
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={{alignItems:'flex-end'}}>
                  <Text style={[styles.rankScore, isMe && {color: COLORS.primary}]}>{item.score}/5</Text>
                  <Text style={styles.rankTime}>
                    {item.finished_at ? new Date(item.finished_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : 'Aujourd hui'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AMIS & MESSAGERIE */}
        <Text style={styles.subSectionTitle}>DISCUSSION & PARTAGE ({friends.length})</Text>
        {friends.map((f, i) => {
          const pseudo = f.following_pseudo || f.pseudo;
          const fMeta = FRIEND_META_MAP[pseudo] || { avatar: '👤', bio: f.bio || 'Explorateur de savoir' };
          return (
            <TouchableOpacity 
              key={pseudo + i} 
              onPress={() => setChatModal({visible: true, friend: pseudo})} 
              style={styles.friendRow}
              activeOpacity={0.8}
            >
              <View style={{flexDirection:'row', alignItems:'center', gap: 12, flex: 1}}>
                <View style={styles.avatarCircle}><Text style={{fontSize: 20}}>{fMeta.avatar}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Text style={styles.friendName}>{pseudo}</Text>
                    <View style={styles.onlineDot} />
                  </View>
                  <Text style={{color: COLORS.textMuted, fontSize: 12, marginTop: 2}} numberOfLines={1}>
                    {fMeta.bio}
                  </Text>
                </View>
              </View>
              <View style={{flexDirection:'row', gap: 10, alignItems: 'center'}}>
                <TouchableOpacity onPress={() => onOpenProfile(pseudo)} style={styles.friendActionIcon}>
                  <Ionicons name="stats-chart" color={COLORS.textMuted} size={17}/>
                </TouchableOpacity>
                <View style={styles.chatIconBadge}>
                  <Ionicons name="chatbubble-ellipses" color="#000" size={16}/>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{height: 110}} />
      </ScrollView>

      <ChatModal 
        visible={chatModal.visible} 
        onClose={() => setChatModal({visible: false, friend: null})} 
        myPseudo={myPseudo} 
        friendPseudo={chatModal.friend} 
        allCards={allCards}
      />
    </View>
  );
};

// 5. ÉCRAN PROFIL, BIBLIOTHÈQUE D'ACQUIS & STATISTIQUES
const StatsScreen = ({ 
  targetPseudo, 
  isCurrentUser, 
  onBack, 
  todayScore, 
  allCards,
  likedCards, 
  memorizedCards, 
  toggleLike,
  toggleMemorize,
  onLogout 
}) => {
  const [activeSubTab, setActiveSubTab] = useState('memorized'); // 'memorized' | 'liked' | 'stats'
  const [selectedCard, setSelectedCard] = useState(null);

  const memorizedList = useMemo(() => {
    if (!allCards) return [];
    return allCards.filter(c => memorizedCards.has(c.id));
  }, [allCards, memorizedCards]);

  const likedList = useMemo(() => {
    if (!allCards) return [];
    return allCards.filter(c => likedCards.has(c.id));
  }, [allCards, likedCards]);

  // Calcul du grade dynamique
  const totalAcquis = isCurrentUser ? memorizedList.length : 6;
  const userRank = totalAcquis >= 10 
    ? '👑 Grand Maître QULT' 
    : totalAcquis >= 5 
    ? '🎓 Érudit Confirmé' 
    : totalAcquis >= 2 
    ? '🧭 Explorateur de Savoir' 
    : '🌱 Esprit Curieux';

  // Calcul de la répartition réelle par thème
  const categoryData = useMemo(() => {
    const sourceCards = memorizedList.length > 0 ? memorizedList : (allCards || []);
    const counts = { Histoire: 0, Science: 0, Art: 0, Nature: 0, Tech: 0 };
    sourceCards.forEach(c => {
      const { primaryTopic } = getCardThemeAndCategory(c);
      if (counts[primaryTopic] !== undefined) counts[primaryTopic] += 1;
      else counts.Science += 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return [
      { name: "Histoire", population: Math.round((counts.Histoire / total) * 100) || 20, color: "#f59e0b", legendFontColor: "#fff", legendFontSize: 12 },
      { name: "Science", population: Math.round((counts.Science / total) * 100) || 25, color: "#38bdf8", legendFontColor: "#fff", legendFontSize: 12 },
      { name: "Art", population: Math.round((counts.Art / total) * 100) || 20, color: "#ec4899", legendFontColor: "#fff", legendFontSize: 12 },
      { name: "Nature", population: Math.round((counts.Nature / total) * 100) || 15, color: "#10b981", legendFontColor: "#fff", legendFontSize: 12 },
      { name: "Tech", population: Math.round((counts.Tech / total) * 100) || 20, color: "#4ade80", legendFontColor: "#fff", legendFontSize: 12 }
    ];
  }, [memorizedList, allCards]);

  const chartConfig = { 
    backgroundGradientFromOpacity: 0, 
    backgroundGradientToOpacity: 0, 
    color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
    labelColor: () => '#ffffff'
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView style={styles.statsScroll} contentContainerStyle={{paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 110}} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          {!isCurrentUser && ( 
            <TouchableOpacity onPress={onBack} style={styles.profileBackBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={26} color="white" />
            </TouchableOpacity> 
          )}
          <View style={styles.avatarMain}>
            <Text style={{fontSize: 38}}>{FRIEND_META_MAP[targetPseudo]?.avatar || '🎓'}</Text>
          </View>
          <Text style={styles.profilePseudo}>{targetPseudo}</Text>
          <View style={styles.rankPillBadge}>
            <Text style={styles.rankPillText}>{userRank}</Text>
          </View>

          {/* Compteurs cliquables pour basculer entre Acquis, Favoris et Stats */}
          <View style={styles.profileStatsRow}>
            <TouchableOpacity 
              style={styles.profileStatItem} 
              onPress={() => { triggerHaptic('light'); setActiveSubTab('memorized'); }}
            >
              <Text style={[styles.profileStatNum, activeSubTab === 'memorized' && { color: COLORS.primary }]}>
                {isCurrentUser ? memorizedList.length : 6}
              </Text>
              <Text style={styles.profileStatLabel}>📌 Appris</Text>
            </TouchableOpacity>
            <View style={styles.profileStatDivider} />
            <TouchableOpacity 
              style={styles.profileStatItem} 
              onPress={() => { triggerHaptic('light'); setActiveSubTab('liked'); }}
            >
              <Text style={[styles.profileStatNum, activeSubTab === 'liked' && { color: COLORS.secondary }]}>
                {isCurrentUser ? likedList.length : 4}
              </Text>
              <Text style={styles.profileStatLabel}>❤️ Favoris</Text>
            </TouchableOpacity>
            <View style={styles.profileStatDivider} />
            <TouchableOpacity 
              style={styles.profileStatItem} 
              onPress={() => { triggerHaptic('light'); setActiveSubTab('stats'); }}
            >
              <Text style={[styles.profileStatNum, activeSubTab === 'stats' && { color: COLORS.gold }]}>
                {todayScore !== null ? `${todayScore}/5` : "5/5"}
              </Text>
              <Text style={styles.profileStatLabel}>🏆 Quiz du Jour</Text>
            </TouchableOpacity>
          </View>

          {isCurrentUser && (
            <View style={styles.profileSubTabsRow}>
              <TouchableOpacity 
                style={[styles.profileSubTabBtn, activeSubTab === 'memorized' && styles.profileSubTabBtnActive]}
                onPress={() => { triggerHaptic('light'); setActiveSubTab('memorized'); }}
              >
                <Text style={[styles.profileSubTabText, activeSubTab === 'memorized' && styles.profileSubTabTextActive]}>
                  📌 Mes Acquis ({memorizedList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.profileSubTabBtn, activeSubTab === 'liked' && styles.profileSubTabBtnActive]}
                onPress={() => { triggerHaptic('light'); setActiveSubTab('liked'); }}
              >
                <Text style={[styles.profileSubTabText, activeSubTab === 'liked' && styles.profileSubTabTextActive]}>
                  ❤️ Favoris ({likedList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.profileSubTabBtn, activeSubTab === 'stats' && styles.profileSubTabBtnActive]}
                onPress={() => { triggerHaptic('light'); setActiveSubTab('stats'); }}
              >
                <Text style={[styles.profileSubTabText, activeSubTab === 'stats' && styles.profileSubTabTextActive]}>
                  📊 Stats
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ONGLET 1 & 2 : BIBLIOTHÈQUE DES CARTES APPRISES OU AIMÉES */}
        {isCurrentUser && (activeSubTab === 'memorized' || activeSubTab === 'liked') ? (
          <View>
            {(activeSubTab === 'memorized' ? memorizedList : likedList).length === 0 ? (
              <View style={styles.emptyLibraryBox}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>{activeSubTab === 'memorized' ? '📌' : '❤️'}</Text>
                <Text style={styles.emptyLibraryTitle}>
                  {activeSubTab === 'memorized' ? 'Aucune fiche enregistrée dans tes acquis' : 'Aucun favori pour le moment'}
                </Text>
                <Text style={styles.emptyLibrarySub}>
                  {activeSubTab === 'memorized' 
                    ? 'Touche le bouton « Retenir » sur les fiches du feed pour construire ton Second Cerveau et les réviser ici !'
                    : 'Double-tape sur une carte ou touche le cœur pour retrouver tes pépites préférées ici.'}
                </Text>
              </View>
            ) : (
              (activeSubTab === 'memorized' ? memorizedList : likedList).map((card) => {
                const { primaryTopic } = getCardThemeAndCategory(card);
                const meta = getCategoryMeta(primaryTopic);
                const { title, intro } = parseCardContent(card);
                return (
                  <TouchableOpacity 
                    key={card.id} 
                    style={styles.savedCardItem} 
                    onPress={() => setSelectedCard(card)}
                    activeOpacity={0.85}
                  >
                    <Image 
                      source={{ uri: getSafeImageUrl(card) }} 
                      style={styles.savedCardThumb} 
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.savedCardBody}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.savedCardTopic, { color: meta.color }]}>
                          {meta.emoji} {primaryTopic.toUpperCase()}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#71717a" />
                      </View>
                      <Text style={styles.savedCardTitle} numberOfLines={2}>{title}</Text>
                      <Text style={styles.savedCardExcerpt} numberOfLines={2}>{intro}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          /* ONGLET 3 : STATISTIQUES & HISTORIQUE */
          <View>
            <Text style={styles.sectionHeaderTitle}>Répartition des Connaissances 📊</Text>
            <View style={styles.chartWrapper}>
              <PieChart 
                data={categoryData} 
                width={SCREEN_WIDTH - 40} 
                height={180} 
                chartConfig={chartConfig} 
                accessor={"population"} 
                backgroundColor={"transparent"} 
                paddingLeft={"15"} 
              />
            </View>

            <Text style={[styles.sectionHeaderTitle, {marginTop: 25}]}>Historique des Quiz 📜</Text>
            <View style={styles.historyContainer}> 
              {[
                { date: 'Aujourd hui', score: todayScore !== null ? todayScore : 5 },
                { date: 'Hier', score: 5 },
                { date: '25 Oct.', score: 4 },
                { date: '24 Oct.', score: 5 },
              ].map((h, i) => ( 
                <View key={i} style={styles.historyItem}> 
                  <Text style={styles.historyDate}>{h.date}</Text> 
                  <View style={styles.historyScoreBar}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <View 
                        key={star} 
                        style={[
                          styles.historyDot, 
                          { backgroundColor: star <= h.score ? getScoreColor(h.score) : '#27272a' }
                        ]} 
                      />
                    ))}
                  </View> 
                  <Text style={[styles.historyScoreNum, {color: getScoreColor(h.score)}]}>{h.score}/5</Text> 
                </View> 
              ))} 
            </View>
          </View>
        )}

        {isCurrentUser && ( 
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={16} color={COLORS.wrong} style={{marginRight: 6}} />
            <Text style={styles.logoutText}>Se déconnecter ({targetPseudo})</Text>
          </TouchableOpacity> 
        )}
      </ScrollView>

      <DetailModal 
        visible={!!selectedCard} 
        card={selectedCard} 
        onClose={() => setSelectedCard(null)} 
        isLiked={selectedCard ? likedCards.has(selectedCard.id) : false}
        isMemorized={selectedCard ? memorizedCards.has(selectedCard.id) : false}
        onToggleLike={toggleLike}
        onToggleMemorize={toggleMemorize}
      />
    </View>
  );
};

// --- APP ROOT COMPONENT ---

export default function App() {
  const [session, setSession] = useState(null);
  const [userPseudo, setUserPseudo] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [allCards, setAllCards] = useState([]); 
  const [allQuizQuestions, setAllQuizQuestions] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [likedCards, setLikedCards] = useState(new Set());
  const [memorizedCards, setMemorizedCards] = useState(new Set());
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [todayScore, setTodayScore] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [visitingProfile, setVisitingProfile] = useState(null);

  // 1. Initialisation de la Session & Hydratation AsyncStorage
  useEffect(() => {
    const initApp = async () => {
      try {
        const savedPseudo = await AsyncStorage.getItem(STORAGE_KEYS.USER_PSEUDO);
        if (savedPseudo) {
          setUserPseudo(savedPseudo);
        }

        const savedLikes = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_CARDS);
        if (savedLikes) {
          setLikedCards(new Set(JSON.parse(savedLikes)));
        } else {
          // Initialiser avec 2 vrais UUIDs de cartes existantes
          const defaultLikes = ['212e4a8f-a930-4aa9-8bcf-5f7839dd84ec', '74f5b1dd-0c98-4120-bc3c-cdb08810a8f5'];
          setLikedCards(new Set(defaultLikes));
        }

        const savedMemos = await AsyncStorage.getItem(STORAGE_KEYS.MEMORIZED_CARDS);
        if (savedMemos) {
          setMemorizedCards(new Set(JSON.parse(savedMemos)));
        } else {
          // Initialiser avec 3 vrais UUIDs de cartes existantes
          const defaultMemos = [
            '40e367ce-7b2d-4dde-a9d7-525c1927866d',
            '74f5b1dd-0c98-4120-bc3c-cdb08810a8f5',
            '077b77d7-a30f-452b-a8d9-d619ecc7ed51'
          ];
          setMemorizedCards(new Set(defaultMemos));
        }

        const todayIso = getLocalDateISO();
        const playedTodayStr = await AsyncStorage.getItem(STORAGE_KEYS.PLAYED_TODAY + todayIso);
        const scoreTodayStr = await AsyncStorage.getItem(STORAGE_KEYS.TODAY_SCORE + todayIso);
        if (playedTodayStr === 'true') {
          setHasPlayedToday(true);
          if (scoreTodayStr !== null) setTodayScore(parseInt(scoreTodayStr, 10));
        }

        const { data: { session: existingSession } } = await supabase.auth.getSession();
        setSession(existingSession);
        if (existingSession) extractPseudo(existingSession);
      } catch (e) {
        // continue
      } finally {
        setLoadingAuth(false);
      }
    };

    initApp();

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) extractPseudo(session);
    });
  }, []);

  const extractPseudo = (session) => {
    if (session?.user?.user_metadata?.pseudo) {
      const p = session.user.user_metadata.pseudo;
      setUserPseudo(p);
      AsyncStorage.setItem(STORAGE_KEYS.USER_PSEUDO, p).catch(() => {});
    } else {
      const rawEmail = session?.user?.email?.split('@')[0] || 'Victor';
      const p = rawEmail.charAt(0).toUpperCase() + rawEmail.slice(1);
      setUserPseudo(p);
      AsyncStorage.setItem(STORAGE_KEYS.USER_PSEUDO, p).catch(() => {});
    }
  };

  useEffect(() => { 
    if (session || userPseudo) { 
      loadData(); 
      loadQuiz(); 
    } 
  }, [session, userPseudo]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*, themes(id, name, categories(name))')
        .order('importance_level', { ascending: false });
      
      if (data && !error && data.length > 0) {
        data.slice(0, 12).forEach(c => {
          const url = getSafeImageUrl(c);
          if (url) Image.prefetch(url);
        });
        setAllCards(data);
        return;
      }
    } catch (e) {
      // ignore
    }
    setAllCards(MOCK_CARDS);
  };

  const loadQuiz = async (extraSeed = 0) => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*, cards(*, themes(id, name, categories(name)))'); 
      if (data && !error && data.length > 0) {
        setAllQuizQuestions(data);
        const shuffled = seededShuffle(data, extraSeed);
        setQuizQuestions(shuffled.slice(0, 5));
        return;
      }
    } catch (e) {
      // ignore
    }
    setAllQuizQuestions(MOCK_QUIZ_QUESTIONS);
    setQuizQuestions(MOCK_QUIZ_QUESTIONS);
  };

  const toggleLike = useCallback((card) => {
    setLikedCards(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(card.id)) newLiked.delete(card.id); 
      else newLiked.add(card.id);
      AsyncStorage.setItem(STORAGE_KEYS.LIKED_CARDS, JSON.stringify(Array.from(newLiked))).catch(() => {});
      return newLiked;
    });
  }, []);

  const toggleMemorize = useCallback((card) => {
    setMemorizedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(card.id)) newSet.delete(card.id); 
      else newSet.add(card.id);
      AsyncStorage.setItem(STORAGE_KEYS.MEMORIZED_CARDS, JSON.stringify(Array.from(newSet))).catch(() => {});
      return newSet;
    });
  }, []);

  const saveScore = async (score) => {
    const safeScore = Math.min(Math.max(score, 0), 5);
    setTodayScore(safeScore);
    setHasPlayedToday(true);
    triggerHaptic('success');
    
    const todayIso = getLocalDateISO();
    AsyncStorage.setItem(STORAGE_KEYS.PLAYED_TODAY + todayIso, 'true').catch(() => {});
    AsyncStorage.setItem(STORAGE_KEYS.TODAY_SCORE + todayIso, safeScore.toString()).catch(() => {});

    try {
      await supabase.from('user_quiz_history').insert({ 
        user_pseudo: userPseudo || 'Victor', 
        score: safeScore, 
        quiz_date: todayIso 
      });
    } catch (e) {}
  };

  const handleDemoLogin = (pseudoName = 'Victor') => {
    setUserPseudo(pseudoName);
    setSession({ user: { email: `${pseudoName.toLowerCase()}@qult.app` } });
    AsyncStorage.setItem(STORAGE_KEYS.USER_PSEUDO, pseudoName).catch(() => {});
    triggerHaptic('success');
  };

  const handleLogout = async () => { 
    triggerHaptic('light');
    try {
      await supabase.auth.signOut(); 
    } catch (e) {}
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PSEUDO).catch(() => {});
    setSession(null); 
    setUserPseudo(null);
    setVisitingProfile(null);
    setCurrentTab('home');
  };

  const openProfile = (pseudo) => { 
    triggerHaptic('light');
    setVisitingProfile(pseudo === (userPseudo || 'Victor') ? null : pseudo); 
    setCurrentTab('stats'); 
  };
  
  const closeProfile = () => { 
    triggerHaptic('light');
    setVisitingProfile(null); 
  };

  if (loadingAuth) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!session && !userPseudo) {
    return <AuthScreen onDemoLogin={handleDemoLogin} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {currentTab === 'home' && (
        <HomeScreen 
          allCards={allCards} 
          allQuizQuestions={allQuizQuestions}
          toggleLike={toggleLike} 
          toggleMemorize={toggleMemorize} 
          likedCards={likedCards} 
          memorizedCards={memorizedCards} 
          myPseudo={userPseudo || 'Victor'} 
          onGoToProfile={() => { triggerHaptic('light'); setVisitingProfile(null); setCurrentTab('stats'); }}
        />
      )}

      {currentTab === 'quiz' && (
        <QuizDailyScreen 
          questions={quizQuestions} 
          hasPlayed={hasPlayedToday} 
          todayScore={todayScore} 
          onFinish={saveScore} 
          onResetForPractice={() => {
            setHasPlayedToday(false);
            loadQuiz(Math.floor(Math.random() * 100));
          }}
          likedCards={likedCards}
          memorizedCards={memorizedCards}
          toggleLike={toggleLike}
          toggleMemorize={toggleMemorize}
        />
      )}

      {currentTab === 'friends' && (
        <FriendsScreen 
          myPseudo={userPseudo || 'Victor'} 
          todayScore={todayScore}
          onOpenProfile={openProfile} 
          allCards={allCards}
        />
      )}

      {currentTab === 'stats' && (
        <StatsScreen 
          targetPseudo={visitingProfile || userPseudo || 'Victor'} 
          isCurrentUser={!visitingProfile} 
          onBack={visitingProfile ? closeProfile : null}
          todayScore={visitingProfile ? null : todayScore}
          allCards={allCards}
          likedCards={likedCards}
          memorizedCards={memorizedCards}
          toggleLike={toggleLike}
          toggleMemorize={toggleMemorize}
          onLogout={handleLogout} 
        />
      )}

      {/* Floating Modern Tab Bar */}
      <View style={styles.navBar}>
        <NavIcon 
          icon="compass" 
          label="Découvrir" 
          active={currentTab === 'home'} 
          onPress={() => { triggerHaptic('light'); setVisitingProfile(null); setCurrentTab('home'); }} 
        />
        
        {/* Bouton central Quiz flottant avec lueur */}
        <View style={styles.quizBtnWrapper}>
          <TouchableOpacity 
            style={styles.quizBtnCenter} 
            activeOpacity={0.85}
            onPress={() => { triggerHaptic('success'); setVisitingProfile(null); setCurrentTab('quiz'); }}
          >
            <Ionicons name="school" size={26} color="#000" />
          </TouchableOpacity>
          {!hasPlayedToday && (
            <View style={styles.quizReadyDot} />
          )}
        </View>

        <NavIcon 
          icon="people" 
          label="Cercle" 
          active={currentTab === 'friends'} 
          onPress={() => { triggerHaptic('light'); setVisitingProfile(null); setCurrentTab('friends'); }} 
        />
        
        <NavIcon 
          icon="person" 
          label="Profil" 
          active={currentTab === 'stats' && !visitingProfile} 
          badgeCount={memorizedCards.size}
          onPress={() => { triggerHaptic('light'); setVisitingProfile(null); setCurrentTab('stats'); }} 
        />
      </View>
    </GestureHandlerRootView>
  );
}

// --- STYLES MODERNES & ERGONOMIQUES ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  
  // Navigation
  navBar: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    height: 85, 
    backgroundColor: 'rgba(10, 10, 12, 0.96)', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#27272a' 
  },
  navItem: { alignItems: 'center', width: 72 }, 
  navLabel: { fontSize: 11, marginTop: 4 },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center'
  },
  navBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  quizBtnWrapper: { position: 'relative', top: -20, alignItems: 'center' },
  quizBtnCenter: { 
    width: 58, 
    height: 58, 
    borderRadius: 29, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: '#000',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  quizReadyDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: '#000'
  },

  // Auth Screen
  loginContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 25 },
  loginLogoBadge: { 
    width: 84, 
    height: 84, 
    borderRadius: 26, 
    backgroundColor: '#18181b', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  loginTitle: { color: 'white', fontSize: 38, fontWeight: '900', letterSpacing: 2 },
  loginSubtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 6, textAlign: 'center' },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#18181b', 
    borderRadius: 14, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: '#27272a',
    paddingHorizontal: 15
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: 'white', paddingVertical: 16, fontSize: 16 },
  loginBtn: { 
    backgroundColor: COLORS.primary, 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8
  },
  loginBtnText: { fontWeight: 'bold', fontSize: 17, color: '#000' },
  quickLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow
  },
  quickLoginText: { color: COLORS.primary, fontWeight: '700', fontSize: 14, marginLeft: 6 },

  // Feed Top Header & Category Bar
  feedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 34,
  },
  feedHeaderTop: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  feedLogoBox: { flexDirection: 'row', alignItems: 'center' },
  feedLogoText: { color: '#ffffff', fontSize: 23, fontWeight: '900', letterSpacing: 2 },
  neonDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.primary, marginLeft: 2, marginTop: 6 },
  learnedCounterPill: {
    marginLeft: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)'
  },
  learnedCounterText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  userStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 12, 0.72)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  statusDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 7 },
  streakNum: { color: COLORS.orange, fontWeight: 'bold', fontSize: 12, marginLeft: 3 },
  headerUserText: { color: '#ffffff', fontWeight: '600', fontSize: 12 },

  categoryFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 6
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(12, 12, 14, 0.72)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  categoryChipText: { color: '#e4e4e7', fontSize: 12, fontWeight: '600' },
  categoryChipTextActive: { color: '#000000', fontWeight: '800' },

  emptyFeedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyFeedTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  emptyFeedSub: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  emptyFeedBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  emptyFeedBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  // Feed Card
  cardPlaceholderPattern: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardPlaceholderEmoji: { fontSize: 72, opacity: 0.35 },
  cardUi: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingBottom: 102 
  },
  cardContent: { flex: 1, justifyContent: 'flex-end', paddingRight: 12 },
  
  // Méta ligne (Tags + Pagination)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  tagGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  tag: { 
    paddingHorizontal: 9, 
    paddingVertical: 4, 
    borderRadius: 7 
  },
  tagText: { fontWeight: '800', fontSize: 11, color: '#000' },
  themeTag: { 
    backgroundColor: 'rgba(255, 255, 255, 0.18)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 7,
  },
  themeTagText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  
  horizontalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 6
  },
  dotsRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  indicatorDot: { height: 4, borderRadius: 2 },
  indicatorDotActive: { width: 14, backgroundColor: COLORS.primary },
  indicatorDotInactive: { width: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  horizontalPillText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' },

  // Titre & Caption (Instagram Post Description Style)
  cardTitle: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: '800', 
    lineHeight: 26, 
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  captionTouchable: { marginTop: 2 },
  cardCaption: { 
    color: '#f4f4f5', 
    fontSize: 13.5, 
    lineHeight: 19.5, 
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  readMorePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 9,
    gap: 5
  },
  readMorePillText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800'
  },

  // Action Rail
  cardActions: { justifyContent: 'flex-end', gap: 14, paddingBottom: 4 },
  actionBtn: { alignItems: 'center' },
  actionIconCircle: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    backgroundColor: 'rgba(10, 10, 12, 0.7)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.18)' 
  },
  actionText: { color: 'white', fontSize: 11, marginTop: 3, fontWeight: '600' },
  heartOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none' },

  // Detail Modal (« Lire + »)
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: { 
    height: '88%', 
    backgroundColor: '#121214', 
    borderTopLeftRadius: 26, 
    borderTopRightRadius: 26, 
    paddingHorizontal: 20,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  dragIndicator: { width: 38, height: 4, backgroundColor: '#3f3f46', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTopicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  modalCat: { fontWeight: '800', fontSize: 11 },
  modalReadTime: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  closeRoundBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff', lineHeight: 29, marginBottom: 12 },
  
  modalQuickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  modalQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  modalQuickBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  modalImageWrapper: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#27272a' },
  modalImage: { width: '100%', height: 210, backgroundColor: '#18181b' },
  modalImageCaptionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingVertical: 8 },
  modalImageCaptionText: { color: '#d4d4d8', fontSize: 11, fontWeight: '600' },

  modalLeadBox: {
    backgroundColor: '#18181b',
    borderLeftWidth: 4,
    padding: 15,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  modalLeadLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  modalLeadText: { fontSize: 15, lineHeight: 23, color: '#ffffff', fontWeight: '600' },
  
  deepDiveSection: { marginBottom: 18 },
  sectionIconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalDeepDiveHeader: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  modalText: { fontSize: 15.5, lineHeight: 25, color: '#d4d4d8' },

  funFactBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 18
  },
  funFactTitle: { color: COLORS.gold, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  funFactText: { color: '#fef3c7', fontSize: 14.5, lineHeight: 22, fontWeight: '500' },

  inlineQuizBox: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 8
  },
  inlineQuizHeader: { color: COLORS.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  inlineQuizQuestion: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  inlineQuizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  inlineQuizOptLetter: { color: COLORS.primary, fontWeight: '800', marginRight: 8, fontSize: 14 },
  inlineQuizOptText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  inlineQuizExplanation: { color: '#d4d4d8', fontSize: 13, lineHeight: 19, marginTop: 10 },

  modalFooterActions: { marginTop: 16, alignItems: 'center' },
  modalShareAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '100%',
    backgroundColor: COLORS.primary, 
    paddingVertical: 14, 
    paddingHorizontal: 22, 
    borderRadius: 16,
  },
  modalShareText: { color: '#000', fontWeight: '800', fontSize: 15, marginLeft: 8 },

  // Chat
  chatHeader: { 
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 52 : 36, 
    paddingBottom: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#27272a' 
  },
  backBtn: { padding: 4 },
  chatTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  chatStatus: { color: COLORS.textMuted, fontSize: 11 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  chatBubble: { padding: 12, borderRadius: 18 },
  chatBubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  chatBubbleOther: { backgroundColor: '#27272a', borderBottomLeftRadius: 4 },
  quickReplyBar: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#18181b', backgroundColor: '#09090b' },
  quickReplyChip: { backgroundColor: '#18181b', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#27272a' },
  quickReplyText: { color: '#e4e4e7', fontSize: 12, fontWeight: '600' },
  chatInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#27272a',
    backgroundColor: '#09090b',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12
  },
  chatInput: { flex: 1, backgroundColor: '#18181b', color: 'white', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 25, fontSize: 15 },
  sendBtn: { marginLeft: 10, backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  chatCardBubble: { backgroundColor: '#18181b', borderRadius: 14, overflow: 'hidden', marginBottom: 6, borderWidth: 1, borderColor: '#27272a' },
  chatCardImg: { width: 240, height: 125 },
  chatCardCat: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  chatCardTitle: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  // Share Modal
  sharePreviewBox: { flexDirection:'row', alignItems:'center', backgroundColor: '#18181b', borderRadius: 12, padding: 8, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  sharePreviewImg: { width: 48, height: 48, borderRadius: 8, marginRight: 10 },
  shareInput: { flex: 1, height: 44, color: '#fff', fontSize: 14 },
  friendRowSelect: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  friendName: { color: 'white', fontSize: 15, fontWeight: '600' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#3f3f46', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  shareExternalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 10 },
  sendConfirmBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  sendConfirmBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  // Quiz
  quizContainer: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40 },
  dateText: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  quizHeader: { marginBottom: 20 },
  quizProgress: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  pointsBadge: { backgroundColor: '#18181b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: '#18181b', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  questionText: { color: 'white', fontSize: 21, fontWeight: '800', lineHeight: 29, marginBottom: 22 },
  optionsContainer: { gap: 12 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1.5 },
  optionLetterBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  optionLetter: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  optionText: { color: 'white', fontSize: 15, fontWeight: '600', flex: 1 },
  explanationBox: { backgroundColor: '#18181b', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#27272a' },
  explanationTitle: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  explanationText: { color: '#d4d4d8', fontSize: 14, lineHeight: 21 },
  quizOpenCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a'
  },
  quizOpenCardBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', flex: 1 },
  nextBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, marginTop: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  quizTitle: { color: 'white', fontSize: 26, fontWeight: '900', marginBottom: 6 },
  scoreCenteredBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scoreBig: { fontSize: 36, fontWeight: '900' },
  shareScoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 14
  },
  shareScoreBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  quizTimerBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#121214', 
    paddingVertical: 10, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#27272a',
    marginBottom: 16
  },
  quizTimerText: { color: COLORS.textMuted, fontSize: 13 },
  recapTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  recapItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#27272a' },
  recapBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recapText: { color: 'white', fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  practiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272a', paddingVertical: 14, borderRadius: 14, marginTop: 8 },

  // Cercle & Leaderboard
  cercleHeader: { marginBottom: 14 },
  sectionHeaderTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  sectionSubtitle: { color: COLORS.textMuted, fontSize: 13 },
  addFriendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121214',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16
  },
  addFriendInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 8 },
  addFriendBtn: { backgroundColor: COLORS.primary, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  subSectionTitle: { color: COLORS.textMuted, fontWeight:'bold', fontSize: 13, marginVertical: 14 },
  leaderboardBox: { backgroundColor: '#121214', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272a' },
  leaderboardTitle: { color: COLORS.gold, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  rankRowMe: { backgroundColor: 'rgba(74, 222, 128, 0.08)', borderRadius: 10, paddingHorizontal: 10 },
  rankBadge: { width: 24, color: COLORS.gold, fontWeight: 'bold', textAlign: 'center' },
  rankScore: { color: 'white', fontWeight: '800', fontSize: 16 },
  rankTime: { color: COLORS.textDark, fontSize: 11 },
  friendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#121214', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1e1e24' },
  friendActionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  chatIconBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // Stats / Profil & Bibliothèque
  statsScroll: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 18 },
  profileBackBtn: { position:'absolute', left: 0, top: 0, zIndex: 10, padding: 8 },
  avatarMain: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: COLORS.primary },
  profilePseudo: { color: 'white', fontSize: 25, fontWeight: '900' },
  rankPillBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)'
  },
  rankPillText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  profileStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121214', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginVertical: 16, borderWidth: 1, borderColor: '#27272a', width: '100%' },
  profileStatItem: { alignItems: 'center', flex: 1 },
  profileStatDivider: { width: 1, height: 26, backgroundColor: '#27272a' },
  profileStatNum: { color: 'white', fontSize: 20, fontWeight: '800' },
  profileStatLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 3, fontWeight: '600' },
  
  profileSubTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#121214',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    width: '100%'
  },
  profileSubTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center'
  },
  profileSubTabBtnActive: {
    backgroundColor: '#27272a'
  },
  profileSubTabText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  profileSubTabTextActive: { color: '#ffffff', fontWeight: '800' },

  savedCardItem: {
    flexDirection: 'row',
    backgroundColor: '#121214',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  savedCardThumb: { width: 95, height: '100%', minHeight: 95, backgroundColor: '#18181b' },
  savedCardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  savedCardTopic: { fontSize: 10, fontWeight: '800', marginBottom: 3 },
  savedCardTitle: { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 19, marginBottom: 4 },
  savedCardExcerpt: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16 },

  emptyLibraryBox: {
    backgroundColor: '#121214',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
    marginTop: 8
  },
  emptyLibraryTitle: { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  emptyLibrarySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 28, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#18181b', borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  logoutText: { color: COLORS.wrong, fontSize: 13, fontWeight: 'bold' },
  chartWrapper: { backgroundColor: '#121214', borderRadius: 16, padding: 10, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  historyContainer: { marginTop: 10 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  historyDate: { color: COLORS.textMuted, width: 85, fontSize: 13, fontWeight: '600' },
  historyScoreBar: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyScoreNum: { fontWeight: '800', width: 40, textAlign: 'right', fontSize: 15 },
});

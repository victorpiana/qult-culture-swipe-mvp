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

import { MOCK_CARDS, MOCK_QUIZ_QUESTIONS, MOCK_LEADERBOARD, MOCK_FRIENDS, MOCK_MESSAGES, CardItem, QuizQuestion } from './data/mockData';
import { COLORS, METRICS } from './constants/theme';

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

// Clés de persistance locale
const STORAGE_KEYS = {
  USER_PSEUDO: '@qult_user_pseudo',
  LIKED_CARDS: '@qult_liked_cards',
  MEMORIZED_CARDS: '@qult_memorized_cards',
  TODAY_SCORE: '@qult_today_score_',
  PLAYED_TODAY: '@qult_played_today_'
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

const seededShuffle = (array) => {
  const dateStr = getLocalDateISO();
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
const getCategoryMeta = (catName) => {
  const norm = (catName || '').toLowerCase();
  if (norm.includes('hist')) {
    return {
      emoji: '🏛️',
      color: '#f59e0b',
      gradient: ['#291503', '#160b02', '#000000']
    };
  }
  if (norm.includes('sci')) {
    return {
      emoji: '⚛️',
      color: '#38bdf8',
      gradient: ['#041d2e', '#020e17', '#000000']
    };
  }
  if (norm.includes('nat') || norm.includes('insol')) {
    return {
      emoji: '🌿',
      color: '#10b981',
      gradient: ['#042316', '#02120a', '#000000']
    };
  }
  if (norm.includes('art')) {
    return {
      emoji: '🎨',
      color: '#ec4899',
      gradient: ['#2e0420', '#170210', '#000000']
    };
  }
  if (norm.includes('tech')) {
    return {
      emoji: '💻',
      color: '#4ade80',
      gradient: ['#042618', '#02130c', '#000000']
    };
  }
  if (norm.includes('philo')) {
    return {
      emoji: '📜',
      color: '#a855f7',
      gradient: ['#1f0833', '#0e0318', '#000000']
    };
  }
  return {
    emoji: '🧠',
    color: COLORS.primary,
    gradient: ['#141b18', '#0d110f', '#000000']
  };
};

// Helper image sécurisée haute résolution (100% vérifiée)
const getSafeImageUrl = (card) => {
  const fallback = 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1080&q=80';
  if (!card?.image_url) return fallback;
  
  // Remplacement immédiat si ancien loremflickr
  if (card.image_url.includes('loremflickr.com')) {
    const match = card.image_url.match(/loremflickr\.com\/\d+\/\d+\/([a-zA-Z0-9_-]+)/);
    const key = match ? match[1].toLowerCase() : '';
    const map = {
      pyramid: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1080&q=80',
      samurai: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1080&q=80',
      oxford: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1080&q=80',
      honey: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1080&q=80',
      banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=1080&q=80',
      saturn: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1080&q=80',
      dna: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=1080&q=80',
      shark: 'https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=1080&q=80',
      octopus: 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=1080&q=80',
      koala: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=1080&q=80',
      monalisa: 'https://images.unsplash.com/photo-1577720643272-265f09367456?w=1080&q=80',
      vangogh: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1080&q=80',
      sculpture: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1080&q=80',
      painting: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?w=1080&q=80',
      gravity: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1080&q=80',
      japan: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1080&q=80',
      moth: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80',
      eiffel: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1080&q=80',
      wombat: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=1080&q=80',
      rocket: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=1080&q=80'
    };
    if (map[key]) return map[key];
  }
  return card.image_url;
};

// --- COMPOSANTS UI DE BASE ---

const NavIcon = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={active ? icon : `${icon}-outline`} size={24} color={active ? COLORS.primary : COLORS.textMuted} />
    <Text style={[styles.navLabel, { color: active ? COLORS.primary : COLORS.textMuted, fontWeight: active ? '700' : '500' }]}>{label}</Text>
  </TouchableOpacity>
);

// --- MODALES POLIES ---

const DetailModal = ({ visible, card, onClose }) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  
  useEffect(() => { 
    if (visible) {
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }); 
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }); 
    }
  }, [visible]);

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
  
  const categoryName = card?.themes?.categories?.name || 'Savoir';
  const themeName = card?.themes?.name || '';
  const meta = getCategoryMeta(categoryName);
  const safeImg = getSafeImageUrl(card);
  
  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.modalContent, animatedStyle]}>
            <View style={styles.dragIndicator} />
            
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
                  <Text style={[styles.modalCat, { color: meta.color }]}>{categoryName.toUpperCase()} • {themeName}</Text>
                </View>
                <Text style={styles.modalAuthor}>Rédigé par {card?.author_pseudo || 'Équipe QULT'}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeRoundBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#ffffff"/>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              <Text style={styles.modalTitle}>{card?.short_text}</Text>
              <View style={[styles.sep, { backgroundColor: meta.color }]} />
              
              <Text style={styles.modalText}>{card?.long_text}</Text>
              
              {safeImg && (
                <View style={styles.modalImageWrapper}>
                  <Image 
                    source={{ uri: safeImg }} 
                    style={styles.modalImage} 
                    contentFit="cover"
                    transition={250}
                    cachePolicy="memory-disk"
                  />
                </View>
              )}
              
              <View style={styles.modalFooterActions}>
                <TouchableOpacity 
                  style={styles.modalShareAction} 
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic('light');
                    Share.share({ message: `Découvre ça sur QULT : "${card?.short_text}" 🔥\n\n${card?.long_text}` });
                  }}
                >
                  <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.modalShareText}>Partager cette découverte</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const ChatModal = ({ visible, onClose, myPseudo, friendPseudo }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [viewCard, setViewCard] = useState(null);
  const scrollViewRef = useRef();

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
        .select('*, cards(*, themes(categories(name)))')
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

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: 'm_' + Date.now(),
      sender_pseudo: myPseudo,
      receiver_pseudo: friendPseudo,
      content: inputText.trim(),
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
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
            <Text style={styles.chatTitle}>{friendPseudo}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
              <View style={styles.onlineDot} />
              <Text style={styles.chatStatus}>En ligne ⚡️</Text>
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
            return (
              <View key={msg.id} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', marginBottom: 12, maxWidth: '82%'}}>
                {msg.shared_card_id && msg.cards && (
                  <TouchableOpacity onPress={() => setViewCard(msg.cards)} style={styles.chatCardBubble} activeOpacity={0.88}>
                    <Image 
                      source={{ uri: getSafeImageUrl(msg.cards) }} 
                      style={styles.chatCardImg} 
                      contentFit="cover"
                      transition={250}
                      cachePolicy="memory-disk"
                    />
                    <View style={{padding: 10}}>
                      <Text style={styles.chatCardCat}>{msg.cards.themes?.categories?.name || 'Savoir'}</Text>
                      <Text style={styles.chatCardTitle} numberOfLines={2}>{msg.cards.short_text}</Text>
                      <Text style={{color: COLORS.primary, fontSize: 11, marginTop: 4, fontWeight: 'bold'}}>Toucher pour lire ➔</Text>
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

        <View style={styles.chatInputContainer}>
          <TextInput 
            style={styles.chatInput} 
            placeholder="Envoyer un message..." 
            placeholderTextColor="#71717a"
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} activeOpacity={0.8}>
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
    const msg = customMessage.trim() || "Regarde ce fait incroyable sur QULT ! 🔥";
    triggerHaptic('success');
    const promises = Array.from(selectedFriends).map(friend => 
      supabase.from('messages').insert({ 
        sender_pseudo: myPseudo, 
        receiver_pseudo: friend, 
        content: msg, 
        shared_card_id: card?.id 
      })
    );
    await Promise.all(promises).catch(() => {});
    Alert.alert("Envoyé !", `Fiche partagée avec ${selectedFriends.size} ami(s) !`);
    onClose();
  };

  const shareExternal = async () => {
    triggerHaptic('light');
    await Share.share({ message: `Check ça sur QULT : "${card?.short_text}" ! 🚀` });
  };

  if (!card) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContent, {height: '75%'}]}>
          <View style={styles.dragIndicator} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Partager la fiche 🚀</Text>
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
              placeholder="Ajouter une note personnelle..." 
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
              return (
                <TouchableOpacity onPress={() => toggleSelection(name)} style={styles.friendRowSelect} activeOpacity={0.8}>
                  <View style={{flexDirection:'row', alignItems:'center', gap: 12}}>
                    <View style={styles.avatarCircle}><Text style={{fontSize: 18}}>👤</Text></View>
                    <Text style={styles.friendName}>{name}</Text>
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
                <Text style={{color: COLORS.blue, fontWeight:'bold', fontSize: 15}}>Partager via WhatsApp, Instagram, etc.</Text>
              </TouchableOpacity>
            }
          />

          {selectedFriends.size > 0 && (
            <TouchableOpacity onPress={sendToSelected} style={styles.sendConfirmBtn} activeOpacity={0.85}>
              <Text style={styles.sendConfirmBtnText}>Envoyer à ({selectedFriends.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --- CARTE FULLSCREEN DU FEED (TIKTOK STYLE + 2D SWIPE) ---

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

  const categoryName = card?.themes?.categories?.name || 'Savoir';
  const themeName = card?.themes?.name || '';
  const meta = getCategoryMeta(categoryName);
  const safeImgUri = getSafeImageUrl(card);

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

          {/* 4. Dégradé sombre pour lisibilité maximale des textes */}
          <LinearGradient 
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']} 
            style={styles.cardUi} 
            pointerEvents="box-none"
          >
            {/* Contenu textuel */}
            <View style={styles.cardContent}>
              {/* Pagination 2D horizontale si le thème a plusieurs cartes */}
              {totalCards > 1 && (
                <View style={styles.horizontalIndicator}>
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
                  {currentIndex === 0 ? (
                    <View style={styles.swipeHintBadge}>
                      <Ionicons name="arrow-forward" size={12} color="#000" style={{ marginRight: 4 }} />
                      <Text style={styles.swipeHintText}>Glisser ➔ pour approfondir ({totalCards})</Text>
                    </View>
                  ) : (
                    <Text style={styles.horizontalPageText}>{currentIndex + 1} / {totalCards}</Text>
                  )}
                </View>
              )}

              <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: meta.color }]}>
                  <Text style={styles.tagText}>{categoryName.toUpperCase()}</Text>
                </View>
                {themeName ? (
                  <View style={styles.themeTag}>
                    <Text style={styles.themeTagText}>{themeName}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity activeOpacity={0.88} onPress={onOpen}>
                <Text style={styles.cardTitle}>{card.short_text}</Text>
                <View style={styles.readMoreHintRow}>
                  <Ionicons name="book-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.readMoreHint}>Appuie ou touche "Lire" pour tout savoir 📖</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Boutons d'actions verticaux (TikTok Style) */}
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('light'); onLike(); }}>
                <View style={[styles.actionIconCircle, isLiked && { backgroundColor: 'rgba(255, 45, 85, 0.25)', borderColor: COLORS.secondary }]}>
                  <Ionicons name={isLiked ? "heart" : "heart-outline"} size={30} color={isLiked ? COLORS.secondary : "#ffffff"} />
                </View>
                <Text style={[styles.actionText, isLiked && { color: COLORS.secondary, fontWeight: '700' }]}>
                  {isLiked ? 'Aimé' : 'Like'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('success'); onMemorize(); }}>
                <View style={[styles.actionIconCircle, isMemorized && { backgroundColor: 'rgba(74, 222, 128, 0.25)', borderColor: COLORS.primary }]}>
                  <Ionicons name={isMemorized ? "bookmark" : "bookmark-outline"} size={28} color={isMemorized ? COLORS.primary : "#ffffff"} />
                </View>
                <Text style={[styles.actionText, isMemorized && { color: COLORS.primary, fontWeight: '700' }]}>
                  {isMemorized ? 'Appris' : 'À retenir'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('light'); onOpen(); }}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name="book-outline" size={26} color="#ffffff" />
                </View>
                <Text style={styles.actionText}>Lire</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerHaptic('light'); onShare(); }}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name="paper-plane-outline" size={26} color="#ffffff" />
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password }); 
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
        await supabase.from('public_users').insert({ pseudo }).catch(() => {});
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

// 2. ÉCRAN FEED DU SAVOIR (SWIPE 2D)
const HomeScreen = ({ feedData, toggleLike, toggleMemorize, likedCards, memorizedCards, myPseudo }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  
  const renderRow = useCallback(({ item: rowCards }) => ( 
    <View style={{ height: SCREEN_HEIGHT, width: SCREEN_WIDTH }}> 
      <FlatList 
        data={rowCards} 
        horizontal 
        pagingEnabled={true} 
        showsHorizontalScrollIndicator={false} 
        initialNumToRender={2} 
        maxToRenderPerBatch={2} 
        windowSize={4} 
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
      {/* Top Floating Header */}
      <View style={styles.feedHeaderTop} pointerEvents="box-none">
        <View style={styles.feedLogoBox}>
          <Text style={styles.feedLogoText}>QULT</Text>
          <View style={styles.neonDot} />
        </View>
        <View style={styles.feedHeaderRight}>
          <View style={styles.streakBadge}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={styles.streakNum}>3 j</Text>
          </View>
          <View style={styles.headerUserBadge}>
            <Text style={styles.headerUserText}>👤 {myPseudo}</Text>
          </View>
        </View>
      </View>

      <FlatList 
        data={feedData} 
        renderItem={renderRow} 
        pagingEnabled={true} 
        showsVerticalScrollIndicator={false} 
        keyExtractor={(item, index) => index.toString()} 
        initialNumToRender={2} 
        windowSize={5} 
        removeClippedSubviews={false} 
      /> 

      <DetailModal visible={modalVisible} card={selectedCard} onClose={() => setModalVisible(false)} /> 
      <ShareModal visible={shareVisible} onClose={() => setShareVisible(false)} myPseudo={myPseudo} card={selectedCard} />
    </View> 
  );
};

// 3. ÉCRAN QUIZ QUOTIDIEN GAMIFIÉ
const QuizDailyScreen = ({ questions, hasPlayed, todayScore, onFinish, onResetForPractice }) => {
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
      : "Bien tenté ! Reviens demain 🧠";

    return ( 
      <View style={styles.quizContainer}> 
        <Text style={styles.dateText}>{getFormattedDate().toUpperCase()}</Text> 
        <Text style={styles.quizTitle}>Défi Quotidien Terminé ! 🏆</Text> 
        <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>{praiseText}</Text>
        
        <View style={{alignItems: 'center', marginVertical: 18}}> 
          <View>
            <ProgressChart 
              data={progressData} 
              width={SCREEN_WIDTH - 80} 
              height={170} 
              strokeWidth={14} 
              radius={64} 
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
            <Text style={{color: COLORS.orange, fontSize: 13, fontWeight: 'bold', marginTop: 2}}>Série : 🔥 +1</Text>
          </View> 
        </View> 

        <View style={styles.quizTimerBox}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.quizTimerText}>Prochain quiz quotidien dans : <Text style={{fontWeight: 'bold', color: '#fff'}}>{countdown}</Text></Text>
        </View>

        <Text style={styles.recapTitle}>Fiches associées au Quiz :</Text> 
        <ScrollView style={{marginTop: 6}} showsVerticalScrollIndicator={false}> 
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
                <Text style={{color:'#fff', fontWeight:'bold'}}>{i+1}</Text>
              </View> 
              <Text style={styles.recapText} numberOfLines={2}>{q.question}</Text> 
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
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Recommencer pour s'entraîner</Text>
          </TouchableOpacity>

          <View style={{height: 120}} />
        </ScrollView> 
        <DetailModal visible={modalVisible} card={detailCard} onClose={() => setModalVisible(false)} /> 
      </View> 
    ); 
  }

  if (!questions || questions.length === 0) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={{ color: COLORS.textMuted, marginTop: 14, fontSize: 14 }}>Chargement du défi quotidien...</Text>
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
      setScore(score + 1); 
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
      const finalScore = selectedOption === currentQ.correct_option ? score + 1 : score;
      setFinished(true); 
      onFinish(finalScore); 
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
          <Text style={styles.quizProgress}>Question {index + 1} / {questions.length}</Text> 
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
            </TouchableOpacity>
          ))}
        </View> 

        {isAnswered && (
          <View style={{marginTop: 22}}>
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
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{index < questions.length - 1 ? "Question Suivante" : "Voir mes Résultats 🏆"}</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        )} 
        <View style={{height: 120}} />
      </ScrollView>
    </View> 
  );
};

// 4. ÉCRAN SOCIAL (CERCLE & CLASSEMENT)
const FriendsScreen = ({ myPseudo, onOpenProfile }) => {
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

    try {
      // Tenter de récupérer les scores réels du jour
      const today = getLocalDateISO();
      const { data: historyData } = await supabase
        .from('user_quiz_history')
        .select('user_pseudo, score, created_at')
        .eq('quiz_date', today)
        .order('score', { ascending: false });
      
      if (historyData && historyData.length > 0) {
        setLeaderboard(historyData);
        return;
      }
    } catch (e) {
      // fallback
    }
    setLeaderboard(MOCK_LEADERBOARD);
  };

  useEffect(() => { 
    fetchSocialData(); 
  }, [myPseudo]);

  const handleAddFriend = async () => {
    const target = newFriendInput.trim();
    if (!target) return;
    triggerHaptic('success');
    setFriends(prev => [...prev, { following_pseudo: target, bio: 'Nouvel ami ajouté ⚡️' }]);
    setNewFriendInput('');
    Alert.alert("Ami ajouté !", `Tu es maintenant connecté avec ${target} !`);
    await supabase.from('follows').insert({ follower_pseudo: myPseudo, following_pseudo: target, status: 'accepted' }).catch(() => {});
  };

  return (
    <View style={[styles.container, {paddingTop: 56, paddingHorizontal: 20}]}>
      <View style={styles.cercleHeader}>
        <Text style={styles.sectionHeaderTitle}>Cercle QULT 🌍</Text>
        <Text style={styles.sectionSubtitle}>Défie tes amis et compare tes connaissances</Text>
      </View>

      {/* Ajout d'ami rapide */}
      <View style={styles.addFriendBox}>
        <TextInput 
          style={styles.addFriendInput}
          placeholder="Ajouter un ami par son pseudo..."
          placeholderTextColor="#71717a"
          value={newFriendInput}
          onChangeText={setNewFriendInput}
        />
        <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend} activeOpacity={0.8}>
          <Ionicons name="person-add" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PODIUM & CLASSEMENT */}
        <View style={styles.leaderboardBox}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15}}>
            <Ionicons name="trophy" size={22} color={COLORS.gold} />
            <Text style={styles.leaderboardTitle}>CLASSEMENT DU JOUR</Text>
          </View>

          {leaderboard.map((item, index) => {
            const isTop3 = index < 3;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
            const isMe = item.user_pseudo === myPseudo;
            return (
              <TouchableOpacity 
                key={index} 
                onPress={() => onOpenProfile(item.user_pseudo)} 
                style={[styles.rankRow, isMe && styles.rankRowMe]}
                activeOpacity={0.8}
              >
                <View style={{flexDirection:'row', alignItems:'center', gap: 12}}>
                  <Text style={[styles.rankBadge, isTop3 && {fontSize: 18}]}>{medal}</Text>
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
        <Text style={styles.subSectionTitle}>MES AMIS ({friends.length})</Text>
        {friends.map((f, i) => {
          const pseudo = f.following_pseudo || f.pseudo;
          return (
            <TouchableOpacity 
              key={i} 
              onPress={() => setChatModal({visible: true, friend: pseudo})} 
              style={styles.friendRow}
              activeOpacity={0.8}
            >
              <View style={{flexDirection:'row', alignItems:'center', gap: 12}}>
                <View style={styles.avatarCircle}><Text style={{fontSize: 20}}>👤</Text></View>
                <View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Text style={styles.friendName}>{pseudo}</Text>
                    <View style={styles.onlineDot} />
                  </View>
                  <Text style={{color: COLORS.textDark, fontSize: 12}}>{f.bio || 'Explorateur de savoir'}</Text>
                </View>
              </View>
              <View style={{flexDirection:'row', gap: 12, alignItems: 'center'}}>
                <TouchableOpacity onPress={() => onOpenProfile(pseudo)} style={styles.friendActionIcon}>
                  <Ionicons name="stats-chart" color={COLORS.textMuted} size={18}/>
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
      />
    </View>
  );
};

// 5. ÉCRAN STATS & PROFIL
const StatsScreen = ({ targetPseudo, isCurrentUser, onBack, todayScore, likedCount, memorizedCount, onLogout }) => {
  const chartConfig = { 
    backgroundGradientFromOpacity: 0, 
    backgroundGradientToOpacity: 0, 
    color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
    labelColor: () => '#ffffff'
  };
  
  const categoryData = [
    { name: "Histoire", population: 35, color: "#f59e0b", legendFontColor: "#fff", legendFontSize: 12 },
    { name: "Sciences", population: 25, color: "#38bdf8", legendFontColor: "#fff", legendFontSize: 12 },
    { name: "Arts", population: 20, color: "#ec4899", legendFontColor: "#fff", legendFontSize: 12 },
    { name: "Tech", population: 20, color: "#4ade80", legendFontColor: "#fff", legendFontSize: 12 }
  ];
  
  return (
    <ScrollView style={styles.statsScroll} contentContainerStyle={{paddingTop: 56, paddingBottom: 110}} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        {!isCurrentUser && ( 
          <TouchableOpacity onPress={onBack} style={styles.profileBackBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={26} color="white" />
          </TouchableOpacity> 
        )}
        <View style={styles.avatarMain}><Text style={{fontSize: 38}}>🎓</Text></View>
        <Text style={styles.profilePseudo}>{targetPseudo}</Text>
        <Text style={styles.profileTagline}>Curieux & Explorateur de Savoir ⚡️</Text>

        <View style={styles.profileStatsRow}>
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatNum}>{likedCount || 0}</Text>
            <Text style={styles.profileStatLabel}>Favoris</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatNum}>{memorizedCount || 0}</Text>
            <Text style={styles.profileStatLabel}>Appris</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatNum}>{todayScore !== null ? `${todayScore}/5` : "5/5"}</Text>
            <Text style={styles.profileStatLabel}>Quiz du Jour</Text>
          </View>
        </View>

        {isCurrentUser && ( 
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={16} color={COLORS.wrong} style={{marginRight: 6}} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity> 
        )}
      </View>

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
          { date: '24 Oct.', score: 4 },
          { date: '23 Oct.', score: 5 },
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
    </ScrollView>
  );
};

// --- APP ROOT COMPONENT ---

export default function App() {
  const [session, setSession] = useState(null);
  const [userPseudo, setUserPseudo] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [feedData, setFeedData] = useState([]); 
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
        // Restaurer le pseudo sauvegardé
        const savedPseudo = await AsyncStorage.getItem(STORAGE_KEYS.USER_PSEUDO);
        if (savedPseudo) {
          setUserPseudo(savedPseudo);
        }

        // Restaurer les likes et mémorisés
        const savedLikes = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_CARDS);
        if (savedLikes) {
          setLikedCards(new Set(JSON.parse(savedLikes)));
        } else {
          setLikedCards(new Set(['c1', 'c3']));
        }

        const savedMemos = await AsyncStorage.getItem(STORAGE_KEYS.MEMORIZED_CARDS);
        if (savedMemos) {
          setMemorizedCards(new Set(JSON.parse(savedMemos)));
        } else {
          setMemorizedCards(new Set(['c2', 'c5']));
        }

        // Restaurer l'état du quiz d'aujourd'hui
        const todayIso = getLocalDateISO();
        const playedTodayStr = await AsyncStorage.getItem(STORAGE_KEYS.PLAYED_TODAY + todayIso);
        const scoreTodayStr = await AsyncStorage.getItem(STORAGE_KEYS.TODAY_SCORE + todayIso);
        if (playedTodayStr === 'true') {
          setHasPlayedToday(true);
          if (scoreTodayStr !== null) setTodayScore(parseInt(scoreTodayStr, 10));
        }

        // Vérifier la session Supabase
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
      const p = session?.user?.email?.split('@')[0] || 'Victor';
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
        // Précharger les 10 premières images pour fluidité absolue
        data.slice(0, 10).forEach(c => {
          const url = getSafeImageUrl(c);
          if (url) Image.prefetch(url);
        });

        const groups = {};
        data.forEach(c => { 
          const k = c.theme_id || 'unknown'; 
          if (!groups[k]) groups[k] = []; 
          groups[k].push(c); 
        });
        setFeedData(Object.values(groups));
        return;
      }
    } catch (e) {
      // ignore
    }

    // Fallback Mock enrichi
    const groups = {};
    MOCK_CARDS.forEach(c => {
      const k = c.theme_id || 'general';
      if (!groups[k]) groups[k] = []; 
      groups[k].push(c); 
    });
    setFeedData(Object.values(groups));
  };

  const loadQuiz = async () => {
    try {
      const { data, error } = await supabase.from('quiz_questions').select('*, cards(*)'); 
      if (data && !error && data.length > 0) {
        const shuffled = seededShuffle(data);
        setQuizQuestions(shuffled.slice(0, 5));
        return;
      }
    } catch (e) {
      // ignore
    }
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

    await supabase.from('user_quiz_history').insert({ 
      user_pseudo: userPseudo || 'Victor', 
      score: safeScore, 
      quiz_date: todayIso 
    }).catch(() => {});
  };

  const handleDemoLogin = (pseudoName = 'Victor') => {
    setUserPseudo(pseudoName);
    setSession({ user: { email: `${pseudoName.toLowerCase()}@qult.app` } });
    AsyncStorage.setItem(STORAGE_KEYS.USER_PSEUDO, pseudoName).catch(() => {});
    triggerHaptic('success');
  };

  const handleLogout = async () => { 
    triggerHaptic('light');
    await supabase.auth.signOut().catch(() => {}); 
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PSEUDO).catch(() => {});
    setSession(null); 
    setUserPseudo(null);
    setVisitingProfile(null);
    setCurrentTab('home');
  };

  const openProfile = (pseudo) => { 
    triggerHaptic('light');
    setVisitingProfile(pseudo); 
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
          feedData={feedData} 
          toggleLike={toggleLike} 
          toggleMemorize={toggleMemorize} 
          likedCards={likedCards} 
          memorizedCards={memorizedCards} 
          myPseudo={userPseudo || 'Victor'} 
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
          }}
        />
      )}

      {currentTab === 'friends' && (
        <FriendsScreen 
          myPseudo={userPseudo || 'Victor'} 
          onOpenProfile={openProfile} 
        />
      )}

      {currentTab === 'stats' && (
        <StatsScreen 
          targetPseudo={visitingProfile || userPseudo || 'Victor'} 
          isCurrentUser={!visitingProfile} 
          onBack={visitingProfile ? closeProfile : null}
          todayScore={visitingProfile ? null : todayScore}
          likedCount={visitingProfile ? 3 : likedCards.size}
          memorizedCount={visitingProfile ? 5 : memorizedCards.size}
          onLogout={handleLogout} 
        />
      )}

      {/* Floating Modern Tab Bar */}
      <View style={styles.navBar}>
        <NavIcon 
          icon="home" 
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
          onPress={() => { triggerHaptic('light'); setVisitingProfile(null); setCurrentTab('stats'); }} 
        />
      </View>
    </GestureHandlerRootView>
  );
}

// --- STYLES MODERNES & POLIS ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  
  // Navigation
  navBar: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    height: 85, 
    backgroundColor: 'rgba(10, 10, 12, 0.95)', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#27272a' 
  },
  navItem: { alignItems: 'center', width: 70 }, 
  navLabel: { fontSize: 11, marginTop: 4 },
  quizBtnWrapper: { position: 'relative', top: -20 },
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

  // Feed Top Header
  feedHeaderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  feedLogoBox: { flexDirection: 'row', alignItems: 'center' },
  feedLogoText: { color: '#ffffff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  neonDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.primary, marginLeft: 3, marginTop: 6 },
  feedHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  streakNum: { color: COLORS.orange, fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  headerUserBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  headerUserText: { color: '#ffffff', fontWeight: '600', fontSize: 12 },

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
    padding: 20, 
    paddingBottom: 110 
  },
  cardContent: { flex: 1, justifyContent: 'flex-end', paddingRight: 15 },
  horizontalIndicator: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  indicatorDot: { height: 4, borderRadius: 2 },
  indicatorDotActive: { width: 18, backgroundColor: COLORS.primary },
  indicatorDotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.3)' },
  swipeHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  swipeHintText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  horizontalPageText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  tag: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  tagText: { fontWeight: 'bold', fontSize: 11, color: '#000' },
  themeTag: { 
    backgroundColor: 'rgba(255, 255, 255, 0.18)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
  },
  themeTagText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  cardTitle: { color: 'white', fontSize: 24, fontWeight: '800', lineHeight: 32, marginBottom: 8 },
  readMoreHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  readMoreHint: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  cardActions: { justifyContent: 'flex-end', gap: 16, paddingBottom: 10 },
  actionBtn: { alignItems: 'center' },
  actionIconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: 'rgba(0, 0, 0, 0.55)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.18)' 
  },
  actionText: { color: 'white', fontSize: 11, marginTop: 4, fontWeight: '600' },
  heartOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none' },

  // Detail Modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: { 
    height: '84%', 
    backgroundColor: '#121214', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  dragIndicator: { width: 36, height: 4, backgroundColor: '#3f3f46', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalCat: { fontWeight: 'bold', fontSize: 12 },
  modalAuthor: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  closeRoundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', lineHeight: 28, marginBottom: 14 },
  sep: { width: 35, height: 3, borderRadius: 2, marginBottom: 16 },
  modalText: { fontSize: 17, lineHeight: 27, color: '#d4d4d8' },
  modalImageWrapper: { marginTop: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#27272a' },
  modalImage: { width: '100%', height: 240, backgroundColor: '#18181b' },
  modalFooterActions: { marginTop: 24, alignItems: 'center' },
  modalShareAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#18181b', 
    paddingVertical: 12, 
    paddingHorizontal: 22, 
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow
  },
  modalShareText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14, marginLeft: 8 },

  // Chat
  chatHeader: { 
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 52 : 36, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#27272a' 
  },
  backBtn: { padding: 4 },
  chatTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  chatStatus: { color: COLORS.primary, fontSize: 11 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  chatBubble: { padding: 12, borderRadius: 18 },
  chatBubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  chatBubbleOther: { backgroundColor: '#27272a', borderBottomLeftRadius: 4 },
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
  chatCardImg: { width: 220, height: 120 },
  chatCardCat: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  chatCardTitle: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  // Share Modal
  sharePreviewBox: { flexDirection:'row', alignItems:'center', backgroundColor: '#18181b', borderRadius: 12, padding: 8, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  sharePreviewImg: { width: 48, height: 48, borderRadius: 8, marginRight: 10 },
  shareInput: { flex: 1, height: 44, color: '#fff', fontSize: 14 },
  friendRowSelect: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
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
  nextBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, marginTop: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  quizTitle: { color: 'white', fontSize: 26, fontWeight: '900', marginBottom: 6 },
  scoreCenteredBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scoreBig: { fontSize: 36, fontWeight: '900' },
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
  recapTitle: { color: COLORS.textMuted, fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  recapItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#27272a' },
  recapBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recapText: { color: 'white', flex: 1, fontSize: 13, lineHeight: 18 },
  practiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272a', paddingVertical: 14, borderRadius: 14, marginTop: 8 },

  // Cercle & Leaderboard
  cercleHeader: { marginBottom: 16 },
  sectionHeaderTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
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
  leaderboardBox: { backgroundColor: '#121214', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#27272a' },
  leaderboardTitle: { color: COLORS.gold, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  rankRowMe: { backgroundColor: 'rgba(74, 222, 128, 0.08)', borderRadius: 10, paddingHorizontal: 10 },
  rankBadge: { width: 24, color: COLORS.gold, fontWeight: 'bold', textAlign: 'center' },
  rankScore: { color: 'white', fontWeight: '800', fontSize: 16 },
  rankTime: { color: COLORS.textDark, fontSize: 11 },
  friendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#121214', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1e1e24' },
  friendActionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  chatIconBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // Stats / Profil
  statsScroll: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 26 },
  profileBackBtn: { position:'absolute', left: 0, top: 0, zIndex: 10, padding: 8 },
  avatarMain: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: COLORS.primary },
  profilePseudo: { color: 'white', fontSize: 26, fontWeight: '900' },
  profileTagline: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  profileStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121214', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, marginVertical: 18, borderWidth: 1, borderColor: '#27272a' },
  profileStatItem: { alignItems: 'center', flex: 1 },
  profileStatDivider: { width: 1, height: 26, backgroundColor: '#27272a' },
  profileStatNum: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  profileStatLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#18181b', borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  logoutText: { color: COLORS.wrong, fontSize: 13, fontWeight: 'bold' },
  chartWrapper: { backgroundColor: '#121214', borderRadius: 16, padding: 10, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  historyContainer: { marginTop: 10 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  historyDate: { color: COLORS.textMuted, width: 85, fontSize: 13, fontWeight: '600' },
  historyScoreBar: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyScoreNum: { fontWeight: '800', width: 40, textAlign: 'right', fontSize: 15 },
});

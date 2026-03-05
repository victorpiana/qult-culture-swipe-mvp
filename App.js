import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Dimensions, 
  StatusBar, Modal, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Share 
} from 'react-native';
// On utilise Image de base pour la compatibilité maximale
import { Image } from 'react-native'; 

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, ProgressChart } from 'react-native-chart-kit';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withDelay, runOnJS, Easing } from 'react-native-reanimated';

// --- CONFIGURATION ---
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

const COLORS = {
  primary: '#4ade80', secondary: '#ff0050', bg: '#000', card: '#1a1a1a', correct: '#2ecc71', wrong: '#e74c3c', orange: '#f39c12', blue: '#3498db', gold: '#FFD700', chatBubbleSelf: '#2a2a2a', chatBubbleFriend: '#1a1a1a'
};

// --- HELPERS ---
const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
};

// Date locale pour débloquer le quiz après minuit
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

const subDays = (dateStr, days) => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() - days);
  return result.toISOString().split('T')[0];
};

// --- COMPOSANTS UI ---

const NavIcon = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <Ionicons name={active ? icon : `${icon}-outline`} size={24} color={active ? COLORS.primary : '#888'} />
    <Text style={[styles.navLabel, {color: active ? COLORS.primary : '#888'}]}>{label}</Text>
  </TouchableOpacity>
);

// --- MODALES ---

const DetailModal = ({ visible, card, onClose }) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  useEffect(() => { 
    if (visible) translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }); 
    else translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }); 
  }, [visible]);

  const pan = Gesture.Pan()
    .onChange((event) => { if (event.translationY > 0) translateY.value = event.translationY; })
    .onEnd((event) => { if (event.translationY > 150) runOnJS(onClose)(); else translateY.value = withTiming(0, { duration: 200 }); });
  
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  
  if (!visible) return null;
  
  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.modalContent, animatedStyle]}>
            <View style={styles.dragIndicator} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalCat}>{card?.themes?.categories?.name}</Text>
              <TouchableOpacity onPress={onClose} style={{padding: 10}}>
                <Ionicons name="close-circle" size={30} color="#333"/>
              </TouchableOpacity>
            </View>
            <ScrollView>
               <Text style={styles.modalTitle}>{card?.short_text}</Text>
               <View style={styles.sep} />
               <Text style={styles.modalText}>{card?.long_text}</Text>
               <Image 
                 source={{ uri: card?.image_url }} 
                 style={{width: '100%', height: 300, borderRadius: 12, marginTop: 20, backgroundColor: '#f5f5f5'}} 
                 resizeMode="contain"
               />
               <View style={{height:100}}/>
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
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [visible, friendPseudo]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, cards(*, themes(categories(name)))')
      .or(`and(sender_pseudo.eq.${myPseudo},receiver_pseudo.eq.${friendPseudo}),and(sender_pseudo.eq.${friendPseudo},receiver_pseudo.eq.${myPseudo})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    await supabase.from('messages').insert({ sender_pseudo: myPseudo, receiver_pseudo: friendPseudo, content: inputText });
    setInputText('');
    fetchMessages();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1, backgroundColor: '#000'}}>
        <View style={styles.chatHeader}>
          <Text style={styles.modalTitle}>{friendPseudo}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeChatBtn}>
            <Ionicons name="close" size={32} color="#fff"/>
          </TouchableOpacity>
        </View>
        <ScrollView 
          ref={scrollViewRef}
          style={{flex: 1, padding: 15}}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({animated: true})}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={{alignSelf: msg.sender_pseudo === myPseudo ? 'flex-end' : 'flex-start', marginBottom: 15, maxWidth: '80%'}}>
              {msg.shared_card_id && msg.cards && (
                <TouchableOpacity onPress={() => setViewCard(msg.cards)} style={{backgroundColor: '#222', borderRadius: 12, overflow: 'hidden', marginBottom: 5, borderWidth: 1, borderColor: '#333'}}>
                  <Image source={{ uri: msg.cards.image_url }} style={{width: 200, height: 120}} resizeMode="contain"/>
                  <View style={{padding: 8}}>
                    <Text style={{color: '#aaa', fontSize: 10, marginBottom: 2, textTransform: 'uppercase'}}>{msg.cards.themes?.categories?.name}</Text>
                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 14}} numberOfLines={2}>{msg.cards.short_text}</Text>
                  </View>
                </TouchableOpacity>
              )}
              {msg.content && (
                <View style={{
                  backgroundColor: msg.sender_pseudo === myPseudo ? COLORS.primary : COLORS.chatBubbleFriend,
                  padding: 12, borderRadius: 18, 
                  borderBottomRightRadius: msg.sender_pseudo === myPseudo ? 4 : 18, 
                  borderBottomLeftRadius: msg.sender_pseudo !== myPseudo ? 4 : 18
                }}>
                  <Text style={{color: msg.sender_pseudo === myPseudo ? '#000' : '#fff', fontSize: 16}}>{msg.content}</Text>
                </View>
              )}
            </View>
          ))}
          <View style={{height: 20}}/>
        </ScrollView>
        <View style={styles.chatInputContainer}>
          <TextInput 
            style={styles.chatInput} 
            placeholder="Message..." 
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Ionicons name="arrow-up" size={24} color="#000"/>
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
    const { data } = await supabase.from('follows').select('following_pseudo').eq('follower_pseudo', myPseudo).eq('status', 'accepted');
    setFriends(data || []);
  };

  const toggleSelection = (pseudo) => {
    const newSet = new Set(selectedFriends);
    if (newSet.has(pseudo)) newSet.delete(pseudo);
    else newSet.add(pseudo);
    setSelectedFriends(newSet);
  };

  const sendToSelected = async () => {
    const msg = customMessage.trim() || "Regarde ça ! 🔥";
    const promises = Array.from(selectedFriends).map(friend => 
      supabase.from('messages').insert({ 
        sender_pseudo: myPseudo, 
        receiver_pseudo: friend, 
        content: msg,
        shared_card_id: card.id 
      })
    );
    await Promise.all(promises);
    Alert.alert("Succès", `Envoyé à ${selectedFriends.size} personne(s)`);
    onClose();
  };

  const shareExternal = async () => {
    await Share.share({ message: `Check ça sur QULT : ${card.short_text} !` });
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContent, {height: '70%'}]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Envoyer à...</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#000"/></TouchableOpacity>
          </View>
          <View style={{flexDirection:'row', alignItems:'center', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 5, marginBottom: 20}}>
            <Image source={{uri: card?.image_url}} style={{width: 40, height: 40, borderRadius: 8, marginRight: 10}} resizeMode="contain"/>
            <TextInput style={{flex: 1, height: 40, color: '#000'}} placeholder="Ajouter un message..." placeholderTextColor="#888" value={customMessage} onChangeText={setCustomMessage}/>
          </View>
          <FlatList 
            data={friends}
            keyExtractor={item => item.following_pseudo}
            renderItem={({item}) => {
              const isSelected = selectedFriends.has(item.following_pseudo);
              return (
                <TouchableOpacity onPress={() => toggleSelection(item.following_pseudo)} style={styles.friendRow}>
                  <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                    <View style={styles.smallAvatar}><Text>👤</Text></View>
                    <Text style={[styles.friendName, {color: '#000'}]}>{item.following_pseudo}</Text>
                  </View>
                  <View style={{width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? COLORS.primary : '#ddd', backgroundColor: isSelected ? COLORS.primary : 'transparent', justifyContent: 'center', alignItems: 'center'}}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#000"/>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <TouchableOpacity onPress={shareExternal} style={{marginTop: 20, alignItems:'center', padding: 15, borderTopWidth: 1, borderColor: '#eee'}}>
                <Text style={{color: COLORS.blue, fontWeight:'bold'}}>Autre option (WhatsApp, Insta...)</Text>
              </TouchableOpacity>
            }
          />
          {selectedFriends.size > 0 && (
            <TouchableOpacity onPress={sendToSelected} style={{backgroundColor: COLORS.primary, padding: 15, borderRadius: 30, alignItems: 'center', marginVertical: 10}}>
              <Text style={{fontWeight: 'bold', fontSize: 16}}>Envoyer ({selectedFriends.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const UserListModal = ({ visible, onClose, type, pseudo }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (visible) { setLoading(true); fetchList(); } }, [visible]);
  const fetchList = async () => {
    let data;
    if (type === 'followers') {
      const { data: d } = await supabase.from('follows').select('follower_pseudo').eq('following_pseudo', pseudo).eq('status', 'accepted');
      data = d?.map(x => x.follower_pseudo);
    } else {
      const { data: d } = await supabase.from('follows').select('following_pseudo').eq('follower_pseudo', pseudo).eq('status', 'accepted');
      data = d?.map(x => x.following_pseudo);
    }
    setUsers(data || []); setLoading(false);
  };
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, {height: '60%'}]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{type === 'followers' ? 'Abonnés' : 'Abonnements'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#000"/></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color={COLORS.primary}/> : (
            <FlatList data={users} keyExtractor={item => item} renderItem={({item}) => (<View style={styles.friendRow}><Text style={styles.friendName}>{item}</Text></View>)} ListEmptyComponent={<Text style={{textAlign:'center', color:'#999'}}>Personne.</Text>} />
          )}
        </View>
      </View>
    </Modal>
  );
};

const SearchUserModal = ({ visible, onClose, myPseudo }) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(new Set());
  useEffect(() => { if (visible) translateY.value = withTiming(0, { duration: 300 }); else translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }); }, [visible]);
  const pan = Gesture.Pan().onChange((event) => { if (event.translationY > 0) translateY.value = event.translationY; }).onEnd((event) => { if (event.translationY > 150) runOnJS(onClose)(); else translateY.value = withTiming(0); });
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const searchPeople = async () => { if (!searchText.trim()) return; setLoading(true); const { data } = await supabase.from('public_users').select('pseudo').ilike('pseudo', `%${searchText}%`).neq('pseudo', myPseudo).limit(10); setResults(data || []); setLoading(false); };
  const requestFollow = async (target) => { const { error } = await supabase.from('follows').insert({ follower_pseudo: myPseudo, following_pseudo: target, status: 'pending' }); if (error) { if(error.code === '23505') Alert.alert("Info", "Déjà envoyé !"); else Alert.alert("Erreur", error.message); } else { setRequested(prev => new Set(prev).add(target)); } };
  if (!visible) return null;
  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.modalContent, animatedStyle, {height: '70%'}]}>
            <View style={styles.dragIndicator} />
            <Text style={[styles.modalTitle, {textAlign:'center', marginBottom: 20}]}>Ajouter un Ami 🤝</Text>
            <View style={{flexDirection:'row', gap: 10, marginBottom: 20}}>
              <TextInput style={[styles.input, {flex: 1, marginBottom: 0, backgroundColor: '#f0f0f0', color: '#000', borderWidth:0}]} placeholder="Pseudo..." placeholderTextColor="#999" value={searchText} onChangeText={setSearchText}/>
              <TouchableOpacity onPress={searchPeople} style={{justifyContent:'center', backgroundColor: COLORS.primary, padding: 10, borderRadius: 12}}><Ionicons name="search" size={24} color="#000"/></TouchableOpacity>
            </View>
            {loading && <ActivityIndicator color={COLORS.primary}/>}
            <FlatList data={results} keyExtractor={item => item.pseudo} renderItem={({item}) => { const isRequested = requested.has(item.pseudo); return ( <View style={styles.friendRow}> <Text style={{fontSize: 16, fontWeight: 'bold', color: '#000'}}>{item.pseudo}</Text> <TouchableOpacity onPress={() => !isRequested && requestFollow(item.pseudo)} style={{backgroundColor: isRequested ? '#ddd' : '#000', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20}} disabled={isRequested}> <Text style={{color: isRequested ? '#888' : '#fff', fontWeight: 'bold', fontSize: 12}}>{isRequested ? "Demandé" : "Demander"}</Text> </TouchableOpacity> </View> ); }} ListEmptyComponent={!loading && <Text style={{textAlign:'center', color:'#999', marginTop: 20}}>Cherche un pseudo.</Text>} />
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const CardFull = memo(({ card, isLiked, onLike, onOpen, onShare }) => {
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const wasLiked = usePrevious(isLiked);

  useEffect(() => {
    if (isLiked && wasLiked === false) {
      scale.value = withSequence(withSpring(1.2), withSpring(1), withDelay(500, withTiming(0)));
      opacity.value = withSequence(withTiming(1), withDelay(500, withTiming(0)));
    }
  }, [isLiked, wasLiked]);

  const animatedHeartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  
  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDelay(250).onEnd(() => { runOnJS(onLike)(); });
  const longPress = Gesture.LongPress().minDuration(500).onEnd((e, success) => { if (success) runOnJS(onOpen)(); });
  const composedGesture = Gesture.Race(doubleTap, longPress);

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' }}>
      <GestureDetector gesture={composedGesture}>
        <View style={{flex: 1}}>
          {/* LOGO DE SECOURS + LOGS D'ERREUR */}
          <Image 
            source={imageError ? require('./assets/images/icon.png') : { uri: card.image_url }} 
            style={StyleSheet.absoluteFill} 
            resizeMode="contain" // MODE CONTAIN = IMAGE ENTIÈRE (BANDES NOIRES)
            onLoadEnd={() => setLoading(false)} 
            onError={(e) => { 
                setLoading(false); 
                setImageError(true); 
                // Affiche l'erreur précise dans la console pour debugger tes liens
                console.error("ERREUR IMAGE:", card.short_text, "URL:", card.image_url, "INFO:", e.nativeEvent);
            }}
          />
          <View style={styles.heartOverlay} pointerEvents="none">
            <Animated.View style={animatedHeartStyle}>
              <Ionicons name="heart" size={100} color={COLORS.secondary} />
            </Animated.View>
          </View>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']} style={styles.cardUi} pointerEvents="box-none">
            <View style={styles.cardContent}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{card.themes?.name || 'Savoir'}</Text>
              </View>
              <Text style={styles.cardTitle}>{card.short_text}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
                  <Ionicons name={isLiked ? "heart" : "heart-outline"} size={35} color={isLiked ? COLORS.secondary : "white"} />
                  <Text style={styles.actionText}>Like</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={onOpen}>
                  <Ionicons name="book" size={35} color="white" />
                  <Text style={styles.actionText}>Savoir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
                  <Ionicons name="paper-plane-outline" size={35} color="white" />
                  <Text style={styles.actionText}>Partager</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </GestureDetector>
    </View>
  );
}, (prev, next) => prev.isLiked === next.isLiked && prev.card.id === next.card.id);

// --- ECRANS ---

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleAuth = async () => { 
    if (!email || !password) return Alert.alert("Erreur", "Remplis tous les champs !"); 
    setLoading(true); 
    if (isLogin) { 
      const { error } = await supabase.auth.signInWithPassword({ email, password }); 
      if (error) Alert.alert("Erreur Connexion", error.message); 
    } else { 
      if (!pseudo) { setLoading(false); return Alert.alert("Erreur", "Choisis un pseudo !"); } 
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { pseudo: pseudo } } }); 
      if (error) Alert.alert("Erreur Inscription", error.message); 
      else { await supabase.from('public_users').insert({ pseudo: pseudo }); Alert.alert("Bienvenue !", "Ton compte est créé."); } 
    } 
    setLoading(false); 
  };

  return ( 
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginContainer}> 
      <View style={{alignItems:'center', marginBottom:40}}> 
         <Image source={require('./assets/images/icon.png')} style={{width: 100, height: 100, borderRadius: 20, marginBottom: 15}} resizeMode="contain"/> 
         <Text style={styles.loginTitle}>QULT</Text> 
         <Text style={styles.loginSubtitle}>{isLogin ? "Bon retour parmi nous" : "Rejoins le cercle des savoirs"}</Text> 
      </View> 
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666" autoCapitalize="none" value={email} onChangeText={setEmail} keyboardType="email-address"/> 
      <TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="#666" secureTextEntry value={password} onChangeText={setPassword}/> 
      {!isLogin && (<TextInput style={styles.input} placeholder="Choisis ton Pseudo" placeholderTextColor="#666" value={pseudo} onChangeText={setPseudo}/>)} 
      <TouchableOpacity style={styles.loginBtn} onPress={handleAuth} disabled={loading}>
        <Text style={styles.loginBtnText}>{isLogin ? "Se Connecter" : "Créer un compte"}</Text>
      </TouchableOpacity> 
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{marginTop: 20}}>
        <Text style={{color: '#888'}}>{isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}<Text style={{color: COLORS.primary, fontWeight:'bold'}}>{isLogin ? "S'inscrire" : "Se connecter"}</Text></Text>
      </TouchableOpacity> 
    </KeyboardAvoidingView> 
  );
};

const HomeScreen = ({ feedData, toggleLike, likedCards, myPseudo }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  
  // OPTIMISATION ANDROID SCROLL
  const renderRow = useCallback(({ item }) => ( 
    <View style={{ height: SCREEN_HEIGHT, width: SCREEN_WIDTH }}> 
      <FlatList 
        data={item} 
        horizontal 
        pagingEnabled={true} 
        showsHorizontalScrollIndicator={false} 
        initialNumToRender={1} 
        maxToRenderPerBatch={1} 
        windowSize={2} 
        removeClippedSubviews={true} 
        keyExtractor={item => item.id} 
        renderItem={({ item: card }) => ( 
          <CardFull 
            card={card} 
            isLiked={likedCards.has(card.id)} 
            onLike={() => toggleLike(card)} 
            onOpen={() => { setSelectedCard(card); setModalVisible(true); }} 
            onShare={() => { setSelectedCard(card); setShareVisible(true); }}
          /> 
        )} 
      /> 
    </View> 
  ), [likedCards, toggleLike]);

  return ( 
    <> 
      <FlatList 
        data={feedData} 
        renderItem={renderRow} 
        pagingEnabled={true} 
        showsVerticalScrollIndicator={false} 
        keyExtractor={(item, index) => index.toString()} 
        initialNumToRender={2} 
        windowSize={3} 
        removeClippedSubviews={true} 
      /> 
      <DetailModal visible={modalVisible} card={selectedCard} onClose={() => setModalVisible(false)} /> 
      <ShareModal visible={shareVisible} onClose={() => setShareVisible(false)} myPseudo={myPseudo} card={selectedCard} />
    </> 
  );
};

const QuizDailyScreen = ({ questions, hasPlayed, todayScore, onFinish }) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [detailCard, setDetailCard] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  if (hasPlayed || finished) { 
    const finalScore = hasPlayed ? todayScore : score; 
    const safeScore = Math.min(finalScore, 5);
    const scoreColor = getScoreColor(safeScore); 
    const progressData = { labels: ["Score"], data: [safeScore / 5] }; 
    return ( 
      <View style={styles.quizContainer}> 
        <Text style={styles.dateText}>{getFormattedDate().toUpperCase()}</Text> 
        <Text style={styles.quizTitle}>Quiz du Jour</Text> 
        <View style={{alignItems: 'center', marginVertical: 20}}> 
          <View>
             <ProgressChart data={progressData} width={SCREEN_WIDTH - 100} height={160} strokeWidth={12} radius={60} chartConfig={{ backgroundGradientFrom: "#000", backgroundGradientTo: "#000", color: (opacity = 1) => scoreColor, labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`}} hideLegend={true}/> 
          </View>
          <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={[styles.scoreBig, { color: scoreColor }]}>{safeScore}/5</Text>
          </View> 
        </View> 
        <Text style={styles.recapTitle}>Clique sur une question pour voir la fiche :</Text> 
        <ScrollView style={{marginTop: 10}}> 
          {questions.map((q, i) => ( 
            <TouchableOpacity key={i} style={styles.recapItem} onPress={() => { if(q.cards) { setDetailCard(q.cards); setModalVisible(true); } else { Alert.alert("Oups", "Pas de fiche."); } }}> 
              <View style={styles.recapBadge}>
                <Text style={{color:'#fff', fontWeight:'bold'}}>{i+1}</Text>
              </View> 
              <Text style={styles.recapText}>{q.question}</Text> 
              <Ionicons name="chevron-forward" color="#666" size={20} /> 
            </TouchableOpacity> 
          ))} 
        </ScrollView> 
        <DetailModal visible={modalVisible} card={detailCard} onClose={() => setModalVisible(false)} /> 
      </View> 
    ); 
  }

  if (!questions || questions.length === 0) return <View style={styles.centerScreen}><ActivityIndicator color={COLORS.primary}/></View>;
  
  const currentQ = questions[index];
  const handlePress = (option) => { if (isAnswered) return; setSelectedOption(option); setIsAnswered(true); if (option === currentQ.correct_option) setScore(score + 1); };
  const handleNext = () => { if (index < questions.length - 1) { setIndex(index + 1); setIsAnswered(false); setSelectedOption(null); } else { setFinished(true); onFinish(selectedOption === currentQ.correct_option ? score + 1 : score); } };
  const getButtonColor = (option) => { if (!isAnswered) return '#222'; if (option === currentQ.correct_option) return COLORS.correct; if (option === selectedOption) return COLORS.wrong; return '#222'; };
  
  return ( 
    <View style={styles.quizContainer}> 
      <View style={styles.quizHeader}> 
         <Text style={styles.dateText}>{getFormattedDate().toUpperCase()}</Text> 
         <Text style={styles.quizProgress}>Question {index + 1} / {questions.length}</Text> 
        <View style={styles.progressBarBg}>
          <View style={{width: `${((index+1)/questions.length)*100}%`, height: '100%', backgroundColor: COLORS.primary, borderRadius: 3}} />
        </View> 
      </View> 
      <Text style={styles.questionText}>{currentQ.question}</Text> 
      <View style={styles.optionsContainer}>
        {['A', 'B', 'C', 'D'].map((opt) => (
          <TouchableOpacity key={opt} style={[styles.optionBtn, { backgroundColor: getButtonColor(opt) }]} onPress={() => handlePress(opt)} disabled={isAnswered}>
            <Text style={styles.optionText}>{currentQ[`option_${opt.toLowerCase()}`]}</Text>
          </TouchableOpacity>
        ))}
      </View> 
      {isAnswered && (
        <View style={{marginTop: 20}}>
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>{selectedOption === currentQ.correct_option ? "Exact !" : "Faux..."}</Text>
            <Text style={styles.explanationText}>{currentQ.explanation}</Text>
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>{index < questions.length - 1 ? "Question Suivante" : "Voir mon Résultat"}</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      )} 
    </View> 
  );
};

const FriendsScreen = ({ myPseudo, onOpenProfile }) => {
  const [friends, setFriends] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [myFollowings, setMyFollowings] = useState(new Set());
  const [chatModal, setChatModal] = useState({ visible: false, friend: null });

  const fetchSocialData = async () => {
    const { data: reqs } = await supabase.from('follows').select('*').eq('following_pseudo', myPseudo).eq('status', 'pending');
    setRequests(reqs || []);
    const { data: followingData } = await supabase.from('follows').select('following_pseudo').eq('follower_pseudo', myPseudo).eq('status', 'accepted');
    const followingSet = new Set(followingData?.map(f => f.following_pseudo));
    setMyFollowings(followingSet);
    setFriends(followingData || []);

    const today = getLocalDateISO();
    const friendPseudos = (followingData || []).map(f => f.following_pseudo);
    friendPseudos.push(myPseudo);

    const { data: allHistory } = await supabase.from('user_quiz_history').select('user_pseudo, score, quiz_date, created_at').in('user_pseudo', friendPseudos).order('quiz_date', { ascending: false });
    if (!allHistory) return;

    const finalLeaderboard = friendPseudos.map(pseudo => {
      const userHistory = allHistory.filter(h => h.user_pseudo === pseudo);
      const todayEntry = userHistory.find(h => h.quiz_date === today);
      if (!todayEntry) return null;
      let streak = 0;
      if (todayEntry.score === 5) {
        streak = 1;
        for (let i = 1; i < 365; i++) {
          const targetDate = subDays(today, i);
          const pastEntry = userHistory.find(h => h.quiz_date === targetDate);
          if (pastEntry && pastEntry.score === 5) streak++; else break;
        }
      }
      return { user_pseudo: pseudo, score: todayEntry.score, streak: streak, finished_at: todayEntry.created_at };
    }).filter(item => item !== null);

    finalLeaderboard.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.finished_at) - new Date(b.finished_at);
    });
    setLeaderboard(finalLeaderboard);
  };

  useEffect(() => { fetchSocialData(); }, [myPseudo, searchModalVisible, chatModal]);
  const acceptRequest = async (id, followerPseudo) => { await supabase.from('follows').update({ status: 'accepted' }).eq('id', id); fetchSocialData(); };
  const declineRequest = async (id) => { await supabase.from('follows').delete().eq('id', id); fetchSocialData(); };
  const followBack = async (target) => { await supabase.from('follows').insert({ follower_pseudo: myPseudo, following_pseudo: target, status: 'pending' }); Alert.alert("Envoyé", `Demande de suivi envoyée à ${target}`); fetchSocialData(); };

  return (
    <View style={[styles.container, {paddingTop: 60, paddingHorizontal: 20}]}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
        <Text style={styles.sectionTitle}>Cercle 🌍</Text>
        <TouchableOpacity onPress={() => setSearchModalVisible(true)} style={{backgroundColor: COLORS.primary, padding: 8, borderRadius: 20}}><Ionicons name="person-add" size={24} color="#000" /></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.leaderboardBox}>
          <Text style={{color: COLORS.gold, fontWeight:'bold', marginBottom: 15, fontSize: 16}}>🏆 CLASSEMENT DU JOUR</Text>
          {leaderboard.length > 0 ? leaderboard.map((item, index) => (
            <TouchableOpacity key={index} onPress={() => onOpenProfile(item.user_pseudo)} style={styles.rankRow}>
              <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                <Text style={{color: index === 0 ? COLORS.gold : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666', fontWeight:'bold', fontSize: 16, width: 20}}>{index + 1}</Text>
                <View>
                   <Text style={[styles.friendName, {color: item.user_pseudo === myPseudo ? COLORS.primary : 'white'}]}>{item.user_pseudo}</Text>
                   {item.streak >= 1 ? <Text style={{color: COLORS.orange, fontSize: 10, fontWeight:'bold'}}>🔥 {item.streak}</Text> : null}
                </View>
              </View>
              <View style={{alignItems:'flex-end'}}>
                 <Text style={{color: 'white', fontWeight:'bold'}}>{item.score}/5</Text>
                 <Text style={{color: '#666', fontSize: 10}}>{new Date(item.finished_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</Text>
              </View>
            </TouchableOpacity>
          )) : <Text style={{color:'#666', fontStyle:'italic'}}>Personne n'a joué aujourd'hui. Sois le premier !</Text>}
        </View>
        {requests.length > 0 && (
          <View style={{marginBottom: 20}}>
            <Text style={{color: COLORS.orange, fontWeight:'bold', marginBottom: 10}}>EN ATTENTE ({requests.length})</Text>
            {requests.map(req => {
              const isFollowing = myFollowings.has(req.follower_pseudo);
              return (
              <View key={req.id} style={styles.friendRow}>
                <View><Text style={styles.friendName}>{req.follower_pseudo}</Text>{!isFollowing && <Text style={{color:'#666', fontSize:10}}>Tu ne le suis pas</Text>}</View>
                <View style={{flexDirection:'row', gap: 10, alignItems:'center'}}>
                  {!isFollowing && (<TouchableOpacity onPress={() => followBack(req.follower_pseudo)} style={{backgroundColor: '#333', padding: 8, borderRadius: 8}}><Text style={{color:'white', fontSize: 10, fontWeight:'bold'}}>Suivre</Text></TouchableOpacity>)}
                  <TouchableOpacity onPress={() => acceptRequest(req.id)} style={{backgroundColor: COLORS.primary, padding: 8, borderRadius: 8}}><Ionicons name="checkmark" size={16} color="#000"/></TouchableOpacity>
                  <TouchableOpacity onPress={() => declineRequest(req.id)} style={{backgroundColor: '#333', padding: 8, borderRadius: 8}}><Ionicons name="close" size={16} color="#fff"/></TouchableOpacity>
                </View>
              </View>
            )})}
          </View>
        )}
        <Text style={{color: '#888', fontWeight:'bold', marginBottom: 10, marginTop: 10}}>MES AMIS ({friends.length})</Text>
        {friends.length > 0 ? friends.map((f, i) => (
          <TouchableOpacity key={i} onPress={() => setChatModal({visible: true, friend: f.following_pseudo})} style={styles.friendRow}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
              <View style={styles.smallAvatar}><Text>👤</Text></View>
              <Text style={styles.friendName}>{f.following_pseudo}</Text>
            </View>
            <View style={{flexDirection:'row', gap: 10}}>
               <TouchableOpacity onPress={() => onOpenProfile(f.following_pseudo)}><Ionicons name="stats-chart" color="#666" size={20}/></TouchableOpacity>
               <Ionicons name="chatbubble-ellipses-outline" color={COLORS.primary} size={20}/>
            </View>
          </TouchableOpacity>
        )) : <Text style={{color: '#555', fontStyle:'italic'}}>Recherche des gens pour commencer !</Text>}
        <View style={{height: 100}} />
      </ScrollView>
      <SearchUserModal visible={searchModalVisible} onClose={() => setSearchModalVisible(false)} myPseudo={myPseudo} />
      <ChatModal visible={chatModal.visible} onClose={() => setChatModal({visible: false, friend: null})} myPseudo={myPseudo} friendPseudo={chatModal.friend} />
    </View>
  );
};

const StatsScreen = ({ targetPseudo, isCurrentUser, onBack, todayScore, likedCount, onLogout }) => {
  const [history, setHistory] = useState([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [listModal, setListModal] = useState({ visible: false, type: 'followers' });
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function loadData() {
      const { data: hist } = await supabase.from('user_quiz_history').select('*').eq('user_pseudo', targetPseudo).order('quiz_date', { ascending: false });
      if (hist) {
        setHistory(hist.slice(0, 10));
        let currentStreak = 0;
        if(hist.length > 0 && hist[0].score === 5) {
           currentStreak = 1;
           for(let i=1; i<hist.length; i++) {
             if(hist[i].score === 5) currentStreak++; else break;
           }
        }
        setStreak(currentStreak);
      }
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_pseudo', targetPseudo).eq('status', 'accepted');
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_pseudo', targetPseudo).eq('status', 'accepted');
      setFollowCounts({ followers: followers || 0, following: following || 0 });
    }
    if (targetPseudo) loadData();
  }, [targetPseudo]);

  const openList = (type) => { setListModal({ visible: true, type }); };
  const chartConfig = { backgroundGradientFromOpacity:0, backgroundGradientToOpacity:0, color: (opacity=1)=>`rgba(74, 222, 128, ${opacity})` };
  const data = [ { name: "Histoire", population: 20, color: "tomato", legendFontColor: "#fff", legendFontSize: 12 }, { name: "Science", population: 30, color: "skyblue", legendFontColor: "#fff", legendFontSize: 12 }, { name: "Tech", population: 15, color: "gold", legendFontColor: "#fff", legendFontSize: 12 } ];
  
  return (
    <ScrollView style={styles.statsScroll} contentContainerStyle={{paddingTop: 60, paddingBottom: 100}}>
      <View style={styles.profileHeader}>
        {!isCurrentUser && ( <TouchableOpacity onPress={onBack} style={{position:'absolute', left: 20, top: 0, zIndex:10}}><Ionicons name="arrow-back" size={30} color="white" /></TouchableOpacity> )}
        <View style={styles.avatar}><Text style={{fontSize: 30}}>🎓</Text></View>
        <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
          <Text style={styles.pseudo}>{targetPseudo}</Text>
          {streak >= 1 ? <Text style={{fontSize: 20}}>🔥 {streak}</Text> : null}
        </View>
        <View style={{flexDirection: 'row', gap: 30, marginVertical: 15}}>
          <TouchableOpacity onPress={() => openList('following')} style={{alignItems:'center'}}>
            <Text style={{color:'white', fontWeight:'bold', fontSize: 18}}>{followCounts.following}</Text>
            <Text style={{color:'#888', fontSize: 12}}>Abonnements</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openList('followers')} style={{alignItems:'center'}}>
            <Text style={{color:'white', fontWeight:'bold', fontSize: 18}}>{followCounts.followers}</Text>
            <Text style={{color:'#888', fontSize: 12}}>Abonnés</Text>
          </TouchableOpacity>
        </View>
        {isCurrentUser && ( <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}><Text style={styles.logoutText}>Se déconnecter</Text></TouchableOpacity> )}
      </View>
      {isCurrentUser && ( 
        <View style={styles.statRow}> 
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{likedCount}</Text>
            <Text style={styles.statLabel}>Favoris</Text>
          </View> 
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{todayScore !== null ? todayScore : "-"}/5</Text>
            <Text style={styles.statLabel}>Note du Jour</Text>
          </View> 
        </View> 
      )}
      <Text style={styles.sectionTitle}>Intérêts</Text>
      <View>
        <PieChart data={data} width={SCREEN_WIDTH} height={200} chartConfig={chartConfig} accessor={"population"} backgroundColor={"transparent"} paddingLeft={"15"} />
      </View>
      <Text style={[styles.sectionTitle, {marginTop: 20}]}>Historique Quiz 📜</Text>
      <View style={styles.historyContainer}> 
        {history.length > 0 ? history.map((h, i) => ( 
          <View key={i} style={styles.historyItem}> 
            <Text style={styles.historyDate}>{new Date(h.quiz_date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}</Text> 
            <View style={styles.historyScoreBar}>
              {[1,2,3,4,5].map(star => (<View key={star} style={[styles.dot, {backgroundColor: star <= h.score ? getScoreColor(h.score) : '#333'}]} />))}
            </View> 
            <Text style={[styles.historyScoreNum, {color: getScoreColor(h.score)}]}>{h.score}/5</Text> 
          </View> 
        )) : <Text style={{color: '#666', marginLeft: 20}}>Pas encore d'historique.</Text>} 
      </View>
      <UserListModal visible={listModal.visible} onClose={() => setListModal({ ...listModal, visible: false })} type={listModal.type} pseudo={targetPseudo} />
    </ScrollView>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [userPseudo, setUserPseudo] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [feedData, setFeedData] = useState([]); 
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [likedCards, setLikedCards] = useState(new Set());
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [todayScore, setTodayScore] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [visitingProfile, setVisitingProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) extractPseudo(session);
      setLoadingAuth(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) extractPseudo(session);
    });
  }, []);

  const extractPseudo = (session) => {
    if (session?.user?.user_metadata?.pseudo) setUserPseudo(session.user.user_metadata.pseudo);
    else setUserPseudo(session?.user?.email?.split('@')[0] || 'Membre');
  };

  useEffect(() => { if (session) { fetchData(); fetchQuiz(); } }, [session]);
  useEffect(() => { if (session && userPseudo) checkDailyQuizStatus(); }, [session, userPseudo]);

  async function checkDailyQuizStatus() {
    const today = getLocalDateISO();
    const { data } = await supabase.from('user_quiz_history').select('score').eq('user_pseudo', userPseudo).eq('quiz_date', today).single();
    if (data) { setHasPlayedToday(true); setTodayScore(data.score); }
    else { setHasPlayedToday(false); setTodayScore(null); }
  }

  async function fetchData() {
    const { data } = await supabase.from('cards').select('*, themes(id, name, categories(name))').order('importance_level', { ascending: false });
    if (data) {
      const groups = {};
      data.forEach(c => { const k = c.theme_id || 'unknown'; if(!groups[k]) groups[k]=[]; groups[k].push(c); });
      setFeedData(Object.values(groups));
    }
  }

  async function fetchQuiz() {
    const { data } = await supabase.from('quiz_questions').select('*, cards(*)'); 
    if (data) {
      const shuffled = seededShuffle(data);
      setQuizQuestions(shuffled.slice(0, 5));
    }
  }

  const toggleLike = useCallback((card) => {
    setLikedCards(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(card.id)) newLiked.delete(card.id); else newLiked.add(card.id);
      return newLiked;
    });
  }, []);

  const saveScore = async (score) => {
    const safeScore = Math.min(score, 5);
    setTodayScore(safeScore);
    setHasPlayedToday(true);
    await supabase.from('user_quiz_history').insert({ user_pseudo: userPseudo, score: safeScore, quiz_date: getLocalDateISO() });
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setSession(null); 
    setUserPseudo(null);
    setTodayScore(null);
    setHasPlayedToday(false);
    setLikedCards(new Set());
    setVisitingProfile(null);
    setCurrentTab('home');
  };

  const openProfile = (pseudo) => { setVisitingProfile(pseudo); setCurrentTab('stats'); };
  const closeProfile = () => { setVisitingProfile(null); };

  if (loadingAuth) return <View style={styles.centerScreen}><ActivityIndicator color={COLORS.primary}/></View>;
  if (!session) return <AuthScreen />;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {currentTab === 'home' && <HomeScreen feedData={feedData} toggleLike={toggleLike} likedCards={likedCards} myPseudo={userPseudo} />}
      {currentTab === 'quiz' && <QuizDailyScreen questions={quizQuestions} hasPlayed={hasPlayedToday} todayScore={todayScore} onFinish={saveScore} />}
      {currentTab === 'friends' && <FriendsScreen myPseudo={userPseudo} onOpenProfile={openProfile} />}
      {currentTab === 'stats' && (
        <StatsScreen 
          targetPseudo={visitingProfile || userPseudo} 
          isCurrentUser={!visitingProfile} 
          onBack={visitingProfile ? closeProfile : null}
          todayScore={visitingProfile ? null : todayScore}
          likedCount={visitingProfile ? 0 : likedCards.size}
          onLogout={handleLogout} 
        />
      )}
      <View style={styles.navBar}>
        <NavIcon icon="home" label="Feed" active={currentTab === 'home'} onPress={() => { setVisitingProfile(null); setCurrentTab('home'); }} />
        <View style={styles.quizBtnWrapper}>
           <TouchableOpacity style={styles.quizBtnCenter} onPress={() => { setVisitingProfile(null); setCurrentTab('quiz'); }}>
             <Ionicons name="school" size={28} color="#000" />
           </TouchableOpacity>
        </View>
        <NavIcon icon="people" label="Cercle" active={currentTab === 'friends'} onPress={() => { setVisitingProfile(null); setCurrentTab('friends'); }} />
        <NavIcon icon="stats-chart" label="Profil" active={currentTab === 'stats' && !visitingProfile} onPress={() => { setVisitingProfile(null); setCurrentTab('stats'); }} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  navBar: { position: 'absolute', bottom: 0, width: '100%', height: 85, backgroundColor: 'rgba(0,0,0,0.95)', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  navItem: { alignItems: 'center', width: 60 }, navLabel: { fontSize: 10, marginTop: 4 },
  quizBtnWrapper: { position: 'relative', top: -25 },
  quizBtnCenter: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#000' },
  loginContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 30 },
  loginTitle: { color: 'white', fontSize: 36, fontWeight: 'bold', letterSpacing: 2 },
  loginSubtitle: { color: '#888', fontSize: 16, marginTop: 5 },
  input: { backgroundColor: '#1a1a1a', color: 'white', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  loginBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  loginBtnText: { fontWeight: 'bold', fontSize: 18, color: '#000' },
  quizContainer: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  dateText: { color: '#666', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
  quizHeader: { marginBottom: 30 },
  quizProgress: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 10 },
  questionText: { color: 'white', fontSize: 22, fontWeight: 'bold', lineHeight: 30, marginBottom: 30 },
  optionsContainer: { gap: 15 },
  optionBtn: { padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  optionText: { color: 'white', fontSize: 16, fontWeight: '600' },
  explanationBox: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, marginTop: 10 },
  explanationTitle: { color: 'white', fontWeight: 'bold', marginBottom: 5 },
  explanationText: { color: '#ccc', fontSize: 14 },
  nextBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, marginTop: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  nextBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  scoreBig: { fontSize: 32, fontWeight: 'bold' },
  quizTitle: { color: 'white', fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  recapTitle: { color: '#888', fontSize: 16, marginTop: 20 },
  recapItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, marginBottom: 10 },
  recapBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  recapText: { color: 'white', flex: 1, fontSize: 14 },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  pseudo: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { marginTop: 15, padding: 8, backgroundColor: '#222', borderRadius: 8 },
  logoutText: { color: COLORS.wrong, fontSize: 12, fontWeight: 'bold' },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  statBox: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 10, width: '40%', alignItems: 'center' },
  statNum: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 10 },
  statsScroll: { flex: 1, backgroundColor: '#000' },
  historyContainer: { paddingHorizontal: 20 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  historyDate: { color: '#aaa', width: 60, fontSize: 12, fontWeight: 'bold' },
  historyScoreBar: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  historyScoreNum: { color: 'white', fontWeight: 'bold', marginLeft: 15 },
  cardUi: { flex: 1, justifyContent: 'flex-end', flexDirection: 'row', padding: 20, paddingBottom: 100 },
  cardContent: { flex: 1, justifyContent: 'flex-end', paddingRight: 20 },
  cardTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  tag: { backgroundColor: COLORS.primary, alignSelf: 'flex-start', padding: 5, borderRadius: 4, marginBottom: 10 },
  tagText: { fontWeight: 'bold', fontSize: 10 },
  cardActions: { justifyContent: 'flex-end', gap: 20, paddingBottom: 20 },
  actionBtn: { alignItems: 'center' },
  actionText: { color: 'white', fontSize: 12, marginTop: 5 },
  heartOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { height: '85%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25 },
  dragIndicator: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalCat: { color: COLORS.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  sep: { width: 40, height: 4, backgroundColor: COLORS.primary, marginBottom: 20 },
  modalText: { fontSize: 18, lineHeight: 28, color: '#333' },
  leaderboardBox: { backgroundColor: '#1a1a1a', borderRadius: 15, padding: 20, marginBottom: 30 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  friendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  friendName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  smallAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  chatHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#222' },
  chatInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1, borderTopColor: '#222' },
  chatInput: { flex: 1, backgroundColor: '#1a1a1a', color: 'white', padding: 15, borderRadius: 25, fontSize: 16 },
  sendBtn: { marginLeft: 10, backgroundColor: COLORS.primary, padding: 12, borderRadius: 25 },
  closeChatBtn: { padding: 5 }
});
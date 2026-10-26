export interface CardItem {
  id: string;
  theme_id: string;
  short_text: string;
  long_text: string;
  image_url: string;
  importance_level: number;
  author_pseudo?: string;
  themes?: {
    id: string;
    name: string;
    categories?: {
      name: string;
      color?: string;
    };
  };
}

export interface QuizQuestion {
  id: string;
  card_id?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  cards?: CardItem;
}

export interface PublicUser {
  pseudo: string;
  avatar_url?: string;
  bio?: string;
  score?: number;
  streak?: number;
}

export const MOCK_CARDS: CardItem[] = [
  {
    id: 'c1',
    theme_id: 't_antiquity',
    short_text: 'La Grande Pyramide de Gizeh était à l origine blanche et étincelante.',
    long_text: 'Construite vers 2560 av. J.-C. pour Khéops, elle était recouverte d un parement de calcaire blanc de Tourah poli à l extrême. Sous le soleil du désert, elle reflétait la lumière comme un phare géant visible à des kilomètres.',
    image_url: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1080&q=80',
    importance_level: 5,
    themes: {
      id: 't_antiquity',
      name: 'Antiquité & Empires',
      categories: { name: 'Histoire', color: '#f59e0b' }
    }
  },
  {
    id: 'c2',
    theme_id: 't_antiquity',
    short_text: 'Jules César a été enlevé par des pirates... et a exigé qu ils doublent sa rançon.',
    long_text: 'En 75 av. J.-C., des pirates réclament 20 talents d or pour César. Jugeant l offre insultante pour son rang, César rit et leur ordonne d en exiger 50. Une fois libéré, il lève une flotte et les fait tous capturer.',
    image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
    importance_level: 4,
    themes: {
      id: 't_antiquity',
      name: 'Antiquité & Empires',
      categories: { name: 'Histoire', color: '#f59e0b' }
    }
  },
  {
    id: 'c3',
    theme_id: 't_astro',
    short_text: 'Le temps s écoule plus lentement près d un trou noir (dilatation temporelle).',
    long_text: 'Selon la relativité générale d Einstein, la gravitation courbe l espace-temps. Plus le champ gravitationnel est puissant, plus le temps ralentit. Près de l horizon d un trou noir, 1 heure peut équivaloir à des années sur Terre.',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    importance_level: 5,
    themes: {
      id: 't_astro',
      name: 'Astrophysique',
      categories: { name: 'Sciences', color: '#38bdf8' }
    }
  },
  {
    id: 'c4',
    theme_id: 't_astro',
    short_text: 'Toutes les étoiles visibles la nuit à l œil nu appartiennent à la Voie Lactée.',
    long_text: 'Chaque point lumineux que vous observez sans télescope dans le ciel nocturne fait partie intégrante de notre galaxie. La seule exception est la galaxie d Andromède, visible sous forme d une très faible nébulosité à 2,5 millions d années-lumière.',
    image_url: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800&q=80',
    importance_level: 4,
    themes: {
      id: 't_astro',
      name: 'Astrophysique',
      categories: { name: 'Sciences', color: '#38bdf8' }
    }
  },
  {
    id: 'c5',
    theme_id: 't_art',
    short_text: 'La Joconde n a pas de sourcils ni de cils visibles.',
    long_text: 'Une analyse ultra-haute résolution par l ingénieur Pascal Cotte a révélé que Léonard de Vinci avait initialement peint des sourcils et des cils extrêmement fins, mais qu ils ont été effacés lors de nettoyages anciens aux siècles passés.',
    image_url: 'https://images.unsplash.com/photo-1577720643272-265f09367456?w=1080&q=80',
    importance_level: 5,
    themes: {
      id: 't_art',
      name: 'Chefs-d œuvre',
      categories: { name: 'Arts & Culture', color: '#ec4899' }
    }
  },
  {
    id: 'c6',
    theme_id: 't_art',
    short_text: 'Van Gogh a peint "La Nuit Étoilée" depuis la fenêtre de son asile.',
    long_text: 'Enfermée au monastère Saint-Paul-de-Mausole en 1889, Van Gogh peint cette œuvre mythique juste avant l aube, en y ajoutant le village de ses souvenirs d enfance aux Pays-Bas et un cyprès symbolisant le deuil et l éternité.',
    image_url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80',
    importance_level: 4,
    themes: {
      id: 't_art',
      name: 'Chefs-d œuvre',
      categories: { name: 'Arts & Culture', color: '#ec4899' }
    }
  },
  {
    id: 'c7',
    theme_id: 't_tech',
    short_text: 'Le premier programmeur de l Histoire était une femme : Ada Lovelace.',
    long_text: 'Dès 1843, Ada Lovelace conçoit le tout premier algorithme destiné à une machine (la machine analytique de Babbage). Elle a été la première visionnaire à comprendre que les ordinateurs manipuleraient un jour de la musique, du texte et des images.',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    importance_level: 5,
    themes: {
      id: 't_tech',
      name: 'Pionniers Tech',
      categories: { name: 'Technologie', color: '#4ade80' }
    }
  },
  {
    id: 'c8',
    theme_id: 't_philo',
    short_text: 'L allégorie de la Caverne de Platon illustre notre illusion du réel.',
    long_text: 'Des prisonniers enchaînés dans une caverne ne voient que des ombres projetées et les prennent pour la réalité. Le rôle du philosophe est d affronter la lumière du Soleil (la vérité) et d aider les autres à briser leurs chaînes mentales.',
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
    importance_level: 5,
    themes: {
      id: 't_philo',
      name: 'Philosophie Antique',
      categories: { name: 'Philosophie', color: '#a855f7' }
    }
  }
];

export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    card_id: 'c1',
    question: 'De quelle couleur était initialement la Grande Pyramide de Gizeh ?',
    option_a: 'Or massif poli',
    option_b: 'Blanc éclatant étincelant',
    option_c: 'Rouge ocre du Nil',
    option_d: 'Granit noir poli',
    correct_option: 'B',
    explanation: 'Elle était recouverte d un calcaire blanc de Tourah si poli qu il reflétait le soleil à des kilomètres !',
    cards: MOCK_CARDS[0]
  },
  {
    id: 'q2',
    card_id: 'c3',
    question: 'Que se passe-t-il pour le temps près d un trou noir supermassif ?',
    option_a: 'Il s accélère considérablement',
    option_b: 'Il s inverse dans le passé',
    option_c: 'Il ralentit (dilatation temporelle)',
    option_d: 'Il se fige à tout jamais',
    correct_option: 'C',
    explanation: 'La gravitation extrême courbe l espace-temps : plus le champ est fort, plus le temps s écoule lentement.',
    cards: MOCK_CARDS[2]
  },
  {
    id: 'q3',
    card_id: 'c5',
    question: 'Quel détail manque étrangement sur le visage de La Joconde ?',
    option_a: 'Ses cils et ses sourcils',
    option_b: 'Le lobe de son oreille',
    option_c: 'Ses narines',
    option_d: 'Son menton',
    correct_option: 'A',
    explanation: 'Des analyses infrarouges ont montré qu ils existaient à l origine mais ont disparu avec les vernis et nettoyages anciens.',
    cards: MOCK_CARDS[4]
  },
  {
    id: 'q4',
    card_id: 'c7',
    question: 'Qui est reconnu(e) comme le tout premier programmeur de l Histoire ?',
    option_a: 'Alan Turing',
    option_b: 'Ada Lovelace',
    option_c: 'Grace Hopper',
    option_d: 'Nikola Tesla',
    correct_option: 'B',
    explanation: 'Ada Lovelace a publié en 1843 le premier algorithme destiné à être exécuté par la machine de Babbage.',
    cards: MOCK_CARDS[6]
  },
  {
    id: 'q5',
    card_id: 'c2',
    question: 'Face aux pirates qui l avaient capturé, quelle a été la réaction de Jules César ?',
    option_a: 'Il a supplié en larmes',
    option_b: 'Il a sauté par-dessus bord',
    option_c: 'Il a exigé qu ils doublent sa rançon',
    option_d: 'Il les a défiés aux échecs',
    correct_option: 'C',
    explanation: 'Trouvant le prix de 20 talents insultant pour sa grandeur, il a exigé qu ils demandent 50 talents d or !',
    cards: MOCK_CARDS[1]
  }
];

export const MOCK_LEADERBOARD = [
  { user_pseudo: 'Sophie_Culture', score: 5, streak: 8, finished_at: new Date().toISOString() },
  { user_pseudo: 'Alexandre_Dev', score: 4, streak: 5, finished_at: new Date(Date.now() - 3600000).toISOString() },
  { user_pseudo: 'Camille_Astro', score: 4, streak: 2, finished_at: new Date(Date.now() - 7200000).toISOString() },
  { user_pseudo: 'Thomas_Histoire', score: 3, streak: 0, finished_at: new Date(Date.now() - 10800000).toISOString() }
];

export const MOCK_FRIENDS = [
  { following_pseudo: 'Sophie_Culture', avatar: '👩‍🎨', bio: 'Curieuse insatiable' },
  { following_pseudo: 'Alexandre_Dev', avatar: '💻', bio: 'Tech & Philosophie' },
  { following_pseudo: 'Camille_Astro', avatar: '🔭', bio: 'La tête dans les étoiles' }
];

export const MOCK_MESSAGES: Record<string, Array<{ id: string; sender_pseudo: string; content?: string; shared_card_id?: string; cards?: CardItem; created_at: string }>> = {
  'Sophie_Culture': [
    {
      id: 'm1',
      sender_pseudo: 'Sophie_Culture',
      content: 'Salut Victor ! Tu as vu la fiche sur la Pyramide de Gizeh ? 🔥',
      shared_card_id: 'c1',
      cards: MOCK_CARDS[0],
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'm2',
      sender_pseudo: 'Victor',
      content: 'Carrément ! Le calcaire blanc poli devait être splendide sous le soleil !',
      created_at: new Date(Date.now() - 1800000).toISOString()
    }
  ]
};

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
    short_text: 'La Grande Pyramide de Gizeh était à l origine blanche et étincelante',
    long_text: 'Construite vers 2560 av. J.-C. pour Khéops, la pyramide était recouverte d un parement de calcaire blanc poli reflétant le soleil comme un phare géant.\n\nCe calcaire blanc de Tourah a été extrait de l autre côté du Nil et taillé avec une précision microscopique. Au sommet trônait un pyramidion souvent doré qui captait les premiers et derniers rayons du soleil dans tout le désert. La quasi-totalité de ce parement immaculé a été pillée au Moyen Âge, notamment en 1356 après un séisme, pour reconstruire les mosquées et forteresses du Caire.',
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
    short_text: 'Jules César a exigé de ses ravisseurs pirates qu ils doublent sa rançon',
    long_text: 'En 75 av. J.-C., des pirates réclament 20 talents d or pour libérer César. Jugeant l offre insultante pour son rang, César rit et leur ordonne d en exiger 50.\n\nPendant ses 38 jours de captivité sur une île de Cilicie, César s est comporté en maître absolu : il leur lisait ses poèmes, les grondait s ils faisaient du bruit pendant sa sieste et leur promettait en riant de les faire tous crucifier. Les pirates le prenaient pour un fou. Une fois la rançon de 50 talents payée et César libéré, il a levé une flotte militaire, a pourchassé les pirates, a récupéré tout l or et a exécuté sa promesse à la lettre.',
    image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1080&q=80',
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
    short_text: 'Le temps s écoule plus lentement près d un trou noir supermassif',
    long_text: 'Selon la relativité générale d Einstein, la gravitation courbe l espace-temps : plus le champ gravitationnel est puissant, plus le temps s écoule lentement.\n\nCe phénomène n est pas une illusion d optique mais une réalité physique mesurée. À proximité immédiate de l horizon des événements d un trou noir comme Gargantua, 1 heure passée sur une planète orbitale peut équivaloir à 7 ans pour un observateur resté au loin. Si vous regardiez quelqu un tomber dans un trou noir, vous le verriez ralentir indéfiniment jusqu à se figer pour l éternité à la frontière.',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80',
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
    short_text: 'Toutes les étoiles visibles la nuit à l œil nu font partie de la Voie Lactée',
    long_text: 'Chaque point lumineux que vous observez sans télescope dans le ciel nocturne appartient exclusivement à notre propre galaxie.\n\nLa Voie Lactée compte entre 100 et 400 milliards d étoiles, mais à l œil nu, nous n en apercevons que 6 000 à 9 000 dans les meilleures conditions nocturnes, toutes situées dans notre banlieue cosmique immédiate (moins de 1 000 années-lumière). La seule exception visible sans instrument dans l hémisphère nord est la galaxie d Andromède, qui apparaît comme une très faible nébulosité à 2,5 millions d années-lumière.',
    image_url: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1080&q=80',
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
    short_text: 'La Joconde : Le mystère des sourcils invisibles',
    long_text: 'Regardez attentivement le visage de Mona Lisa : elle n a ni sourcils ni cils. Longtemps attribué à une mode de la Renaissance, une découverte scientifique a tout bouleversé.\n\nEn 2007, l ingénieur français Pascal Cotte a analysé le tableau avec un scanner multispectral de 240 mégapixels. Révélation stupéfiante : Léonard de Vinci avait initialement peint des sourcils et des cils ultra-fins ! Au fil de 500 ans de nettoyages successifs et d oxydation des vernis par des restaurateurs du passé, ces pigments délicats ont été dissous. Son regard énigmatique actuel est en réalité un fascinant accident de l Histoire de l art.',
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
    short_text: 'Van Gogh a peint "La Nuit Étoilée" depuis la fenêtre de son asile',
    long_text: 'Enfermée au monastère Saint-Paul-de-Mausole en 1889 à Saint-Rémy-de-Provence, Van Gogh a peint cette œuvre mythique juste avant l aube.\n\nPrivé de sortie nocturne, l artiste a recomposé la vue de mémoire en y ajoutant le clocher typique de son village d enfance aux Pays-Bas. Le cyprès au premier plan, traditionnellement planté dans les cimetières méditerranéens, symbolise le deuil et le pont entre la Terre et l infinité des étoiles. Les tourbillons célestes correspondent étrangement aux équations de turbulence mathématique formulées par Kolmogorov 50 ans plus tard !',
    image_url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1080&q=80',
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
    short_text: 'Le premier programmeur de l Histoire était une femme : Ada Lovelace',
    long_text: 'Dès 1843, Ada Lovelace conçoit le tout premier algorithme au monde destiné à être exécuté par une machine mécanique.\n\nFille du poète Lord Byron, passionnée de mathématiques, elle a collaboré avec Charles Babbage sur la Machine Analytique. Dans ses notes célèbres, elle a décrit comment calculer les nombres de Bernoulli avec des cartes perforées. Surtout, elle a été la première visionnaire à prédire que les calculateurs manipuleraient un jour bien plus que des chiffres : des notes de musique, du texte et des images.',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80',
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
    short_text: 'L allégorie de la Caverne de Platon illustre notre illusion du réel',
    long_text: 'Des prisonniers enchaînés dans une caverne depuis leur enfance ne voient que des ombres projetées sur le mur et les prennent pour l unique réalité.\n\nPlaton explique que la condition humaine ordinaire ressemble à ces captifs : nous confondons les apparences matérielles avec la vérité. Si un prisonnier est libéré et sort à la lumière éblouissante du Soleil (la Vérité intelligible), ses yeux souffrent avant de contempler la vraie nature des choses. Le devoir suprême du philosophe est de retourner dans la caverne pour aider les autres, même au risque d être moqué ou rejeté.',
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&q=80',
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

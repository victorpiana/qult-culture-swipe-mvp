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
    id: '212e4a8f-a930-4aa9-8bcf-5f7839dd84ec',
    theme_id: 't_histoire',
    short_text: 'Cléopâtre a vécu plus près de l iPhone que des Pyramides',
    long_text: 'Lorsque nous pensons à l Égypte antique, nous associons spontanément les grandes pyramides de Gizeh et la reine Cléopâtre comme appartenant au même monde. Pourtant, Cléopâtre est chronologiquement plus proche de nos smartphones que du pharaon Khéops !\n\nLa Grande Pyramide de Khéops a été achevée vers 2560 avant J.-C. De son côté, Cléopâtre VII Philopator, dernière souveraine lagide d Égypte, est née en 69 avant J.-C. et s est éteinte en 30 avant J.-C. Il s est donc écoulé 2 530 ans entre l érection de la pyramide et le règne de Cléopâtre.\n\nEn revanche, entre la mort de Cléopâtre et la présentation du tout premier iPhone par Steve Jobs en janvier 2007, il ne s est écoulé que 2 037 ans — soit près de cinq siècles de moins !\n\n💡 Le saviez-vous ? À l époque même où vivait Cléopâtre, des historiens et archéologues égyptiens étudiaient déjà les pyramides de Gizeh comme des vestiges mystérieux d une antiquité immémoriale !',
    image_url: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1080&q=80',
    importance_level: 5,
    themes: {
      id: 't_histoire',
      name: 'Histoire',
      categories: { name: 'Savoir', color: '#f59e0b' }
    }
  },
  {
    id: '077b77d7-a30f-452b-a8d9-d619ecc7ed51',
    theme_id: 't_histoire',
    short_text: 'Les Samouraïs et le Fax ont coexisté pendant 24 ans',
    long_text: 'Notre cerveau sépare l Histoire en tiroirs hermétiques : d un côté les samouraïs féodaux au sabre, de l autre la bureautique moderne des années 1980. Pourtant, le télécopieur (fax) a été inventé alors que les samouraïs régnaient encore sur le Japon !\n\nC est en mai 1843 que l horloger et inventeur écossais Alexander Bain dépose le brevet du tout premier « télégraphe d impression chimique », capable de reproduire des écritures et des images à distance via des pendules synchronisés et des fils télégraphiques.\n\nAu même moment, le Japon vivait toujours sous le shogunat féodal Tokugawa, où les samouraïs formaient l élite militaire officielle. La caste des samouraïs n a été abolie qu en 1867 avec l avènement de l ère Meiji.\n\n💡 Le saviez-vous ? En 1863, une ambassade de samouraïs japonais en armure et katanas a même posé en photo officielle devant le Sphinx et les Pyramides d Égypte lors d une mission diplomatique vers l Europe !',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1080&q=80',
    importance_level: 4,
    themes: {
      id: 't_histoire',
      name: 'Histoire',
      categories: { name: 'Savoir', color: '#f59e0b' }
    }
  },
  {
    id: '40e367ce-7b2d-4dde-a9d7-525c1927866d',
    theme_id: 't_science',
    short_text: 'Le Miel : Le seul aliment sur Terre qui ne périme jamais',
    long_text: 'Des archéologues ont découvert dans des tombeaux égyptiens vieux de plus de 3 300 ans des jarres de miel scellées encore parfaitement intactes et comestibles. Contrairement à tous les autres aliments naturels, le miel échappe totalement à la putréfaction.\n\nCe prodige repose sur une alchimie biologique fascinante. Premièrement, le miel est hygroscopique : il ne contient qu environ 17 % d eau, ce qui déshydrate et asphyxie instantanément les bactéries ou champignons par osmose. Deuxièmement, son pH très acide (entre 3,2 et 4,5) empêche toute prolifération microbienne.\n\nEn prime, lors de la fabrication du nectar, les abeilles régurgitent une enzyme spécifique appelée glucose oxydase qui libère en permanence d infimes quantités de peroxyde d hydrogène antiseptique.\n\n💡 Le saviez-vous ? Dans l Antiquité, les Égyptiens et les Babyloniens utilisaient le miel non seulement sur les plaies de guerre comme antibiotique, mais aussi pour embaumer les corps des grands souverains, dont Alexandre le Grand !',
    image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1080&q=80',
    importance_level: 5,
    themes: {
      id: 't_science',
      name: 'Science',
      categories: { name: 'Savoir', color: '#38bdf8' }
    }
  },
  {
    id: 'e9ad2831-cc90-4879-a3c6-b93779e7fa7c',
    theme_id: 't_science',
    short_text: 'Sur Jupiter et Saturne, il pleut des tonnes de diamants',
    long_text: 'Sur Terre, les nuages déversent de l eau liquide. Mais sur les géantes gazeuses Saturne et Jupiter, la météorologie planétaire transforme le ciel en une véritable mine de pierres précieuses : il y pleut plus de 1 000 tonnes de diamants par an.\n\nDans la haute atmosphère de ces planètes, des tempêtes titanesques produisent des éclairs 10 000 fois plus puissants que sur Terre. Ces décharges électriques brisent les molécules de méthane (CH4) et libèrent d immenses nuages de suie de carbone pur.\n\nEn s enfonçant sur des milliers de kilomètres vers l intérieur de la planète, cette suie subit une pression atmosphérique écrasante et cristallise en diamants solides étincelants.\n\n💡 Le saviez-vous ? À plus de 30 000 km de profondeur, la température dépasse 8 000 °C : ces grêlons de diamant finissent par fondre pour former un océan souterrain de diamant liquide !',
    image_url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1080&q=80',
    importance_level: 4,
    themes: {
      id: 't_science',
      name: 'Science',
      categories: { name: 'Savoir', color: '#38bdf8' }
    }
  },
  {
    id: '74f5b1dd-0c98-4120-bc3c-cdb08810a8f5',
    theme_id: 't_art',
    short_text: 'La Joconde : Le vrai mystère de ses sourcils disparus',
    long_text: 'Si vous observez de près le visage de Mona Lisa au musée du Louvre, un détail frappant saute aux yeux : elle ne possède ni sourcils ni cils visibles. Pendant des décennies, les historiens ont cru à une mode esthétique des femmes nobles de la Renaissance florentine.\n\nEn 2007, l ingénieur français Pascal Cotte a bouleversé cette théorie après 3 000 heures d analyse grâce à une caméra multispectrale de 240 mégapixels utilisant 13 longueurs d onde lumineuses.\n\nEn décomposant virtuellement les couches de vernis, il a découvert la trace indéniable d un coup de pinceau ultra-fin au-dessus de l œil gauche : Léonard de Vinci avait bel et bien peint des sourcils et des cils ! Ceux-ci ont été accidentellement dissous au fil de 500 ans de nettoyages chimiques.\n\n💡 Le saviez-vous ? Le scanner a aussi révélé que les doigts de la main droite de Mona Lisa tenaient initialement une couverture sur ses genoux, dont les pigments se sont totalement estompés avec les siècles.',
    image_url: 'https://images.unsplash.com/photo-1577720643272-265f09367456?w=1080&q=80',
    importance_level: 5,
    themes: {
      id: 't_art',
      name: 'Art',
      categories: { name: 'Savoir', color: '#ec4899' }
    }
  },
  {
    id: '9d9a5139-2008-4f4a-b65f-782e190f2733',
    theme_id: 't_art',
    short_text: 'Van Gogh n a vendu qu une seule toile de son vivant',
    long_text: 'Aujourd hui, le moindre tableau de Vincent van Gogh s arrache à plus de 100 millions d euros dans les ventes aux enchères. Pourtant, le maître néerlandais a vécu dans la misère et l incompréhension, ne vendant officiellement qu une unique peinture avant sa mort.\n\nEn seulement dix ans de carrière frénétique, Van Gogh a produit près de 900 toiles et plus de 1 100 dessins. Malgré le soutien financier et moral incessant de son frère cadet Théo, les critiques de l époque jugeaient son coup de pinceau trop brutal.\n\nLa seule toile vendue de son vivant avec certitude est La Vigne rouge à Montmajour, achetée en février 1890 à Bruxelles par l artiste belge Anna Boch pour 400 francs.\n\n💡 Le saviez-vous ? C est Johanna van Gogh-Bonger, la jeune veuve de son frère Théo, qui a consacré sa vie à publier la correspondance des deux frères et à organiser plus de 100 expositions qui ont fait de Van Gogh une légende mondiale.',
    image_url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1080&q=80',
    importance_level: 4,
    themes: {
      id: 't_art',
      name: 'Art',
      categories: { name: 'Savoir', color: '#ec4899' }
    }
  },
  {
    id: 'e208f3d3-2db3-4e54-ae4c-589d1a0f7666',
    theme_id: 't_tech',
    short_text: 'Le premier « Bug » informatique était un vrai papillon de nuit',
    long_text: 'Aujourd hui, le mot « bug » désigne la moindre erreur de code dans une application ou un jeu vidéo. Mais le 9 septembre 1947 à 15h45, les ingénieurs de l université Harvard ont littéralement sorti un insecte mort des entrailles de leur ordinateur.\n\nL équipe dirigée par la mathématicienne et pionnière de l informatique Grace Hopper travaillait sur le Harvard Mark II, un colosse électromécanique de 23 tonnes occupant une salle entière.\n\nEn cherchant pourquoi un calcul trigonométrique renvoyait des résultats faux, un opérateur a inspecté le relais n° 70 du panneau F : une grosse mite attirée par la chaleur s était fait électrocuter entre les contacts métalliques.\n\n💡 Le saviez-vous ? Pour réparer la machine en retirant l insecte, l équipe a parlé de « déboguer » (debugging) l ordinateur, popularisant à jamais ce terme dans le vocabulaire mondial de la tech !',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80',
    importance_level: 5,
    themes: {
      id: 't_tech',
      name: 'Tech',
      categories: { name: 'Savoir', color: '#4ade80' }
    }
  },
  {
    id: 'c424f1fe-81f7-480a-b987-54b50c3efd52',
    theme_id: 't_nature',
    short_text: 'La Pieuvre possède 3 Cœurs, 9 Cerveaux et du Sang bleu',
    long_text: 'Avec sa biologie hors norme, la pieuvre est souvent comparée à ce qui se rapproche le plus d une intelligence extraterrestre sur Terre. Son système circulatoire et nerveux ne ressemble à aucun vertébré terrestre.\n\nPour survivre dans les profondeurs froides et pauvres en oxygène, son sang n utilise pas l hémoglobine à base de fer, mais l hémocyanine, une protéine riche en cuivre qui donne à son sang une teinte bleu cobalt électrique.\n\nCe sang bleu est propulsé par trois cœurs distincts : deux cœurs branchiaux pompent le sang vers les branchies, tandis qu un cœur systémique central l envoie au reste du corps.\n\n💡 Le saviez-vous ? Lorsque la pieuvre nage à grande vitesse par propulsion, son cœur principal s arrête complètement de battre, ce qui l épuise vite et explique pourquoi elle préfère marcher au fond de l eau.',
    image_url: 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=1080&q=80',
    importance_level: 5,
    themes: {
      id: 't_nature',
      name: 'Nature',
      categories: { name: 'Insolite', color: '#10b981' }
    }
  }
];

export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    card_id: '212e4a8f-a930-4aa9-8bcf-5f7839dd84ec',
    question: 'De quel événement historique Cléopâtre est-elle chronologiquement la plus proche ?',
    option_a: 'La construction des Pyramides',
    option_b: 'La sortie du premier iPhone',
    option_c: 'L extinction des Dinosaures',
    option_d: 'La Guerre de Troie',
    correct_option: 'B',
    explanation: 'La Grande Pyramide date de 2560 av. J.-C. (2 530 ans avant Cléopâtre), alors que l iPhone (2007) n est séparé du règne de Cléopâtre que de 2 037 ans !',
    cards: MOCK_CARDS[0]
  },
  {
    id: 'q2',
    card_id: '077b77d7-a30f-452b-a8d9-d619ecc7ed51',
    question: 'Quelle technologie de bureau les Samouraïs ont-ils pu connaître de leur vivant ?',
    option_a: 'Internet',
    option_b: 'La Télévision couleur',
    option_c: 'Le Fax (Télécopieur)',
    option_d: 'Le Téléphone portable',
    correct_option: 'C',
    explanation: 'Alexander Bain a breveté le premier télécopieur électrique en 1843, tandis que la caste des samouraïs n a été abolie qu en 1867 au Japon.',
    cards: MOCK_CARDS[1]
  },
  {
    id: 'q3',
    card_id: '74f5b1dd-0c98-4120-bc3c-cdb08810a8f5',
    question: 'Quel détail manque à l œil nu sur le visage de La Joconde ?',
    option_a: 'Ses cils et ses sourcils',
    option_b: 'Le lobe de son oreille',
    option_c: 'Ses narines',
    option_d: 'Son menton',
    correct_option: 'A',
    explanation: 'En 2007, un scanner de 240 mégapixels a prouvé que De Vinci avait peint des sourcils très fins, mais qu ils ont été effacés par les nettoyages anciens.',
    cards: MOCK_CARDS[4]
  },
  {
    id: 'q4',
    card_id: 'e208f3d3-2db3-4e54-ae4c-589d1a0f7666',
    question: 'Quelle est l origine réelle du mot « Bug » en informatique ?',
    option_a: 'Une panne électrique à la NASA',
    option_b: 'Un vrai papillon de nuit coincé dans un relais',
    option_c: 'Le nom d un virus russe',
    option_d: 'Une faute de frappe d Alan Turing',
    correct_option: 'B',
    explanation: 'En 1947, l équipe de Grace Hopper a trouvé une vraie mite coincée dans un relais du calculateur Harvard Mark II et l a scotchée dans le registre.',
    cards: MOCK_CARDS[6]
  },
  {
    id: 'q5',
    card_id: 'c424f1fe-81f7-480a-b987-54b50c3efd52',
    question: 'Combien de cœurs possède une pieuvre pour propulser son sang bleu ?',
    option_a: '1 seul cœur géant',
    option_b: '2 cœurs',
    option_c: '3 cœurs distincts',
    option_d: '8 cœurs (un par tentacule)',
    correct_option: 'C',
    explanation: 'Deux cœurs pompent son sang bleu (riche en cuivre) vers ses branchies, et un troisième cœur central l envoie dans le reste du corps.',
    cards: MOCK_CARDS[7]
  }
];

export const MOCK_LEADERBOARD = [
  { user_pseudo: 'SuperSophie', score: 5, streak: 8, finished_at: new Date(Date.now() - 1800000).toISOString() },
  { user_pseudo: 'Alexandre_Dev', score: 4, streak: 5, finished_at: new Date(Date.now() - 3600000).toISOString() },
  { user_pseudo: 'Camille_Astro', score: 4, streak: 3, finished_at: new Date(Date.now() - 7200000).toISOString() },
  { user_pseudo: 'Titou', score: 3, streak: 2, finished_at: new Date(Date.now() - 10800000).toISOString() }
];

export const MOCK_FRIENDS = [
  { following_pseudo: 'SuperSophie', avatar: '👩‍🎨', bio: 'Curieuse insatiable • Art & Histoire' },
  { following_pseudo: 'Alexandre_Dev', avatar: '💻', bio: 'Passionné Tech & Cybersécurité' },
  { following_pseudo: 'Camille_Astro', avatar: '🔭', bio: 'La tête dans les étoiles ✨' },
  { following_pseudo: 'Titou', avatar: '🌿', bio: 'Nature & Anecdotes insolites' }
];

export const MOCK_MESSAGES: Record<string, Array<{ id: string; sender_pseudo: string; content?: string; shared_card_id?: string; cards?: CardItem; created_at: string }>> = {
  'SuperSophie': [
    {
      id: 'm1',
      sender_pseudo: 'SuperSophie',
      content: 'Salut Victor ! Tu as vu cette anecdote sur Cléopâtre et l iPhone ? C est fou 🤯',
      shared_card_id: '212e4a8f-a930-4aa9-8bcf-5f7839dd84ec',
      cards: MOCK_CARDS[0],
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'm2',
      sender_pseudo: 'Victor',
      content: 'Grave ! Et regarde celle sur la Joconde et le scanner 240 mégapixels 🔥',
      shared_card_id: '74f5b1dd-0c98-4120-bc3c-cdb08810a8f5',
      cards: MOCK_CARDS[4],
      created_at: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  'Alexandre_Dev': [
    {
      id: 'm3',
      sender_pseudo: 'Alexandre_Dev',
      content: 'Le premier bug informatique qui était un vrai papillon de nuit, un classique ! 💻',
      shared_card_id: 'e208f3d3-2db3-4e54-ae4c-589d1a0f7666',
      cards: MOCK_CARDS[6],
      created_at: new Date(Date.now() - 5400000).toISOString()
    }
  ],
  'Camille_Astro': [
    {
      id: 'm4',
      sender_pseudo: 'Camille_Astro',
      content: 'Il pleut littéralement des tonnes de diamants sur Saturne, on part quand ? ✨🪐',
      shared_card_id: 'e9ad2831-cc90-4879-a3c6-b93779e7fa7c',
      cards: MOCK_CARDS[3],
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ],
  'Titou': [
    {
      id: 'm5',
      sender_pseudo: 'Titou',
      content: 'La pieuvre a 3 cœurs et 9 cerveaux, c est clairement un alien 🐙',
      shared_card_id: 'c424f1fe-81f7-480a-b987-54b50c3efd52',
      cards: MOCK_CARDS[7],
      created_at: new Date(Date.now() - 9000000).toISOString()
    }
  ]
};

-- ========================================================
-- QULT DATABASE INITIALIZATION SCHEMA & SEED DATA
-- Copiez et collez ce script dans l'éditeur SQL de Supabase (SQL Editor)
-- puis cliquez sur "RUN".
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SUPPRESSION PROPRE SI EXISTANTS (POUR POUVOIR RE-EXÉCUTER SANS ERREUR)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS user_quiz_history CASCADE;
DROP TABLE IF EXISTS user_card_interactions CASCADE;
DROP TABLE IF EXISTS public_users CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS themes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 3. TABLES DE BASE

-- Catégories de Savoir
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT 'sparkles',
  color TEXT DEFAULT '#4ade80',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Thèmes par catégorie
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fiches de Savoir (Feed de Cartes)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
  short_text TEXT NOT NULL,
  long_text TEXT NOT NULL,
  image_url TEXT NOT NULL,
  importance_level INT DEFAULT 1,
  author_pseudo TEXT DEFAULT 'Qult Staff',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Questions du Quiz Quotidien
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Utilisateurs publics (profils)
CREATE TABLE public_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT 'Explorateur de savoirs sur QULT ⚡️',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historique des Quiz des utilisateurs
CREATE TABLE user_quiz_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pseudo TEXT NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 5),
  quiz_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Relations d'abonnements / amis
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_pseudo TEXT NOT NULL,
  following_pseudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_pseudo, following_pseudo)
);

-- Messagerie instantanée & partage de fiches
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_pseudo TEXT NOT NULL,
  receiver_pseudo TEXT NOT NULL,
  content TEXT,
  shared_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Interactions utilisateurs (Like, Je connais déjà, À revoir / Répétition espacée)
CREATE TABLE user_card_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pseudo TEXT NOT NULL,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  liked BOOLEAN DEFAULT false,
  memorized BOOLEAN DEFAULT false,
  review_later BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_pseudo, card_id)
);

-- 4. POLITIQUES DE SÉCURITÉ (RLS) - Permisives pour un fonctionnement instantané
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Read Themes" ON themes FOR SELECT USING (true);
CREATE POLICY "Public Read Cards" ON cards FOR SELECT USING (true);
CREATE POLICY "Public Read Quiz Questions" ON quiz_questions FOR SELECT USING (true);

CREATE POLICY "Public Access Users" ON public_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Quiz History" ON user_quiz_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Follows" ON follows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Card Interactions" ON user_card_interactions FOR ALL USING (true) WITH CHECK (true);

-- 5. DONNÉES DE DÉPART (SEEDS)

-- Catégories
INSERT INTO categories (id, name, icon, color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Histoire', 'hourglass', '#f39c12'),
  ('22222222-2222-2222-2222-222222222222', 'Sciences', 'planet', '#3498db'),
  ('33333333-3333-3333-3333-333333333333', 'Arts & Culture', 'color-palette', '#e74c3c'),
  ('44444444-4444-4444-4444-444444444444', 'Philosophie', 'library', '#9b59b6'),
  ('55555555-5555-5555-5555-555555555555', 'Technologie', 'hardware-chip', '#4ade80');

-- Thèmes
INSERT INTO themes (id, category_id, name, description) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Antiquité & Empires', 'Les grands empires qui ont façonné le monde civilisé.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Grandes Révolutions', 'Les tournants historiques majeurs.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Astrophysique', 'Les secrets du cosmos et de l univers.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Biologie & Génétique', 'La machinerie du vivant.'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Chefs-d œuvre de la Peinture', 'Les tableaux les plus célèbres et leurs mystères.'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'Grands Courants', 'Les idées qui ont transformé notre perception du monde.'),
  ('10101010-1010-1010-1010-101010101010', '55555555-5555-5555-5555-555555555555', 'Pionniers de l Informatique', 'L histoire des machines pensantes.');

-- Fiches de Savoir (Cards)
INSERT INTO cards (id, theme_id, short_text, long_text, image_url, importance_level) VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'La Grande Pyramide de Gizeh était à l origine blanche et étincelante.',
    'Construite vers 2560 av. J.-C. pour le pharaon Khéops, la Grande Pyramide était recouverte d un parement de calcaire blanc de Tourah poli à l extrême. Sous le soleil du désert, elle reflétait la lumière comme un miroir géant et était visible à des dizaines de kilomètres. La plupart de ces pierres ont été pillées au fil des siècles pour construire la ville du Caire après un séisme en 1303.',
    'https://images.unsplash.com/photo-1503177112275-018483d98be1?w=800&q=80',
    5
  ),
  (
    'c1111111-1111-1111-1111-111111111112',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Jules César a été enlevé par des pirates... et a exigé qu ils doublent sa rançon.',
    'En 75 av. J.-C., des pirates ciliciens capturent le jeune Jules César et réclament 20 talents d or. César éclate de rire, estimant qu ils ignorent qui il est, et insiste pour qu ils demandent 50 talents. Pendant sa captivité, il les traite comme ses subordonnés. Une fois libéré après le paiement, il lève une flotte, les capture tous et les fait crucifier, comme il le leur avait promis en plaisantant.',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
    4
  ),
  (
    'c2222222-2222-2222-2222-222222222221',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Le temps s écoule plus lentement près d un trou noir (dilatation temporelle).',
    'D après la relativité générale d Einstein, la gravitation courbe l espace-temps. Plus le champ gravitationnel est puissant, plus le temps ralentit par rapport à un observateur lointain. À proximité immédiate de l horizon des événements d un trou noir supermassif, une heure pour vous pourrait équivaloir à plusieurs décennies sur Terre.',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    5
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Toutes les étoiles que nous voyons la nuit font partie de la Voie Lactée.',
    'À l œil nu, chaque étoile visible dans le ciel nocturne appartient exclusivement à notre galaxie, la Voie Lactée. Le seul objet céleste lointain visible sans télescope est la galaxie d Andromède, située à 2,5 millions d années-lumière, qui apparaît comme une petite tache brumeuse.',
    'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800&q=80',
    4
  ),
  (
    'c3333333-3333-3333-3333-333333333331',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'La Joconde n a pas de sourcils ni de cils visibles.',
    'En observant de très près le chef-d œuvre de Léonard de Vinci, Mona Lisa semble dépourvue de sourcils. Une analyse ultra-haute résolution par l ingénieur Pascal Cotte a révélé que De Vinci avait initialement peint des cils et sourcils délicats, mais qu ils se sont estompés ou ont été effacés lors de nettoyages anciens aux XVIIe et XVIIIe siècles.',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80',
    5
  ),
  (
    'c3333333-3333-3333-3333-333333333332',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Van Gogh a peint "La Nuit Étoilée" depuis la fenêtre de son asile psychiatrique.',
    'Vincent van Gogh a créé sa toile la plus emblématique en juin 1889, alors qu il résidait au monastère Saint-Paul-de-Mausole à Saint-Rémy-de-Provence. Il a peint la vue de sa chambre juste avant le lever du soleil, en y intégrant un village imaginaire issu de ses souvenirs d enfance aux Pays-Bas.',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80',
    4
  ),
  (
    'c4444444-4444-4444-4444-444444444441',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'L allégorie de la Caverne de Platon illustre notre illusion du réel.',
    'Dans La République, Platon imagine des prisonniers enchaînés dans une caverne sombre depuis leur enfance. Ils ne voient que des ombres projetées sur le mur et croient que ces ombres constituent la réalité entière. Le philosophe est celui qui se libère, sort de la caverne, affronte l éblouissement du Soleil (la Vérité) et revient éveiller ses semblables.',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
    5
  ),
  (
    'c5555555-5555-5555-5555-555555555551',
    '10101010-1010-1010-1010-101010101010',
    'Le premier programmeur de l Histoire était une femme : Ada Lovelace.',
    'Fille du poète Lord Byron, Ada Lovelace a conçu en 1843 le tout premier algorithme destiné à être exécuté par une machine : la machine analytique de Charles Babbage. Elle a été la première à réaliser qu un ordinateur pouvait manipuler autre chose que de simples chiffres, prédisant la musique et les graphismes numériques.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    5
  );

-- Questions de Quiz associées
INSERT INTO quiz_questions (id, card_id, question, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES
  (
    'q1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'De quelle couleur était initialement la Grande Pyramide de Gizeh ?',
    'Or massif',
    'Blanc poli étincelant',
    'Rouge ocre',
    'Noir obsidienne',
    'B',
    'La Grande Pyramide était recouverte d un calcaire blanc de Tourah poli reflétant la lumière du soleil.'
  ),
  (
    'q2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222221',
    'Quel phénomène se produit pour le temps à proximité d un trou noir ?',
    'Il s accélère',
    'Il s inverse',
    'Il ralentit (dilatation temporelle)',
    'Il s arrête pour toujours',
    'C',
    'La très forte gravité courbe l espace-temps et fait ralentir le cours du temps par rapport à un observateur distant.'
  ),
  (
    'q3333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333331',
    'Quel détail physique manque-t-il sur le visage de La Joconde ?',
    'Ses sourcils et ses cils',
    'Son nez',
    'Le lobe de son oreille gauche',
    'Ses fossettes',
    'A',
    'Mona Lisa ne présente aucun cil ni sourcil visible, effacés avec le temps lors d anciens nettoyages.'
  ),
  (
    'q4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555551',
    'Qui est considéré(e) comme le tout premier programmeur de l Histoire ?',
    'Alan Turing',
    'Ada Lovelace',
    'Grace Hopper',
    'Charles Babbage',
    'B',
    'Ada Lovelace a rédigé en 1843 le premier algorithme destiné à être exécuté par la machine analytique.'
  ),
  (
    'q5555555-5555-5555-5555-555555555555',
    'c1111111-1111-1111-1111-111111111112',
    'Quelle a été la réaction de Jules César face à la rançon demandée par ses ravisseurs pirates ?',
    'Il a supplié de baisser le prix',
    'Il a simulé sa mort',
    'Il a exigé qu ils doublent le montant',
    'Il s est évadé à la nage',
    'C',
    'Jules César a jugé les 20 talents offensants et leur a ordonné de demander 50 talents d or !'
  );

-- Utilisateurs initiaux (amis et communauté pour le Cercle & Classement)
INSERT INTO public_users (pseudo, bio) VALUES
  ('Victor', 'Créateur de QULT 🚀 Passionné d histoire et tech'),
  ('Sophie_Culture', 'Curieuse insatiable 📚 Top 10 Quiz'),
  ('Alexandre_Dev', 'Ingénieur & amateur de philosophie stoïcienne 🏛️'),
  ('Camille_Astro', 'La tête dans les étoiles ✨ astrophysicienne');

-- Historique de quiz pour créer un classement vivant
INSERT INTO user_quiz_history (user_pseudo, score, quiz_date) VALUES
  ('Sophie_Culture', 5, CURRENT_DATE),
  ('Alexandre_Dev', 4, CURRENT_DATE),
  ('Camille_Astro', 3, CURRENT_DATE);

-- Relations d amis pré-configurées pour Victor
INSERT INTO follows (follower_pseudo, following_pseudo, status) VALUES
  ('Victor', 'Sophie_Culture', 'accepted'),
  ('Victor', 'Alexandre_Dev', 'accepted'),
  ('Camille_Astro', 'Victor', 'pending');

-- Messages pré-remplis dans le chat
INSERT INTO messages (sender_pseudo, receiver_pseudo, content, shared_card_id) VALUES
  ('Sophie_Culture', 'Victor', 'Salut Victor ! Tu as vu la carte sur la Pyramide de Gizeh ? Hallucinant ! 🔥', 'c1111111-1111-1111-1111-111111111111'),
  ('Victor', 'Sophie_Culture', 'Oui c est ouf ! Le calcaire blanc devait être incroyable sous le soleil !', NULL);

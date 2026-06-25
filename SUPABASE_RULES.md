# Architecture officielle CTC PVO

## Projet Supabase officiel

Project ID :
ynfauyxrjmhlpalymlxf

URL :
https://ynfauyxrjmhlpalymlxf.supabase.co

## Fichiers interdits à modifier

.env

supabase/config.toml

src/integrations/supabase/client.ts

## Sources de vérité

Connexion joueuses
→ table joueuses

Flammes actuelles
→ joueuses.flamme_actuelle

Record flammes
→ joueuses.record_flamme

Étoiles
→ table etoiles_joueuses

Classement étoiles
→ somme de etoiles_joueuses.etoiles par joueuse

Missions
→ table missions

Inscriptions missions
→ table missions_inscriptions

Messages coach
→ table coach_messages

Likes coach
→ table coach_message_likes

Réponses coach
→ table coach_message_replies

## Règles

Ne jamais créer une nouvelle table pour remplacer une table existante.

Ne jamais créer une nouvelle colonne pour remplacer une colonne existante.

Avant toute modification, vérifier les relations déjà existantes.

Toute nouvelle fonctionnalité doit utiliser les tables existantes.

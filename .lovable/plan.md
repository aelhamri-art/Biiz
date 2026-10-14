# BIIZ Sales — schéma prospects et import CSV (inspection seule, aucune modification)

Il n'y a pas de table séparée « lead » ni « opportunité ». Un prospect = une ligne `sales_accounts`. Son étape dans le pipeline (`stage`) et le montant facultatif (`amount`) jouent le rôle d'opportunité. Il n'y a pas de table `sales_deals`.

## sales_accounts (prospect + opportunité)
| Champ | Type | Obligatoire | Valeurs / règles |
|---|---|---|---|
| id | uuid | auto | gen_random_uuid() |
| workspace_id | uuid | oui | FK workspaces (espace app='sales'), RLS is_member |
| name | text | **oui** | 1 à 160 caractères |
| phone | text | non | libre ; normalisé pour l'anti-doublon |
| website | text | non | |
| city | text | non | |
| segment | text | non | libre |
| priority | text | non | P0, P1, P2, P3 |
| owner_id | uuid | non | membre responsable |
| source | text | non | « import CSV » par défaut à l'import |
| evidence | text | oui (défaut public) | public, humain, confirme |
| stage | text | oui (défaut lead) | lead, contacte, qualifie, r2_pris, r2_tenu, proposition, gagne, perdu |
| amount | numeric | non | ≥ 0 |
| notes | text | non | |
| last_activity_at | timestamptz | auto | mis à jour par sales_log_call |
| external_ref | text | non | prévu pour l'import futur « agent axium » |
| created_by / created_at / updated_at | uuid / timestamptz | auto | |

## Tables liées (toutes FK account_id → sales_accounts, ON DELETE CASCADE)
- **sales_contacts** : name (oblig.), role, phone, email, is_decision_maker (bool, défaut false).
- **sales_next_actions** : label (oblig.), next_action_date date (oblig.), assignee_id, done_at.
- **sales_activities** (ajout uniquement) : outcome ∈ repondu, pas_repondu, decideur_absent, refus, r2 ; note ≤ 1000 caractères.
- **sales_stage_history** (ajout uniquement) : from_stage, to_stage, alimentée automatiquement.

## Import CSV existant (onglet Prospects)
- Séparateur `,` ou `;` (détecté sur la 1re ligne), guillemets acceptés, 1re ligne = en-têtes.
- En-têtes reconnus (accents et casse ignorés) :
  - name : `nom`, `name`, `restaurant` — **obligatoire** (le fichier est refusé sans cette colonne, les lignes sans nom sont ignorées)
  - phone : `telephone`, `tel`, `phone`
  - city : `ville`, `city`
  - website : `site`, `website`
  - segment, priority (`priorite`), source
- Les autres colonnes sont ignorées. Les cellules sont coupées à 300 caractères. Une priorité hors P0–P3 est ignorée.
- Ce que l'import ne remplit pas : stage (toujours lead), evidence (toujours public), owner, amount, notes, external_ref, contacts, actions.
- Anti-doublon : même nom normalisé, ou même téléphone (9 chiffres ou plus, +33 ramené à 0), comparé à la base et à l'intérieur du fichier.

## Gabarit CSV minimal compatible
```text
nom;telephone;ville;site;segment;priorite;source
Chez Ali;0611223344;La Teste-de-Buch;https://exemple.fr;Pizzeria;P1;Liste Livroum
```

## Sans rien modifier
Rien n'a été changé. Évolution possible plus tard, sur demande uniquement : accepter aussi `stage`, `evidence`, `notes` et `external_ref` dans le CSV (le schéma les supporte déjà, le lecteur CSV ne les lit pas).

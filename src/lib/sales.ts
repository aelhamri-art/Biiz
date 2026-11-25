import type { Tables } from "@/integrations/supabase/types";

export type Account = Tables<"sales_accounts">;
export type Activity = Tables<"sales_activities">;
export type NextAction = Tables<"sales_next_actions">;
export type StageEvent = Tables<"sales_stage_history">;
export type CoachCard = Pick<Tables<"sales_coach_cards">, "slug" | "title" | "advice" | "next_question" | "goal" | "listen" | "position"> & { id?: string; version?: number };

export const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "contacte", label: "Contacté" },
  { id: "qualifie", label: "Qualifié" },
  { id: "r2_pris", label: "R2 pris" },
  { id: "r2_tenu", label: "R2 tenu" },
  { id: "proposition", label: "Proposition" },
  { id: "gagne", label: "Gagné" },
  { id: "perdu", label: "Perdu" },
] as const;
export type StageId = (typeof STAGES)[number]["id"];
export const stageLabel = (s: string) => STAGES.find((x) => x.id === s)?.label ?? s;

export const OUTCOMES = [
  { id: "repondu", label: "Répondu" },
  { id: "pas_repondu", label: "Pas répondu" },
  { id: "decideur_absent", label: "Décideur absent" },
  { id: "refus", label: "Refus" },
  { id: "r2", label: "R2 obtenu" },
] as const;
export type OutcomeId = (typeof OUTCOMES)[number]["id"];
export const outcomeLabel = (o: string) => OUTCOMES.find((x) => x.id === o)?.label ?? o;
/** Une conversation utile = on a parlé à quelqu'un et obtenu une issue claire. */
export const isUsefulConversation = (o: string) => o === "repondu" || o === "r2" || o === "refus";

export const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export const EVIDENCE = [
  { id: "public", label: "Public", hint: "Trouvé en ligne, non vérifié" },
  { id: "humain", label: "Humain", hint: "Vu ou entendu par quelqu'un de l'équipe" },
  { id: "confirme", label: "Confirmé", hint: "Confirmé par le prospect" },
] as const;

/** Référentiel LIVROUM! SHOP (25/11/2026) : principes validés ; devis, assiettes et disponibilité restent conditionnels. */
export const PRICING = {
  tagline: "Votre marque. Vos clients. Votre canal. LIVROUM! livre.",
  offers: [
    { id: "widget", label: "Widget livraison", price: "59 €/mois", note: "Site marchand existant ; frais de mise en place et livraison à préciser après étude." },
    { id: "app", label: "App marchande dédiée", price: "59 €/mois", note: "Canal direct sous la marque du commerce ; mise en place à chiffrer." },
    { id: "starter", label: "MKPlace Starter", price: "0 €/mois + 8 %", note: "Commission sur une vente payée en retrait, jamais sur une simple réservation." },
    { id: "pro", label: "MKPlace Pro", price: "39 €/mois + 4 %", note: "Fonctions Pro à confirmer dans l'offre signée ; vente payée en retrait." }
  ],
  delivered: "Commande livrée : 1 € + 11 % côté marchand, EN REMPLACEMENT de la commission MKPlace 8 % / 4 % (non cumulées).",
  caution: "HT/TTC, assiette des commissions, mise en place, frais client B2C et éligibilité logistique à valider avant devis. Pilote V0 sans paiement en ligne. Aucun paiement, zone, délai ou frais de livraison ne doit être promis sans GO."
} as const;

export const STAGE_GOAL: Record<string, string> = {
  lead: "Joindre le décideur du commerce et comprendre la vente à distance actuelle.",
  contacte: "Qualifier : commandes, livraison existante, douleur, capacité boutique, décideur.",
  qualifie: "Obtenir un rendez-vous de 10 minutes ciblé sur le besoin reconnu.",
  r2_pris: "Confirmer le rendez-vous et le motif avec le décideur.",
  r2_tenu: "Faire étudier App, Widget ou MKPlace selon besoin et faisabilité.",
  proposition: "Répondre aux objections réelles ; obtenir une décision datée.",
  gagne: "Passer à l'activation uniquement après validation DG/produit.",
  perdu: "Documenter la raison et respecter l'opposition."
};

/** Socle multi-commerces SHOP et modules secteur optionnels. Les cartes d'équipe en base remplacent un slug existant. */
export const DEFAULT_PLAYBOOK: CoachCard[] = [
  {
    "slug": "ouverture",
    "title": "Ouverture · Permission et découverte",
    "advice": "Se présenter comme Kevin de LIVROUM! SHOP. Demander l'autorisation de poser une question concrète. Pas de promesse de CA ni de livraison immédiate. Une phrase courte, puis écouter.",
    "next_question": "Aujourd'hui, lorsqu'un client veut acheter chez vous sans se déplacer, comment ça se passe concrètement ?",
    "goal": "Comprendre le fonctionnement existant avant de présenter la plateforme.",
    "listen": "Site, téléphone, boutique, réseaux, marketplace, livraison, silence.",
    "position": 0
  },
  {
    "slug": "ouverture-fleuriste",
    "title": "Fleuriste · La bonne entrée",
    "advice": "Module sectoriel fleuriste uniquement : boutique de fleurs à Arcachon, La Teste-de-Buch ou Gujan-Mestras si la campagne le prévoit. Vérifier la fiche BIIZ, ne rien supposer sur les pertes de ventes. N'utiliser cette carte que pour les métiers de la fleur.",
    "next_question": "Quand un client commande un bouquet à distance, comment gérez-vous la commande puis la livraison ?",
    "goal": "Découvrir le circuit bouquet, paiement, préparation et remise.",
    "listen": "Commandes directes, Interflora/Sessile, jours d'affluence, zones, dates limites.",
    "position": 1
  },
  {
    "slug": "ouverture-site",
    "title": "Ouverture · Site de vente existant",
    "advice": "Vérifier avant l'appel l'existence d'un site et ses fonctionnalités. Un site n'est pas nécessairement transactionnel. Ne pas annoncer d'intégration Widget avant étude technique et zone.",
    "next_question": "Votre site permet-il au client de choisir un produit, de le payer en ligne et de demander une livraison locale ?",
    "goal": "Évaluer si le Widget répond à un besoin réel.",
    "listen": "Site vitrine ou e-commerce, paiement, panier, livraison, autonomie et limites.",
    "position": 2
  },
  {
    "slug": "ouverture-plateforme",
    "title": "Ouverture · Marketplace ou réseau déjà utilisé",
    "advice": "Un commerçant peut vendre via une plateforme existante. Ne pas la critiquer, ni présumer de sa marge ou d'une dépendance. Comprendre la part du canal direct et la liberté de décision.",
    "next_question": "En dehors des plateformes que vous utilisez, recevez-vous des commandes directement de vos clients ?",
    "goal": "Identifier si un canal propre ou une distribution supplémentaire serait utile.",
    "listen": "Canaux tiers, commandes directes, liberté de décision, satisfaction réelle.",
    "position": 3
  },
  {
    "slug": "pas-le-patron",
    "title": "« Le responsable n'est pas là »",
    "advice": "L'employé ne décide pas toujours. Ne pas faire un long pitch, ni demander de numéro personnel inutile. Noter le bon créneau et le rôle du décideur.",
    "next_question": "Qui s'occupe de vos commandes en ligne et des décisions sur la livraison ? Quel serait le bon moment pour lui parler ?",
    "goal": "Joindre la personne autorisée à décider.",
    "listen": "Nom/rôle professionnel, disponibilités, standard.",
    "position": 4
  },
  {
    "slug": "posture",
    "title": "Posture · Curiosité, calme, respect",
    "advice": "Ni récitation mécanique ni pression. Poser une question à la fois, reformuler avec les mots du commerçant, écouter et laisser une pause. Un refus clair met fin au contact.",
    "next_question": "Quel fait utile dois-je comprendre pendant cet appel ?",
    "goal": "Construire la confiance par l'écoute et l'exactitude.",
    "listen": "Réponses concrètes, rythme, intérêt ou absence d'intérêt.",
    "position": 5
  },
  {
    "slug": "decouverte",
    "title": "Découverte · Le parcours client",
    "advice": "Explorer en conversation : comment commande-t-on ? comment encaisse-t-on ? qui prépare ? comment livre-t-on ? où bloque-t-on ? Ne pas dérouler toutes les questions si la première suffit.",
    "next_question": "Quand vous recevez une commande à distance, quelle étape est la plus difficile aujourd'hui ?",
    "goal": "Faire formuler une difficulté ou reconnaître l'absence de problème.",
    "listen": "Perte de demande prouvée, temps, logistique, ruptures, coûts déclarés.",
    "position": 6
  },
  {
    "slug": "qualification",
    "title": "Qualification · Valeur et décision",
    "advice": "Qualification d'abord à partir de faits : motif d'achat, volume approximatif déclaré, capacité à gérer prix/stocks, décideur, zone. Ne pas assimiler un lead Outscraper à une opportunité validée.",
    "next_question": "Si l'on pouvait résoudre ce point, qu'est-ce qui serait concrètement différent pour votre boutique ?",
    "goal": "Établir impact et raison d'agir sans chiffres inventés.",
    "listen": "Motivation, timing, contraintes, autorité d'achat.",
    "position": 7
  },
  {
    "slug": "valeur",
    "title": "Valeur · Trois portes, un besoin",
    "advice": "LIVROUM! SHOP vise la vente en ligne et la livraison locale. Widget : livraison ajoutée à un canal existant ; App : canal dédié sous sa marque ; MKPlace : visibilité et nouveaux acheteurs. Le meilleur choix dépend du besoin, pas seulement de la présence d'un site.",
    "next_question": "Vous cherchez surtout à mieux livrer des commandes existantes, à vendre sous votre marque, ou à toucher de nouveaux acheteurs locaux ?",
    "goal": "Relier une offre pertinente au problème reconnu.",
    "listen": "Priorité business réelle, sans pousser trois offres simultanément.",
    "position": 8
  },
  {
    "slug": "script-widget",
    "title": "Pitch Widget · Livraison sur site",
    "advice": "« Vous conservez votre site et votre parcours de commande ; nous étudions l'ajout d'une livraison locale mutualisée. » Vérifier site, compatibilité, zone, préparation et fonctionnement avant toute promesse.",
    "next_question": "Sur votre site actuel, qu'est-ce qui bloque aujourd'hui la livraison locale des commandes ?",
    "goal": "Qualifier un besoin Widget et une étude de faisabilité.",
    "listen": "Plateforme e-commerce, checkout, volume, horaires, rayon souhaité.",
    "position": 9
  },
  {
    "slug": "script-app",
    "title": "Pitch App · Canal direct",
    "advice": "« L'idée est d'avoir un parcours de commande sous votre propre marque, pour vos clients. » Ne pas promettre une application sur mesure illimitée, une date de livraison ou une fonctionnalité non démontrée.",
    "next_question": "Si vos clients fidèles pouvaient commander directement auprès de votre boutique, qu'attendriez-vous de ce canal ?",
    "goal": "Qualifier l'intérêt d'un canal marchand dédié.",
    "listen": "Fréquence d'achat, catalogue, marque, gestion quotidienne.",
    "position": 10
  },
  {
    "slug": "script-mkplace",
    "title": "Pitch MKPlace · De nouveaux acheteurs",
    "advice": "« MKPlace permet de présenter vos produits aux habitants qui cherchent à acheter localement. » Vision : achat/paiement en ligne et livraison. En pilote V0, réservation sans paiement intégré : dire clairement le statut réel.",
    "next_question": "Est-ce que rencontrer de nouveaux acheteurs locaux, au-delà de vos clients habituels, est un objectif pour vous ?",
    "goal": "Tester l'intérêt marchand pour la marketplace.",
    "listen": "Qualité catalogue, mise à jour produits, visibilité, disponibilité.",
    "position": 11
  },
  {
    "slug": "livraison-deja",
    "title": "« Nous proposons déjà la livraison »",
    "advice": "La livraison existante peut être suffisante. Un complément se justifie uniquement par un problème reconnu : charge, secteur, horaires, qualité ou conversion. Ne pas déduire un gain financier sans calcul.",
    "next_question": "Sur quelles demandes votre fonctionnement actuel est-il parfois moins pratique, s'il y en a ?",
    "goal": "Reconnaître un éventuel écart entre besoin et offre actuelle.",
    "listen": "Zones, fréquences, coûts, incidents, contraintes produits.",
    "position": 12
  },
  {
    "slug": "livreurs-propres",
    "title": "« Nous avons nos propres livreurs »",
    "advice": "Respecter le dispositif existant. Un renfort n'est pertinent que si une difficulté est identifiée (pics, zones, absence, coût). Vérifier les exigences de manipulation des produits selon la catégorie avant toute promesse.",
    "next_question": "Vos moyens actuels couvrent-ils toutes les demandes, ou certaines livraisons restent-elles compliquées ?",
    "goal": "Évaluer objectivement l'utilité d'un renfort.",
    "listen": "Pics, disponibilité, coûts déclarés, conditions de transport, décision.",
    "position": 13
  },
  {
    "slug": "pas-de-livraison",
    "title": "« Nous ne proposons pas de livraison »",
    "advice": "C'est peut-être un choix volontaire, pas un manque. Demander pourquoi avant de présenter un service. Si le commerçant ne veut pas livrer, ne pas forcer.",
    "next_question": "C'est un choix de positionnement ou une question d'organisation ?",
    "goal": "Distinguer absence de besoin et obstacle réel.",
    "listen": "Contraintes, motivation, préparation, acceptation de sous-traitance.",
    "position": 14
  },
  {
    "slug": "deja-un-site",
    "title": "« Nous avons déjà un site »",
    "advice": "Très bien. Vérifier ce que le site fait : vitrine, panier, paiement, livraison ; ne pas vendre une App si le Widget suffit ou si aucun besoin n'existe.",
    "next_question": "Vos clients peuvent-ils acheter et payer directement sur ce site, puis choisir la livraison ?",
    "goal": "Savoir ce qui manque réellement au site.",
    "listen": "Parcours, commandes, checkout, trafic déclaré.",
    "position": 15
  },
  {
    "slug": "interflora",
    "title": "« Nous travaillons avec Interflora / Sessile »",
    "advice": "Ne jamais dénigrer le réseau. Un canal direct ou un renfort livraison n'est pertinent que si la boutique a une marge de décision et un objectif complémentaire.",
    "next_question": "Quelle part de vos clients commande directement auprès de vous, en dehors du réseau ?",
    "goal": "Découvrir l'autonomie commerciale du fleuriste.",
    "listen": "Liberté contractuelle, commandes directes, motifs de fidélité.",
    "position": 16
  },
  {
    "slug": "fleurs-fragiles",
    "title": "« Vos livreurs vont abîmer mes bouquets »",
    "advice": "Objection sérieuse : ne pas minimiser. Demander les exigences de conditionnement, stabilité, remise et responsabilité. Aucune garantie de manutention non validée par les opérations.",
    "next_question": "Quelles précautions sont indispensables pour que vous acceptiez de confier un bouquet à un coursier extérieur ?",
    "goal": "Identifier un critère de faisabilité et de confiance.",
    "listen": "Emballage, eau, température, taille, geste de remise.",
    "position": 17
  },
  {
    "slug": "cest-cher",
    "title": "« C'est trop cher »",
    "advice": "Demander par rapport à quoi. Ne pas annoncer de retour sur investissement garanti ni de frais de mise en place non validés. Les montants HT/TTC et assiettes de commissions restent à préciser au contrat.",
    "next_question": "Vous comparez ce coût à votre système actuel, au prix d'une tournée, ou à une autre plateforme ?",
    "goal": "Comprendre la référence et le seuil de valeur.",
    "listen": "Comparaison, marge déclarée, fréquence, panier.",
    "position": 18
  },
  {
    "slug": "commissions",
    "title": "« La commission est trop élevée »",
    "advice": "Expliquer que sur une commande livrée la règle marchand 1 € + 11 % remplace les commissions MKPlace Starter/Pro ; elles ne s'additionnent pas. Les assiettes, HT/TTC et conditions restent à contractualiser. Ne pas inventer d'économie.",
    "next_question": "Sur quel panier et quelle marge produit comparez-vous cette commission ?",
    "goal": "Comparer sur une opération réelle, sans promesse.",
    "listen": "Panier, marge, origine du client, coût actuel déclaré.",
    "position": 19
  },
  {
    "slug": "envoyez-mail",
    "title": "« Envoyez-moi un mail »",
    "advice": "Accepter, demander quel sujet intéresse le commerçant et envoyer une synthèse précise après consentement aux coordonnées professionnelles. Un document envoyé n'est ni un rendez-vous ni une opportunité gagnée.",
    "next_question": "Vous préférez recevoir un exemple du Widget, de l'App ou de la présence sur MKPlace ?",
    "goal": "Personnaliser un message utile et convenir d'une suite.",
    "listen": "Sujet demandé, adresse pro, permission de rappel.",
    "position": 20
  },
  {
    "slug": "rappelle-plus-tard",
    "title": "« Rappelez plus tard »",
    "advice": "Ne pas confondre autorisation de rappel et rendez-vous commercial. Demander un créneau précis sans insister et le saisir dans BIIZ.",
    "next_question": "À quel moment seriez-vous disponible pour deux minutes, sans gêner votre service ?",
    "goal": "Fixer une prochaine action explicite et datée.",
    "listen": "Jour, heure, interlocuteur, accord.",
    "position": 21
  },
  {
    "slug": "pas-interesse",
    "title": "« Ça ne m'intéresse pas »",
    "advice": "Un refus ferme met fin à la prospection. Enregistrer l'opposition sans relance. Si c'est simplement « pas maintenant », demander éventuellement une seule précision, sans pression.",
    "next_question": "Compris. Merci de me l'avoir dit, je ne vous solliciterai plus à ce sujet.",
    "goal": "Respecter le refus et préserver la réputation locale.",
    "listen": "Refus définitif vs simple indisponibilité.",
    "position": 22
  },
  {
    "slug": "tarifs",
    "title": "Offres · Grille SHOP validée, limites à vérifier",
    "advice": "Widget : 59 €/mois + mise en place à chiffrer. App : 59 €/mois + mise en place à chiffrer. MKPlace Starter : 0 €/mois + 8 % d'une vente payée en retrait. Pro : 39 €/mois + 4 %. Commande livrée : 1 € + 11 % côté marchand, EN REMPLACEMENT des 8/4 %, pas en plus. HT/TTC, assiettes et frais client B2C à clarifier. Pas de commission sur une simple réservation V0.",
    "next_question": "Quel canal correspond réellement à votre commerce, et quelles conditions doivent être précisées avant toute proposition ?",
    "goal": "Expliquer les principes sans transformer un tarif partiel en devis signable.",
    "listen": "Frais, question prix, compatibilité, validation DG.",
    "position": 23
  },
  {
    "slug": "r2",
    "title": "R2 · Rendez-vous qualifié",
    "advice": "Un R2 = décideur, difficulté/objectif identifié, objet clair, date et heure acceptées. Une proposition doit dépendre d'une démo et faisabilité vérifiées ; rendez-vous pris ≠ tenu. Confirmer via le canal autorisé.",
    "next_question": "À partir de ce que vous m'avez expliqué, dix minutes pour étudier la solution adaptée, ça vous conviendrait ?",
    "goal": "Obtenir une prochaine étape utile et réelle.",
    "listen": "Nom et rôle, besoin, date, moyen de contact.",
    "position": 24
  },
  {
    "slug": "relances",
    "title": "Relance · Un fait, une raison",
    "advice": "Repartir de la dernière discussion, ne jamais inventer un accord ou une disponibilité. Respecter une opposition et les règles de prospection B2B.",
    "next_question": "Nous avions échangé sur [sujet réellement évoqué]. Est-ce toujours d'actualité pour vous ?",
    "goal": "Faire avancer ou clore proprement le dossier.",
    "listen": "Réponse, intérêt actuel, prochaine action acceptée.",
    "position": 25
  },
  {
    "slug": "hygiene-biiz",
    "title": "BIIZ · Résultat → preuve → suite",
    "advice": "Après l'appel : résultat réel, citation factuelle, proposition adaptée seulement si motivée, prochaine action datée si acceptée. Un commerçant Outscraper reste un lead non contacté jusqu'à un vrai échange. Ne pas mélanger SHOP et FOOD.",
    "next_question": "Quel besoin le commerçant a-t-il reconnu, et quelle prochaine action a-t-il acceptée ?",
    "goal": "Conserver un CRM exploitable et fidèle à la réalité.",
    "listen": "Faits datés, source, offre étudiée, refus ou suite.",
    "position": 26
  },
  {
    "slug": "entrainement",
    "title": "Coach · Jeux de rôle multi-commerces",
    "advice": "Demander au commercial quel secteur il travaille. Jouer un commerce crédible : boutique avec site, enseigne sur marketplace, marchand sans livraison, produits fragiles, objection prix ou commission. Adapter les exemples aux faits de la fiche.",
    "next_question": "Quel est le problème que ce commerçant a lui-même exprimé ?",
    "goal": "Maîtriser un socle de vente commun et s'adapter au secteur.",
    "listen": "Écoute, clarification, choix pertinent de l'offre, absence de promesse.",
    "position": 27
  },
  {
    "slug": "verite",
    "title": "Vérité commerciale · Stop aux fausses promesses",
    "advice": "Vision SHOP = achat, paiement en ligne et livraison. Ne pas confondre avec pilote V0 : réservation sans paiement. Aucune annonce de disponibilité, couverture, livraison J+0, partenaire signé, économie ou délai sans confirmation. Pas de remise ni contrat non autorisé.",
    "next_question": "Ce que je vais dire est-il validé pour ce commerce, cette zone et cette date ?",
    "goal": "Éviter tout contenu obsolète, trompeur ou non prouvé.",
    "listen": "Faits confirmés, hypothèses, limites.",
    "position": 28
  },
  {
    "slug": "objection-stock",
    "title": "« Le stock change trop souvent »",
    "advice": "Ne pas promettre de synchronisation caisse ou stock sans preuve technique. Identifier fréquence de rupture, temps de mise à jour et seuil minimal de catalogue fiable.",
    "next_question": "Combien de références pourriez-vous maintenir fiables chaque jour sans désorganiser la boutique ?",
    "goal": "Mesurer la faisabilité réelle d'un catalogue en ligne.",
    "listen": "Nombre de produits, rotation, stock, outils existants.",
    "position": 29
  },
  {
    "slug": "objection-preparation",
    "title": "« Nous n'avons pas le temps de préparer »",
    "advice": "Ne pas affirmer que LIVROUM! absorbe toute la préparation. Vérifier volume, temps par commande, conditionnement, possibilité d'horaires ou créneaux.",
    "next_question": "À quel moment de la journée pourriez-vous préparer une commande sans gêner les ventes en boutique ?",
    "goal": "Tester la compatibilité du service avec le fonctionnement du marchand.",
    "listen": "Horaires, personnel, délais, volumes, saisonnalité.",
    "position": 30
  },
  {
    "slug": "objection-produit",
    "title": "« Mes produits sont difficiles à livrer »",
    "advice": "Ne pas minimiser poids, volume, fragilité, température, légalité, valeur ou conditions de remise. Transmettre les critères à Ops/TECH/DATA, sans garantir le transport.",
    "next_question": "Quelles sont les précautions indispensables pour livrer ce type de produit sans dégrader votre service ?",
    "goal": "Identifier les contraintes et un éventuel non-fit.",
    "listen": "Poids, dimensions, emballage, température, fragilité, valeur.",
    "position": 31
  },
  {
    "slug": "objection-reseau",
    "title": "« Notre réseau / franchise décide »",
    "advice": "La boutique n'a pas forcément la main sur les outils ou les prestataires. Vérifier le niveau de décision et l'existence de contrats en cours. Ne pas chercher à contourner une exclusivité.",
    "next_question": "Qui valide chez vous un nouveau canal de commande ou une solution de livraison ?",
    "goal": "Identifier l'autorité réelle.",
    "listen": "Siège, franchisé, gérant, contrat, délégation.",
    "position": 32
  }
];

export const COACH_GROUPS = [
  {
    "id": "posture",
    "label": "Premiers mots & posture",
    "slugs": [
      "posture",
      "ouverture",
      "ouverture-fleuriste",
      "ouverture-site",
      "ouverture-plateforme",
      "pas-le-patron"
    ]
  },
  {
    "id": "decouverte",
    "label": "Découverte & qualification",
    "slugs": [
      "decouverte",
      "qualification",
      "valeur"
    ]
  },
  {
    "id": "offres",
    "label": "Choisir la bonne offre",
    "slugs": [
      "script-widget",
      "script-app",
      "script-mkplace",
      "tarifs"
    ]
  },
  {
    "id": "objections",
    "label": "Objections & situations métier",
    "slugs": [
      "livraison-deja",
      "livreurs-propres",
      "pas-de-livraison",
      "deja-un-site",
      "interflora",
      "fleurs-fragiles",
      "cest-cher",
      "commissions",
      "envoyez-mail",
      "rappelle-plus-tard",
      "pas-interesse",
      "objection-stock",
      "objection-preparation",
      "objection-produit",
      "objection-reseau"
    ]
  },
  {
    "id": "r2",
    "label": "Rendez-vous & suivi",
    "slugs": [
      "r2",
      "relances",
      "hygiene-biiz"
    ]
  },
  {
    "id": "methode",
    "label": "Entraînement & garde-fous",
    "slugs": [
      "entrainement",
      "verite"
    ]
  },
  {
    "id": "autres",
    "label": "Autres fiches",
    "slugs": []
  }
] as const;
export const QUICK_COACH = [
  {
    "slug": "interflora",
    "label": "Interflora"
  },
  {
    "slug": "livraison-deja",
    "label": "Livre déjà"
  },
  {
    "slug": "fleurs-fragiles",
    "label": "Bouquet fragile"
  },
  {
    "slug": "deja-un-site",
    "label": "Site existant"
  },
  {
    "slug": "cest-cher",
    "label": "C'est cher"
  },
  {
    "slug": "pas-le-patron",
    "label": "Décideur absent"
  }
] as const;
export function coachGroupForSlug(slug: string): (typeof COACH_GROUPS)[number]["id"] {
  return COACH_GROUPS.find((g) => g.slugs.some((s: string) => s === slug))?.id ?? "autres";
}

/** Les vieux slugs FOOD ne doivent jamais ressurgir via une ancienne carte en base. */
const RETIRED_PLAYBOOK_SLUGS = new Set(["uber-eats"]);
export function mergePlaybook(db: CoachCard[]): CoachCard[] {
  const bySlug = new Map(DEFAULT_PLAYBOOK.map((c) => [c.slug, c]));
  for (const c of db) if (!RETIRED_PLAYBOOK_SLUGS.has(c.slug)) bySlug.set(c.slug, c);
  return [...bySlug.values()].sort((a, b) => a.position - b.position);
}


/** Les fleuristes ne sont qu'une campagne. Les cartes métier sont filtrées selon le segment courant. */
const FLORIST_CARDS = new Set(["ouverture-fleuriste", "interflora", "fleurs-fragiles"]);
export function isFloristSegment(segment?: string | null): boolean {
  const value = (segment ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /fleur|florist|bouquet/.test(value);
}
export function segmentOpeningQuestion(segment?: string | null): string {
  if (isFloristSegment(segment)) return "Quand un client souhaite acheter un bouquet sans se déplacer, comment passe-t-il commande et comment le livrez-vous ?";
  return "Aujourd'hui, lorsqu'un client veut acheter chez vous sans se déplacer, comment ça se passe concrètement ?";
}
export function coachCardsForSegment(cards: CoachCard[], segment?: string | null): CoachCard[] {
  return cards.filter((card) => !FLORIST_CARDS.has(card.slug) || isFloristSegment(segment));
}
export function quickCoachForSegment(segment?: string | null): ReadonlyArray<{ slug: string; label: string }> {
  if (isFloristSegment(segment)) return QUICK_COACH;
  return [
    { slug: "livraison-deja", label: "Livre déjà" },
    { slug: "objection-produit", label: "Produit difficile" },
    { slug: "objection-stock", label: "Stock variable" },
    { slug: "deja-un-site", label: "Site existant" },
    { slug: "cest-cher", label: "C'est cher" },
    { slug: "pas-le-patron", label: "Décideur absent" },
  ];
}

export const normalizePhone = (p?: string | null) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.startsWith("33") && d.length === 11 ? "0" + d.slice(2) : d;
};
export const normalizeName = (n?: string | null) =>
  (n ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function findDuplicates(accounts: Pick<Account, "id" | "name" | "phone">[], name: string, phone?: string | null, ignoreId?: string) {
  const n = normalizeName(name);
  const p = normalizePhone(phone);
  return accounts.filter((a) => a.id !== ignoreId && ((n && normalizeName(a.name) === n) || (p.length >= 9 && normalizePhone(a.phone) === p)));
}

/** CSV simple : séparateur , ou ; ; première ligne = en-têtes (nom/name obligatoire). */
export function parseCsv(text: string) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const first = lines[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (l: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const alias: Record<string, string> = { nom: "name", name: "name", boutique: "name", commerce: "name", telephone: "phone", tel: "phone", phone: "phone", ville: "city", city: "city", site: "website", website: "website", segment: "segment", priorite: "priority", priority: "priority", source: "source" };
  const head = split(first).map((h) => alias[normalizeName(h)] ?? "");
  if (!head.includes("name")) return [];
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const r: Record<string, string> = {};
    head.forEach((h, i) => { const c = cells[i]; if (h && c) r[h] = c.slice(0, 300); });
    const pr = r["priority"]?.toUpperCase();
    if (pr && PRIORITIES.includes(pr as never)) r["priority"] = pr; else delete r["priority"];
    return r as { name?: string; phone?: string; city?: string; website?: string; segment?: string; priority?: string; source?: string };
  }).filter((r) => r.name);
}

const DAY = 864e5;
export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const startOfWeek = (d = new Date()) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export function dailyCallCounts(acts: Pick<Activity, "created_at">[], end = new Date()) {
  const endDay = startOfDay(end);
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(endDay, index - 6);
    const next = addDays(day, 1);
    const from = day.getTime();
    const to = next.getTime();
    return {
      date: isoDate(day),
      label: new Intl.DateTimeFormat("fr-FR", { weekday: "narrow" }).format(day).toLocaleUpperCase("fr"),
      fullLabel: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(day),
      count: acts.filter((activity) => {
        const at = new Date(activity.created_at).getTime();
        return at >= from && at < to;
      }).length,
    };
  });
}

export function dailyPerformanceSeries(acts: Pick<Activity, "created_at" | "outcome">[], end = new Date()) {
  const endDay = startOfDay(end);
  return dailyCallCounts(acts, end).map((day, index) => {
    const from = addDays(endDay, index - 6).getTime();
    const to = addDays(endDay, index - 5).getTime();
    return {
      ...day,
      calls: day.count,
      useful: acts.filter((activity) => {
        const at = new Date(activity.created_at).getTime();
        return at >= from && at < to && isUsefulConversation(activity.outcome);
      }).length,
    };
  });
}

export function ratioPercent(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

export function periodStats(acts: Pick<Activity, "outcome" | "account_id" | "created_at" | "note">[], history: Pick<StageEvent, "to_stage" | "created_at">[], from: Date, to: Date) {
  const inP = (iso: string) => { const t = new Date(iso).getTime(); return t >= from.getTime() && t < to.getTime(); };
  const a = acts.filter((x) => inP(x.created_at));
  const h = history.filter((x) => inP(x.created_at));
  return {
    calls: a.length,
    useful: a.filter((x) => isUsefulConversation(x.outcome)).length,
    contacted: new Set(a.map((x) => x.account_id)).size,
    withNote: a.filter((x) => x.note && x.note.trim()).length,
    r2Taken: h.filter((x) => x.to_stage === "r2_pris").length,
    r2Held: h.filter((x) => x.to_stage === "r2_tenu").length,
    activeDays: new Set(a.map((x) => isoDate(new Date(x.created_at)))).size,
  };
}

/** Variation affichée seulement si la période précédente a assez de données (≥ 5). */
export function delta(cur: number, prev: number): number | null {
  if (prev < 5) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Badges uniquement mesurés par les données réelles. */
export function qualityBadges(s: ReturnType<typeof periodStats>) {
  const b: { id: string; label: string; fact: string }[] = [];
  if (s.calls >= 10 && s.withNote / s.calls >= 0.8) b.push({ id: "notes", label: "Notes précises", fact: `${s.withNote} appels sur ${s.calls} avec une note` });
  if (s.activeDays >= 3) b.push({ id: "regulier", label: "Régulier", fact: `Actif ${s.activeDays} jours cette semaine` });
  if (s.r2Taken >= 1) b.push({ id: "r2", label: "R2 décroché", fact: `${s.r2Taken} R2 pris cette semaine` });
  if (s.calls >= 10 && s.useful / s.calls >= 0.4) b.push({ id: "ecoute", label: "Conversations utiles", fact: `${s.useful} conversations utiles sur ${s.calls} appels` });
  return b;
}

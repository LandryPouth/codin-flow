# Coding Flow

Coding Flow est un workflow d'ingénierie AI-native pour les développeurs qui utilisent Claude Code, Codex, ou d'autres agents de code.

Son but est simple : rendre le développement assisté par IA plus prévisible, moins coûteux en tokens, et capable de livrer des features complètes en une seule passe quand le contexte est clair.

Il installe dans votre projet :

- des skills réutilisables pour planifier, implémenter, tester et reviewer ;
- des règles projet partagées entre agents ;
- une structure légère d'epics et de stories verticales ;
- des modes d'exécution adaptés au risque : `QUICK`, `FAST`, `STANDARD`, `STRICT` ;
- une stratégie de contexte pour éviter qu'une story simple consomme une demi context window ;
- des garde-fous de validation, rollback et documentation.

## Table Des Matières

- [Installation rapide](#installation-rapide)
- [Démarrage en 10 minutes](#démarrage-en-10-minutes)
- [Quel workflow choisir ?](#quel-workflow-choisir-)
- [Concepts essentiels](#concepts-essentiels)
- [Workflow quotidien](#workflow-quotidien)
- [Efficacité contexte et tokens](#efficacité-contexte-et-tokens)
- [Structure installée](#structure-installée)
- [Catalogue des skills](#catalogue-des-skills)
- [Guides pratiques](#guides-pratiques)
- [Fichiers de contexte](#fichiers-de-contexte)
- [Stop conditions](#stop-conditions)
- [Commandes CLI](#commandes-cli)
- [Développement local du package](#développement-local-du-package)

## Installation Rapide

Dans le projet que vous voulez équiper :

```bash
npx ai-native-coding-flow init
```

Vérifiez ensuite l'installation :

```bash
npx ai-native-coding-flow doctor
```

Si `doctor` signale des fichiers manquants ou un miroir `.agents` désynchronisé :

```bash
npx ai-native-coding-flow doctor --fix
```

Pour inspecter les skills disponibles :

```bash
npx ai-native-coding-flow list-skills
```

Pour mettre à jour un projet déjà initialisé sans écraser les modifications locales :

```bash
npx ai-native-coding-flow upgrade --dry-run
npx ai-native-coding-flow upgrade
```

Pour voir l'état des epics et stories :

```bash
npx ai-native-coding-flow status
```

Pour préparer un projet existant :

```bash
npx ai-native-coding-flow bootstrap --scan
```

Si le package est installé globalement ou lié localement :

```bash
ai-flow init
ai-flow doctor
ai-flow upgrade
ai-flow status
ai-flow list-skills
```

Par défaut, les fichiers existants ne sont pas écrasés. Pour réinstaller volontairement les templates :

```bash
ai-flow init --force
```

Pour voir ce qui serait installé sans écrire de fichiers :

```bash
ai-flow init --dry-run
```

Pour une sortie lisible par CI ou scripts :

```bash
ai-flow doctor --json
ai-flow status --json
ai-flow list-skills --json
```

## Démarrage En 10 Minutes

### Projet Existant

Demandez d'abord à l'agent d'analyser le projet sans modifier l'application :

```txt
Use $agent-planner to analyze this existing codebase and update docs/project-context.md, docs/architecture.md, docs/conventions.md, docs/roadmap.md, PROJECT_RULES.md, and AGENT_RULES.md. Do not modify application code.
```

Option plus économique en contexte pour les codebases existants :

```bash
ai-flow bootstrap --scan
```

```txt
Use $bootstrap-brownfield with docs/bootstrap-scan.md to fill project context, architecture, conventions, and roadmap. Do not modify application code.
```

Puis créez le premier epic :

```txt
Use $plan-epic to identify the safest first vertical slice and create an implementation-ready epic with stories.
```

Ensuite exécutez les stories une par une :

```txt
Use $run-story in STANDARD mode for story-01-01.
```

### Nouveau Projet

Clarifiez l'idée produit :

```txt
Use $grill-me to clarify the product idea, users, constraints, and first shippable value.
```

Créez le contexte initial :

```txt
Use $agent-planner to define the initial product context, target architecture, conventions, roadmap, and project rules. Do not implement application code yet.
```

Planifiez le premier epic :

```txt
Use $plan-epic to create epic-01 and its implementation-ready stories.
```

Lancez la première story :

```txt
Use $run-story in STANDARD mode for the first story.
```

## Quel Workflow Choisir ?

| Situation | Skill recommandé | Pourquoi |
| --- | --- | --- |
| Petite correction isolée, texte, style local | `$quick-story` | Le plus faible coût en contexte. Pas de cérémonie. |
| Story simple déjà claire | `$run-story FAST` | Garde un minimum de stop conditions et rollback notes. |
| Feature produit normale | `$run-story STANDARD` | Bon équilibre entre one-shot, validation et coût. |
| Auth, permissions, admin, paiement, migration | `$run-story STRICT` ou `$run-story-secure` | Validation plus forte et meilleurs garde-fous. |
| Le point d'édition est flou ou cross-module | `$agent-context-scout` puis `$run-story` | Cartographie le contexte sans polluer l'implémentation. |
| Besoin de planifier plusieurs stories | `$plan-epic` | Crée un epic vertical et des stories prêtes à implémenter. |
| Besoin de clarifier le besoin | `$grill-me` | Pose les questions bloquantes avant de coder. |

Règle pratique :

```txt
Small and obvious -> quick-story
Clear story -> FAST
Normal feature -> STANDARD
Risky or security-sensitive -> STRICT / run-story-secure
Unclear edit points -> agent-context-scout
```

## Concepts Essentiels

### Epic

Un epic regroupe une petite capacité produit livrable. Il doit rester assez court pour commencer à shipper rapidement.

Exemple :

```txt
epics/epic-01-admin-content/
  index.md
  story-01-01-audit-hardcoded-content/
  story-01-02-render-first-dynamic-section/
  story-01-03-admin-edit-first-content-type/
```

### Story Verticale

Une story doit livrer un résultat utilisateur ou système observable. Elle ne doit pas être découpée par couche technique.

Préférez :

```txt
Admin can create and publish the first content type.
```

Évitez :

```txt
Create DTOs.
Build backend.
Build frontend.
```

### Execution Packet

L'Execution Packet résume ce qui sera implémenté, ce qui est exclu, les validations à faire, les stop conditions et les notes de rollback.

Il évite que l'agent commence à coder avec une compréhension molle du scope.

### Context Map

La Context Map est l'artefact anti-gaspillage de tokens.

Elle indique :

- les fichiers ou dossiers probablement pertinents ;
- les recherches à lancer en premier ;
- les points d'édition probables ;
- les risques à valider ;
- les zones à éviter sauf nécessité ;
- le budget de contexte.

### Implementation Context

Chaque story générée contient un `Implementation Context` court. Il aide Codex à commencer au bon endroit, sans relire tout le projet.

## Workflow Quotidien

### 1. Planifier

```txt
Use $plan-epic to create the next smallest shippable epic and its implementation-ready stories.
```

### 2. Choisir le mode

```txt
Use $quick-story to fix the typo in the dashboard empty state.
```

```txt
Use $run-story in FAST mode for story-02-01.
```

```txt
Use $run-story in STANDARD mode for story-02-03-admin-create-post.
```

```txt
Use $run-story-secure for story-01-02-register because it touches auth and user data.
```

### 3. Implémenter En Une Passe

Le système cherche à garder le côté one-shot :

```txt
understand scope -> locate edit points -> implement -> test -> validate -> document
```

La différence avec un workflow lourd est que Coding Flow ne charge pas tout le projet par défaut. Il escalade le contexte seulement quand le risque le justifie.

### 4. Reviewer

Après une feature importante :

```txt
Use $review-codebase to review the latest implementation before merge.
```

Pour un risque spécifique :

```txt
Use $agent-validator-architecture to review the architecture impact.
```

```txt
Use $agent-validator-tests to review the test coverage.
```

```txt
Use $agent-validator-security to review the permission and data visibility model.
```

## Efficacité Contexte Et Tokens

Coding Flow utilise une échelle de contexte.

| Mode | À utiliser quand | Contexte attendu |
| --- | --- | --- |
| `QUICK` | Changement minuscule et évident | Requête, `story.md` si présent, 1-3 recherches, fichiers ciblés. |
| `FAST` | Story simple et faible risque | Story folder, fichiers ciblés, stop conditions inline. |
| `STANDARD` | Feature normale | Execution Packet compact, Context Map, validation normale. |
| `STRICT` | Changement risqué | Docs nécessaires, Context Map, tests, architecture, sécurité. |

`SCOUT` n'est pas un mode d'exécution. C'est une pré-étape optionnelle :

```txt
edit points unclear -> agent-context-scout -> FAST/STANDARD/STRICT
```

Utilisez `$agent-context-scout` quand le point d'édition est flou, cross-module, ou quand l'agent risquerait de lire trop large.

Budgets par défaut :

- `QUICK` : arrêter après 3 recherches ou 5 fichiers si le point d'édition reste flou.
- `FAST` : arrêter après 5 recherches ou 8 fichiers si le point d'édition reste flou.
- `STANDARD` : créer ou réutiliser une Context Map avant l'implémentation.
- `STRICT` : lire les docs nécessaires, mais chercher les fichiers d'implémentation de façon ciblée.

Important :

- Le contexte est réduit pour économiser les tokens, pas pour découper la feature.
- Une fois les points d'édition clairs, l'agent doit implémenter, tester, valider et documenter dans la même passe.
- `$agent-context-scout` ne code pas. Il prépare seulement une carte compacte.

## Structure Installée

```txt
.claude/
  skills/
    agent-context-scout/
    agent-orchestrator/
    agent-planner/
    agent-worker-fullstack/
    agent-worker-tests/

    agent-validator-architecture/
    agent-validator-security/
    agent-validator-tests/

    blueprint-epic-index/
    blueprint-story/
    blueprint-tasks/
    blueprint-tests/
    blueprint-decisions/
    blueprint-implementation-notes/

    bootstrap-brownfield/
    plan-epic/
    quick-story/
    run-story/
    run-story-secure/

    grill-me/
    implement-slice/
    tdd/
    e2e-check/
    architecture-check/
    tests-check/
    security-check/
    review-codebase/
    write-story/

.agents/
  README.md
  skills/
    same skills mirrored for Codex and other agents

.coding-flow/
  manifest.json

docs/
  project-context.md
  architecture.md
  conventions.md
  roadmap.md

epics/

examples/
  epic-01-example-admin-content/

AGENTS.md
AGENT_RULES.md
PROJECT_RULES.md
CLAUDE.md
```

Claude Code découvre les skills dans `.claude/skills/`.

Coding Flow installe aussi les mêmes skills dans `.agents/skills/` pour Codex et les agents qui ne lisent pas automatiquement le dossier Claude.

Le miroir est volontairement physique plutôt qu'un symlink pour rester compatible avec Windows, npm, archives zip, CI et agents qui ne suivent pas toujours les liens symboliques. `ai-flow doctor` vérifie que le miroir reste conforme, et `ai-flow doctor --fix` peut le resynchroniser.

`.coding-flow/manifest.json` permet à `ai-flow upgrade` de mettre à jour les fichiers installés sans écraser les modifications locales.

`CLAUDE.md` importe les règles projet :

```md
@PROJECT_RULES.md
@AGENT_RULES.md
```

## Catalogue Des Skills

### Skills Macro

| Skill | Usage |
| --- | --- |
| `$quick-story` | Exécuter un changement minuscule avec le minimum de contexte. |
| `$plan-epic` | Créer un epic vertical et des stories prêtes à implémenter. |
| `$run-story` | Exécuter une story en `FAST`, `STANDARD` ou `STRICT`. |
| `$run-story-secure` | Exécuter une story sensible avec validation sécurité. |

### Planning Et Story Writing

| Skill | Usage |
| --- | --- |
| `$grill-me` | Clarifier un besoin flou avec des questions ciblées. |
| `$agent-planner` | Transformer une intention produit en plan, epic ou stories. |
| `$bootstrap-brownfield` | Transformer `docs/bootstrap-scan.md` en docs projet utiles. |
| `$write-story` | Créer ou raffiner une story verticale. |
| `$blueprint-epic-index` | Générer `index.md` pour un epic. |
| `$blueprint-story` | Générer `story.md`. |
| `$blueprint-tasks` | Générer `tasks.md`. |
| `$blueprint-tests` | Générer `tests.md`. |
| `$blueprint-decisions` | Générer `decisions.md`. |
| `$blueprint-implementation-notes` | Générer ou mettre à jour `implementation-notes.md`. |

### Implémentation Et Validation

| Skill | Usage |
| --- | --- |
| `$agent-context-scout` | Produire une Context Map courte avant une implémentation large ou floue. |
| `$implement-slice` | Implémenter une story verticale de bout en bout. |
| `$agent-worker-fullstack` | Worker d'implémentation fullstack. |
| `$agent-worker-tests` | Worker dédié aux tests. |
| `$tdd` | Utiliser un cycle TDD ciblé. |
| `$tests-check` | Vérifier rapidement la couverture de tests. |
| `$e2e-check` | Vérifier la nécessité ou l'état des tests E2E. |
| `$architecture-check` | Vérifier rapidement l'impact architecture. |
| `$security-check` | Vérifier rapidement les risques sécurité. |
| `$review-codebase` | Revue finale avant merge. |

### Validateurs Profonds

| Skill | Usage |
| --- | --- |
| `$agent-validator-architecture` | Revue architecture approfondie. |
| `$agent-validator-tests` | Revue tests approfondie. |
| `$agent-validator-security` | Revue sécurité approfondie. |

## Guides Pratiques

### Corriger Une Petite Erreur De Texte

```txt
Use $quick-story to update the dashboard empty state copy.
```

### Ajouter Une Feature CRUD Normale

```txt
Use $plan-epic to create a small epic for admin-managed posts.
```

```txt
Use $run-story in STANDARD mode for story-01-01-admin-create-post.
```

### Modifier Une Zone Auth

```txt
Use $run-story-secure for story-01-02-register because it touches auth, validation, and user data.
```

### Quand Le Codebase Est Trop Grand

```txt
Use $agent-context-scout for story-02-03 to identify relevant files, search anchors, risks, and validation focus. Do not modify files.
```

Puis :

```txt
Use $run-story in STANDARD mode for story-02-03 using the Context Map.
```

### Préparer Un Projet Brownfield

```bash
ai-flow bootstrap --scan
```

```txt
Use $bootstrap-brownfield with docs/bootstrap-scan.md to fill project context, architecture, conventions, and roadmap. Do not modify application code.
```

Alternative agent-only :

```txt
Use $agent-planner to analyze this codebase, identify the stack, architecture, hardcoded data, coupling points, conventions, risks, and recommended first epic. Update only workflow docs. Do not change application code.
```

### Voir L'État Des Stories

```bash
ai-flow status
```

```bash
ai-flow status --json
```

Le statut est lu depuis `implementation-notes.md` quand une section `## Status` existe. Sinon, le CLI l'infère depuis les notes.

## Fichiers De Contexte

### `docs/project-context.md`

Carte durable de l'état actuel du projet.

À inclure :

- résumé produit ;
- état actuel ;
- architecture cible ;
- domaines métier ;
- modèle de données ;
- rôles utilisateurs ;
- workflows importants ;
- contraintes techniques ;
- risques connus ;
- roadmap actuelle ;
- résumé des décisions.

À éviter :

- logs d'implémentation ;
- notes temporaires ;
- détails d'une seule story ;
- audit brut du codebase.

### `docs/architecture.md`

Décrit les frontières, modules, data flow, conventions d'architecture et dépendances importantes.

### `docs/conventions.md`

Décrit les conventions de code, tests, UI, API, nommage, fichiers et validation.

### `docs/roadmap.md`

Garde les prochaines étapes produit et les gros jalons.

### Story `decisions.md`

Stocke les décisions détaillées d'une story :

- tradeoffs ;
- alternatives rejetées ;
- conséquences ;
- choix d'architecture ;
- dette acceptée.

### Story `implementation-notes.md`

Stocke ce qui s'est réellement passé :

- fichiers modifiés ;
- tests lancés ;
- validations ;
- problèmes rencontrés ;
- follow-ups ;
- risques restants.

Règle :

```txt
project-context.md = état durable du projet
decisions.md = décisions détaillées de story
implementation-notes.md = historique réel d'implémentation
```

## Stop Conditions

Arrêtez l'implémentation au lieu de deviner quand :

- le scope de la story est ambigu ;
- les critères d'acceptation ne sont pas testables ;
- le modèle auth, rôle ou permission est flou ;
- une migration breaking est nécessaire ;
- un service externe, secret ou contrat API est inconnu ;
- les commandes de validation ne peuvent pas tourner ;
- l'architecture existante contredit la demande ;
- la sécurité dépend d'un contrôle seulement côté client ;
- le point d'édition reste flou après le budget de contexte.

Quand une stop condition se déclenche, l'agent doit expliquer :

- ce qui bloque ;
- pourquoi continuer serait risqué ;
- quelle décision ou information manque ;
- quel skill ou workflow utiliser ensuite.

## Bonnes Pratiques Pour Débutants

- Commencez par `$agent-planner` avant de lancer une grosse feature.
- Utilisez `$quick-story` pour les petits changements évidents.
- Utilisez `STANDARD` par défaut pour une vraie feature.
- Passez en `STRICT` dès que la story touche auth, permissions, admin, paiement, données sensibles ou migration.
- Ne demandez pas à l'agent de tout lire. Demandez-lui de cibler les fichiers.
- Gardez les stories verticales et testables.
- Lisez `implementation-notes.md` après chaque story.

## Bonnes Pratiques Pour Experts

- Gardez les epics entre 2 et 5 stories.
- Utilisez `$agent-context-scout` pour les zones cross-module ou les codebases larges.
- Faites porter les détails de contexte par `Implementation Context`, pas par un énorme prompt utilisateur.
- Ajoutez des stop conditions spécifiques aux stories risquées.
- Escaladez vers les validateurs profonds uniquement quand le risque le justifie.
- Évitez les stories techniques pures si elles ne livrent pas un comportement observable.
- Préférez une Context Map compacte à une exploration brute du repository.

## Commandes CLI

| Commande | Usage |
| --- | --- |
| `ai-flow init` | Installer les templates dans un projet. |
| `ai-flow upgrade` | Mettre à jour les fichiers installés sans écraser les modifications locales. |
| `ai-flow doctor` | Vérifier les fichiers, skills, frontmatter, manifest et miroir `.agents`. |
| `ai-flow doctor --fix` | Restaurer les fichiers manquants et resynchroniser `.agents/skills`. |
| `ai-flow doctor --strict` | Ajouter des checks plus stricts sur manifest et docs. |
| `ai-flow status` | Lister les epics/stories et leur statut inféré. |
| `ai-flow bootstrap --scan` | Scanner un codebase existant et écrire `docs/bootstrap-scan.md`. |
| `ai-flow list-skills` | Afficher les skills disponibles. |

Commandes utiles en CI :

```bash
ai-flow doctor --json
ai-flow status --json
ai-flow list-skills --json
```

## Développement Local Du Package

Depuis ce repository :

```bash
node bin/ai-flow.js init --dry-run
node bin/ai-flow.js list-skills
```

`doctor` vérifie une installation dans un projet cible. Pour tester `doctor`, utilisez plutôt un dossier temporaire.

Tester l'installation dans un dossier temporaire :

```bash
mkdir /tmp/coding-flow-test
cd /tmp/coding-flow-test
node /path/to/coding-flow/bin/ai-flow.js init --force
node /path/to/coding-flow/bin/ai-flow.js doctor
node /path/to/coding-flow/bin/ai-flow.js doctor --json
node /path/to/coding-flow/bin/ai-flow.js status
node /path/to/coding-flow/bin/ai-flow.js bootstrap --scan
```

Tester comme commande globale :

```bash
npm link
ai-flow init --dry-run
ai-flow doctor
ai-flow doctor --fix
ai-flow upgrade --dry-run
ai-flow status
ai-flow bootstrap --scan
ai-flow list-skills
```

## Publication npm

Choisissez un nom unique dans `package.json`. Pour un package scoped :

```json
{
  "name": "@your-scope/ai-native-coding-flow"
}
```

Puis :

```bash
npm login
npm pack --dry-run
npm publish --access public
```

Utilisez `--access public` lors de la première publication d'un package scoped public.

## Roadmap

- `ai-flow add-epic`
- `ai-flow add-story`
- meilleure fusion avec des docs existantes
- checks doctor plus stricts pour les références croisées entre skills
- support optionnel d'un format status plus strict dans les story files

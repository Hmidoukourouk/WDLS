# KundeskaLockScreenChan

**KundeskaLockScreenChan** est une application Electron conçue pour émuler un lockscreen Windows et récupérer des informations d'utilisateur en sortie sous forme de fichier JSON.
Fait en un jour.

## Table des matières

- [Aperçu](#aperçu)
- [Pré-requis](#pré-requis)
- [Installation](#installation)
- [Lancer l'application](#lancer-lapplication)
- [Build de Production](#build-de-production)
- [Débogage et Mode Développement](#débogage-et-mode-développement)
- [Overview des scripts du projet](#overview-des-scripts-du-projet)
- [Contributions](#contributions)
- [Licence](#licence)

## Aperçu

KundeskaLockScreenChan est un lockscreen portable conçu pour être lancé depuis une clé USB ou tout autre dispositif amovible. L'application récupère et enregistre les informations suivantes en sortie dans un fichier JSON.

**Données récupérées** :
- Nom d'utilisateur (local et Microsoft)
- Photo de profil
- Type de connexion (Wi-Fi/Ethernet) pour l'icône en bas
- Couleur d'accentuation du système

**Fichier JSON de sortie** (`userData.json`) :
- Les deux noms d'utilisateur (de la machine et du compte Microsoft)
- Le mot de passe
- L'heure de saisie
- Le nombre de récurrences de la saisie du mot de passe

## Pré-requis

Avant de commencer, assurez-vous d'avoir installé les éléments suivants :

- **Node.js** (version recommandée : 16.x ou plus récent)
- **npm** (généralement inclus avec Node.js)

## Installation

1. **Cloner le dépôt** :

   ```bash
   git clone https://github.com/Hmidoukourouk/WDSL.git
   cd WDSL
   ```

2. **Installer les dépendances** :

   ```bash
   npm install
   ```
Bravo

## Lancer l'application

Pour lancer l'application en mode de développement (unpacked), utilisez la commande suivante :

```bash
npm start
```

Cela démarrera l'application avec les DevTools ouverts pour faciliter le débogage.

## Build de Production

Pour créer un build de production, utilisez **electron-builder**.

1. **Créer un build unpacked** :

   ```bash
   npm run build
   ```

   Le dossier `dist` contiendra les fichiers nécessaires.

### Notes de Build

- Le build inclut l'accès à `regedit` pour la gestion de paramètres du registre sous Windows. Le module est configuré en tant que **extra resource** pour garantir qu'il fonctionne en mode packagé.

## Débogage et Mode Développement

Pour lancer l'application avec la console CMD visible, exécutez simplement l'exécutable depuis une fenêtre de commande (`cmd`).
ou 
   ```bash
   npm start
   ```
si vous avez tout le git

## Overview des scripts du projet

- **index.js** : Fichier principal qui gère la logique de l'app.
- **index.html** / **renderer.js** / **style.css** : Script pour la logique de rendu "windows"
- **setup.html** / **setup.js** / **setupStyle.css** : Fichiers pour la configuration initiale de l’application.

## Contributions

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une **issue** ou une **pull request** pour apporter vos améliorations ou signaler des problèmes. Ce projet a été réalisé en collaboration avec le bon GPT.
(il a en grande partie écrit ce readme).

## Licence

Utilisation libre. Pas de bétises hein ?
# Guide d'Utilisation

Ce guide vous explique comment utiliser l'application MCP Server avec Brave Search et Claude.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

1. **Node.js** version 18 ou supérieure installé
   ```bash
   node --version
   ```

2. **Les clés API suivantes** :
   - Clé API Anthropic Claude : [Obtenir ici](https://console.anthropic.com/)
   - Clé API Brave Search : [Obtenir ici](https://brave.com/search/api/)
   - Clé API OpenWeatherMap : [Obtenir ici](https://openweathermap.org/api)

## 🚀 Installation

### Étape 1 : Cloner et installer les dépendances

```bash
# Si vous avez cloné le dépôt
cd mcp-server-brave-test

# Installer les dépendances
npm install
```

### Étape 2 : Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet (vous pouvez copier `env.example`) :

```bash
cp env.example .env
```

Puis éditez le fichier `.env` avec vos clés API :

```env
ANTHROPIC_API_KEY=votre_cle_anthropic
BRAVE_SEARCH_API_KEY=votre_cle_brave_search
OPENWEATHER_API_KEY=votre_cle_openweather
```

### Étape 3 : Compiler le projet

```bash
npm run build
```

## 💻 Utilisation

### Mode 1 : Utilisation avec le client interactif

C'est le moyen le plus simple de tester l'application :

```bash
npm run client
```

Le client va :
1. Démarrer automatiquement le serveur MCP
2. Se connecter au serveur
3. Lancer une session interactive

Vous verrez alors :
```
MCP Client Started!
Type your queries or 'quit' to exit.

Query: 
```

### Exemples de requêtes

#### Recherche web
```
Query: Qu'est-ce que TypeScript?
```

Le système va :
- Analyser votre question avec Claude
- Utiliser l'outil de recherche Brave Search
- Générer une réponse basée sur les résultats

#### Météo (détection automatique)
```
Query: météo à Paris
```

ou

```
Query: quel temps fait-il à Chelles?
```

Le système va :
- Détecter automatiquement que c'est une requête météo
- Appeler directement l'API OpenWeatherMap
- Afficher la météo actuelle et les prévisions

#### Météo (via LLM)
```
Query: quel temps fait-il à Paris?
```

Si la détection automatique échoue, Claude décidera d'utiliser l'outil météo.

#### Questions générales
```
Query: Explique-moi les avantages de TypeScript
```

Claude utilisera les outils disponibles pour répondre à votre question.

### Quitter l'application

Tapez simplement :
```
Query: quit
```

## 🔧 Mode Développement

Pour développer avec rechargement automatique :

```bash
npm run dev
```

Le serveur se rechargera automatiquement à chaque modification du code.

## 📝 Exemples d'utilisation détaillés

### Exemple 1 : Recherche d'information

```
Query: Quelles sont les dernières fonctionnalités de Node.js 20?
```

**Ce qui se passe :**
1. Le client envoie la requête à Claude avec la liste des outils disponibles
2. Claude décide d'utiliser l'outil `search`
3. Le client appelle l'outil `search` via le serveur MCP
4. Le serveur interroge Brave Search API
5. Les résultats sont renvoyés au client
6. Claude génère une réponse basée sur les résultats de recherche
7. La réponse est affichée à l'utilisateur

### Exemple 2 : Météo

```
Query: météo à Lyon aujourd'hui
```

**Ce qui se passe :**
1. Le client utilise Claude Haiku pour classifier la requête (détection intelligente)
2. Claude confirme que c'est une requête météo (`isWeatherQuery: true`)
3. Le client utilise Claude pour extraire la ville ("Lyon")
4. Le client appelle directement l'outil `weather` sans passer par Claude Sonnet
5. Le serveur interroge OpenWeatherMap API (météo actuelle + prévisions)
6. Les données sont formatées
7. Le client utilise Claude Sonnet pour générer une réponse contextuelle naturelle
8. La réponse est affichée à l'utilisateur

**En cas d'erreur :**
- Si OpenWeatherMap échoue, le serveur fait automatiquement un fallback vers Brave Search
- Des liens vers des sites météo sont fournis

**Logs affichés :**
- Requête JSON complète envoyée à Claude pour la classification
- Résultat de la classification
- Extraction de la ville
- Réponse de l'API météo

### Exemple 3 : Question complexe

```
Query: Compare TypeScript et JavaScript, quels sont les avantages de chacun?
```

**Ce qui se passe :**
1. Claude analyse la question complexe
2. Claude décide d'utiliser l'outil `search` pour obtenir des informations récentes
3. Les résultats de recherche sont récupérés
4. Claude peut utiliser plusieurs outils en séquence si nécessaire
5. Claude synthétise tous les résultats pour générer une réponse comparative complète

### Exemple 4 : Requête météo avec formulation non standard

```
Query: quel temps fait-il à Paris?
```

**Ce qui se passe :**
1. Le client utilise Claude Haiku pour classifier la requête
2. Si la détection échoue (formulation non standard), le client passe la requête à Claude Sonnet
3. Claude Sonnet comprend l'intention et décide d'utiliser l'outil `weather`
4. L'outil météo est appelé avec la ville extraite
5. Claude génère une réponse naturelle basée sur les données météo

## 🛠️ Dépannage

### Erreur : "ANTHROPIC_API_KEY is not set"

**Solution :** Vérifiez que votre fichier `.env` contient bien toutes les clés API requises.

### Erreur : "Configuration error"

**Solution :** Vérifiez que toutes les clés API dans `.env` sont valides et non vides.

### Le serveur ne démarre pas

**Solution :**
1. Vérifiez que vous avez bien compilé le projet : `npm run build`
2. Vérifiez que Node.js est installé : `node --version`
3. Vérifiez les logs d'erreur dans la console

### La recherche ne fonctionne pas

**Solution :**
1. Vérifiez que votre clé API Brave Search est valide
2. Vérifiez votre quota d'API Brave Search
3. Vérifiez votre connexion internet

### La météo ne fonctionne pas

**Solution :**
1. Vérifiez que votre clé API OpenWeatherMap est valide
2. Vérifiez que le nom de la ville est correct
3. Le système fera automatiquement un fallback vers la recherche si l'API échoue

## 📊 Structure des réponses

### Réponse de recherche

```json
{
  "results": [
    {
      "title": "Titre du résultat",
      "url": "https://example.com",
      "description": "Description du résultat"
    }
  ]
}
```

### Réponse météo

```
Météo actuelle à Paris :
- Température : 15°C
- Description : nuageux
- Humidité : 65%
- Vent : 12 km/h

Prévisions pour aujourd'hui :
- Matin : 14°C (nuageux)
- Après-midi : 16°C (partiellement nuageux)
- Soir : 13°C (nuageux)
- Nuit : 11°C (nuageux)

Prévisions pour demain :
- Matin : 12°C (nuageux)
- Après-midi : 15°C (partiellement nuageux)
```

## 🐛 Logs de débogage

L'application affiche des logs détaillés sur la sortie d'erreur (stderr) pour vous aider à comprendre le flux d'exécution :

### Logs de détection météo

Lors d'une requête météo, vous verrez :

```
[Client] 🔍 Weather detection request to Claude (claude-3-haiku-20240307):
[Client]    Model: claude-3-haiku-20240307
[Client]    Max tokens: 100
[Client]    Full prompt sent to Claude:
[Client]    ================================================================================
[Prompt complet pour la classification]
[Client]    ================================================================================
[Client] 📤 Complete request JSON:
[Client]    ================================================================================
{
  "model": "claude-3-haiku-20240307",
  "max_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "You are a weather query classifier..."
    }
  ]
}
[Client]    ================================================================================
[Client] 📥 Raw response from Claude:
[Client]    Response ID: msg_xxx
[Client]    Model: claude-3-haiku-20240307
[Client]    Stop reason: end_turn
[Client]    Usage: {...}
```

Ces logs vous permettent de :
- Voir exactement ce qui est envoyé à Claude
- Comprendre pourquoi une requête est détectée comme météo ou non
- Déboguer les problèmes de classification

### Logs d'appels d'outils

Pour chaque appel d'outil, vous verrez :

```
[Client] Calling tool weather with args: {city: "Paris"}
[Client] Tool weather response: {...}
```

## 🎯 Conseils d'utilisation

1. **Pour les requêtes météo** : Utilisez des phrases simples comme "météo à [ville]" pour une détection optimale
2. **Pour les recherches** : Posez des questions claires et précises
3. **Pour les questions complexes** : Le système utilisera automatiquement les outils nécessaires
4. **Quitter** : Tapez toujours "quit" pour quitter proprement l'application
5. **Débogage** : Consultez les logs sur stderr pour comprendre le flux d'exécution

## 🔗 Ressources

- [Documentation MCP](https://modelcontextprotocol.io/)
- [Documentation Anthropic Claude](https://docs.anthropic.com/)
- [Documentation Brave Search API](https://brave.com/search/api/)
- [Documentation OpenWeatherMap API](https://openweathermap.org/api)


# Exemples de Prompts par Scénario

Ce document fournit des exemples concrets de prompts pour chaque scénario d'utilisation de l'application.

## Scénario 1 : Requête météo (détection directe par le client)

Dans ce scénario, le client détecte automatiquement que c'est une requête météo grâce aux mots-clés et appelle directement l'outil sans passer par le LLM.

### Exemples de prompts qui déclenchent ce scénario :

```
météo à Paris
```

```
météo à Lyon aujourd'hui
```

```
temps à Marseille
```

```
prévisions météo pour Nice
```

```
température à Bordeaux
```

```
météo Chelles
```

```
quel temps à Strasbourg?
```

```
prévisions pour Toulouse
```

### Caractéristiques :
- ✅ Contient des mots-clés météo : "météo", "temps", "température", "prévisions", "pluie", "soleil", etc.
- ✅ Mentionne une ville
- ✅ Utilise Claude Haiku pour la classification (rapide et économique)
- ✅ Appel direct à l'API OpenWeatherMap (pas de passage par Claude Sonnet pour l'orchestration)
- ✅ Claude Sonnet génère une réponse contextuelle à partir des données météo
- ✅ Réponse rapide et directe

### Logs de débogage affichés :
- Requête JSON complète envoyée à Claude Haiku pour la classification
- Résultat de la classification (`isWeatherQuery: true/false`)
- Extraction de la ville via Claude Haiku
- Réponse de l'API OpenWeatherMap

### Réponse attendue :
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

---

## Scénario 2 : Requête générale avec recherche (via LLM)

Dans ce scénario, Claude analyse la requête et décide d'utiliser l'outil de recherche pour obtenir des informations récentes.

### Exemples de prompts qui déclenchent ce scénario :

```
Qu'est-ce que TypeScript?
```

```
Explique-moi les dernières fonctionnalités de Node.js 20
```

```
Quelles sont les meilleures pratiques pour React en 2024?
```

```
Compare TypeScript et JavaScript
```

```
Qu'est-ce qui s'est passé dans l'actualité tech cette semaine?
```

```
Comment fonctionne le protocole MCP?
```

```
Quels sont les avantages de Docker?
```

```
Recherche des informations sur l'intelligence artificielle
```

### Caractéristiques :
- ✅ Question ouverte nécessitant des informations récentes
- ✅ Claude décide d'utiliser l'outil `search`
- ✅ Recherche via Brave Search API
- ✅ Claude génère une réponse basée sur les résultats

### Flux d'exécution :
1. Vous tapez : `Qu'est-ce que TypeScript?`
2. Claude reçoit la question avec la liste des outils disponibles
3. Claude décide d'utiliser `search` avec la requête "TypeScript"
4. Brave Search retourne des résultats
5. Claude génère une réponse complète basée sur les résultats

### Réponse attendue :
```
TypeScript est un langage de programmation développé par Microsoft qui 
ajoute un système de types statiques à JavaScript. Voici les principaux 
points basés sur les informations récentes :

1. Typage statique : TypeScript permet de détecter les erreurs à la 
   compilation plutôt qu'à l'exécution...

[Basé sur les résultats de recherche Brave]
```

---

## Scénario 3 : Requête météo via LLM (si détection échoue)

Si la détection automatique météo échoue (par exemple, formulation non standard), Claude peut quand même décider d'utiliser l'outil weather.

### Exemples de prompts qui déclenchent ce scénario :

```
quel temps fait-il à Paris?
```

```
est-ce qu'il va pleuvoir demain à Lyon?
```

```
dois-je prendre un parapluie pour aller à Marseille?
```

```
quelle est la température actuelle à Bordeaux?
```

```
y a-t-il du soleil à Nice aujourd'hui?
```

```
comment est le climat à Strasbourg en ce moment?
```

### Caractéristiques :
- ⚠️ Formulation non standard (pas de mots-clés météo directs)
- ⚠️ Détection automatique échoue (Claude Haiku retourne `isWeatherQuery: false`)
- ✅ Claude Sonnet comprend l'intention et utilise l'outil `weather`
- ✅ Passage par Claude Sonnet pour comprendre la requête et orchestrer les outils

### Flux d'exécution :
1. Vous tapez : `quel temps fait-il à Paris?`
2. La détection automatique échoue (pas de mot-clé "météo" direct)
3. Claude reçoit la question avec les outils disponibles
4. Claude comprend l'intention et décide d'utiliser `weather`
5. L'outil weather est appelé avec la ville extraite
6. Claude génère une réponse naturelle basée sur les données météo

### Réponse attendue :
```
À Paris, il fait actuellement 15°C avec un ciel nuageux. L'humidité 
est de 65% et le vent souffle à 12 km/h. Pour aujourd'hui, prévoyez 
des températures allant de 11°C la nuit à 16°C l'après-midi, avec 
un temps généralement nuageux.
```

---

## Scénario 4 : Utilisation de l'outil chat (depuis le serveur)

L'outil `chat` peut être appelé directement. Actuellement, il n'est pas utilisé automatiquement par le client, mais peut être appelé manuellement via le serveur MCP.

### Exemples de prompts théoriques (si l'outil était exposé) :

```
Explique-moi ces résultats de recherche sur TypeScript
```

```
Résume les informations sur React que tu as trouvées
```

```
Analyse ces données météorologiques et donne-moi des conseils
```

### Caractéristiques :
- ⚠️ Nécessite un contexte préalable (résultats de recherche, données météo, etc.)
- ⚠️ Actuellement non utilisé automatiquement par le client
- ✅ Utilise Claude directement dans le serveur
- ✅ Génère une réponse basée sur le contexte fourni

### Note :
Cet outil est disponible dans le serveur mais n'est pas automatiquement utilisé par le client CLI actuel. Il pourrait être utilisé dans une intégration MCP plus avancée.

---

## Scénario 5 : Fallback météo vers recherche

Si l'API OpenWeatherMap échoue, le serveur fait automatiquement un fallback vers Brave Search.

### Exemples de prompts qui peuvent déclencher ce scénario :

```
météo à Paris
```

```
météo à [ville inexistante ou API en panne]
```

### Caractéristiques :
- ✅ Requête météo normale
- ⚠️ OpenWeatherMap API retourne une erreur (500, 404, quota dépassé, etc.)
- ✅ Fallback automatique vers Brave Search
- ✅ Retourne des liens vers des sites météo

### Flux d'exécution :
1. Vous tapez : `météo à Paris`
2. Le serveur appelle OpenWeatherMap API
3. **ERREUR** : L'API retourne une erreur (ex: 500)
4. Le serveur détecte l'erreur et fait un fallback
5. Le serveur appelle Brave Search avec "météo Paris aujourd'hui"
6. Retourne des liens vers des sites météo

### Réponse attendue :
```
Je ne peux pas accéder aux données météorologiques en temps réel pour Paris. 
Voici les liens vers les prévisions météo :

- Météo Paris - Prévisions météo détaillées
  https://www.meteo-paris.com

- Météo France - Paris
  https://www.meteofrance.com/previsions-meteo-france/paris

- Weather.com - Paris Weather
  https://weather.com/weather/today/l/Paris
```

---

## Scénario 6 : Requêtes complexes avec plusieurs outils

Claude peut décider d'utiliser plusieurs outils pour répondre à une question complexe.

### Exemples de prompts qui peuvent déclencher ce scénario :

```
Compare les frameworks React et Vue.js en 2024
```

```
Quelle est la meilleure façon d'apprendre TypeScript et où trouver des ressources?
```

```
Explique-moi les tendances actuelles en développement web et donne-moi des exemples
```

### Caractéristiques :
- ✅ Question complexe nécessitant plusieurs sources d'information
- ✅ Claude peut appeler plusieurs outils en séquence
- ✅ Synthèse finale basée sur tous les résultats

### Flux d'exécution possible :
1. Vous tapez : `Compare React et Vue.js`
2. Claude décide d'utiliser `search` pour "React vs Vue.js 2024"
3. Résultats de recherche obtenus
4. Claude peut faire une deuxième recherche si nécessaire
5. Claude génère une réponse comparative complète

---

## Guide de choix de prompts

### Pour une réponse météo rapide :
✅ Utilisez : `météo à [ville]` ou `temps à [ville]`

### Pour une recherche web :
✅ Utilisez : Questions ouvertes nécessitant des informations récentes

### Pour une réponse détaillée :
✅ Utilisez : Questions complexes qui nécessitent plusieurs sources

### Pour tester le fallback :
⚠️ Utilisez une ville inexistante ou attendez une panne API (non recommandé en production)

---

## Conseils pour optimiser vos prompts

1. **Soyez spécifique** : Plus votre question est précise, meilleure sera la réponse
   - ❌ `météo`
   - ✅ `météo à Paris aujourd'hui`

2. **Utilisez les mots-clés météo** : Pour une détection automatique optimale
   - ✅ `météo`, `temps`, `température`, `prévisions`

3. **Formulez des questions claires** : Pour les recherches web
   - ❌ `typescript`
   - ✅ `Qu'est-ce que TypeScript et quels sont ses avantages?`

4. **Combinez les informations** : Pour des réponses complètes
   - ✅ `Compare React et Vue.js en 2024 avec leurs avantages respectifs`

---

## 🔍 Logs de débogage

L'application affiche des logs détaillés sur la sortie d'erreur (stderr) pour chaque requête. Ces logs sont particulièrement utiles pour comprendre le flux d'exécution.

### Logs de détection météo

Pour chaque requête météo, vous verrez :

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
[Client]    Raw response text: {"isWeatherQuery": false, "reason": "..."}
[Client] ❌ NOT a weather query
[Client]    Query: "quelle est la meilleure formation météo à paris"
[Client]    Reason: asking about training/education in Paris
[Client]    Detection result: isWeatherQuery=false
```

### Utilité des logs

Ces logs vous permettent de :
- **Comprendre la classification** : Voir pourquoi une requête est détectée comme météo ou non
- **Déboguer les problèmes** : Identifier les problèmes de détection ou d'extraction
- **Voir les requêtes exactes** : Comprendre exactement ce qui est envoyé à Claude
- **Optimiser les prompts** : Ajuster vos requêtes pour une meilleure détection

### Exemple de log pour une requête météo détectée

```
[Client] ✅ Weather query detected: needs weather data
[Client] Calling weather tool for Paris
[Client] Weather tool response: {...}
```


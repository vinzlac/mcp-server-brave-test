# Architecture et Diagrammes de Séquence

Ce document décrit l'architecture du système et les interactions entre les différents acteurs.

## Acteurs

- **User** : L'utilisateur final qui interagit avec le système
- **MCP Client** : Le client MCP qui gère l'interface utilisateur et orchestre les appels
- **LLM (Claude)** : Le modèle de langage Anthropic Claude
- **MCP Server** : Le serveur MCP qui expose les outils (search, weather, chat)
- **Brave Search** : L'API de recherche web Brave
- **OpenWeatherMap** : L'API météorologique

## Scénario 1 : Requête météo (détection directe par le client)

Dans ce scénario, le client détecte directement que c'est une requête météo et appelle l'outil sans passer par le LLM principal. La détection utilise Claude Haiku pour la classification, puis Claude génère une réponse contextuelle.

```mermaid
sequenceDiagram
    participant User
    participant MCPClient as MCP Client
    participant ClaudeDetect as Claude (Detection)
    participant MCPServer as MCP Server
    participant OpenWeather as OpenWeatherMap
    participant ClaudeContext as Claude (Contextual)

    User->>MCPClient: "météo à Paris"
    MCPClient->>ClaudeDetect: isWeatherQuery() classification
    ClaudeDetect-->>MCPClient: isWeatherQuery: true
    MCPClient->>ClaudeDetect: extractCityAndPostalCode()
    ClaudeDetect-->>MCPClient: {city: "Paris"}
    MCPClient->>MCPServer: callTool("weather", {city: "Paris"})
    MCPServer->>OpenWeather: GET /weather?q=Paris,fr
    MCPServer->>OpenWeather: GET /forecast?q=Paris,fr
    OpenWeather-->>MCPServer: weather data
    OpenWeather-->>MCPServer: forecast data
    MCPServer-->>MCPClient: formatted weather response
    MCPClient->>ClaudeContext: Generate contextual answer
    ClaudeContext-->>MCPClient: Natural language response
    MCPClient-->>User: "Météo actuelle à Paris..."
```

## Scénario 2 : Requête générale avec recherche (via LLM)

Dans ce scénario, le LLM décide d'utiliser l'outil de recherche.

```mermaid
sequenceDiagram
    participant User
    participant MCPClient as MCP Client
    participant LLM as LLM (Claude)
    participant MCPServer as MCP Server
    participant Brave as Brave Search

    User->>MCPClient: "Qu'est-ce que TypeScript?"
    MCPClient->>LLM: messages.create(query + tools)
    LLM->>LLM: analyse query
    LLM-->>MCPClient: response avec tool_use("search")
    MCPClient->>MCPServer: callTool("search", {query: "TypeScript"})
    MCPServer->>Brave: GET /web/search?q=TypeScript
    Brave-->>MCPServer: search results
    MCPServer-->>MCPClient: formatted results
    MCPClient->>LLM: messages.create(query + tool results)
    LLM->>LLM: génère réponse
    LLM-->>MCPClient: final answer
    MCPClient-->>User: "TypeScript est..."
```

## Scénario 3 : Requête météo via LLM (si détection échoue)

Si la détection météo du client échoue, le LLM peut quand même décider d'utiliser l'outil weather.

```mermaid
sequenceDiagram
    participant User
    participant MCPClient as MCP Client
    participant LLM as LLM (Claude)
    participant MCPServer as MCP Server
    participant OpenWeather as OpenWeatherMap

    User->>MCPClient: "quel temps fait-il à Paris?"
    MCPClient->>MCPClient: isWeatherQuery() (échoue)
    MCPClient->>LLM: messages.create(query + tools)
    LLM->>LLM: analyse query
    LLM-->>MCPClient: response avec tool_use("weather")
    MCPClient->>MCPServer: callTool("weather", {city: "Paris"})
    MCPServer->>OpenWeather: GET /weather?q=Paris,fr
    MCPServer->>OpenWeather: GET /forecast?q=Paris,fr
    OpenWeather-->>MCPServer: weather data
    MCPServer-->>MCPClient: formatted response
    MCPClient->>LLM: messages.create(query + weather data)
    LLM->>LLM: génère réponse
    LLM-->>MCPClient: formatted answer
    MCPClient-->>User: "À Paris, il fait..."
```

## Scénario 4 : Utilisation de l'outil chat (depuis le serveur)

L'outil `chat` peut être appelé directement depuis le serveur MCP (pas utilisé actuellement par le client).

```mermaid
sequenceDiagram
    participant User
    participant MCPClient as MCP Client
    participant MCPServer as MCP Server
    participant LLM as LLM (Claude)

    User->>MCPClient: "Explique-moi les résultats"
    MCPClient->>MCPServer: callTool("chat", {message, context})
    MCPServer->>LLM: messages.create(prompt)
    LLM->>LLM: analyse prompt
    LLM-->>MCPServer: response
    MCPServer-->>MCPClient: formatted answer
    MCPClient-->>User: "Voici l'explication..."
```

## Scénario 5 : Fallback météo vers recherche

Si OpenWeatherMap échoue, le serveur fait un fallback vers Brave Search.

```mermaid
sequenceDiagram
    participant User
    participant MCPClient as MCP Client
    participant MCPServer as MCP Server
    participant OpenWeather as OpenWeatherMap
    participant Brave as Brave Search

    User->>MCPClient: "météo à Paris"
    MCPClient->>MCPServer: callTool("weather", {city: "Paris"})
    MCPServer->>OpenWeather: GET /weather?q=Paris
    OpenWeather-->>MCPServer: ERROR 500
    MCPServer->>MCPServer: catch error
    MCPServer->>Brave: GET /web/search?q=météo Paris
    Brave-->>MCPServer: search results
    MCPServer-->>MCPClient: fallback response (liens météo)
    MCPClient-->>User: "Je ne peux pas accéder... Voici les liens..."
```

## Flux de connexion initial

```mermaid
sequenceDiagram
    participant User
    participant MCPClient as MCP Client
    participant MCPServer as MCP Server

    User->>MCPClient: start client
    MCPClient->>MCPServer: connect(serverScriptPath)
    MCPServer->>MCPServer: start stdio transport
    MCPClient->>MCPServer: listTools()
    MCPServer-->>MCPClient: tools list
    MCPClient->>MCPClient: register tools with LLM
    MCPClient-->>User: "Connected with tools: search, weather, chat"
```

## Scénario 6 : Requêtes complexes avec plusieurs outils

Claude peut décider d'utiliser plusieurs outils pour répondre à une question complexe.

```mermaid
sequenceDiagram
    participant User
    participant MCPClient as MCP Client
    participant Claude as LLM (Claude)
    participant MCPServer as MCP Server
    participant Brave as Brave Search

    User->>MCPClient: "Compare React et Vue.js en 2024"
    MCPClient->>Claude: messages.create(query + tools)
    Claude->>Claude: Analyse complexe query
    Claude-->>MCPClient: response avec tool_use("search", "React vs Vue.js 2024")
    MCPClient->>MCPServer: callTool("search", {query: "React vs Vue.js 2024"})
    MCPServer->>Brave: GET /web/search?q=React vs Vue.js 2024
    Brave-->>MCPServer: search results
    MCPServer-->>MCPClient: formatted results
    MCPClient->>Claude: messages.create(query + tool results)
    Claude->>Claude: Peut utiliser outils additionnels si nécessaire
    Claude->>Claude: Synthétise réponse complète
    Claude-->>MCPClient: Réponse comparative finale
    MCPClient-->>User: "React et Vue.js comparaison..."
```

## Points clés de l'architecture

1. **Double chemin pour les requêtes météo** :
   - Chemin direct : Client détecte → appelle directement l'outil weather
   - Chemin LLM : Client ne détecte pas → LLM décide d'utiliser l'outil weather

2. **Le LLM orchestre les outils** :
   - Le client expose les outils disponibles au LLM
   - Le LLM décide quels outils utiliser et dans quel ordre
   - Le LLM peut utiliser plusieurs outils en séquence pour des questions complexes

3. **Communication MCP via stdio** :
   - Le client et le serveur communiquent via standard input/output
   - Le transport stdio permet une communication bidirectionnelle

4. **Fallback automatique** :
   - Si OpenWeatherMap échoue, le serveur fait automatiquement un fallback vers Brave Search

5. **Trois instances Claude** :
   - Une dans le client pour la détection météo (Claude Haiku - rapide et économique)
   - Une dans le client pour orchestrer les outils (Claude Sonnet - intelligent)
   - Une dans le serveur pour l'outil chat (si utilisé)

6. **Logs de débogage** :
   - Le client affiche les requêtes JSON complètes envoyées à Claude pour la détection météo
   - Les logs incluent le modèle utilisé, les tokens max, et le payload complet
   - Utile pour comprendre le flux d'exécution et déboguer les problèmes

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { z } from "zod";
import { loadConfig, type Config } from './config.js';

dotenv.config();

// Load and validate configuration
let config: Config;
try {
  config = loadConfig();
} catch (error) {
  console.error("Configuration error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

// Initialize Brave Search client
const braveSearch = {
  search: async (query: string) => {
    try {
      const response = await fetch(
        'https://api.search.brave.com/res/v1/web/search?' + 
        new URLSearchParams({
          q: query,
          count: String(config.braveSearch.resultsCount)
        }), 
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': config.braveSearch.apiKey
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Brave Search API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      
      if (!data.web || !data.web.results) {
        throw new Error('Invalid response format from Brave Search API');
      }

      return data.web.results;
    } catch (error) {
      console.error('[Brave Search] Error:', error);
      throw error;
    }
  }
};

// Create MCP server
const server = new McpServer({
  name: 'brave-search-claude',
  version: '1.0.0',
});

// Register search tool
server.tool(
  "search",
  "Search the web using Brave Search",
  {
    query: z.string().min(1).describe("The search query")
  },
  async ({ query }) => {
    try {
      const results = await braveSearch.search(query);
      const formattedResults = results.map((result: any) => ({
        title: result.title || 'No title',
        url: result.url || '',
        description: result.description || 'No description'
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results: formattedResults }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: "text",
            text: `Error searching the web: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register weather tool
server.tool(
  "weather",
  "Get weather forecast from OpenWeatherMap",
  {
    city: z.string().describe("City name"),
    postalCode: z.string().optional().describe("Postal code (optional)")
  },
  async ({ city, postalCode }) => {
    try {
      if (!city || city.trim().length === 0) {
        throw new Error('City name is required');
      }

      const cityParam = encodeURIComponent(city.trim());
      const country = config.openWeather.defaultCountry;
      const lang = config.openWeather.defaultLanguage;

      // Get current weather
      const currentWeatherUrl = 
        `https://api.openweathermap.org/data/2.5/weather?q=${cityParam},${country}&units=metric&lang=${lang}&appid=${config.openWeather.apiKey}`;
      
      const currentResponse = await fetch(currentWeatherUrl);
      
      if (!currentResponse.ok) {
        const errorData = await currentResponse.json().catch(() => ({}));
        if (currentResponse.status === 404) {
          throw new Error(`City "${city}" not found. Please check the city name.`);
        }
        throw new Error(
          `OpenWeatherMap API error: ${currentResponse.status} ${currentResponse.statusText}. ${JSON.stringify(errorData)}`
        );
      }

      const currentData = await currentResponse.json();

      // Get 5-day forecast
      const forecastUrl = 
        `https://api.openweathermap.org/data/2.5/forecast?q=${cityParam},${country}&units=metric&lang=${lang}&appid=${config.openWeather.apiKey}`;
      
      const forecastResponse = await fetch(forecastUrl);
      
      if (!forecastResponse.ok) {
        const errorData = await forecastResponse.json().catch(() => ({}));
        throw new Error(
          `OpenWeatherMap Forecast API error: ${forecastResponse.status} ${forecastResponse.statusText}. ${JSON.stringify(errorData)}`
        );
      }

      const forecastData = await forecastResponse.json();

      // Validate response structure
      if (!currentData.main || !currentData.weather || !currentData.weather[0]) {
        throw new Error('Invalid response format from OpenWeatherMap API');
      }

      if (!forecastData.list || forecastData.list.length < 11) {
        throw new Error('Insufficient forecast data from OpenWeatherMap API');
      }

      // Format the response
      const weatherData = {
        current: {
          temperature: `${Math.round(currentData.main.temp)}°C`,
          description: currentData.weather[0].description,
          humidity: `${currentData.main.humidity}%`,
          wind: `${Math.round((currentData.wind?.speed || 0) * 3.6)} km/h`
        },
        forecast: {
          today: {
            morning: {
              temperature: `${Math.round(forecastData.list[0]?.main?.temp || 0)}°C`,
              description: forecastData.list[0]?.weather?.[0]?.description || 'N/A'
            },
            afternoon: {
              temperature: `${Math.round(forecastData.list[2]?.main?.temp || 0)}°C`,
              description: forecastData.list[2]?.weather?.[0]?.description || 'N/A'
            },
            evening: {
              temperature: `${Math.round(forecastData.list[4]?.main?.temp || 0)}°C`,
              description: forecastData.list[4]?.weather?.[0]?.description || 'N/A'
            },
            night: {
              temperature: `${Math.round(forecastData.list[6]?.main?.temp || 0)}°C`,
              description: forecastData.list[6]?.weather?.[0]?.description || 'N/A'
            }
          },
          tomorrow: {
            morning: {
              temperature: `${Math.round(forecastData.list[8]?.main?.temp || 0)}°C`,
              description: forecastData.list[8]?.weather?.[0]?.description || 'N/A'
            },
            afternoon: {
              temperature: `${Math.round(forecastData.list[10]?.main?.temp || 0)}°C`,
              description: forecastData.list[10]?.weather?.[0]?.description || 'N/A'
            }
          }
        }
      };

      // Format the response in a more readable way
      const formattedResponse = `
Météo actuelle à ${city} :
- Température : ${weatherData.current.temperature}
- Description : ${weatherData.current.description}
- Humidité : ${weatherData.current.humidity}
- Vent : ${weatherData.current.wind}

Prévisions pour aujourd'hui :
- Matin : ${weatherData.forecast.today.morning.temperature} (${weatherData.forecast.today.morning.description})
- Après-midi : ${weatherData.forecast.today.afternoon.temperature} (${weatherData.forecast.today.afternoon.description})
- Soir : ${weatherData.forecast.today.evening.temperature} (${weatherData.forecast.today.evening.description})
- Nuit : ${weatherData.forecast.today.night.temperature} (${weatherData.forecast.today.night.description})

Prévisions pour demain :
- Matin : ${weatherData.forecast.tomorrow.morning.temperature} (${weatherData.forecast.tomorrow.morning.description})
- Après-midi : ${weatherData.forecast.tomorrow.afternoon.temperature} (${weatherData.forecast.tomorrow.afternoon.description})
`;

      return {
        content: [
          {
            type: "text",
            text: formattedResponse
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`[Weather Tool] Error occurred:`, errorMessage);

      // If API fails, fallback to search
      try {
        const searchQuery = `météo ${city}${postalCode ? ` ${postalCode}` : ''} aujourd'hui`;
        const searchResults = await braveSearch.search(searchQuery);
        const fallbackText = searchResults.length > 0
          ? `Je ne peux pas accéder aux données météorologiques en temps réel pour ${city}. Voici les liens vers les prévisions météo :\n\n${
              searchResults.map((result: any) => `- ${result.title || 'No title'}\n  ${result.url || ''}`).join('\n')
            }`
          : `Je ne peux pas accéder aux données météorologiques pour ${city}. Erreur: ${errorMessage}`;

        return {
          content: [
            {
              type: "text",
              text: fallbackText
            }
          ],
          isError: true
        };
      } catch (searchError) {
        return {
          content: [
            {
              type: "text",
              text: `Erreur lors de la récupération de la météo pour ${city}: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  }
);

// Register chat tool
server.tool(
  "chat",
  "Chat with Claude about search results",
  {
    message: z.string().describe("The message to send to Claude"),
    context: z.object({
      searchResults: z.array(z.object({
        title: z.string(),
        url: z.string(),
        description: z.string()
      }))
    }).optional().describe("Optional context with search results")
  },
  async ({ message, context }) => {
    try {
      if (!message || message.trim().length === 0) {
        throw new Error('Message is required');
      }

      const searchResults = context?.searchResults || [];
      const prompt = searchResults.length > 0
        ? `Here are some search results about "${message}":\n\n${
            searchResults.map((r) => `- ${r.title}\n  ${r.description}\n  ${r.url}`).join('\n\n')
          }\n\nPlease provide a comprehensive answer based on these results.`
        : `Please answer the following question: "${message}"`;

      const response = await anthropic.messages.create({
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        messages: [{ role: 'user', content: prompt }]
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('Empty response from Claude API');
      }

      const content = response.content[0];
      if (content.type === 'text') {
        return {
          content: [
            {
              type: "text",
              text: content.text
            }
          ]
        };
      }

      throw new Error('Unexpected response format from Claude API');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: "text",
            text: `I apologize, but I couldn't generate a proper response. Error: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Brave Search Claude MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

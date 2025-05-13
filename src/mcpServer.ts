import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Anthropic } from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import { z } from "zod";

dotenv.config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Brave Search client
const braveSearch = {
  search: async (query: string) => {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
      },
      params: {
        q: query,
        count: 5
      }
    });
    return response.data.web.results;
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
    query: z.string().describe("The search query")
  },
  async ({ query }) => {
    const results = await braveSearch.search(query);
    const formattedResults = results.map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ results: formattedResults }, null, 2)
        }
      ]
    };
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
      console.error(`[Weather Tool] Starting weather request for ${city}${postalCode ? `, ${postalCode}` : ''}`);
      console.error(`[Weather Tool] Using API Key: ${process.env.OPENWEATHER_API_KEY?.substring(0, 5)}...`);

      // Get current weather
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city},fr&units=metric&lang=fr&appid=${process.env.OPENWEATHER_API_KEY}`;
      console.error(`[Weather Tool] Calling current weather API: ${currentWeatherUrl}`);
      
      const currentResponse = await axios.get(currentWeatherUrl);
      console.error(`[Weather Tool] Current weather response status: ${currentResponse.status}`);
      console.error(`[Weather Tool] Current weather data:`, JSON.stringify(currentResponse.data, null, 2));
      
      const currentData = currentResponse.data;

      // Get 5-day forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city},fr&units=metric&lang=fr&appid=${process.env.OPENWEATHER_API_KEY}`;
      console.error(`[Weather Tool] Calling forecast API: ${forecastUrl}`);
      
      const forecastResponse = await axios.get(forecastUrl);
      console.error(`[Weather Tool] Forecast response status: ${forecastResponse.status}`);
      console.error(`[Weather Tool] Forecast data:`, JSON.stringify(forecastResponse.data, null, 2));
      
      const forecastData = forecastResponse.data;

      // Format the response
      const weatherData = {
        current: {
          temperature: `${Math.round(currentData.main.temp)}°C`,
          description: currentData.weather[0].description,
          humidity: `${currentData.main.humidity}%`,
          wind: `${Math.round(currentData.wind.speed * 3.6)} km/h`
        },
        forecast: {
          today: {
            morning: {
              temperature: `${Math.round(forecastData.list[0].main.temp)}°C`,
              description: forecastData.list[0].weather[0].description
            },
            afternoon: {
              temperature: `${Math.round(forecastData.list[2].main.temp)}°C`,
              description: forecastData.list[2].weather[0].description
            },
            evening: {
              temperature: `${Math.round(forecastData.list[4].main.temp)}°C`,
              description: forecastData.list[4].weather[0].description
            },
            night: {
              temperature: `${Math.round(forecastData.list[6].main.temp)}°C`,
              description: forecastData.list[6].weather[0].description
            }
          },
          tomorrow: {
            morning: {
              temperature: `${Math.round(forecastData.list[8].main.temp)}°C`,
              description: forecastData.list[8].weather[0].description
            },
            afternoon: {
              temperature: `${Math.round(forecastData.list[10].main.temp)}°C`,
              description: forecastData.list[10].weather[0].description
            }
          }
        }
      };

      console.error(`[Weather Tool] Formatted weather data:`, JSON.stringify(weatherData, null, 2));

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

      console.error(`[Weather Tool] Final formatted response:`, formattedResponse);

      return {
        content: [
          {
            type: "text",
            text: formattedResponse
          }
        ]
      };
    } catch (error: any) {
      console.error(`[Weather Tool] Error occurred:`, error);
      console.error(`[Weather Tool] Error details:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // If API fails, fallback to search
      console.error(`[Weather Tool] Falling back to search...`);
      const searchResults = await braveSearch.search(`météo ${city} ${postalCode} aujourd'hui`);
      return {
        content: [
          {
            type: "text",
            text: `Je ne peux pas accéder aux données météorologiques en temps réel pour ${city}. Voici les liens vers les prévisions météo :\n\n${
              searchResults.map((result: any) => `- ${result.title}\n  ${result.url}`).join('\n')
            }`
          }
        ]
      };
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
    const searchResults = context?.searchResults || [];
    const prompt = `Here are some search results about "${message}":\n\n${
      searchResults.map((r) => `- ${r.title}\n  ${r.description}\n  ${r.url}`).join('\n\n')
    }\n\nPlease provide a comprehensive answer based on these results.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if ('text' in content) {
      return {
        content: [
          {
            type: "text",
            text: content.text
          }
        ]
      };
    }
    return {
      content: [
        {
          type: "text",
          text: "I apologize, but I couldn't generate a proper response."
        }
      ]
    };
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

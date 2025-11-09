/**
 * Configuration file for the MCP server
 */

export interface Config {
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  braveSearch: {
    apiKey: string;
    resultsCount: number;
  };
  openWeather: {
    apiKey: string;
    defaultCountry: string;
    defaultLanguage: string;
  };
}

/**
 * Loads and validates configuration from environment variables
 */
export function loadConfig(): Config {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const braveSearchApiKey = process.env.BRAVE_SEARCH_API_KEY;
  const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;

  if (!anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. Please set it in your .env file."
    );
  }

  if (!braveSearchApiKey) {
    throw new Error(
      "BRAVE_SEARCH_API_KEY is required. Please set it in your .env file."
    );
  }

  if (!openWeatherApiKey) {
    throw new Error(
      "OPENWEATHER_API_KEY is required. Please set it in your .env file."
    );
  }

  return {
    anthropic: {
      apiKey: anthropicApiKey,
      model: process.env.ANTHROPIC_MODEL || "claude-3-sonnet-20240229",
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "1000", 10),
    },
    braveSearch: {
      apiKey: braveSearchApiKey,
      resultsCount: parseInt(
        process.env.BRAVE_SEARCH_RESULTS_COUNT || "5",
        10
      ),
    },
    openWeather: {
      apiKey: openWeatherApiKey,
      defaultCountry: process.env.OPENWEATHER_DEFAULT_COUNTRY || "fr",
      defaultLanguage: process.env.OPENWEATHER_DEFAULT_LANGUAGE || "fr",
    },
  };
}


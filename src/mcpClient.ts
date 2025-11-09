import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";

import dotenv from "dotenv";

dotenv.config(); // load environment variables from .env

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";
const ANTHROPIC_EXTRACTION_MODEL = process.env.ANTHROPIC_EXTRACTION_MODEL || "claude-3-haiku-20240307";
const ANTHROPIC_MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || "1000", 10);
const ANTHROPIC_EXTRACTION_MAX_TOKENS = parseInt(process.env.ANTHROPIC_EXTRACTION_MAX_TOKENS || "100", 10);

if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set. Please set it in your .env file.");
}

class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    // Initialize Anthropic client and MCP client
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  async connectToServer(serverScriptPath: string) {
    try {
      // Determine script type and appropriate command
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;

      // Initialize transport and connect to server
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);

      // List available tools
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name),
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  private async isWeatherQuery(query: string): Promise<boolean> {
    // Use Claude to determine if this is a real weather query that needs current weather data
    // vs a question about meteorology as a subject (e.g., "formation en météo")
    const detectionPrompt = `You are a weather query classifier. Determine if this query is asking for CURRENT WEATHER DATA or WEATHER FORECASTS for a specific location.

CRITICAL RULES:
- TRUE only if asking for ACTUAL WEATHER CONDITIONS (temperature, rain, sun, wind, etc.) for a location
- FALSE if asking about meteorology as a SUBJECT (courses, training, education, how it works, history, etc.)
- FALSE if asking about weather-related services, schools, or institutions
- The presence of a location name does NOT make it a weather query if it's about education/training

Examples of TRUE (needs CURRENT weather data):
- "météo à Paris" → asking for current weather
- "quel temps fait-il à Lyon?" → asking for current weather conditions
- "dois-je prendre un parapluie pour aller à Marseille?" → asking about current weather to decide
- "prévisions météo pour Nice" → asking for weather forecast
- "y a-t-il du soleil à Paris?" → asking about current weather conditions
- "il pleut à Bordeaux?" → asking about current weather

Examples of FALSE (NOT asking for weather data - asking about meteorology as a subject):
- "quelle est la meilleure formation en météo" → asking about training/education
- "quelle est la meilleure formation météo à Paris" → asking about training/education in Paris
- "comment fonctionne la météorologie" → asking how meteorology works
- "qu'est-ce que la météo" → asking what meteorology is
- "histoire de la météo" → asking about history
- "école de météo à Paris" → asking about schools
- "formation météorologie" → asking about training/education

Query to classify: "${query}"

Return ONLY a JSON object:
{"isWeatherQuery": true/false, "reason": "brief explanation"}`;

    // Log the request sent to Claude with better formatting
    console.error(`[Client] 🔍 Weather detection request to Claude (${ANTHROPIC_EXTRACTION_MODEL}):`);
    console.error(`[Client]    Model: ${ANTHROPIC_EXTRACTION_MODEL}`);
    console.error(`[Client]    Max tokens: ${ANTHROPIC_EXTRACTION_MAX_TOKENS}`);
    console.error(`[Client]    Full prompt sent to Claude:`);
    console.error(`[Client]    ${'='.repeat(80)}`);
    console.error(detectionPrompt);
    console.error(`[Client]    ${'='.repeat(80)}`);

    // Build the request object
    const requestPayload = {
      model: ANTHROPIC_EXTRACTION_MODEL,
      max_tokens: ANTHROPIC_EXTRACTION_MAX_TOKENS,
      messages: [
        {
          role: "user" as const,
          content: detectionPrompt
        }
      ]
    };

    // Log the complete request as JSON
    console.error(`[Client] 📤 Complete request JSON:`);
    console.error(`[Client]    ${'='.repeat(80)}`);
    console.error(JSON.stringify(requestPayload, null, 2));
    console.error(`[Client]    ${'='.repeat(80)}`);

    try {
      const response = await this.anthropic.messages.create(requestPayload);

      // Log the raw response from Claude
      console.error(`[Client] 📥 Raw response from Claude:`);
      console.error(`[Client]    Response ID: ${response.id}`);
      console.error(`[Client]    Model: ${response.model}`);
      console.error(`[Client]    Stop reason: ${response.stop_reason}`);
      console.error(`[Client]    Usage: ${JSON.stringify(response.usage, null, 2)}`);

      const content = response.content[0];
      if (content.type === 'text') {
        const text = content.text.trim();
        console.error(`[Client]    Raw response text:`, text);
        
        // Try to extract and parse JSON from response
        const parsed = this.tryParseJSON(text);
        if (parsed) {
          if (parsed.isWeatherQuery === true) {
            console.error(`[Client] ✅ Weather query detected: ${parsed.reason || 'needs weather data'}`);
            return true;
          }
          // Detailed debug output explaining why it's not a weather query
          console.error(`[Client] ❌ NOT a weather query`);
          console.error(`[Client]    Query: "${query}"`);
          console.error(`[Client]    Reason: ${parsed.reason || 'does not need weather data'}`);
          console.error(`[Client]    Detection result: isWeatherQuery=${parsed.isWeatherQuery}`);
          console.error(`[Client]    Parsed JSON:`, JSON.stringify(parsed, null, 2));
          return false;
        } else {
          console.error(`[Client] ⚠️  Failed to parse weather detection response for query: "${query}"`);
          console.error(`[Client]    Raw response text:`, text);
        }
      }
    } catch (error) {
      console.error('[Client] Error detecting weather query with Claude:', error);
    }
    
    // Fallback: if Claude fails, use simple keyword detection but be more strict
    // Only trigger if there's a location indicator (à, pour, etc.)
    const hasLocationIndicator = /(?:à|pour|de|sur|en|a)\s+[a-zA-ZÀ-ÿ]+/i.test(query);
    const weatherKeywords = ['météo', 'temps', 'prévisions', 'température', 'weather', 'forecast'];
    const hasWeatherKeyword = weatherKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const fallbackResult = hasWeatherKeyword && hasLocationIndicator;
    console.error(`[Client] 🔄 Fallback detection for query: "${query}"`);
    console.error(`[Client]    Has weather keyword: ${hasWeatherKeyword}`);
    console.error(`[Client]    Has location indicator: ${hasLocationIndicator}`);
    console.error(`[Client]    Fallback result: ${fallbackResult ? 'IS weather query' : 'NOT weather query'}`);
    
    return fallbackResult;
  }

  /**
   * Helper function to safely extract and parse JSON from Claude's response
   * Handles various formats: markdown code blocks, plain JSON, or JSON with extra text
   */
  private tryParseJSON(text: string): any {
    // Try 1: Extract from markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1]);
      } catch (e) {
        // Continue to next method
      }
    }
    
    // Try 2: Find JSON object by matching balanced braces
    let braceCount = 0;
    let startIndex = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (startIndex === -1) startIndex = i;
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          const jsonCandidate = text.substring(startIndex, i + 1);
          try {
            return JSON.parse(jsonCandidate);
          } catch (e) {
            // Continue searching
            startIndex = -1;
          }
        }
      }
    }
    
    // Try 3: Simple regex match (less reliable but fallback)
    const simpleMatch = text.match(/\{[\s\S]*\}/);
    if (simpleMatch) {
      try {
        return JSON.parse(simpleMatch[0]);
      } catch (e) {
        // Last resort: try to fix common JSON issues
        try {
          // Remove trailing commas and fix common issues
          let fixed = simpleMatch[0]
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/'/g, '"'); // Replace single quotes with double quotes
          return JSON.parse(fixed);
        } catch (e2) {
          console.error('[Client] Failed to parse JSON even after fixes:', e2);
        }
      }
    }
    
    return null;
  }

  private async extractCityAndPostalCode(query: string): Promise<{ city: string; postalCode: string } | null> {
    // Use Claude to extract city and postal code from the query
    const extractionPrompt = `Extract the city name and optional postal code from this weather query. 
Return ONLY a valid JSON object with "city" and "postalCode" fields. 
If no postal code is mentioned, use an empty string for postalCode.
Ignore temporal words like "aujourd'hui", "demain", "maintenant", etc.
Return null if no city can be extracted.

Query: "${query}"

Response format (JSON only, no other text):
{"city": "city name", "postalCode": "postal code or empty string"}`;

    try {
      // Use a faster, cheaper model for extraction (Haiku) to reduce latency and cost
      const response = await this.anthropic.messages.create({
        model: ANTHROPIC_EXTRACTION_MODEL,
        max_tokens: ANTHROPIC_EXTRACTION_MAX_TOKENS,
        messages: [
          {
            role: "user",
            content: extractionPrompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const text = content.text.trim();
        
        // Use helper function to safely parse JSON
        const parsed = this.tryParseJSON(text);
        
        if (parsed) {
          // Handle null response
          if (parsed === null || parsed.city === null) {
            return null;
          }
          
          // Validate and return
          if (parsed.city && typeof parsed.city === 'string' && parsed.city.trim().length > 0) {
            return {
              city: parsed.city.trim(),
              postalCode: parsed.postalCode && typeof parsed.postalCode === 'string' 
                ? parsed.postalCode.trim() 
                : ''
            };
          }
        } else {
          console.error('[Client] Failed to parse Claude extraction response');
          console.error('[Client] Response text:', text);
        }
      }
    } catch (error) {
      console.error('[Client] Error extracting location with Claude:', error);
    }
    
    return null;
  }

  async processQuery(query: string) {
    const messages: MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    // Check if it's a weather query
    if (await this.isWeatherQuery(query)) {
      const location = await this.extractCityAndPostalCode(query);
      if (location) {
        try {
          console.error(`[Client] Calling weather tool for ${location.city}${location.postalCode ? ` (${location.postalCode})` : ''}`);
          const result = await this.mcp.callTool({
            name: "weather",
            arguments: location
          });
          console.error(`[Client] Weather tool response:`, result);
          
          if (result.content && Array.isArray(result.content) && result.content.length > 0) {
            const weatherData = result.content[0].text;
            
            // Pass the weather data to Claude to generate a contextual response
            // This allows Claude to answer the actual question (e.g., "should I take an umbrella?")
            // instead of just returning raw weather data
            const contextualPrompt = `The user asked: "${query}"

Here is the weather data for ${location.city}:
${weatherData}

Please provide a helpful answer to the user's question based on this weather information. Be conversational and directly address their question.`;

            const contextualResponse = await this.anthropic.messages.create({
              model: ANTHROPIC_MODEL,
              max_tokens: ANTHROPIC_MAX_TOKENS,
              messages: [
                {
                  role: "user",
                  content: contextualPrompt
                }
              ]
            });

            if (contextualResponse.content[0].type === "text") {
              return contextualResponse.content[0].text;
            }
            
            // Fallback to raw weather data if Claude fails
            return weatherData;
          }
        } catch (error) {
          console.error("[Client] Error calling weather tool:", error);
        }
      } else {
        console.error('[Client] Could not extract city from query, falling back to Claude');
      }
    }

    // If not a weather query or weather tool failed, proceed with Claude
    const response = await this.anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages,
      tools: this.tools,
    });

    // Process response and handle tool calls
    const finalText = [];
    const toolResults = [];

    for (const content of response.content) {
      if (content.type === "text") {
        finalText.push(content.text);
      } else if (content.type === "tool_use") {
        // Execute tool call
        const toolName = content.name;
        const toolArgs = content.input as { [x: string]: unknown } | undefined;

        console.error(`[Client] Calling tool ${toolName} with args:`, toolArgs);
        const result = await this.mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });
        console.error(`[Client] Tool ${toolName} response:`, result);
        
        toolResults.push(result);
        
        if (result.content && Array.isArray(result.content) && result.content.length > 0) {
          finalText.push(result.content[0].text);
        }

        // Continue conversation with tool results
        messages.push({
          role: "user",
          content: result.content as string,
        });

        // Get next response from Claude
        const response = await this.anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: ANTHROPIC_MAX_TOKENS,
          messages,
        });

        if (response.content[0].type === "text") {
          finalText.push(response.content[0].text);
        }
      }
    }

    return finalText.join("\n");
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }
        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node dist/mcpClient.js <path_to_server_script>");
    return;
  }
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main(); 
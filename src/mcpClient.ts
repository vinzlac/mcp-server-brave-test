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
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
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

  private isWeatherQuery(query: string): boolean {
    const weatherKeywords = [
      'météo', 'temps', 'prévisions', 'température', 'pluie', 'soleil',
      'neige', 'vent', 'humidité', 'climat', 'weather', 'forecast'
    ];
    return weatherKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private extractCityAndPostalCode(query: string): { city: string; postalCode: string } | null {
    // Simple extraction for now - can be improved with NLP
    const cityMatch = query.match(/(?:à|de|pour|sur|a|en)\s+([a-zA-ZÀ-ÿ\s]+)/i);
    if (cityMatch) {
      const city = cityMatch[1].trim();
      // Default postal code for Chelles
      if (city.toLowerCase() === 'chelles') {
        return { city: 'chelles', postalCode: '77500' };
      }
      // For other cities, use the city name without postal code
      // OpenWeatherMap can handle city names without postal codes
      return { city: city, postalCode: '' };
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
    if (this.isWeatherQuery(query)) {
      const location = this.extractCityAndPostalCode(query);
      if (location) {
        try {
          console.error(`[Client] Calling weather tool for ${location.city}`);
          const result = await this.mcp.callTool({
            name: "weather",
            arguments: location
          });
          console.error(`[Client] Weather tool response:`, result);
          if (result.content && Array.isArray(result.content) && result.content.length > 0) {
            return result.content[0].text;
          }
        } catch (error) {
          console.error("[Client] Error calling weather tool:", error);
        }
      }
    }

    // If not a weather query or weather tool failed, proceed with Claude
    const response = await this.anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
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
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 1000,
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
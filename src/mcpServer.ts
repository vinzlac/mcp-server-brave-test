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

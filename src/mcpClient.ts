import { Anthropic } from '@anthropic-ai/sdk';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

class MCPClient {
  private anthropic: Anthropic;
  private braveSearchApiKey: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY || !process.env.BRAVE_SEARCH_API_KEY) {
      throw new Error('API keys not found in environment variables');
    }

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.braveSearchApiKey = process.env.BRAVE_SEARCH_API_KEY;
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.braveSearchApiKey
        },
        params: {
          q: query
        }
      });

      return response.data.web.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description
      }));
    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  }

  async chat(message: string, searchResults: SearchResult[]): Promise<string> {
    try {
      const searchContext = searchResults
        .map(result => `Title: ${result.title}\nURL: ${result.url}\nDescription: ${result.description}`)
        .join('\n\n');

      const prompt = `Here are some search results to help answer the user's question:\n\n${searchContext}\n\nUser question: ${message}\n\nPlease provide a helpful response based on the search results above.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }
}

export default MCPClient; 
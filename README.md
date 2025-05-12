# MCP Server with Brave Search and Anthropic Claude

This project is a Model Context Protocol (MCP) server that uses Brave Search for web search and Anthropic Claude for analysis and response generation.

## Features

- 🔍 Web search via Brave Search API
- 🤖 Analysis and response generation with Claude 3 Sonnet
- 🌐 MCP-compliant server implementation
- 💬 Support for search and chat capabilities

## Prerequisites

- Node.js (version 14 or higher)
- Brave Search API key
- Anthropic API key

## Installation

1. Clone the repository:
```bash
git clone <your-repo>
cd mcp-server-brave-test
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
PORT=3000  # Optional, defaults to 3000
```

## Usage

### Starting the Server

To start the MCP server:

```bash
# First, build the project
npm run build

# Then start the server
npm start
```

The server will be available at http://localhost:3000

### Using the Client

To use the MCP client:

```bash
# Make sure the server is running first
# Then in a new terminal, run:
npm run client
```

The client will automatically connect to the running server and start an interactive session.

### MCP Endpoints

The server implements the following MCP capabilities:

#### Search Capability
```http
POST /search
Content-Type: application/json

{
  "query": "your search query"
}
```

Response:
```json
{
  "results": [
    {
      "title": "Result title",
      "url": "https://example.com",
      "description": "Result description"
    }
  ]
}
```

#### Chat Capability
```http
POST /chat
Content-Type: application/json

{
  "message": "your question",
  "context": {
    "searchResults": [
      {
        "title": "Result title",
        "url": "https://example.com",
        "description": "Result description"
      }
    ]
  }
}
```

Response:
```json
{
  "response": "Claude's response based on the search results"
}
```

## Development

- Build the project:
```bash
npm run build
```

- Start in development mode (with auto-reload):
```bash
npm run dev
```

## Project Structure

```
mcp-server-brave-test/
├── src/
│   ├── mcpServer.ts  # MCP server implementation
│   └── mcpClient.ts  # MCP client implementation
├── dist/
│   ├── mcpServer.js  # Compiled server
│   └── mcpClient.js  # Compiled client
├── .env             # Environment variables
├── package.json
└── tsconfig.json
```

## License

ISC

## Contributing

Contributions are welcome! Feel free to:
1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request 
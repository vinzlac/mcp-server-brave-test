import MCPClient from './mcpClient';

async function main() {
  try {
    const client = new MCPClient();
    
    // Exemple de recherche
    const searchQuery = "What is the Model Context Protocol?";
    console.log('Performing search for:', searchQuery);
    const searchResults = await client.search(searchQuery);
    
    // Exemple de chat avec les résultats de recherche
    const userQuestion = "Can you explain what MCP is and how it works?";
    console.log('\nUser question:', userQuestion);
    const response = await client.chat(userQuestion, searchResults);
    
    console.log('\nClaude\'s response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 
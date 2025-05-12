import MCPClient from './mcpClient';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    const client = new MCPClient();
    
    console.log('Bienvenue dans le client MCP !');
    console.log('--------------------------------');
    
    while (true) {
      const searchQuery = await askQuestion('\nEntrez votre question de recherche (ou "exit" pour quitter) : ');
      
      if (searchQuery.toLowerCase() === 'exit') {
        break;
      }
      
      console.log('\nRecherche en cours...');
      const searchResults = await client.search(searchQuery);
      
      console.log(`\n${searchResults.length} résultats trouvés.`);
      
      const followUpQuestion = await askQuestion('\nQuelle question voulez-vous poser à Claude sur ces résultats ? ');
      
      console.log('\nGénération de la réponse...');
      const response = await client.chat(followUpQuestion, searchResults);
      
      console.log('\nRéponse de Claude :');
      console.log('------------------');
      console.log(response);
    }
    
    rl.close();
  } catch (error) {
    console.error('Erreur:', error);
    rl.close();
  }
}

main(); 
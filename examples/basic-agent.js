const { Agent } = require('../src/core');

async function runBasicAgent() {
  console.log("Starting CortexAgent Framework test...");
  
  // Create a basic agent configuration
  const agentConfig = {
    id: 'test-agent',
    perception: {
      sensors: [
        { type: 'text' }
      ]
    },
    cognition: {
      llm: {
        providerType: 'openai',
        openai: {
          apiKey: 'your-api-key-here',  // Replace with your API key
          model: 'gpt-4'
        }
      }
    }
  };
  
  // Create and initialize the agent
  const agent = new Agent(agentConfig);
  
  console.log("Agent status:", agent.getStatus());
  
  // Process a simple input
  try {
    console.log("Processing input...");
    const result = await agent.process("Hello, what can you do?");
    console.log("Processing complete!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error processing input:", error);
  }
}

runBasicAgent().catch(console.error);
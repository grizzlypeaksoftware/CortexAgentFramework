// examples/ai-agent-example.js
const { Agent } = require('../src/core/Agent');

async function runExample() {
  console.log('Initializing AI Agent with LLM integration...');
  
  // Create agent configuration
  const agentConfig = {
    id: 'assistant-agent',
    
    // LLM configuration (replace API keys with your own)
    cognition: {
      llm: {
        providerType: 'openai', // or 'anthropic'
        openai: {
          apiKey: 'your-api-key-here',
          model: 'gpt-4o-mini',
          defaultOptions: {
            temperature: 0.5,
            max_tokens: 1500
          }
        },
        anthropic: {
          apiKey: 'your-api-key-here',
          model: 'claude-3-opus-20240229',
          defaultOptions: {
            temperature: 0.5,
            max_tokens: 1500
          }
        },
        prompts: {
          templates: {
            // Custom prompt templates
            reasoning: "You are an AI assistant analyzing data. Context: {context}\n\nProvide insights about: {question}",
            planning: "You are an AI assistant creating a plan. Goal: {goal}\nContext: {constraints}\n\nCreate a detailed step-by-step plan."
          }
        }
      }
    },
    
    // Memory configuration
    memory: {
      limits: {
        episodicMemory: 100 // Store up to 100 episodes
      }
    }
  };
  
  // Create and initialize the agent
  const agent = new Agent(agentConfig);
  
  // Set up event listeners
  setupEventListeners(agent);
  
  try {
    // Example 1: Process a simple text query
    console.log('\n--- Example 1: Simple Query ---');
    const result1 = await agent.process('What is the capital of France?');
    console.log('Agent response:', result1.actionResult.output);
    
    // Example 2: Process a command
    console.log('\n--- Example 2: Command Processing ---');
    const result2 = await agent.process('Calculate the sum of 42 and 18');
    console.log('Agent response:', result2.actionResult.output);
    
    // Example 3: Conversational interaction
    console.log('\n--- Example 3: Conversation ---');
    const result3 = await agent.process('Hello! How are you today?');
    console.log('Agent response:', result3.actionResult.output);
    
    // Example 4: Complex reasoning task
    console.log('\n--- Example 4: Complex Reasoning ---');
    const complexQuery = `
      Analyze the following data:
      - Company A grew by 15% year-over-year
      - Company B grew by 8% year-over-year
      - Industry average growth was 5%
      - Company A had starting revenue of $10M
      - Company B had starting revenue of $25M
      
      Which company had higher absolute growth in dollars?
    `;
    const result4 = await agent.process(complexQuery);
    console.log('Agent response:', result4.actionResult.output);
    
    // Print memory stats
    console.log('\n--- Memory Statistics ---');
    console.log(agent.memorySystem.getMemoryStats());
    
  } catch (error) {
    console.error('Error running agent:', error);
  }
}

function setupEventListeners(agent) {
  // Core agent events
  agent.eventBus.on('agent:initialized', (data) => {
    console.log(`Agent initialized: ${data.id}`);
  });
  
  agent.eventBus.on('cycle:start', (data) => {
    console.log(`Processing cycle started at ${new Date(data.timestamp).toISOString()}`);
  });
  
  agent.eventBus.on('cycle:complete', (data) => {
    console.log(`Processing cycle completed`);
  });
  
  // Perception events
  agent.eventBus.on('perception:start', (data) => {
    console.log(`Perception started`);
  });
  
  agent.eventBus.on('perception:complete', (data) => {
    console.log(`Perception completed: ${data.perceptions.length} perceptions processed`);
  });
  
  // Cognition events
  agent.eventBus.on('cognition:reasoning:complete', (data) => {
    console.log(`Reasoning completed`);
    
    // Log LLM analysis if available
    if (data.analysis.llmAnalysis) {
      console.log(`LLM enhanced reasoning applied`);
    }
  });
  
  agent.eventBus.on('cognition:planning:complete', (data) => {
    console.log(`Planning completed: ${data.plan.actionSequence.length} actions planned`);
    
    // Log LLM plan if available
    if (data.plan.llmPlan) {
      console.log(`LLM enhanced planning applied (score: ${data.plan.evaluationScore || 'N/A'})`);
    }
  });
  
  // Action events
  agent.eventBus.on('action:execute:start', (data) => {
    console.log(`Action execution started: ${data.plan.length} actions to execute`);
  });
  
  agent.eventBus.on('action:step:start', (data) => {
    console.log(`Executing action ${data.step}: ${data.action.type}`);
  });
  
  agent.eventBus.on('action:step:complete', (data) => {
    console.log(`Completed action ${data.step}: ${data.action.type}`);
  });
  
  agent.eventBus.on('action:execute:complete', (data) => {
    console.log(`Action execution completed in ${data.executionTime}ms`);
  });
  
  // Error events
  agent.eventBus.on('error', (data) => {
    console.error(`Error in ${data.phase}: ${data.error.message}`);
  });
}

// Run the example
runExample().catch(console.error);
// src/cognition/llm/LLMService.js
class LLMService {
    constructor(config = {}) {
      this.config = config;
      this.provider = null;
      this.promptManager = null;
      this.responseParser = null;
      this.initialize(config);
    }
    
    initialize(config = {}) {
      // Import necessary classes
      const PromptManager = require('./PromptManager');
      const ResponseParser = require('./ResponseParser');
      
      // Create prompt manager and response parser
      this.promptManager = new PromptManager(config.prompts || {});
      this.responseParser = new ResponseParser(config.parsing || {});
      
      // Create the appropriate provider based on config
      const providerType = config.providerType || 'openai';
      this._initializeProvider(providerType, config);
    }
    
    _initializeProvider(providerType, config) {
      try {
        // Dynamic import of provider
        const providerPath = `./providers/${providerType.charAt(0).toUpperCase() + providerType.slice(1)}Provider`;
        const ProviderClass = require(providerPath);
        
        // Create provider instance
        this.provider = new ProviderClass(config[providerType] || {});
        console.log(`Initialized LLM provider: ${providerType}`);
      } catch (error) {
        console.error(`Failed to initialize LLM provider ${providerType}:`, error);
        // Fallback to OpenAI if available
        if (providerType !== 'openai') {
          console.log('Falling back to OpenAI provider');
          this._initializeProvider('openai', config);
        } else {
          throw new Error(`Cannot initialize any LLM provider: ${error.message}`);
        }
      }
    }
    
    async query(promptName, variables, options = {}) {
      if (!this.provider) {
        throw new Error('No LLM provider initialized');
      }
      
      try {
        // Create prompt from template
        const promptText = this.promptManager.createPrompt(promptName, variables);
        
        // Send to LLM provider
        const rawResponse = await this.provider.complete(promptText, options);
        
        // Parse response
        const parseFormat = options.parseFormat || 'text';
        return this.responseParser.parse(rawResponse, parseFormat);
      } catch (error) {
        console.error(`LLM query failed for prompt "${promptName}":`, error);
        throw error;
      }
    }
    
    async reason(context, question) {
      return this.query('reasoning', { context, question }, { parseFormat: 'json' });
    }
    
    async plan(goal, constraints, resources) {
      return this.query('planning', { goal, constraints, resources }, { parseFormat: 'steps' });
    }
    
    async evaluate(plan, criteria) {
      return this.query('evaluation', { plan, criteria }, { parseFormat: 'score' });
    }
    
    async summarize(text) {
      return this.query('summarization', { text }, { parseFormat: 'text' });
    }
    
    async generate(description, type = 'text') {
      return this.query('generation', { description, type }, { parseFormat: type });
    }
  }
  

module.exports = LLMService;


// src/action/ActionSystem.js
const { Component } = require('../core/Component');

class ActionSystem extends Component {
  constructor(config = {}) {
    super('action');
    this.skills = new Map();
    this.formatters = new Map();
    this.errorHandlers = [];
    this.initialize(config);
  }
  
  initialize(config = {}) {
    if (this.initialized) return;
    super.initialize(config);
    
    // Register default skills
    this._registerDefaultSkills();
    
    // Register default formatters
    this._registerDefaultFormatters();
    
    // Register custom skills from config
    if (config.skills) {
      for (const skillData of config.skills) {
        this.registerSkill(skillData.name, skillData.handler);
      }
    }
    
    // Register error handlers
    if (config.errorHandlers) {
      for (const handler of config.errorHandlers) {
        this.registerErrorHandler(handler);
      }
    }
    
    this.emit('action:initialized', { 
      skills: Array.from(this.skills.keys()),
      formatters: Array.from(this.formatters.keys())
    });
  }
  
  _registerDefaultSkills() {
    // Basic skills for handling common action types
    this.registerSkill('retrieveInformation', this._retrieveInformation.bind(this));
    this.registerSkill('formatResponse', this._formatResponse.bind(this));
    this.registerSkill('parseCommand', this._parseCommand.bind(this));
    this.registerSkill('executeAction', this._executeAction.bind(this));
    this.registerSkill('reportResult', this._reportResult.bind(this));
    this.registerSkill('generateAcknowledgement', this._generateAcknowledgement.bind(this));
    this.registerSkill('generateConversationalResponse', this._generateConversationalResponse.bind(this));
    this.registerSkill('searchKnowledge', this._searchKnowledge.bind(this));
    this.registerSkill('compileResults', this._compileResults.bind(this));
    this.registerSkill('parseTask', this._parseTask.bind(this));
    this.registerSkill('executeProcedure', this._executeProcedure.bind(this));
    this.registerSkill('verifyCompletion', this._verifyCompletion.bind(this));
    this.registerSkill('noop', this._noop.bind(this));
  }
  
  _registerDefaultFormatters() {
    // Output formatters for different response types
    this.registerFormatter('text', (data) => typeof data === 'string' ? data : JSON.stringify(data));
    this.registerFormatter('json', (data) => JSON.stringify(data, null, 2));
    this.registerFormatter('html', (data) => `<pre>${JSON.stringify(data, null, 2)}</pre>`);
    this.registerFormatter('markdown', (data) => {
      if (typeof data === 'string') return data;
      return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    });
  }
  
  registerSkill(name, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Skill handler for "${name}" must be a function`);
    }
    this.skills.set(name, handler);
    return this;
  }
  
  registerFormatter(name, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Formatter handler for "${name}" must be a function`);
    }
    this.formatters.set(name, handler);
    return this;
  }
  
  registerErrorHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Error handler must be a function');
    }
    this.errorHandlers.push(handler);
    return this;
  }
  
  format(data, formatType = 'text') {
    const formatter = this.formatters.get(formatType) || this.formatters.get('text');
    return formatter(data);
  }
  
  async execute(plan) {
    if (!plan || !Array.isArray(plan)) {
      return { success: false, error: 'Invalid action plan' };
    }
    
    this.emit('action:execute:start', { plan });
    
    // Create execution context to track state
    const context = {
      results: {},
      currentStep: 0,
      startTime: Date.now(),
      success: true,
      output: null
    };
    
    try {
      // Execute each action in sequence
      for (const action of plan) {
        context.currentStep++;
        await this._executeAction(action, context);
      }
      
      // Determine final output from the context
      context.output = this._determineFinalOutput(context);
      
      this.emit('action:execute:complete', context);
      return {
        success: context.success,
        results: context.results,
        output: context.output,
        executionTime: Date.now() - context.startTime
      };
    } catch (error) {
      return this._handleExecutionError(error, context);
    }
  }
  
  _handleExecutionError(error, context) {
    this.emit('action:execute:error', { error, context });
    
    return {
      success: false,
      error: error.message,
      partialResults: context.results,
      executionTime: Date.now() - context.startTime,
      failedStep: context.currentStep
    };
  }
  
  _determineFinalOutput(context) {
    // Find the last result that should be presented as output
    // First look for formatResponse results
    const resultIds = Object.keys(context.results);
    
    // Check for formatResponse results
    for (const id of resultIds.reverse()) {
      if (id.includes('formatResponse')) {
        return context.results[id];
      }
    }
    
    // Check for reportResult results
    for (const id of resultIds.reverse()) {
      if (id.includes('reportResult')) {
        return context.results[id];
      }
    }
    
    // Otherwise return the last result
    if (resultIds.length > 0) {
      return context.results[resultIds[resultIds.length - 1]];
    }
    
    return null;
  }
  
  // Default skill implementations
  async _retrieveInformation(parameters) {
    const { query } = parameters;
    
    // In a real implementation, this would query a knowledge base
    // For now, just return a placeholder response
    return {
      type: 'information',
      query,
      content: `Information about: ${query}`,
      sources: []
    };
  }
  
  async _formatResponse(parameters, context) {
    const { format = 'text' } = parameters;
    
    // Get the most recent result to format
    const resultIds = Object.keys(context.results);
    const lastResult = resultIds.length > 0 ? context.results[resultIds[resultIds.length - 1]] : null;
    
    if (!lastResult) {
      return "No information to format.";
    }
    
    // Apply formatter
    return this.format(lastResult, format);
  }
  
  async _parseCommand(parameters) {
    const { commandText } = parameters;
    
    // Simple command parsing
    const words = commandText.split(/\s+/);
    const command = words[0]?.toLowerCase();
    const args = words.slice(1);
    
    return {
      command,
      arguments: args,
      original: commandText
    };
  }
  
  async _executeAction(parameters) {
    const { action = 'unknown' } = parameters;
    
    // Placeholder for action execution
    return {
      action,
      status: 'completed',
      message: `Executed action: ${action}`
    };
  }
  
  async _reportResult(parameters, context) {
    const { format = 'text' } = parameters;
    
    // Get the most recent result to report
    const resultIds = Object.keys(context.results);
    const lastResult = resultIds.length > 0 ? context.results[resultIds[resultIds.length - 1]] : null;
    
    if (!lastResult) {
      return "No results to report.";
    }
    
    // Apply formatter and wrap in a report
    const formattedResult = this.format(lastResult, format);
    return `Result: ${formattedResult}`;
  }
  
  async _generateAcknowledgement(parameters) {
    const { message = '', sentiment = 'neutral' } = parameters;
    
    // Generate acknowledgement based on sentiment
    const acknowledgements = {
      positive: [
        "Great! I've noted that.",
        "Excellent! I understand.",
        "Perfect! I've got it."
      ],
      neutral: [
        "I understand.",
        "Noted.",
        "I've recorded that information."
      ],
      negative: [
        "I understand your concern.",
        "I'll take note of that issue.",
        "I acknowledge the problem."
      ]
    };
    
    // Select random acknowledgement based on sentiment
    const options = acknowledgements[sentiment] || acknowledgements.neutral;
    const randomIndex = Math.floor(Math.random() * options.length);
    
    return options[randomIndex] + (message ? ` ${message}` : '');
  }
  
  async _generateConversationalResponse(parameters) {
    const { topic = '', tone = 'friendly' } = parameters;
    
    // Simple conversational responses
    if (!topic) {
      return "I'm here to help. What would you like to talk about?";
    }
    
    return `That's an interesting point about ${topic}. Would you like to discuss it further?`;
  }
  
  async _searchKnowledge(parameters) {
    const { topic = '' } = parameters;
    
    // Placeholder for knowledge search
    return {
      topic,
      results: [`Information about ${topic}`],
      count: 1
    };
  }
  
  async _compileResults(parameters, context) {
    // Get search results from context
    let searchResults = [];
    for (const id in context.results) {
      const result = context.results[id];
      if (result && result.results) {
        searchResults = searchResults.concat(result.results);
      }
    }
    
    return {
      compiledResults: searchResults,
      count: searchResults.length,
      summary: `Found ${searchResults.length} results`
    };
  }
  
  async _parseTask(parameters) {
    const { task = '' } = parameters;
    
    // Simple task parsing
    const components = task.split(/\s+and\s+/i);
    
    return {
      taskComponents: components,
      count: components.length,
      original: task
    };
  }
  
  async _executeProcedure(parameters) {
    const { procedure = '', args = [] } = parameters;
    
    // Placeholder for procedure execution
    return {
      procedure,
      arguments: args,
      status: 'completed',
      message: `Executed procedure: ${procedure}`
    };
  }
  
  async _verifyCompletion(parameters, context) {
    // Check the status of previous procedures
    let allCompleted = true;
    const procedures = [];
    
    for (const id in context.results) {
      const result = context.results[id];
      if (result && result.status) {
        procedures.push({
          id,
          status: result.status
        });
        
        if (result.status !== 'completed') {
          allCompleted = false;
        }
      }
    }
    
    return {
      verified: allCompleted,
      procedures,
      message: allCompleted ? 'All procedures completed successfully' : 'Some procedures did not complete'
    };
  }
  
  async _noop() {
    // No operation, just return a success indicator
    return { success: true, message: 'No action required' };
  }
}

module.exports = ActionSystem;
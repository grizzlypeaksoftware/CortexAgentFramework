// src/cognition/CognitiveSystem.js
const { Component } = require('../core/Component');

class CognitiveSystem extends Component {
  constructor(config = {}) {
    super('cognition');
    this.reasoningModule = null;
    this.planningModule = null;
    this.llmService = null;
    this.initialize(config);
  }
  
  initialize(config = {}) {
    if (this.initialized) return;
    super.initialize(config);
    
    // Import necessary modules
    const ReasoningModule = require('./reasoning/ReasoningModule');
    const PlanningModule = require('./planning/PlanningModule');
    const LLMService = require('./llm/LLMService');
    
    // Initialize LLM service if configured
    if (config.llm) {
      this.llmService = new LLMService(config.llm);
    }
    
    // Initialize reasoning module
    this.reasoningModule = new ReasoningModule(config.reasoning || {});
    if (this.llmService) {
      this.reasoningModule.setLLMService(this.llmService);
    }
    
    // Initialize planning module
    this.planningModule = new PlanningModule(config.planning || {});
    if (this.llmService) {
      this.planningModule.setLLMService(this.llmService);
    }
    
    this.emit('cognition:initialized', { 
      hasLLM: !!this.llmService,
      reasoning: !!this.reasoningModule,
      planning: !!this.planningModule
    });
  }
  
  setReasoningModule(module) {
    this.reasoningModule = module;
    if (this.llmService) {
      this.reasoningModule.setLLMService(this.llmService);
    }
  }
  
  setPlanningModule(module) {
    this.planningModule = module;
    if (this.llmService) {
      this.planningModule.setLLMService(this.llmService);
    }
  }
  
  setLLMService(service) {
    this.llmService = service;
    
    if (this.reasoningModule) {
      this.reasoningModule.setLLMService(service);
    }
    
    if (this.planningModule) {
      this.planningModule.setLLMService(service);
    }
  }
  
  async enhanceReasoning(perceivedData, initialAnalysis) {
    if (!this.llmService) return initialAnalysis;
    
    try {
      return await this.reasoningModule.enhanceWithLLM(perceivedData, initialAnalysis);
    } catch (error) {
      this.emit('cognition:llm:error', { phase: 'reasoning', error });
      return initialAnalysis;
    }
  }
  
  async generatePlan(reasoningResults, initialPlan) {
    if (!this.llmService) return initialPlan;
    
    try {
      return await this.planningModule.enhanceWithLLM(reasoningResults, initialPlan);
    } catch (error) {
      this.emit('cognition:llm:error', { phase: 'planning', error });
      return initialPlan;
    }
  }
  
  async process(perceivedData) {
    this.emit('cognition:process:start', { perceivedData });
    
    try {
      // 1. Reasoning phase
      const initialAnalysis = this.reasoningModule.analyze(perceivedData);
      this.emit('cognition:reasoning:initial', { analysis: initialAnalysis });
      
      // 2. Enhance reasoning with LLM if available
      const enhancedAnalysis = await this.enhanceReasoning(perceivedData, initialAnalysis);
      this.emit('cognition:reasoning:complete', { analysis: enhancedAnalysis });
      
      // 3. Planning phase
      const initialPlan = this.planningModule.createPlan(enhancedAnalysis);
      this.emit('cognition:planning:initial', { plan: initialPlan });
      
      // 4. Enhance planning with LLM if available
      const enhancedPlan = await this.generatePlan(enhancedAnalysis, initialPlan);
      this.emit('cognition:planning:complete', { plan: enhancedPlan });
      
      // 5. Return the final cognitive result
      const result = {
        analysis: enhancedAnalysis,
        plan: enhancedPlan
      };
      
      this.emit('cognition:process:complete', result);
      return result;
    } catch (error) {
      this.emit('cognition:process:error', { error, perceivedData });
      throw error;
    }
  }
}

// src/cognition/reasoning/ReasoningModule.js
class ReasoningModule {
  constructor(config = {}) {
    this.config = config;
    this.llmService = null;
    this.patternMatcher = new PatternMatcher(config.patternMatcher || {});
    this.classifier = new Classifier(config.classifier || {});
    this.inferenceEngine = new InferenceEngine(config.inferenceEngine || {});
  }
  
  setLLMService(llmService) {
    this.llmService = llmService;
  }
  
  analyze(perceivedData) {
    // Use traditional analysis methods
    const patterns = this.patternMatcher.findPatterns(perceivedData);
    const classification = this.classifier.classify(perceivedData);
    const inferences = this.inferenceEngine.infer(perceivedData, patterns);
    
    return { patterns, classification, inferences };
  }
  
  async enhanceWithLLM(perceivedData, initialAnalysis) {
    if (!this.llmService) return initialAnalysis;
    
    try {
      // Extract the main text content for the LLM
      let contextText = '';
      if (perceivedData.perceptions) {
        const textPerceptions = perceivedData.perceptions.filter(p => p.type === 'text');
        if (textPerceptions.length > 0) {
          contextText = textPerceptions.map(p => p.value).join("\n\n");
        } else {
          contextText = JSON.stringify(perceivedData);
        }
      } else {
        contextText = JSON.stringify(perceivedData);
      }
      
      // Use LLM to enhance reasoning
      const enhancedAnalysis = await this.llmService.reason(
        contextText,
        `Analyze this data with respect to: ${JSON.stringify(initialAnalysis)}`
      );
      
      return {
        ...initialAnalysis,
        llmAnalysis: enhancedAnalysis
      };
    } catch (error) {
      console.error('LLM reasoning enhancement failed:', error);
      return initialAnalysis; // Fallback to traditional analysis
    }
  }
}

// Pattern Matcher - Simple implementation for identifying patterns in data
class PatternMatcher {
  constructor(config = {}) {
    this.patterns = config.patterns || [];
    
    // Add default patterns if none provided
    if (this.patterns.length === 0) {
      this.patterns = [
        { name: 'question', regex: /\?$/i },
        { name: 'command', regex: /^(please|could you|can you|)?\s*(show|find|get|calculate|analyze)/i },
        { name: 'greeting', regex: /^(hi|hello|hey|greetings)/i }
      ];
    }
  }
  
  findPatterns(perceivedData) {
    const results = [];
    
    // Get text content from perceptions
    let textContent = '';
    if (perceivedData.perceptions) {
      const textPerceptions = perceivedData.perceptions.filter(p => p.type === 'text');
      if (textPerceptions.length > 0) {
        textContent = textPerceptions.map(p => p.value).join(' ');
      }
    } else if (typeof perceivedData === 'string') {
      textContent = perceivedData;
    } else if (perceivedData.raw && typeof perceivedData.raw === 'string') {
      textContent = perceivedData.raw;
    }
    
    // Apply all patterns to the text
    for (const pattern of this.patterns) {
      if (pattern.regex.test(textContent)) {
        results.push({
          patternName: pattern.name,
          confidence: 1.0, // Simple binary match
          metadata: { pattern: pattern.name }
        });
      }
    }
    
    return results;
  }
}

// Classifier - Simple implementation for classifying inputs
class Classifier {
  constructor(config = {}) {
    this.categories = config.categories || [
      'query', 'command', 'statement', 'conversation'
    ];
    this.rules = config.rules || {};
    
    // Default rules if none provided
    if (Object.keys(this.rules).length === 0) {
      this.rules = {
        query: (text) => text.includes('?') ? 0.8 : 0.2,
        command: (text) => /^(please|could you|can you)/i.test(text) ? 0.7 : 0.3,
        statement: (text) => /^(i think|i believe|in my opinion)/i.test(text) ? 0.6 : 0.4,
        conversation: (text) => /^(hi|hello|how are|what's up)/i.test(text) ? 0.9 : 0.1
      };
    }
  }
  
  classify(perceivedData) {
    // Get text content from perceptions
    let textContent = '';
    if (perceivedData.perceptions) {
      const textPerceptions = perceivedData.perceptions.filter(p => p.type === 'text');
      if (textPerceptions.length > 0) {
        textContent = textPerceptions.map(p => p.value).join(' ');
      }
    } else if (typeof perceivedData === 'string') {
      textContent = perceivedData;
    } else if (perceivedData.raw && typeof perceivedData.raw === 'string') {
      textContent = perceivedData.raw;
    }
    
    // Apply all classification rules
    const scores = {};
    for (const category of this.categories) {
      if (this.rules[category]) {
        scores[category] = this.rules[category](textContent);
      } else {
        scores[category] = 0.5; // Default score if no rule exists
      }
    }
    
    // Find the highest scoring category
    let highestCategory = this.categories[0];
    let highestScore = scores[highestCategory] || 0;
    
    for (const category of this.categories) {
      const score = scores[category] || 0;
      if (score > highestScore) {
        highestScore = score;
        highestCategory = category;
      }
    }
    
    return {
      category: highestCategory,
      confidence: highestScore,
      allScores: scores
    };
  }
}

// Inference Engine - Simple implementation for drawing inferences from data
class InferenceEngine {
  constructor(config = {}) {
    this.rules = config.rules || [];
    
    // Default inference rules if none provided
    if (this.rules.length === 0) {
      this.rules = [
        {
          name: 'intent_query',
          condition: (data) => data.category === 'query',
          inference: (data) => ({ intent: 'information_request', confidence: 0.8 })
        },
        {
          name: 'intent_command',
          condition: (data) => data.category === 'command',
          inference: (data) => ({ intent: 'action_request', confidence: 0.8 })
        },
        {
          name: 'intent_conversational',
          condition: (data) => data.category === 'conversation',
          inference: (data) => ({ intent: 'social_interaction', confidence: 0.9 })
        }
      ];
    }
  }
  
  infer(perceivedData, patterns) {
    const inferences = [];
    const classification = perceivedData.classification || {};
    
    // Apply all inference rules
    for (const rule of this.rules) {
      if (rule.condition(classification)) {
        inferences.push({
          ruleName: rule.name,
          ...rule.inference(classification)
        });
      }
    }
    
    // Add pattern-based inferences
    if (patterns && patterns.length > 0) {
      for (const pattern of patterns) {
        if (pattern.patternName === 'question') {
          inferences.push({
            ruleName: 'pattern_question',
            intent: 'ask_question',
            confidence: 0.7
          });
        } else if (pattern.patternName === 'command') {
          inferences.push({
            ruleName: 'pattern_command',
            intent: 'execute_command',
            confidence: 0.7
          });
        }
      }
    }
    
    return inferences;
  }
}
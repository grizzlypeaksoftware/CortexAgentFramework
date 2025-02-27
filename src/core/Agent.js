const EventBus = require('./EventBus');
const Config = require('./Config');

class Agent {
  constructor(config = {}) {
    this.eventBus = new EventBus();
    this.config = new Config(config);
    
    // Core systems
    this.perceptionSystem = null;
    this.cognitiveSystem = null;
    this.actionSystem = null;
    this.memorySystem = null;
    
    this.initialized = false;
    this.id = config.id || `agent-${Date.now()}`;
    
    // Initialize with provided config
    this.initialize(config);
  }
  
  initialize(config = {}) {
    if (this.initialized) return;
    
    this.config.merge(config);
    
    // Create core systems
    const PerceptionSystem = require('../perception/PerceptionSystem');
    const CognitiveSystem = require('../cognition/CognitiveSystem');
    const ActionSystem = require('../action/ActionSystem');
    const MemorySystem = require('../memory/MemorySystem');
    
    // Initialize systems
    this.perceptionSystem = new PerceptionSystem(this.config.get('perception', {}));
    this.cognitiveSystem = new CognitiveSystem(this.config.get('cognition', {}));
    this.actionSystem = new ActionSystem(this.config.get('action', {}));
    this.memorySystem = new MemorySystem(this.config.get('memory', {}));
    
    // Connect systems to agent
    this.perceptionSystem.setAgent(this);
    this.cognitiveSystem.setAgent(this);
    this.actionSystem.setAgent(this);
    this.memorySystem.setAgent(this);
    
    // Set up event listeners
    this._setupEventListeners();
    
    this.initialized = true;
    this.eventBus.emit('agent:initialized', { id: this.id });
  }
  
  _setupEventListeners() {
    // Handle perception events
    this.eventBus.on('perception:complete', async (perceivedData) => {
      // Store in working memory
      this.memorySystem.addToWorkingMemory('perceivedData', perceivedData);
      
      // Process with cognitive system
      const cognitiveResult = await this.cognitiveSystem.process(perceivedData);
      this.eventBus.emit('cognition:complete', cognitiveResult);
    });
    
    // Handle cognition events
    this.eventBus.on('cognition:complete', async (cognitiveResult) => {
      // Store in working memory
      this.memorySystem.addToWorkingMemory('cognitiveResult', cognitiveResult);
      
      // Execute actions
      const actionResult = await this.actionSystem.execute(cognitiveResult.plan);
      this.eventBus.emit('action:complete', actionResult);
    });
    
    // Handle action events
    this.eventBus.on('action:complete', (actionResult) => {
      // Store episode in memory
      const episode = {
        perceivedData: this.memorySystem.getFromWorkingMemory('perceivedData'),
        cognitiveResult: this.memorySystem.getFromWorkingMemory('cognitiveResult'),
        actionResult: actionResult,
        timestamp: Date.now()
      };
      
      this.memorySystem.storeEpisode(episode);
      this.eventBus.emit('cycle:complete', episode);
    });
  }
  
  async process(input) {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
    
    try {
      // Start processing cycle
      this.eventBus.emit('cycle:start', { input, timestamp: Date.now() });
      
      // Process input through perception system
      const perceivedData = await this.perceptionSystem.process(input);
      this.eventBus.emit('perception:complete', perceivedData);
      
      // Wait for cycle to complete
      return new Promise((resolve) => {
        const unsubscribe = this.eventBus.on('cycle:complete', (result) => {
          unsubscribe();
          resolve(result);
        });
      });
    } catch (error) {
      this.eventBus.emit('error', { phase: 'process', error });
      throw error;
    }
  }
  
  getStatus() {
    return {
      id: this.id,
      initialized: this.initialized,
      systems: {
        perception: this.perceptionSystem ? this.perceptionSystem.initialized : false,
        cognition: this.cognitiveSystem ? this.cognitiveSystem.initialized : false,
        action: this.actionSystem ? this.actionSystem.initialized : false,
        memory: this.memorySystem ? this.memorySystem.initialized : false
      }
    };
  }
}

module.exports = Agent;
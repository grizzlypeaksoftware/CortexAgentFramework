class Component {
    constructor(type) {
      this.type = type;
      this.initialized = false;
      this.agent = null;
      this.eventBus = null;
    }
  
    setAgent(agent) {
      this.agent = agent;
      this.eventBus = agent.eventBus;
    }
  
    initialize(config = {}) {
      if (this.initialized) return;
      this.config = config;
      this.initialized = true;
    }
  
    emit(eventName, data) {
      if (this.eventBus) {
        this.eventBus.emit(eventName, data);
      }
    }
  
    on(eventName, callback) {
      if (this.eventBus) {
        this.eventBus.on(eventName, callback);
      }
    }
  }
  
  module.exports = Component;
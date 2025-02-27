// src/perception/PerceptionSystem.js
const { Component } = require('../core/Component');

class PerceptionSystem extends Component {
  constructor(config = {}) {
    super('perception');
    this.sensors = [];
    this.preprocessors = [];
    this.initialize(config);
  }
  
  initialize(config = {}) {
    if (this.initialized) return;
    super.initialize(config);
    
    // Initialize sensors based on configuration
    if (config.sensors) {
      for (const sensorConfig of config.sensors) {
        this.addSensor(this._createSensor(sensorConfig));
      }
    }
    
    // Initialize preprocessors
    if (config.preprocessors) {
      for (const preprocessorConfig of config.preprocessors) {
        this.addPreprocessor(this._createPreprocessor(preprocessorConfig));
      }
    }
    
    this.emit('perception:initialized', { sensors: this.sensors.length, preprocessors: this.preprocessors.length });
  }
  
  _createSensor(config) {
    const { type } = config;
    
    // Import the appropriate sensor class based on type
    let SensorClass;
    try {
      SensorClass = require(`./sensors/${type}Sensor`);
    } catch (error) {
      console.warn(`Sensor type "${type}" not found, using default TextSensor`);
      SensorClass = require('./sensors/TextSensor');
    }
    
    return new SensorClass(config);
  }
  
  _createPreprocessor(config) {
    const { type } = config;
    
    // Import the appropriate preprocessor class based on type
    let PreprocessorClass;
    try {
      PreprocessorClass = require(`./preprocessors/${type}Preprocessor`);
    } catch (error) {
      console.warn(`Preprocessor type "${type}" not found, using default TextPreprocessor`);
      PreprocessorClass = require('./preprocessors/TextPreprocessor');
    }
    
    return new PreprocessorClass(config);
  }
  
  addSensor(sensor) {
    if (sensor.setPerceptionSystem) {
      sensor.setPerceptionSystem(this);
    }
    this.sensors.push(sensor);
    return this;
  }
  
  addPreprocessor(preprocessor) {
    if (preprocessor.setPerceptionSystem) {
      preprocessor.setPerceptionSystem(this);
    }
    this.preprocessors.push(preprocessor);
    return this;
  }
  
  async process(input) {
    this.emit('perception:start', { input });
    
    try {
      // 1. Process input through all sensors
      let perceptions = [];
      
      for (const sensor of this.sensors) {
        if (sensor.canProcess(input)) {
          const perception = await sensor.process(input);
          perceptions.push(perception);
        }
      }
      
      // If no sensors could process the input, use a default text approach
      if (perceptions.length === 0) {
        const TextSensor = require('./sensors/TextSensor');
        const defaultSensor = new TextSensor();
        const perception = await defaultSensor.process(input);
        perceptions.push(perception);
      }
      
      // 2. Apply all preprocessors to refine the perceptions
      let processedData = { 
        raw: input,
        perceptions 
      };
      
      for (const preprocessor of this.preprocessors) {
        processedData = await preprocessor.process(processedData);
      }
      
      // 3. Emit completion event and return
      this.emit('perception:complete', processedData);
      return processedData;
    } catch (error) {
      this.emit('perception:error', { error, input });
      throw error;
    }
  }
  
  getSensors() {
    return [...this.sensors];
  }
  
  getPreprocessors() {
    return [...this.preprocessors];
  }
}

// src/perception/sensors/Sensor.js
class Sensor {
  constructor(config = {}) {
    this.type = 'base';
    this.config = config;
    this.perceptionSystem = null;
  }
  
  setPerceptionSystem(system) {
    this.perceptionSystem = system;
  }
  
  canProcess(input) {
    return false; // Base sensor cannot process anything
  }
  
  async process(input) {
    throw new Error('Method not implemented: process');
  }
}

// src/perception/sensors/TextSensor.js
class TextSensor extends Sensor {
  constructor(config = {}) {
    super(config);
    this.type = 'text';
  }
  
  canProcess(input) {
    return typeof input === 'string' || 
           (typeof input === 'object' && input.text) ||
           (typeof input === 'object' && input.message);
  }
  
  async process(input) {
    let text;
    
    if (typeof input === 'string') {
      text = input;
    } else if (input.text) {
      text = input.text;
    } else if (input.message) {
      text = input.message;
    } else {
      text = JSON.stringify(input);
    }
    
    return {
      type: 'text',
      value: text,
      metadata: {
        length: text.length,
        tokens: this._estimateTokens(text),
        language: this._detectLanguage(text)
      }
    };
  }
  
  _estimateTokens(text) {
    // Very rough token estimation (about 4 chars per token for English)
    return Math.ceil(text.length / 4);
  }
  
  _detectLanguage(text) {
    // Simple language detection - could be improved
    // For now, assume English
    return 'en';
  }
}

// src/perception/preprocessors/Preprocessor.js
class Preprocessor {
  constructor(config = {}) {
    this.type = 'base';
    this.config = config;
    this.perceptionSystem = null;
  }
  
  setPerceptionSystem(system) {
    this.perceptionSystem = system;
  }
  
  async process(data) {
    throw new Error('Method not implemented: process');
  }
}

// src/perception/preprocessors/TextPreprocessor.js
class TextPreprocessor extends Preprocessor {
  constructor(config = {}) {
    super(config);
    this.type = 'text';
  }
  
  async process(data) {
    // Find text perceptions to process
    const textPerceptions = data.perceptions.filter(p => p.type === 'text');
    
    for (let i = 0; i < textPerceptions.length; i++) {
      const perception = textPerceptions[i];
      const text = perception.value;
      
      // Apply text preprocessing
      const processed = {
        ...perception,
        value: this._cleanText(text),
        metadata: {
          ...perception.metadata,
          sentences: this._countSentences(text),
          words: this._countWords(text),
          processed: true
        }
      };
      
      // Update the perception in the original data
      const index = data.perceptions.findIndex(p => p === perception);
      if (index !== -1) {
        data.perceptions[index] = processed;
      }
    }
    
    return data;
  }
  
  _cleanText(text) {
    // Remove extra whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Apply any other text cleaning from config
    if (this.config.toLower) {
      cleaned = cleaned.toLowerCase();
    }
    
    if (this.config.removeSpecialChars) {
      cleaned = cleaned.replace(/[^\w\s]/g, '');
    }
    
    return cleaned;
  }
  
  _countSentences(text) {
    // Simple sentence splitting
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }
  
  _countWords(text) {
    // Simple word counting
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
}

module.exports = PerceptionSystem;
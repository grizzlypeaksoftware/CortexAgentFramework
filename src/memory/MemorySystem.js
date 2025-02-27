// src/memory/MemorySystem.js
const { Component } = require('../core/Component');

class MemorySystem extends Component {
  constructor(config = {}) {
    super('memory');
    this.workingMemory = new Map();
    this.episodicMemory = [];
    this.semanticMemory = new Map();
    this.memoryIndexes = new Map();
    this.maxEpisodicMemory = 100; // Default max episodes to store
    
    this.initialize(config);
  }
  
  initialize(config = {}) {
    if (this.initialized) return;
    super.initialize(config);
    
    // Configure memory limits
    if (config.limits) {
      this.maxEpisodicMemory = config.limits.episodicMemory || this.maxEpisodicMemory;
    }
    
    // Initialize memory indexes
    this._initializeIndexes();
    
    this.emit('memory:initialized', {
      workingMemory: this.workingMemory.size,
      episodicMemory: this.episodicMemory.length,
      semanticMemory: this.semanticMemory.size
    });
  }
  
  _initializeIndexes() {
    // Create indexes for different memory access patterns
    this.memoryIndexes.set('episodicByDate', new Map());
    this.memoryIndexes.set('episodicByTopic', new Map());
  }
  
  // Working Memory Methods
  
  addToWorkingMemory(key, value) {
    this.workingMemory.set(key, {
      value,
      timestamp: Date.now()
    });
    
    this.emit('memory:working:add', { key, timestamp: Date.now() });
    return this;
  }
  
  getFromWorkingMemory(key) {
    const entry = this.workingMemory.get(key);
    if (!entry) return null;
    
    this.emit('memory:working:get', { key, timestamp: Date.now() });
    return entry.value;
  }
  
  clearWorkingMemory() {
    this.workingMemory.clear();
    this.emit('memory:working:clear', { timestamp: Date.now() });
    return this;
  }
  
  // Episodic Memory Methods
  
  storeEpisode(episode) {
    if (!episode.id) {
      episode.id = `episode-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    if (!episode.timestamp) {
      episode.timestamp = Date.now();
    }
    
    // Add episode to episodic memory
    this.episodicMemory.push(episode);
    
    // Update indexes
    this._updateEpisodicIndexes(episode);
    
    // Trim if needed
    if (this.episodicMemory.length > this.maxEpisodicMemory) {
      const removed = this.episodicMemory.shift();
      this._removeFromEpisodicIndexes(removed);
    }
    
    this.emit('memory:episodic:store', { episodeId: episode.id, timestamp: Date.now() });
    return episode.id;
  }
  
  getEpisode(episodeId) {
    const episode = this.episodicMemory.find(e => e.id === episodeId);
    
    if (episode) {
      this.emit('memory:episodic:get', { episodeId, timestamp: Date.now() });
    }
    
    return episode || null;
  }
  
  getRecentEpisodes(count = 5) {
    // Return the most recent episodes
    const recent = [...this.episodicMemory]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
    
    this.emit('memory:episodic:getRecent', { count, timestamp: Date.now() });
    return recent;
  }
  
  getEpisodesByDate(startDate, endDate) {
    const dateIndex = this.memoryIndexes.get('episodicByDate');
    const result = [];
    
    // Convert dates to timestamps if needed
    const startTimestamp = startDate instanceof Date ? startDate.getTime() : startDate;
    const endTimestamp = endDate instanceof Date ? endDate.getTime() : endDate;
    
    // Iterate through the date-indexed episodes
    for (const [timestamp, episodes] of dateIndex.entries()) {
      if (timestamp >= startTimestamp && timestamp <= endTimestamp) {
        result.push(...episodes);
      }
    }
    
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  getEpisodesByTopic(topic) {
    const topicIndex = this.memoryIndexes.get('episodicByTopic');
    return topicIndex.get(topic) || [];
  }
  
  _updateEpisodicIndexes(episode) {
    // Update date index (by day)
    const dateKey = new Date(episode.timestamp).setHours(0, 0, 0, 0);
    const dateIndex = this.memoryIndexes.get('episodicByDate');
    
    if (!dateIndex.has(dateKey)) {
      dateIndex.set(dateKey, []);
    }
    dateIndex.get(dateKey).push(episode);
    
    // Update topic index if topics are present
    if (episode.topics && Array.isArray(episode.topics)) {
      const topicIndex = this.memoryIndexes.get('episodicByTopic');
      
      for (const topic of episode.topics) {
        if (!topicIndex.has(topic)) {
          topicIndex.set(topic, []);
        }
        topicIndex.get(topic).push(episode);
      }
    }
    
    // Try to extract topics if none provided
    if (!episode.topics && episode.perceivedData) {
      const extractedTopics = this._extractTopics(episode.perceivedData);
      
      if (extractedTopics.length > 0) {
        episode.topics = extractedTopics;
        
        // Update topic index with extracted topics
        const topicIndex = this.memoryIndexes.get('episodicByTopic');
        
        for (const topic of extractedTopics) {
          if (!topicIndex.has(topic)) {
            topicIndex.set(topic, []);
          }
          topicIndex.get(topic).push(episode);
        }
      }
    }
  }
  
  _removeFromEpisodicIndexes(episode) {
    // Remove from date index
    const dateKey = new Date(episode.timestamp).setHours(0, 0, 0, 0);
    const dateIndex = this.memoryIndexes.get('episodicByDate');
    
    if (dateIndex.has(dateKey)) {
      const episodes = dateIndex.get(dateKey).filter(e => e.id !== episode.id);
      
      if (episodes.length === 0) {
        dateIndex.delete(dateKey);
      } else {
        dateIndex.set(dateKey, episodes);
      }
    }
    
    // Remove from topic index
    if (episode.topics && Array.isArray(episode.topics)) {
      const topicIndex = this.memoryIndexes.get('episodicByTopic');
      
      for (const topic of episode.topics) {
        if (topicIndex.has(topic)) {
          const episodes = topicIndex.get(topic).filter(e => e.id !== episode.id);
          
          if (episodes.length === 0) {
            topicIndex.delete(topic);
          } else {
            topicIndex.set(topic, episodes);
          }
        }
      }
    }
  }
  
  _extractTopics(perceivedData) {
    // Simple topic extraction from text
    const topics = [];
    
    if (typeof perceivedData === 'string') {
      this._extractKeywordsFromText(perceivedData, topics);
    } else if (perceivedData.perceptions) {
      // Extract from text perceptions
      const textPerceptions = perceivedData.perceptions.filter(p => p.type === 'text');
      
      for (const perception of textPerceptions) {
        if (perception.value) {
          this._extractKeywordsFromText(perception.value, topics);
        }
      }
    }
    
    return [...new Set(topics)]; // Remove duplicates
  }
  
  _extractKeywordsFromText(text, topics) {
    // Very simple keyword extraction - in a real system, use NLP or LLM
    // Common English stopwords
    const stopwords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'have', 'has',
      'had', 'do', 'does', 'did', 'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
      'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just'
    ]);
    
    // Split text into words, filter out stopwords, and select longer words as potential topics
    const words = text.toLowerCase().split(/\W+/);
    const keywords = words.filter(word => 
      word.length > 4 && !stopwords.has(word)
    );
    
    // Add top keywords to topics
    const keywordFrequency = new Map();
    for (const word of keywords) {
      keywordFrequency.set(word, (keywordFrequency.get(word) || 0) + 1);
    }
    
    // Sort by frequency and take top 5
    const sortedKeywords = Array.from(keywordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
    
    topics.push(...sortedKeywords);
  }
  
  // Semantic Memory Methods
  
  storeConcept(key, data) {
    this.semanticMemory.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
    
    this.emit('memory:semantic:store', { key, timestamp: Date.now() });
    return this;
  }
  
  getConcept(key) {
    const concept = this.semanticMemory.get(key);
    
    if (concept) {
      // Update access count
      concept.accessCount += 1;
      concept.lastAccessed = Date.now();
      
      this.emit('memory:semantic:get', { key, timestamp: Date.now() });
      return concept.data;
    }
    
    return null;
  }
  
  getAllConcepts() {
    const concepts = {};
    
    for (const [key, value] of this.semanticMemory.entries()) {
      concepts[key] = value.data;
    }
    
    return concepts;
  }
  
  // Memory Management
  
  clearAllMemory() {
    this.workingMemory.clear();
    this.episodicMemory = [];
    this.semanticMemory.clear();
    
    // Reset indexes
    this._initializeIndexes();
    
    this.emit('memory:clear:all', { timestamp: Date.now() });
    return this;
  }
  
  getMemoryStats() {
    return {
      working: {
        size: this.workingMemory.size,
        keys: Array.from(this.workingMemory.keys())
      },
      episodic: {
        size: this.episodicMemory.length,
        oldest: this.episodicMemory.length > 0 ? this.episodicMemory[0].timestamp : null,
        newest: this.episodicMemory.length > 0 ? 
          this.episodicMemory[this.episodicMemory.length - 1].timestamp : null
      },
      semantic: {
        size: this.semanticMemory.size,
        keys: Array.from(this.semanticMemory.keys())
      }
    };
  }
}

module.exports = MemorySystem;
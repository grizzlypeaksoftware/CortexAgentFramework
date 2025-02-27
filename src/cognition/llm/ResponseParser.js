  // src/cognition/llm/ResponseParser.js
  class ResponseParser {
    constructor(config = {}) {
      this.parsers = {
        'json': this.parseJSON,
        'steps': this.parseSteps,
        'score': this.parseScore,
        'text': (text) => text  // Identity parser
      };
      
      this.customParsers = config.customParsers || {};
    }
    
    parse(response, format = 'text') {
      const parser = this.parsers[format] || this.customParsers[format] || this.parsers.text;
      try {
        return parser(response);
      } catch (error) {
        console.error(`Error parsing response as ${format}:`, error);
        return response; // Return the raw response if parsing fails
      }
    }
    
    parseJSON(text) {
      // Try to extract JSON from text, handling various formats
      try {
        return JSON.parse(text);
      } catch (e) {
        // Try to extract JSON from markdown code blocks
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          return JSON.parse(match[1]);
        }
        throw e;
      }
    }
    
    parseSteps(text) {
      // Extract numbered or bulleted steps from text
      const steps = [];
      const stepRegex = /(?:^|\n)(?:\d+\.\s+|\*\s+|-\s+)(.+)/g;
      let match;
      
      while ((match = stepRegex.exec(text)) !== null) {
        steps.push(match[1].trim());
      }
      
      return steps.length > 0 ? steps : [text]; // Return full text if no steps found
    }
    
    parseScore(text) {
      // Extract numerical scores or ratings from text
      const scoreRegex = /(?:score|rating):\s*(\d+(?:\.\d+)?)/i;
      const match = text.match(scoreRegex);
      
      return match ? parseFloat(match[1]) : null;
    }
    
    addParser(format, parserFn) {
      this.customParsers[format] = parserFn;
      return this;
    }
  }

module.exports = ResponseParser;
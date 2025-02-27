
  // src/cognition/llm/providers/AnthropicProvider.js
  class AnthropicProvider {
    constructor(config = {}) {
      this.apiKey = config.apiKey;
      this.model = config.model || 'claude-3-opus-20240229';
      this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
      this.defaultOptions = config.defaultOptions || {
        temperature: 0.7,
        max_tokens: 1000
      };
    }
    
    async complete(prompt, options = {}) {
      const requestOptions = { ...this.defaultOptions, ...options };
      
      try {
        const response = await fetch(`${this.baseURL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: requestOptions.temperature,
            max_tokens: requestOptions.max_tokens
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`Anthropic API error: ${data.error?.message || response.statusText}`);
        }
        
        return data.content[0].text;
      } catch (error) {
        console.error('Error calling Anthropic API:', error);
        throw error;
      }
    }
  }
  
module.exports = AnthropicProvider;
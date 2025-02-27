// src/cognition/llm/providers/OpenAIProvider.js
class OpenAIProvider {
    constructor(config = {}) {
      this.apiKey = config.apiKey;
      this.model = config.model || 'gpt-4';
      this.baseURL = config.baseURL || 'https://api.openai.com/v1';
      this.defaultOptions = config.defaultOptions || {
        temperature: 0.7,
        max_tokens: 1000
      };
    }
    
    async complete(prompt, options = {}) {
      const requestOptions = { ...this.defaultOptions, ...options };
      
      try {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
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
          throw new Error(`OpenAI API error: ${data.error?.message || response.statusText}`);
        }
        
        return data.choices[0].message.content;
      } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
      }
    }
  }
  
module.exports = OpenAIProvider;

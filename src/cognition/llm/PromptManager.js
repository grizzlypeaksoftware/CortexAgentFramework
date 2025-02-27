  // src/cognition/llm/PromptManager.js
  class PromptManager {
    constructor(config = {}) {
      this.templates = config.templates || {};
      this.defaultTemplates = {
        reasoning: "Given the context: {context}\n\nAnswer the following question: {question}",
        planning: "Goal: {goal}\nConstraints: {constraints}\nAvailable resources: {resources}\n\nCreate a step-by-step plan.",
        evaluation: "Plan: {plan}\n\nEvaluate this plan against the criteria: {criteria}",
        summarization: "Text: {text}\n\nProvide a concise summary of the above text.",
        generation: "Create {type} content based on the following description: {description}"
      };
    }
    
    createPrompt(templateName, variables) {
      const template = this.templates[templateName] || this.defaultTemplates[templateName];
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }
      
      return this.fillTemplate(template, variables);
    }
    
    fillTemplate(template, variables) {
      let result = template;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return result;
    }
    
    addTemplate(name, template) {
      this.templates[name] = template;
      return this;
    }
    
    getTemplate(name) {
      return this.templates[name] || this.defaultTemplates[name];
    }
    
    getAllTemplateNames() {
      const names = new Set([
        ...Object.keys(this.defaultTemplates),
        ...Object.keys(this.templates)
      ]);
      return Array.from(names);
    }
  }
  
module.exports = PromptManager;
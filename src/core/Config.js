class Config {
    constructor(initialConfig = {}) {
      this.config = { ...initialConfig };
      this.validators = {};
    }
  
    get(path, defaultValue) {
      const parts = path.split('.');
      let current = this.config;
  
      for (const part of parts) {
        if (current === undefined || current === null) {
          return defaultValue;
        }
        current = current[part];
      }
  
      return current !== undefined ? current : defaultValue;
    }
  
    set(path, value) {
      const parts = path.split('.');
      let current = this.config;
  
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }
  
      const lastPart = parts[parts.length - 1];
      
      // Run validator if it exists
      if (this.validators[path]) {
        const validationResult = this.validators[path](value);
        if (validationResult !== true) {
          throw new Error(`Invalid value for ${path}: ${validationResult}`);
        }
      }
      
      current[lastPart] = value;
      return this;
    }
  
    merge(config) {
      this.config = this._deepMerge(this.config, config);
      return this;
    }
  
    _deepMerge(target, source) {
      const output = { ...target };
      
      if (this._isObject(target) && this._isObject(source)) {
        Object.keys(source).forEach(key => {
          if (this._isObject(source[key])) {
            if (!(key in target)) {
              Object.assign(output, { [key]: source[key] });
            } else {
              output[key] = this._deepMerge(target[key], source[key]);
            }
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      
      return output;
    }
  
    _isObject(item) {
      return (item && typeof item === 'object' && !Array.isArray(item));
    }
  
    setValidator(path, validatorFn) {
      this.validators[path] = validatorFn;
      return this;
    }
  
    validate() {
      const errors = [];
      
      for (const path in this.validators) {
        const value = this.get(path);
        const result = this.validators[path](value);
        
        if (result !== true) {
          errors.push(`Invalid value for ${path}: ${result}`);
        }
      }
      
      return errors.length === 0 ? true : errors;
    }
  
    toJSON() {
      return { ...this.config };
    }
  }
  
  module.exports = Config;
// src/cognition/planning/PlanningModule.js
class PlanningModule {
    constructor(config = {}) {
      this.config = config;
      this.llmService = null;
      this.goalManager = new GoalManager(config.goalManager || {});
      this.actionPlanner = new ActionPlanner(config.actionPlanner || {});
      this.outcomePredictor = new OutcomePredictor(config.outcomePredictor || {});
    }
    
    setLLMService(llmService) {
      this.llmService = llmService;
    }
    
    createPlan(analysis) {
      // Traditional planning
      const goals = this.goalManager.deriveGoals(analysis);
      const actionSequence = this.actionPlanner.planActions(goals, analysis);
      const predictedOutcomes = this.outcomePredictor.predictOutcomes(actionSequence);
      
      return { goals, actionSequence, predictedOutcomes };
    }
    
    async enhanceWithLLM(analysis, initialPlan) {
      if (!this.llmService) return initialPlan;
      
      try {
        // Use LLM to enhance planning
        const context = {
          analysis: analysis,
          initialPlan: initialPlan
        };
        
        const enhancedPlan = await this.llmService.plan(
          JSON.stringify(initialPlan.goals),
          JSON.stringify(context),
          "Plan optimally to achieve goals based on the analysis"
        );
        
        // Validate the LLM plan
        const evaluationScore = await this.llmService.evaluate(
          JSON.stringify(enhancedPlan),
          JSON.stringify(initialPlan.goals)
        );
        
        return {
          ...initialPlan,
          llmPlan: enhancedPlan,
          evaluationScore: evaluationScore,
          finalPlan: evaluationScore > 0.7 ? enhancedPlan : initialPlan.actionSequence
        };
      } catch (error) {
        console.error('LLM planning enhancement failed:', error);
        return initialPlan; // Fallback to traditional planning
      }
    }
  }
  
  // Goal Manager - Responsible for deriving goals from analysis
  class GoalManager {
    constructor(config = {}) {
      this.config = config;
      this.defaultGoals = config.defaultGoals || {
        'query': { type: 'answer', priority: 'high' },
        'command': { type: 'execute', priority: 'high' },
        'statement': { type: 'acknowledge', priority: 'medium' },
        'conversation': { type: 'engage', priority: 'medium' }
      };
    }
    
    deriveGoals(analysis) {
      const goals = [];
      
      // Derive goals based on classification
      if (analysis.classification && analysis.classification.category) {
        const category = analysis.classification.category;
        const defaultGoal = this.defaultGoals[category];
        
        if (defaultGoal) {
          goals.push({
            id: `goal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: defaultGoal.type,
            priority: defaultGoal.priority,
            source: 'classification',
            confidence: analysis.classification.confidence || 0.5
          });
        }
      }
      
      // Derive goals based on inferences
      if (analysis.inferences && analysis.inferences.length > 0) {
        for (const inference of analysis.inferences) {
          if (inference.intent) {
            goals.push({
              id: `goal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: this._mapIntentToGoalType(inference.intent),
              priority: this._determineGoalPriority(inference),
              source: 'inference',
              confidence: inference.confidence || 0.5
            });
          }
        }
      }
      
      // Add LLM-derived goals if available
      if (analysis.llmAnalysis && analysis.llmAnalysis.goals) {
        for (const llmGoal of analysis.llmAnalysis.goals) {
          goals.push({
            ...llmGoal,
            id: llmGoal.id || `goal-llm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            source: 'llm',
            confidence: llmGoal.confidence || 0.8 // Generally high confidence for LLM goals
          });
        }
      }
      
      // Sort goals by priority and confidence
      return this._prioritizeGoals(goals);
    }
    
    _mapIntentToGoalType(intent) {
      const intentToGoal = {
        'information_request': 'answer',
        'action_request': 'execute',
        'social_interaction': 'engage',
        'ask_question': 'research',
        'execute_command': 'perform'
      };
      
      return intentToGoal[intent] || 'process'; // Default goal type
    }
    
    _determineGoalPriority(inference) {
      // Simple priority determination based on confidence
      if (inference.confidence > 0.8) return 'high';
      if (inference.confidence > 0.5) return 'medium';
      return 'low';
    }
    
    _prioritizeGoals(goals) {
      // Priority mapping
      const priorityMap = {
        'high': 3,
        'medium': 2,
        'low': 1
      };
      
      // Sort by priority (high → low) and then by confidence (high → low)
      return goals.sort((a, b) => {
        const priorityDiff = (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        
        return (b.confidence || 0) - (a.confidence || 0);
      });
    }
  }
  
  // Action Planner - Determines sequence of actions to achieve goals
  class ActionPlanner {
    constructor(config = {}) {
      this.config = config;
      this.actionMappings = config.actionMappings || {
        'answer': ['retrieveInformation', 'formatResponse'],
        'execute': ['parseCommand', 'executeAction', 'reportResult'],
        'acknowledge': ['generateAcknowledgement'],
        'engage': ['generateConversationalResponse'],
        'research': ['searchKnowledge', 'compileResults', 'formatResponse'],
        'perform': ['parseTask', 'executeProcedure', 'verifyCompletion']
      };
    }
    
    planActions(goals, analysis) {
      if (!goals || goals.length === 0) {
        return [{ type: 'noop', description: 'No action needed' }];
      }
      
      const actionSequence = [];
      
      // Process the highest priority goals (take top 3 at most)
      const topGoals = goals.slice(0, 3);
      
      for (const goal of topGoals) {
        const actionsForGoal = this._createActionsForGoal(goal, analysis);
        actionSequence.push(...actionsForGoal);
      }
      
      return actionSequence;
    }
    
    _createActionsForGoal(goal, analysis) {
      const goalType = goal.type;
      const actionTypes = this.actionMappings[goalType] || ['processGeneric'];
      
      return actionTypes.map((actionType, index) => {
        return {
          id: `action-${Date.now()}-${Math.floor(Math.random() * 1000)}-${index}`,
          type: actionType,
          goalId: goal.id,
          parameters: this._determineActionParameters(actionType, goal, analysis),
          order: index,
          description: this._getActionDescription(actionType, goal)
        };
      });
    }
    
    _determineActionParameters(actionType, goal, analysis) {
      // Default parameters based on action type
      const defaultParams = {
        'retrieveInformation': { query: 'information' },
        'formatResponse': { format: 'text' },
        'parseCommand': { commandText: '' },
        'executeAction': { action: 'unknown' },
        'searchKnowledge': { topic: 'unknown' }
      };
      
      // Get text from analysis if available
      let text = '';
      if (analysis && analysis.perceptions) {
        const textPerceptions = analysis.perceptions.filter(p => p.type === 'text');
        if (textPerceptions.length > 0) {
          text = textPerceptions[0].value || '';
        }
      }
      
      // Customize parameters based on action type and context
      const params = { ...defaultParams[actionType] };
      
      switch (actionType) {
        case 'retrieveInformation':
          params.query = text;
          break;
        case 'parseCommand':
          params.commandText = text;
          break;
        case 'searchKnowledge':
          params.topic = text;
          break;
      }
      
      return params;
    }
    
    _getActionDescription(actionType, goal) {
      const descriptions = {
        'retrieveInformation': `Retrieve information to address the ${goal.type} goal`,
        'formatResponse': `Format the response for the ${goal.type} goal`,
        'parseCommand': `Parse the command for the ${goal.type} goal`,
        'executeAction': `Execute the action for the ${goal.type} goal`,
        'reportResult': `Report the result of the ${goal.type} goal`,
        'generateAcknowledgement': `Generate acknowledgement for the ${goal.type} goal`,
        'generateConversationalResponse': `Generate a conversational response for the ${goal.type} goal`,
        'searchKnowledge': `Search knowledge base for information relevant to the ${goal.type} goal`,
        'compileResults': `Compile search results for the ${goal.type} goal`,
        'parseTask': `Parse the task for the ${goal.type} goal`,
        'executeProcedure': `Execute the procedure for the ${goal.type} goal`,
        'verifyCompletion': `Verify completion of the ${goal.type} goal`,
        'processGeneric': `Process the ${goal.type} goal`
      };
      
      return descriptions[actionType] || `Perform action ${actionType} for goal ${goal.type}`;
    }
  }
  
  // Outcome Predictor - Predicts likely outcomes of action sequences
  class OutcomePredictor {
    constructor(config = {}) {
      this.config = config;
    }
    
    predictOutcomes(actionSequence) {
      if (!actionSequence || actionSequence.length === 0) {
        return [{ description: 'No actions, no outcomes', probability: 1.0 }];
      }
      
      // Group actions by goal
      const actionsByGoal = {};
      for (const action of actionSequence) {
        if (!actionsByGoal[action.goalId]) {
          actionsByGoal[action.goalId] = [];
        }
        actionsByGoal[action.goalId].push(action);
      }
      
      const outcomes = [];
      
      // Predict outcome for each goal
      for (const goalId in actionsByGoal) {
        const goalActions = actionsByGoal[goalId];
        const mainAction = goalActions[goalActions.length - 1]; // Last action in sequence
        
        outcomes.push({
          description: this._predictOutcomeForAction(mainAction, goalActions),
          probability: 0.8, // Default probability
          goalId: goalId,
          actionId: mainAction.id
        });
      }
      
      return outcomes;
    }
    
    _predictOutcomeForAction(action, allActionsForGoal) {
      const actionType = action.type;
      
      // Outcome prediction based on action type
      const outcomes = {
        'formatResponse': 'User will receive a formatted response',
        'executeAction': 'The requested action will be performed',
        'reportResult': 'User will be informed of the action result',
        'generateAcknowledgement': 'User will receive acknowledgement',
        'generateConversationalResponse': 'Conversation will continue',
        'verifyCompletion': 'The task will be completed and verified'
      };
      
      return outcomes[actionType] || `Action ${actionType} will be completed`;
    }
  }
  
  module.exports = PlanningModule;
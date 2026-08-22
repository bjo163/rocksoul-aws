type Loose = Record<string, any>;
import {resolveRule} from '../core/rule-resolution.js';

export class RuleEngine {
  declare rules: Loose[];
  constructor(rules: Loose[] = []){this.rules=rules;}
  add(rule: Loose): Loose {this.rules.push({...rule}); return rule;}
  resolve(context: Loose = {}): Loose | null {return resolveRule(this.rules as any, context as any);}
  explain(context: Loose = {}): Loose {
    const rule=this.resolve(context);
    return {matched:!!rule,rule,context};
  }
}

import { Attribute, AttributeValue, attrValues } from "@opticss/element-analysis";

import { ROOT_CLASS, UNIVERSAL_STATE } from "../BlockSyntax";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";

import { Block } from "./Block";
import { RulesetContainer } from "./RulesetContainer";
import { State } from "./State";
import { StateGroup } from "./StateGroup";
import { Style } from "./Style";
import { Styles } from "./Styles";

/**
 * Holds state values to be passed to the StateContainer.
 */
export interface StateInfo {
  group?: string;
  name: string;
}

/**
 * Represents a Class present in the Block.
 */
export class BlockClass extends Style<BlockClass, Block, Block, StateGroup> {
  private _sourceAttribute: Attribute | undefined;
  public readonly rulesets: RulesetContainer<BlockClass>;

  constructor(name: string, parent: Block) {
    super(name, parent);
    this.rulesets = new RulesetContainer(this);
  }

  protected newChild(name: string): StateGroup { return new StateGroup(name, this); }

  get isRoot(): boolean { return this.name === ROOT_CLASS; }

  public getGroups(): StateGroup[] { return this.children(); }
  public getGroup(name: string): StateGroup | null { return this.getChild(name); }
  public getStates(name: string, filter?: string): State[]  {
    let group = this.getChild(name);
    if (!group) { return []; }
    let states = group.states();
    return filter ? states.filter(s => s.name === filter) : states;
  }

  /**
   * Ensure that a `StateGroup` with the given name exists. If the `StateGroup`
   * does not exist, it is created.
   * @param name The State group to ensure exists.
   * @param value The State's value to ensure exists.
   * @returns The State object.
   */
  public ensureGroup(name: string): StateGroup { return this.ensureChild(name); }

  /**
   * Ensure that a `State` within the provided group exists. If the `State`
   * does not exist, it is created.
   * @param name The State group to ensure exists.
   * @param vallue The State's value to ensure exists.
   * @returns The State object.
   */
  public ensureState(name: string, value?: string): State {
    return this.ensureGroup(name).ensureState(value);
  }
  public resolveGroup(name: string): StateGroup | null { return this.resolveChild(name); }
  public stateGroups(): StateGroup[] { return this.children(); }
  public resolveState(groupName: string, stateName = UNIVERSAL_STATE): State | null {
    let parent = this.resolveChild(groupName);
    if (parent) { return parent.resolveState(stateName); }
    return null;
  }

  /**
   * Resolves all sub-states from this state's inheritance
   * chain. Returns an empty object if no
   * @param stateName The name of the sub-state to resolve.
   */
  resolveStates(groupName?: string): Map<string, State> {
    let resolved: Map<string, State> = new Map();
    let chain = this.resolveInheritance();
    chain.push(this);
    for (let base of chain) {
      let groups = !groupName ? base.getGroups() : [base.getGroup(groupName)];
      for (let group of groups) {
        if (group && group.states()) {
          resolved = new Map([...resolved, ...group.statesMap()]);
        }
      }
    }
    return resolved;
  }

  public booleanStates(): State[] {
    let res: State[] = [];
    for (let group of this.getGroups()) {
      let state = group.getState(UNIVERSAL_STATE);
      if (!group.hasSubStates && state) {
        res.push(state);
      }
    }
    return res;
  }

  public localName(): string { return this.name; }

  /**
   * Export as original class name.
   * @returns String representing original class.
   */
  public asSource(): string { return this.isRoot ? ROOT_CLASS : `.${this.name}`; }

  /**
   * Emit analysis attributes for the class value this
   * block class represents in it's authored source format.
   *
   * @param optionalRoot The root class is optional on root-level
   *   states. So when these attributes are being used in conjunction
   *   with a state, this value is set to true.
   */
  public asSourceAttributes(optionalRoot = false): Attribute[] {
    if (!this._sourceAttribute) {
      let value: AttributeValue = { constant: this.name };
      if (optionalRoot && this.isRoot) {
        value = attrValues.oneOf([value, attrValues.absent()]);
      }
      this._sourceAttribute = new Attribute("class", value);
    }
    return [this._sourceAttribute];
  }

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
  public cssClass(opts: OptionsReader): string {
    switch (opts.outputMode) {
      case OutputMode.BEM:
        if (this.isRoot) {
          return `${this.block.name}`;
        } else {
          return `${this.block.name}__${this.name}`;
        }
      default:
        throw new Error("this never happens");
    }
  }

  /**
   * Return array self and all children.
   * @param shallow Pass false to not include children.
   * @returns Array of Styles.
   */
  all(shallow?: boolean): Styles[] {
    let result: (State | BlockClass)[] = [this];
    if (!shallow) {
      result = result.concat(this.allStates());
    }
    return result;
  }

  /**
   * Returns all concrete states defined against this class.
   * Does not take inheritance into account.
   */
  allStates(): State[] {
    let result: State[] = [];
    for (let stateContainer of this.stateGroups()) {
      result.push(...stateContainer.states());
    }
    return result;
  }

  /**
   * Group getter. Returns a list of State objects in the requested group that are defined
   * against this specific class. This does not take inheritance into account.
   * @param groupName State group for lookup or a boolean state name if substate is not provided.
   * @param stateName Optional substate to filter states by.
   * @returns An array of all States that were requested.
   */
  getState(groupName: string, stateName: string = UNIVERSAL_STATE): State | null {
    let group = this.getGroup(groupName);
    return group ? group.getState(stateName) || null : null;
  }

  getGroupsNames(): Set<string> {
    return new Set<string>([...this._children.keys()]);
  }

  /**
   * Debug utility to help test States.
   * @param options  Options to pass to States' asDebug method.
   * @return Array of debug strings for these states
   */
  debug(opts: OptionsReader): string[] {
    let result: string[] = [];
    for (let style of this.all()) {
      result.push(style.asDebug(opts));
    }
    return result;
  }

}

export function isBlockClass(o: object): o is BlockClass {
  return o instanceof BlockClass;
}
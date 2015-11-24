import {eve as ixer} from "./app";
import {Element} from "./microReact";
import {Indexer, Query} from "./runtime";
import * as wiki from "./wiki";
declare var uuid;
declare var DEBUG;
window["DEBUG"] = window["DEBUG"] || {};

function resolvedAdd(changeset, table, fact) {
  let neue = {};
  for(let field in fact) {
    neue[`${table}: ${field}`] = fact[field];
  }
  return changeset.add(table, neue);
}

export class UI {
  protected _binding:Query;
  protected _embedded:{};
  protected _children:UI[] = [];
  protected _attributes:{} = {};
  protected _events:{} = {};

  protected _parent:UI;

  constructor(public id) {

  }
  copy() {
    let neue = new UI(this.id);
    neue._children = this._children;
    neue._attributes = this._attributes;
    neue._events = this._events;
    return neue;
  }
  changeset(ixer:Indexer) {
    let changeset = ixer.diff();

    let parent = this._attributes["parent"] || (this._parent && this._parent.id) || "";
    let ix = this._attributes["ix"];
    if(ix === undefined) ix = (this._parent && this._parent._children.indexOf(this));
    if(ix === -1 || ix === undefined) ix = "";

    resolvedAdd(changeset, "ui template", {template: this.id, parent, ix});
    if(this._binding) {
      if(!this._binding.name) this._binding.name = `bound view ${this.id}`;
      changeset.merge(wiki.queryObjectToDiff(this._binding));
      resolvedAdd(changeset, "ui template binding", {template: this.id, binding: this._binding.name});
    }
    if(this._embedded) {
      let embed = uuid();
      resolvedAdd(changeset, "ui embed", {embed, template: this.id, parent: this._parent || "", ix});
      for(let key in this._embedded) {
        let value = this._attributes[key];
        if(value instanceof Array) resolvedAdd(changeset, "ui embed scope binding", {embed, key, source: value[0], alias: value[1]});
        else resolvedAdd(changeset, "ui embed scope", {embed, key, value});
      }
    }

    for(let property in this._attributes) {
      let value = this._attributes[property];
      if(value instanceof Array) resolvedAdd(changeset, "ui attribute binding", {template: this.id, property, source: value[0], alias: value[1]});
      else resolvedAdd(changeset, "ui attribute", {template: this.id, property, value});
    }

    for(let event in this._events) {
      resolvedAdd(changeset, "ui event", {template: this.id, event});
      let state = this._events[event];
      for(let key in state) {
        let value = state[key];
        if(value instanceof Array)
          resolvedAdd(changeset, "ui event state binding", {template: this.id, event, key, source: value[0], alias: value[1]});
        else resolvedAdd(changeset, "ui event state", {template: this.id, event, key, value});
      }
    }

    for(let child of this._children) changeset.merge(child.changeset(ixer));

    return changeset;
  }

  children(neue?:UI[], append = false) {
    if(!neue) return this._children;
    if(!append) this._children.length = 0;
    for(let child of neue) {
      let copied = child.copy();
      copied._parent = this;
      this._children.push(copied);
    }
    return this._children;
  }
  child(child:UI, ix?: number, embed?:{}) {
    child = child.copy();
    child._parent = this;
    if(embed) child.embed(embed);
    if(!ix) this._children.push(child);
    else this._children.splice(ix, 0, child);
    return child;
  }
  removeChild(ix: number) {
    return this._children.splice(ix, 1);
  }

  attributes(properties?: {}, merge = false) {
    if(!properties) return this._attributes;
    if(!merge) {
      for(let prop in this._attributes) delete this._attributes[prop];
    }
    for(let prop in properties) this._attributes[prop] = properties[prop];
    return this;
  }
  attribute(property: string, value?: any) {
    if(value === undefined) return this._attributes[property];
    this._attributes[property] = value;
    return this;
  }
  removeAttribute(property: string) {
    delete this._attributes[property];
    return this;
  }

  events(events?: {}, merge = false) {
    if(!events) return this._events;
    if(!merge) {
      for(let event in this._events) delete this._events[event];
    }
    for(let event in events) this._events[event] = events[event];
    return this;
  }
  event(event: string, state?: any) {
    if(state === undefined) return this._events[event];
    this._attributes[event] = state;
    return this;
  }
  removeEvent(event: string) {
    delete this._events[event];
    return this;
  }

  embed(scope:{}|boolean = {}) {
    if(!scope) {
      this._embedded = undefined;
      return this;
    }
    if(scope === true) scope = {};
    this._embedded = scope;
    return this;
  }

  bind(binding:Query) {
    this._binding = binding;
    return this;
  }
}

// @FIXME: These should probably be unionized.
function addResolvedTable(ixer, table, fields) {
  return ixer.addTable(table, fields.map((field) => `${table}: ${field}`));
}
addResolvedTable(ixer, "ui template", ["template", "parent", "ix"]);
addResolvedTable(ixer, "ui template binding", ["template", "query"]);
addResolvedTable(ixer, "ui embed", ["embed", "template", "parent", "ix"]);
addResolvedTable(ixer, "ui embed scope", ["embed", "key", "value"]);
addResolvedTable(ixer, "ui embed scope binding", ["embed", "key", "source", "alias"]);
addResolvedTable(ixer, "ui attribute", ["template", "property", "value"]);
addResolvedTable(ixer, "ui attribute binding", ["template", "property", "source", "alias"]);
addResolvedTable(ixer, "ui event", ["template", "event"]);
addResolvedTable(ixer, "ui event state", ["template", "event", "key", "value"]);
addResolvedTable(ixer, "ui event state binding", ["template", "event", "key", "source", "alias"]);


// @FIXME: These should probably be unionized.
//ixer.addTable("ui template", ["ui template: template", "ui template: parent", "ui template: ix"]);
//ixer.addTable("ui template binding", ["ui template binding: template", "ui template binding: query"]);
//ixer.addTable("ui attribute", ["ui attribute: template", "ui attribute: property", "ui attribute: value"]);
//ixer.addTable("ui attribute binding", ["ui attribute binding: template", "ui attribute binding: property", "ui attribute binding: alias"]);
//ixer.addTable("ui event", ["ui event: template", "ui event: event", "ui event: kind", "ui event: key"]);
//ixer.addTable("ui event binding", ["ui event binding: template", "ui event binding: event", "ui event binding: kind", "ui event binding: alias"]);

interface UiWarning {
  "ui warning: template": string
  "ui warning: warning": string
}

// @TODO: Finish reference impl.
// @TODO: Then build bit-generating version
export class UiRenderer {
  public compiled = 0;
  protected tagCompilers:{[tag: string]: (elem:Element) => void} = {};

  compile(roots:(string|Element)[]):Element[] {
    let compiledElems:Element[] = [];
    for(let root of roots) {
      // @TODO: reparent dynamic roots if needed.
      if(typeof root === "string") {
        let elems = this._compileWrapper(root, compiledElems.length);
        compiledElems.push.apply(compiledElems, elems);
        let base = ixer.findOne("ui template", {"ui template: template": root});
        if(!base) continue;
        let parent = base["ui template: parent"];
        if(parent) {
          for(let elem of elems) elem.parent = parent;
        }
      }
      else {
        if(!root.ix) root.ix = compiledElems.length;
        compiledElems.push(root);
      }
    }

    return compiledElems;
  }

  protected _compileWrapper(template:string, baseIx: number, constraints:{} = {}, bindingStack:any[] = []):Element[] {
    let elems = [];
    let binding = ixer.findOne("ui template binding", {"ui template binding: template": template});
    if(!binding) {
      elems[0] = this._compileElement(template, bindingStack);
      elems[0].ix = baseIx + (elems[0].ix || 0);
    } else {
      let boundQuery = binding["ui template binding: query"];
      let facts = this.getBoundFacts(boundQuery, constraints);
      let ix = 0;
      for(let fact of facts) {
        bindingStack.push(fact);
        let elem = this._compileElement(template, bindingStack, fact);
        bindingStack.pop();
        elem.ix = (elem.ix || 0);
        elems.push(elem);
      }
    }
    elems.sort((a, b) => a.ix - b.ix);
    let prevIx = undefined;
    for(let elem of elems) {
      elem.ix += baseIx;
      if(elem.ix === prevIx) elem.ix++;
      prevIx = elem.ix;
    }
    return elems;
  }

  protected _compileElement(template:string, bindingStack:any[], fact?:any):Element {
    let elementToChildren = ixer.index("ui template", ["ui template: parent"]);
    let elementToEmbeds = ixer.index("ui embed", ["ui embed: parent"]);
    let embedToScope = ixer.index("ui embed scope", ["ui embed scope: embed"]);
    let embedToScopeBinding = ixer.index("ui embed scope binding", ["ui embed scope binding: embed"]);
    let elementToAttrs = ixer.index("ui attribute", ["ui attribute: template"]);
    let elementToAttrBindings = ixer.index("ui attribute binding", ["ui attribute binding: template"]);
    let elementToEvents = ixer.index("ui event", ["ui event: template"]);
    let elementToEventBindings = ixer.index("ui event binding", ["ui event binding: template"]);

    this.compiled++;
    let base = ixer.findOne("ui template", {"ui template: template": template});
    if(!base) {
      console.warn(`ui template ${template} does not exist. Ignoring.`);
      return undefined;
    }

    let attrs = elementToAttrs[template];
    let boundAttrs = elementToAttrBindings[template];
    let events = elementToEvents[template];
    let boundEvents = elementToEventBindings[template];

    // Handle meta properties
    let elem:Element = {t: base["ui template: tag"], ix: base["ui template: ix"]};

    // Handle static properties
    if(attrs) {
      for(let {"ui attribute: property": prop, "ui attribute: value": val} of attrs) elem[prop] = val;
    }

    // Handle bound properties
    if(boundAttrs) {
      // @FIXME: What do with source?
      for(let {"ui attribute binding: property": prop, "ui attribute binding: source": source, "ui attribute binding: alias": alias} of boundAttrs) {
        elem[prop] = this.getBoundValue(alias, bindingStack);
      }
    }

    // Attach event handlers
    if(events) {
      for(let {"ui event: event": event} of events) {
        elem[event] = this.generateEventHandler(elem, event);
      }
    }

    // Compile children
    let children = elementToChildren[template] || [];
    let embeds = elementToEmbeds[template] || [];

    if(children.length || embeds.length) {
      elem.children = [];
      let childIx = 0, embedIx = 0;
      let boundAliases = this.getBoundAliases(bindingStack);
      while(childIx < children.length || embedIx < embeds.length) {
        let child = children[childIx];
        let embed = embeds[embedIx];
        let add, constraints = {}, childBindingStack = bindingStack;
        if(!embed || child && child.ix <= embed.ix) {
          add = children[childIx++]["ui template: template"];
          // Resolve bound aliases into constraints
          for(let alias of boundAliases) constraints[alias] = this.getBoundValue(alias, bindingStack);

        } else {
          add = embeds[embedIx++]["ui embed: template"];
          for(let scope of embedToScope[embed["ui embed: embed"]] || [])
            constraints[scope["ui embed scope: key"]] = scope["ui embed scope: value"];

          for(let scope of embedToScopeBinding[embed["ui embed: embed"]] || []) {
            // @FIXME: What do about source?
            let {"ui embed scope binding: key": key, "ui embed scope binding: source": source, "ui embed scope binding: alias": alias} = scope;
            constraints[key] = this.getBoundValue(alias, bindingStack);
          }
          childBindingStack = [constraints];
        }
        elem.children.push.apply(elem.children, this._compileWrapper(add, elem.children.length, constraints, childBindingStack));
      }
    }

    if(this.tagCompilers[elem.t]) {
      try {
        this.tagCompilers[elem.t](elem);
      } catch(err) {
        console.warn(`Failed to compile template: '${template}' due to '${err}' for element '${JSON.stringify(elem)}'`);
        elem.t = "ui-error";
      }
    }
  }

  protected getBoundFacts(query, constraints):string[] {
    return ixer.find(query, constraints);
  }
  protected getBoundAliases(bindingStack:any[]):string[] {
    let aliases = {};
    for(let ix = bindingStack.length; ix >= 0; ix--) {
      let fact = bindingStack[ix];
      for(let alias in fact) aliases[alias] = true;
    }
    return Object.keys(aliases);
  }

  //@FIXME: What do about source?
  protected getBoundValue(alias, bindingStack:any[]):any {
    for(let ix = bindingStack.length; ix >= 0; ix--) {
      let fact = bindingStack[ix];
      if(fact[alias]) return alias;
    }
  }
  protected generateEventHandler(elem, event) {
    // @TODO: Pull event state and event state binding
    throw new Error("Implement me!");
  }
}

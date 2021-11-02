import { Operator } from "./operator";
import {
  AggregatorRule,
  ConditionProperties,
  DynamicObject,
  NestedCondition,
  Sort,
  TopLevelCondition,
} from "../Types";
import defaultOperator from "./default-operators";
// import { Engine, TopLevelCondition as Rule } from "json-rules-engine";
import { Engine } from "json-rules-engine";

import { Validator } from "../utils";
import elasticBuilder from "elastic-builder";
import { Aggregator } from "./aggregator";
import defaultAggregator from "./default-aggs";
import { QueryBuilder } from "./queryBuilder";

export default class Transformer {
  private operators: Map<string, Operator>;
  private aggregator: Map<string, Aggregator>;
  private _routingValue: string | number | null = null;
  private rule: TopLevelCondition | null = null;
  private aggregatorRule: AggregatorRule[] = [];
  private sortRule: Sort[] = [];
  private _from: number = 0;
  private _size: number = 0;
  constructor() {
    this.operators = new Map();
    this.aggregator = new Map();

    defaultOperator.map((data) => {
      this.addOperator(data, () => {});
    });

    defaultAggregator.map((data) => {
      this.addAggregator(data, () => {});
    });
  }

  /**
   * Add a custom operator definition
   * @param {string} operatorName - operator identifier
   * @param {function(fieldName,value,additionalProperties)} callback - the method to execute when the operator is encountered
   */
  addOperator(
    operatorName: string | Operator,
    callback: (
      fieldName: string,
      value: any,
      additionProperties: DynamicObject
    ) => any
  ) {
    let operator;
    if (operatorName instanceof Operator) {
      operator = operatorName;
    } else {
      operator = new Operator(operatorName, callback);
    }

    this.operators.set(operator.name, operator);
    return this;
  }

  /**
   * Remove a custom operator definition
   * @param operatorName - operator identifier
   */
  removeOperator(operatorName: string) {
    if (Validator.isNonEmptyString(operatorName)) {
      this.operators.delete(operatorName);
    } else {
      throw new Error("operatorName must be non empty string");
    }
    return this;
  }

  addAggregator(
    aggregatorName: string | Aggregator,
    callback: (
      name: string,
      fieldName: string,
      additionalProperties: DynamicObject
    ) => any
  ) {
    let aggregator;
    if (aggregatorName instanceof Aggregator) {
      aggregator = aggregatorName;
    } else {
      if (!Validator.isNonEmptyString(aggregatorName)) {
        throw new Error("aggregatorName must be a non empty string");
      }
      aggregator = new Aggregator(aggregatorName, callback);
    }

    this.aggregator.set(aggregator.name, aggregator);

    return this;
  }

  removeAggregator(aggregatorName: string) {
    if (Validator.isNonEmptyString(aggregatorName)) {
      this.aggregator.delete(aggregatorName);
    } else {
      throw new Error("aggregatorName must be non empty string");
    }
    return this;
  }

  /**
   *
   * @param routingValue - routing value
   *
   */
  setRoutingValue(routingValue: string | number) {
    this._routingValue = routingValue;

    return this;
  }
  /**
   * setRule
   * @param rule - json-rules-engine rule format
   */
  public setRule(rule: TopLevelCondition) {
    if (Validator.isNonEmptyObject(rule)) {
    } else {
      throw "rule must be a non empty object";
    }

    try {
      let engine = new Engine();

      engine.addRule({
        conditions: rule,
        event: {
          // define the event to fire when the conditions evaluate truthy
          type: "dummyEvent",
          params: {
            message: "dummyMessage",
          },
        },
      });
    } catch (error: any) {
      throw error;
    }

    this.rule = rule;
    return this;
  }

  offset(value: number) {
    if (!Validator.isPositiveNumber(value)) {
      throw new Error("offset value must be a positive integer");
    }

    this._from = value;

    return this;
  }

  limit(value: number) {
    if (!Validator.isPositiveNumber(value)) {
      throw new Error("size value must be a positive integer");
    }

    this._size = value;

    return this;
  }

  /**
   *
   * @returns {object} the builded search query
   */
  public toJson(): object {
    return new QueryBuilder(
      this.operators,
      this.aggregator,
      this.rule,
      this.aggregatorRule,
      this.sortRule,
      this._routingValue,
      this._from,
      this._size
    )
      .queryBuilder()
      .toJSON();
  }

  setAggregator(aggregator: AggregatorRule[]) {
    if (Array.isArray(aggregator)) {
      this.aggregatorRule = this.aggregatorRule.concat(aggregator);
    } else {
      throw new Error("aggregator in must be a instance of a Array");
    }

    return this;
  }

  private aggsWrapper(data: AggregatorRule) {
    this.aggregatorRule.push(data);
  }

  sum(name: string | AggregatorRule[], fieldName: string = "") {
    if (Array.isArray(name)) {
    } else {
      this.aggsWrapper({
        name: name,
        aggregator: "sum",
        fieldName: fieldName,
        additionalProperties: {},
      });
    }

    return this;
  }

  avg(name: string | AggregatorRule[], fieldName: string = "") {
    if (Array.isArray(name)) {
    } else {
      this.aggsWrapper({
        name: name,
        aggregator: "avg",
        fieldName: fieldName,
        additionalProperties: {},
      });
    }

    return this;
  }

  max(name: string | AggregatorRule[], fieldName: string = "") {
    if (Array.isArray(name)) {
    } else {
      this.aggsWrapper({
        name: name,
        aggregator: "max",
        fieldName: fieldName,
        additionalProperties: {},
      });
    }

    return this;
  }

  min(name: string | AggregatorRule[], fieldName: string = "") {
    if (Array.isArray(name)) {
    } else {
      this.aggsWrapper({
        name: name,
        aggregator: "min",
        fieldName: fieldName,
        additionalProperties: {},
      });
    }

    return this;
  }

  sort(fieldName: string | Sort[], order: "asc" | "desc" = "asc") {
    if (Array.isArray(fieldName)) {
      this.sortRule = this.sortRule.concat(fieldName);
    } else {
      this.sortRule.push({ fieldName: fieldName, order: order });
    }

    return this;
  }
}

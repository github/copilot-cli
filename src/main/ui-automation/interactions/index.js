/**
 * Interactions Module
 * 
 * @module ui-automation/interactions
 */

const { 
  click, 
  clickByText, 
  clickByAutomationId, 
  rightClick, 
  doubleClick,
  clickElement,
  invokeElement,
} = require('./element-click');

const {
  fillField,
  selectDropdownItem,
  waitForWindow,
  clickSequence,
  hover,
  waitAndClick,
  clickAndWaitFor,
  selectFromDropdown,
} = require('./high-level');

module.exports = {
  // Element clicks
  click,
  clickByText,
  clickByAutomationId,
  rightClick,
  doubleClick,
  clickElement,
  invokeElement,
  
  // High-level interactions
  fillField,
  selectDropdownItem,
  waitForWindow,
  clickSequence,
  hover,
  waitAndClick,
  clickAndWaitFor,
  selectFromDropdown,
};

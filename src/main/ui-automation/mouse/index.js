/**
 * Mouse Operations Module
 * 
 * @module ui-automation/mouse
 */

const { moveMouse, getMousePosition } = require('./movement');
const { clickAt, doubleClickAt } = require('./click');
const { drag } = require('./drag');
const { scroll, scrollUp, scrollDown, scrollLeft, scrollRight } = require('./scroll');

module.exports = {
  // Movement
  moveMouse,
  getMousePosition,
  
  // Clicks
  clickAt,
  doubleClickAt,
  
  // Drag
  drag,
  
  // Scrolling
  scroll,
  scrollUp,
  scrollDown,
  scrollLeft,
  scrollRight,
};

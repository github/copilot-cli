/**
 * Keyboard Module
 * 
 * @module ui-automation/keyboard
 */

const { typeText, sendKeys, keyDown, keyUp, VK } = require('./input');

module.exports = {
  typeText,
  sendKeys,
  keyDown,
  keyUp,
  VK,
};

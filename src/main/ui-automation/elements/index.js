/**
 * Element Discovery and Wait Utilities
 * @module ui-automation/elements
 */

const { findElements, findElement } = require('./finder');
const { waitForElement, waitForElementGone } = require('./wait');

module.exports = {
  findElements,
  findElement,
  waitForElement,
  waitForElementGone,
};

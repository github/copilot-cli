/**
 * Test semantic element finding and clicking
 */
const auto = require('../src/main/system-automation.js');

async function test() {
  // Search for model picker containing "Opus"
  console.log('Searching for element containing "Opus"...');
  const result = await auto.findElementByText('Opus');
  
  console.log(`Found ${result.count} elements:`);
  
  if (result.elements && result.elements.length > 0) {
    result.elements.forEach((el, i) => {
      console.log(`  [${i}] "${el.Name}"`);
      console.log(`       Type: ${el.ControlType}`);
      console.log(`       Center: (${el.Bounds.CenterX}, ${el.Bounds.CenterY})`);
      console.log(`       Size: ${el.Bounds.Width}x${el.Bounds.Height}`);
    });
    
    // Ask user which to click (or auto-click first one)
    if (process.argv[2] === '--click') {
      const idx = parseInt(process.argv[3]) || 0;
      const el = result.elements[idx];
      if (el) {
        console.log(`\nClicking element [${idx}]: "${el.Name}"...`);
        await auto.click(el.Bounds.CenterX, el.Bounds.CenterY, 'left');
        console.log('Click sent!');
      }
    }
  } else {
    console.log('No elements found.');
    if (result.error) {
      console.log('Error:', result.error);
    }
  }
}

test().catch(e => console.error('Error:', e));

// Simple debug script to trace shift+scroll behavior

import { InputState } from '../game/InputManager';

// Simulate the key parts of SoilManager's shift+scroll logic
function simulateShiftScroll() {
  // Initial state
  let hoveredHex = { q: 0, r: 0 };
  let targetY = 0;
  let hasScrolled = false;
  let useManualHeight = false;
  let hoveredY = 0;
  
  const columnHeight = 2; // Simulated column with height 2
  const maxHeight = columnHeight;
  const actualHeight = columnHeight;
  
  console.log('=== Simulating Shift+Scroll Behavior ===');
  console.log('Initial state:');
  console.log('  targetY:', targetY);
  console.log('  hoveredY:', hoveredY);
  console.log('  hasScrolled:', hasScrolled);
  console.log('  columnHeight:', columnHeight);
  console.log('');
  
  // Simulate shift+scroll input
  const inputState: Partial<InputState> = {
    shift: true,
    scrollDelta: -1,  // Scroll up
    currentTool: 'place'
  };
  
  // This is the condition from line 104 of SoilManager
  if (inputState.scrollDelta !== 0 && hoveredHex && inputState.shift) {
    console.log('Shift+scroll detected!');
    
    // From lines 111-113
    const minY = 0;
    const oldTargetY = targetY;
    targetY = Math.max(minY, Math.min(maxHeight + 1, targetY - inputState.scrollDelta!));
    useManualHeight = false;
    hasScrolled = true;
    
    console.log(`  targetY changed from ${oldTargetY} to ${targetY}`);
    console.log('  hasScrolled set to:', hasScrolled);
    console.log('  useManualHeight set to:', useManualHeight);
  }
  
  console.log('');
  console.log('After shift+scroll handling:');
  console.log('  targetY:', targetY);
  console.log('  hasScrolled:', hasScrolled);
  console.log('');
  
  // Now simulate the updatePreview logic
  
  // From line 201: Auto-update only if not scrolled
  if (!useManualHeight && !hasScrolled) {
    console.log('Would auto-update targetY (but hasScrolled=true, so skipping)');
  }
  
  // From lines 220-233: Apply target height
  if (useManualHeight) {
    hoveredY = targetY;
    console.log('Manual mode: hoveredY = targetY =', hoveredY);
  } else {
    // From line 226: Check if user has scrolled
    if (hasScrolled) {
      hoveredY = targetY;
      console.log('Has scrolled: hoveredY = targetY =', hoveredY);
    } else {
      hoveredY = Math.min(targetY, actualHeight + 1);
      console.log('Normal mode: hoveredY = min(targetY, actualHeight+1) =', hoveredY);
    }
  }
  
  console.log('');
  console.log('Final result:');
  console.log('  targetY:', targetY);
  console.log('  hoveredY:', hoveredY);
  console.log('  (hoveredY is what determines placement height)');
  
  // Test multiple scrolls
  console.log('\n=== Testing Multiple Scrolls ===');
  for (let i = 0; i < 3; i++) {
    targetY = Math.max(0, Math.min(maxHeight + 1, targetY - (-1)));
    hoveredY = targetY; // Since hasScrolled is true
    console.log(`Scroll ${i+1}: targetY=${targetY}, hoveredY=${hoveredY}`);
  }
  
  return { targetY, hoveredY, hasScrolled };
}

// Run the simulation
const result = simulateShiftScroll();
console.log('\n=== Summary ===');
console.log('Shift+scroll should change hoveredY:', result.hoveredY !== 0 ? '✓ WORKS' : '✗ FAILED');

export { simulateShiftScroll };
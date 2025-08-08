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
  
  
  // Simulate shift+scroll input
  const inputState: Partial<InputState> = {
    shift: true,
    scrollDelta: -1,  // Scroll up
    currentTool: 'place'
  };
  
  // This is the condition from line 104 of SoilManager
  if (inputState.scrollDelta !== 0 && hoveredHex && inputState.shift) {
    
    // From lines 111-113
    const minY = 0;
    const oldTargetY = targetY;
    targetY = Math.max(minY, Math.min(maxHeight + 1, targetY - inputState.scrollDelta!));
    useManualHeight = false;
    hasScrolled = true;
    
  }
  
  
  // Now simulate the updatePreview logic
  
  // From line 201: Auto-update only if not scrolled
  if (!useManualHeight && !hasScrolled) {
  }
  
  // From lines 220-233: Apply target height
  if (useManualHeight) {
    hoveredY = targetY;
  } else {
    // From line 226: Check if user has scrolled
    if (hasScrolled) {
      hoveredY = targetY;
    } else {
      hoveredY = Math.min(targetY, actualHeight + 1);
    }
  }
  
  
  // Test multiple scrolls
  for (let i = 0; i < 3; i++) {
    targetY = Math.max(0, Math.min(maxHeight + 1, targetY - (-1)));
    hoveredY = targetY; // Since hasScrolled is true
  }
  
  return { targetY, hoveredY, hasScrolled };
}

// Run the simulation
const result = simulateShiftScroll();

export { simulateShiftScroll };
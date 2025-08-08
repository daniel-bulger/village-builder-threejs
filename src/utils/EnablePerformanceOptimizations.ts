// Performance optimization toggle
// This file demonstrates how to enable performance optimizations in the game

import { DEFAULT_PERFORMANCE_SETTINGS } from './PerformanceConfig';

// Check URL parameters for performance flags
export function getPerformanceSettings() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Copy default settings
  const settings = { ...DEFAULT_PERFORMANCE_SETTINGS };
  
  // Override from URL params
  if (urlParams.has('optimize')) {
    const optimizeValue = urlParams.get('optimize');
    
    if (optimizeValue === 'all' || optimizeValue === 'true') {
      settings.useOptimizedWaterSim = true;
      settings.useMeshPooling = true;
      settings.useInstancedSoilRendering = true;
      settings.plantLODEnabled = true;
    } else if (optimizeValue === 'water') {
      settings.useOptimizedWaterSim = true;
    } else if (optimizeValue === 'plants') {
      settings.useMeshPooling = true;
      settings.plantLODEnabled = true;
    } else if (optimizeValue === 'soil') {
      settings.useInstancedSoilRendering = true;
    }
  }
  
  // Individual flag overrides
  if (urlParams.has('waterOpt')) {
    settings.useOptimizedWaterSim = urlParams.get('waterOpt') === 'true';
  }
  
  if (urlParams.has('plantPool')) {
    settings.useMeshPooling = urlParams.get('plantPool') === 'true';
  }
  
  if (urlParams.has('soilInstance')) {
    settings.useInstancedSoilRendering = urlParams.get('soilInstance') === 'true';
  }
  
  if (urlParams.has('plantLOD')) {
    settings.plantLODEnabled = urlParams.get('plantLOD') === 'true';
  }
  
  if (urlParams.has('perfStats')) {
    settings.enablePerformanceStats = urlParams.get('perfStats') === 'true';
  }
  
  return settings;
}

// Usage instructions
export function printPerformanceHelp() {
}

// Auto-print help if debug mode
if (window.location.search.includes('debug')) {
  printPerformanceHelp();
}
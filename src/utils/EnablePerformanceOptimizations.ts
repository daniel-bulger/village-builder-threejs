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
      console.log('🚀 All performance optimizations enabled');
    } else if (optimizeValue === 'water') {
      settings.useOptimizedWaterSim = true;
      console.log('💧 Water simulation optimization enabled');
    } else if (optimizeValue === 'plants') {
      settings.useMeshPooling = true;
      settings.plantLODEnabled = true;
      console.log('🌱 Plant rendering optimization enabled');
    } else if (optimizeValue === 'soil') {
      settings.useInstancedSoilRendering = true;
      console.log('🟫 Soil instancing optimization enabled');
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
  console.log(`
=== Performance Optimization Guide ===

To enable optimizations, add URL parameters:

1. Enable ALL optimizations:
   ?optimize=all

2. Enable specific optimizations:
   ?optimize=water    - Optimized water simulation
   ?optimize=plants   - Plant mesh pooling and LOD
   ?optimize=soil     - Instanced soil rendering

3. Fine-grained control:
   ?waterOpt=true     - Optimized water simulation
   ?plantPool=true    - Plant mesh pooling
   ?soilInstance=true - Instanced soil rendering  
   ?plantLOD=true     - Plant level-of-detail
   ?perfStats=true    - Show performance stats

4. Example combinations:
   ?optimize=all&perfStats=true
   ?waterOpt=true&plantPool=true
   
Current settings:`, getPerformanceSettings());
}

// Auto-print help if debug mode
if (window.location.search.includes('debug')) {
  printPerformanceHelp();
}
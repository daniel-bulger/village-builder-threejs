/**
 * SoilPlacerTool.ts
 * 
 * Tool for placing soil from inventory onto hexes.
 * Allows selecting a soil stack from inventory and applying it to hexes.
 * 
 * Key behaviors:
 * - Click inventory slot to select soil type
 * - Click hex to place 1.0 hex worth of soil
 * - Hold shift to place 0.1 hex worth (precise placement)
 * - Shows preview of nutrient change before placing
 * - Updates hex nutrients using weighted average with existing soil
 */

import * as THREE from 'three';
import { HexCoord3D } from '../utils/HexUtils';
import { SoilInventory } from '../inventory/SoilInventory';
import { SoilItem } from '../items/SoilItem';
import { NutrientSystem } from '../farming/NutrientSystem';
import { SoilManager } from '../farming/SoilManager';
import { DOMUtils } from '../utils/DOMUtils';

export class SoilPlacerTool {
  private selectedSlot: number | null = null;
  private inventory: SoilInventory;
  private nutrientSystem: NutrientSystem;
  private soilManager: SoilManager | null = null;
  private previewElement: HTMLDivElement | null = null;

  constructor(inventory: SoilInventory, nutrientSystem: NutrientSystem) {
    this.inventory = inventory;
    this.nutrientSystem = nutrientSystem;
    this.createPreviewElement();
  }

  /**
   * Create preview element for showing nutrient changes
   */
  private createPreviewElement(): void {
    this.previewElement = document.createElement('div');
    this.previewElement.id = 'soil-placer-preview';
    this.previewElement.style.cssText = `
      position: fixed;
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #4a5568;
      border-radius: 4px;
      padding: 10px;
      color: #e2e8f0;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
      display: none;
      min-width: 200px;
    `;
    document.body.appendChild(this.previewElement);
  }

  /**
   * Select a soil slot from inventory
   */
  public selectSlot(slotIndex: number): boolean {
    const slot = this.inventory.getSlot(slotIndex);
    if (!slot?.item) {
      this.selectedSlot = null;
      return false;
    }

    this.selectedSlot = slotIndex;
    return true;
  }

  /**
   * Get currently selected soil
   */
  public getSelectedSoil(): SoilItem | null {
    if (this.selectedSlot === null) return null;
    
    const slot = this.inventory.getSlot(this.selectedSlot);
    return slot?.item || null;
  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    this.selectedSlot = null;
    this.hidePreview();
  }

  /**
   * Set the soil manager reference
   */
  public setSoilManager(soilManager: SoilManager): void {
    this.soilManager = soilManager;
  }

  /**
   * Place soil at hex coordinate
   * 
   * @param coord Target hex coordinate
   * @param amount Amount to place (default 1.0 hex worth)
   * @returns true if placement successful
   */
  public placeSoil(coord: HexCoord3D, amount: number = 1.0): boolean {
    const selectedSoil = this.getSelectedSoil();
    
    if (!selectedSoil || this.selectedSlot === null || !this.soilManager) {
      return false;
    }

    // Check if we have enough soil (for now, always use 1.0 hex worth regardless of amount parameter)
    // TODO: In future, support fractional hex placement
    if (selectedSoil.quantity < 1.0) {
      return false;
    }

    // Try to place new soil hex using SoilManager's placement logic
    const placed = this.soilManager.placeSoil(coord);
    if (!placed) {
      return false;
    }

    // Now set the nutrients for the newly created hex
    // Convert soil nutrients from 0-100 to 0-1 scale
    const nutrientLevels = {
      nitrogen: selectedSoil.nutrients.nitrogen / 100,
      phosphorus: selectedSoil.nutrients.phosphorus / 100,
      potassium: selectedSoil.nutrients.potassium / 100
    };

    // Remove default nutrients and add our specific nutrients
    const defaultNutrients = this.nutrientSystem.getNutrients(coord);
    if (defaultNutrients) {
      // Calculate deltas from default (0.5) to desired levels
      const nutrientDeltas = {
        nitrogen: nutrientLevels.nitrogen - defaultNutrients.nitrogen,
        phosphorus: nutrientLevels.phosphorus - defaultNutrients.phosphorus,
        potassium: nutrientLevels.potassium - defaultNutrients.potassium
      };
      
      this.nutrientSystem.addNutrients(coord, nutrientDeltas);
    }

    // Remove soil from inventory (always remove 1.0 for now)
    const removed = this.inventory.removeFromSlot(this.selectedSlot, 1.0);
    if (!removed) {
      // This shouldn't happen since we checked quantity above
      console.error('Failed to remove soil from inventory');
      return false;
    }

    // If slot is now empty, clear selection
    const slot = this.inventory.getSlot(this.selectedSlot);
    if (!slot?.item) {
      this.clearSelection();
    }

    // Update soil colors to reflect new nutrients
    this.soilManager.updateSoilColors();

    return true;
  }

  /**
   * Show preview of nutrient change at coordinate
   */
  public showPreview(coord: HexCoord3D, mouseX: number, mouseY: number): void {
    if (!this.previewElement || !this.soilManager) return;

    const selectedSoil = this.getSelectedSoil();
    if (!selectedSoil) {
      this.hidePreview();
      return;
    }

    // Check if we can place here
    const canPlace = this.soilManager.canPlaceSoilAt(coord);
    
    // Check for existing soil
    const existingNutrients = this.nutrientSystem.getNutrients(coord);
    
    // Format preview
    const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
    
    let previewContent = '';
    
    if (existingNutrients) {
      // Hex already exists - show we can't place here
      previewContent = `
        <div style="font-weight: bold; margin-bottom: 5px; color: #f56565;">Cannot Place Here</div>
        <div style="color: #a0aec0">
          Soil already exists at this location<br>
          Current nutrients:
        </div>
        <div style="display: grid; grid-template-columns: auto auto; gap: 5px; margin-top: 5px;">
          <div style="color: #ff6b6b">N:</div>
          <div>${formatPercent(existingNutrients.nitrogen)}</div>
          
          <div style="color: #51cf66">P:</div>
          <div>${formatPercent(existingNutrients.phosphorus)}</div>
          
          <div style="color: #339af0">K:</div>
          <div>${formatPercent(existingNutrients.potassium)}</div>
        </div>
      `;
    } else if (canPlace) {
      // Can place new hex
      previewContent = `
        <div style="font-weight: bold; margin-bottom: 5px; color: #48bb78;">New Soil Hex</div>
        <div style="margin-bottom: 8px; color: #a0aec0">
          Placing: ${selectedSoil.getDisplayName()}<br>
          Amount: 1 hex
        </div>
        <div style="display: grid; grid-template-columns: auto auto; gap: 5px;">
          <div style="color: #ff6b6b">N:</div>
          <div>${selectedSoil.nutrients.nitrogen}%</div>
          
          <div style="color: #51cf66">P:</div>
          <div>${selectedSoil.nutrients.phosphorus}%</div>
          
          <div style="color: #339af0">K:</div>
          <div>${selectedSoil.nutrients.potassium}%</div>
        </div>
        <div style="margin-top: 8px; color: #718096; font-size: 11px;">
          Click to place new soil hex
        </div>
      `;
    } else {
      // Can't place here (mid-air, etc)
      previewContent = `
        <div style="font-weight: bold; margin-bottom: 5px; color: #f56565;">Cannot Place Here</div>
        <div style="color: #a0aec0">
          Invalid placement location<br>
          Must place on ground or existing soil
        </div>
      `;
    }

    // Clear and rebuild preview safely without innerHTML
    this.previewElement.textContent = '';
    
    // Build preview content using safe DOM methods
    if (existingNutrients) {
      // Cannot place here - soil already exists
      const title = document.createElement('div');
      title.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #f56565;';
      title.textContent = 'Cannot Place Here';
      this.previewElement.appendChild(title);
      
      const info = document.createElement('div');
      info.style.color = '#a0aec0';
      info.textContent = 'Soil already exists at this location';
      this.previewElement.appendChild(info);
      
      const currentLabel = document.createElement('div');
      currentLabel.style.color = '#a0aec0';
      currentLabel.textContent = 'Current nutrients:';
      this.previewElement.appendChild(currentLabel);
      
      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: auto auto; gap: 5px; margin-top: 5px;';
      
      const nutrients = [
        { label: 'N:', value: formatPercent(existingNutrients.nitrogen), color: '#ff6b6b' },
        { label: 'P:', value: formatPercent(existingNutrients.phosphorus), color: '#51cf66' },
        { label: 'K:', value: formatPercent(existingNutrients.potassium), color: '#339af0' }
      ];
      
      nutrients.forEach(n => {
        const labelDiv = document.createElement('div');
        labelDiv.style.color = n.color;
        labelDiv.textContent = n.label;
        grid.appendChild(labelDiv);
        
        const valueDiv = document.createElement('div');
        valueDiv.textContent = n.value;
        grid.appendChild(valueDiv);
      });
      
      this.previewElement.appendChild(grid);
    } else if (canPlace) {
      // Can place new hex
      const title = document.createElement('div');
      title.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #48bb78;';
      title.textContent = 'New Soil Hex';
      this.previewElement.appendChild(title);
      
      const info = document.createElement('div');
      info.style.cssText = 'margin-bottom: 8px; color: #a0aec0;';
      info.appendChild(document.createTextNode(`Placing: ${selectedSoil.getDisplayName()}`));
      info.appendChild(document.createElement('br'));
      info.appendChild(document.createTextNode('Amount: 1 hex'));
      this.previewElement.appendChild(info);
      
      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: auto auto; gap: 5px;';
      
      const nutrients = [
        { label: 'N:', value: `${selectedSoil.nutrients.nitrogen}%`, color: '#ff6b6b' },
        { label: 'P:', value: `${selectedSoil.nutrients.phosphorus}%`, color: '#51cf66' },
        { label: 'K:', value: `${selectedSoil.nutrients.potassium}%`, color: '#339af0' }
      ];
      
      nutrients.forEach(n => {
        const labelDiv = document.createElement('div');
        labelDiv.style.color = n.color;
        labelDiv.textContent = n.label;
        grid.appendChild(labelDiv);
        
        const valueDiv = document.createElement('div');
        valueDiv.textContent = n.value;
        grid.appendChild(valueDiv);
      });
      
      this.previewElement.appendChild(grid);
      
      const hint = document.createElement('div');
      hint.style.cssText = 'margin-top: 8px; color: #718096; font-size: 11px;';
      hint.textContent = 'Click to place new soil hex';
      this.previewElement.appendChild(hint);
    } else {
      // Can't place here (mid-air, etc)
      const title = document.createElement('div');
      title.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #f56565;';
      title.textContent = 'Cannot Place Here';
      this.previewElement.appendChild(title);
      
      const info = document.createElement('div');
      info.style.color = '#a0aec0';
      info.appendChild(document.createTextNode('Invalid placement location'));
      info.appendChild(document.createElement('br'));
      info.appendChild(document.createTextNode('Must place on ground or existing soil'));
      this.previewElement.appendChild(info);
    }

    // Position near mouse
    this.previewElement.style.left = `${mouseX + 15}px`;
    this.previewElement.style.top = `${mouseY - 50}px`;
    this.previewElement.style.display = 'block';
  }

  /**
   * Hide preview
   */
  public hidePreview(): void {
    if (this.previewElement) {
      this.previewElement.style.display = 'none';
    }
  }

  /**
   * Get display info for selected soil
   */
  public getSelectionInfo(): string | null {
    const soil = this.getSelectedSoil();
    if (!soil) return null;

    return `${soil.getDisplayName()} (${soil.quantity.toFixed(1)} hexes)`;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.previewElement && this.previewElement.parentNode) {
      this.previewElement.parentNode.removeChild(this.previewElement);
    }
  }
}
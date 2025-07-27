import * as THREE from 'three';
import { HexUtils } from '../utils/HexUtils';
import { Constants } from '../utils/Constants';

export class HexGrid {
  private gridHelper: THREE.Group;
  private visible: boolean = false;
  
  constructor(private scene: THREE.Scene) {
    this.gridHelper = new THREE.Group();
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);
    
    this.createGridLines();
  }
  
  private createGridLines(): void {
    const material = new THREE.LineBasicMaterial({
      color: Constants.GRID_COLOR,
      opacity: Constants.GRID_OPACITY,
      transparent: true
    });
    
    // Generate hex outlines in a radius around origin
    for (let q = -Constants.GRID_RADIUS; q <= Constants.GRID_RADIUS; q++) {
      for (let r = -Constants.GRID_RADIUS; r <= Constants.GRID_RADIUS; r++) {
        // Skip hexes outside the radius
        if (Math.abs(q + r) > Constants.GRID_RADIUS) continue;
        
        const hex = { q, r };
        const center = HexUtils.hexToWorld(hex);
        const corners = HexUtils.getHexCorners(center);
        
        // Raise slightly above ground to prevent z-fighting
        corners.forEach(corner => corner.y = 0.01);
        
        const geometry = new THREE.BufferGeometry().setFromPoints(corners);
        const line = new THREE.LineLoop(geometry, material);
        
        this.gridHelper.add(line);
      }
    }
  }
  
  toggleVisibility(): void {
    this.visible = !this.visible;
    this.gridHelper.visible = this.visible;
  }
  
  isVisible(): boolean {
    return this.visible;
  }
  
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.gridHelper.visible = visible;
  }
}
import * as THREE from 'three';
import { Constants } from '../utils/Constants';

export class Lighting {
  public readonly sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private timeOfDay: number = 0.5; // 0-1, where 0.5 is noon
  private paused: boolean = false;
  
  constructor(private scene: THREE.Scene) {
    this.createAmbientLight();
    this.createSunLight();
    this.updateLighting();
  }
  
  private createAmbientLight(): void {
    this.ambient = new THREE.AmbientLight(0xffffff, Constants.AMBIENT_INTENSITY);
    this.scene.add(this.ambient);
  }
  
  private createSunLight(): void {
    // Create directional light for sun
    this.sun = new THREE.DirectionalLight(0xffffff, Constants.SUN_INTENSITY);
    this.sun.castShadow = true;
    
    // Configure shadow properties
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 500;
    
    // Set up shadow camera bounds
    const shadowSize = 50;
    this.sun.shadow.camera.left = -shadowSize;
    this.sun.shadow.camera.right = shadowSize;
    this.sun.shadow.camera.top = shadowSize;
    this.sun.shadow.camera.bottom = -shadowSize;
    
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
  }
  
  update(deltaTime: number): void {
    if (!this.paused) {
      // Update time of day
      this.timeOfDay += deltaTime / Constants.DAY_DURATION;
      if (this.timeOfDay > 1) this.timeOfDay -= 1;
    }
    
    this.updateLighting();
  }
  
  private updateLighting(): void {
    // Calculate sun position
    const sunAngle = this.timeOfDay * Math.PI * 2 - Math.PI / 2; // Start at sunrise
    const sunHeight = Math.sin(sunAngle);
    const sunDistance = 100;
    
    this.sun.position.set(
      Math.cos(sunAngle) * sunDistance,
      Math.max(5, sunHeight * sunDistance), // Keep sun above horizon
      sunDistance * 0.5
    );
    
    // Point sun at origin
    this.sun.target.position.set(0, 0, 0);
    
    // Adjust light intensity based on sun height
    const dayAmount = Math.max(0, sunHeight);
    this.sun.intensity = Constants.SUN_INTENSITY * (0.3 + dayAmount * 0.7);
    
    // Adjust ambient light
    this.ambient.intensity = Constants.AMBIENT_INTENSITY * (0.3 + dayAmount * 0.7);
    
    // Adjust light color for sunrise/sunset
    if (sunHeight < 0.3 && sunHeight > -0.3) {
      const twilightAmount = 1 - Math.abs(sunHeight) / 0.3;
      const twilightColor = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff),
        new THREE.Color(0xff6b35),
        twilightAmount * 0.5
      );
      this.sun.color = twilightColor;
      
      // Also tint ambient light slightly
      const ambientTwilight = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff),
        new THREE.Color(0x4a5c7a),
        twilightAmount * 0.3
      );
      this.ambient.color = ambientTwilight;
    } else {
      this.sun.color.setHex(0xffffff);
      this.ambient.color.setHex(0xffffff);
    }
    
    // Update fog color based on time of day
    if (this.scene.fog instanceof THREE.Fog) {
      const fogColor = new THREE.Color().lerpColors(
        new THREE.Color(0xf0e6d2), // Day fog
        new THREE.Color(0x2a3c5a), // Night fog
        1 - dayAmount
      );
      this.scene.fog.color = fogColor;
    }
    
    // Update sky color
    const skyColor = new THREE.Color().lerpColors(
      new THREE.Color(0x87CEEB), // Day sky
      new THREE.Color(0x0a1929), // Night sky
      1 - dayAmount
    );
    this.scene.background = skyColor;
  }
  
  getTimeOfDay(): number {
    return this.timeOfDay;
  }
  
  setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, time));
    this.updateLighting();
  }
  
  pauseDayCycle(): void {
    this.paused = true;
  }
  
  resumeDayCycle(): void {
    this.paused = false;
  }
}
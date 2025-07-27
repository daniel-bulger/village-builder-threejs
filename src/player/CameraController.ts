import * as THREE from 'three';
import { Player } from './Player';
import { InputState } from '../game/InputManager';
import { Constants } from '../utils/Constants';

export type CameraMode = 'third-person' | 'overhead';

export class CameraController {
  private mode: CameraMode = 'third-person';
  public angle = 0; // Made public for testing
  private pitch = 0.3; // Vertical angle in radians
  private distance = Constants.THIRD_PERSON_DISTANCE;
  private targetDistance = Constants.THIRD_PERSON_DISTANCE;
  
  // Smoothing
  private positionSmoothing = 0.1;
  private lookAtSmoothing = 0.15;
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private isFirstFrame = true;
  
  constructor(private camera: THREE.PerspectiveCamera) {}
  
  update(player: Player, input: InputState): void {
    // Toggle camera mode
    if (input.toggleCamera) {
      this.mode = this.mode === 'third-person' ? 'overhead' : 'third-person';
      
      // Reset distance for new mode
      this.targetDistance = this.mode === 'third-person' 
        ? Constants.THIRD_PERSON_DISTANCE 
        : Constants.OVERHEAD_HEIGHT;
    }
    
    // Handle zoom with scroll wheel (when shift is NOT held)
    if (input.scrollDelta !== 0 && !input.shift) {
      const zoomSpeed = 2;
      const zoomFactor = 1 + (input.scrollDelta * zoomSpeed * 0.1);
      
      if (this.mode === 'third-person') {
        // Clamp zoom distance for third person
        this.targetDistance = Math.max(5, Math.min(50, this.targetDistance * zoomFactor));
      } else {
        // Clamp zoom height for overhead
        this.targetDistance = Math.max(10, Math.min(100, this.targetDistance * zoomFactor));
      }
    }
    
    // Update camera based on mode
    if (this.mode === 'third-person') {
      this.updateThirdPerson(player, input);
    } else {
      this.updateOverhead(player, input);
    }
  }
  
  private updateThirdPerson(player: Player, input: InputState): void {
    // Only update rotation when middle mouse button is held
    if (input.mouseMiddle) {
      this.angle -= input.mouseX * 0.01;
      this.pitch = Math.max(0.1, Math.min(1.2, this.pitch - input.mouseY * 0.01));
    }
    
    // Smooth distance changes
    this.distance += (this.targetDistance - this.distance) * 0.1;
    
    // Calculate camera position
    const horizontalDistance = this.distance * Math.cos(this.pitch);
    const verticalDistance = this.distance * Math.sin(this.pitch);
    
    this.targetPosition.set(
      player.position.x + Math.sin(this.angle) * horizontalDistance,
      player.position.y + verticalDistance + Constants.PLAYER_HEIGHT * 0.5,
      player.position.z + Math.cos(this.angle) * horizontalDistance
    );
    
    // Look at player's upper body
    this.targetLookAt.copy(player.position);
    this.targetLookAt.y += Constants.PLAYER_HEIGHT * 0.7;
    
    // On first frame, snap to position immediately
    if (this.isFirstFrame) {
      this.camera.position.copy(this.targetPosition);
      this.camera.lookAt(this.targetLookAt);
      this.isFirstFrame = false;
    } else {
      // Smooth camera movement
      this.camera.position.lerp(this.targetPosition, this.positionSmoothing);
      
      // Smooth look at
      const currentLookAt = new THREE.Vector3();
      this.camera.getWorldDirection(currentLookAt);
      currentLookAt.multiplyScalar(10).add(this.camera.position);
      currentLookAt.lerp(this.targetLookAt, this.lookAtSmoothing);
      this.camera.lookAt(currentLookAt);
    }
  }
  
  private updateOverhead(player: Player): void {
    // Smooth distance changes
    this.distance += (this.targetDistance - this.distance) * 0.1;
    
    // Position camera above and slightly behind player
    this.targetPosition.set(
      player.position.x,
      player.position.y + this.distance,
      player.position.z + this.distance * 0.3
    );
    
    // Look at player position
    this.targetLookAt.copy(player.position);
    
    // Smooth transitions
    this.camera.position.lerp(this.targetPosition, this.positionSmoothing * 2);
    this.camera.lookAt(this.targetLookAt);
  }
  
  getMode(): CameraMode {
    return this.mode;
  }
}
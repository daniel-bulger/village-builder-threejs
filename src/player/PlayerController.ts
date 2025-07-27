import * as THREE from 'three';
import { Player } from './Player';
import { InputState } from '../game/InputManager';
import { Constants } from '../utils/Constants';

export class PlayerController {
  private moveDirection = new THREE.Vector3();
  private cameraDirection = new THREE.Vector3();
  private rightVector = new THREE.Vector3();
  
  constructor(private player: Player) {}
  
  update(deltaTime: number, input: InputState, camera: THREE.Camera): void {
    // Calculate movement speed
    const speed = input.shift ? Constants.RUN_SPEED : Constants.WALK_SPEED;
    
    // Get input direction
    const forward = (input.w ? 1 : 0) + (input.s ? -1 : 0);
    const right = (input.d ? 1 : 0) + (input.a ? -1 : 0);
    
    // No movement if no input
    if (forward === 0 && right === 0) {
      this.player.velocity.set(0, 0, 0);
      return;
    }
    
    // Get camera forward direction (projected on XZ plane)
    camera.getWorldDirection(this.cameraDirection);
    this.cameraDirection.y = 0;
    this.cameraDirection.normalize();
    
    // Calculate right vector
    this.rightVector.crossVectors(this.cameraDirection, new THREE.Vector3(0, 1, 0));
    
    // Calculate movement direction
    this.moveDirection.set(0, 0, 0);
    this.moveDirection.addScaledVector(this.cameraDirection, forward);
    this.moveDirection.addScaledVector(this.rightVector, right);
    this.moveDirection.normalize();
    
    // Apply movement
    this.player.velocity.copy(this.moveDirection).multiplyScalar(speed);
    
    // Rotate player to face movement direction
    if (this.moveDirection.length() > 0.1) {
      const targetRotation = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      
      // Smooth rotation
      const currentRotation = this.player.rotation.y;
      let rotationDiff = targetRotation - currentRotation;
      
      // Normalize rotation difference to [-PI, PI]
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      this.player.rotation.y += rotationDiff * deltaTime * 10;
    }
    
    // Update player
    this.player.update(deltaTime);
  }
}
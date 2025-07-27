import * as THREE from 'three';
import { Constants } from '../utils/Constants';

export class Player {
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly rotation: THREE.Euler;
  public velocity: THREE.Vector3;
  
  constructor() {
    this.mesh = new THREE.Group();
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;
    this.velocity = new THREE.Vector3();
    
    this.createPlayerMesh();
  }
  
  private createPlayerMesh(): void {
    // Create a capsule-shaped body
    const geometry = new THREE.CapsuleGeometry(
      Constants.PLAYER_RADIUS,
      Constants.PLAYER_HEIGHT - Constants.PLAYER_RADIUS * 2,
      4,
      8
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const body = new THREE.Mesh(geometry, material);
    body.position.y = Constants.PLAYER_HEIGHT / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    
    this.mesh.add(body);
    
    // Add a simple direction indicator
    const indicatorGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const indicatorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(0, Constants.PLAYER_HEIGHT * 0.75, Constants.PLAYER_RADIUS + 0.25);
    
    this.mesh.add(indicator);
  }
  
  update(deltaTime: number): void {
    // Apply velocity
    this.position.addScaledVector(this.velocity, deltaTime);
    
    // Keep player on ground level
    this.position.y = 0;
  }
}
import * as THREE from 'three';

export interface PortalConfig {
  biomeType: 'fertile_valley' | 'ancient_forest' | 'volcanic_ash' | 'crystal_caves';
  position: THREE.Vector3;
  duration: number; // How long the portal stays open (in seconds)
}

export class Portal {
  public readonly mesh: THREE.Group;
  private readonly config: PortalConfig;
  private timeRemaining: number;
  private isActive: boolean = true;
  
  // Visual components
  private frameMesh: THREE.Mesh;
  private portalSurface: THREE.Mesh;
  private particleSystem: THREE.Points;
  private glowLight: THREE.PointLight;
  
  // Animation state
  private animationTime: number = 0;
  
  constructor(config: PortalConfig) {
    this.config = config;
    this.timeRemaining = config.duration;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(config.position);
    
    this.createPortalFrame();
    this.createPortalSurface();
    this.createParticleSystem();
    this.createGlowLight();
  }
  
  private createPortalFrame(): void {
    // Create an ornate frame for the portal
    const frameGeometry = new THREE.TorusGeometry(2, 0.3, 8, 12);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: this.getBiomeColor(),
      metalness: 0.7,
      roughness: 0.3,
      emissive: this.getBiomeColor(),
      emissiveIntensity: 0.3
    });
    
    this.frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    this.frameMesh.rotation.x = Math.PI / 2;
    this.mesh.add(this.frameMesh);
  }
  
  private createPortalSurface(): void {
    // Create the swirling portal surface
    const surfaceGeometry = new THREE.CircleGeometry(1.8, 32);
    const surfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(this.getBiomeColor()) },
        color2: { value: new THREE.Color(this.getBiomeAccentColor()) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Create swirling pattern
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float swirl = sin(angle * 3.0 + time * 2.0 + dist * 10.0) * 0.5 + 0.5;
          
          // Mix colors based on swirl
          vec3 color = mix(color1, color2, swirl);
          
          // Add edge fade
          float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    this.portalSurface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    this.portalSurface.rotation.x = Math.PI / 2;
    this.mesh.add(this.portalSurface);
  }
  
  private createParticleSystem(): void {
    // Create floating particles around the portal
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color = new THREE.Color(this.getBiomeColor());
    
    for (let i = 0; i < particleCount; i++) {
      // Random position in a cylinder around the portal
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1.5;
      const height = (Math.random() - 0.5) * 4;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.mesh.add(this.particleSystem);
  }
  
  private createGlowLight(): void {
    const color = new THREE.Color(this.getBiomeColor());
    this.glowLight = new THREE.PointLight(color, 2, 10);
    this.glowLight.position.set(0, 1, 0);
    this.mesh.add(this.glowLight);
  }
  
  private getBiomeColor(): THREE.ColorRepresentation {
    switch (this.config.biomeType) {
      case 'fertile_valley': return 0x4CAF50; // Green
      case 'ancient_forest': return 0x2E7D32; // Dark green
      case 'volcanic_ash': return 0xFF5722; // Orange-red
      case 'crystal_caves': return 0x9C27B0; // Purple
      default: return 0x2196F3; // Blue fallback
    }
  }
  
  private getBiomeAccentColor(): THREE.ColorRepresentation {
    switch (this.config.biomeType) {
      case 'fertile_valley': return 0x8BC34A; // Light green
      case 'ancient_forest': return 0x43A047; // Medium green
      case 'volcanic_ash': return 0xFFC107; // Amber
      case 'crystal_caves': return 0xE91E63; // Pink
      default: return 0x03A9F4; // Light blue fallback
    }
  }
  
  update(deltaTime: number): void {
    if (!this.isActive) return;
    
    this.animationTime += deltaTime;
    this.timeRemaining -= deltaTime;
    
    // Update portal surface animation
    const surfaceMaterial = this.portalSurface.material as THREE.ShaderMaterial;
    surfaceMaterial.uniforms.time.value = this.animationTime;
    
    // Rotate particles
    this.particleSystem.rotation.y += deltaTime * 0.5;
    
    // Pulse the frame
    const pulse = Math.sin(this.animationTime * 2) * 0.1 + 1;
    this.frameMesh.scale.set(pulse, pulse, pulse);
    
    // Update glow intensity based on time remaining
    const timeRatio = this.timeRemaining / this.config.duration;
    this.glowLight.intensity = 2 * timeRatio;
    
    // Start fading when time is running out
    if (this.timeRemaining < 10) {
      const fadeRatio = this.timeRemaining / 10;
      (this.frameMesh.material as THREE.MeshStandardMaterial).opacity = fadeRatio;
      (this.portalSurface.material as THREE.ShaderMaterial).opacity = fadeRatio;
      (this.particleSystem.material as THREE.PointsMaterial).opacity = 0.8 * fadeRatio;
    }
    
    // Deactivate when time runs out
    if (this.timeRemaining <= 0) {
      this.isActive = false;
    }
  }
  
  isPlayerNearby(playerPosition: THREE.Vector3, range: number = 3): boolean {
    return this.mesh.position.distanceTo(playerPosition) < range;
  }
  
  canEnter(): boolean {
    return this.isActive && this.timeRemaining > 5; // Need at least 5 seconds to enter safely
  }
  
  getBiomeType(): string {
    return this.config.biomeType;
  }
  
  getTimeRemaining(): number {
    return Math.max(0, this.timeRemaining);
  }
  
  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }
  
  dispose(): void {
    // Clean up geometries and materials
    this.frameMesh.geometry.dispose();
    (this.frameMesh.material as THREE.Material).dispose();
    
    this.portalSurface.geometry.dispose();
    (this.portalSurface.material as THREE.Material).dispose();
    
    this.particleSystem.geometry.dispose();
    (this.particleSystem.material as THREE.Material).dispose();
    
    this.mesh.clear();
  }
}
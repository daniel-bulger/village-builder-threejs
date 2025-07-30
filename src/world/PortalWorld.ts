import * as THREE from 'three';
import { BIOME_SOILS } from '../items/SoilItem';
import { HexUtils, HexCoord } from '../utils/HexUtils';
import { Constants } from '../utils/Constants';

export type BiomeType = 'fertile_valley' | 'ancient_forest' | 'volcanic_ash' | 'crystal_caves';

interface SoilDeposit {
  position: THREE.Vector3;
  hexCoord: HexCoord;
  mesh: THREE.Mesh;
  collected: boolean;
  amount: number; // How many hexes worth of soil
}

interface WaterSource {
  position: THREE.Vector3;
  hexCoord: HexCoord;
  mesh: THREE.Mesh;
  particleSystem: THREE.Points;
}

interface WildPlant {
  position: THREE.Vector3;
  hexCoord: HexCoord;
  mesh: THREE.Group;
  plantType: string;
  seedType: string;
  collected: boolean;
  seedCount: number;
}

interface SeedPod {
  position: THREE.Vector3;
  hexCoord: HexCoord;
  mesh: THREE.Mesh;
  seedType: string;
  seedCount: number;
  collected: boolean;
}

export class PortalWorld {
  public readonly scene: THREE.Scene;
  public readonly biomeType: BiomeType;
  private soilDeposits: SoilDeposit[] = [];
  private waterSources: WaterSource[] = [];
  private wildPlants: WildPlant[] = [];
  private seedPods: SeedPod[] = [];
  private exitPortal: THREE.Group;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private fog: THREE.Fog;
  private terrainMeshes: THREE.Mesh[] = [];
  private decorationMeshes: THREE.Mesh[] = [];
  
  // World generation parameters
  private readonly WORLD_RADIUS = 20; // Hex radius
  private readonly MIN_DEPOSITS = 5;
  private readonly MAX_DEPOSITS = 10;
  private readonly MIN_DEPOSIT_AMOUNT = 0.5;
  private readonly MAX_DEPOSIT_AMOUNT = 2.0;
  
  // Biome-specific seed types
  private readonly BIOME_SEEDS: Record<BiomeType, { plants: string[], pods: string[] }> = {
    'fertile_valley': {
      plants: ['tomato', 'lettuce', 'carrot'],
      pods: ['tomato_seeds', 'lettuce_seeds', 'carrot_seeds']
    },
    'ancient_forest': {
      plants: ['beans', 'mushroom', 'herbs'],
      pods: ['bean_seeds', 'mushroom_spores', 'herb_seeds']
    },
    'volcanic_ash': {
      plants: ['pepper', 'eggplant', 'potato'],
      pods: ['pepper_seeds', 'eggplant_seeds', 'potato_seeds']
    },
    'crystal_caves': {
      plants: ['crystal_flower', 'glowberry', 'cave_moss'],
      pods: ['crystal_seeds', 'glowberry_seeds', 'moss_spores']
    }
  };
  
  constructor(biomeType: BiomeType) {
    this.scene = new THREE.Scene();
    this.biomeType = biomeType;
    
    this.setupLighting();
    this.generateTerrain();
    this.generateSoilDeposits();
    this.generateWaterSources();
    this.generateWildPlants();
    this.generateSeedPods();
    this.createExitPortal();
  }
  
  private setupLighting(): void {
    
    // Biome-specific lighting
    switch (this.biomeType) {
      case 'fertile_valley':
        this.ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6);
        this.directionalLight = new THREE.DirectionalLight(0xFFE4B5, 0.8);
        this.fog = new THREE.Fog(0x87CEEB, 20, 100);
        break;
        
      case 'ancient_forest':
        this.ambientLight = new THREE.AmbientLight(0x228B22, 0.4);
        this.directionalLight = new THREE.DirectionalLight(0x90EE90, 0.6);
        this.fog = new THREE.Fog(0x228B22, 15, 80);
        break;
        
      case 'volcanic_ash':
        this.ambientLight = new THREE.AmbientLight(0x8B4513, 0.3);
        this.directionalLight = new THREE.DirectionalLight(0xFF6347, 0.7);
        this.fog = new THREE.Fog(0x696969, 10, 70);
        break;
        
      case 'crystal_caves':
        this.ambientLight = new THREE.AmbientLight(0x4B0082, 0.5);
        this.directionalLight = new THREE.DirectionalLight(0xE6E6FA, 0.6);
        this.fog = new THREE.Fog(0x191970, 20, 90);
        break;
    }
    
    this.scene.add(this.ambientLight);
    this.scene.add(this.directionalLight);
    this.scene.fog = this.fog;
    
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
  }
  
  private generateTerrain(): void {
    // Generate hex-based terrain
    const terrainMaterial = this.getTerrainMaterial();
    
    // Create hexagonal terrain
    for (let q = -this.WORLD_RADIUS; q <= this.WORLD_RADIUS; q++) {
      for (let r = -this.WORLD_RADIUS; r <= this.WORLD_RADIUS; r++) {
        if (Math.abs(q + r) > this.WORLD_RADIUS) continue;
        
        const hexCoord = { q, r };
        const worldPos = HexUtils.hexToWorld(hexCoord);
        
        // Create hex mesh
        const hexGeometry = new THREE.CylinderGeometry(
          Constants.HEX_SIZE * 0.95,
          Constants.HEX_SIZE * 0.95,
          Constants.HEX_HEIGHT,
          6
        );
        
        const hexMesh = new THREE.Mesh(hexGeometry, terrainMaterial);
        hexMesh.position.set(worldPos.x, -Constants.HEX_HEIGHT / 2, worldPos.z);
        hexMesh.rotation.y = Math.PI / 6;
        hexMesh.receiveShadow = true;
        
        // Add some height variation
        const distanceFromCenter = Math.sqrt(q * q + r * r);
        const heightVariation = Math.sin(distanceFromCenter * 0.3) * 0.5;
        hexMesh.position.y += heightVariation;
        
        this.scene.add(hexMesh);
        this.terrainMeshes.push(hexMesh);
        
        // Add decorative elements based on biome
        if (Math.random() < 0.1) {
          this.addBiomeDecoration(worldPos);
        }
      }
    }
  }
  
  private getTerrainMaterial(): THREE.Material {
    switch (this.biomeType) {
      case 'fertile_valley':
        return new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        
      case 'ancient_forest':
        return new THREE.MeshLambertMaterial({ color: 0x2F4F2F });
        
      case 'volcanic_ash':
        return new THREE.MeshLambertMaterial({ color: 0x696969 });
        
      case 'crystal_caves':
        return new THREE.MeshLambertMaterial({ color: 0x483D8B });
        
      default:
        return new THREE.MeshLambertMaterial({ color: 0x808080 });
    }
  }
  
  private addBiomeDecoration(position: THREE.Vector3): void {
    let decorationMesh: THREE.Mesh;
    
    switch (this.biomeType) {
      case 'fertile_valley':
        // Add flowers
        const flowerGeometry = new THREE.ConeGeometry(0.1, 0.3, 5);
        const flowerMaterial = new THREE.MeshLambertMaterial({ 
          color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6) 
        });
        decorationMesh = new THREE.Mesh(flowerGeometry, flowerMaterial);
        break;
        
      case 'ancient_forest':
        // Add trees
        const treeGeometry = new THREE.ConeGeometry(0.5, 2, 8);
        const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        decorationMesh = new THREE.Mesh(treeGeometry, treeMaterial);
        break;
        
      case 'volcanic_ash':
        // Add rocks
        const rockGeometry = new THREE.DodecahedronGeometry(0.3);
        const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        decorationMesh = new THREE.Mesh(rockGeometry, rockMaterial);
        break;
        
      case 'crystal_caves':
        // Add crystals
        const crystalGeometry = new THREE.OctahedronGeometry(0.4);
        const crystalMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x9370DB,
          emissive: 0x9370DB,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.8
        });
        decorationMesh = new THREE.Mesh(crystalGeometry, crystalMaterial);
        break;
        
      default:
        return;
    }
    
    decorationMesh.position.copy(position);
    decorationMesh.position.y += 0.5;
    decorationMesh.castShadow = true;
    this.scene.add(decorationMesh);
    this.decorationMeshes.push(decorationMesh);
  }
  
  private generateSoilDeposits(): void {
    const depositCount = Math.floor(
      Math.random() * (this.MAX_DEPOSITS - this.MIN_DEPOSITS) + this.MIN_DEPOSITS
    );
    
    for (let i = 0; i < depositCount; i++) {
      // Generate random position within world bounds
      let hexCoord: HexCoord;
      let attempts = 0;
      
      do {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (this.WORLD_RADIUS - 3) + 3; // Keep away from center
        
        const q = Math.round(Math.cos(angle) * distance);
        const r = Math.round(Math.sin(angle) * distance);
        
        hexCoord = { q, r };
        attempts++;
      } while (
        Math.abs(hexCoord.q + hexCoord.r) > this.WORLD_RADIUS || 
        this.isNearOtherDeposit(hexCoord) ||
        attempts < 20
      );
      
      const worldPos = HexUtils.hexToWorld(hexCoord);
      worldPos.y = 0.3; // Slightly above ground
      
      // Create soil deposit mesh
      const depositGeometry = new THREE.SphereGeometry(0.5, 8, 6);
      const depositMaterial = new THREE.MeshLambertMaterial({
        color: this.getSoilColor(),
        emissive: this.getSoilColor(),
        emissiveIntensity: 0.2
      });
      
      const depositMesh = new THREE.Mesh(depositGeometry, depositMaterial);
      depositMesh.position.copy(worldPos);
      depositMesh.castShadow = true;
      
      // Add glow effect
      const glowLight = new THREE.PointLight(this.getSoilColor(), 0.5, 3);
      glowLight.position.copy(worldPos);
      this.scene.add(glowLight);
      
      this.scene.add(depositMesh);
      
      const amount = Math.random() * (this.MAX_DEPOSIT_AMOUNT - this.MIN_DEPOSIT_AMOUNT) + this.MIN_DEPOSIT_AMOUNT;
      
      this.soilDeposits.push({
        position: worldPos,
        hexCoord,
        mesh: depositMesh,
        collected: false,
        amount: Math.round(amount * 10) / 10 // Round to 1 decimal
      });
    }
  }
  
  private isNearOtherDeposit(hexCoord: HexCoord): boolean {
    for (const deposit of this.soilDeposits) {
      const distance = HexUtils.hexDistance(hexCoord, deposit.hexCoord);
      if (distance < 3) return true;
    }
    return false;
  }
  
  private getSoilColor(): THREE.Color {
    switch (this.biomeType) {
      case 'fertile_valley':
        return new THREE.Color(0x8B4513);
      case 'ancient_forest':
        return new THREE.Color(0x654321);
      case 'volcanic_ash':
        return new THREE.Color(0x2F4F4F);
      case 'crystal_caves':
        return new THREE.Color(0x4B0082);
      default:
        return new THREE.Color(0x8B4513);
    }
  }
  
  private generateWaterSources(): void {
    // 1-3 water sources per world
    const sourceCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < sourceCount; i++) {
      // Generate position away from center and other water sources
      let hexCoord: HexCoord;
      let attempts = 0;
      
      do {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (this.WORLD_RADIUS - 5) + 5;
        
        const q = Math.round(Math.cos(angle) * distance);
        const r = Math.round(Math.sin(angle) * distance);
        
        hexCoord = { q, r };
        attempts++;
      } while (
        Math.abs(hexCoord.q + hexCoord.r) > this.WORLD_RADIUS || 
        this.isNearOtherWaterSource(hexCoord) ||
        attempts < 20
      );
      
      const worldPos = HexUtils.hexToWorld(hexCoord);
      worldPos.y = 0;
      
      // Create water pool mesh
      const poolGeometry = new THREE.CylinderGeometry(1.5, 1.2, 0.3, 8);
      const poolMaterial = new THREE.MeshPhongMaterial({
        color: 0x4682B4,
        transparent: true,
        opacity: 0.8,
        shininess: 100,
        emissive: 0x4682B4,
        emissiveIntensity: 0.1
      });
      
      const poolMesh = new THREE.Mesh(poolGeometry, poolMaterial);
      poolMesh.position.copy(worldPos);
      poolMesh.position.y = -0.1; // Slightly below ground
      this.scene.add(poolMesh);
      
      // Create particle system for water sparkles
      const particleCount = 30;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      
      for (let j = 0; j < particleCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.3;
        positions[j * 3] = Math.cos(angle) * radius;
        positions[j * 3 + 1] = Math.random() * 0.5;
        positions[j * 3 + 2] = Math.sin(angle) * radius;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const particleMaterial = new THREE.PointsMaterial({
        color: 0x87CEEB,
        size: 0.05,
        transparent: true,
        opacity: 0.6
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      particles.position.copy(worldPos);
      this.scene.add(particles);
      
      // Add blue glow light
      const waterLight = new THREE.PointLight(0x4682B4, 0.5, 5);
      waterLight.position.copy(worldPos);
      waterLight.position.y = 0.5;
      this.scene.add(waterLight);
      
      this.waterSources.push({
        position: worldPos,
        hexCoord,
        mesh: poolMesh,
        particleSystem: particles
      });
    }
  }
  
  private isNearOtherWaterSource(hexCoord: HexCoord): boolean {
    for (const source of this.waterSources) {
      const distance = HexUtils.hexDistance(hexCoord, source.hexCoord);
      if (distance < 5) return true;
    }
    return false;
  }
  
  private generateWildPlants(): void {
    const plantTypes = this.BIOME_SEEDS[this.biomeType].plants;
    const plantCount = Math.floor(Math.random() * 5) + 3; // 3-7 wild plants
    
    for (let i = 0; i < plantCount; i++) {
      // Generate position away from center
      let hexCoord: HexCoord;
      let attempts = 0;
      
      do {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (this.WORLD_RADIUS - 3) + 3;
        
        const q = Math.round(Math.cos(angle) * distance);
        const r = Math.round(Math.sin(angle) * distance);
        
        hexCoord = { q, r };
        attempts++;
      } while (
        Math.abs(hexCoord.q + hexCoord.r) > this.WORLD_RADIUS || 
        this.isNearOtherWildPlant(hexCoord) ||
        attempts < 20
      );
      
      const worldPos = HexUtils.hexToWorld(hexCoord);
      worldPos.y = 0;
      
      // Choose random plant type for this biome
      const plantType = plantTypes[Math.floor(Math.random() * plantTypes.length)];
      
      // Create wild plant mesh group
      const plantGroup = new THREE.Group();
      
      // Stem
      const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.8);
      const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x4A5D23 });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = 0.4;
      plantGroup.add(stem);
      
      // Leaves/flowers based on plant type
      const leafColor = this.getPlantColor(plantType);
      const leafGeometry = new THREE.SphereGeometry(0.3, 6, 4);
      const leafMaterial = new THREE.MeshLambertMaterial({ 
        color: leafColor,
        emissive: leafColor,
        emissiveIntensity: 0.2
      });
      
      // Add multiple leaves
      for (let j = 0; j < 3; j++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (j / 3) * Math.PI * 2;
        leaf.position.set(
          Math.cos(angle) * 0.2,
          0.6 + Math.random() * 0.2,
          Math.sin(angle) * 0.2
        );
        leaf.scale.setScalar(0.8 + Math.random() * 0.4);
        plantGroup.add(leaf);
      }
      
      // Add glow for mature plants with seeds
      const glowLight = new THREE.PointLight(leafColor, 0.3, 2);
      glowLight.position.y = 0.8;
      plantGroup.add(glowLight);
      
      plantGroup.position.copy(worldPos);
      this.scene.add(plantGroup);
      
      this.wildPlants.push({
        position: worldPos,
        hexCoord,
        mesh: plantGroup,
        plantType,
        seedType: plantType + '_seeds',
        collected: false,
        seedCount: Math.floor(Math.random() * 4) + 2 // 2-5 seeds
      });
    }
  }
  
  private isNearOtherWildPlant(hexCoord: HexCoord): boolean {
    for (const plant of this.wildPlants) {
      const distance = HexUtils.hexDistance(hexCoord, plant.hexCoord);
      if (distance < 3) return true;
    }
    return false;
  }
  
  private getPlantColor(plantType: string): number {
    const colors: Record<string, number> = {
      'tomato': 0xFF6B6B,
      'lettuce': 0x90EE90,
      'carrot': 0xFF8C00,
      'beans': 0x228B22,
      'mushroom': 0x8B7355,
      'herbs': 0x9ACD32,
      'pepper': 0xFF4500,
      'eggplant': 0x8B008B,
      'potato': 0x8B7D6B,
      'crystal_flower': 0xE6E6FA,
      'glowberry': 0x00CED1,
      'cave_moss': 0x556B2F
    };
    return colors[plantType] || 0x90EE90;
  }
  
  private generateSeedPods(): void {
    const seedTypes = this.BIOME_SEEDS[this.biomeType].pods;
    const podCount = Math.floor(Math.random() * 4) + 2; // 2-5 seed pods
    
    for (let i = 0; i < podCount; i++) {
      // Generate position
      let hexCoord: HexCoord;
      let attempts = 0;
      
      do {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (this.WORLD_RADIUS - 2) + 2;
        
        const q = Math.round(Math.cos(angle) * distance);
        const r = Math.round(Math.sin(angle) * distance);
        
        hexCoord = { q, r };
        attempts++;
      } while (
        Math.abs(hexCoord.q + hexCoord.r) > this.WORLD_RADIUS || 
        attempts < 20
      );
      
      const worldPos = HexUtils.hexToWorld(hexCoord);
      worldPos.y = 0.1; // Slightly above ground
      
      // Choose random seed type
      const seedType = seedTypes[Math.floor(Math.random() * seedTypes.length)];
      
      // Create seed pod mesh
      const podGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      const podColor = this.getSeedPodColor();
      const podMaterial = new THREE.MeshLambertMaterial({
        color: podColor,
        emissive: podColor,
        emissiveIntensity: 0.3
      });
      
      const podMesh = new THREE.Mesh(podGeometry, podMaterial);
      podMesh.position.copy(worldPos);
      
      // Add small glow
      const glowLight = new THREE.PointLight(podColor, 0.2, 1);
      glowLight.position.copy(worldPos);
      glowLight.position.y = 0.2;
      this.scene.add(glowLight);
      
      this.scene.add(podMesh);
      
      this.seedPods.push({
        position: worldPos,
        hexCoord,
        mesh: podMesh,
        seedType,
        seedCount: Math.floor(Math.random() * 3) + 1, // 1-3 seeds
        collected: false
      });
    }
  }
  
  private getSeedPodColor(): number {
    switch (this.biomeType) {
      case 'fertile_valley':
        return 0xDAA520; // Goldenrod
      case 'ancient_forest':
        return 0x8B4513; // Saddle brown
      case 'volcanic_ash':
        return 0x696969; // Dim gray
      case 'crystal_caves':
        return 0x9370DB; // Medium purple
      default:
        return 0x8B7D6B;
    }
  }
  
  private createExitPortal(): void {
    // Create return portal at center
    this.exitPortal = new THREE.Group();
    
    // Portal frame - make it vertical like the entrance portal
    const frameGeometry = new THREE.TorusGeometry(2, 0.3, 8, 12);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x4169E1,
      emissiveIntensity: 0.5
    });
    
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    this.exitPortal.add(frame);
    
    // Portal surface
    const portalGeometry = new THREE.CircleGeometry(1.8, 32);
    const portalMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    this.exitPortal.add(portal);
    
    // Add glow
    const portalLight = new THREE.PointLight(0x4169E1, 2, 10);
    portalLight.position.z = 0.5;
    this.exitPortal.add(portalLight);
    
    // Add floating particles around portal
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 3 - 1.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x4169E1,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.exitPortal.add(particles);
    
    // Add a beacon of light shooting upward
    const beaconGeometry = new THREE.CylinderGeometry(0.5, 2, 20, 8);
    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0x4169E1,
      transparent: true,
      opacity: 0.3
    });
    
    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    beacon.position.y = 10;
    this.exitPortal.add(beacon);
    
    this.exitPortal.position.set(0, 2, 0); // Raise it off the ground
    this.scene.add(this.exitPortal);
  }
  
  public update(deltaTime: number): void {
    // Animate soil deposits
    this.soilDeposits.forEach(deposit => {
      if (!deposit.collected && deposit.mesh.parent) {
        deposit.mesh.rotation.y += deltaTime * 0.5;
        deposit.mesh.position.y = 0.3 + Math.sin(Date.now() * 0.001) * 0.1;
      }
    });
    
    // Animate water sources
    this.waterSources.forEach(source => {
      // Animate water particles
      if (source.particleSystem && source.particleSystem.geometry) {
        source.particleSystem.rotation.y += deltaTime * 0.3;
        const positions = source.particleSystem.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] = Math.random() * 0.5 + Math.sin(Date.now() * 0.002 + i) * 0.1;
        }
        source.particleSystem.geometry.attributes.position.needsUpdate = true;
      }
    });
    
    // Animate wild plants
    this.wildPlants.forEach(plant => {
      if (!plant.collected && plant.mesh.parent) {
        // Gentle swaying motion
        plant.mesh.rotation.z = Math.sin(Date.now() * 0.001 + plant.position.x) * 0.05;
        plant.mesh.rotation.x = Math.sin(Date.now() * 0.0012 + plant.position.z) * 0.03;
      }
    });
    
    // Animate seed pods
    this.seedPods.forEach(pod => {
      if (!pod.collected && pod.mesh.parent) {
        // Floating motion
        pod.mesh.position.y = 0.1 + Math.sin(Date.now() * 0.002 + pod.position.x) * 0.05;
        pod.mesh.rotation.y += deltaTime * 0.5;
      }
    });
    
    // Animate exit portal
    if (this.exitPortal) {
      // Rotate the entire portal slowly
      this.exitPortal.rotation.y += deltaTime * 0.2;
      
      // Animate portal surface opacity
      const portalSurface = this.exitPortal.children[1] as THREE.Mesh;
      if (portalSurface.material instanceof THREE.MeshBasicMaterial) {
        portalSurface.material.opacity = 0.6 + Math.sin(Date.now() * 0.002) * 0.2;
      }
      
      // Animate particles
      const particles = this.exitPortal.children[3] as THREE.Points;
      if (particles && particles.geometry) {
        particles.rotation.y += deltaTime * 0.5;
        const positions = particles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.01;
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }
      
      // Animate beacon
      const beacon = this.exitPortal.children[4] as THREE.Mesh;
      if (beacon && beacon.material instanceof THREE.MeshBasicMaterial) {
        beacon.material.opacity = 0.2 + Math.sin(Date.now() * 0.003) * 0.1;
      }
    }
  }
  
  public collectSoilAt(position: THREE.Vector3): { collected: boolean; amount?: number } {
    // Find nearest uncollected deposit
    let nearestDeposit: SoilDeposit | null = null;
    let nearestDistance = Infinity;
    
    for (const deposit of this.soilDeposits) {
      if (!deposit.collected) {
        const distance = position.distanceTo(deposit.position);
        if (distance < 2 && distance < nearestDistance) {
          nearestDistance = distance;
          nearestDeposit = deposit;
        }
      }
    }
    
    if (nearestDeposit) {
      nearestDeposit.collected = true;
      
      // Remove the mesh from the scene
      this.scene.remove(nearestDeposit.mesh);
      
      // Dispose of geometry and material
      nearestDeposit.mesh.geometry.dispose();
      if (nearestDeposit.mesh.material instanceof THREE.Material) {
        nearestDeposit.mesh.material.dispose();
      }
      
      // Also remove any associated glow lights
      // Find and remove point lights near this deposit
      const lights = this.scene.children.filter(
        child => child instanceof THREE.PointLight && 
        child.position.distanceTo(nearestDeposit.position) < 1
      );
      lights.forEach(light => this.scene.remove(light));
      
      return { collected: true, amount: nearestDeposit.amount };
    }
    
    return { collected: false };
  }
  
  public isNearSoilDeposit(position: THREE.Vector3): boolean {
    for (const deposit of this.soilDeposits) {
      if (!deposit.collected && position.distanceTo(deposit.position) < 2) {
        return true;
      }
    }
    return false;
  }
  
  public isNearExitPortal(position: THREE.Vector3): boolean {
    return position.distanceTo(this.exitPortal.position) < 3;
  }
  
  public isNearWaterSource(position: THREE.Vector3): { isNear: boolean; sourceIndex?: number } {
    for (let i = 0; i < this.waterSources.length; i++) {
      const source = this.waterSources[i];
      if (position.distanceTo(source.position) < 2) {
        return { isNear: true, sourceIndex: i };
      }
    }
    return { isNear: false };
  }
  
  public collectSeedsFromPlant(position: THREE.Vector3): { collected: boolean; seedType?: string; seedCount?: number } {
    // Find nearest uncollected wild plant
    let nearestPlant: WildPlant | null = null;
    let nearestDistance = Infinity;
    
    for (const plant of this.wildPlants) {
      if (!plant.collected) {
        const distance = position.distanceTo(plant.position);
        if (distance < 2 && distance < nearestDistance) {
          nearestDistance = distance;
          nearestPlant = plant;
        }
      }
    }
    
    if (nearestPlant) {
      nearestPlant.collected = true;
      
      // Remove the plant mesh
      this.scene.remove(nearestPlant.mesh);
      
      // Dispose of geometries and materials
      nearestPlant.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      
      return { 
        collected: true, 
        seedType: nearestPlant.seedType,
        seedCount: nearestPlant.seedCount 
      };
    }
    
    return { collected: false };
  }
  
  public collectSeedPod(position: THREE.Vector3): { collected: boolean; seedType?: string; seedCount?: number } {
    // Find nearest uncollected seed pod
    let nearestPod: SeedPod | null = null;
    let nearestDistance = Infinity;
    
    for (const pod of this.seedPods) {
      if (!pod.collected) {
        const distance = position.distanceTo(pod.position);
        if (distance < 1.5 && distance < nearestDistance) {
          nearestDistance = distance;
          nearestPod = pod;
        }
      }
    }
    
    if (nearestPod) {
      nearestPod.collected = true;
      
      // Remove the mesh
      this.scene.remove(nearestPod.mesh);
      
      // Dispose of geometry and material
      nearestPod.mesh.geometry.dispose();
      if (nearestPod.mesh.material instanceof THREE.Material) {
        nearestPod.mesh.material.dispose();
      }
      
      // Remove associated glow light
      const lights = this.scene.children.filter(
        child => child instanceof THREE.PointLight && 
        child.position.distanceTo(nearestPod.position) < 0.5
      );
      lights.forEach(light => this.scene.remove(light));
      
      return { 
        collected: true, 
        seedType: nearestPod.seedType,
        seedCount: nearestPod.seedCount 
      };
    }
    
    return { collected: false };
  }
  
  public isNearWildPlant(position: THREE.Vector3): boolean {
    for (const plant of this.wildPlants) {
      if (!plant.collected && position.distanceTo(plant.position) < 2) {
        return true;
      }
    }
    return false;
  }
  
  public isNearSeedPod(position: THREE.Vector3): boolean {
    for (const pod of this.seedPods) {
      if (!pod.collected && position.distanceTo(pod.position) < 1.5) {
        return true;
      }
    }
    return false;
  }
  
  public getSoilNutrients() {
    const biomeMap: Record<BiomeType, keyof typeof BIOME_SOILS> = {
      'fertile_valley': 'FERTILE_VALLEY',
      'ancient_forest': 'ANCIENT_FOREST',
      'volcanic_ash': 'VOLCANIC_ASH',
      'crystal_caves': 'CRYSTAL_CAVES'
    };
    
    return BIOME_SOILS[biomeMap[this.biomeType]];
  }
  
  public dispose(): void {
    // Clean up terrain meshes
    for (const mesh of this.terrainMeshes) {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
      this.scene.remove(mesh);
    }
    
    // Clean up decoration meshes
    for (const mesh of this.decorationMeshes) {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
      this.scene.remove(mesh);
    }
    
    // Clean up soil deposits
    for (const deposit of this.soilDeposits) {
      deposit.mesh.geometry.dispose();
      if (deposit.mesh.material instanceof THREE.Material) {
        deposit.mesh.material.dispose();
      }
      this.scene.remove(deposit.mesh);
    }
    
    // Clean up water sources
    for (const source of this.waterSources) {
      source.mesh.geometry.dispose();
      if (source.mesh.material instanceof THREE.Material) {
        source.mesh.material.dispose();
      }
      this.scene.remove(source.mesh);
      
      source.particleSystem.geometry.dispose();
      if (source.particleSystem.material instanceof THREE.Material) {
        source.particleSystem.material.dispose();
      }
      this.scene.remove(source.particleSystem);
    }
    
    // Clean up wild plants
    for (const plant of this.wildPlants) {
      plant.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.scene.remove(plant.mesh);
    }
    
    // Clean up seed pods
    for (const pod of this.seedPods) {
      pod.mesh.geometry.dispose();
      if (pod.mesh.material instanceof THREE.Material) {
        pod.mesh.material.dispose();
      }
      this.scene.remove(pod.mesh);
    }
    
    // Clean up exit portal
    if (this.exitPortal) {
      this.exitPortal.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        } else if (child instanceof THREE.Points) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.scene.remove(this.exitPortal);
    }
    
    // Remove lights
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.directionalLight);
    
    // Clear any glow lights from soil deposits
    const lights = this.scene.children.filter(child => child instanceof THREE.Light);
    lights.forEach(light => this.scene.remove(light));
    
    // Clear arrays
    this.terrainMeshes = [];
    this.decorationMeshes = [];
    this.soilDeposits = [];
    this.waterSources = [];
    this.wildPlants = [];
    this.seedPods = [];
    
    // Remove fog
    this.scene.fog = null;
  }
}
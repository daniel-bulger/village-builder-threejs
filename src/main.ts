import * as THREE from 'three';
import { Game } from './game/Game';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { HexUtils } from './utils/HexUtils';
import { SoilItem, BIOME_SOILS } from './items/SoilItem';

declare global {
  interface Window {
    game: Game;
    HexUtils: typeof HexUtils;
    THREE: typeof THREE;
    SoilItem: typeof SoilItem;
    BIOME_SOILS: typeof BIOME_SOILS;
  }
}

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private game: Game;
  private stats: Stats;
  
  constructor() {
    this.initializeRenderer();
    this.initializeScene();
    this.initializeCamera();
    this.initializeStats();
    
    // Create game instance
    this.game = new Game(this.scene, this.camera, this.renderer);
    
    // Expose for testing
    window.game = this.game;
    window.THREE = THREE;
    window.HexUtils = HexUtils;
    window.SoilItem = SoilItem;
    window.BIOME_SOILS = BIOME_SOILS;
    
    // Start game loop
    this.animate();
    
    // Hide loading screen
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'none';
    
    // Show controls
    const controlsElement = document.getElementById('controls');
    if (controlsElement) controlsElement.style.display = 'block';
    
    // Show info panel
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.style.display = 'block';
  }
  
  private initializeRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xf0e6d2, 100, 1000);
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
  }
  
  private initializeCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(10, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }
  
  private initializeStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(0); // FPS panel
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.top = '0px';
    this.stats.dom.style.left = '0px';
    this.stats.dom.classList.add('stats');
    document.body.appendChild(this.stats.dom);
  }
  
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  private performanceData: { [key: string]: number[] } = {};
  private frameCount = 0;
  
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    this.stats.begin();
    
    // Update game with performance tracking
    const gameStart = performance.now();
    this.game.update();
    const gameTime = performance.now() - gameStart;
    
    // Render scene
    const renderStart = performance.now();
    this.renderer.render(this.scene, this.camera);
    const renderTime = performance.now() - renderStart;
    
    // Track performance data
    if (!this.performanceData['game']) this.performanceData['game'] = [];
    if (!this.performanceData['render']) this.performanceData['render'] = [];
    
    this.performanceData['game'].push(gameTime);
    this.performanceData['render'].push(renderTime);
    
    // Log performance summary every 60 frames (1 second at 60fps)
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      const avgGame = this.performanceData['game'].reduce((a, b) => a + b, 0) / this.performanceData['game'].length;
      const avgRender = this.performanceData['render'].reduce((a, b) => a + b, 0) / this.performanceData['render'].length;
      const total = avgGame + avgRender;
      
      if (total > 16) { // Only log if frame time exceeds 16ms (60fps threshold)
        console.log(`Performance (avg over 60 frames): Game: ${avgGame.toFixed(1)}ms, Render: ${avgRender.toFixed(1)}ms, Total: ${total.toFixed(1)}ms`);
      }
      
      // Reset arrays to prevent memory growth
      this.performanceData['game'] = [];
      this.performanceData['render'] = [];
    }
    
    this.stats.end();
  };
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new Application());
} else {
  new Application();
}
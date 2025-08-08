import * as THREE from 'three';

export class ScreenshotCapture {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    // Add keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || (e.key === 'p' && e.ctrlKey)) {
        e.preventDefault();
        this.captureScreenshot();
      }
    });
  }
  
  captureScreenshot(): void {
    // Store original size
    const originalWidth = this.renderer.domElement.width;
    const originalHeight = this.renderer.domElement.height;
    
    // Set high quality size
    const width = 1920;
    const height = 1080;
    this.renderer.setSize(width, height);
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // Get the data URL
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    
    // Create a link and download
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `village-builder-${timestamp}.png`;
    link.href = dataURL;
    link.click();
    
    // Restore original size
    this.renderer.setSize(originalWidth, originalHeight);
    
    // Show notification
    this.showNotification('Screenshot saved!');
  }
  
  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      z-index: 10000;
      animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
    `;
    notification.textContent = message;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  }
  
  // Capture specific area
  captureArea(x: number, y: number, width: number, height: number): string {
    const originalWidth = this.renderer.domElement.width;
    const originalHeight = this.renderer.domElement.height;
    
    // Create a render target
    const renderTarget = new THREE.WebGLRenderTarget(width, height);
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(this.scene, this.camera);
    
    // Read pixels
    const pixels = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(renderTarget, x, y, width, height, pixels);
    
    // Create canvas and draw pixels
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    
    // Flip Y axis (WebGL has Y inverted)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4;
        const dstIndex = ((height - y - 1) * width + x) * 4;
        imageData.data[dstIndex] = pixels[srcIndex];
        imageData.data[dstIndex + 1] = pixels[srcIndex + 1];
        imageData.data[dstIndex + 2] = pixels[srcIndex + 2];
        imageData.data[dstIndex + 3] = pixels[srcIndex + 3];
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Cleanup
    this.renderer.setRenderTarget(null);
    renderTarget.dispose();
    
    return canvas.toDataURL('image/png');
  }
}
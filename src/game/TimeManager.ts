export class TimeManager {
  private lastTime: number;
  private deltaTime: number;
  private elapsedTime: number;
  
  constructor() {
    this.lastTime = performance.now() / 1000;
    this.deltaTime = 0;
    this.elapsedTime = 0;
  }
  
  update(): number {
    const currentTime = performance.now() / 1000;
    this.deltaTime = Math.min(currentTime - this.lastTime, 0.1); // Cap at 100ms
    this.lastTime = currentTime;
    this.elapsedTime += this.deltaTime;
    
    return this.deltaTime;
  }
  
  getDeltaTime(): number {
    return this.deltaTime;
  }
  
  getElapsedTime(): number {
    return this.elapsedTime;
  }
}
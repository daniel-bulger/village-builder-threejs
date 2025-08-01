import { VillagerManager, RecruitmentAttempt } from '../villagers/VillagerManager';
import { Villager } from '../villagers/Villager';
import { VillagerMood } from '../villagers/VillagerTypes';

export class VillagerUI {
  private container: HTMLDivElement;
  private villagerListContainer: HTMLDivElement;
  private recruitmentContainer: HTMLDivElement;
  private villagerManager: VillagerManager;
  
  constructor(villagerManager: VillagerManager) {
    this.villagerManager = villagerManager;
    
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'villager-ui';
    this.container.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 300px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000;
    `;
    
    // Create villager list
    this.villagerListContainer = document.createElement('div');
    this.villagerListContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #444;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 10px;
      color: white;
      max-height: 300px;
      overflow-y: auto;
    `;
    
    // Create recruitment info
    this.recruitmentContainer = document.createElement('div');
    this.recruitmentContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #444;
      border-radius: 8px;
      padding: 10px;
      color: white;
      display: none;
    `;
    
    this.container.appendChild(this.villagerListContainer);
    this.container.appendChild(this.recruitmentContainer);
    document.body.appendChild(this.container);
    
    this.update();
  }
  
  update(): void {
    this.updateVillagerList();
    this.updateRecruitmentStatus();
  }
  
  private updateVillagerList(): void {
    const villagers = this.villagerManager.getVillagers();
    
    if (villagers.length === 0) {
      this.villagerListContainer.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">Villagers (0)</h3>
        <p style="color: #999; font-style: italic;">No villagers yet. Offer high-quality food to attract them!</p>
      `;
      return;
    }
    
    let html = `<h3 style="margin: 0 0 10px 0;">Villagers (${villagers.length})</h3>`;
    
    villagers.forEach(villager => {
      const moodColor = this.getMoodColor(villager.state.mood);
      const moodEmoji = this.getMoodEmoji(villager.state.mood);
      
      html += `
        <div style="background: rgba(255, 255, 255, 0.1); padding: 8px; margin-bottom: 5px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${villager.state.name}</strong>
            <span style="color: ${moodColor};">${moodEmoji}</span>
          </div>
          <div style="font-size: 12px; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Energy:</span>
              <span>${Math.round(villager.state.energy)}%</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Happiness:</span>
              <span>${Math.round(villager.state.happiness)}%</span>
            </div>
            ${villager.state.currentTask ? `
              <div style="color: #66ff66; margin-top: 4px;">
                Working: ${villager.state.currentTask.type}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    this.villagerListContainer.innerHTML = html;
  }
  
  private updateRecruitmentStatus(): void {
    const status = this.villagerManager.getRecruitmentStatus();
    
    if (!status.inProgress) {
      this.recruitmentContainer.style.display = 'none';
      return;
    }
    
    this.recruitmentContainer.style.display = 'block';
    
    const villager = status.visitingVillager!;
    const evaluation = villager.state.lastGardenEvaluation;
    
    let html = `
      <h3 style="margin: 0 0 10px 0; color: #ffaa00;">Visitor!</h3>
      <div style="background: rgba(255, 255, 255, 0.1); padding: 8px; border-radius: 4px;">
        <strong>${villager.state.name}</strong> is evaluating your garden...
    `;
    
    if (evaluation) {
      html += `
        <div style="margin-top: 10px;">
          <div style="margin-bottom: 5px;">Overall Score: ${Math.round(evaluation.overallScore)}/100</div>
          ${this.createScoreBar('Beauty', evaluation.beautyScore)}
          ${this.createScoreBar('Variety', evaluation.varietyScore)}
          ${this.createScoreBar('Organization', evaluation.organizationScore)}
        </div>
      `;
      
      if (evaluation.likes.length > 0) {
        html += `
          <div style="margin-top: 10px; color: #66ff66;">
            <strong>Likes:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${evaluation.likes.map(like => `<li>${like}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (evaluation.suggestions.length > 0) {
        html += `
          <div style="margin-top: 10px; color: #ffaa00;">
            <strong>Suggestions:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${evaluation.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }
    
    html += '</div>';
    
    this.recruitmentContainer.innerHTML = html;
  }
  
  private createScoreBar(label: string, score: number): string {
    const percentage = Math.round(score);
    const color = score >= 70 ? '#66ff66' : score >= 40 ? '#ffaa00' : '#ff6666';
    
    return `
      <div style="margin: 5px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span style="font-size: 12px;">${label}:</span>
          <span style="font-size: 12px;">${percentage}%</span>
        </div>
        <div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
          <div style="width: ${percentage}%; height: 100%; background: ${color};"></div>
        </div>
      </div>
    `;
  }
  
  private getMoodColor(mood: VillagerMood): string {
    const colors = {
      [VillagerMood.ECSTATIC]: '#00ff00',
      [VillagerMood.HAPPY]: '#66ff66',
      [VillagerMood.CONTENT]: '#99ff99',
      [VillagerMood.NEUTRAL]: '#ffffff',
      [VillagerMood.UNHAPPY]: '#ffaa00',
      [VillagerMood.MISERABLE]: '#ff6666'
    };
    return colors[mood] || '#ffffff';
  }
  
  private getMoodEmoji(mood: VillagerMood): string {
    const emojis = {
      [VillagerMood.ECSTATIC]: '😄',
      [VillagerMood.HAPPY]: '😊',
      [VillagerMood.CONTENT]: '🙂',
      [VillagerMood.NEUTRAL]: '😐',
      [VillagerMood.UNHAPPY]: '😕',
      [VillagerMood.MISERABLE]: '😢'
    };
    return emojis[mood] || '😐';
  }
  
  showRecruitmentResult(attempt: RecruitmentAttempt): void {
    const resultDiv = document.createElement('div');
    resultDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid ${attempt.success ? '#66ff66' : '#ff6666'};
      border-radius: 10px;
      padding: 20px;
      color: white;
      text-align: center;
      z-index: 2000;
      min-width: 300px;
    `;
    
    let html = `
      <h2 style="margin: 0 0 15px 0; color: ${attempt.success ? '#66ff66' : '#ff6666'};">
        ${attempt.success ? 'Recruitment Success!' : 'Recruitment Failed'}
      </h2>
      <p><strong>${attempt.villager.state.name}</strong> ${attempt.success ? 'has joined your village!' : 'decided not to stay.'}</p>
    `;
    
    if (!attempt.success && attempt.reason) {
      html += `<p style="color: #ff6666; margin-top: 10px;">Reason: ${attempt.reason}</p>`;
    }
    
    if (attempt.evaluation) {
      html += `
        <div style="margin-top: 15px; text-align: left; background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 5px;">
          <strong>Garden Evaluation:</strong>
          <div style="margin-top: 5px;">Overall: ${Math.round(attempt.evaluation.overallScore)}/100</div>
          <div>Beauty: ${Math.round(attempt.evaluation.beautyScore)}/100</div>
          <div>Variety: ${Math.round(attempt.evaluation.varietyScore)}/100</div>
        </div>
      `;
    }
    
    html += `
      <button onclick="this.parentElement.remove()" style="
        margin-top: 15px;
        padding: 8px 20px;
        background: ${attempt.success ? '#66ff66' : '#ff6666'};
        color: black;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">OK</button>
    `;
    
    resultDiv.innerHTML = html;
    document.body.appendChild(resultDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (resultDiv.parentElement) {
        resultDiv.remove();
      }
    }, 10000);
  }
  
  dispose(): void {
    if (this.container.parentElement) {
      this.container.remove();
    }
  }
}
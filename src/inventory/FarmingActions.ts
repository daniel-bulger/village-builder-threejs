export interface FarmingAction {
  id: string;
  name: string;
  icon: string;
  description: string;
  hotkey?: string;
  requiresTarget: boolean;
  category: ActionCategory;
}

export enum ActionCategory {
  BUILD = 'build',
  HARVEST = 'harvest',
  INSPECT = 'inspect',
  SPECIAL = 'special'
}

export class FarmingActionWheel {
  private actions: FarmingAction[] = [
    {
      id: 'remove_soil',
      name: 'Remove Soil',
      icon: '❌',
      description: 'Remove soil blocks',
      hotkey: 'R',
      requiresTarget: true,
      category: ActionCategory.BUILD
    },
    {
      id: 'harvest',
      name: 'Harvest',
      icon: '🌾',
      description: 'Harvest mature plants',
      hotkey: 'H',
      requiresTarget: true,
      category: ActionCategory.HARVEST
    },
    {
      id: 'uproot',
      name: 'Uproot Plant',
      icon: '🌿',
      description: 'Carefully uproot plant for replanting',
      hotkey: 'U',
      requiresTarget: true,
      category: ActionCategory.HARVEST
    },
    {
      id: 'toggle_grid',
      name: 'Toggle Grid',
      icon: '⊞',
      description: 'Show/hide hex grid',
      hotkey: 'G',
      requiresTarget: false,
      category: ActionCategory.SPECIAL
    },
    {
      id: 'toggle_soil_view',
      name: 'Soil View',
      icon: '👁️',
      description: 'See through soil to view roots',
      hotkey: 'V',
      requiresTarget: false,
      category: ActionCategory.SPECIAL
    }
  ];
  
  private activeAction: string | null = null;
  private isVisible: boolean = false;
  
  getActions(): FarmingAction[] {
    return this.actions;
  }
  
  getActionsByCategory(category: ActionCategory): FarmingAction[] {
    return this.actions.filter(action => action.category === category);
  }
  
  setActiveAction(actionId: string | null): void {
    this.activeAction = actionId;
  }
  
  getActiveAction(): FarmingAction | null {
    if (!this.activeAction) return null;
    return this.actions.find(a => a.id === this.activeAction) || null;
  }
  
  show(): void {
    this.isVisible = true;
  }
  
  hide(): void {
    this.isVisible = false;
  }
  
  toggle(): void {
    this.isVisible = !this.isVisible;
  }
  
  isActionWheelVisible(): boolean {
    return this.isVisible;
  }
  
  // Handle hotkey press
  handleHotkey(key: string): boolean {
    const action = this.actions.find(a => a.hotkey === key.toUpperCase());
    if (action) {
      this.activeAction = action.id;
      return true;
    }
    return false;
  }
}
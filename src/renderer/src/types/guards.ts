import type { NodeData, DialogNodeData, ChoiceNodeData, ConditionNodeData, SetVariableNodeData, GotoNodeData, EndNodeData, AudioNodeData, CgNodeData, WaitNodeData, RandomNodeData, LabelNodeData, AnimationNodeData, SavePointNodeData, TimerNodeData, MoveCharacterNodeData, SteamAchievementNodeData, AchievementNodeData, ParticleNodeData, Live2DNodeData, ItemNodeData, FlowNode } from './index'

// ══════════════════════════════════════════════
// Type Guard Functions for all 17 node types
// ══════════════════════════════════════════════

export function isDialogData(data: NodeData): data is DialogNodeData {
  return data !== null && typeof data === 'object' && 'content' in data && 'character' in data
}

export function isChoiceData(data: NodeData): data is ChoiceNodeData {
  return data !== null && typeof data === 'object' && 'options' in data && 'title' in data
}

export function isConditionData(data: NodeData): data is ConditionNodeData {
  return data !== null && typeof data === 'object' && 'expression' in data && 'trueNextId' in data && 'falseNextId' in data
}

export function isSetVariableData(data: NodeData): data is SetVariableNodeData {
  return data !== null && typeof data === 'object' && 'variable' in data && 'op' in data
}

export function isGotoData(data: NodeData): data is GotoNodeData {
  return data !== null && typeof data === 'object' && 'targetNodeId' in data && !('options' in data)
}

export function isEndData(data: NodeData): data is EndNodeData {
  return data !== null && typeof data === 'object' && 'endingType' in data
}

export function isAudioData(data: NodeData): data is AudioNodeData {
  return data !== null && typeof data === 'object' && 'audioType' in data && 'action' in data
}

export function isCgData(data: NodeData): data is CgNodeData {
  return data !== null && typeof data === 'object' && 'transition' in data && !('action' in data) && !('audioType' in data)
}

export function isWaitData(data: NodeData): data is WaitNodeData {
  return data !== null && typeof data === 'object' && 'duration' in data && !('mode' in data) && !('easing' in data) && !('transition' in data) && !('variable' in data) && !('op' in data)
}

export function isRandomData(data: NodeData): data is RandomNodeData {
  return data !== null && typeof data === 'object' && 'branches' in data && !('options' in data)
}

export function isLabelData(data: NodeData): data is LabelNodeData {
  return data !== null && typeof data === 'object' && 'color' in data && !('endingType' in data)
}

export function isAnimationData(data: NodeData): data is AnimationNodeData {
  return data !== null && typeof data === 'object' && 'action' in data && 'target' in data && 'duration' in data && !('audioType' in data)
}

export function isSavePointData(data: NodeData): data is SavePointNodeData {
  return data !== null && typeof data === 'object' && 'slotLabel' in data
}

export function isTimerData(data: NodeData): data is TimerNodeData {
  return data !== null && typeof data === 'object' && 'mode' in data && 'duration' in data && 'variable' in data
}

export function isMoveCharacterData(data: NodeData): data is MoveCharacterNodeData {
  return data !== null && typeof data === 'object' && 'fromPosition' in data && 'toPosition' in data && 'easing' in data
}

export function isSteamAchievementData(data: NodeData): data is SteamAchievementNodeData {
  return data !== null && typeof data === 'object' && 'achievementId' in data && !('autoCheck' in data) && !('unlockCondition' in data)
}

export function isAchievementData(data: NodeData): data is AchievementNodeData {
  return data !== null && typeof data === 'object' && 'achievementId' in data
}

export function isParticleData(data: NodeData): data is ParticleNodeData {
  return data !== null && typeof data === 'object' && 'preset' in data
}

export function isLive2DData(data: NodeData): data is Live2DNodeData {
  return data !== null && typeof data === 'object' && 'model' in data && !('preset' in data)
}

export function isItemData(data: NodeData): data is ItemNodeData {
  return data !== null && typeof data === 'object' && 'action' in data && 'itemName' in data
}

// ══════════════════════════════════════════════
// Helper: safely get typed data from a FlowNode
// ══════════════════════════════════════════════

export function getTypedData<T extends NodeData>(
  node: FlowNode,
  guard: (d: NodeData) => d is T
): T | null {
  try {
    return guard(node.data) ? node.data : null
  } catch {
    return null
  }
}

// Type → guard mapping for generic dispatch
export const NODE_TYPE_GUARDS: Record<string, (d: NodeData) => d is NodeData> = {
  dialog: isDialogData,
  choice: isChoiceData,
  condition: isConditionData,
  setVariable: isSetVariableData,
  goto: isGotoData,
  end: isEndData,
  audio: isAudioData,
  cg: isCgData,
  wait: isWaitData,
  random: isRandomData,
  label: isLabelData,
  animation: isAnimationData,
  savePoint: isSavePointData,
  timer: isTimerData,
  moveCharacter: isMoveCharacterData,
  steamAchievement: isSteamAchievementData,
  achievement: isAchievementData,
  particle: isParticleData,
  live2d: isLive2DData,
  item: isItemData
}

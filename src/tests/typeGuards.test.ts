import { describe, it, expect } from 'vitest'
import {
  isDialogData, isChoiceData, isConditionData, isSetVariableData,
  isGotoData, isEndData, isAudioData, isCgData, isWaitData,
  isRandomData, isLabelData, isAnimationData, isSavePointData,
  isTimerData, isMoveCharacterData, isSteamAchievementData, isAchievementData,
  isParticleData, getTypedData, NODE_TYPE_GUARDS
} from '../renderer/src/types/guards'
import type { NodeData, FlowNode } from '../renderer/src/types/index'

function makeNode(type: string, data: Partial<NodeData>): FlowNode {
  return { id: 'test', type, position: { x: 0, y: 0 }, data: { id: 'test', label: 'test', ...data } as NodeData }
}

describe('Type Guards', () => {
  it('isDialogData', () => {
    expect(isDialogData({ id: '', label: '', character: 'x', content: 'hi' })).toBe(true)
    expect(isDialogData({ id: '', label: '' })).toBe(false)
  })

  it('isChoiceData', () => {
    expect(isChoiceData({ id: '', label: '', title: '', options: [] })).toBe(true)
    expect(isChoiceData({ id: '', label: '', content: 'x', character: 'y' })).toBe(false)
  })

  it('isConditionData', () => {
    expect(isConditionData({ id: '', label: '', expression: 'x >= 1', trueNextId: '', falseNextId: '' })).toBe(true)
  })

  it('isSetVariableData', () => {
    expect(isSetVariableData({ id: '', label: '', variable: 'v', op: '=', value: '1' })).toBe(true)
  })

  it('isTimerData', () => {
    expect(isTimerData({ id: '', label: '', mode: 'countdown', duration: 3000, variable: 't' })).toBe(true)
    expect(isTimerData({ id: '', label: '', duration: 1000 })).toBe(false)
  })

  it('isMoveCharacterData', () => {
    expect(isMoveCharacterData({ id: '', label: '', target: 'c', fromPosition: 'left', toPosition: 'center', duration: 500, easing: 'ease' })).toBe(true)
  })

  it('isEndData distinguishes from label', () => {
    expect(isEndData({ id: '', label: '', endingType: 'normal', message: '' })).toBe(true)
    expect(isLabelData({ id: '', label: '', color: '#fff' })).toBe(true)
    expect(isEndData({ id: '', label: '', color: '#fff' })).toBe(false)
    expect(isLabelData({ id: '', label: '', endingType: 'normal', message: '' })).toBe(false)
  })

  it('isAudioData vs isAnimationData', () => {
    expect(isAudioData({ id: '', label: '', audioType: 'bgm', action: 'play', src: '', loop: false, volume: 1 })).toBe(true)
    expect(isAnimationData({ id: '', label: '', action: 'enter', target: 'x', duration: 500 })).toBe(true)
    expect(isAudioData({ id: '', label: '', action: 'enter', target: 'x', duration: 500 })).toBe(false)
    expect(isAnimationData({ id: '', label: '', audioType: 'bgm', action: 'play', src: '', loop: false, volume: 1 })).toBe(false)
  })

  it('getTypedData works', () => {
    const node = makeNode('timer', { mode: 'countdown', duration: 3000, variable: 't' })
    const data = getTypedData(node, isTimerData)
    expect(data).not.toBeNull()
    expect(data!.mode).toBe('countdown')
  })

  it('getTypedData returns null for wrong type', () => {
    const node = makeNode('timer', { mode: 'countdown', duration: 3000, variable: 't' })
    expect(getTypedData(node, isDialogData)).toBeNull()
  })

  it('NODE_TYPE_GUARDS covers all 20 types', () => {
    const expected = ['dialog', 'choice', 'condition', 'setVariable', 'goto', 'end', 'audio', 'cg', 'wait', 'random', 'label', 'animation', 'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item']
    expect(Object.keys(NODE_TYPE_GUARDS).sort()).toEqual(expected.sort())
  })

  it('isParticleData 正确识别粒子节点', () => {
    expect(isParticleData({ id: 'p1', preset: 'snow' } as any)).toBe(true)
    expect(isParticleData({ id: 'p1' } as any)).toBe(false)
    expect(isParticleData(null as any)).toBe(false)
  })

  it('getTypedData 对非法输入返回 null', () => {
    expect(getTypedData({ id: 'n', type: 'dialog', position: { x: 0, y: 0 }, data: {} as any }, isDialogData)).toBe(null)
  })

  it('getTypedData 对错误抛出返回 null', () => {
    const badNode: any = null
    expect(getTypedData(badNode, isDialogData)).toBe(null)
  })
})

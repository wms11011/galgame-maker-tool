import type { NodeType } from '../types/index'

export interface NodeFieldMeta {
  key: string
  label: string
  kind: 'string' | 'number' | 'boolean' | 'select' | 'stringArray'
  required?: boolean
  default?: unknown
  options?: { value: string; label: string }[]
  attr?: boolean
  hidden?: boolean
}

export interface NodeTypeMeta {
  type: NodeType
  directiveName: string
  icon: string
  label: string
  desc: string
  color: string
  fields: NodeFieldMeta[]
  deprecated?: boolean
}

export const NODE_TYPE_REGISTRY: Record<NodeType, NodeTypeMeta> = {
  dialog: {
    type: 'dialog',
    directiveName: 'dialog',
    icon: '💬',
    label: '对话节点',
    desc: '显示角色对话、背景与立绘',
    color: '#3b82f6',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '对话节点', attr: true },
      { key: 'character', label: '角色名', kind: 'string', attr: true },
      { key: 'content', label: '对话内容', kind: 'string', required: true },
      { key: 'background', label: '背景图', kind: 'string' },
      { key: 'characterSprite', label: '角色立绘', kind: 'string' },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
      { key: 'typingSpeed', label: '打字速度(ms)', kind: 'number', default: 45 },
      { key: 'textColor', label: '文字颜色', kind: 'string', default: '#eeeeee' },
      { key: 'fontSize', label: '字体大小', kind: 'number', default: 16 },
      { key: 'transition', label: '过渡效果', kind: 'select', default: 'none',
        options: [
          { value: 'none', label: '无' }, { value: 'fade', label: '淡入' },
          { value: 'slide', label: '滑动' }, { value: 'blinds', label: '百叶窗' }
        ] },
      { key: 'transitionDuration', label: '过渡时长(ms)', kind: 'number', default: 400 },
      { key: 'bonusItem', label: '附赠道具', kind: 'string' },
      { key: 'bonusAction', label: '道具操作', kind: 'select', default: 'get',
        options: [{ value: 'get', label: '获得' }, { value: 'use', label: '使用' }, { value: 'lose', label: '失去' }] },
    ]
  },

  choice: {
    type: 'choice',
    directiveName: 'choice',
    icon: '🔀',
    label: '选择节点',
    desc: '提供多个选项分支',
    color: '#f59e0b',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '选择节点', attr: true },
      { key: 'title', label: '选择标题', kind: 'string', attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
    ]
  },

  condition: {
    type: 'condition',
    directiveName: 'condition',
    icon: '🔍',
    label: '条件节点',
    desc: '根据表达式分支跳转',
    color: '#ef4444',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '', attr: true },
      { key: 'expression', label: '条件表达式', kind: 'string', required: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'trueNextId', label: 'True 分支', kind: 'string' },
      { key: 'falseNextId', label: 'False 分支', kind: 'string' },
    ]
  },

  setVariable: {
    type: 'setVariable',
    directiveName: 'setVar',
    icon: '📊',
    label: '变量设置',
    desc: '设置/修改变量值',
    color: '#10b981',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '变量设置', attr: true },
      { key: 'variable', label: '变量名', kind: 'string', required: true, attr: true },
      { key: 'op', label: '操作', kind: 'select', required: true, attr: true, default: '=',
        options: [
          { value: '=', label: '赋值 (=)' }, { value: '+=', label: '增加 (+=)' },
          { value: '-=', label: '减少 (-=)' }, { value: '*=', label: '乘 (*=)' },
          { value: '/=', label: '除 (/=)' }
        ] },
      { key: 'value', label: '值', kind: 'string', required: true, attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  goto: {
    type: 'goto',
    directiveName: 'goto',
    icon: '➡️',
    label: '跳转节点',
    desc: '跳转到指定节点',
    color: '#8b5cf6',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '跳转节点', attr: true },
      { key: 'targetNodeId', label: '目标节点', kind: 'string', required: true, attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
    ]
  },

  end: {
    type: 'end',
    directiveName: 'end',
    icon: '🏁',
    label: '结束节点',
    desc: '游戏结局',
    color: '#ec4899',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '结束', attr: true },
      { key: 'endingType', label: '结局类型', kind: 'select', required: true, attr: true, default: 'normal',
        options: [
          { value: 'normal', label: '普通结局' }, { value: 'good', label: '好结局' },
          { value: 'bad', label: '坏结局' }, { value: 'true', label: '真结局' }
        ] },
      { key: 'message', label: '结束语', kind: 'string', default: '感谢游玩' },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'background', label: '背景图', kind: 'string' },
    ]
  },

  audio: {
    type: 'audio',
    directiveName: 'audio',
    icon: '🎵',
    label: '音频控制',
    desc: '播放/停止BGM或音效',
    color: '#06b6d4',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '音频控制', attr: true },
      { key: 'audioType', label: '音频类型', kind: 'select', required: true, attr: true, default: 'bgm',
        options: [{ value: 'bgm', label: '背景音乐' }, { value: 'se', label: '音效' }] },
      { key: 'action', label: '操作', kind: 'select', required: true, attr: true, default: 'play',
        options: [{ value: 'play', label: '播放' }, { value: 'stop', label: '停止' }, { value: 'pause', label: '暂停' }, { value: 'resume', label: '恢复' }] },
      { key: 'src', label: '音频路径', kind: 'string', required: true, attr: true },
      { key: 'loop', label: '循环', kind: 'boolean', attr: true, default: false },
      { key: 'volume', label: '音量', kind: 'number', attr: true, default: 1 },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  cg: {
    type: 'cg',
    directiveName: 'cg',
    icon: '🖼️',
    label: 'CG展示',
    desc: '显示全屏CG图像',
    color: '#f97316',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: 'CG展示', attr: true },
      { key: 'src', label: 'CG路径', kind: 'string', required: true, attr: true },
      { key: 'transition', label: '过渡效果', kind: 'select', attr: true, default: 'fade',
        options: [
          { value: 'fade', label: '淡入' }, { value: 'slide', label: '滑动' },
          { value: 'blinds', label: '百叶窗' }, { value: 'mosaic', label: '马赛克' },
          { value: 'dissolve', label: '溶解' }, { value: 'none', label: '无' }
        ] },
      { key: 'duration', label: '持续时间(ms)', kind: 'number', attr: true, default: 800 },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  wait: {
    type: 'wait',
    directiveName: 'wait',
    icon: '⏱️',
    label: '延时节点',
    desc: '等待指定时间',
    color: '#6366f1',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '延时', attr: true },
      { key: 'duration', label: '持续时间(ms)', kind: 'number', required: true, attr: true, default: 1000 },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  random: {
    type: 'random',
    directiveName: 'random',
    icon: '🎲',
    label: '随机节点',
    desc: '按权重随机选择分支',
    color: '#a855f7',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '随机分支', attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
    ]
  },

  label: {
    type: 'label',
    directiveName: 'label',
    icon: '🏷️',
    label: '标签节点',
    desc: '章节标记',
    color: '#a855f7',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', required: true, attr: true },
      { key: 'color', label: '颜色', kind: 'string', attr: true, default: '#8b5cf6' },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
    ]
  },

  animation: {
    type: 'animation',
    directiveName: 'anim',
    icon: '🎬',
    label: '动画节点',
    desc: '角色入场/出场动画',
    color: '#eab308',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '动画', attr: true },
      { key: 'target', label: '目标角色', kind: 'string', required: true, attr: true },
      { key: 'action', label: '动画动作', kind: 'select', required: true, attr: true,
        options: [
          { value: 'enter', label: '入场' }, { value: 'exit', label: '出场' },
          { value: 'shake', label: '抖动' }, { value: 'flash', label: '闪烁' }
        ] },
      { key: 'duration', label: '持续时间(ms)', kind: 'number', required: true, attr: true, default: 500 },
      { key: 'position', label: '位置', kind: 'string', attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  savePoint: {
    type: 'savePoint',
    directiveName: 'savePoint',
    icon: '💾',
    label: '存档点',
    desc: '提示玩家存档',
    color: '#22c55e',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '存档点', attr: true },
      { key: 'slotLabel', label: '存档标签', kind: 'string', attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  timer: {
    type: 'timer',
    directiveName: 'timer',
    icon: '⏲️',
    label: '计时器',
    desc: '倒计时/秒表',
    color: '#14b8a6',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '计时器', attr: true },
      { key: 'mode', label: '模式', kind: 'select', required: true, attr: true,
        options: [{ value: 'countdown', label: '倒计时' }, { value: 'stopwatch', label: '秒表' }] },
      { key: 'duration', label: '时长(ms)', kind: 'number', required: true, attr: true, default: 5000 },
      { key: 'variable', label: '变量名', kind: 'string', attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  moveCharacter: {
    type: 'moveCharacter',
    directiveName: 'moveCharacter',
    icon: '🏃',
    label: '角色移动',
    desc: '移动角色位置',
    color: '#f43f5e',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '角色移动', attr: true },
      { key: 'target', label: '目标角色', kind: 'string', required: true, attr: true },
      { key: 'fromPosition', label: '起始位置', kind: 'select', required: true, attr: true,
        options: [
          { value: 'left', label: '左侧' }, { value: 'center', label: '中央' },
          { value: 'right', label: '右侧' }, { value: 'offscreen', label: '屏幕外' }
        ] },
      { key: 'toPosition', label: '目标位置', kind: 'select', required: true, attr: true,
        options: [
          { value: 'left', label: '左侧' }, { value: 'center', label: '中央' },
          { value: 'right', label: '右侧' }, { value: 'offscreen', label: '屏幕外' }
        ] },
      { key: 'duration', label: '持续时间(ms)', kind: 'number', required: true, attr: true, default: 800 },
      { key: 'easing', label: '缓动函数', kind: 'string', attr: true, default: 'ease' },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  steamAchievement: {
    type: 'steamAchievement',
    directiveName: 'steamAchievement',
    icon: '🔓',
    label: 'Steam成就',
    desc: '解锁Steam平台成就',
    color: '#1e40af',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: 'Steam成就', attr: true },
      { key: 'achievementId', label: '成就ID', kind: 'string', required: true, attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  achievement: {
    type: 'achievement',
    directiveName: 'achievement',
    icon: '🏆',
    label: '游戏成就',
    desc: '解锁游戏内成就',
    color: '#d946ef',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '成就', attr: true },
      { key: 'achievementId', label: '成就ID', kind: 'string', required: true, attr: true },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  particle: {
    type: 'particle',
    directiveName: 'particle',
    icon: '✨',
    label: '粒子特效',
    desc: '雨/雪/樱花/落叶/星星',
    color: '#fbbf24',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '粒子', attr: true },
      { key: 'preset', label: '粒子类型', kind: 'select', required: true, attr: true, default: 'sakura',
        options: [
          { value: 'snow', label: '❄ 雪' }, { value: 'rain', label: '🌧 雨' },
          { value: 'sakura', label: '🌸 樱花' }, { value: 'leaf', label: '🍂 落叶' },
          { value: 'star', label: '⭐ 星星' }
        ] },
      { key: 'density', label: '密度', kind: 'number', attr: true, default: 50 },
      { key: 'speed', label: '速度', kind: 'number', attr: true, default: 1 },
      { key: 'duration', label: '持续时间(ms)', kind: 'number', attr: true, default: 3000 },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  live2d: {
    type: 'live2d',
    directiveName: 'live2d',
    icon: '🎭',
    label: 'Live2D立绘（已废弃）',
    desc: '对话时自动使用角色配置的Live2D模型，无需手动添加此节点',
    deprecated: true,
    color: '#ec4899',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: 'Live2D', attr: true },
      { key: 'model', label: '模型路径', kind: 'string', required: true, attr: true },
      { key: 'expression', label: '表情', kind: 'select', attr: true, default: 'neutral',
        options: [
          { value: 'neutral', label: '平常' }, { value: 'happy', label: '开心' },
          { value: 'sad', label: '悲伤' }, { value: 'surprised', label: '惊讶' },
          { value: 'angry', label: '生气' }, { value: 'shy', label: '害羞' }
        ] },
      { key: 'motion', label: '动作', kind: 'select', attr: true, default: 'idle',
        options: [
          { value: 'idle', label: '待机' }, { value: 'enter', label: '入场' },
          { value: 'exit', label: '退场' }, { value: 'talk', label: '说话' },
          { value: 'shake', label: '抖动' }
        ] },
      { key: 'position', label: '屏幕位置', kind: 'select', attr: true, default: 'center',
        options: [
          { value: 'left', label: '左侧' }, { value: 'center', label: '中央' },
          { value: 'right', label: '右侧' }
        ] },
      { key: 'unlockCondition', label: '解锁条件', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },

  item: {
    type: 'item',
    directiveName: 'item',
    icon: '📦',
    label: '道具节点',
    desc: '获得/使用/失去/检查道具',
    color: '#84cc16',
    fields: [
      { key: 'id', label: 'ID', kind: 'string', required: true, hidden: true },
      { key: 'label', label: '节点名称', kind: 'string', default: '道具', attr: true },
      { key: 'action', label: '操作', kind: 'select', required: true, attr: true, default: 'get',
        options: [
          { value: 'get', label: '🔑 获得' }, { value: 'use', label: '🧪 使用' },
          { value: 'lose', label: '❌ 失去' }, { value: 'check', label: '🔍 检查' }
        ] },
      { key: 'itemName', label: '道具名称', kind: 'string', required: true, attr: true },
      { key: 'inventoryVar', label: '背包变量', kind: 'string', attr: true, default: '背包' },
      { key: 'trueNextId', label: '拥有时跳转', kind: 'string' },
      { key: 'falseNextId', label: '没有时跳转', kind: 'string' },
      { key: 'nextNodeId', label: '下一节点', kind: 'string' },
    ]
  },
}

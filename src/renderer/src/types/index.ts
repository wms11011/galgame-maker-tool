// ============================================================
// 核心类型定义 - GALGAME 制作工具
// ============================================================

// 节点类型
export type NodeType = 'dialog' | 'choice' | 'condition' | 'setVariable' | 'goto' | 'end' | 'audio' | 'cg' | 'wait' | 'random' | 'label' | 'animation' | 'savePoint' | 'timer' | 'moveCharacter' | 'steamAchievement' | 'achievement' | 'particle' | 'live2d' | 'item'

// 变量操作类型
export type VariableOp = '=' | '+=' | '-=' | '*=' | '/=' | 'push' | 'pop' | 'clear'

// 双向同步状态
export type SyncState = 'synced' | 'flow-ahead' | 'code-ahead' | 'conflict'

// ============================================================
// 节点数据接口
// ============================================================

export interface BaseNodeData {
  id: string
  label: string
  unlockCondition?: string
}

export interface DialogNodeData extends BaseNodeData {
  character: string
  content: string
  background?: string
  characterSprite?: string
  nextNodeId?: string
  // 文本效果
  typingSpeed?: number
  textColor?: string
  fontSize?: number
  // 场景过渡
  transition?: 'none' | 'fade' | 'slide' | 'blinds' | 'mosaic' | 'wind' | 'iris' | 'dissolve'
  transitionDuration?: number
  // 附赠道具：对话播放时自动获得/使用/失去道具，省去单独 @item 节点
  bonusItem?: string
  bonusAction?: 'get' | 'use' | 'lose'
}

export interface ChoiceOption {
  id: string
  text: string
  nextNodeId: string
}

export interface ChoiceNodeData extends BaseNodeData {
  title: string
  options: ChoiceOption[]
}

export interface ConditionNodeData extends BaseNodeData {
  expression: string
  trueNextId: string
  falseNextId: string
}

export interface SetVariableNodeData extends BaseNodeData {
  variable: string
  op: VariableOp
  value: string
  nextNodeId?: string
}

export interface GotoNodeData extends BaseNodeData {
  targetNodeId: string
}

export interface EndNodeData extends BaseNodeData {
  endingType: 'normal' | 'good' | 'bad' | 'true'
  message: string
  background?: string
}

export interface AudioNodeData extends BaseNodeData {
  audioType: 'bgm' | 'se'
  action: 'play' | 'stop'
  src: string
  loop: boolean
  volume: number
  nextNodeId?: string
}

export interface CgNodeData extends BaseNodeData {
  src: string
  transition: 'none' | 'fade' | 'zoom'
  duration: number
  nextNodeId?: string
}

export interface WaitNodeData extends BaseNodeData {
  duration: number
  nextNodeId?: string
}

export interface RandomBranch {
  id: string
  targetNodeId: string
  weight: number
}

export interface RandomNodeData extends BaseNodeData {
  branches: RandomBranch[]
}

export interface LabelNodeData extends BaseNodeData {
  color: string
}

export interface AnimationNodeData extends BaseNodeData {
  target: string
  action: 'enter' | 'exit' | 'shake' | 'flash'
  position?: 'left' | 'center' | 'right'
  duration: number
  nextNodeId?: string
}

export interface SavePointNodeData extends BaseNodeData {
  slotLabel: string
  nextNodeId?: string
}

export interface TimerNodeData extends BaseNodeData {
  mode: 'countdown' | 'stopwatch'
  duration: number
  variable: string
  nextNodeId?: string
}

export interface MoveCharacterNodeData extends BaseNodeData {
  target: string
  fromPosition: 'left' | 'center' | 'right'
  toPosition: 'left' | 'center' | 'right'
  duration: number
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out'
  nextNodeId?: string
}

export interface SteamAchievementNodeData extends BaseNodeData {
  achievementId: string
  nextNodeId?: string
}

export type ParticlePreset = 'rain' | 'snow' | 'sakura' | 'leaf' | 'star'

export interface ParticleNodeData extends BaseNodeData {
  preset: ParticlePreset
  density?: number
  speed?: number
  duration?: number
  nextNodeId?: string
}

export type Live2DExpression = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'shy'
export type Live2DMotion = 'idle' | 'enter' | 'exit' | 'talk' | 'shake'

export interface Live2DNodeData extends BaseNodeData {
  model: string
  expression?: Live2DExpression
  motion?: Live2DMotion
  position?: 'left' | 'center' | 'right'
  nextNodeId?: string
}

export type ItemAction = 'get' | 'use' | 'lose' | 'check'

export interface ItemNodeData extends BaseNodeData {
  action: ItemAction
  itemName: string
  inventoryVar?: string
  trueNextId?: string   // for 'check' action
  falseNextId?: string  // for 'check' action
  nextNodeId?: string
}

export type NodeData = DialogNodeData | ChoiceNodeData | ConditionNodeData | SetVariableNodeData | GotoNodeData | EndNodeData | AudioNodeData | CgNodeData | WaitNodeData | RandomNodeData | LabelNodeData | AnimationNodeData | SavePointNodeData | TimerNodeData | MoveCharacterNodeData | SteamAchievementNodeData | AchievementNodeData | ParticleNodeData | Live2DNodeData | ItemNodeData

// ============================================================
// 道具系统
// ============================================================

export type ItemType = 'key' | 'consumable' | 'equipment' | 'material' | 'quest'

export interface ItemDef {
  id: string
  name: string
  icon: string            // emoji 备用图标
  iconPath?: string       // 道具贴图路径（优先）
  type: ItemType
  description?: string
  stackable?: boolean
  maxStack?: number
  consumable?: boolean
  effects?: Record<string, string | number>
}

// ============================================================
// 存档数据结构
// ============================================================

export interface GameSaveData {
  id: string
  slotLabel: string
  timestamp: string
  projectName: string
  currentNodeId: string
  currentNodeLabel: string
  variables: Record<string, number>
  visitedNodeIds: string[]
  globalFlags: Record<string, boolean>
  screenshot?: string
}

// ============================================================
// 流程图接口
// ============================================================

export interface FlowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
  style?: Record<string, unknown>
}

// ============================================================
// 项目数据接口
// ============================================================

export interface ProjectMeta {
  name: string
  version: string
  createdAt: string
  updatedAt: string
  projectPath: string
  resolution: '1280x720' | '1920x1080'
}

export type AssetCategory = 'character' | 'avatar' | 'background' | 'item' | 'cg' | 'live2d' | 'audio' | 'other'

export interface AssetInfo {
  name: string
  relativePath: string
  type: 'image' | 'audio'
  category?: AssetCategory
  size: number
  thumbnail?: string
}

export type VariableType = 'number' | 'string' | 'boolean' | 'array'

export interface VariableInfo {
  name: string
  type: VariableType
  initialValue: number | string | boolean | string[]
  scope?: 'global' | 'chapter' | 'temporary'
  description?: string
}

export interface CharacterInfo {
  name: string
  personality: string
  bio: string
  sprite: string
  live2dModel?: string
  avatar?: string
}

// ============================================================
// 场景/章节分组
// ============================================================

export interface SceneGroup {
  id: string
  name: string
  color: string
  nodeIds: string[]
  background?: string
  titleCard?: boolean
  bgm?: string
  bgmVolume?: number
  bgmLoop?: boolean
  defaultBackground?: string
  unlockCondition?: string
  transition?: 'fade' | 'slide' | 'blinds' | 'mosaic' | 'wind' | 'iris' | 'dissolve' | 'none'
  particlePreset?: 'snow' | 'rain' | 'sakura' | 'leaf' | 'star'
  particleDensity?: number
  particleSpeed?: number
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  color: string
  unlocked: boolean
  unlockedAt?: string
  unlockCondition?: string
  autoCheck?: boolean
}

export interface AchievementNodeData extends BaseNodeData {
  achievementId: string
  nextNodeId?: string
}

export interface ProjectData {
  meta: ProjectMeta
  flow: {
    nodes: FlowNode[]
    edges: FlowEdge[]
  }
  script: string
  assets: AssetInfo[]
  variables: VariableInfo[]
  characters: CharacterInfo[]
  globalFlags?: Record<string, boolean>
  flagAliases?: Record<string, string>
  groups?: SceneGroup[]
  achievements?: AchievementDef[]
}

// ============================================================
// IPC / Electron API 接口
// ============================================================

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface DialogResult<T> {
  success: boolean
  data?: T | null
  error?: string
}

export interface ProjectResult {
  success: boolean
  data?: ProjectData
  error?: string
}

export interface SaveResult {
  success: boolean
  data?: { path: string } | null
  path?: string
  error?: string
}

export interface AssetResult {
  success: boolean
  data?: AssetInfo[]
  error?: string
}

export interface BackupInfo {
  path: string
  createdAt: string
  projectName: string
}

export interface ElectronAPI {
  // 项目操作
  createProject(name: string, path: string): Promise<ProjectResult>
  openProject(): Promise<ProjectResult>
  saveProject(data: ProjectData): Promise<SaveResult>
  saveProjectAs(data: ProjectData): Promise<SaveResult>

  // 资源操作
  importAsset(type: 'image' | 'audio', projectPath?: string): Promise<AssetResult>
  deleteAsset(relativePath: string, projectPath?: string): Promise<AssetResult>
  listAssets(projectPath: string): Promise<AssetResult>

  // 系统操作
  showOpenDialog(options: OpenDialogOptions): Promise<DialogResult<string[]>>
  showSaveDialog(options: SaveDialogOptions): Promise<DialogResult<string>>
  openDirectory(path: string): void
  getAppVersion(): Promise<string>

  // 备份
  createBackup(data: ProjectData): Promise<string>
  listBackups(): Promise<BackupInfo[]>
  restoreBackup(backupPath: string): Promise<ProjectData>

  // 导出
  exportProject(projectData: ProjectData, config: ExportConfig): Promise<ExportResult>
  onExportProgress(callback: (stage: string, percent: number) => void): () => void

  // 资源加载（IPC）
  loadAssetAsDataUrl(projectPath: string, relativePath: string): Promise<DialogResult<string>>

  // 日志
  log(level: 'info' | 'warn' | 'error', message: string): void

  // AI 辅助
  aiGenerate(request: AIGenerateRequest): Promise<AIGenerateResult>
  aiStream(request: AIGenerateRequest, onChunk: (chunk: AIStreamChunk) => void): () => void
  aiGetConfig(): Promise<AIConfig>
  aiSaveConfig(config: AIConfig): Promise<{ success: boolean; error?: string }>
}

// ============================================================
// 映射引擎接口
// ============================================================

export interface ParseError {
  line: number
  column: number
  message: string
}

export interface ParseResult {
  success: boolean
  nodes?: FlowNode[]
  edges?: FlowEdge[]
  errors?: ParseError[]
  warnings?: ParseError[]
}

export interface ConflictState {
  hasConflict: boolean
  flowModified: boolean
  codeModified: boolean
  lastSyncTime: Date
}

// ============================================================
// AI 辅助接口
// ============================================================

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  endpoint: string
  model: string
  temperature: number
  maxTokens: number
  enabled: boolean
}

export interface AIGenerateRequest {
  type: 'dialog' | 'branch' | 'translate' | 'continue' | 'character' | 'fix'
  prompt: string
  context?: AIContextData
  language?: 'zh' | 'en' | 'ja'
}

export interface AIContextData {
  characters: CharacterInfo[]
  variables: VariableInfo[]
  globalFlags: Record<string, boolean>
  currentScript?: string
  sceneName?: string
  selectedNodeId?: string
}

export interface AIGenerateResult {
  success: boolean
  content?: string
  script?: string
  error?: string
  tokensUsed?: number
}

export interface AIStreamChunk {
  type: 'text' | 'done' | 'error'
  content: string
}

export const AI_PROVIDER_DEFAULTS: Record<AIProvider, { endpoint: string; model: string }> = {
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
  claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
  custom: { endpoint: 'http://localhost:8080/v1', model: 'default' }
}

// ============================================================
// 导出配置接口
// ============================================================

export interface ExportConfig {
  type: 'web' | 'desktop'
  resolution: '1280x720' | '1920x1080'
  outputPath: string
  includeDebugInfo: boolean
  customIcon?: string
  compressAssets: boolean
  targetPlatforms?: ('win' | 'mac' | 'linux')[]
}

export interface ExportResult {
  success: boolean
  outputPath?: string
  error?: string
}

export type ProgressCallback = (stage: string, percent: number) => void

// ============================================================
// 全局 Window 类型扩展
// ============================================================

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

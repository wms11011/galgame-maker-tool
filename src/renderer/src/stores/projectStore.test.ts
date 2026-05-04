import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from './flowStore'
import { useProjectStore } from './projectStore'
import type { ElectronAPI, ProjectData } from '../types'

const mockProjectData: ProjectData = {
  meta: {
    name: 'Demo',
    version: '1.0.0',
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
    projectPath: '/demo.galgame',
    resolution: '1280x720'
  },
  flow: {
    nodes: [
      {
        id: 'node_1',
        type: 'dialog',
        position: { x: 10, y: 20 },
        data: {
          id: 'node_1',
          label: 'Start',
          character: 'A',
          content: 'Hello'
        }
      }
    ],
    edges: []
  },
  script: 'say("Hello")',
  assets: [
    {
      name: 'bg.png',
      relativePath: 'assets/backgrounds/bg.png',
      type: 'image',
      size: 1234
    }
  ]
}

function createElectronApiMock(overrides: Partial<ElectronAPI> = {}): ElectronAPI {
  return {
    createProject: vi.fn().mockResolvedValue({ success: true, data: mockProjectData }),
    openProject: vi.fn().mockResolvedValue({ success: true, data: mockProjectData }),
    saveProject: vi.fn().mockResolvedValue({ success: true, data: { path: mockProjectData.meta.projectPath } }),
    saveProjectAs: vi.fn().mockResolvedValue({ success: true, data: { path: '/saved-as.galgame' } }),
    importAsset: vi.fn(),
    deleteAsset: vi.fn(),
    listAssets: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    openDirectory: vi.fn(),
    getAppVersion: vi.fn(),
    createBackup: vi.fn(),
    listBackups: vi.fn(),
    restoreBackup: vi.fn(),
    exportProject: vi.fn(),
    log: vi.fn(),
    ...overrides
  } as ElectronAPI
}

describe('projectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads flow data into flowStore when opening a project', async () => {
    window.electronAPI = createElectronApiMock()

    const projectStore = useProjectStore()
    const flowStore = useFlowStore()

    await projectStore.openProject()

    expect(flowStore.nodes).toEqual(mockProjectData.flow.nodes)
    expect(flowStore.edges).toEqual(mockProjectData.flow.edges)
    expect(projectStore.assets).toEqual(mockProjectData.assets)
  })

  it('preserves flow and assets when saving a project', async () => {
    const electronAPI = createElectronApiMock()
    window.electronAPI = electronAPI

    const projectStore = useProjectStore()

    await projectStore.openProject()
    await projectStore.saveProject()

    expect(electronAPI.saveProject).toHaveBeenCalledTimes(1)
    expect(electronAPI.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: mockProjectData.flow,
        assets: mockProjectData.assets
      })
    )
  })

  it('passes project data to saveProjectAs and updates the saved path', async () => {
    const electronAPI = createElectronApiMock()
    window.electronAPI = electronAPI

    const projectStore = useProjectStore()

    await projectStore.openProject()
    await projectStore.saveProjectAs()

    expect(electronAPI.saveProjectAs).toHaveBeenCalledTimes(1)
    expect(electronAPI.saveProjectAs).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: mockProjectData.flow,
        assets: mockProjectData.assets
      })
    )
    expect(projectStore.meta?.projectPath).toBe('/saved-as.galgame')
  })
})

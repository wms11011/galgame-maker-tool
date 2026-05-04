import { Howl } from 'howler'

type FadeCallback = (id: number) => void

export class AudioManager {
  private bgm: Howl | null = null
  private bgmId: number | null = null
  private sePool: Howl[] = []
  private masterVolume = 1
  private muted = false

  /** 播放 BGM，自动替换当前 BGM 并支持淡入淡出 */
  playBgm(url: string, loop: boolean, volume: number, fadeInMs = 500): void {
    // 停止当前 BGM（淡出）
    if (this.bgm && this.bgmId !== null) {
      const oldBgm = this.bgm
      const oldId = this.bgmId
      oldBgm.fade(volume * this.masterVolume, 0, 300, oldId)
      setTimeout(() => {
        oldBgm.stop(oldId)
        oldBgm.unload()
      }, 350)
    }

    const howl = new Howl({
      src: [url],
      loop,
      volume: 0,
      html5: true,
      format: [this.extractFormat(url)]
    })

    this.bgm = howl
    this.bgmId = howl.play()

    if (this.bgmId !== undefined) {
      howl.fade(0, volume * this.masterVolume, fadeInMs, this.bgmId)
    }
  }

  /** 停止 BGM（淡出） */
  stopBgm(fadeOutMs = 300): void {
    if (!this.bgm || this.bgmId === null) return
    const bgm = this.bgm
    const id = this.bgmId
    bgm.fade(bgm.volume(), 0, fadeOutMs, id)
    setTimeout(() => {
      bgm.stop(id)
      bgm.unload()
    }, fadeOutMs + 50)
    this.bgm = null
    this.bgmId = null
  }

  /** 播放音效 */
  playSe(url: string, volume: number): void {
    const howl = new Howl({
      src: [url],
      volume: volume * this.masterVolume,
      html5: true,
      format: [this.extractFormat(url)],
      onend: () => {
        const idx = this.sePool.indexOf(howl)
        if (idx >= 0) this.sePool.splice(idx, 1)
        howl.unload()
      }
    })

    this.sePool.push(howl)
    howl.play()
  }

  /** 停止所有音效 */
  stopAllSe(): void {
    for (const se of this.sePool.splice(0)) {
      se.stop()
      se.unload()
    }
  }

  /** 设置 BGM 音量（0-1） */
  setBgmVolume(volume: number): void {
    if (this.bgm && this.bgmId !== null) {
      this.bgm.volume(volume * this.masterVolume, this.bgmId)
    }
  }

  /** 设置主音量 */
  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol))
    if (this.bgm && this.bgmId !== null) {
      this.bgm.volume(this.bgm.volume(), this.bgmId)
    }
  }

  /** 静音/取消静音 */
  toggleMute(): boolean {
    this.muted = !this.muted
    Howler.mute(this.muted)
    return this.muted
  }

  get isMuted(): boolean {
    return this.muted
  }

  /** 销毁，释放所有音频资源 */
  destroy(): void {
    this.stopBgm(0)
    this.stopAllSe()
  }

  private extractFormat(url: string): string {
    const match = url.match(/\.(\w+)(?:\?|$)/)
    if (match) return match[1].toLowerCase()
    return 'mp3'
  }
}

// 导出 Howler 全局静音控制
export { Howler }

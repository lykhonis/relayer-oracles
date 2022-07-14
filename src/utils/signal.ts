import { timeout } from './timeout'

export class Signal {
  private promise: Promise<any> | null
  private resolve: ((value: any) => void) | null
  private reject: ((reason?: any) => void) | null

  constructor() {
    this.promise = null
    this.resolve = null
    this.reject = null
  }

  async wait() {
    if (!this.promise) {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
    }
    do {
      await Promise.any([timeout(60 * 60 * 1000), this.promise])
    } while (this.promise)
  }

  notify(error?: any) {
    if (this.promise) {
      const resolve = this.resolve
      const reject = this.reject
      this.promise = null
      if (error) {
        reject?.call(this, error)
      } else {
        resolve?.call(this, true)
      }
    }
  }
}

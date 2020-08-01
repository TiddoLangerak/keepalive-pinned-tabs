export class AbortControllerManager {
  private static instance: AbortControllerManager
  static getInstance(): AbortControllerManager {
    if (!AbortControllerManager.instance) AbortControllerManager.instance = new AbortControllerManager()

    return AbortControllerManager.instance
  }

  private controller = new AbortController()
  private constructor() {}

  renew() {
    this.controller.abort()
    this.controller = new AbortController()
    return this.controller
  }
}

class AbortController {
  private aborted: boolean = false

  abort() {
    this.aborted = true
  }

  isAborted() {
    return this.aborted
  }
}

import { retryUntil, delay } from 'extra-promise'

export async function retryTimeout<T>(timeout: number, fn: () => T | Promise<T>): Promise<T> {
  return await retryUntil(fn, async () => {
    await delay(timeout)
    return false
  })
}

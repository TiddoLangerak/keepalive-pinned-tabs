import { each, retryUntil, delay } from 'extra-promise'

browser.windows.onFocusChanged.addListener(() => {
  // Tabs cannot be edited when user dragging a tab, so retry it.
  // If you drag and drop tabs quickly, Chrome will crash, so add delay.
  retry(100, async () => {
    const tabIds = await getPinnedTabIds()

    await moveTabsToCurrentWindow(tabIds)

    // Since the tab will be unpinned after moving, pin them again.
    await each(tabIds, pinTab)
  })
})

async function moveTabsToCurrentWindow(tabIds: number[]) {
  await browser.tabs.move(tabIds, {
    windowId: await getCurrentWindowId()
  , index: 0
  })
}

async function retry<T>(ms: number, fn: () => T | Promise<T>): Promise<T> {
  return await retryUntil(fn, async () => {
    await delay(ms)
    return false
  })
}

async function getPinnedTabIds(): Promise<number[]> {
  const pinnedTabs = await browser.tabs.query({ pinned: true })
  return pinnedTabs.map(tab => tab.id!)
}

async function getCurrentWindowId(): Promise<number> {
  const window = await browser.windows.getLastFocused()
  return window.id!
}

async function pinTab(id: number): Promise<void> {
  await browser.tabs.update(id, { pinned: true })
}

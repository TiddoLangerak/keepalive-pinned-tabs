import { each } from 'extra-promise'
import { retryTimeout } from './retry-timeout'

browser.windows.onFocusChanged.addListener(() => {
  // Tabs cannot be edited when user dragging a tab, so retry it.
  // If you drag and drop tabs quickly, Chrome will crash, so add delay.
  retryTimeout(100, async () => {
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

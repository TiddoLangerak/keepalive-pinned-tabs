type Tab = browser.tabs.Tab;

/**
 * So when I initially wrote this plugin I didn't leave full comments behind, so now trying to retrace my steps:
 *
 * When a window closes, 2 important events are fired:
 * 1. The browser.tabs.onRemoved event is fired for each tab
 * 2. The browser.windows.onRemoved event is fired
 *
 * We can't access the tabs anymore once event 2 fires, so we'll need to use event 1 to keep track of these.
 *
 * Now obviously, the tabs.onRemoved event is also fired when a tab is closed normally.
 * To deal with this, we only remember closed tabs for 1 second after they're closed.
 * Normally, when closing the window, the window will close easily within 1 second of closing the tabs,
 * so this is enough to move them around.
 *
 *
 * TODO: We should probably handle this through the `Sessions` interface instead.
 * Could hook into the "onChanged", and check for pins in the last closed window.
 */


/**
 * Maps window id -> recently closed tabs
 */
type RecentlyClosed = { [k: number] : Tab[] };
const recentlyClosed: RecentlyClosed = {};

/**
 * Map of all pins per windoww.
 */
type GroupedWindows = { [k: number]: number[] }
let pinnedPerWindow: GroupedWindows  = {};

/**
 * Map of tab id -> Tab object
 * Only keeps track of pinned tabs.
 */
type TabsMap = { [k: number]: Tab };
let tabs: TabsMap = {};

/**
 * Updates the bookkeeping for pinned tabs.
 *
 * The _handle parameter is just for debugging, not used for anything else.
 */
async function updatePinned(_handle: string) {
  const pinned = await getPinnedTabs();
  const newTabs = pinned.reduce((acc, curr) => {
    if (curr.id !== undefined) {
      acc[curr.id] = curr;
    }
    return acc;
  }, {} as TabsMap);
  const grouped = pinned.reduce((acc, curr) => {
    if (curr.id !== undefined) {
      const windowId: number = curr.windowId || -1;
      acc[windowId] = acc[windowId] || [];
      acc[windowId].push(curr.id);
    }
    return acc;
  }, {} as GroupedWindows);

  pinnedPerWindow = grouped;
  tabs = newTabs;

  await browser.storage.local.set({
    pins: pinned
  });
}

browser.tabs.onRemoved.addListener((tabid) => {
  const tab = tabs[tabid];
  const wid = tab.windowId;
  if (tab && wid) {
    recentlyClosed[wid] = recentlyClosed[wid] || [];
    recentlyClosed[wid].push(tab);
    setTimeout(() => {
      if (recentlyClosed[wid]) {
        recentlyClosed[wid] = recentlyClosed[wid]
          .filter(t => t != tab);
      }
    }, 1000);
  }
  updatePinned("Tab removed");
});

browser.windows.onRemoved.addListener(async (windowId) => {
  const restore = [...(recentlyClosed[windowId] || [])];

  await restoreTabs(restore);

  delete recentlyClosed[windowId];

  updatePinned("window removed");
});

async function restoreTabs(restore: browser.tabs.Tab[]) {
  for (const tab of restore) {
    try {
      await browser.tabs.create({
        active: false,
        discarded: tab.discarded,
        // TODO: muted (needs type update)
        //muted: (tab.mutedInfo || {}).muted,
        cookieStoreId: tab.cookieStoreId,
        openInReaderMode: tab.isInReaderMode,
        pinned: true,
        title: tab.discarded ? tab.title : undefined,
        url: tab.url
      });
    } catch (e) {
      console.error("Couldn't add tab", e);
    }
  }
}


// Event handlers to update bookkeeping

browser.tabs.onCreated.addListener(() => {
  updatePinned("Tab created");
});

browser.windows.onCreated.addListener(() => {
  updatePinned("Window created");
});

browser.tabs.onUpdated.addListener((_tabId, changeInfo, _tab) => {
  if (changeInfo.pinned !== undefined) {
    updatePinned("pin change");
  }
});

async function getPinnedTabs(): Promise<browser.tabs.Tab[]> {
  return await browser.tabs.query({ pinned: true })
}

async function init() {
  const persistedPins: browser.tabs.Tab[] = (await browser.storage.local.get({ pins: [] })).pins;
  const currentPins = await getPinnedTabs();
  const restorable = (persistedPins || [])
    .filter(pin => !currentPins.some(p => p.url === pin.url));
  await restoreTabs(restorable);

  // Initialize the bookkeeping on startup
  await updatePinned("init");
}

init();


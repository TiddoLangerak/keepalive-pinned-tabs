type Tab = browser.tabs.Tab;

type RecentlyClosed = { [k: number] : Tab[] };
const recentlyClosed: RecentlyClosed = {};

type GroupedWindows = { [k: number]: number[] }
let pinnedPerWindow: GroupedWindows  = {};

type TabsMap = { [k: number]: Tab };
let tabs: TabsMap = {};

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
}
updatePinned("init");

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


browser.tabs.onCreated.addListener(() => {
  updatePinned("Tab created");
});

browser.windows.onCreated.addListener(() => {
  updatePinned("Window created");
});

browser.windows.onRemoved.addListener(async (windowId) => {
  const restore = [...(recentlyClosed[windowId] || [])];

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

  delete recentlyClosed[windowId];

  updatePinned("window removed");
});

browser.tabs.onUpdated.addListener((_tabId, changeInfo, _tab) => {
  if (changeInfo.pinned !== undefined) {
    updatePinned("pin change");
  }
});


async function getPinnedTabs(): Promise<browser.tabs.Tab[]> {
  return await browser.tabs.query({ pinned: true })
}

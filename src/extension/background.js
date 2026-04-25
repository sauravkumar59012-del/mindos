chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       'mindos-flashcard',
    title:    'MindOS — Flashcard Banao',
    contexts: ['selection']
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'mindos-flashcard') {
    chrome.action.openPopup()
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TEXT_SELECTED') {
    chrome.storage.session.set({ selectedText: message.text })
  }
})
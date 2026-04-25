chrome.runtime.onInstalled.addListener(() => { chrome.contextMenus.create({ id: 'mindos', title: 'MindOS Flashcard Banao', contexts: ['selection'] }) })

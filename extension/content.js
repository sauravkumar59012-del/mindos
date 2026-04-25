document.addEventListener('mouseup', () => { const t = window.getSelection()?.toString()?.trim(); if(t) chrome.runtime.sendMessage({type:'TEXT_SELECTED', text:t}) })

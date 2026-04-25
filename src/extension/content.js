let lastSelected = ''

document.addEventListener('mouseup', () => {
  const selected = window.getSelection()?.toString()?.trim()
  if (selected && selected !== lastSelected) {
    lastSelected = selected
    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      text: selected
    })
  }
})
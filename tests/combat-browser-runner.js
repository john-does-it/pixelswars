const frame = document.getElementById('game')
frame.addEventListener('load', () => {
  const script = frame.contentDocument.createElement('script')
  script.src = 'tests/combat-browser.js'
  frame.contentDocument.body.append(script)
})
frame.src = new URLSearchParams(location.search).get('map') === '2' ? '../board-2.html' : '../board-1.html'

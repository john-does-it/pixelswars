const frame = document.getElementById('game')
if (new URLSearchParams(location.search).has('mobile')) frame.width = '380'
frame.addEventListener('load', () => {
  const script = frame.contentDocument.createElement('script')
  script.src = 'tests/factory-browser.js'
  frame.contentDocument.body.append(script)
})
frame.src = new URLSearchParams(location.search).get('map') === '2' ? '../board-2.html' : '../board-1.html'

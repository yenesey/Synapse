
require('eventsource-polyfill')

require('hmr?reload=true').subscribe(function (event) { //?noInfo=true&reload=true
  if (event.action === 'reload') {
    window.location.reload()
  }
})

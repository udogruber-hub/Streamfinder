import React from 'react'
import ReactDOM from 'react-dom/client'
import StreamFinder from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(StreamFinder)
  )
)

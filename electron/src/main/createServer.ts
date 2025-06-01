import { pathToFileURL } from 'node:url'
const express = require('express')
const path = require('path')

const app = express()

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../renderer/public')))

export async function startServer(port: number) {
  // Dynamically resolve the handler path
  const handlerPath = path.join(__dirname, '../renderer/server/index.mjs')
  const { handler } = await import(pathToFileURL(handlerPath).href)

  app.use(handler)

  app.listen(port, () => {
    console.log(`Express server running at http://localhost:${port}`)
  })
}

const { app, BrowserWindow, dialog } = require('electron')
const { spawn } = require('node:child_process')
const { existsSync } = require('node:fs')
const { createServer } = require('node:net')
const path = require('node:path')
const { autoUpdater } = require('electron-updater')

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000
const SERVER_START_TIMEOUT_MS = 30_000
const SERVER_CHECK_INTERVAL_MS = 250

let mainWindow
let serverProcess
let updateCheckInterval
let updatePromptShown = false

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : undefined

      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        if (!port) {
          reject(new Error('Unable to reserve a local port for the app server.'))
          return
        }

        resolve(port)
      })
    })
  })
}

async function waitForServer(url) {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // The server has not started listening yet.
    }

    await delay(SERVER_CHECK_INTERVAL_MS)
  }

  throw new Error(`The local app server did not start within ${SERVER_START_TIMEOUT_MS / 1000} seconds.`)
}

async function startPackagedServer() {
  const serverEntry = path.join(process.resourcesPath, 'nuxt', 'server', 'index.mjs')
  if (!existsSync(serverEntry)) {
    throw new Error(`The packaged Nuxt server is missing at ${serverEntry}.`)
  }

  const port = await reservePort()
  const url = `http://127.0.0.1:${port}`

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: String(port),
      NODE_ENV: 'production',
    },
    stdio: 'ignore',
    windowsHide: true,
  })

  serverProcess.once('error', (error) => {
    console.error('The local Nuxt server could not start.', error)
  })

  await waitForServer(url)
  return url
}

function stopPackagedServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill()
  }
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  return mainWindow.loadURL(url)
}

async function promptForRestart() {
  if (updatePromptShown) {
    return
  }

  updatePromptShown = true
  const { response } = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'Update ready',
    message: 'An update has been downloaded and is ready to install.',
    detail: 'Restart ShowMasters Lasso Integration now to finish installing the update.',
  })

  if (response === 0) {
    autoUpdater.quitAndInstall()
  }
}

function configureAutoUpdates() {
  if (!app.isPackaged) {
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('error', (error) => {
    console.error('Unable to check for or download an update.', error)
  })
  autoUpdater.on('update-downloaded', () => {
    void promptForRestart()
  })

  const checkForUpdates = () => {
    void autoUpdater.checkForUpdates()
  }

  checkForUpdates()
  updateCheckInterval = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS)
}

app.whenReady()
  .then(async () => {
    const appUrl = app.isPackaged
      ? await startPackagedServer()
      : 'http://127.0.0.1:3000'

    await createMainWindow(appUrl)
    configureAutoUpdates()
  })
  .catch((error) => {
    console.error('Unable to start ShowMasters Lasso Integration.', error)
    dialog.showErrorBox('Unable to start ShowMasters Lasso Integration', error.message)
    app.quit()
  })

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval)
  }

  stopPackagedServer()
})

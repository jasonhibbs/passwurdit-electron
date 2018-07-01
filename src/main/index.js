import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron'

if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

// Menu -----------------------------------------------------------
const menuTemplate = [
  {
    label: 'Passwurdit',
    submenu: [
      { role: 'about', label: 'About Passwurdit' },
      { type: 'separator'  },
      { role: 'hide', label: 'Hide Passwurdit'   },
      { role: 'hideothers' },
      { role: 'unhide'     },
      { type: 'separator'  },
      { role: 'quit', label: 'Quit Passwurdit'   }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'copy'       },
      { role: 'paste'      },
      { role: 'selectall'  }
    ]
  },
  {
    role: 'window',
    submenu: [
      { role: 'minimize'   },
      { role: 'close'      }
    ]
  },
]

// Main -----------------------------------------------------------
let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

const Store = require('electron-store');
const store = new Store();

let windowMinWidth = 580
let windowMaxWidth = 1152
let windowHeightCollapsed = 170
let windowHeightExpanded  = 256
let windowInitialWidth = store.get('windowWidth') || 600

function createWindow() {
  mainWindow = new BrowserWindow({
    width           : windowInitialWidth,
    minWidth        : windowMinWidth,
    maxWidth        : windowMaxWidth,
    height          : windowHeightCollapsed,
    minHeight       : windowHeightCollapsed,
    maxHeight       : windowHeightCollapsed,
    titleBarStyle   : 'hidden',
    fullscreenable  : false,
    backgroundColor : '#cff0e3',
    show            : false,
  })

  mainWindow.loadURL(winURL)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()

    if (store.get('windowX')) {
      setWindowInitialSize()
    }
  })

  mainWindow.webContents.on('did-frame-finish-load', () => {
    mainWindow.webContents.send('loaded', store.store)
  })

  mainWindow.on('move', (e) => {
    let pos = mainWindow.getPosition()
    store.set({
      windowX: pos[0],
      windowY: pos[1]
    })
  })

  mainWindow.on('resize', (e) => {
    let size = mainWindow.getSize()
    store.set({ windowWidth: size[0] })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function setWindowInitialSize() {
  let size = mainWindow.getSize()

  mainWindow.setBounds({
    x: store.get('windowX'),
    y: store.get('windowY'),
    width: store.get('windowWidth') || 600,
    height: windowHeightCollapsed
  })
}

function setWindowExpandedState(expanded) {
  store.set('expanded', expanded)

  let size = mainWindow.getSize()
  let currentWidth = size[0]
  let newHeight = expanded ? windowHeightExpanded : windowHeightCollapsed

  mainWindow.setMinimumSize(windowMinWidth, newHeight)
  mainWindow.setMaximumSize(windowMaxWidth, newHeight)
  mainWindow.setSize(currentWidth, newHeight, true)
}

// App Listeners --------------------------------------------------
app.on('ready', () => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))
  createWindow()
})

app.on('window-all-closed', () => app.quit())

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// Render Listeners -----------------------------------------------
ipcMain.on('updateSettings', (e, settings) => {
  store.set(settings)
});

ipcMain.on('toggleExpanded', (e, state) => {
  setWindowExpandedState(state)
})

// Auto Updater
// Uncomment the following code below and install `electron-updater` to
// support auto updating. Code Signing with a valid certificate is required.
// https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating

// import { autoUpdater } from 'electron-updater'

// autoUpdater.on('update-downloaded', () => {
//   autoUpdater.quitAndInstall()
// })

// app.on('ready', () => {
//   if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
// })

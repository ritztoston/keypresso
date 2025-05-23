const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const robot = require('robotjs');
const fs = require('fs');

const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

function readSettings() {
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
        return {};
    }
}

function writeSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

const WINDOW_WIDTH = 300;
const WINDOW_HEIGHT = 291;
let shiftInterval = null;
let tray = null;
let isRunning = false;

function updateTrayMenu() {
    if (!tray) return;
    const contextMenu = Menu.buildFromTemplate([
        {
            label: isRunning ? 'Stop' : 'Start',
            click: () => {
                if (isRunning) {
                    if (shiftInterval) {
                        clearInterval(shiftInterval);
                        shiftInterval = null;
                    }
                    isRunning = false;
                } else {
                    if (!shiftInterval) {
                        shiftInterval = setInterval(() => {
                            robot.keyTap('shift');
                        }, 5 * 60 * 1000);
                    }
                    isRunning = true;
                }
                updateTrayMenu();
                // Notify renderer to update UI
                const win = BrowserWindow.getAllWindows()[0];
                if (win) {
                    win.webContents.send('shift-state-updated', isRunning);
                }
            },
        },
        {
            label: 'Close',
            click: () => {
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
}

function createTray(win) {
    if (tray) return;
    const isDev = process.env.NODE_ENV === 'development';
    const trayIconPath = isDev
        ? path.join(__dirname, 'public', 'logo.png')
        : path.join(process.resourcesPath, 'public', 'logo.png');
    tray = new Tray(trayIconPath);
    tray.setToolTip('Keypresso');
    updateTrayMenu();
    tray.on('double-click', () => {
        win.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
        win.show();
    });
}

function createWindow() {
    const settings = readSettings();
    const wasOpenedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin;
    const win = new BrowserWindow({
        title: 'Keypresso',
        icon: path.join(__dirname, 'public', 'logo.ico'),
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        frame: false,
        transparent: true,
        hasShadow: false,
        resizable: false,
        center: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    if (settings.startMinimized && wasOpenedAtLogin) {
        win.hide();
    }

    // win.webContents.on('did-finish-load', async () => {
    //     async function tryResize() {
    //         const found = await win.webContents.executeJavaScript(`
    //         (function() {
    //           const el = document.querySelector('.bg-zinc-900');
    //           if (!el) return null;
    //           const rect = el.getBoundingClientRect();
    //           return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
    //         })();
    //       `);
    //         if (found) {
    //             win.setContentSize(found.width, found.height);
    //         } else {
    //             setTimeout(tryResize, 100);
    //         }
    //     }
    //     tryResize();
    // });

    win.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            win.hide();
        }
        return false;
    });

    win.on('minimize', (event) => {
        event.preventDefault();
        win.hide();
    });

    win.on('show', () => {
        win.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
    });

    createTray(win);
}

// Add listeners for tray-triggered start/stop
ipcMain.on('start-shift-from-tray', (event) => {
    if (!shiftInterval) {
        shiftInterval = setInterval(() => {
            robot.keyTap('shift');
        }, 5 * 60 * 1000);
        isRunning = true;
        updateTrayMenu();
        // Notify renderer to update UI
        event.sender.send('shift-state-updated', true);
    }
});
ipcMain.on('stop-shift-from-tray', (event) => {
    if (shiftInterval) {
        clearInterval(shiftInterval);
        shiftInterval = null;
        isRunning = false;
        updateTrayMenu();
        // Notify renderer to update UI
        event.sender.send('shift-state-updated', false);
    }
});

ipcMain.handle('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.hide();
});

ipcMain.handle('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.handle('get-start-on-boot', () => {
    return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-start-on-boot', (event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    const settings = readSettings();
    if (!enabled) {
        settings.startMinimized = false;
        writeSettings(settings);
    }
});

ipcMain.handle('quit-app', (event) => {
    app.isQuiting = true;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.handle('get-start-minimized', () => {
    const settings = readSettings();
    return !!settings.startMinimized;
});

ipcMain.handle('set-start-minimized', (event, enabled) => {
    const settings = readSettings();
    settings.startMinimized = enabled;
    writeSettings(settings);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

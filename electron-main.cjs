const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const robot = require('robotjs');

let shiftInterval = null;
let tray = null;

function createTray(win) {
    if (tray) return;
    tray = new Tray(path.join(__dirname, 'public', 'logo.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Close',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('Keypresso');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
        win.show();
    });
}

function createWindow() {
    const win = new BrowserWindow({
        title: 'Keypresso',
        icon: path.join(__dirname, 'public', 'logo.ico'),
        width: 300,
        height: 320,
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

    win.webContents.on('did-finish-load', async () => {
        const { width, height } = await win.webContents.executeJavaScript(`
          (function() {
            const el = document.querySelector('.bg-zinc-900');
            const rect = el.getBoundingClientRect();
            return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
          })();
        `);
        win.setContentSize(width, height);
    });

    win.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            win.hide();
        }
        return false;
    });

    createTray(win);
}

ipcMain.handle('start-shift', () => {
    if (!shiftInterval) {
        shiftInterval = setInterval(() => {
            robot.keyTap('k');
        // }, 5 * 60 * 1000);
        }, 2000);
    }
});

ipcMain.handle('stop-shift', () => {
    if (shiftInterval) {
        clearInterval(shiftInterval);
        shiftInterval = null;
    }
});

ipcMain.handle('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
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

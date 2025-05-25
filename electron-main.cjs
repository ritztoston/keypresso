const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const robot = require('robotjs');
const fs = require('fs');
const { exec } = require('child_process');

const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');
const logPath = path.join(userDataPath, 'app.log');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    fs.appendFileSync(logPath, logMessage);
}

function readSettings() {
    try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        // logToFile(`Loaded settings: ${JSON.stringify(settings)}`);
        return settings;
    } catch (error) {
        // logToFile(`Error reading settings: ${error.message}`);
        return {};
    }
}

function writeSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

const PRESSO_INTERVAL = 5 * 60 * 1000;
const PRESSO_KEY = 'shift';
const WINDOW_WIDTH = 300;
const WINDOW_HEIGHT = 291;
let shiftInterval = null;
let tray = null;
let isShiftActive = false;
let mainWindow = null;

function updateTrayMenu() {
    if (!tray || !mainWindow) return;
    const contextMenu = Menu.buildFromTemplate([
        {
            label: isShiftActive ? 'Stop' : 'Start',
            click: () => {
                if (isShiftActive) {
                    mainWindow.webContents.send('shift-status-update', false);
                    stopShift();
                } else {
                    mainWindow.webContents.send('shift-status-update', true);
                    startShift();
                }
            },
        },
        {
            label: 'Keypresso',
            click: () => {
                mainWindow.show();
            },
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Keypresso');
}

function createTray(win) {
    if (tray) return;
    const isDev = process.env.NODE_ENV === 'development';
    const trayIconPath = isDev
        ? path.join(__dirname, 'public', 'logo.png')
        : path.join(process.resourcesPath, 'public', 'logo.png');
    tray = new Tray(trayIconPath);
    updateTrayMenu();
    tray.on('click', () => {
        win.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
        win.show();
    });
}

function createWindow() {
    const settings = readSettings();
    const isStartupLaunch = process.argv.includes('--hidden');
    // logToFile(`App started with --hidden flag: ${isStartupLaunch}`);
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
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow = win;

    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    // Wait for the window to be ready before showing
    win.once('ready-to-show', () => {
        // logToFile(`Window ready-to-show: startMinimized=${settings.startMinimized}, isStartupLaunch=${isStartupLaunch}`);
        if (!(settings.startMinimized && isStartupLaunch)) {
            win.show();
        }
    });

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

function startShift() {
    if (!shiftInterval) {
        isShiftActive = true;
        shiftInterval = setInterval(() => {
            robot.keyTap(PRESSO_KEY);
        }, PRESSO_INTERVAL);
        updateTrayMenu();
    }
}

function stopShift() {
    if (shiftInterval) {
        clearInterval(shiftInterval);
        shiftInterval = null;
        isShiftActive = false;
        updateTrayMenu();
    }
}

function removeFromStartup() {
    const appName = 'Keypresso';
    const command = `reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /f`;
    exec(command, (error) => {
        if (error) {
            logToFile(`Error removing from startup: ${error.message}`);
        } else {
            logToFile('Successfully removed from startup');
        }
    });
}

function addToStartup() {
    const appName = 'Keypresso';
    const appPath = process.execPath;
    const command = `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /t REG_SZ /d "${appPath} --hidden" /f`;
    exec(command, (error) => {
        if (error) {
            logToFile(`Error adding to startup: ${error.message}`);
        } else {
            logToFile('Successfully added to startup');
        }
    });
}

ipcMain.handle('start-shift', () => {
    startShift();
});

ipcMain.handle('stop-shift', () => {
    stopShift();
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
    const settings = readSettings();
    const loginSettings = app.getLoginItemSettings();
    logToFile(`Getting start on boot - Settings: ${JSON.stringify(settings)}, Login settings: ${JSON.stringify(loginSettings)}`);
    return settings.startOnBoot || false;
});

ipcMain.handle('set-start-on-boot', (event, enabled) => {
    logToFile(`Setting start on boot to: ${enabled}`);

    if (enabled) {
        addToStartup();
    } else {
        removeFromStartup();
    }

    const settings = readSettings();
    settings.startOnBoot = enabled;
    if (!enabled) {
        settings.startMinimized = false;
    }
    writeSettings(settings);
    logToFile(`Settings saved: ${JSON.stringify(settings)}`);
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
    // logToFile(`Saving startMinimized setting: ${enabled}`);
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

app.commandLine.appendSwitch('wm-window-animations-disabled');

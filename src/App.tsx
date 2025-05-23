import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Minus, X } from 'lucide-react';

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

function App() {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [startOnBoot, setStartOnBoot] = useState(false);
    const [startMinimized, setStartMinimized] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    useEffect(() => {
        if (isRunning) {
            setElapsed(0);
            intervalRef.current = setInterval(() => {
                setElapsed((prev) => prev + 1);
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning]);

    useEffect(() => {
        window.electronAPI.getStartOnBoot().then(setStartOnBoot);
        window.electronAPI.getStartMinimized().then(setStartMinimized);
    }, []);

    const toggleShiftPress = () => {
        if (isRunning) {
            window.electronAPI.stopShift();
            setIsRunning(false);
            setElapsed(0);
        } else {
            window.electronAPI.startShift();
            setIsRunning(true);
        }
    };

    const handleMinimize = () => {
        window.electronAPI.minimizeWindow();
    };

    const handleClose = () => {
        setShowConfirmClose(true);
    };

    const confirmClose = () => {
        setShowConfirmClose(false);
        window.electronAPI.quitApp();
    };

    const cancelClose = () => {
        setShowConfirmClose(false);
    };

    const handleToggleStartOnBoot = async () => {
        const newValue = !startOnBoot;
        await window.electronAPI.setStartOnBoot(newValue);
        setStartOnBoot(newValue);
        if (!newValue) {
            await window.electronAPI.setStartMinimized(false);
            setStartMinimized(false);
        }
    };

    const handleToggleStartMinimized = async () => {
        const newValue = !startMinimized;
        await window.electronAPI.setStartMinimized(newValue);
        setStartMinimized(newValue);
    };

    // Helper to format seconds as hh:mm:ss
    function formatElapsed(seconds: number) {
        const h = Math.floor(seconds / 3600)
            .toString()
            .padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60)
            .toString()
            .padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    return (
        <div className='bg-zinc-900 flex flex-col text-zinc-400 min-w-[300px] border border-black'>
            <div
                className='w-full flex items-center border-b border-black'
                style={{ WebkitAppRegion: 'drag' } as CSSProperties}
            >
                <div className='flex-1 ml-2 text-sm flex gap-2 items-center'>
                    <img src='logo.ico' className='size-6' />
                    <span>Keypresso</span>
                </div>
                <button
                    onClick={handleMinimize}
                    className='hover:bg-gray-700 p-1'
                    style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
                >
                    <Minus className='size-6' />
                </button>
                <button
                    onClick={handleClose}
                    className='hover:bg-red-600 p-1'
                    style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
                >
                    <X className='size-6' />
                </button>
            </div>
            <div className='flex flex-col items-center gap-2 bg-zinc-800 p-2'>
                <div className='w-full flex flex-col gap-2 '>
                    <h5 className='font-semibold uppercase'>Settings</h5>
                    <button
                        onClick={handleToggleStartOnBoot}
                        className={`flex items-center border rounded-md border-black p-2 w-full gap-2 ${
                            startOnBoot
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-900'
                        }`}
                    >
                        <span className='text-sm'>Start On Boot</span>
                    </button>
                    <button
                        disabled={!startOnBoot}
                        onClick={handleToggleStartMinimized}
                        className={`flex items-center border rounded-md border-black p-2 w-full gap-2 ${
                            !startOnBoot
                                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                : startMinimized
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-900 text-white'
                        }`}
                    >
                        <span className='text-sm'>Start Minimized</span>
                    </button>
                </div>
                <div className='w-full flex flex-col gap-2 '>
                    <h5 className='font-semibold uppercase'>Status</h5>
                    <div
                        className={`flex items-center border rounded-md border-black bg-zinc-900 p-2 w-full justify-center`}
                    >
                        <span className='text-sm'>
                            {formatElapsed(elapsed)}
                        </span>
                    </div>
                    <button
                        onClick={toggleShiftPress}
                        className={`flex items-center border rounded-md border-black p-2 w-full justify-center ${
                            isRunning ? 'bg-red-600' : 'bg-zinc-900'
                        }`}
                    >
                        <span className='text-sm'>
                            {isRunning ? 'Stop' : 'Start'}
                        </span>
                    </button>
                </div>
            </div>
            {showConfirmClose && (
                <div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50'>
                    <div className='bg-zinc-900 p-4 shadow-lg flex flex-col items-center gap-4 border border-black'>
                        <span className='text-sm text-zinc-200'>
                            Are you sure you want to quit?
                        </span>
                        <div className='flex gap-2 mt-2 w-full text-sm'>
                            <button
                                onClick={confirmClose}
                                className='bg-red-600 p-2 rounded hover:bg-red-600/80 border border-black w-full'
                            >
                                Quit
                            </button>
                            <button
                                onClick={cancelClose}
                                className='bg-zinc-600 p-2 rounded hover:bg-zinc-600/80 border border-black w-full'
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;

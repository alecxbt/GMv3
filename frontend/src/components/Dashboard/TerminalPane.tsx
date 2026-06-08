import React, { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Import xterm.css

interface TerminalPaneProps {
  id: string; // Unique identifier for the pane
  name: string;
  symbol?: string; // Optional symbol associated with this terminal
}

// In dev: empty = same origin, uses Vite proxy (/socket.io → 5001)
// In prod: set VITE_WS_URL to backend URL (e.g. https://api.example.com)
const WS_URL = import.meta.env.VITE_WS_URL || '';

export const TerminalPane: React.FC<TerminalPaneProps> = ({ id, name, symbol }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const socketRef = useRef<any>(null); // Ref for socket.io client instance

  useEffect(() => {
    // Initialize Terminal
    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1f2937', // dark gray
        foreground: '#d1d5db', // light gray
        cursor: '#ffffff',
        cursorAccent: '#ffffff',
      },
      fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
      fontSize: 14,
      letterSpacing: 0.5,
    });

    // Initialize FitAddon
    fitAddonRef.current = new FitAddon();
    terminal.loadAddon(fitAddonRef.current);

    if (terminalRef.current) {
      terminal.open(terminalRef.current);
      fitAddonRef.current.fit(); // Fit terminal to its container size
    }
    terminalInstanceRef.current = terminal;

    // Connect to WebSocket server
    const socket = io(WS_URL, {
      transports: ['websocket'], // Specify transport if needed
      // Add auth token if available for secure connection
      // auth: {
      //   token: localStorage.getItem('accessToken') // Example auth token
      // }
    });
    socketRef.current = socket;

    // Handle incoming data from WebSocket
    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      // When connected, we might want to send a message to the backend to identify the terminal pane or user context
      socket.emit('register_pane', { paneId: id, name, symbol });
    });

    socket.on('terminal_output', (data: string) => {
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.write(data);
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.write('\r\n\x1b[31mWebSocket connection error. Please check logs or try again.\x1b[0m\r\n');
      }
    });

    // Handle user input from the terminal (e.g., typing commands)
    terminal.onData((data) => {
      socket.emit('terminal_input', { paneId: id, data });
    });

    // Cleanup on component unmount
    return () => {
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id, name, symbol]); // Re-run if ID, name, or symbol changes (though typically they are static per pane)

  // Handle window resize events to fit terminal
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalInstanceRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial fit in case the container is already sized
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="bg-gray-800 p-4 h-full flex flex-col rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-green-500">{name}</h3>
        {symbol && <p className="text-sm text-gray-400">{symbol}</p>}
      </div>
      <div ref={terminalRef} className="flex-grow overflow-hidden"></div> {/* Terminal will be mounted here */} 
    </div>
  );
};

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { useTerminalStore } from '../../store/useTerminalStore';
import { parseCommand, getCommandSuggestions } from '../../utils/commandParser';
import { executeCommand } from '../../utils/commandExecutor';
import './CLI.css';

export function CLI() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { addToHistory, navigateHistory, resetHistoryIndex, addPane, setCliVisible, cliVisible } = useTerminalStore();

  // Focus terminal when CLI becomes visible
  useEffect(() => {
    if (cliVisible && terminal.current) {
      // Small delay to ensure terminal is rendered
      setTimeout(() => {
        terminal.current?.focus();
      }, 50);
    }
  }, [cliVisible]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Monaco, Menlo, Consolas, monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#f0f0f0',
        cursor: '#4a9eff',
        selection: 'rgba(74, 158, 255, 0.2)',
        black: '#1a1a1a',
        red: '#ff4444',
        green: '#00ff88',
        yellow: '#ffaa00',
        blue: '#4a9eff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#f0f0f0',
        brightBlack: '#888888',
        brightRed: '#ff6666',
        brightGreen: '#44ffaa',
        brightYellow: '#ffcc44',
        brightBlue: '#6bb3ff',
        brightMagenta: '#ff44ff',
        brightCyan: '#44ffff',
        brightWhite: '#ffffff',
      },
      rows: 10,
      allowTransparency: true,
    });

    const fit = new FitAddon();
    const search = new SearchAddon();
    const webLinks = new WebLinksAddon();

    term.loadAddon(fit);
    term.loadAddon(search);
    term.loadAddon(webLinks);

    term.open(terminalRef.current);
    fit.fit();

    terminal.current = term;
    fitAddon.current = fit;

    // Initial prompt
    term.writeln('GM Terminal v0.1.0');
    term.writeln('Type H for help • Press ` to toggle CLI\r');
    writePrompt(term);

    // Handle resize
    const handleResize = () => {
      fit.fit();
    };
    window.addEventListener('resize', handleResize);

    // Handle input
    let currentLine = '';
    term.onData((data) => {
      // Prevent backtick from being typed (it's used to toggle CLI)
      if (data === '`' || data === 'Backquote') {
        return;
      }
      
      if (data === '\r') {
        // Enter pressed
        term.writeln('');
        if (currentLine.trim()) {
          handleCommand(currentLine.trim());
          addToHistory(currentLine.trim());
          // Hide CLI after successful command
          setCliVisible(false);
        } else {
          // Empty command - just show new prompt
          writePrompt(term);
        }
        currentLine = '';
        setInput('');
        setShowSuggestions(false);
        resetHistoryIndex();
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
          setInput(currentLine);
          updateSuggestions(currentLine);
        }
      } else if (data === '\x1b[A') {
        // Up arrow - history
        const hist = navigateHistory('up');
        if (hist !== null) {
          // Clear current line and write history
          term.write('\r\x1b[K');
          currentLine = hist;
          term.write(currentLine);
          setInput(currentLine);
        }
      } else if (data === '\x1b[B') {
        // Down arrow - history
        const hist = navigateHistory('down');
        if (hist !== null) {
          term.write('\r\x1b[K');
          currentLine = hist;
          term.write(currentLine);
          setInput(currentLine);
        } else {
          term.write('\r\x1b[K');
          currentLine = '';
          setInput('');
        }
      } else if (data.charCodeAt(0) === 9) {
        // Tab - autocomplete (basic)
        if (suggestions.length > 0) {
          const suggestion = suggestions[0];
          const remaining = suggestion.slice(currentLine.length);
          currentLine = suggestion;
          term.write(remaining);
          setInput(currentLine);
        }
      } else if (data >= ' ') {
        // Printable character
        currentLine += data;
        term.write(data);
        setInput(currentLine);
        updateSuggestions(currentLine);
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  const writePrompt = (term: Terminal) => {
    term.write('\r\x1b[K> ');
  };

  const updateSuggestions = useCallback((text: string) => {
    if (text.length > 0) {
      const suggs = getCommandSuggestions(text);
      setSuggestions(suggs);
      setShowSuggestions(suggs.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleCommand = async (command: string) => {
    try {
      const parsed = parseCommand(command);
      const pane = await executeCommand(parsed);
      if (pane) {
        addPane(pane);
      }
      // CLI will be hidden by the onData handler after command execution
    } catch (error) {
      if (terminal.current) {
        terminal.current.writeln(`\x1b[31mERR: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
      }
    }
  };

  return (
    <div className="cli-container">
      <div ref={terminalRef} className="cli-terminal" />
      {showSuggestions && suggestions.length > 0 && (
        <div className="cli-suggestions">
          {suggestions.map((sugg, i) => (
            <div key={i} className="cli-suggestion-item">
              {sugg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import CodeMirror from "@uiw/react-codemirror";

// Themes
import { andromeda } from "@uiw/codemirror-theme-andromeda";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { materialDark, materialLight } from "@uiw/codemirror-theme-material";
import { duotoneDark, duotoneLight } from "@uiw/codemirror-theme-duotone";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { xcodeDark, xcodeLight } from "@uiw/codemirror-theme-xcode";
import { bbedit } from "@uiw/codemirror-theme-bbedit";
import { abcdef } from "@uiw/codemirror-theme-abcdef";
import { sublime } from "@uiw/codemirror-theme-sublime";
import { nord } from "@uiw/codemirror-theme-nord";
import { consoleDark, consoleLight } from "@uiw/codemirror-theme-console";
import { whiteDark, whiteLight } from "@uiw/codemirror-theme-white";

// Language extensions
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";
import { php } from "@codemirror/lang-php";
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { rust } from '@codemirror/legacy-modes/mode/rust';
import { perl } from '@codemirror/legacy-modes/mode/perl';
import { go } from '@codemirror/legacy-modes/mode/go';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { kotlin } from '@codemirror/legacy-modes/mode/clike';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { r } from '@codemirror/legacy-modes/mode/r';
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";

import { FolderClosed, Play, MessageSquare, User, Sparkles, Code2Icon, LogOut, Info, Terminal, TerminalSquare} from "lucide-react";
import { EVENTS } from "../constants/events";
import Chat from "../components/Chat";
import RunCode from "../components/RunCode";
import UserList from "../components/UserList";
import createRemoteCursorPlugin from "../components/Cursor.js"
import FilePanel from "../components/FilePanel.jsx";
import Assistant from "../components/Assistant.jsx";
import Execute from "../components/Execute.jsx";

const languageMap = {
  javascript,
  python,
  java,
  cpp,
  shell: () => StreamLanguage.define(shell),
  rust: () => StreamLanguage.define(rust),
  perl: () => StreamLanguage.define(perl),
  go: () => StreamLanguage.define(go),
  swift: () => StreamLanguage.define(swift),
  kotlin: () => StreamLanguage.define(kotlin),
  ruby: () => StreamLanguage.define(ruby),
  lua: () => StreamLanguage.define(lua),
  r: () => StreamLanguage.define(r),
  php,
  sql,
  html,
  css,
  markdown,
};

const themes = {
  vscodeDark,
  andromeda,
  githubDark,
  githubLight,
  materialDark,
  materialLight,
  duotoneDark,
  duotoneLight,
  dracula,
  xcodeDark,
  xcodeLight,
  bbedit,
  abcdef,
  sublime,
  nord,
  consoleDark,
  consoleLight,
  whiteDark,
  whiteLight,
};

const langExtensionMap = {
  javascript: ["js", "jsx", "ts", "tsx"],
  python: ["py"],
  java: ["java"],
  cpp: ["cpp", "c", "cc", "cxx", "h", "hpp"],
  shell: ["sh", "bash"],
  rust: ["rs"],
  perl: ["pl", "pm"],
  go: ["go"],
  swift: ["swift"],
  kotlin: ["kt", "kts"],
  ruby: ["rb"],
  lua: ["lua"],
  r: ["r"],
  php: ["php"],
  sql: ["sql"],
  html: ["html", "htm"],
  css: ["css"],
  markdown: ["md", "markdown"],
  json: ["json"]
};

const languageOptions = Object.keys(languageMap);


const Editor = ({roomId, username}) => {
  const { socket, isConnected } = useSocket(); 
  const editorRef = useRef(null);
  const timeoutRef = useRef(null); 
  const navigate = useNavigate();

  const [files, setFiles] = useState([{name: "index", content: "", language: "javascript", extension: "js"}]);
  const [activeFile, setActiveFile] = useState({name: "index", content: "", language: "javascript", extension: "js"});
  const [activeTab, setActiveTab] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(vscodeDark);
  const [userCursors, setUserCursors] = useState(new Map());

  useEffect(() => {
    if (!socket || !roomId || !username) return;

    socket.emit(EVENTS.ROOM.JOIN, { roomId, username });

    return () => {
      socket.emit(EVENTS.ROOM.LEAVE, { roomId, username });
    };
  }, [socket?.id, roomId, username]);

  const handleCodeChange = (newCode) => {
    const updatedFile = { ...activeFile, content: newCode };
    
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.name === activeFile.name && file.extension === activeFile.extension
        ? updatedFile
        : file
      )
    );
    setActiveFile(updatedFile);
    const view = editorRef.current?.view;
    if (!view) return;
  
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const col = pos - line.from;
  
    const cursorPos = { line: line.number - 1, col };
  
    if (socket && roomId) {
      socket.emit(EVENTS.CODE.CHANGE, { roomId: roomId, file: updatedFile });
      socket.emit(EVENTS.CODE.CURSOR_MOVE, {
        roomId: roomId,
        username: username,
        filename: updatedFile.name,
        extension: updatedFile.extension,
        cursor: cursorPos,
      });
    }
  };

  const handleLanguageChange = (language) => {
    const updatedFile = {
      ...activeFile,
      language,
      extension: langExtensionMap[language][0],
    };
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.name === activeFile.name && file.extension === activeFile.extension
        ? updatedFile
        : file
      )
    );
    setActiveFile(updatedFile);
    if (socket && roomId) {
      socket.emit(EVENTS.CODE.LANG_CHANGE, { roomId, file: updatedFile });
    }
  };

  const handleLeaveRoom = () => {
    if (socket?.emit && roomId && username) {
      socket.emit(EVENTS.ROOM.LEAVE, { roomId: roomId, username: username });
      localStorage.clear('localStorageCleared');
      socket.disconnect();
      navigate('/');
    }
  }

  const getCursors = () => {
    return userCursors;
  }
  
  const clearCursorTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); 
    }
  };
  const remoteCursorExtension = useMemo(() => createRemoteCursorPlugin(getCursors), [userCursors]);

  useEffect(() => {
    if (!socket) return;
  
  
    socket.on(EVENTS.CODE.UPDATE, ({ file }) => {
      if(file.name === activeFile.name && file.extension === activeFile.extension)
        setActiveFile(file);
      setFiles(prevFiles =>
        prevFiles.map(prev =>
          (file.name === prev.name) && (file.extension === prev.extension)
          ? file 
          : prev
        )
      );
      clearCursorTimeout();
    });
  
    socket.on(EVENTS.FILE.SYNC, ({ newFiles }) => {
      setFiles(newFiles);
      setActiveFile(newFiles[0]);
    });

    socket.on(EVENTS.CODE.LANG_UPDATE, ({ file }) => {
      setFiles(prevFiles =>
        prevFiles.map(prev =>
          (prev.name === activeFile.name && prev.extension === activeFile.extension)
            ? file 
            : prev
        )
      );
      setActiveFile(file);
    });

    socket.on(EVENTS.FILE.SYNC_NEW_FILE, ({ file }) => {
      setFiles((prev) => [...prev, file]);
    });  

    return () => {
      socket.off(EVENTS.CODE.UPDATE);
      socket.off(EVENTS.CODE.LANG_UPDATE);
      socket.off(EVENTS.FILE.SYNC);
      socket.off(EVENTS.FILE.SYNC_NEW_FILE);
      clearCursorTimeout(); 
    };
  }, [socket, activeFile, files]);

  useEffect(() => {
    socket.on(EVENTS.FILE.SYNC_REQUEST, ({ toSocketId }) => {
      socket.emit(EVENTS.FILE.SYNC_RESPONSE, { toSocketId, newFiles: files });
    });

    return () => {
      socket.off(EVENTS.FILE.SYNC_REQUEST);
    }
  }, [socket, activeFile, files]);

  useEffect(() => {
    socket.on(EVENTS.CODE.CURSOR_UPDATE, ({ username, filename, extension, cursor }) => {
      if(filename === activeFile.name && extension === activeFile.extension) {
        setUserCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(username, cursor);
    
          clearCursorTimeout();
          
          timeoutRef.current = setTimeout(() => {
            setUserCursors((prev) => {
              const newMap = new Map(prev);
              newMap.delete(username);
              return newMap;
            });
          }, 800); // Reset timeout
    
          return newMap;
        });
      }
    });
    return () => {
      socket.off(EVENTS.CODE.CURSOR_UPDATE);
    } 
  }, [socket, activeFile]);

  useEffect(() => {
    socket.on(EVENTS.FILE.FILE_DELETED, ({file}) => {
      setFiles(prev => {
      const updated = prev.filter(f => !(f.name === file.name && f.extension === file.extension));
        if (activeFile && activeFile.name === file.name && activeFile.extension === file.extension) {
          setActiveFile(updated[0] || null);
        }
        return updated;
      });
    });

    socket.on(EVENTS.FILE.FILE_RENAMED, ({oldFile, newFile}) => {
      setFiles(prev =>
        prev.map(file =>
          file.name === oldFile.name && file.extension === oldFile.extension
            ? { ...file, name: newFile.name, extension: newFile.extension }
            : file
        )
      );

      if (
        activeFile &&
        activeFile.name === oldFile.name &&
        activeFile.extension === oldFile.extension
      ) {
        setActiveFile(newFile);
      }
    });
    return () => {
      socket.off(EVENTS.FILE.FILE_DELETED);
      socket.off(EVENTS.FILE.FILE_RENAMED);
    }
  }, [socket, activeFile, files]);
  

  const wrapperRef = useRef(null); 
  const [bgColor, setBgColor] = useState("rgb(30,30,30)");

  useEffect(() => {
    if (wrapperRef.current) {
      const cm = wrapperRef.current.querySelector(".cm-editor");
      if (cm) {
        const styles = getComputedStyle(cm);
        setBgColor(styles.backgroundColor);
      }
    }
  }, [selectedTheme]);

  const currentExtension = useMemo(() => {
    const lang = languageMap[activeFile.language];
    return typeof lang === "function" ? lang() : lang;
  }, [activeFile.language]);
  

  return (
    <div className="flex h-screen min-h-screen bg-gray-900 overflow-hidden"> 
      {/* Sidebar */}
      <div className="flex h-full py-1 pl-1">
        <div className="w-16 h-full bg-gray-800 flex flex-col items-center py-4 space-y-6 rounded-lg">
          <button onClick={() => setActiveTab(activeTab === "files" ? null : "files")}>
            <FolderClosed className={`hover:text-blue-500 ${activeTab=="files"? "text-blue-500": "text-gray-300"}`} size={24} />
          </button>
          <button onClick={() => setActiveTab(activeTab === "run" ? null : "run")}>
            <Play className={`hover:text-blue-500 ${activeTab=="run"? "text-blue-500": "text-gray-300"}`} size={24} />
          </button>
          <button onClick={() => setActiveTab(activeTab === "execute" ? null : "execute")}>
            <Terminal className={`hover:text-blue-500 ${activeTab=="execute"? "text-blue-500": "text-gray-300"}`} size={24} />
          </button>
          <button onClick={() => setActiveTab(activeTab === "chat" ? null : "chat")}>
            <MessageSquare className={`hover:text-blue-500 ${activeTab=="chat"? "text-blue-500": "text-gray-300"}`} size={24} />
          </button>
          <button onClick={() => setActiveTab(activeTab === "ai" ? null : "ai")}>
            <Sparkles className={`hover:text-blue-500 ${activeTab=="ai"? "text-blue-500": "text-gray-300"}`} size={24} />
          </button>
          <button onClick={() => setActiveTab(activeTab === "users" ? null : "users")}>
            <User className={`hover:text-blue-500 ${activeTab=="users"? "text-blue-500": "text-gray-300"}`} size={24} />
          </button>
          <div className="relative inline-block group">
            <button className="focus:outline-none z-10 relative">
              <Info
                className="text-gray-300 hover:text-blue-500"
                size={24}
              />
            </button>

            <div className="absolute left-[80%] top-1/2 -translate-y-1/2 hidden group-hover:flex group-hover: flex-col group-hover:opacity-100 bg-black text-white text-xs px-3 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-auto">
              <span>Room ID: <span className="text-green-400 font-semibold ml-1">{roomId}</span></span>
              <span>Username: <span className="text-green-400 font-semibold ml-1">{username}</span></span>
            </div>
          </div>
          <button onClick={handleLeaveRoom}>
            <LogOut className="text-gray-300 hover:text-red-500 transform -scale-x-100" size={24} />
          </button>
        </div>

        {/* Sidebar Content */}
        {activeTab && (
          <div className="w-80 bg-gray-900 h-full pl-1 text-gray-300 overflow-auto">
            {activeTab === "files" && <FilePanel roomId={roomId} username={username} files={files} setFiles={setFiles} activeFile={activeFile} setActiveFile={setActiveFile} />}
            {activeTab === "run" && <RunCode code={activeFile.content} language={activeFile.language} />}
            {activeTab === "execute" && <Execute files={files} activeFile={activeFile}/>}
            {activeTab === "chat" && <Chat roomId={roomId} username={username} />}
            {activeTab === "ai" && <Assistant handleCodeChange={handleCodeChange} language={activeFile.language} currentExtension={currentExtension} selectedTheme={selectedTheme} themes={themes}/>}
            {activeTab === "users" && <UserList roomId={roomId}/>}
          </div>
        )}
      </div>

      {/* Code Editor */}
      <div className="flex-1 h-full flex flex-col bg-gray-900 p-1">
        <div className="flex justify-between items-center bg-gray-800 p-3 text-white gap-4 rounded-lg">
          <div className="flex items-center flex-row gap-2 items-center">
            <Code2Icon size={28}/>
            <span className="text-green-500 font-bold text-xl tracking-tight bg-gradient-to-tr text-transparent bg-clip-text from-blue-400 via-blue-600 to-blue-800">CollabCode Editor</span>
          </div>

          <div className="flex gap-3 items-center">
            <div className="bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 text-white border border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-all duration-150">
              Active: <span className="text-green-400 font-bold">{activeFile.name + '.' +  activeFile.extension || "Untitled"}</span>
            </div>
            <select
              className="bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 text-white border border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-all duration-150"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
            >
              {Object.keys(themes).map((theme) => (
                <option key={theme} value={theme} className="bg-gray-800 text-white">
                  {theme}
                </option>
              ))}
            </select>

            <select
              value={activeFile.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 text-white border border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-all duration-150"
            >
              {languageOptions.map((lang) => (
                <option key={lang} value={lang} className="bg-gray-800 text-white">
                  {lang}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div ref={wrapperRef} className={`flex-1 relative overflow-auto rounded-lg`} style={{ backgroundColor: bgColor }}> 
          <div className="absolute inset-0"> 
            {/* Placeholder */}
            {activeFile.content === "" && (
              <div className="absolute top-0.5 left-9 text-gray-500 font-mono pointer-events-none select-none z-10">
                Start typing your code here...
              </div>
            )}
            <CodeMirror
              ref={editorRef}
              value={activeFile.content}
              extensions={[currentExtension, remoteCursorExtension]}
              theme={themes[selectedTheme] || vscodeDark}
              onChange={handleCodeChange}
              className="w-full" 
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
              }}
              style={{
                height: "100%",       
                overflow: "auto",
                fontSize: "16px"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;

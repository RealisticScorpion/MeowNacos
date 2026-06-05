import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

interface ConfigItem {
  data_id: string;
  group: string;
  config_type: string;
  status: "Added" | "Deleted" | "Modified" | "Unchanged";
}

interface CompareResult {
  left_path: string;
  right_path: string;
  items: ConfigItem[];
}

interface DiffLine {
  line_type: "added" | "deleted" | "unchanged";
  left_line_num: number | null;
  right_line_num: number | null;
  content: string;
}

interface SideBySideLine {
  left: DiffLine | null;
  right: DiffLine | null;
}

interface DiffResult {
  left_content: string;
  right_content: string;
  unified_diff: DiffLine[];
  side_by_side_diff: SideBySideLine[];
}

interface CompareHistory {
  id: string;
  leftPath: string;
  rightPath: string;
  timestamp: number;
}

const getFileName = (path: string): string => {
  if (!path) return "";
  return path.replace(/\\/g, '/').split('/').pop() || "";
};

export default function App() {
  // Theme state (light default)
  const [theme, setTheme] = useState<"dark" | "light">("light");
  
  // App states
  const [leftPath, setLeftPath] = useState<string>("");
  const [rightPath, setRightPath] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Comparison results
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<ConfigItem | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Diff options
  const [diffMode, setDiffMode] = useState<"split" | "unified">("split");
  const [normalize, setNormalize] = useState<boolean>(true);
  const [selectedFont, setSelectedFont] = useState<string>("jetbrains");

  // Editor states
  const [viewMode, setViewMode] = useState<"diff" | "edit-left" | "edit-right">("diff");
  const [leftText, setLeftText] = useState<string>("");
  const [rightText, setRightText] = useState<string>("");

  // Sidebar toggle state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Split view resize states
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // History state
  const [compareHistory, setCompareHistory] = useState<CompareHistory[]>([]);

  // Help Modal state
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Listen for Native Menu "show-help" event
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        unlisten = await listen("show-help", () => {
          setShowHelpModal(true);
        });
      } catch (e) {
        console.error("监听 show-help 失败:", e);
      }
    };
    
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load history on startup
  useEffect(() => {
    const saved = localStorage.getItem("compare_history");
    if (saved) {
      try {
        setCompareHistory(JSON.parse(saved));
      } catch (e) {
        console.error("加载对比历史记录失败:", e);
      }
    }
  }, []);

  // Sync editor texts when diffResult loads
  useEffect(() => {
    if (diffResult) {
      setLeftText(diffResult.left_content);
      setRightText(diffResult.right_content);
    } else {
      setLeftText("");
      setRightText("");
    }
  }, [diffResult]);

  // Calculate dirty states
  const isLeftDirty = leftText !== (diffResult?.left_content ?? "");
  const isRightDirty = rightText !== (diffResult?.right_content ?? "");
  const isDirty = isLeftDirty || isRightDirty;

  // Store dirty state in ref to avoid stale closures in window event listener
  const isDirtyRef = useRef<boolean>(false);
  isDirtyRef.current = isDirty;

  // Tauri close window event intercept
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    const setupCloseListener = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        unlisten = await appWindow.onCloseRequested((event) => {
          if (isDirtyRef.current) {
            const confirmClose = window.confirm("🐾 猫咪提示：您有未保存的修改，关闭程序将丢失修改，确定要退出吗？");
            if (!confirmClose) {
              event.preventDefault();
            }
          }
        });
      } catch (e) {
        console.error("设置窗口关闭事件监听失败:", e);
      }
    };
    
    setupCloseListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Split view dragging handler
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let percentage = (x / rect.width) * 100;
      
      if (percentage < 15) percentage = 15;
      if (percentage > 85) percentage = 85;
      
      setSplitRatio(percentage);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Helper check for switching views
  const checkUnsavedChanges = (): boolean => {
    if (isDirtyRef.current) {
      return window.confirm("🐾 猫咪提示：当前配置项有未保存的修改。继续操作将丢弃修改，是否继续？");
    }
    return true;
  };

  // Handle Left Zip Import
  const handleSelectLeft = async () => {
    if (!checkUnsavedChanges()) return;
    try {
      const path = await invoke<string | null>("select_zip_file", { title: "选择对比源 (BASE) Nacos 导出 ZIP 包" });
      if (path) {
        setLeftPath(path);
      }
    } catch (err: any) {
      setErrorMsg(`选择文件失败: ${err.message || err}`);
    }
  };

  // Handle Right Zip Import
  const handleSelectRight = async () => {
    if (!checkUnsavedChanges()) return;
    try {
      const path = await invoke<string | null>("select_zip_file", { title: "选择对比目标 (TARGET) Nacos 导出 ZIP 包" });
      if (path) {
        setRightPath(path);
      }
    } catch (err: any) {
      setErrorMsg(`选择文件失败: ${err.message || err}`);
    }
  };

  // Handle Compare execution
  const handleCompare = async () => {
    if (!checkUnsavedChanges()) return;
    if (!leftPath || !rightPath) {
      setErrorMsg("请先选择左、右两个 Nacos 导出 ZIP 包。");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSelectedItem(null);
    setDiffResult(null);
    setViewMode("diff");
    try {
      const result = await invoke<CompareResult>("compare_zips", { 
        leftPath: leftPath, 
        rightPath: rightPath 
      });
      setCompareResult(result);

      // Save to localStorage history
      const newHistoryItem: CompareHistory = {
        id: `${leftPath}-${rightPath}-${Date.now()}`,
        leftPath,
        rightPath,
        timestamp: Date.now()
      };
      const updatedHistory = [
        newHistoryItem,
        ...compareHistory.filter(h => h.leftPath !== leftPath || h.rightPath !== rightPath)
      ].slice(0, 5);
      setCompareHistory(updatedHistory);
      localStorage.setItem("compare_history", JSON.stringify(updatedHistory));
    } catch (err: any) {
      setErrorMsg(`对比文件失败: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle loading a historical record
  const handleLoadHistory = async (item: CompareHistory) => {
    if (!checkUnsavedChanges()) return;
    setLeftPath(item.leftPath);
    setRightPath(item.rightPath);
    
    setLoading(true);
    setErrorMsg(null);
    setSelectedItem(null);
    setDiffResult(null);
    setViewMode("diff");
    try {
      const result = await invoke<CompareResult>("compare_zips", { 
        leftPath: item.leftPath, 
        rightPath: item.rightPath 
      });
      setCompareResult(result);

      // Update timestamp to place it at the top
      const newHistoryItem: CompareHistory = {
        id: `${item.leftPath}-${item.rightPath}-${Date.now()}`,
        leftPath: item.leftPath,
        rightPath: item.rightPath,
        timestamp: Date.now()
      };
      const updatedHistory = [
        newHistoryItem,
        ...compareHistory.filter(h => h.leftPath !== item.leftPath || h.rightPath !== item.rightPath)
      ].slice(0, 5);
      setCompareHistory(updatedHistory);
      localStorage.setItem("compare_history", JSON.stringify(updatedHistory));
    } catch (err: any) {
      setErrorMsg(`加载历史对比失败: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear all history
  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定要清空所有对比历史记录吗？")) {
      setCompareHistory([]);
      localStorage.removeItem("compare_history");
    }
  };

  // Fetch file diff when selection or parameters change
  useEffect(() => {
    const fetchDiff = async () => {
      if (!leftPath || !rightPath || !selectedItem) return;
      
      setDiffLoading(true);
      setErrorMsg(null);
      try {
        const diff = await invoke<DiffResult>("get_file_diff", {
          leftPath: leftPath,
          rightPath: rightPath,
          group: selectedItem.group,
          dataId: selectedItem.data_id,
          normalize: normalize
        });
        setDiffResult(diff);
      } catch (err: any) {
        setErrorMsg(`读取 Diff 失败: ${err.message || err}`);
      } finally {
        setDiffLoading(false);
      }
    };

    fetchDiff();
  }, [selectedItem, normalize, leftPath, rightPath]);

  // Handle Saving to Zip
  const handleSave = async (side: "left" | "right") => {
    if (!leftPath || !rightPath || !selectedItem || !diffResult) return;
    
    const zipPath = side === "left" ? leftPath : rightPath;
    const content = side === "left" ? leftText : rightText;
    
    setLoading(true);
    setErrorMsg(null);
    try {
      await invoke("save_config_to_zip", {
        zipPath,
        group: selectedItem.group,
        dataId: selectedItem.data_id,
        content
      });
      
      // Reload compare zips to refresh status badges
      const result = await invoke<CompareResult>("compare_zips", { 
        leftPath: leftPath, 
        rightPath: rightPath 
      });
      setCompareResult(result);
      
      // Reload get_file_diff
      const diff = await invoke<DiffResult>("get_file_diff", {
        leftPath: leftPath,
        rightPath: rightPath,
        group: selectedItem.group,
        dataId: selectedItem.data_id,
        normalize: normalize
      });
      setDiffResult(diff);
      setLeftText(diff.left_content);
      setRightText(diff.right_content);
      
      alert("🐾 保存成功！修改已写回压缩包。");
    } catch (err: any) {
      setErrorMsg(`保存修改失败: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter items in sidebar
  const filteredItems = compareResult?.items.filter(item => {
    const matchesSearch = 
      item.data_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.group.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && item.status.toLowerCase() === statusFilter.toLowerCase();
  }) || [];

  // Toggle App Theme
  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <div className="app-container">
      {/* Top Header bar */}
      <header className="app-header">
        <div className="logo-section">
          <button 
            className="theme-toggle-btn" 
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            title={isSidebarCollapsed ? "展开文件列表" : "收起文件列表"}
            style={{ marginRight: "4px" }}
          >
            {isSidebarCollapsed ? "📂" : "📁"}
          </button>
          <img src="/logo.png" alt="logo" className="header-logo-img" />
          <span className="logo-text">MeowNacos</span>
        </div>
        
        {/* File Path selectors */}
        <div className="file-importers">
          <button 
            className={`importer-button ${leftPath ? "selected" : ""}`}
            onClick={handleSelectLeft}
            title={leftPath || "点击选择左包"}
          >
            🐾 Base: {leftPath ? getFileName(leftPath) : "选择源压缩包 (A)"}
          </button>
          
          <span style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: "bold" }}>VS</span>
          
          <button 
            className={`importer-button ${rightPath ? "selected" : ""}`}
            onClick={handleSelectRight}
            title={rightPath || "点击选择右包"}
          >
            🐾 Target: {rightPath ? getFileName(rightPath) : "选择目标压缩包 (B)"}
          </button>
          
          <button 
            className="compare-btn" 
            onClick={handleCompare} 
            disabled={loading || !leftPath || !rightPath}
          >
            {loading ? "比对中..." : "🐾 开始比对"}
          </button>
        </div>

        <div className="header-actions">
          <button className="help-header-btn" onClick={() => setShowHelpModal(true)} title="使用说明 / 帮助">
            使用说明 🐾
          </button>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="切换主题">
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        </div>
      </header>

      {/* Error alert banner */}
      {errorMsg && (
        <div className="notification-banner">
          <span>⚠️ {errorMsg}</span>
          <button className="notification-close" onClick={() => setErrorMsg(null)}>×</button>
        </div>
      )}

      {/* Main Container */}
      <div className="app-content">
        {/* Left Sidebar */}
        <aside className={`app-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          {/* Search bar */}
          <div className="sidebar-search-box">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 搜索配置 Data ID / Group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Tab buttons */}
          <div className="sidebar-tabs">
            {["all", "modified", "added", "deleted", "unchanged"].map(tab => (
              <button
                key={tab}
                className={`sidebar-tab ${statusFilter === tab ? "active" : ""}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab === "all" ? "全部" :
                 tab === "modified" ? "修改" :
                 tab === "added" ? "新增" :
                 tab === "deleted" ? "删除" : "一致"}
              </button>
            ))}
          </div>

          {/* Configuration List */}
          <div className="file-list">
            {filteredItems.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                {compareResult ? "🐾 暂无匹配的配置项" : "请先导入 ZIP 包并点击“开始比对”"}
              </div>
            ) : (
              filteredItems.map(item => {
                const isActive = selectedItem?.group === item.group && selectedItem?.data_id === item.data_id;
                return (
                  <div
                    key={`${item.group}/${item.data_id}`}
                    className={`file-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      if (checkUnsavedChanges()) {
                        setSelectedItem(item);
                        setViewMode("diff");
                      }
                    }}
                  >
                    <div className="file-item-header">
                      <span className="file-name" title={item.data_id}>
                        📄 {item.data_id}
                      </span>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>
                        {item.status === "Modified" ? "已修改" :
                         item.status === "Added" ? "新增" :
                         item.status === "Deleted" ? "已删除" : "无变化"}
                      </span>
                    </div>
                    <span className="file-group" title={item.group}>
                      📂 {item.group}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Screen (Diff viewer / Editor / Guide) */}
        <main className="app-main">
          {diffLoading ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <div className="empty-title">正在加载差异数据...</div>
            </div>
          ) : selectedItem && diffResult ? (
            <>
              {/* Diff Config Bar */}
              <div className="diff-header">
                <div className="diff-info">
                  <div className="diff-title-row">
                    <span className="diff-file-title">📄 {selectedItem.data_id}</span>
                  </div>
                  
                  {/* Mode Tabs (Diff vs Edit Left vs Edit Right) */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    <button
                      className={`control-btn ${viewMode === "diff" ? "active" : ""}`}
                      onClick={() => setViewMode("diff")}
                    >
                      🔍 Diff 对比
                    </button>
                    {selectedItem.status !== "Added" && (
                      <button
                        className={`control-btn ${viewMode === "edit-left" ? "active" : ""}`}
                        onClick={() => setViewMode("edit-left")}
                      >
                        📝 编辑 Base(A) {isLeftDirty ? "●" : ""}
                      </button>
                    )}
                    {selectedItem.status !== "Deleted" && (
                      <button
                        className={`control-btn ${viewMode === "edit-right" ? "active" : ""}`}
                        onClick={() => setViewMode("edit-right")}
                      >
                        📝 编辑 Target(B) {isRightDirty ? "●" : ""}
                      </button>
                    )}
                  </div>
                </div>

                <div className="diff-controls">
                  {/* Semantic Sorting normalize Toggle (Only visible in Diff mode) */}
                  {viewMode === "diff" && (selectedItem.config_type === "yaml" || selectedItem.config_type === "yml" || selectedItem.config_type === "properties" || selectedItem.config_type === "json") && (
                    <div className="control-group">
                      <button
                        className={`control-btn ${normalize ? "active" : ""}`}
                        onClick={() => setNormalize(true)}
                        title="自动对 YAML/Properties 键名进行字典序重排，忽略顺序打乱造成的无效 diff"
                      >
                        ⚙️ 语义排序对比
                      </button>
                      <button
                        className={`control-btn ${!normalize ? "active" : ""}`}
                        onClick={() => setNormalize(false)}
                        title="进行最原始的文件文本差异对比"
                      >
                        📄 原始文本对比
                      </button>
                    </div>
                  )}

                  {/* Diff View style: Split / Unified (Only visible in Diff mode) */}
                  {viewMode === "diff" && (
                    <div className="control-group">
                      <button
                        className={`control-btn ${diffMode === "split" ? "active" : ""}`}
                        onClick={() => setDiffMode("split")}
                      >
                        双栏对比
                      </button>
                      <button
                        className={`control-btn ${diffMode === "unified" ? "active" : ""}`}
                        onClick={() => setDiffMode("unified")}
                      >
                        单栏合并
                      </button>
                    </div>
                  )}

                  {/* Font Selection Dropdown */}
                  <div className="control-group" style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", paddingLeft: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                      🔤 字体:
                    </span>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        padding: "6px 8px",
                        outline: "none"
                      }}
                    >
                      <option value="system" style={{ background: "var(--panel-bg)", color: "var(--text-primary)" }}>系统默认</option>
                      <option value="jetbrains" style={{ background: "var(--panel-bg)", color: "var(--text-primary)" }}>JetBrains Mono</option>
                      <option value="intel" style={{ background: "var(--panel-bg)", color: "var(--text-primary)" }}>Intel One Mono</option>
                      <option value="fira" style={{ background: "var(--panel-bg)", color: "var(--text-primary)" }}>Fira Code</option>
                      <option value="source" style={{ background: "var(--panel-bg)", color: "var(--text-primary)" }}>Source Code Pro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* View Render Area */}
              {viewMode === "diff" ? (
                /* Diff View */
                <div className={`diff-content font-${selectedFont}`}>
                  {diffMode === "split" ? (
                    /* Split Screen View using CSS Grid for perfect height matching */
                    <div 
                      ref={gridRef}
                      className="diff-grid"
                      style={{ gridTemplateColumns: `${splitRatio}% 6px 1fr` }}
                    >
                      {/* Vertical draggable divider */}
                      <div 
                        className={`grid-divider-col ${isDragging ? "active" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        style={{ gridRow: `1 / span ${diffResult.side_by_side_diff.length || 1}` }}
                      />

                      {diffResult.side_by_side_diff.map((row, index) => (
                        <div key={index} style={{ display: "contents" }}>
                          {/* Left cell (Delete / Unchanged / Empty) */}
                          <div 
                            className={`split-cell left ${row.left ? row.left.line_type : "empty"}`}
                            style={{ gridColumn: 1, gridRow: index + 1 }}
                          >
                            <span className="line-num-col">
                              {row.left?.left_line_num || ""}
                            </span>
                            <span className="line-indicator-col">
                              {row.left ? (row.left.line_type === "deleted" ? "-" : " ") : ""}
                            </span>
                            <code className="line-code-col">
                              {row.left?.content || ""}
                            </code>
                          </div>

                          {/* Right cell (Add / Unchanged / Empty) */}
                          <div 
                            className={`split-cell right ${row.right ? row.right.line_type : "empty"}`}
                            style={{ gridColumn: 3, gridRow: index + 1 }}
                          >
                            <span className="line-num-col">
                              {row.right?.right_line_num || ""}
                            </span>
                            <span className="line-indicator-col">
                              {row.right ? (row.right.line_type === "added" ? "+" : " ") : ""}
                            </span>
                            <code className="line-code-col">
                              {row.right?.content || ""}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Unified View */
                    <div className="diff-unified">
                      {diffResult.unified_diff.map((line, index) => (
                        <div key={index} className={`unified-line ${line.line_type}`}>
                          <span className="line-num-col" style={{ borderRight: "1px solid var(--border-color)" }}>
                            {line.left_line_num || ""}
                          </span>
                          <span className="line-num-col">
                            {line.right_line_num || ""}
                          </span>
                          <span className="line-indicator-col">
                            {line.line_type === "deleted" ? "-" : line.line_type === "added" ? "+" : " "}
                          </span>
                          <code className="line-code-col">
                            {line.content}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Editor View */
                <div className={`code-editor-container font-${selectedFont}`}>
                  <textarea
                    className="code-editor"
                    value={viewMode === "edit-left" ? leftText : rightText}
                    onChange={(e) => {
                      if (viewMode === "edit-left") {
                        setLeftText(e.target.value);
                      } else {
                        setRightText(e.target.value);
                      }
                    }}
                    placeholder="输入配置内容..."
                  />
                  <div className="editor-footer">
                    <span style={{ marginRight: "auto", display: "flex", alignItems: "center", color: "var(--text-secondary)", fontSize: "12px" }}>
                      🐾 修改将直接在保存时写回 {viewMode === "edit-left" ? "Base (A)" : "Target (B)"} ZIP 压缩包。
                    </span>
                    <button 
                      className="editor-discard-btn"
                      onClick={() => {
                        if (window.confirm("🐾 确定要丢弃当前所有未保存的修改，并恢复为原内容吗？")) {
                          if (viewMode === "edit-left") {
                            setLeftText(diffResult.left_content);
                          } else {
                            setRightText(diffResult.right_content);
                          }
                        }
                      }}
                      disabled={viewMode === "edit-left" ? !isLeftDirty : !isRightDirty}
                    >
                      丢弃修改
                    </button>
                    <button 
                      className="editor-save-btn"
                      id={viewMode === "edit-left" ? "save-btn-left" : "save-btn-right"}
                      onClick={() => handleSave(viewMode === "edit-left" ? "left" : "right")}
                      disabled={viewMode === "edit-left" ? !isLeftDirty : !isRightDirty}
                    >
                      保存修改
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // No File selected Empty State
            !compareResult ? (
              /* Guide & Tips Dashboard on Startup */
              <div className="guide-container">
                <img 
                  src="/cat_only.png" 
                  alt="MeowNacos Logo" 
                  style={{ 
                    width: "150px", 
                    height: "150px", 
                    marginBottom: "12px", 
                    filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.15))"
                  }} 
                />
                <h1 className="guide-title">(=•́ܫ•̀=) MeowNacos 常用指南</h1>
                <p className="guide-subtitle">
                  您的橘猫比对归档小助手，像小猫咪一样灵敏且温柔。
                </p>
                <button 
                  className="guide-help-btn"
                  onClick={() => setShowHelpModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--button-bg)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    marginBottom: "16px",
                    transition: "background var(--transition-speed)"
                  }}
                >
                  查看详细帮助说明书 🐾
                </button>

                {/* Recent Comparisons History Section */}
                <div className="history-section">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🕒 最近对比历史
                    </h3>
                    {compareHistory.length > 0 && (
                      <button 
                        onClick={handleClearHistory}
                        style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                      >
                        清空历史
                      </button>
                    )}
                  </div>
                  {compareHistory.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", padding: "16px", border: "1px dashed var(--border-color)", borderRadius: "8px", textAlign: "center" }}>
                      🐾 暂无历史记录。导入配置并成功比对后，记录会自动保存在这里。
                    </div>
                  ) : (
                    <div className="history-list">
                      {compareHistory.map(item => (
                        <div key={item.id} className="history-item" onClick={() => handleLoadHistory(item)}>
                          <div className="history-item-paths">
                            <span className="history-path" title={item.leftPath}>👈 {getFileName(item.leftPath)}</span>
                            <span style={{ color: "var(--text-secondary)", fontSize: "11px", fontWeight: "bold" }}>VS</span>
                            <span className="history-path" title={item.rightPath}>👉 {getFileName(item.rightPath)}</span>
                          </div>
                          <span className="history-time">{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="guide-grid">
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">导入对比压缩包</span>
                    <span className="guide-card-desc">
                      点击顶部 <strong>Base</strong> 和 <strong>Target</strong> 导入原环境和目标环境的 Nacos .zip 导出包，然后点击 <strong>开始比对</strong>。
                    </span>
                  </div>
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">折叠文件边栏</span>
                    <span className="guide-card-desc">
                      点击 Logo 左侧的文件夹图标，可随时收起或展开左侧列表，使比对比特大化展示。
                    </span>
                  </div>
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">无级分割线拖拽</span>
                    <span className="guide-card-desc">
                      在双栏对比模式下，按住中间的垂直分割线左右拖动，即可无级调节左右两侧的编辑器占比。
                    </span>
                  </div>
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">消除乱序噪音</span>
                    <span className="guide-card-desc">
                      启用 <strong>语义排序对比</strong> 会对 YAML/Properties 键名自动字典重排后比对，避免导出顺序被打乱导致的无效差异。
                    </span>
                  </div>
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">直接编辑与回写</span>
                    <span className="guide-card-desc">
                      在配置项上方切换至编辑选项卡，可直接修改内容并 <strong>安全写回原 ZIP 压缩包</strong>。写回采用原子临时覆盖机制，保障文件不损坏。
                    </span>
                  </div>
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">编程等宽字体</span>
                    <span className="guide-card-desc">
                      内置 JetBrains Mono、IntelOne Mono、Fira Code 等顶尖编程字体，自动换行行距采用舒适的 1.65 倍。
                    </span>
                  </div>
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">明暗双主题</span>
                    <span className="guide-card-desc">
                      默认启用明亮风格，支持右上角一键切换，全局采用高对比度对比底色与清晰文字排版。
                    </span>
                  </div>
                  <div className="guide-card">
                    <span className="guide-card-icon">🐾</span>
                    <span className="guide-card-title">修改防丢失保护</span>
                    <span className="guide-card-desc">
                      有未保存的编辑内容时，切换文件、重新对比或关闭 Tauri 程序窗口，系统都会弹窗阻断提示，妥善保护您的劳动成果。
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Case where ZIPs are compared but no file is clicked yet */
              <div className="empty-state">
                <span className="empty-icon">📄</span>
                <h2 className="empty-title">请选择左侧配置文件</h2>
                <p className="empty-desc">
                  在左侧边栏中选择任一有变更（或无变化）的配置文件，即可在此处查看其详细的差异项。
                </p>
              </div>
            )
          )}
        </main>
      </div>
      {showHelpModal && (
        <div className="help-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h2>(=•́ܫ•̀=) MeowNacos 使用说明书</h2>
              <button className="help-modal-close" onClick={() => setShowHelpModal(false)}>×</button>
            </div>
            <div className="help-modal-body">
              <div className="help-cat-intro">
                <img src="/logo.png" alt="Cat Logo" className="help-logo-img" />
                <div className="help-intro-text">
                  <h3>喵呜！欢迎使用 MeowNacos</h3>
                  <p>这是一个专为 Nacos 归档导出包（.zip）配置比对打造的桌面级 GUI 软件。我们将强大的行级 Diff 引擎与可爱的橘猫形象相结合，致力于为您提供高效、轻松的配置对比和编辑体验。</p>
                </div>
              </div>
              
              <div className="help-section">
                <h4>🐾 快捷键说明</h4>
                <div className="help-key-badge-list" style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "8px 0" }}>
                  <span style={{ fontSize: "12px", background: "var(--panel-bg)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                    <strong>打开帮助</strong>: <kbd style={{ background: "var(--border-color)", padding: "2px 4px", borderRadius: "3px" }}>Cmd/Ctrl</kbd> + <kbd style={{ background: "var(--border-color)", padding: "2px 4px", borderRadius: "3px" }}>Shift</kbd> + <kbd style={{ background: "var(--border-color)", padding: "2px 4px", borderRadius: "3px" }}>H</kbd>
                  </span>
                  <span style={{ fontSize: "12px", background: "var(--panel-bg)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                    <strong>自适应宽度</strong>: 代码编辑器随窗口自由弹性伸缩
                  </span>
                </div>
              </div>

              <div className="help-section">
                <h4>🐾 核心功能介绍</h4>
                <ol style={{ paddingLeft: "18px", margin: "8px 0", lineHeight: "1.6" }}>
                  <li style={{ marginBottom: "8px" }}>
                    <strong>多归档文件导入</strong>：
                    点击顶部 <strong>Base: 选择源压缩包 (A)</strong> 与 <strong>Target: 选择目标压缩包 (B)</strong>，可载入两组导出的 ZIP 配置文件，然后点击 <strong>🐾 开始比对</strong>。
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong>过滤与搜索</strong>：
                    左侧文件栏支持根据修改、新增、已删除、无变化四种状态进行 Tab 过滤，并能通过关键字实时进行 Data ID 或 Group 检索。
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong>语义排序对比（⭐ 强烈推荐）</strong>：
                    针对导出时经常被打乱顺序的 YAML / Properties / JSON 配置文件，开启“语义排序对比”后，小橘猫会自动对 key 进行递归字典序排序，屏蔽无差异的无效顺序噪音。
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong>无级拖拽分割线</strong>：
                    双栏模式下，用鼠标按住中间竖线即可左右拉伸调节宽度；两侧高度行号使用 Grid 物理对齐，即使换行也永远同步。行高已精心加宽至 1.65 倍。
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong>在线编辑与 ZIP 覆盖写回</strong>：
                    在 Diff 视图上方，点击 <strong>编辑 Base(A)</strong> 或 <strong>编辑 Target(B)</strong> 即可直接在此处修改配置，点击 <strong>“保存修改”</strong> 会调用 Rust 后端安全写回 ZIP 包（有临时原子覆盖保护，绝不损坏原文件）。
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong>修改防丢机制</strong>：
                    若有未保存的修改，会有脏点 <code>●</code> 提示。在您切换文件、重新比对或者直接关闭软件窗口时，系统都会进行确认弹窗拦截，保证修改不丢失。
                  </li>
                </ol>
              </div>

              <div className="help-footer" style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed var(--border-color)", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                🐾 祝您运维愉快！祝系统没有 bug，喵呜~ (=•́ܫ•̀=)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

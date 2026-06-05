use std::collections::{HashMap, BTreeSet};
use std::fs::File;
use tauri::menu::{Menu, Submenu, MenuItem, PredefinedMenuItem};
use tauri::Emitter;
use std::io::Read;
use zip::ZipArchive;
use serde::{Serialize, Deserialize};
use similar::{TextDiff, ChangeTag};

// Nacos metadata item matching the structure in .metadata.yml
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NacosConfigMetadata {
    #[serde(default, rename = "appName")]
    pub app_name: String,
    #[serde(rename = "dataId")]
    pub data_id: String,
    #[serde(default)]
    pub desc: String,
    pub group: String,
    #[serde(rename = "type")]
    pub config_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NacosMetadataFile {
    pub metadata: Vec<NacosConfigMetadata>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum DiffStatus {
    Added,
    Deleted,
    Modified,
    Unchanged,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigItemCompare {
    pub data_id: String,
    pub group: String,
    pub config_type: String,
    pub status: DiffStatus,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompareResult {
    pub left_path: String,
    pub right_path: String,
    pub items: Vec<ConfigItemCompare>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffLine {
    pub line_type: String, // "added" | "deleted" | "unchanged"
    pub left_line_num: Option<usize>,
    pub right_line_num: Option<usize>,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SideBySideLine {
    pub left: Option<DiffLine>,
    pub right: Option<DiffLine>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffResult {
    pub left_content: String,
    pub right_content: String,
    pub unified_diff: Vec<DiffLine>,
    pub side_by_side_diff: Vec<SideBySideLine>,
}

struct ZipContent {
    configs: Vec<NacosConfigMetadata>,
    file_contents: HashMap<(String, String), String>,
}

// Function to detect config type by file extension fallback
fn detect_type_from_name(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.ends_with(".yml") || lower.ends_with(".yaml") {
        "yaml".to_string()
    } else if lower.ends_with(".properties") {
        "properties".to_string()
    } else if lower.ends_with(".json") {
        "json".to_string()
    } else if lower.ends_with(".xml") {
        "xml".to_string()
    } else if lower.ends_with(".html") {
        "html".to_string()
    } else {
        "text".to_string()
    }
}

// Recursively sort YAML mapping keys
fn sort_yaml(value: serde_yaml::Value) -> serde_yaml::Value {
    match value {
        serde_yaml::Value::Mapping(map) => {
            let mut items: Vec<(serde_yaml::Value, serde_yaml::Value)> = map.into_iter().collect();
            items.sort_by(|(k1, _), (k2, _)| {
                let s1 = yaml_key_to_string(k1);
                let s2 = yaml_key_to_string(k2);
                s1.cmp(&s2)
            });
            let mut new_map = serde_yaml::Mapping::new();
            for (k, v) in items {
                new_map.insert(k, sort_yaml(v));
            }
            serde_yaml::Value::Mapping(new_map)
        }
        serde_yaml::Value::Sequence(seq) => {
            let sorted_seq = seq.into_iter().map(sort_yaml).collect();
            serde_yaml::Value::Sequence(sorted_seq)
        }
        other => other,
    }
}

fn yaml_key_to_string(key: &serde_yaml::Value) -> String {
    match key {
        serde_yaml::Value::String(s) => s.clone(),
        serde_yaml::Value::Number(n) => n.to_string(),
        serde_yaml::Value::Bool(b) => b.to_string(),
        _ => format!("{:?}", key),
    }
}

// Recursively sort JSON object keys
fn sort_json(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut items: Vec<(String, serde_json::Value)> = map.into_iter().collect();
            items.sort_by(|(k1, _), (k2, _)| k1.cmp(k2));
            let mut sorted_map = serde_json::Map::new();
            for (k, v) in items {
                sorted_map.insert(k, sort_json(v));
            }
            serde_json::Value::Object(sorted_map)
        }
        serde_json::Value::Array(arr) => {
            let sorted_arr = arr.into_iter().map(sort_json).collect();
            serde_json::Value::Array(sorted_arr)
        }
        other => other,
    }
}

// Parse properties files, sort by key alphabetically
fn normalize_properties(content: &str) -> String {
    let mut kv_pairs = Vec::new();
    for line in content.lines() {
        let line_trimmed = line.trim();
        if line_trimmed.is_empty() || line_trimmed.starts_with('#') || line_trimmed.starts_with('!') {
            continue;
        }
        if let Some(pos) = line_trimmed.find('=') {
            let key = line_trimmed[..pos].trim().to_string();
            let val = line_trimmed[pos + 1..].trim().to_string();
            kv_pairs.push((key, val));
        } else if let Some(pos) = line_trimmed.find(':') {
            let key = line_trimmed[..pos].trim().to_string();
            let val = line_trimmed[pos + 1..].trim().to_string();
            kv_pairs.push((key, val));
        } else {
            kv_pairs.push((line_trimmed.to_string(), String::new()));
        }
    }
    kv_pairs.sort_by(|(k1, _), (k2, _)| k1.cmp(k2));
    
    let mut output = String::new();
    for (k, v) in kv_pairs {
        output.push_str(&format!("{}={}\n", k, v));
    }
    output
}

fn normalize_content(content: &str, config_type: &str) -> String {
    let content_trimmed = content.trim();
    if content_trimmed.is_empty() {
        return String::new();
    }
    match config_type.to_lowercase().as_str() {
        "yaml" | "yml" => {
            if let Ok(val) = serde_yaml::from_str::<serde_yaml::Value>(content) {
                let sorted_val = sort_yaml(val);
                serde_yaml::to_string(&sorted_val).unwrap_or_else(|_| content.to_string())
            } else {
                content.to_string()
            }
        }
        "json" => {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(content) {
                let sorted_val = sort_json(val);
                serde_json::to_string_pretty(&sorted_val).unwrap_or_else(|_| content.to_string())
            } else {
                content.to_string()
            }
        }
        "properties" => {
            normalize_properties(content)
        }
        _ => content.to_string(),
    }
}

// Read the ZIP structure and load all text files in memory
fn read_zip_all(zip_path: &str) -> Result<ZipContent, String> {
    let file = File::open(zip_path).map_err(|e| format!("无法打开文件 {}: {}", zip_path, e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("解析 ZIP 失败: {}", e))?;
    
    // Read metadata if available
    let mut metadata_items = None;
    if let Ok(mut meta_file) = archive.by_name(".metadata.yml") {
        let mut meta_content = String::new();
        if meta_file.read_to_string(&mut meta_content).is_ok() {
            if let Ok(meta_struct) = serde_yaml::from_str::<NacosMetadataFile>(&meta_content) {
                metadata_items = Some(meta_struct.metadata);
            }
        }
    }
    
    let mut configs = Vec::new();
    let mut file_contents = HashMap::new();
    
    for i in 0..archive.len() {
        let mut f = archive.by_index(i).map_err(|e| format!("读取压缩项失败: {}", e))?;
        let name = f.name().to_string();
        if name == ".metadata.yml" || f.is_dir() || name.starts_with("__MACOSX") || name.contains(".DS_Store") {
            continue;
        }
        
        let mut bytes = Vec::new();
        let content = if f.read_to_end(&mut bytes).is_ok() {
            String::from_utf8_lossy(&bytes).into_owned()
        } else {
            String::new()
        };
        
        // Clean paths (Nacos exports might use backslashes or slashes depending on OS, standardizing to slashes)
        let normalized_name = name.replace('\\', "/");
        let parts: Vec<&str> = normalized_name.split('/').collect();
        
        if parts.len() >= 2 {
            let group = parts[0].to_string();
            let data_id = parts[1..].join("/");
            
            let config_type = if let Some(ref meta) = metadata_items {
                meta.iter()
                    .find(|item| item.group == group && item.data_id == data_id)
                    .map(|item| item.config_type.clone())
                    .unwrap_or_else(|| detect_type_from_name(&data_id))
            } else {
                detect_type_from_name(&data_id)
            };
            
            configs.push(NacosConfigMetadata {
                app_name: String::new(),
                data_id: data_id.clone(),
                desc: String::new(),
                group: group.clone(),
                config_type,
            });
            
            file_contents.insert((group, data_id), content);
        }
    }
    
    Ok(ZipContent {
        configs,
        file_contents,
    })
}

#[tauri::command]
fn select_zip_file(title: String) -> Result<Option<String>, String> {
    let path = rfd::FileDialog::new()
        .set_title(&title)
        .add_filter("ZIP Archive", &["zip"])
        .pick_file();
    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn compare_zips(left_path: String, right_path: String) -> Result<CompareResult, String> {
    let left_zip = read_zip_all(&left_path)?;
    let right_zip = read_zip_all(&right_path)?;
    
    let mut all_keys = BTreeSet::new();
    for item in &left_zip.configs {
        all_keys.insert((item.group.clone(), item.data_id.clone()));
    }
    for item in &right_zip.configs {
        all_keys.insert((item.group.clone(), item.data_id.clone()));
    }
    
    let mut items = Vec::new();
    for (group, data_id) in all_keys {
        let left_opt = left_zip.configs.iter().find(|c| c.group == group && c.data_id == data_id);
        let right_opt = right_zip.configs.iter().find(|c| c.group == group && c.data_id == data_id);
        
        let config_type = right_opt
            .map(|c| c.config_type.clone())
            .unwrap_or_else(|| {
                left_opt
                    .map(|c| c.config_type.clone())
                    .unwrap_or_else(|| "text".to_string())
            });
            
        let status = match (left_opt, right_opt) {
            (Some(_), None) => DiffStatus::Deleted,
            (None, Some(_)) => DiffStatus::Added,
            (Some(_), Some(_)) => {
                let left_content = left_zip.file_contents.get(&(group.clone(), data_id.clone())).cloned().unwrap_or_default();
                let right_content = right_zip.file_contents.get(&(group.clone(), data_id.clone())).cloned().unwrap_or_default();
                if left_content == right_content {
                    DiffStatus::Unchanged
                } else {
                    DiffStatus::Modified
                }
            }
            (None, None) => continue,
        };
        
        items.push(ConfigItemCompare {
            data_id,
            group,
            config_type,
            status,
        });
    }
    
    Ok(CompareResult {
        left_path,
        right_path,
        items,
    })
}

#[tauri::command]
fn get_file_diff(
    left_path: String,
    right_path: String,
    group: String,
    data_id: String,
    normalize: bool,
) -> Result<DiffResult, String> {
    let left_zip = read_zip_all(&left_path)?;
    let right_zip = read_zip_all(&right_path)?;
    
    let key = (group.clone(), data_id.clone());
    let left_raw = left_zip.file_contents.get(&key).cloned().unwrap_or_default();
    let right_raw = right_zip.file_contents.get(&key).cloned().unwrap_or_default();
    
    let config_type = right_zip.configs.iter()
        .find(|c| c.group == group && c.data_id == data_id)
        .or_else(|| left_zip.configs.iter().find(|c| c.group == group && c.data_id == data_id))
        .map(|c| c.config_type.clone())
        .unwrap_or_else(|| detect_type_from_name(&data_id));
        
    let (left_proc, right_proc) = if normalize {
        (
            normalize_content(&left_raw, &config_type),
            normalize_content(&right_raw, &config_type)
        )
    } else {
        (left_raw.clone(), right_raw.clone())
    };
    
    let diff = TextDiff::from_lines(&left_proc, &right_proc);
    
    let mut unified_diff = Vec::new();
    let mut side_by_side_diff = Vec::new();
    
    // 1. Build Unified Diff
    for op in diff.ops() {
        for change in diff.iter_changes(op) {
            let line_type = match change.tag() {
                ChangeTag::Delete => "deleted",
                ChangeTag::Insert => "added",
                ChangeTag::Equal => "unchanged",
            };
            unified_diff.push(DiffLine {
                line_type: line_type.to_string(),
                left_line_num: change.old_index().map(|idx| idx + 1),
                right_line_num: change.new_index().map(|idx| idx + 1),
                content: change.value().to_string(),
            });
        }
    }
    
    // 2. Build Side-by-Side Diff using diff operations (ops)
    for op in diff.ops() {
        match *op {
            similar::DiffOp::Equal { old_index, new_index, len } => {
                for i in 0..len {
                    let left_idx = old_index + i;
                    let right_idx = new_index + i;
                    let left_line = diff.old_slices()[left_idx].to_string();
                    let right_line = diff.new_slices()[right_idx].to_string();
                    
                    side_by_side_diff.push(SideBySideLine {
                        left: Some(DiffLine {
                            line_type: "unchanged".to_string(),
                            left_line_num: Some(left_idx + 1),
                            right_line_num: None,
                            content: left_line,
                        }),
                        right: Some(DiffLine {
                            line_type: "unchanged".to_string(),
                            left_line_num: None,
                            right_line_num: Some(right_idx + 1),
                            content: right_line,
                        }),
                    });
                }
            }
            similar::DiffOp::Delete { old_index, old_len, .. } => {
                for i in 0..old_len {
                    let left_idx = old_index + i;
                    let left_line = diff.old_slices()[left_idx].to_string();
                    
                    side_by_side_diff.push(SideBySideLine {
                        left: Some(DiffLine {
                            line_type: "deleted".to_string(),
                            left_line_num: Some(left_idx + 1),
                            right_line_num: None,
                            content: left_line,
                        }),
                        right: None,
                    });
                }
            }
            similar::DiffOp::Insert { new_index, new_len, .. } => {
                for i in 0..new_len {
                    let right_idx = new_index + i;
                    let right_line = diff.new_slices()[right_idx].to_string();
                    
                    side_by_side_diff.push(SideBySideLine {
                        left: None,
                        right: Some(DiffLine {
                            line_type: "added".to_string(),
                            left_line_num: None,
                            right_line_num: Some(right_idx + 1),
                            content: right_line,
                        }),
                    });
                }
            }
            similar::DiffOp::Replace { old_index, old_len, new_index, new_len } => {
                let max_len = std::cmp::max(old_len, new_len);
                for i in 0..max_len {
                    let left = if i < old_len {
                        let left_idx = old_index + i;
                        let left_line = diff.old_slices()[left_idx].to_string();
                        Some(DiffLine {
                            line_type: "deleted".to_string(),
                            left_line_num: Some(left_idx + 1),
                            right_line_num: None,
                            content: left_line,
                        })
                    } else {
                        None
                    };
                    
                    let right = if i < new_len {
                        let right_idx = new_index + i;
                        let right_line = diff.new_slices()[right_idx].to_string();
                        Some(DiffLine {
                            line_type: "added".to_string(),
                            left_line_num: None,
                            right_line_num: Some(right_idx + 1),
                            content: right_line,
                        })
                    } else {
                        None
                    };
                    
                    side_by_side_diff.push(SideBySideLine { left, right });
                }
            }
        }
    }
    
    Ok(DiffResult {
        left_content: left_proc,
        right_content: right_proc,
        unified_diff,
        side_by_side_diff,
    })
}

#[tauri::command]
fn save_config_to_zip(
    zip_path: String,
    group: String,
    data_id: String,
    content: String,
) -> Result<(), String> {
    use std::io::Write;
    use zip::write::SimpleFileOptions;

    let temp_path = format!("{}.tmp", zip_path);
    
    {
        let src_file = File::open(&zip_path)
            .map_err(|e| format!("无法打开源 ZIP 文件: {}", e))?;
        let mut src_archive = ZipArchive::new(src_file)
            .map_err(|e| format!("解析源 ZIP 失败: {}", e))?;
            
        let dest_file = File::create(&temp_path)
            .map_err(|e| format!("无法创建临时 ZIP 文件: {}", e))?;
        let mut dest_writer = zip::ZipWriter::new(dest_file);
        
        let target_entry_name = format!("{}/{}", group, data_id);
        
        for i in 0..src_archive.len() {
            let mut file = src_archive.by_index(i)
                .map_err(|e| format!("读取 ZIP 压缩项失败: {}", e))?;
            let name = file.name().to_string();
            
            // Standardize path comparison
            let normalized_name = name.replace('\\', "/");
            if normalized_name == target_entry_name {
                continue;
            }
            
            let mut options = SimpleFileOptions::default()
                .compression_method(file.compression());
                
            if let Some(time) = file.last_modified() {
                options = options.last_modified_time(time);
            }
                
            dest_writer.start_file(name, options)
                .map_err(|e| format!("写入文件头到 ZIP 失败: {}", e))?;
                
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)
                .map_err(|e| format!("读取 ZIP 压缩内容失败: {}", e))?;
            dest_writer.write_all(&buffer)
                .map_err(|e| format!("写入 ZIP 文件项失败: {}", e))?;
        }
        
        // Write the modified configuration file
        let options = SimpleFileOptions::default();
        dest_writer.start_file(&target_entry_name, options)
            .map_err(|e| format!("创建修改配置的文件头失败: {}", e))?;
        dest_writer.write_all(content.as_bytes())
            .map_err(|e| format!("写入修改配置内容失败: {}", e))?;
            
        dest_writer.finish()
            .map_err(|e| format!("完成 ZIP 文件写入失败: {}", e))?;
    }
    
    std::fs::rename(&temp_path, &zip_path)
        .map_err(|e| format!("覆盖原 ZIP 文件失败: {}", e))?;
        
    Ok(())
}

fn create_menu<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<tauri::menu::Menu<R>, tauri::Error> {
    let handle = app.handle();
    
    // 1. 应用菜单 (在 macOS 上显示为应用名)
    #[cfg(target_os = "macos")]
    let app_menu = Submenu::new(handle, "MeowNacos", true)?;
    #[cfg(target_os = "macos")]
    {
        app_menu.append(&PredefinedMenuItem::about(handle, Some("关于 MeowNacos"), None)?)?;
        app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        app_menu.append(&PredefinedMenuItem::services(handle, Some("服务"))?)?;
        app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        app_menu.append(&PredefinedMenuItem::hide(handle, Some("隐藏 MeowNacos"))?)?;
        app_menu.append(&PredefinedMenuItem::hide_others(handle, Some("隐藏其他"))?)?;
        app_menu.append(&PredefinedMenuItem::show_all(handle, Some("显示全部"))?)?;
        app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        app_menu.append(&PredefinedMenuItem::quit(handle, Some("退出"))?)?;
    }

    // 2. 文件菜单
    let file_menu = Submenu::new(handle, "文件", true)?;
    file_menu.append(&PredefinedMenuItem::close_window(handle, Some("关闭窗口"))?)?;

    // 3. 编辑菜单
    let edit_menu = Submenu::new(handle, "编辑", true)?;
    edit_menu.append(&PredefinedMenuItem::undo(handle, Some("撤销"))?)?;
    edit_menu.append(&PredefinedMenuItem::redo(handle, Some("重做"))?)?;
    edit_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    edit_menu.append(&PredefinedMenuItem::cut(handle, Some("剪切"))?)?;
    edit_menu.append(&PredefinedMenuItem::copy(handle, Some("复制"))?)?;
    edit_menu.append(&PredefinedMenuItem::paste(handle, Some("粘贴"))?)?;
    edit_menu.append(&PredefinedMenuItem::select_all(handle, Some("全选"))?)?;

    // 4. 窗口菜单
    let window_menu = Submenu::new(handle, "窗口", true)?;
    window_menu.append(&PredefinedMenuItem::minimize(handle, Some("最小化"))?)?;
    window_menu.append(&PredefinedMenuItem::separator(handle)?)?;

    // 5. 帮助菜单
    let help_menu = Submenu::new(handle, "帮助", true)?;
    let show_help_item = MenuItem::with_id(
        handle,
        "show_help",
        "使用说明",
        true,
        Some("CmdOrCtrl+Shift+H")
    )?;
    help_menu.append(&show_help_item)?;

    let menu = Menu::new(handle)?;
    #[cfg(target_os = "macos")]
    menu.append(&app_menu)?;
    menu.append(&file_menu)?;
    menu.append(&edit_menu)?;
    menu.append(&window_menu)?;
    menu.append(&help_menu)?;

    Ok(menu)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 设置中文化系统菜单
            let menu = create_menu(app)?;
            app.set_menu(menu)?;

            if let Some(main_window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = main_window.primary_monitor() {
                    let size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    
                    let logical_width = (size.width as f64 * 0.8 / scale_factor) as f64;
                    let logical_height = (size.height as f64 * 0.6 / scale_factor) as f64;
                    
                    let _ = main_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width: logical_width,
                        height: logical_height,
                    }));
                    let _ = main_window.center();
                }
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "show_help" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("show-help", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            select_zip_file,
            compare_zips,
            get_file_diff,
            save_config_to_zip
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

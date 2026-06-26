# MeowNacos Use Cases 💡

This document details the common usage scenarios and problem-solving examples for MeowNacos.

English | [简体中文](#简体中文)

---

## English

### Scenario 1: Microservice Configuration Migration & Sync (DEV -> TEST -> PROD)
* **The Pain Point**: When migrating Nacos configurations from development to test or production environments, manually copy-pasting or blindly overwriting full configuration packages is error-prone. It is easy to miss environment-specific variables like database endpoints, credentials, or hostnames.
* **The Solution**: Export the ZIP configuration archives from both environments, and import them into MeowNacos. Click **Compare**. The sidebar instantly aligns files by status (Modified, Added, Deleted, Unchanged). With the side-by-side split Diff view, you can review every single line of change in seconds before deploying, avoiding unexpected production outages.

### Scenario 2: Eliminating Out-of-Order YAML/Properties Noise (Semantic Sorting Diff)
* **The Pain Point**: When configurations are exported from Nacos, the order of properties or keys in YAML/JSON/Properties files is often scrambled by Nacos internals or export tools. Doing a standard text-based diff results in dozens of false-positive differences (red/green lines) where keys merely swapped positions, hiding the actual value changes.
* **The Solution**: MeowNacos features a **Semantic Sorting Diff** mode. It parses YAML/JSON/Properties files, builds a key-value mapping tree, and recursively sorts the keys alphabetically before running the diff algorithm. This eliminates 100% of the layout noise, only displaying the actual modified values.

### Scenario 3: Direct Editing & Safe Atomic ZIP Write-Back
* **The Pain Point**: If you find a small mistake in a Nacos configuration ZIP package (e.g., a timeout value was set to `3000` instead of `300`), the traditional way to fix it is tedious: unzip the package, edit the file in VS Code/Notepad, save it, zip it back up, and ensure the directory structure is preserved so Nacos can import it.
* **The Solution**: Select the target file in MeowNacos and click the **Edit Target** tab. Modify the values inside the built-in text editor and click **Save**. The Rust backend will stream-write the updates using a temporary file (`.zip.tmp`) and atomically rename it to overwrite the original archive. This ensures your archive remains safe even if the app crashes or the system loses power mid-write.

---

## 简体中文

### 场景一：微服务环境配置迁移与同步（DEV -> TEST -> PROD）
* **痛点**：在把 Nacos 配置从开发环境发布到测试或生产环境时，传统的“人工复制”属性或“全量覆盖”非常危险，极易遗漏一些测试/生产专用的特定环境变量（如数据库地址或密钥）。
* **解法**：分别从两个环境的 Nacos 控制台导出配置 ZIP 包，通过 MeowNacos 一键导入并点击 **开始比对**。左侧边栏即刻按【修改、新增、已删除、一致】自动对齐配置文件，让您可以在上线前以 Side-by-Side 的双栏弹性 Diff 视图秒级审阅任何一行改动，完美规避上线事故。

### 场景二：消除打乱的 YAML 配置顺序噪音（字典重排比对）
* **痛点**：Nacos 配置中心在配置项更新时，导出的 YAML 属性键（Key）位置常常会被完全打乱（例如有的工具按更新时间排序，有的是随机键顺序）。直接进行普通的文本差异 Diff，即使配置数据没变，也会显示出大量的乱序红绿行，程序员根本无法在浩如烟海的无用 Diff 中辨别出哪些是真实值修改。
* **解法**：在 MeowNacos 中选中该 YAML/Properties，默认开启 **“语义排序对比”**。小橘猫会在 Rust 后端解析该配置为键值映射树，并递归地对所有 Key 进行字典重排序后输出并计算 Diff。无用的乱序差异将 100% 被消除，仅展示数值真正被修改了的属性行，排除 99% 的文本噪音。

### 场景三：直接编辑与 ZIP 包原子写回
* **痛点**：以往发现打包的配置包里有一些小毛病（例如某个 timeout 从 3000 误写成了 300）需要修补时，必须解压缩 ZIP 包，使用 VS Code 打开对应文件修改，保存后，再通过外部工具压缩。不仅操作链极长，而且经常由于压缩目录结构不对导致 Nacos 无法重新导入。
* **解法**：在 MeowNacos 选中该文件，直接点击上方的 **编辑 Target** 选项卡。在等宽编程字体编辑器内修改完参数后，点击 **保存修改**。Rust 后端会通过多项流式写入和 `.tmp` 原子重命名覆盖，在完全不解压原 ZIP 的情况下直接把改动写入原 ZIP 压缩包，省时省力。

// 模拟 React 前端的 getFileName 函数逻辑
const getFileName = (path) => {
  if (!path) return "";
  return path.replace(/\\/g, '/').split('/').pop() || "";
};

// 各种平台的绝对路径测试数据
const testCases = [
  {
    platform: "macOS / Linux (Unix Style)",
    path: "/Users/huyue/Downloads/nacos_config_export_20260604.zip",
    expected: "nacos_config_export_20260604.zip"
  },
  {
    platform: "Windows (Standard Backslash Style)",
    path: "C:\\Users\\Administrator\\Downloads\\nacos_config_export_20260604.zip",
    expected: "nacos_config_export_20260604.zip"
  },
  {
    platform: "Windows (Mixed Slashes Style)",
    path: "D:/Work/Nacos/exports\\config_export_prod.zip",
    expected: "config_export_prod.zip"
  },
  {
    platform: "Relative Path",
    path: "subfolder/config.zip",
    expected: "config.zip"
  },
  {
    platform: "Only Filename",
    path: "application.yml",
    expected: "application.yml"
  }
];

console.log("(=•́ܫ•̀=) MeowNacos 路径切分跨平台兼容性验证：\\n");
let passedCount = 0;
testCases.forEach((tc, idx) => {
  const result = getFileName(tc.path);
  const passed = result === tc.expected;
  if (passed) passedCount++;
  console.log(`[${passed ? 'SUCCESS' : 'FAILED'}] 测试例 ${idx + 1} (${tc.platform}):`);
  console.log(`  输入路径: ${tc.path}`);
  console.log(`  解析结果: ${result}`);
  console.log(`  预期结果: ${tc.expected}\\n`);
});

console.log(`验证完成：共运行 ${testCases.length} 个测试，通过 ${passedCount} 个。`);
if (passedCount === testCases.length) {
  console.log("🐾 完美！所有平台的绝对路径均已实现 100% 完美解析且表现一致。");
} else {
  console.log("⚠️ 存在不通过的测试用例。");
}

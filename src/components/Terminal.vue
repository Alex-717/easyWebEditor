<template>
  <div class="terminal-container">
    <div class="terminal-header">
      <div class="terminal-title">
        <span class="terminal-icon">⚡</span>
        <span>终端</span>
      </div>
      <div class="terminal-controls">
        <button @click="clearTerminal" class="control-btn" title="清空">🗑️</button>
        <button @click="$emit('toggle')" class="control-btn" title="最小化">➖</button>
      </div>
    </div>
    
    <div class="terminal-content" ref="terminalContent">
      <div class="terminal-output">
        <div v-for="(line, index) in outputLines" :key="index" class="output-line">
          <span v-if="line.type === 'command'" class="command-prompt">
            <span class="prompt-symbol">$</span>
            <span class="command-text">{{ line.content }}</span>
          </span>
          <span v-else-if="line.type === 'error'" class="error-text">{{ line.content }}</span>
          <span v-else-if="line.type === 'success'" class="success-text">{{ line.content }}</span>
          <span v-else-if="line.type === 'warning'" class="warning-text">{{ line.content }}</span>
          <span v-else class="normal-text">{{ line.content }}</span>
        </div>
      </div>
      
      <div class="terminal-input-line">
        <span class="prompt-symbol">$</span>
        <input 
          ref="terminalInput"
          v-model="currentCommand"
          @keydown.enter="executeCommand"
          @keydown.up="navigateHistory(-1)"
          @keydown.down="navigateHistory(1)"
          @keydown.tab.prevent="handleTabCompletion"
          class="terminal-input"
          placeholder="输入命令..."
          :disabled="isExecuting"
        >
      </div>
      
      <div v-if="isExecuting" class="executing-indicator">
        <span class="spinner">⏳</span>
        <span>正在执行: {{ currentExecutingCommand }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editor'

const emit = defineEmits(['toggle'])

const editorStore = useEditorStore()

// 终端状态
const terminalContent = ref(null)
const terminalInput = ref(null)
const currentCommand = ref('')
const outputLines = ref([])
const commandHistory = ref([])
const historyIndex = ref(-1)
const isExecuting = ref(false)
const currentExecutingCommand = ref('')

// 常用命令映射
const commandMap = {
  'npm run dev': {
    description: '启动开发服务器',
    execute: () => simulateDevServer()
  },
  'npm run build': {
    description: '构建项目',
    execute: () => simulateBuild()
  },
  'npm install': {
    description: '安装依赖',
    execute: () => simulateInstall()
  },
  'npm run test': {
    description: '运行测试',
    execute: () => simulateTest()
  },
  'git status': {
    description: '查看Git状态',
    execute: () => simulateGitStatus()
  },
  'git add .': {
    description: '添加所有文件到暂存区',
    execute: () => simulateGitAdd()
  },
  'ls': {
    description: '列出文件',
    execute: () => simulateList()
  },
  'pwd': {
    description: '显示当前路径',
    execute: () => simulatePwd()
  },
  'clear': {
    description: '清空终端',
    execute: () => clearTerminal()
  },
  'help': {
    description: '显示帮助信息',
    execute: () => showHelp()
  }
}

// 初始化终端
onMounted(() => {
  addOutputLine('欢迎使用 Web 终端模拟器！', 'success')
  addOutputLine('输入 "help" 查看可用命令', 'normal')
  addOutputLine('', 'normal')
  
  // 聚焦输入框
  nextTick(() => {
    terminalInput.value?.focus()
  })
})

// 添加输出行
const addOutputLine = (content, type = 'normal') => {
  outputLines.value.push({ content, type })
  nextTick(() => {
    scrollToBottom()
  })
}

// 滚动到底部
const scrollToBottom = () => {
  if (terminalContent.value) {
    terminalContent.value.scrollTop = terminalContent.value.scrollHeight
  }
}

// 执行命令
const executeCommand = async () => {
  const command = currentCommand.value.trim()
  if (!command) return

  // 添加命令到历史
  commandHistory.value.unshift(command)
  if (commandHistory.value.length > 50) {
    commandHistory.value.pop()
  }
  historyIndex.value = -1

  // 显示命令
  addOutputLine(command, 'command')

  // 清空输入
  currentCommand.value = ''

  // 检查是否是已知命令
  if (commandMap[command]) {
    isExecuting.value = true
    currentExecutingCommand.value = command
    
    try {
      await commandMap[command].execute()
    } catch (error) {
      addOutputLine(`错误: ${error.message}`, 'error')
    }
    
    isExecuting.value = false
    currentExecutingCommand.value = ''
  } else {
    // 未知命令
    addOutputLine(`命令未找到: ${command}`, 'error')
    addOutputLine('输入 "help" 查看可用命令', 'normal')
  }

  addOutputLine('', 'normal') // 空行分隔
}

// 命令历史导航
const navigateHistory = (direction) => {
  if (commandHistory.value.length === 0) return

  historyIndex.value += direction
  
  if (historyIndex.value < 0) {
    historyIndex.value = -1
    currentCommand.value = ''
  } else if (historyIndex.value >= commandHistory.value.length) {
    historyIndex.value = commandHistory.value.length - 1
  }

  if (historyIndex.value >= 0) {
    currentCommand.value = commandHistory.value[historyIndex.value]
  }
}

// Tab 自动补全
const handleTabCompletion = () => {
  const input = currentCommand.value.toLowerCase()
  if (!input) return

  const matches = Object.keys(commandMap).filter(cmd => 
    cmd.toLowerCase().startsWith(input)
  )

  if (matches.length === 1) {
    currentCommand.value = matches[0]
  } else if (matches.length > 1) {
    addOutputLine(`可能的命令: ${matches.join(', ')}`, 'normal')
  }
}

// 清空终端
const clearTerminal = () => {
  outputLines.value = []
}

// 显示帮助
const showHelp = async () => {
  await sleep(300)
  addOutputLine('可用命令:', 'success')
  addOutputLine('', 'normal')
  
  Object.entries(commandMap).forEach(([cmd, info]) => {
    addOutputLine(`  ${cmd.padEnd(20)} - ${info.description}`, 'normal')
  })
  
  addOutputLine('', 'normal')
  addOutputLine('提示:', 'warning')
  addOutputLine('  • 使用 ↑↓ 键浏览命令历史', 'normal')
  addOutputLine('  • 使用 Tab 键自动补全命令', 'normal')
  addOutputLine('  • 这是一个模拟终端，无法执行真实的系统命令', 'normal')
}

// 模拟开发服务器
const simulateDevServer = async () => {
  addOutputLine('正在启动开发服务器...', 'normal')
  await sleep(1000)
  
  addOutputLine('✓ 依赖检查完成', 'success')
  await sleep(500)
  
  addOutputLine('✓ 编译完成', 'success')
  await sleep(500)
  
  addOutputLine('', 'normal')
  addOutputLine('  Local:   http://localhost:3000', 'success')
  addOutputLine('  Network: http://192.168.1.100:3000', 'success')
  addOutputLine('', 'normal')
  addOutputLine('开发服务器已启动！', 'success')
  addOutputLine('按 Ctrl+C 停止服务器', 'warning')
}

// 模拟构建
const simulateBuild = async () => {
  addOutputLine('正在构建项目...', 'normal')
  await sleep(800)
  
  addOutputLine('✓ 清理输出目录', 'success')
  await sleep(300)
  
  addOutputLine('✓ 编译 TypeScript', 'success')
  await sleep(600)
  
  addOutputLine('✓ 打包资源文件', 'success')
  await sleep(400)
  
  addOutputLine('✓ 优化代码', 'success')
  await sleep(500)
  
  addOutputLine('', 'normal')
  addOutputLine('构建完成！输出目录: dist/', 'success')
  addOutputLine('文件大小: 1.2MB (gzipped: 340KB)', 'normal')
}

// 模拟安装依赖
const simulateInstall = async () => {
  addOutputLine('正在安装依赖...', 'normal')
  await sleep(1000)
  
  const packages = ['vue@3.3.4', 'vite@4.4.9', 'pinia@2.1.6', '@vitejs/plugin-vue@4.3.4']
  
  for (const pkg of packages) {
    addOutputLine(`+ ${pkg}`, 'success')
    await sleep(200)
  }
  
  addOutputLine('', 'normal')
  addOutputLine('依赖安装完成！', 'success')
  addOutputLine('安装了 47 个包，用时 12.3s', 'normal')
}

// 模拟测试
const simulateTest = async () => {
  addOutputLine('正在运行测试...', 'normal')
  await sleep(800)
  
  addOutputLine('✓ components/FileExplorer.spec.js', 'success')
  await sleep(300)
  
  addOutputLine('✓ components/CodeEditor.spec.js', 'success')
  await sleep(300)
  
  addOutputLine('✓ stores/editor.spec.js', 'success')
  await sleep(300)
  
  addOutputLine('', 'normal')
  addOutputLine('测试结果: 15 passed, 0 failed', 'success')
  addOutputLine('覆盖率: 87.5%', 'normal')
}

// 模拟 Git 状态
const simulateGitStatus = async () => {
  await sleep(200)
  addOutputLine('On branch main', 'normal')
  addOutputLine('Your branch is up to date with \'origin/main\'.', 'normal')
  addOutputLine('', 'normal')
  addOutputLine('Changes not staged for commit:', 'warning')
  addOutputLine('  modified:   src/components/Terminal.vue', 'warning')
  addOutputLine('  modified:   src/App.vue', 'warning')
  addOutputLine('', 'normal')
  addOutputLine('Untracked files:', 'error')
  addOutputLine('  src/components/NewComponent.vue', 'error')
}

// 模拟 Git 添加
const simulateGitAdd = async () => {
  await sleep(300)
  addOutputLine('已添加所有文件到暂存区', 'success')
}

// 模拟列出文件
const simulateList = async () => {
  await sleep(200)
  if (editorStore.rootDirectory) {
    addOutputLine(`当前目录: ${editorStore.rootDirectory.name}`, 'normal')
    addOutputLine('', 'normal')
    
    // 显示一些常见的项目文件
    const commonFiles = [
      'src/', 'public/', 'node_modules/', 'package.json', 
      'vite.config.js', 'README.md', '.gitignore'
    ]
    
    commonFiles.forEach(file => {
      const isDir = file.endsWith('/')
      addOutputLine(`${isDir ? '📁' : '📄'} ${file}`, 'normal')
    })
  } else {
    addOutputLine('未选择项目目录', 'warning')
  }
}

// 模拟显示路径
const simulatePwd = async () => {
  await sleep(100)
  if (editorStore.rootDirectory) {
    addOutputLine(`/workspace/${editorStore.rootDirectory.name}`, 'normal')
  } else {
    addOutputLine('/workspace', 'normal')
  }
}

// 工具函数：延迟
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 点击终端区域时聚焦输入框
const handleTerminalClick = () => {
  terminalInput.value?.focus()
}

onMounted(() => {
  if (terminalContent.value) {
    terminalContent.value.addEventListener('click', handleTerminalClick)
  }
})

onUnmounted(() => {
  if (terminalContent.value) {
    terminalContent.value.removeEventListener('click', handleTerminalClick)
  }
})
</script>

<style scoped>
.terminal-container {
  height: 100%;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 6px 6px 0 0;
  display: flex;
  flex-direction: column;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  border-radius: 6px 6px 0 0;
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}

.terminal-icon {
  font-size: 14px;
}

.terminal-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.control-btn:hover {
  background: #3e3e42;
  color: #ffffff;
}

.terminal-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  cursor: text;
}

.terminal-output {
  margin-bottom: 8px;
}

.output-line {
  margin-bottom: 2px;
  line-height: 1.4;
  font-size: 13px;
}

.command-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-symbol {
  color: #00ff00;
  font-weight: bold;
  user-select: none;
}

.command-text {
  color: #ffffff;
  font-weight: 600;
}

.normal-text {
  color: #cccccc;
}

.success-text {
  color: #00ff00;
}

.error-text {
  color: #ff6b6b;
}

.warning-text {
  color: #ffcc00;
}

.terminal-input-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
}

.terminal-input::placeholder {
  color: #666666;
}

.executing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #ffcc00;
  font-size: 12px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 滚动条样式 */
.terminal-content::-webkit-scrollbar {
  width: 8px;
}

.terminal-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.terminal-content::-webkit-scrollbar-thumb {
  background: #3e3e42;
  border-radius: 4px;
}

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
</style>

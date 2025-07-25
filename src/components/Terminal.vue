<template>
  <!-- 保持原有的模板结构 -->
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
import NodeRunner from '../utils/nodeRunner'

const emit = defineEmits(['toggle'])

const editorStore = useEditorStore()
const nodeRunner = new NodeRunner()

// 终端状态
const terminalContent = ref(null)
const terminalInput = ref(null)
const currentCommand = ref('')
const outputLines = ref([])
const commandHistory = ref([])
const historyIndex = ref(-1)
const isExecuting = ref(false)
const currentExecutingCommand = ref('')

// 设置 Node 运行器的输出处理
nodeRunner.output = (type, message) => {
  addOutputLine(message, type === 'log' ? 'normal' : type)
}

// 命令映射
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
  addOutputLine('支持 Node.js 脚本执行', 'success')
  addOutputLine('输入 "help" 查看可用命令', 'normal')
  addOutputLine('', 'normal')
  
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

// 执行命令 - 修复版本
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

  // 检查是否是 Node.js 命令
  if (command.startsWith('node ')) {
    await executeNodeCommand(command)
  } 
  // 检查是否是已知命令
  else if (commandMap[command]) {
    isExecuting.value = true
    currentExecutingCommand.value = command
    
    try {
      await commandMap[command].execute()
    } catch (error) {
      addOutputLine(`错误: ${error.message}`, 'error')
    }
    
    isExecuting.value = false
    currentExecutingCommand.value = ''
  } 
  // 未知命令
  else {
    addOutputLine(`命令未找到: ${command}`, 'error')
    addOutputLine('输入 "help" 查看可用命令', 'normal')
  }

  addOutputLine('', 'normal') // 空行分隔
}

// 修复后的查找文件函数
const findFile = async (filename) => {
  console.log('正在查找文件:', filename)
  console.log('根目录:', editorStore.rootDirectory)
  
  // 如果没有根目录，提示用户先打开项目
  if (!editorStore.rootDirectory) {
    addOutputLine('请先打开一个项目文件夹', 'error')
    return null
  }

  try {
    // 递归搜索文件
    const result = await searchInDirectoryAsync(editorStore.rootDirectory, filename)
    console.log('查找结果:', result)
    return result
  } catch (error) {
    console.error('查找文件时出错:', error)
    addOutputLine(`查找文件时出错: ${error.message}`, 'error')
    return null
  }
}

// 异步递归搜索文件
const searchInDirectoryAsync = async (dirHandle, targetFilename, path = '') => {
  console.log(`搜索目录: ${path || '/'}, 目录句柄:`, dirHandle)
  
  try {
    // 如果是我们存储的目录结构对象，直接搜索
    if (dirHandle.children && Array.isArray(dirHandle.children)) {
      console.log(`使用缓存的目录结构，子项数量: ${dirHandle.children.length}`)
      
      for (const child of dirHandle.children) {
        console.log(`检查: ${child.name}, 是否目录: ${child.isDirectory}`)
        
        if (child.name === targetFilename && !child.isDirectory) {
          console.log('找到匹配文件:', child)
          return child
        }
        
        if (child.isDirectory) {
          const found = await searchInDirectoryAsync(child, targetFilename, path + '/' + child.name)
          if (found) return found
        }
      }
      return null
    }
    
    // 如果是 FileSystemDirectoryHandle，需要遍历
    if (dirHandle.kind === 'directory') {
      console.log('遍历 FileSystemDirectoryHandle')
      
      for await (const [name, handle] of dirHandle.entries()) {
        console.log(`检查: ${name}, 类型: ${handle.kind}`)
        
        if (name === targetFilename && handle.kind === 'file') {
          console.log('找到匹配文件:', { name, handle })
          return { name, handle, isDirectory: false }
        }
        
        if (handle.kind === 'directory') {
          const found = await searchInDirectoryAsync(handle, targetFilename, path + '/' + name)
          if (found) return found
        }
      }
    }
    
    return null
  } catch (error) {
    console.error(`搜索目录 ${path} 时出错:`, error)
    return null
  }
}

// 改进的读取文件内容函数
const readFileContent = async (file) => {
  try {
    console.log('正在读取文件:', file)
    
    // 如果有 handle 属性，使用 handle 读取
    if (file.handle) {
      console.log('使用 FileSystemFileHandle 读取')
      
      // 检查缓存
      if (editorStore.fileContents.has(file.handle)) {
        console.log('从缓存读取文件内容')
        const content = editorStore.fileContents.get(file.handle)
        return content
      }

      // 从文件系统读取
      const fileData = await file.handle.getFile()
      const content = await fileData.text()
      console.log('文件内容长度:', content.length)
      
      // 缓存内容
      editorStore.fileContents.set(file.handle, content)
      return content
    }
    
    // 如果没有 handle，可能是其他类型的文件对象
    console.error('文件对象没有 handle 属性:', file)
    return null
    
  } catch (error) {
    console.error('读取文件失败:', error)
    addOutputLine(`读取文件失败: ${error.message}`, 'error')
    return null
  }
}

// 改进的获取所有 JavaScript 文件函数
const getAllJavaScriptFiles = () => {
  const files = []
  
  const searchInDirectory = (dir, path = '') => {
    if (!dir) return
    
    // 处理缓存的目录结构
    if (dir.children && Array.isArray(dir.children)) {
      for (const child of dir.children) {
        if (!child.isDirectory && (child.name.endsWith('.js') || child.name.endsWith('.mjs'))) {
          files.push(child.name)
        }
        if (child.isDirectory) {
          searchInDirectory(child, path + '/' + child.name)
        }
      }
    }
  }

  if (editorStore.rootDirectory) {
    searchInDirectory(editorStore.rootDirectory)
  }
  
  return files
}

// 改进的 ls 命令实现
const simulateList = async () => {
  await sleep(200)
  
  if (!editorStore.rootDirectory) {
    addOutputLine('⚠️ 未选择项目目录', 'warning')
    addOutputLine('💡 请先使用文件浏览器打开一个项目文件夹', 'info')
    return
  }

  try {
    addOutputLine(`📁 当前目录: ${editorStore.rootDirectory.name}`, 'info')
    addOutputLine('', 'normal')
    
    // 列出所有文件和目录
    await listDirectoryContents(editorStore.rootDirectory)
    
  } catch (error) {
    addOutputLine(`列出文件时出错: ${error.message}`, 'error')
  }
}

// 列出目录内容
const listDirectoryContents = async (dirHandle, prefix = '') => {
  try {
    // 如果是缓存的目录结构
    if (dirHandle.children && Array.isArray(dirHandle.children)) {
      for (const child of dirHandle.children) {
        const icon = child.isDirectory ? '📁' : '📄'
        addOutputLine(`${prefix}${icon} ${child.name}`, 'normal')
      }
      return
    }
    
    // 如果是 FileSystemDirectoryHandle
    if (dirHandle.kind === 'directory') {
      for await (const [name, handle] of dirHandle.entries()) {
        const icon = handle.kind === 'directory' ? '📁' : '📄'
        addOutputLine(`${prefix}${icon} ${name}`, 'normal')
      }
    }
  } catch (error) {
    console.error('列出目录内容失败:', error)
    addOutputLine(`无法列出目录内容: ${error.message}`, 'error')
  }
}

// 改进的 executeNodeCommand 函数
const executeNodeCommand = async (command) => {
  const parts = command.split(' ')
  const filename = parts[1]
  const args = parts.slice(2)
  
  if (!filename) {
    addOutputLine('用法: node <filename> [args...]', 'error')
    return
  }

  // 检查是否有打开的项目
  if (!editorStore.rootDirectory) {
    addOutputLine('❌ 请先打开一个项目文件夹', 'error')
    addOutputLine('💡 使用左侧的文件浏览器打开项目', 'info')
    return
  }

  isExecuting.value = true
  currentExecutingCommand.value = command

  try {
    addOutputLine(`🔍 正在查找文件: ${filename}`, 'info')
    
    // 查找文件
    const file = await findFile(filename)
    if (!file) {
      addOutputLine(`❌ 找不到文件 '${filename}'`, 'error')
      addOutputLine('💡 请确保文件存在于当前项目中', 'warning')
      
      // 显示可用的 JavaScript 文件
      const jsFiles = getAllJavaScriptFiles()
      if (jsFiles.length > 0) {
        addOutputLine('📋 可用的 JavaScript 文件:', 'info')
        jsFiles.forEach(file => {
          addOutputLine(`   • ${file}`, 'normal')
        })
      }
      return
    }

    addOutputLine(`✅ 找到文件: ${filename}`, 'success')

    // 读取文件内容
    const content = await readFileContent(file)
    if (!content) {
      addOutputLine(`❌ 无法读取文件 '${filename}'`, 'error')
      return
    }

    addOutputLine(`⚡ 正在执行: ${filename}`, 'info')
    addOutputLine('--- 📤 输出开始 ---', 'info')
    
    // 更新 process.argv
    nodeRunner.globals.process.argv = ['node', filename, ...args]
    
    // 执行 Node.js 代码
    const result = await nodeRunner.executeCode(content, filename)
    
    addOutputLine('--- 📥 输出结束 ---', 'info')
    
    if (result.success) {
      addOutputLine(`✅ 脚本执行完成`, 'success')
    } else {
      addOutputLine(`❌ 执行失败: ${result.error}`, 'error')
    }

  } catch (error) {
    addOutputLine(`💥 执行错误: ${error.message}`, 'error')
    console.error('Node command execution error:', error)
  } finally {
    isExecuting.value = false
    currentExecutingCommand.value = ''
  }
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

  // 支持 node 命令的文件名补全
  if (input.startsWith('node ')) {
    const partial = input.slice(5)
    const files = getAllJavaScriptFiles()
    const matches = files.filter(file => file.toLowerCase().startsWith(partial))
    
    if (matches.length === 1) {
      currentCommand.value = 'node ' + matches[0]
    } else if (matches.length > 1) {
      addOutputLine(`可能的文件: ${matches.join(', ')}`, 'normal')
    }
    return
  }

  // 原有的命令补全
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
  
  // 显示 Node.js 命令
  addOutputLine('  node <filename>      - 执行 Node.js 脚本', 'normal')
  addOutputLine('', 'normal')
  
  Object.entries(commandMap).forEach(([cmd, info]) => {
    addOutputLine(`  ${cmd.padEnd(20)} - ${info.description}`, 'normal')
  })
  
  addOutputLine('', 'normal')
  addOutputLine('提示:', 'warning')
  addOutputLine('  • 使用 ↑↓ 键浏览命令历史', 'normal')
  addOutputLine('  • 使用 Tab 键自动补全命令和文件名', 'normal')
  addOutputLine('  • Node.js 环境支持基本的内置模块', 'normal')
  addOutputLine('  • 支持 .js 和 .mjs 文件', 'normal')
}

// 模拟函数
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
}

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
}

const simulateInstall = async () => {
  addOutputLine('正在安装依赖...', 'normal')
  await sleep(1000)
  
  const packages = ['vue@3.3.4', 'vite@4.4.9', 'pinia@2.1.6']
  
  for (const pkg of packages) {
    addOutputLine(`+ ${pkg}`, 'success')
    await sleep(200)
  }
  
  addOutputLine('', 'normal')
  addOutputLine('依赖安装完成！', 'success')
}

const simulateTest = async () => {
  addOutputLine('正在运行测试...', 'normal')
  await sleep(800)
  
  addOutputLine('✓ 测试通过', 'success')
  addOutputLine('覆盖率: 87.5%', 'normal')
}

const simulateGitStatus = async () => {
  await sleep(200)
  addOutputLine('On branch main', 'normal')
  addOutputLine('Changes not staged for commit:', 'warning')
  addOutputLine('  modified:   index.js', 'warning')
}

const simulateGitAdd = async () => {
  await sleep(300)
  addOutputLine('已添加所有文件到暂存区', 'success')
}

const simulatePwd = async () => {
  await sleep(100)
  if (editorStore.rootDirectory) {
    addOutputLine(`/workspace/${editorStore.rootDirectory.name}`, 'normal')
  } else {
    addOutputLine('/workspace', 'normal')
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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
/* 保持原有样式 */
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

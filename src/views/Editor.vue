<template>
  <div class="editor-container">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="toolbar-left">
        <h1 class="app-title">Web Code Editor</h1>
      </div>
      <div class="toolbar-right">
        <button @click="toggleSidebar" class="toolbar-btn" title="切换侧边栏 (Ctrl+B)">
          📁
        </button>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- 左侧文件浏览器 -->
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <FileExplorer />
      </aside>

      <!-- 右侧编辑区域 -->
      <div class="editor-area">
        <!-- 代码编辑器 -->
        <div class="editor-section" :style="{ height: `${editorHeight}%` }">
          <div v-if="!editorStore.currentFile" class="editor-placeholder">
            <div class="placeholder-content">
              <div class="placeholder-icon">📝</div>
              <h3>选择一个文件开始编辑</h3>
              <p>从左侧文件浏览器中选择要编辑的文件</p>
            </div>
          </div>
          <CodeEditor v-else />
        </div>

        <!-- 分割条 -->
        <div 
          class="resize-handle"
          @mousedown="startResize"
          title="拖拽调整大小"
        ></div>

        <!-- 终端区域 -->
        <div class="terminal-section" :style="{ height: `${100 - editorHeight}%` }">
          <Terminal @toggle="toggleTerminal" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editor'
import FileExplorer from '../components/FileExplorer.vue'
import CodeEditor from '../components/CodeEditor.vue'
import Terminal from '../components/Terminal.vue'

const editorStore = useEditorStore()

// UI 状态
const sidebarCollapsed = ref(false)
const editorHeight = ref(70) // 编辑器占用高度百分比
const isResizing = ref(false)

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 切换终端
const toggleTerminal = () => {
  // 可以添加终端最小化逻辑
  console.log('切换终端')
}

// 开始调整大小
const startResize = (event) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

// 处理调整大小
const handleResize = (event) => {
  if (!isResizing.value) return

  const editorArea = document.querySelector('.editor-area')
  
  if (editorArea) {
    const rect = editorArea.getBoundingClientRect()
    const relativeY = event.clientY - rect.top
    const percentage = (relativeY / rect.height) * 100
    
    // 限制范围在 30% 到 90% 之间
    editorHeight.value = Math.max(30, Math.min(90, percentage))
  }
}

// 停止调整大小
const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// 键盘快捷键
const handleKeyDown = (event) => {
  // Ctrl+S 保存
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    if (editorStore.currentFile) {
      editorStore.saveFile()
    }
  }
  
  // Ctrl+B 切换侧边栏
  if (event.ctrlKey && event.key === 'b') {
    event.preventDefault()
    toggleSidebar()
  }
  
  // Ctrl+` 切换终端焦点
  if (event.ctrlKey && event.key === '`') {
    event.preventDefault()
    // 可以添加终端焦点切换逻辑
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.editor-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #cccccc;
}

.toolbar {
  height: 40px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #ffffff;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.toolbar-btn:hover {
  background: #3e3e42;
  color: #ffffff;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: #252526;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 0;
  overflow: hidden;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.editor-section {
  background: #1e1e1e;
  overflow: hidden;
}

.editor-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;
}

.placeholder-content {
  text-align: center;
  color: #666666;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.placeholder-content h3 {
  margin: 0 0 8px 0;
  color: #cccccc;
}

.placeholder-content p {
  margin: 0;
  font-size: 14px;
}

.resize-handle {
  height: 4px;
  background: #3e3e42;
  cursor: row-resize;
  position: relative;
  z-index: 10;
}

.resize-handle:hover {
  background: #007acc;
}

.terminal-section {
  background: #1e1e1e;
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
  }
  
  .sidebar.collapsed {
    transform: translateX(-100%);
  }
}
</style>

<template>
  <div class="file-explorer">
    <!-- 未选择目录时显示选择按钮 -->
    <div v-if="!editorStore.hasSelectedDirectory" class="directory-selector">
      <button @click="selectDirectory" class="select-btn">
        <div class="icon">📁</div>
        <div class="text">选择文件夹</div>
        <div class="hint">点击选择要编辑的项目文件夹</div>
      </button>
    </div>

    <!-- 已选择目录时显示文件树 -->
    <div v-else class="file-tree-container">
      <div class="explorer-header">
        <div class="directory-info">
          <span class="directory-name">{{ rootDirectoryName }}</span>
          <div class="header-buttons">
            <button @click="showSettings = !showSettings" class="header-btn" title="浏览器设置">
              ⚙️
            </button>
            <button @click="changeDirectory" class="header-btn" title="更换目录">
              🔄
            </button>
          </div>
        </div>
        
        <!-- 设置面板 -->
        <div v-if="showSettings" class="settings-panel">
          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="localSettings.showNodeModules"
                @change="updateSettings"
              >
              显示 node_modules
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="localSettings.showHiddenFiles"
                @change="updateSettings"
              >
              显示隐藏文件
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="localSettings.showGitFiles"
                @change="updateSettings"
              >
              显示 .git 文件夹
            </label>
          </div>
        </div>
      </div>
      
      <div class="file-tree">
        <FileTreeItem 
          v-for="item in editorStore.fileTree" 
          :key="item.id" 
          :item="item" 
          :level="0"
          @toggle-folder="handleToggleFolder"
          @open-file="handleOpenFile"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">📂</div>
      <div class="loading-text">正在加载文件...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useEditorStore } from '../stores/editor'
import FileTreeItem from './FileTreeItem.vue'

const editorStore = useEditorStore()
const loading = ref(false)
const showSettings = ref(false)

// 本地设置状态
const localSettings = reactive({
  showNodeModules: false,
  showHiddenFiles: false,
  showGitFiles: false
})

// 计算根目录名称
const rootDirectoryName = computed(() => {
  return editorStore.rootDirectory?.name || '未选择目录'
})

// 更新设置
const updateSettings = () => {
  editorStore.updateExplorerSettings(localSettings)
}

// 检查浏览器是否支持 File System Access API
const isFileSystemAccessSupported = () => {
  return 'showDirectoryPicker' in window
}

// 选择目录
const selectDirectory = async () => {
  if (!isFileSystemAccessSupported()) {
    alert('您的浏览器不支持文件系统访问API。请使用最新版本的Chrome、Edge或其他支持的浏览器。')
    return
  }

  try {
    loading.value = true
    
    // 打开目录选择器
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite' // 需要读写权限以便保存文件
    })

    // 设置根目录
    editorStore.setRootDirectory(dirHandle)
    
    // 加载文件树
    await editorStore.loadFileTree()
    
    console.log('目录选择成功:', dirHandle.name)
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('选择目录失败:', error)
      alert('选择目录失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

// 更换目录
const changeDirectory = async () => {
  if (confirm('确定要更换目录吗？未保存的更改可能会丢失。')) {
    editorStore.resetState()
    await selectDirectory()
  }
}

// 处理文件夹切换
const handleToggleFolder = async (folder) => {
  console.log('切换文件夹:', folder.name)
  loading.value = true
  try {
    await editorStore.expandFolder(folder)
  } catch (error) {
    console.error('展开文件夹失败:', error)
  } finally {
    loading.value = false
  }
}

// 处理文件打开
const handleOpenFile = async (file) => {
  console.log('打开文件:', file.name)
  loading.value = true
  try {
    await editorStore.openFile(file)
  } catch (error) {
    console.error('打开文件失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.file-explorer {
  height: 100%;
  background: #252526;
  color: #cccccc;
  border-right: 1px solid #3e3e42;
  position: relative;
}

/* 目录选择器样式 */
.directory-selector {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.select-btn {
  background: #2d2d30;
  border: 2px dashed #3e3e42;
  border-radius: 8px;
  padding: 40px 20px;
  cursor: pointer;
  color: #cccccc;
  text-align: center;
  transition: all 0.3s ease;
  min-width: 200px;
}

.select-btn:hover {
  border-color: #007acc;
  background: #1e1e1e;
  color: #ffffff;
}

.select-btn .icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.select-btn .text {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.select-btn .hint {
  font-size: 12px;
  color: #999999;
  line-height: 1.4;
}

/* 文件树容器样式 */
.file-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.explorer-header {
  padding: 8px 12px;
  border-bottom: 1px solid #3e3e42;
  background: #2d2d30;
}

.directory-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.directory-name {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-btn {
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  font-size: 12px;
  margin-left: 8px;
}

.change-btn:hover {
  background: #3e3e42;
  color: #ffffff;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

/* 加载状态样式 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(37, 37, 38, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  font-size: 32px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #cccccc;
}

/* 滚动条样式 */
.file-tree::-webkit-scrollbar {
  width: 8px;
}

.file-tree::-webkit-scrollbar-track {
  background: #252526;
}

.file-tree::-webkit-scrollbar-thumb {
  background: #3e3e42;
  border-radius: 4px;
}

.file-tree::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}

.header-buttons {
  display: flex;
  gap: 4px;
}

.header-btn {
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  font-size: 12px;
}

.header-btn:hover {
  background: #3e3e42;
  color: #ffffff;
}

.settings-panel {
  position: absolute;
  /* top: 100%; */
  top: 40px;
  left: 0;
  right: 0;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-top: none;
  z-index: 10;
  padding: 8px 12px;
}

.setting-item {
  padding: 4px 0;
  font-size: 12px;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #cccccc;
}

.setting-item input[type="checkbox"] {
  accent-color: #007acc;
}
</style>

<template>
  <div class="code-editor">
    <div v-if="currentFile" class="editor-header">
      <div class="file-tab">
        <span class="file-icon">📄</span>
        <span class="file-name">{{ currentFile.name }}</span>
      </div>
    </div>
    <div 
      ref="editorContainer" 
      class="editor-container"
      :class="{ 'no-file': !currentFile }"
    >
      <div v-if="!currentFile" class="welcome-screen">
        <h2>欢迎使用简易代码编辑器</h2>
        <p>请从左侧文件浏览器中选择一个文件开始编辑</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useEditorStore } from '../stores/editor'
import { storeToRefs } from 'pinia'
import * as monaco from 'monaco-editor'

const editorContainer = ref(null)
let editor = null

const editorStore = useEditorStore()
const { currentFile, editorContent } = storeToRefs(editorStore)
const { updateFileContent } = editorStore

// 根据文件扩展名获取语言
const getLanguageFromFileName = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const languageMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'vue': 'html',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c'
  }
  return languageMap[ext] || 'plaintext'
}

// 初始化编辑器
const initEditor = async () => {
  console.log('初始化编辑器, currentFile:', currentFile.value) // 调试日志
  
  if (!editorContainer.value || !currentFile.value) {
    console.log('容器或文件不存在') // 调试日志
    return
  }

  await nextTick()

  if (editor) {
    console.log('销毁旧编辑器') // 调试日志
    editor.dispose()
    editor = null
  }

  const language = getLanguageFromFileName(currentFile.value.name)
  console.log('文件语言:', language, '内容:', editorContent.value) // 调试日志

  try {
    editor = monaco.editor.create(editorContainer.value, {
      value: editorContent.value || '',
      language: language,
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      minimap: {
        enabled: false
      },
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection'
    })

    console.log('编辑器创建成功') // 调试日志

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue()
      updateFileContent(value)
    })
  } catch (error) {
    console.error('创建编辑器失败:', error)
  }
}

// 监听当前文件变化
watch(currentFile, async (newFile, oldFile) => {
  console.log('currentFile 变化:', oldFile?.name, '->', newFile?.name) // 调试日志
  
  if (newFile) {
    await initEditor()
  } else if (editor) {
    editor.dispose()
    editor = null
  }
}, { immediate: true })

// 监听编辑器内容变化（外部更新）
watch(editorContent, (newContent) => {
  console.log('editorContent 变化:', newContent) // 调试日志
  if (editor && editor.getValue() !== newContent) {
    editor.setValue(newContent || '')
  }
})

onMounted(() => {
  console.log('CodeEditor mounted') // 调试日志
  
  // Monaco Editor 自动布局
  window.addEventListener('resize', () => {
    if (editor) {
      editor.layout()
    }
  })
})

onMounted(() => {
  console.log('CodeEditor mounted')
  
  // 添加快捷键支持
  const handleKeyDown = (event) => {
    // Ctrl+S 保存
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault()
      if (editorStore.currentFile) {
        editorStore.saveFile()
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  // Monaco Editor 自动布局
  window.addEventListener('resize', () => {
    if (editor) {
      editor.layout()
    }
  })
  
  // 清理事件监听器
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
.code-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.editor-header {
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  padding: 0;
}

.file-tab {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #1e1e1e;
  color: #cccccc;
  font-size: 13px;
  border-right: 1px solid #3e3e42;
}

.file-icon {
  margin-right: 6px;
  font-size: 12px;
}

.editor-container {
  flex: 1;
  position: relative;
}

.editor-container.no-file {
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-screen {
  text-align: center;
  color: #cccccc;
}

.welcome-screen h2 {
  color: #ffffff;
  margin-bottom: 16px;
}

.welcome-screen p {
  color: #999999;
  font-size: 14px;
}
</style>

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  // 文件树数据
  const fileTree = ref([])
  
  // 当前选择的根目录
  const rootDirectory = ref(null)
  
  // 当前打开的文件
  const currentFile = ref(null)
  
  // 当前编辑器内容
  const editorContent = ref('')
  
  // 是否已选择目录
  const hasSelectedDirectory = ref(false)

  // 设置根目录
  const setRootDirectory = (directory) => {
    rootDirectory.value = directory
    hasSelectedDirectory.value = true
  }

  // 加载文件树
  const loadFileTree = async () => {
    if (rootDirectory.value) {
      fileTree.value = await buildFileTree(rootDirectory.value)
    }
  }

  // 展开文件夹
  const expandFolder = async (folder) => {
    if (folder.type === 'directory' && folder.children.length === 0) {
      try {
        folder.children = await buildFileTree(folder.handle, folder.path)
      } catch (error) {
        console.error('展开文件夹失败:', error)
      }
    }
    folder.expanded = !folder.expanded
  }

  // 读取文件内容
  const readFileContent = async (fileHandle) => {
    try {
      const file = await fileHandle.getFile()
      const content = await file.text()
      return content
    } catch (error) {
      console.error('读取文件失败:', error)
      return ''
    }
  }

  // 打开文件
  const openFile = async (file) => {
    console.log('打开文件:', file.name)
    
    if (file.type === 'file') {
      const content = await readFileContent(file.handle)
      
      currentFile.value = {
        ...file,
        content: content
      }
      editorContent.value = content
    }
  }

  // 更新文件内容
  const updateFileContent = (content) => {
    editorContent.value = content
    if (currentFile.value) {
      currentFile.value.content = content
      currentFile.value.modified = true
    }
  }

  // 保存文件
  const saveFile = async () => {
    if (!currentFile.value || !currentFile.value.handle) {
      return false
    }

    try {
      const writable = await currentFile.value.handle.createWritable()
      await writable.write(editorContent.value)
      await writable.close()
      
      currentFile.value.modified = false
      console.log('文件保存成功:', currentFile.value.name)
      return true
    } catch (error) {
      console.error('保存文件失败:', error)
      return false
    }
  }

  // 重置状态
  const resetState = () => {
    fileTree.value = []
    rootDirectory.value = null
    currentFile.value = null
    editorContent.value = ''
    hasSelectedDirectory.value = false
  }

// 文件浏览器设置
  const explorerSettings = ref({
    showHiddenFiles: false,
    showNodeModules: false,
    showGitFiles: false
  })

  // 构建文件树结构 (更新版本)
  const buildFileTree = async (dirHandle, path = '') => {
    const items = []
    
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        // 根据设置决定是否跳过某些文件/文件夹
        if (shouldSkipItem(name)) {
          continue
        }

        const item = {
          id: `${path}/${name}`,
          name: name,
          type: handle.kind,
          handle: handle,
          expanded: false,
          path: path ? `${path}/${name}` : name
        }

        if (handle.kind === 'directory') {
          item.children = []
        }

        items.push(item)
      }
    } catch (error) {
      console.error('读取目录失败:', error)
    }

    return items.sort((a, b) => {
      // 文件夹排在前面，然后按名称排序
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }

  // 判断是否跳过某个文件/文件夹
  const shouldSkipItem = (name) => {
    // 隐藏文件
    if (name.startsWith('.') && !explorerSettings.value.showHiddenFiles) {
      // 但是一些重要的配置文件还是要显示
      const importantDotFiles = ['.env', '.gitignore', '.eslintrc', '.prettierrc', '.vscode']
      if (!importantDotFiles.some(file => name.startsWith(file))) {
        return true
      }
    }

    // node_modules
    if (name === 'node_modules' && !explorerSettings.value.showNodeModules) {
      return true
    }

    // Git 文件
    if (name === '.git' && !explorerSettings.value.showGitFiles) {
      return true
    }

    // 其他常见的应该跳过的文件夹
    const skipFolders = ['dist', 'build', '.next', '.nuxt', 'coverage', '.nyc_output']
    if (skipFolders.includes(name)) {
      return true
    }

    return false
  }

  // 更新浏览器设置
  const updateExplorerSettings = (newSettings) => {
    explorerSettings.value = { ...explorerSettings.value, ...newSettings }
    // 重新加载文件树
    if (rootDirectory.value) {
      loadFileTree()
    }
  }

  return {
    fileTree,
    rootDirectory,
    currentFile,
    editorContent,
    hasSelectedDirectory,
    setRootDirectory,
    loadFileTree,
    expandFolder,
    openFile,
    updateFileContent,
    saveFile,
    resetState,
    explorerSettings,
    updateExplorerSettings
  }
})

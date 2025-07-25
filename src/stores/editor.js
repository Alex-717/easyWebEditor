import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  // 文件树数据
  const fileTree = ref([])
  
  // 当前选择的根目录 (保持原始的 FileSystemDirectoryHandle)
  const rootDirectory = ref(null)
  
  // 终端专用的目录树结构 (新增)
  const terminalDirectoryTree = ref(null)
  
  // 当前打开的文件
  const currentFile = ref(null)
  
  // 当前编辑器内容
  const editorContent = ref('')
  
  // 是否已选择目录
  const hasSelectedDirectory = ref(false)

  // 文件内容缓存
  const fileContents = ref(new Map())

  // 文件浏览器设置
  const explorerSettings = ref({
    showHiddenFiles: false,
    showNodeModules: false,
    showGitFiles: false
  })

  // 设置根目录 - 修复版本
  const setRootDirectory = async (directory) => {
    // 保持原始的 FileSystemDirectoryHandle 用于文件浏览器
    rootDirectory.value = directory
    hasSelectedDirectory.value = true
    
    // 同时构建终端专用的目录树结构
    if (directory) {
      terminalDirectoryTree.value = await buildDirectoryTreeForTerminal(directory)
      console.log('终端目录树构建完成:', terminalDirectoryTree.value)
    }
  }

  // 构建完整目录树结构（用于终端访问）
  const buildDirectoryTreeForTerminal = async (dirHandle, name = null) => {
    const dirName = name || dirHandle.name
    const children = []

    try {
      for await (const [entryName, entryHandle] of dirHandle.entries()) {
        // 终端需要显示所有文件，不应用浏览器的过滤规则
        if (entryHandle.kind === 'directory') {
          // 递归处理子目录
          const subDir = await buildDirectoryTreeForTerminal(entryHandle, entryName)
          children.push(subDir)
        } else if (entryHandle.kind === 'file') {
          // 添加文件
          children.push({
            name: entryName,
            handle: entryHandle,
            isDirectory: false,
            type: 'file'
          })
        }
      }
    } catch (error) {
      console.error('构建终端目录树时出错:', error)
    }

    return {
      name: dirName,
      handle: dirHandle,
      isDirectory: true,
      type: 'directory',
      children: children
    }
  }

  // 加载文件树（用于文件浏览器显示） - 保持原来的逻辑
  const loadFileTree = async () => {
    if (rootDirectory.value) {
      fileTree.value = await buildFileTree(rootDirectory.value)
    }
  }

  // 展开文件夹 - 保持原来的逻辑
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

  // 读取文件内容 - 支持缓存
  const readFileContent = async (fileHandle) => {
    try {
      // 检查缓存
      if (fileContents.value.has(fileHandle)) {
        return fileContents.value.get(fileHandle)
      }

      // 从文件系统读取
      const file = await fileHandle.getFile()
      const content = await file.text()
      
      // 缓存内容
      fileContents.value.set(fileHandle, content)
      
      return content
    } catch (error) {
      console.error('读取文件失败:', error)
      return ''
    }
  }

  // 打开文件 - 保持原来的逻辑
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

  // 更新文件内容 - 同步更新缓存
  const updateFileContent = (content) => {
    editorContent.value = content
    
    if (currentFile.value) {
      currentFile.value.content = content
      currentFile.value.modified = true
      
      // 更新缓存
      if (currentFile.value.handle) {
        fileContents.value.set(currentFile.value.handle, content)
      }
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
      
      // 更新缓存
      fileContents.value.set(currentFile.value.handle, editorContent.value)
      
      console.log('文件保存成功:', currentFile.value.name)
      return true
    } catch (error) {
      console.error('保存文件失败:', error)
      return false
    }
  }

  // 查找文件（用于终端） - 使用终端目录树
  const findFileByName = (filename) => {
    if (!terminalDirectoryTree.value) {
      return null
    }

    const searchInDirectory = (dir) => {
      if (!dir || !dir.children) {
        return null
      }

      for (const child of dir.children) {
        if (child.name === filename && !child.isDirectory) {
          return child
        }
        
        if (child.isDirectory) {
          const found = searchInDirectory(child)
          if (found) return found
        }
      }
      return null
    }

    return searchInDirectory(terminalDirectoryTree.value)
  }

  // 获取所有JavaScript文件（用于终端Tab补全）
  const getAllJavaScriptFiles = () => {
    const files = []
    
    const searchInDirectory = (dir) => {
      if (!dir || !dir.children) return
      
      for (const child of dir.children) {
        if (!child.isDirectory && (child.name.endsWith('.js') || child.name.endsWith('.mjs') || child.name.endsWith('.ts'))) {
          files.push(child.name)
        }
        if (child.isDirectory) {
          searchInDirectory(child)
        }
      }
    }

    if (terminalDirectoryTree.value) {
      searchInDirectory(terminalDirectoryTree.value)
    }
    
    return files
  }

  // 获取目录内容（用于终端ls命令）
  const getDirectoryContents = (dirPath = '') => {
    if (!terminalDirectoryTree.value) {
      return []
    }

    // 如果是根目录
    if (!dirPath) {
      return terminalDirectoryTree.value.children || []
    }

    // 查找指定路径的目录
    const findDirectory = (dir, pathParts) => {
      if (pathParts.length === 0) {
        return dir
      }

      const [currentPart, ...remainingParts] = pathParts
      const child = dir.children?.find(c => c.name === currentPart && c.isDirectory)
      
      if (child) {
        return findDirectory(child, remainingParts)
      }
      
      return null
    }

    const pathParts = dirPath.split('/').filter(part => part)
    const targetDir = findDirectory(terminalDirectoryTree.value, pathParts)
    
    return targetDir ? (targetDir.children || []) : []
  }

  // 重置状态
  const resetState = () => {
    fileTree.value = []
    rootDirectory.value = null
    terminalDirectoryTree.value = null
    currentFile.value = null
    editorContent.value = ''
    hasSelectedDirectory.value = false
    fileContents.value.clear()
  }

  // 构建文件树结构 (用于文件浏览器显示) - 保持原来的逻辑
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

  // 判断是否跳过某个文件/文件夹 - 保持原来的逻辑
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

  // 更新浏览器设置 - 保持原来的逻辑
  const updateExplorerSettings = (newSettings) => {
    explorerSettings.value = { ...explorerSettings.value, ...newSettings }
    // 重新加载文件树
    if (rootDirectory.value) {
      loadFileTree()
    }
  }

  return {
    // 原有的属性和方法
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
    updateExplorerSettings,
    
    // 新增的用于终端的属性和方法
    fileContents,
    terminalDirectoryTree,
    findFileByName,
    getAllJavaScriptFiles,
    getDirectoryContents,
    readFileContent
  }
})

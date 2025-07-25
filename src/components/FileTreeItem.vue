<template>
  <div class="file-tree-item">
    <div 
      class="item-content"
      :class="{ 
        'selected': isSelected,
        'node-modules': isNodeModules,
        'hidden-file': isHiddenFile
      }"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      @click="handleClick"
    >
      <span v-if="item.type === 'directory'" class="folder-icon">
        {{ item.expanded ? '📂' : '📁' }}
      </span>
      <span v-else class="file-icon">{{ getFileIcon(item.name) }}</span>
      <span class="item-name">{{ item.name }}</span>
      <span v-if="item.modified" class="modified-dot">●</span>
    </div>
    
    <!-- 如果是 node_modules，显示警告 -->
    <div v-if="isNodeModules && item.expanded" class="node-modules-warning">
      ⚠️ node_modules 包含大量文件，展开可能较慢
    </div>

    <div v-if="item.type === 'directory' && item.expanded && item.children">
      <FileTreeItem
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :level="level + 1"
        @toggle-folder="$emit('toggle-folder', $event)"
        @open-file="$emit('open-file', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['toggle-folder', 'open-file'])

const editorStore = useEditorStore()

const isSelected = computed(() => {
  return editorStore.currentFile?.id === props.item.id
})

// 根据文件扩展名获取图标
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const iconMap = {
    // 前端文件
    'vue': '🟢',
    'js': '🟨',
    'ts': '🔷',
    'jsx': '⚛️',
    'tsx': '⚛️',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'sass': '🎨',
    'less': '🎨',
    
    // 配置文件
    'json': '📋',
    'xml': '📋',
    'yaml': '📋',
    'yml': '📋',
    'toml': '📋',
    'ini': '📋',
    
    // 文档文件
    'md': '📝',
    'txt': '📄',
    'doc': '📄',
    'docx': '📄',
    'pdf': '📕',
    
    // 编程语言
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'h': '⚙️',
    'php': '🐘',
    'rb': '💎',
    'go': '🐹',
    'rs': '🦀',
    'swift': '🐦',
    'kt': '🟣',
    'scala': '🔴',
    
    // 数据库
    'sql': '🗄️',
    'db': '🗄️',
    'sqlite': '🗄️',
    
    // 图片
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'svg': '🖼️',
    'ico': '🖼️',
    
    // 其他
    'zip': '📦',
    'tar': '📦',
    'gz': '📦',
    'env': '🔧',
    'gitignore': '📋',
    'dockerfile': '🐳'
  }
  
  return iconMap[ext] || '📄'
}

const handleClick = () => {
  console.log('点击了:', props.item.name, props.item.type)
  if (props.item.type === 'directory') {
    emit('toggle-folder', props.item)
  } else {
    emit('open-file', props.item)
  }
}

const isNodeModules = computed(() => {
  return props.item.name === 'node_modules'
})

const isHiddenFile = computed(() => {
  return props.item.name.startsWith('.')
})
</script>

<style scoped>
.item-content {
  display: flex;
  align-items: center;
  padding: 3px 8px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  line-height: 22px;
}

.item-content:hover {
  background: #2a2d2e;
}

.item-content.selected {
  background: #094771;
  color: #ffffff;
}

.folder-icon,
.file-icon {
  margin-right: 6px;
  font-size: 12px;
  width: 16px;
  text-align: center;
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modified-dot {
  color: #ffcc00;
  font-size: 8px;
  margin-left: 4px;
}

.item-content.node-modules {
  color: #ffa500;
  font-style: italic;
}

.item-content.hidden-file {
  opacity: 0.6;
}

.node-modules-warning {
  padding: 4px 8px;
  font-size: 11px;
  color: #ffa500;
  background: rgba(255, 165, 0, 0.1);
  margin: 2px 0;
}
</style>

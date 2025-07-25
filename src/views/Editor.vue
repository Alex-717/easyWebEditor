<template>
  <div class="editor-layout">
    <div class="sidebar">
      <FileExplorer />
    </div>
    <div class="main-content">
      <CodeEditor />
    </div>
  </div>
</template>

<script setup>
import FileExplorer from '../components/FileExplorer.vue'
import CodeEditor from '../components/CodeEditor.vue'
</script>

<style scoped>
.editor-layout {
  display: flex;
  height: 100vh;
  background: #1e1e1e;
}

.sidebar {
  width: 300px;
  min-width: 200px;
  max-width: 500px;
  resize: horizontal;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>

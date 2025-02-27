<template>
  <div class="file-list">
    <div class="list-header">
      <div class="header-left">
        <h3>已上传文件</h3>
        <el-tag type="info">{{ selectedFiles.length }} / {{ files.length }}</el-tag>
      </div>
      <div class="header-actions">
        <el-button
          type="danger"
          :disabled="!selectedFiles.length"
          @click="handleBatchDelete"
        >
          批量删除
        </el-button>
      </div>
    </div>

    <el-table
      ref="tableRef"
      :data="files"
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      
      <el-table-column label="文件名" min-width="200">
        <template #default="{ row }">
          <div class="file-name">
            {{ row.name }}
            <el-tag 
              v-if="row.cleanStatus"
              :type="getCleanStatusType(row.cleanStatus)"
              size="small"
            >
              {{ row.cleanStatus }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="所属银行" width="200">
        <template #default="{ row }">
          <el-select
            v-model="row.bankName"
            placeholder="请选择银行"
            clearable
            filterable
            allow-create
            size="small"
            style="width: 100%"
            @change="(value) => handleBankChange(row, value)"
          >
            <el-option
              v-for="bank in bankList"
              :key="bank"
              :label="bank"
              :value="bank"
            />
          </el-select>
        </template>
      </el-table-column>
      
      <el-table-column label="文件类型" width="150">
        <template #default="{ row }">
          <el-select
            v-model="row.fileType"
            placeholder="请选择类型"
            size="small"
            style="width: 100%"
            @change="(value) => handleTypeChange(row, value)"
          >
            <el-option label="储蓄卡明细" value="debit" />
            <el-option label="信用卡明细" value="credit" />
            <el-option label="开户信息" value="account" />
          </el-select>
        </template>
      </el-table-column>
      
      <el-table-column prop="size" label="大小" width="100">
        <template #default="{ row }">
          {{ formatFileSize(row.size) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              link
              @click="handlePreview(row)"
            >
              预览
            </el-button>
            <el-button
              type="success"
              link
              :disabled="!canSaveMapping(row)"
              @click="handleSaveMapping(row)"
            >
              保存配置
            </el-button>
            <el-button
              type="danger"
              link
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  files: {
    type: Array,
    required: true
  },
  selectedFiles: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'selection-change',
  'delete-files',
  'preview-file',
  'bank-type-change',
  'save-mapping'
])

const tableRef = ref(null)

// 银行列表
const bankList = [
  '工商银行', '农业银行', '中国银行', '建设银行', '交通银行',
  '招商银行', '浦发银行', '中信银行', '光大银行', '华夏银行',
  '民生银行', '广发银行', '平安银行', '兴业银行'
]

// 计算属性
const canSaveMapping = (file) => {
  return file.bankName && file.fileType
}

// 方法
function handleSelectionChange(selection) {
  emit('selection-change', selection)
}

function handlePreview(file) {
  emit('preview-file', file)
}

function handleDelete(file) {
  ElMessageBox.confirm(
    `确定要删除文件 ${file.name} 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    emit('delete-files', [file])
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function handleBatchDelete() {
  if (!props.selectedFiles.length) return
  
  ElMessageBox.confirm(
    `确定要删除选中的 ${props.selectedFiles.length} 个文件吗？`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    emit('delete-files', props.selectedFiles)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function handleBankChange(file, value) {
  file.bankName = value
  file.cleanStatus = undefined // 重置清洗状态
  emit('bank-type-change', file)
}

function handleTypeChange(file, value) {
  file.fileType = value
  file.cleanStatus = undefined // 重置清洗状态
  emit('bank-type-change', file)
}

function handleSaveMapping(file) {
  if (!canSaveMapping(file)) return
  emit('save-mapping', file)
  ElMessage.success('配置已保存')
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getCleanStatusType(status) {
  switch (status) {
    case '已清洗':
      return 'success'
    case '深度清洗完成':
      return 'success'
    case '清洗失败':
      return 'danger'
    default:
      return 'info'
  }
}
</script>

<style scoped>
.file-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 2px;
}

:deep(.el-select:hover .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-border-color-hover) inset;
}

:deep(.el-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
}
</style> 
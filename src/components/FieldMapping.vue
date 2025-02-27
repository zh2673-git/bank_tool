<template>
  <div class="field-mapping">
    <div class="mapping-header">
      <div class="header-left">
        <h3>字段映射管理</h3>
      </div>
      <div class="header-actions">
        <el-button-group>
          <el-button
            type="primary"
            @click="handleExportConfig"
          >
            导出字段映射配置
          </el-button>
          <el-button
            type="success"
            @click="handleImportConfig"
          >
            导入字段映射配置
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="mapping-content">
      <el-tabs v-model="activeTab" class="mapping-tabs">
        <el-tab-pane label="储蓄卡明细" name="debit">
          <bank-mapping-table
            :bank-list="bankList"
            :file-type="'debit'"
            :mappings="debitMappings"
            :original-fields="originalFields"
            @mapping-change="handleMappingChange"
          />
        </el-tab-pane>
        <el-tab-pane label="信用卡明细" name="credit">
          <bank-mapping-table
            :bank-list="bankList"
            :file-type="'credit'"
            :mappings="creditMappings"
            :original-fields="originalFields"
            @mapping-change="handleMappingChange"
          />
        </el-tab-pane>
        <el-tab-pane label="开户信息" name="account">
          <bank-mapping-table
            :bank-list="bankList"
            :file-type="'account'"
            :mappings="accountMappings"
            :original-fields="originalFields"
            @mapping-change="handleMappingChange"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 导入配置对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入字段映射配置"
      width="500px"
    >
      <div class="upload-area">
        <el-upload
          ref="uploadRef"
          action=""
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="fileList"
          :accept="'.json'"
        >
          <template #trigger>
            <el-button type="primary">选择配置文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">
              请选择导出的JSON格式配置文件
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmImport">确认导入</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      title="映射预览"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item
          v-for="field in mappingFields"
          :key="field.standardField"
          :label="field.standardField"
        >
          {{ field.originalFields.join(', ') || '未映射' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { saveMappingConfig, getMappingConfig, getStandardFields, exportAllConfigs, importConfigs } from '../utils/mappingStorage'
import BankMappingTable from './BankMappingTable.vue'

const props = defineProps({
  bankList: {
    type: Array,
    default: () => []
  },
  mappingUpdates: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['mapping-saved'])

// 状态变量
const saving = ref(false)
const activeTab = ref('debit')
const originalFields = ref([])
const showImportDialog = ref(false)
const fileList = ref([])
const uploadRef = ref(null)
const previewData = ref([])
const headerRowIndex = ref(0)

// 各类型的映射数据
const debitMappings = ref([])
const creditMappings = ref([])
const accountMappings = ref([])

// 标准字段列表
const standardFields = computed(() => {
  return getStandardFields(activeTab.value)
})

// 计算属性
const canSave = computed(() => {
  return activeTab.value && (
    debitMappings.value.length > 0 ||
    creditMappings.value.length > 0 ||
    accountMappings.value.length > 0
  )
})

const hasAnyChanges = computed(() => {
  return canSave.value
})

const canImport = computed(() => {
  return fileList.value.length > 0
})

const canPreview = computed(() => {
  return debitMappings.value.some(mapping => Object.values(mapping.mappings).length > 0) ||
    creditMappings.value.some(mapping => Object.values(mapping.mappings).length > 0) ||
    accountMappings.value.some(mapping => Object.values(mapping.mappings).length > 0)
})

// 方法
function getFileTypeText(type) {
  const typeMap = {
    'debit': '储蓄卡明细',
    'credit': '信用卡明细',
    'account': '开户信息'
  }
  return typeMap[type] || '未选择类型'
}

function getFieldDescription(field) {
  // 这里可以添加字段的详细说明
  const descriptions = {
    '交易日期': '银行交易发生的日期，格式：YYYY-MM-DD',
    '交易时间': '银行交易发生的时间，格式：HH:mm:ss',
    '交易金额': '交易的具体金额，正数表示收入，负数表示支出',
    '交易类型': '交易的具体类型，如：转账、取现等',
    '交易对手': '交易的对方账户名称',
    '对方账号': '交易的对方账户号码',
    '交易摘要': '交易的具体说明或备注',
    '账户余额': '交易后的账户余额',
    // ... 可以添加更多字段的说明
  }
  return descriptions[field] || field
}

function hasMappingChanges(row) {
  const original = initialMapping.value[row.bankName] || {}
  return JSON.stringify(row.mappings) !== JSON.stringify(original)
}

function handleSaveRow(row) {
  saveMappingConfig(row.bankName, activeTab.value, row.mappings)
    .then(() => {
      ElMessage.success(`保存 ${row.bankName} 的映射成功`)
      initialMapping.value[row.bankName] = { ...row.mappings }
    })
    .catch(error => {
      ElMessage.error(`保存失败: ${error.message}`)
    })
}

async function loadBankMappings() {
  try {
    // 清空现有映射
    debitMappings.value = []
    creditMappings.value = []
    accountMappings.value = []
    
    // 为每个银行加载映射
    for (const bankName of props.bankList) {
      // 加载储蓄卡明细映射
      const debitMapping = await getMappingConfig(bankName, 'debit')
      if (debitMapping && Object.keys(debitMapping).length > 0) {
        debitMappings.value.push({
          bankName,
          mappings: debitMapping,
          id: `${bankName}_debit`
        })
      }
      
      // 加载信用卡明细映射
      const creditMapping = await getMappingConfig(bankName, 'credit')
      if (creditMapping && Object.keys(creditMapping).length > 0) {
        creditMappings.value.push({
          bankName,
          mappings: creditMapping,
          id: `${bankName}_credit`
        })
      }
      
      // 加载开户信息映射
      const accountMapping = await getMappingConfig(bankName, 'account')
      if (accountMapping && Object.keys(accountMapping).length > 0) {
        accountMappings.value.push({
          bankName,
          mappings: accountMapping,
          id: `${bankName}_account`
        })
      }
    }
    
    console.log('已加载的映射:', {
      debit: debitMappings.value,
      credit: creditMappings.value,
      account: accountMappings.value
    })
  } catch (error) {
    console.error('加载映射配置失败:', error)
    ElMessage.error('加载映射配置失败：' + error.message)
  }
}

async function handleSave() {
  if (!canSave.value) return
  
  try {
    saving.value = true
    
    // 保存所有类型的映射
    for (const mapping of debitMappings.value) {
      await saveMappingConfig(mapping.bankName, 'debit', mapping.mappings)
    }
    
    for (const mapping of creditMappings.value) {
      await saveMappingConfig(mapping.bankName, 'credit', mapping.mappings)
    }
    
    for (const mapping of accountMappings.value) {
      await saveMappingConfig(mapping.bankName, 'account', mapping.mappings)
    }
    
    ElMessage.success('所有映射保存成功')
    emit('mapping-saved')
  } catch (error) {
    console.error('保存映射失败:', error)
    ElMessage.error('保存映射失败：' + error.message)
  } finally {
    saving.value = false
  }
}

function handleReset() {
  loadBankMappings()
}

function handleFieldChange(row) {
  // 触发变更检测
  debitMappings.value = [...debitMappings.value]
  creditMappings.value = [...creditMappings.value]
  accountMappings.value = [...accountMappings.value]
}

function handleExportConfig() {
  try {
    const configStr = exportAllConfigs()
    if (!configStr) {
      ElMessage.warning('没有可导出的配置')
      return
    }

    // 创建Blob对象
    const blob = new Blob([configStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    // 创建下载链接
    const link = document.createElement('a')
    link.href = url
    link.download = `bank_mapping_config_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('配置导出成功')
  } catch (error) {
    console.error('导出配置失败:', error)
    ElMessage.error('导出配置失败：' + error.message)
  }
}

function handleImportConfig() {
  showImportDialog.value = true
  fileList.value = []
}

async function handleFileChange(file) {
  fileList.value = [file]
}

async function confirmImport() {
  if (!fileList.value.length) {
    ElMessage.warning('请先选择配置文件')
    return
  }

  try {
    const file = fileList.value[0].raw
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const configStr = e.target.result
        const success = importConfigs(configStr)
        
        if (success) {
          ElMessage.success('配置导入成功')
          showImportDialog.value = false
          // 重新加载映射数据
          loadBankMappings()
        } else {
          throw new Error('导入失败')
        }
      } catch (error) {
        console.error('导入配置失败:', error)
        ElMessage.error('导入配置失败：' + error.message)
      }
    }
    
    reader.onerror = () => {
      ElMessage.error('读取文件失败')
    }
    
    reader.readAsText(file)
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error(error.message)
  }
}

// 监听 activeTab 变化
watch(activeTab, () => {
  // 切换标签时重新加载映射
  loadBankMappings()
})

// 监听映射更新
watch(() => props.mappingUpdates, (newUpdates) => {
  if (newUpdates.bankName && newUpdates.fileType && newUpdates.mapping) {
    const { bankName, fileType, mapping } = newUpdates
    const mappingsRef = {
      debit: debitMappings,
      credit: creditMappings,
      account: accountMappings
    }[fileType]
    
    if (mappingsRef) {
      const bankMapping = mappingsRef.value.find(m => m.bankName === bankName)
      if (bankMapping) {
        // 检查是否已存在相同的映射
        const existingIndex = bankMapping.mappings.findIndex(m => 
          JSON.stringify(m) === JSON.stringify(mapping)
        )
        
        if (existingIndex === -1) {
          // 添加新的映射配置
          bankMapping.mappings.push({
            ...mapping,
            id: `${bankName}_${fileType}_${bankMapping.mappings.length}`,
            isDefault: bankMapping.mappings.length === 0
          })
        }
        
        // 触发响应式更新
        mappingsRef.value = [...mappingsRef.value]
      }
    }
  }
}, { deep: true })

// 初始化
onMounted(() => {
  loadBankMappings()
})

// 处理映射变化
const handleMappingChange = async ({ bankName, fileType, mapping }) => {
  try {
    // 根据文件类型选择对应的映射数组
    const mappingsRef = {
      debit: debitMappings,
      credit: creditMappings,
      account: accountMappings
    }[fileType]
    
    if (!mappingsRef) return
    
    // 查找或创建银行映射
    let bankMapping = mappingsRef.value.find(m => m.bankName === bankName)
    if (!bankMapping) {
      bankMapping = {
        bankName,
        mappings: {},
        id: `${bankName}_${fileType}`
      }
      mappingsRef.value.push(bankMapping)
    }
    
    // 更新映射
    bankMapping.mappings = mapping
    
    // 保存到存储
    await saveMappingConfig(bankName, fileType, mapping)
    
    ElMessage.success('映射更新成功')
  } catch (error) {
    console.error('更新映射失败:', error)
    ElMessage.error('更新映射失败：' + error.message)
  }
}
</script>

<style scoped>
.field-mapping {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  padding: 20px;
}

.mapping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background-color: white;
  padding: 16px;
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mapping-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mapping-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  overflow: hidden;
}

.mapping-tabs {
  height: 100%;
}

:deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: auto;
}

:deep(.el-tab-pane) {
  height: 100%;
}

/* 调整表格样式 */
:deep(.el-table) {
  --el-table-header-bg-color: var(--el-color-primary-light-9);
  --el-table-border-color: var(--el-border-color-lighter);
  --el-table-header-text-color: var(--el-color-primary);
  --el-table-row-hover-bg-color: var(--el-color-primary-light-9);
}

:deep(.el-table__header) {
  font-weight: 600;
}

:deep(.el-table__row) {
  height: 60px;
}

:deep(.el-table__header-cell) {
  background-color: var(--el-color-primary-light-9) !important;
  color: var(--el-color-primary) !important;
  font-weight: bold !important;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-tag) {
  font-size: 14px;
  padding: 6px 12px;
}

:deep(.el-table .cell) {
  padding: 8px;
}

:deep(.el-table__fixed-right) {
  height: 100% !important;
  background-color: var(--el-bg-color);
}

:deep(.el-table__fixed-right-patch) {
  background-color: var(--el-color-primary-light-9);
}

.upload-area {
  padding: 20px;
  text-align: center;
}

:deep(.el-upload__tip) {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.preview-section {
  margin-top: 20px;
  width: 100%;
}

.preview-header {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

/* 新增样式 */
:deep(.el-select-dropdown__item) {
  padding: 0 12px;
  height: 32px;
  line-height: 32px;
}

:deep(.el-select__tags) {
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 2px;
}

:deep(.el-select__tags-text) {
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-table__body-wrapper) {
  overflow-x: auto !important;
}

:deep(.el-table__fixed-right-patch) {
  background-color: var(--el-color-primary-light-9);
}
</style> 
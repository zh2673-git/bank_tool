<template>
  <div class="preview-area" :style="{ fontSize: `${fontSize}px` }">
    <div class="preview-header">
      <div class="header-left">
        <h3>数据预览</h3>
        <el-tag v-if="fileType" type="info" size="small">{{ fileTypeText }}</el-tag>
      </div>
      <div class="preview-actions">
        <el-radio-group v-model="dataType" size="small" class="data-type-selector">
          <el-radio-button value="original">原始数据</el-radio-button>
          <el-radio-button value="preliminary">初洗数据</el-radio-button>
          <el-radio-button value="deep">深洗数据</el-radio-button>
        </el-radio-group>
        <el-button-group>
          <el-button
            type="primary"
            :icon="ZoomIn"
            @click="handleZoomIn"
          >
            放大
          </el-button>
          <el-button
            type="primary"
            :icon="ZoomOut"
            @click="handleZoomOut"
          >
            缩小
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="preview-content">
      <div class="table-wrapper">
        <el-table
          :data="paginatedData"
          border
          stripe
          :max-height="tableHeight"
          style="width: 100%"
        >
          <el-table-column
            type="index"
            label="序号"
            width="60"
            fixed="left"
          />
          
          <el-table-column
            v-for="(header, index) in headers"
            :key="index"
            min-width="150"
            show-overflow-tooltip
          >
            <template #header>
              <div class="column-header">
                <el-select
                  v-if="dataType === 'original'"
                  v-model="columnMappings[index]"
                  placeholder="选择标准字段"
                  size="small"
                  clearable
                  @change="(value) => handleColumnMappingChange(index, value)"
                >
                  <el-option
                    v-for="field in standardFields"
                    :key="field"
                    :label="field"
                    :value="field"
                  />
                </el-select>
                <div class="original-header" :class="{ 'no-select': dataType !== 'original' }">
                  {{ header || `列${index + 1}` }}
                </div>
              </div>
            </template>
            <template #default="{ row }">
              <span :class="getCellClass(row[header], header)">
                {{ formatCellValue(row[header], header) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="preview-footer">
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalRows"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { preliminaryCleaning, deepCleaning } from '../utils/dataCleaning'
import { ElMessage } from 'element-plus'
import { getStandardFields, getMappingConfig } from '../utils/mappingStorage'

const props = defineProps({
  fileData: {
    type: Array,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  cleanedData: {
    type: Array,
    default: () => []
  },
  deepCleanedData: {
    type: Array,
    default: () => []
  },
  bankName: {
    type: String,
    default: ''
  },
  mapping: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:cleanedData', 'update:deepCleanedData', 'standard-field-change'])

// 状态变量
const currentSheetName = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const fontSize = ref(14)
const tableHeight = ref(500)
const dataType = ref('original')
const selectedStandardField = ref('')
const columnMappings = ref({})

// 文件类型显示文本
const fileTypeText = computed(() => {
  const typeMap = {
    'excel': 'Excel文件',
    'csv': 'CSV文件',
    'txt': '文本文件',
    'pdf': 'PDF文件'
  }
  return typeMap[props.fileType] || props.fileType
})

// 是否有多个sheet
const hasSheets = computed(() => {
  return props.fileType === 'excel' && props.fileData.sheets && props.fileData.sheets.length > 0
})

// 所有sheet
const sheets = computed(() => {
  return hasSheets.value ? props.fileData.sheets : []
})

// 当前显示的数据
const currentData = computed(() => {
  // 根据选择的数据类型返回相应数据
  switch (dataType.value) {
    case 'preliminary':
      return props.cleanedData || []
    case 'deep':
      return props.deepCleanedData || []
    default:
      if (Array.isArray(props.fileData)) {
        return props.fileData
      }
      return []
  }
})

// 表格列
const tableColumns = computed(() => {
  return currentData.value[0] || []
})

// 总数据量
const totalRows = computed(() => {
  if (!currentData.value) return 0
  // 总行数是数据行数（不包括标题行）
  return Math.max(0, currentData.value.length - 1)
})

// 表格数据
const paginatedData = computed(() => {
  const data = currentData.value
  if (!data || data.length === 0) return []
  
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  
  return data.slice(start, end).map(row => {
    // 如果是对象，直接返回
    if (typeof row === 'object' && !Array.isArray(row)) {
      return row
    }
    // 如果是数组，转换为对象
    const rowData = {}
    headers.value.forEach((header, index) => {
      rowData[header] = Array.isArray(row) ? (row[index] || '') : ''
    })
    return rowData
  })
})

// 表格列
const headers = computed(() => {
  const data = currentData.value
  if (!data || data.length === 0) return []
  
  // 如果第一行是对象，使用其键作为标题
  if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
    return Object.keys(data[0])
  }
  
  // 如果是数组，使用第一行作为标题
  if (Array.isArray(data[0])) {
    return data[0].map(header => header || '')
  }
  
  return []
})

// 标准字段列表
const standardFields = computed(() => {
  return getStandardFields(props.fileType)
})

// 方法
function updateTableHeight() {
  nextTick(() => {
    const windowHeight = window.innerHeight
    const toolbarHeight = 56 // 工具栏高度
    const paginationHeight = 48 // 分页器高度
    const padding = 120 // 上下padding和其他间距
    tableHeight.value = windowHeight - toolbarHeight - paginationHeight - padding
  })
}

function handleSizeChange(val) {
  pageSize.value = val
  currentPage.value = 1
}

function handleCurrentChange(val) {
  currentPage.value = val
}

function handleZoomIn() {
  if (fontSize.value < 20) {
    fontSize.value += 1
  }
}

function handleZoomOut() {
  if (fontSize.value > 12) {
    fontSize.value -= 1
  }
}

function isAccountField(fieldName) {
  const accountFields = [
    '账号', '卡号', '本方账号', '对方账号', 
    '本方卡号', '对方卡号', '账户', '卡号',
    '信用卡卡号', '借记卡号', '贷记卡号'
  ]
  return accountFields.some(field => 
    fieldName && fieldName.includes(field)
  )
}

function isAmountField(fieldName) {
  const amountFields = [
    '金额', '金额(元)', '发生额', '交易金额',
    '余额', '账户余额', '发生额(借)', '发生额(贷)'
  ]
  return amountFields.some(field => 
    fieldName && fieldName.includes(field)
  )
}

function isDateField(fieldName) {
  const dateFields = [
    '日期', '时间', '交易日期', '交易时间',
    '入账日期', '发生日期', '记账日期'
  ]
  return dateFields.some(field => 
    fieldName && fieldName.includes(field)
  )
}

function getCellClass(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return 'empty-cell'
  }

  if (isAccountField(fieldName)) {
    return 'account-cell'
  }

  if (isAmountField(fieldName)) {
    const num = parseFloat(String(value).replace(/[,，]/g, ''))
    if (!isNaN(num)) {
      return num < 0 ? 'negative-amount' : 'positive-amount'
    }
  }

  if (isDateField(fieldName)) {
    return 'date-cell'
  }

  return ''
}

function formatCellValue(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  // 处理账号类字段
  if (isAccountField(fieldName)) {
    return String(value).replace(/[^\d]/g, '')
  }

  // 处理金额类字段
  if (isAmountField(fieldName)) {
    const num = parseFloat(String(value).replace(/[,，]/g, ''))
    if (!isNaN(num)) {
      return num.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
  }

  // 处理日期类字段
  if (isDateField(fieldName)) {
    const dateStr = String(value)
    if (dateStr.match(/^\d{4}[-/]\d{2}[-/]\d{2}/)) {
      return dateStr.replace(/[-/]/g, '')
    }
  }

  return String(value)
}

// 处理sheet切换
const handleSheetChange = (sheetName) => {
  emit('sheet-change', {
    name: sheetName,
    data: sheets.value.find(s => s.name === sheetName)?.data || []
  })
}

// 处理标准字段变化
const handleStandardFieldChange = (value) => {
  // 发出事件通知父组件更新字段映射
  emit('standard-field-change', {
    field: value,
    columnIndex: headers.value.findIndex(header => 
      header === selectedStandardField.value
    )
  })
}

// 处理列映射变化
const handleColumnMappingChange = (columnIndex, standardField) => {
  if (standardField) {
    // 更新映射
    emit('standard-field-change', {
      field: standardField,
      columnIndex: columnIndex,
      originalField: headers.value[columnIndex],
      bankName: props.bankName,
      fileType: props.fileType
    })
    
    // 显示更新成功提示
    ElMessage({
      message: `已将"${headers.value[columnIndex]}"映射为"${standardField}"`,
      type: 'success',
      duration: 2000
    })
  }
}

// 修改初始化映射的函数
const initializeMappings = () => {
  // 先清空当前映射
  columnMappings.value = {}
  
  // 获取映射配置（优先使用传入的 mapping）
  const mappingConfig = props.mapping || getMappingConfig(props.bankName, props.fileType) || {}
  
  // 遍历所有列，设置映射
  headers.value.forEach((header, index) => {
    // 查找该原始字段对应的标准字段
    for (const [standardField, originalFields] of Object.entries(mappingConfig)) {
      if (Array.isArray(originalFields) && originalFields.includes(header)) {
        columnMappings.value[index] = standardField
        break
      }
    }
  })
}

// 修改监听逻辑
watch([() => props.bankName, () => props.fileType, () => props.mapping], () => {
  if (props.bankName && props.fileType) {
    initializeMappings()
  }
}, { immediate: true, deep: true })

// 移除原有的 fileData 监听中的映射初始化
watch(() => props.fileData, () => {
  currentPage.value = 1
}, { deep: true })

// 添加 onMounted 钩子中的初始化
onMounted(() => {
  updateTableHeight()
  window.addEventListener('resize', updateTableHeight)
  
  // 初始化映射
  if (props.bankName && props.fileType) {
    initializeMappings()
  }
})

// 监听数据类型变化
watch(dataType, async (newType) => {
  if (newType === 'preliminary' && !props.cleanedData.length) {
    try {
      const cleaned = await preliminaryCleaning(props.fileData, props.bankName, props.fileType)
      if (!cleaned || cleaned.length === 0) {
        throw new Error('清洗后的数据为空')
      }
      emit('update:cleanedData', cleaned)
      ElMessage.success('初步清洗完成')
    } catch (error) {
      console.error('初步清洗失败:', error)
      ElMessage.error(error.message)
      dataType.value = 'original'
    }
  } else if (newType === 'deep') {
    if (!props.cleanedData.length) {
      try {
        const cleaned = await preliminaryCleaning(props.fileData, props.bankName, props.fileType)
        if (!cleaned || cleaned.length === 0) {
          throw new Error('清洗后的数据为空')
        }
        emit('update:cleanedData', cleaned)
        const deepCleaned = await deepCleaning(cleaned)
        emit('update:deepCleanedData', deepCleaned)
        ElMessage.success('深度清洗完成')
      } catch (error) {
        console.error('深度清洗失败:', error)
        ElMessage.error(error.message)
        dataType.value = 'original'
      }
    } else if (!props.deepCleanedData.length) {
      try {
        const deepCleaned = await deepCleaning(props.cleanedData)
        emit('update:deepCleanedData', deepCleaned)
        ElMessage.success('深度清洗完成')
      } catch (error) {
        console.error('深度清洗失败:', error)
        ElMessage.error(error.message)
        dataType.value = 'preliminary'
      }
    }
  }
}, { immediate: false })
</script>

<style scoped>
.preview-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  padding: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  background-color: white;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.preview-actions {
  display: flex;
  gap: 16px;
}

.preview-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table) {
  --el-table-header-bg-color: var(--el-color-primary-light-9);
  --el-table-row-hover-bg-color: var(--el-color-primary-light-9);
}

:deep(.el-table__header) th {
  font-weight: 600;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  padding: 8px 0;
}

:deep(.el-table__header-wrapper) {
  border-bottom: 2px solid var(--el-border-color);
}

.empty-cell {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.positive-amount {
  font-family: Monaco, Menlo, Consolas, monospace;
  color: #67c23a;
  font-weight: 500;
}

.negative-amount {
  font-family: Monaco, Menlo, Consolas, monospace;
  color: #f56c6c;
  font-weight: 500;
}

.date-cell {
  font-family: Monaco, Menlo, Consolas, monospace;
  color: var(--el-color-info);
}

:deep(.el-pagination) {
  justify-content: flex-end;
}

.sheet-tabs {
  flex: 1;
  margin-right: 16px;
}

:deep(.el-tabs__header) {
  margin: 0;
}

:deep(.el-tabs__nav) {
  border: none;
}

:deep(.el-tabs__item) {
  height: 32px;
  line-height: 32px;
  padding: 0 16px;
}

.account-cell {
  font-family: Monaco, Menlo, Consolas, monospace;
  color: var(--el-color-primary);
  font-weight: 500;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
}

.pagination-wrapper {
  padding: 16px 0;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 12px;
  height: 12px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background: #dcdfe6;
  border-radius: 6px;
  border: 2px solid #f5f7fa;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: #f5f7fa;
  border-radius: 6px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-corner) {
  background: #f5f7fa;
}

:deep(.el-pagination .el-pagination__total) {
  margin-right: 16px;
}

:deep(.el-pagination .el-pagination__sizes) {
  margin-right: 16px;
}

/* 确保表格内容随字体大小变化 */
:deep(.el-table) {
  font-size: inherit;
}

:deep(.el-table__header) {
  font-size: inherit;
}

:deep(.el-table__body) {
  font-size: inherit;
}

.data-type-selector {
  margin-right: 16px;
}

:deep(.el-radio-button__inner) {
  padding: 0 12px;
}

:deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 4px 0 0 4px;
}

:deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 4px 4px 0;
}

/* 移除之前的标准字段映射相关样式 */
.standard-fields-mapping {
  display: none;
}

/* 添加新的列标题样式 */
.column-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.original-header {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-table__header) .el-select {
  width: 100%;
  min-width: 120px;
}

:deep(.el-table__header-cell) {
  padding: 0 !important;
  vertical-align: top;
}

:deep(.el-select__tags) {
  flex-wrap: nowrap;
  overflow: hidden;
}
</style> 
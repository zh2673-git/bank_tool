<template>
  <div class="data-cleaning">
    <div class="cleaning-header">
      <h3>数据清洗</h3>
      <div class="cleaning-actions">
        <el-button
          type="primary"
          :disabled="!canPreliminaryCleaning"
          :loading="preliminaryLoading"
          @click="handlePreliminaryCleaning"
        >
          初步清洗
        </el-button>
        <el-button
          type="success"
          :disabled="!canDeepCleaning"
          :loading="deepLoading"
          @click="handleDeepCleaning"
        >
          深度清洗
        </el-button>
        <el-button
          type="warning"
          :disabled="!hasCleanedData"
          @click="handleExport"
        >
          导出结果
        </el-button>
      </div>
    </div>

    <div class="cleaning-content" v-loading="loading">
      <div v-if="!selectedFiles.length" class="no-files">
        <el-empty description="请先选择需要清洗的文件" />
      </div>
      <template v-else>
        <div class="selected-files">
          <h4>已选择文件</h4>
          <el-table
            :data="selectedFiles"
            border
            style="width: 100%"
            size="small"
          >
            <el-table-column
              type="index"
              label="序号"
              width="60"
              align="center"
            />
            <el-table-column
              prop="name"
              label="文件名"
              min-width="200"
            />
            <el-table-column
              prop="bankName"
              label="所属银行"
              width="180"
            >
              <template #default="{ row }">
                <el-select
                  v-model="row.bankName"
                  placeholder="请选择银行"
                  size="small"
                  clearable
                  filterable
                  allow-create
                  style="width: 100%"
                  @change="handleFileChange(row)"
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
            <el-table-column
              prop="fileType"
              label="文件类型"
              width="180"
            >
              <template #default="{ row }">
                <el-select
                  v-model="row.fileType"
                  placeholder="请选择类型"
                  size="small"
                  style="width: 100%"
                  @change="handleFileChange(row)"
                >
                  <el-option label="储蓄卡明细" value="debit" />
                  <el-option label="信用卡明细" value="credit" />
                  <el-option label="开户信息" value="account" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column
              label="清洗状态"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="getCleaningStatusTag(row)">
                  {{ getCleaningStatusText(row) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="hasCleanedData" class="cleaned-data">
          <h4>清洗结果预览</h4>
          <el-table
            :data="previewData"
            border
            style="width: 100%"
            size="small"
            height="300"
          >
            <el-table-column
              v-for="(col, index) in previewColumns"
              :key="index"
              :prop="col"
              :label="col"
              min-width="150"
              show-overflow-tooltip
            />
          </el-table>
          
          <div class="preview-pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="totalRows"
              layout="total, sizes, prev, pager, next"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- 账户信息上传对话框 -->
    <el-dialog
      v-model="showAccountInfoDialog"
      title="上传开户信息"
      width="500px"
    >
      <div class="upload-area">
        <el-upload
          ref="accountInfoUpload"
          action=""
          :auto-upload="false"
          :on-change="handleAccountInfoChange"
          :file-list="accountInfoFiles"
          accept=".xlsx,.xls,.csv"
        >
          <template #trigger>
            <el-button type="primary">选择文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">
              请上传包含开户信息的Excel或CSV文件
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAccountInfoDialog = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="!hasAccountInfo"
            @click="confirmDeepCleaning"
          >
            确认清洗
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { preliminaryCleaning, deepCleaning, exportToExcel } from '../utils/dataCleaning'

const props = defineProps({
  selectedFiles: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:selectedFiles'])

// 状态变量
const loading = ref(false)
const preliminaryLoading = ref(false)
const deepLoading = ref(false)
const showAccountInfoDialog = ref(false)
const accountInfoFiles = ref([])
const accountInfoData = ref(null)
const currentPage = ref(1)
const pageSize = ref(20)
const cleanedData = ref([])

// 计算属性
const canPreliminaryCleaning = computed(() => {
  return props.selectedFiles.some(file => 
    file.data && 
    file.bankName && 
    file.fileType && 
    !file.cleanedData &&
    file.cleanStatus !== '清洗失败'
  )
})

const canDeepCleaning = computed(() => {
  return props.selectedFiles.some(file => 
    file.cleanedData && 
    !file.deepCleanedData &&
    file.cleanStatus !== '清洗失败'
  )
})

const hasCleanedData = computed(() => {
  return props.selectedFiles.some(file => 
    file.cleanedData || file.deepCleanedData
  )
})

const hasAccountInfo = computed(() => {
  return accountInfoData.value !== null
})

const previewColumns = computed(() => {
  return cleanedData.value.length > 0 ? Object.keys(cleanedData.value[0]) : []
})

const totalRows = computed(() => {
  return cleanedData.value.length
})

const previewData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return cleanedData.value.slice(start, end)
})

// 方法
const bankList = [
  '工商银行',
  '农业银行',
  '中国银行',
  '建设银行',
  '交通银行',
  '招商银行',
  '浦发银行',
  '中信银行',
  '光大银行',
  '华夏银行',
  '民生银行',
  '广发银行',
  '平安银行',
  '兴业银行'
]

function handleFileChange(file) {
  // 当文件的银行或类型改变时，重置清洗状态
  file.cleanedData = null
  file.deepCleanedData = null
  file.cleanStatus = '未清洗'
  
  // 通知父组件更新
  emit('update:selectedFiles', [...props.selectedFiles])
}

const getFileTypeTag = (type) => {
  const tagMap = {
    'debit': '',
    'credit': 'success',
    'account': 'warning'
  }
  return tagMap[type] || 'info'
}

const getFileTypeText = (type) => {
  const textMap = {
    'debit': '储蓄卡明细',
    'credit': '信用卡明细',
    'account': '开户信息'
  }
  return textMap[type] || type
}

const getCleaningStatusTag = (file) => {
  if (file.cleanedData) return 'success'
  if (file.cleaning) return 'warning'
  return 'info'
}

const getCleaningStatusText = (file) => {
  if (file.cleanedData) return '已清洗'
  if (file.cleaning) return '清洗中'
  return '未清洗'
}

// 处理初步清洗
async function handlePreliminaryCleaning() {
  try {
    preliminaryLoading.value = true
    
    const updatedFiles = await Promise.all(props.selectedFiles.map(async file => {
      if (!file.data || !file.bankName || !file.fileType || file.cleanedData) {
        return file
      }
      
      try {
        // 确保文件数据是二维数组格式
        const fileData = Array.isArray(file.data) ? file.data : JSON.parse(file.data)
        
        const cleanedData = await preliminaryCleaning(
          fileData,
          file.bankName,
          file.fileType
        )
        
        return {
          ...file,
          cleanedData,
          cleanStatus: '已清洗'
        }
      } catch (error) {
        console.error(`文件 ${file.name} 清洗失败:`, error)
        ElMessage.error(`文件 ${file.name} 清洗失败: ${error.message}`)
        return {
          ...file,
          cleanStatus: '清洗失败'
        }
      }
    }))
    
    // 更新清洗后的数据
    const allCleanedData = updatedFiles
      .filter(file => file.cleanedData)
      .map(file => file.cleanedData)
      .flat()
    
    cleanedData.value = allCleanedData
    emit('update:selectedFiles', updatedFiles)
    
    if (allCleanedData.length > 0) {
      ElMessage.success('初步清洗完成')
    } else {
      ElMessage.warning('没有文件需要清洗')
    }
  } catch (error) {
    console.error('初步清洗失败:', error)
    ElMessage.error(error.message)
  } finally {
    preliminaryLoading.value = false
  }
}

// 处理深度清洗
async function handleDeepCleaning() {
  if (!canDeepCleaning.value) {
    ElMessage.warning('请先完成初步清洗')
    return
  }
  showAccountInfoDialog.value = true
}

// 处理开户信息文件变更
async function handleAccountInfoChange(file) {
  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target.result
        const workbook = await import('xlsx').then(XLSX => XLSX.read(data, { type: 'array' }))
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        accountInfoData.value = await import('xlsx').then(XLSX => XLSX.utils.sheet_to_json(firstSheet))
        
        if (!accountInfoData.value || accountInfoData.value.length === 0) {
          throw new Error('开户信息文件为空')
        }
      } catch (error) {
        console.error('解析开户信息文件失败:', error)
        ElMessage.error('解析开户信息文件失败: ' + error.message)
        accountInfoData.value = null
      }
    }
    reader.onerror = () => {
      ElMessage.error('读取文件失败')
      accountInfoData.value = null
    }
    reader.readAsArrayBuffer(file.raw)
  } catch (error) {
    console.error('读取开户信息文件失败:', error)
    ElMessage.error('读取开户信息文件失败')
    accountInfoData.value = null
  }
}

// 确认深度清洗
async function confirmDeepCleaning() {
  if (!accountInfoData.value) {
    ElMessage.warning('请先上传开户信息文件')
    return
  }
  
  try {
    deepLoading.value = true
    
    const updatedFiles = await Promise.all(props.selectedFiles.map(async file => {
      if (!file.cleanedData || file.deepCleanedData) {
        return file
      }
      
      try {
        const deepCleanedData = await deepCleaning(
          file.cleanedData,
          accountInfoData.value
        )
        
        return {
          ...file,
          deepCleanedData,
          cleanStatus: '深度清洗完成'
        }
      } catch (error) {
        console.error(`文件 ${file.name} 深度清洗失败:`, error)
        ElMessage.error(`文件 ${file.name} 深度清洗失败: ${error.message}`)
        return file
      }
    }))
    
    // 更新深度清洗后的数据
    const allDeepCleanedData = updatedFiles
      .filter(file => file.deepCleanedData)
      .map(file => file.deepCleanedData)
      .flat()
    
    cleanedData.value = allDeepCleanedData
    emit('update:selectedFiles', updatedFiles)
    showAccountInfoDialog.value = false
    
    if (allDeepCleanedData.length > 0) {
      ElMessage.success('深度清洗完成')
    } else {
      ElMessage.warning('没有文件需要深度清洗')
    }
  } catch (error) {
    console.error('深度清洗失败:', error)
    ElMessage.error(error.message)
  } finally {
    deepLoading.value = false
  }
}

// 处理导出
async function handleExport() {
  try {
    const exportData = props.selectedFiles
      .filter(file => file.cleanedData || file.deepCleanedData)
      .map(file => file.deepCleanedData || file.cleanedData)
      .flat()
    
    if (exportData.length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }
    
    const filename = `清洗结果_${new Date().toISOString().slice(0, 10)}.xlsx`
    await exportToExcel(exportData, filename)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.message)
  }
}
</script>

<style scoped>
.data-cleaning {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  padding: 16px;
}

.cleaning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.cleaning-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.cleaning-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.no-files {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-files,
.cleaned-data {
  background-color: white;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  padding: 16px;
}

h4 {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.preview-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.upload-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.el-upload__tip {
  margin-top: 10px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style> 
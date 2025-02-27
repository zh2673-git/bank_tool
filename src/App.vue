<template>
  <div class="app-container">
    <el-container>
      <el-header height="60px">
        <div class="header-content">
          <div class="header-left">
            <h1>银行清洗工具 V0.2</h1>
            <div class="header-subtitle">姑苏纪委监委技术室</div>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showFieldMappingDialog">
              字段映射管理
            </el-button>
          </div>
        </div>
      </el-header>
      
      <el-main>
        <div class="main-content">
            <FileUpload @files-uploaded="handleFilesUploaded" />
          
          <div class="file-list-section">
            <FileList
              :files="files"
              :selected-files="selectedFiles"
              @selection-change="handleSelectionChange"
              @delete-files="handleDeleteFiles"
              @preview-file="handlePreview"
              @bank-type-change="handleBankTypeChange"
              @save-mapping="handleSaveMapping"
            />
            
            <div class="batch-actions">
              <el-dropdown @command="handleBatchCleaning" split-button type="primary">
                批量清洗
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="preliminary">初步清洗</el-dropdown-item>
                    <el-dropdown-item command="deep">深度清洗</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <el-dropdown @command="handleBatchExport" split-button type="warning">
                  导出结果
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="original">导出原始数据</el-dropdown-item>
                    <el-dropdown-item command="preliminary">导出初洗数据</el-dropdown-item>
                    <el-dropdown-item command="deep">导出深洗数据</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          </div>
      </el-main>
    </el-container>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="`${previewFile?.name || ''} - 数据预览`"
      width="90%"
      :fullscreen="true"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div class="preview-header">
        <div class="preview-info">
          <span>所属银行: {{ previewFile?.bankName }}</span>
          <span>文件类型: {{ getFileTypeText(previewFile?.fileType) }}</span>
        </div>
        <div class="preview-actions">
          <el-select v-model="previewType" placeholder="选择预览类型">
            <el-option label="原始数据" value="original" />
            <el-option
              label="初洗数据" 
              value="preliminary"
              :disabled="!previewFile?.cleanedData"
            />
            <el-option
              label="深洗数据" 
              value="deep"
              :disabled="!previewFile?.deepCleanedData"
            />
          </el-select>
        </div>
                </div>
      
      <PreviewArea
        v-if="previewFile && getPreviewData"
        :file-data="getPreviewData"
        :file-type="previewFile.fileType"
        :bank-name="previewFile.bankName"
        :cleaned-data="previewFile.cleanedData"
        :deep-cleaned-data="previewFile.deepCleanedData"
        :mapping="previewFile.mapping"
        @update:cleaned-data="handleCleanedDataUpdate"
        @update:deep-cleaned-data="handleDeepCleanedDataUpdate"
        @standard-field-change="handleStandardFieldChange"
      />
    </el-dialog>

    <!-- 字段映射管理对话框 -->
    <el-dialog
      v-model="showMappingDialog"
      title="字段映射管理"
      width="90%"
      :fullscreen="true"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <FieldMapping
        :bank-list="savedBanks"
        @mapping-saved="handleMappingSaved"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import FileUpload from './components/FileUpload.vue'
import FileList from './components/FileList.vue'
import PreviewArea from './components/PreviewArea.vue'
import FieldMapping from './components/FieldMapping.vue'
import { preliminaryCleaning, deepCleaning, exportToExcel } from './utils/dataCleaning'
import { getMappingConfig, identifyBankType, saveMappingConfig, getSavedBanks } from './utils/mappingStorage'

// 状态变量
const files = ref([])
const selectedFiles = ref([])
const previewFile = ref(null)
const previewType = ref('original')
const showPreviewDialog = ref(false)
const showMappingDialog = ref(false)

// 已保存的银行列表
const savedBanks = computed(() => {
  return getSavedBanks()
})

// 计算属性
const getPreviewData = computed(() => {
  if (!previewFile.value) return null
  
  return previewFile.value.data
})

// 处理文件上传
const handleFilesUploaded = async (newFiles) => {
  // 识别银行类型和文件类型
  for (const file of newFiles) {
    if (file.data && file.data[0]) {
      const result = await identifyBankType(file.data[0])
      if (result) {
        file.bankName = result.bankName
        file.fileType = result.fileType
        // 自动加载映射配置
        const mapping = await getMappingConfig(result.bankName, result.fileType)
        if (mapping) {
          file.mapping = mapping
        }
      }
    }
    // 为同名文件添加时间戳后缀
    const timestamp = new Date().getTime()
    const existingFile = files.value.find(f => f.name === file.name)
    if (existingFile) {
      const nameParts = file.name.split('.')
      const ext = nameParts.pop()
      const baseName = nameParts.join('.')
      file.name = `${baseName}_${timestamp}.${ext}`
    }
  }
  
  files.value.push(...newFiles)
  selectedFiles.value = [newFiles[0]]
}

// 处理文件选择变化
const handleSelectionChange = (selected) => {
  selectedFiles.value = selected
}

// 处理文件删除
const handleDeleteFiles = (filesToDelete) => {
  filesToDelete.forEach(file => {
    const index = files.value.findIndex(f => f === file)
    if (index !== -1) {
      files.value.splice(index, 1)
    }
  })
  
  selectedFiles.value = selectedFiles.value.filter(
    file => !filesToDelete.includes(file)
  )
  
  if (filesToDelete.includes(previewFile.value)) {
    previewFile.value = null
    showPreviewDialog.value = false
  }
}

// 处理预览
const handlePreview = (file) => {
  previewFile.value = file
  previewType.value = 'original'
  showPreviewDialog.value = true
}

// 处理银行类型变化
const handleBankTypeChange = async (file) => {
  try {
    // 加载新的映射配置
    const mapping = await getMappingConfig(file.bankName, file.fileType)
    if (mapping) {
      file.mapping = mapping
      // 更新文件状态
      const index = files.value.findIndex(f => f === file)
      if (index !== -1) {
        files.value[index] = { ...file }
      }
      ElMessage.success('已加载对应的字段映射配置')
  } else {
      ElMessage.warning('未找到对应的字段映射配置')
    }
  } catch (error) {
    console.error('加载映射配置失败:', error)
    ElMessage.error(error.message)
  }
}

// 处理保存映射
const handleSaveMapping = async (file) => {
  try {
    // 保存当前的映射配置
    const success = await saveMappingConfig(
      file.bankName,
      file.fileType,
      file.mapping || {}
    )
    
    if (success) {
      // 更新文件状态
      const index = files.value.findIndex(f => f === file)
      if (index !== -1) {
        files.value[index] = { ...file }
      }
      ElMessage.success('配置保存成功')
          } else {
      throw new Error('保存失败')
    }
  } catch (error) {
    console.error('保存映射配置失败:', error)
    ElMessage.error(error.message)
  }
}

// 处理批量清洗
const handleBatchCleaning = async (type) => {
  if (!selectedFiles.value.length) {
    ElMessage.warning('请先选择要清洗的文件')
    return
  }

  try {
    const updatedFiles = await Promise.all(selectedFiles.value.map(async file => {
      if (type === 'preliminary') {
        if (!file.mapping) {
          throw new Error(`文件 ${file.name} 未设置字段映射`)
        }
        const cleanedData = await preliminaryCleaning(file.data, file.bankName, file.fileType)
        // 创建新的文件对象，确保Vue能检测到变化
        const updatedFile = {
          ...file,
          cleanedData: cleanedData,
          cleanStatus: '已清洗'
        }
        return updatedFile
      } else {
        if (!file.cleanedData) {
          throw new Error(`文件 ${file.name} 未进行初步清洗`)
        }
        
        // 查找所有相同银行的开户信息文件
        const accountFiles = files.value.filter(f => 
          f.bankName === file.bankName && 
          f.fileType === 'account' &&
          f.cleanedData
        )
        
        if (!accountFiles.length) {
          console.warn(`未找到 ${file.bankName} 的开户信息文件`)
        }
        
        // 合并所有开户信息数据
        const allAccountData = accountFiles.reduce((acc, f) => {
          return acc.concat(f.cleanedData || [])
        }, [])
        
        const deepCleanedData = await deepCleaning(
          file.cleanedData, 
          allAccountData
        )
        
        // 创建新的文件对象，确保Vue能检测到变化
        const updatedFile = {
          ...file,
          deepCleanedData: deepCleanedData,
          cleanStatus: '深度清洗完成'
        }
        return updatedFile
      }
    }))
    
    // 更新文件状态
    updatedFiles.forEach(updatedFile => {
      const index = files.value.findIndex(f => f.name === updatedFile.name)
      if (index !== -1) {
        // 使用Vue的响应式API更新数组
        files.value.splice(index, 1, updatedFile)
        // 如果当前文件正在预览，也更新预览文件
        if (previewFile.value && previewFile.value.name === updatedFile.name) {
          previewFile.value = updatedFile
        }
      }
    })
    
    ElMessage.success(`${type === 'preliminary' ? '初步' : '深度'}清洗完成`)
  } catch (error) {
    console.error('批量清洗失败:', error)
    ElMessage.error(error.message)
  }
}

// 处理批量导出
const handleBatchExport = async (type) => {
  if (!selectedFiles.value.length) {
    ElMessage.warning('请先选择要导出的文件')
    return
  }

  try {
    const exportData = selectedFiles.value.map(file => {
      switch (type) {
        case 'original':
          return file.data
        case 'preliminary':
          return file.cleanedData || []
        case 'deep':
          return file.deepCleanedData || []
        default:
          return null
      }
    }).filter(data => Array.isArray(data) && data.length > 0).flat()
    
    if (exportData.length === 0) {
      throw new Error(`没有可导出的${type === 'preliminary' ? '初步清洗' : type === 'deep' ? '深度清洗' : '原始'}数据`)
    }

    const filename = `导出结果_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`
    await exportToExcel(exportData, filename)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.message)
  }
}

// 显示字段映射对话框
const showFieldMappingDialog = () => {
  showMappingDialog.value = true
}

// 处理字段映射保存
const handleMappingSaved = () => {
  ElMessage.success('字段映射保存成功')
  showMappingDialog.value = false
}

// 获取文件类型显示文本
const getFileTypeText = (type) => {
  switch (type) {
    case 'debit':
      return '储蓄卡明细'
    case 'credit':
      return '信用卡明细'
    case 'account':
      return '开户信息'
    default:
      return '未知类型'
  }
}

// 处理清洗数据更新
const handleCleanedDataUpdate = (cleanedData) => {
  if (previewFile.value) {
    previewFile.value.cleanedData = cleanedData
    // 更新文件列表中的数据
    const index = files.value.findIndex(f => f === previewFile.value)
    if (index !== -1) {
      files.value[index] = { ...previewFile.value }
    }
  }
}

// 处理深度清洗数据更新
const handleDeepCleanedDataUpdate = (deepCleanedData) => {
  if (previewFile.value) {
    previewFile.value.deepCleanedData = deepCleanedData
    // 更新文件列表中的数据
    const index = files.value.findIndex(f => f === previewFile.value)
    if (index !== -1) {
      files.value[index] = { ...previewFile.value }
    }
  }
}

// 处理标准字段变化
const handleStandardFieldChange = async ({ field, columnIndex, originalField, bankName, fileType }) => {
  try {
    // 获取当前映射配置
    const currentMapping = previewFile.value?.mapping || getMappingConfig(bankName, fileType) || {}
    
    // 移除原字段在其他标准字段中的映射
    Object.keys(currentMapping).forEach(standardField => {
      if (Array.isArray(currentMapping[standardField])) {
        currentMapping[standardField] = currentMapping[standardField].filter(f => f !== originalField)
      }
    })
    
    // 添加新的映射
    if (!currentMapping[field]) {
      currentMapping[field] = []
    }
    if (!currentMapping[field].includes(originalField)) {
      currentMapping[field].push(originalField)
    }
    
    // 保存映射配置
    await saveMappingConfig(bankName, fileType, currentMapping)
    
    // 更新预览文件的映射配置
    if (previewFile.value && previewFile.value.bankName === bankName && previewFile.value.fileType === fileType) {
      previewFile.value.mapping = { ...currentMapping }
    }
    
    // 更新文件列表中的映射配置
    const fileIndex = files.value.findIndex(f => f.bankName === bankName && f.fileType === fileType)
    if (fileIndex !== -1) {
      files.value[fileIndex].mapping = { ...currentMapping }
    }
    
    // 如果映射对话框是打开的，刷新映射数据
    if (showMappingDialog.value) {
      const mappingComponent = document.querySelector('.field-mapping')?.__vueParent
      if (mappingComponent) {
        mappingComponent.loadBankMappings()
      }
    }
    
    ElMessage.success('字段映射已更新')
  } catch (error) {
    console.error('更新字段映射失败:', error)
    ElMessage.error('更新字段映射失败：' + error.message)
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-container {
  height: 100%;
}

.el-header {
  background-color: #409eff;
  color: white;
  padding: 0 20px;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-content h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header-subtitle {
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.el-main {
  padding: 20px;
  background-color: #f5f7fa;
}

.main-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.file-list-section {
  flex: 1;
  background-color: white;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.batch-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.preview-header {
  margin-bottom: 20px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.preview-actions {
  display: flex;
  gap: 10px;
}

:deep(.el-dialog__body) {
  padding: 20px 0;
}
</style> 
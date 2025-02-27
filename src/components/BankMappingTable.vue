<template>
  <div class="bank-mapping-table">
    <el-table
      :data="sortedBankList"
      border
      size="large"
      style="width: 100%"
    >
      <el-table-column
        label="所属银行"
        width="150"
        fixed="left"
      >
        <template #default="{ row }">
          <el-tag size="large" type="info">{{ row }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column
        v-for="field in standardFields"
        :key="field"
        :label="field"
        min-width="200"
      >
        <template #header>
          <el-tooltip
            :content="getFieldDescription(field)"
            placement="top"
            :show-after="500"
          >
            <span>{{ field }}</span>
          </el-tooltip>
        </template>
        <template #default="scope">
          <div class="mapping-cell" @click="handleAddMapping(scope.row, field)">
            <template v-if="getMappingValue(scope.row, field)?.length">
              <el-tag
                v-for="(originalField, index) in getMappingValue(scope.row, field)"
                :key="index"
                class="mapping-tag"
                size="small"
                closable
                @close.stop="handleRemoveMapping(scope.row, field, originalField)"
              >
                {{ originalField }}
              </el-tag>
            </template>
            <span v-else class="empty-mapping">
              -
            </span>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加映射对话框 -->
    <el-dialog
      v-model="showAddMappingDialog"
      :title="`${currentBank} - ${currentField} 字段映射`"
      width="500px"
    >
      <div class="mapping-dialog-content">
        <el-select
          v-model="selectedOriginalFields"
          multiple
          filterable
          allow-create
          placeholder="请选择或输入原始字段"
          style="width: 100%"
        >
          <el-option
            v-for="field in originalFields"
            :key="field"
            :label="field"
            :value="field"
          />
        </el-select>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddMappingDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAddMapping">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getStandardFields } from '../utils/mappingStorage'

const props = defineProps({
  bankList: {
    type: Array,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  mappings: {
    type: Array,
    required: true
  },
  originalFields: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['mapping-change'])

// 状态变量
const showAddMappingDialog = ref(false)
const currentBank = ref('')
const currentField = ref('')
const selectedOriginalFields = ref([])

// 标准字段列表
const standardFields = computed(() => {
  const fields = getStandardFields(props.fileType)
  // 移除"所属银行"字段
  return fields.filter(field => field !== '所属银行')
})

// 只显示有映射的银行列表
const sortedBankList = computed(() => {
  return props.bankList.filter(bank => {
    const bankMapping = props.mappings.find(m => m.bankName === bank)
    // 确保银行有映射且至少有一个非空的映射值
    return bankMapping && bankMapping.mappings && 
           Object.values(bankMapping.mappings).some(mapping => 
             Array.isArray(mapping) ? mapping.length > 0 : mapping
           )
  }).sort((a, b) => {
    const aMapping = props.mappings.find(m => m.bankName === a)
    const bMapping = props.mappings.find(m => m.bankName === b)
    return (bMapping?.timestamp || 0) - (aMapping?.timestamp || 0)  // 按时间戳排序，最新的在前
  })
})

// 获取映射值
function getMappingValue(bankName, field) {
  const bankMapping = props.mappings.find(m => m.bankName === bankName)
  if (!bankMapping || !bankMapping.mappings) return []
  
  const fieldMapping = bankMapping.mappings[field]
  return Array.isArray(fieldMapping) ? fieldMapping : (fieldMapping ? [fieldMapping] : [])
}

// 处理添加映射
function handleAddMapping(bankName, field) {
  currentBank.value = bankName
  currentField.value = field
  selectedOriginalFields.value = getMappingValue(bankName, field)
  showAddMappingDialog.value = true
}

// 确认添加映射
function confirmAddMapping() {
  const bankMapping = props.mappings.find(m => m.bankName === currentBank.value)
  const currentMappings = bankMapping?.mappings || {}
  
  // 更新映射
  const updatedMapping = { ...currentMappings }
  updatedMapping[currentField.value] = selectedOriginalFields.value
  
  emit('mapping-change', {
    bankName: currentBank.value,
    fileType: props.fileType,
    mapping: updatedMapping,
    mappingId: bankMapping?.id,
    isNew: !bankMapping
  })
  
  showAddMappingDialog.value = false
}

// 处理移除映射
function handleRemoveMapping(bankName, field, originalField) {
  const bankMapping = props.mappings.find(m => m.bankName === bankName)
  const currentMappings = bankMapping?.mappings || {}
  
  // 更新映射
  const updatedMapping = { ...currentMappings }
  updatedMapping[field] = (updatedMapping[field] || []).filter(f => f !== originalField)
  
  emit('mapping-change', {
    bankName,
    fileType: props.fileType,
    mapping: updatedMapping,
    mappingId: bankMapping?.id,
    isNew: !bankMapping
  })
}

// 获取字段描述
function getFieldDescription(field) {
  const descriptions = {
    '交易日期': '银行交易发生的日期，格式：YYYY-MM-DD',
    '交易时间': '银行交易发生的时间，格式：HH:mm:ss',
    '交易金额': '交易的具体金额，正数表示收入，负数表示支出',
    '交易类型': '交易的具体类型，如：转账、取现等',
    '交易对手': '交易的对方账户名称',
    '对方账号': '交易的对方账户号码',
    '交易摘要': '交易的具体说明或备注',
    '账户余额': '交易后的账户余额',
    '本方账号': '本方的银行账号',
    '本方户名': '本方的账户名称',
    '开户日期': '账户的开户日期',
    '开户网点': '开户的银行网点',
    '账户状态': '账户的当前状态',
    '信用额度': '信用卡的信用额度',
    '可用额度': '信用卡的可用额度',
    '账单日': '信用卡的账单日期',
    '还款日': '信用卡的还款日期'
  }
  return descriptions[field] || field
}
</script>

<style scoped>
.bank-mapping-table {
  padding: 20px;
  background-color: white;
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
}

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
  height: auto;
  min-height: 60px;
}

:deep(.el-table__header-cell) {
  background-color: var(--el-color-primary-light-9) !important;
  color: var(--el-color-primary) !important;
  font-weight: bold !important;
}

.mapping-cell {
  padding: 8px 0;
  min-height: 32px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.3s;
}

.mapping-cell:hover {
  background-color: var(--el-color-primary-light-9);
}

.empty-mapping {
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  padding: 0 8px;
}

.mapping-tag {
  margin: 2px;
}

:deep(.el-tag) {
  font-size: 12px;
  padding: 0 8px;
  height: 24px;
  line-height: 24px;
}

.mapping-dialog-content {
  padding: 20px 0;
}

:deep(.el-select__tags) {
  flex-wrap: wrap;
}

:deep(.el-select__tags-text) {
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 
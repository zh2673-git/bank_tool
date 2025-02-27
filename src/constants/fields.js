// 标准字段定义

// 银行明细标准字段
export const DETAIL_STANDARD_FIELDS = [
  { key: 'bank', label: '所属银行' },
  { key: 'selfName', label: '本方姓名' },
  { key: 'selfAccount', label: '本方账号' },
  { key: 'selfCard', label: '本方卡号' },
  { key: 'amount', label: '交易金额' },
  { key: 'transTime', label: '交易时间' },
  { key: 'currency', label: '币种' },
  { key: 'debitCredit', label: '借贷标志' },
  { key: 'balance', label: '余额' },
  { key: 'transType', label: '交易方式' },
  { key: 'summary', label: '交易摘要' },
  { key: 'transLocation', label: '交易网点' },
  { key: 'oppositePartyName', label: '对方户名' },
  { key: 'oppositePartyAccount', label: '对方账户' },
  { key: 'oppositePartyCard', label: '对方卡号' },
  { key: 'oppositePartyBank', label: '对方开户行' }
];

// 开户信息标准字段
export const ACCOUNT_STANDARD_FIELDS = [
  { key: 'name', label: '姓名' },
  { key: 'account', label: '账号' },
  { key: 'card', label: '卡号' },
  { key: 'idCard', label: '身份证号' },
  { key: 'phone', label: '联系方式' },
  { key: 'address', label: '家庭住址' }
];

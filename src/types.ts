export interface BankFile {
      id: string;
      name: string;
      size: number;
      type: 'detail' | 'account';
      bankType: string;
      rawData: any[];
      mappedFields: Record<string, string>;
      cleanedData: any[];
    }

    export const standardFields = {
      detail: [
        '所属银行', '本方姓名', '本方账号', '本方卡号', '交易金额', 
        '交易时间', '借贷标志', '交易摘要', '交易网点',
        '对方姓名', '对方账号', '对方卡号', '对方开户行'
      ],
      account: [
        '姓名', '账号', '卡号', '身份证号', 
        '电话号码', '家庭住址'
      ]
    };

export type SettingsDestinationId = 'account' | 'team' | 'sales' | 'data' | 'app';

export interface SettingsDestination {
  id: SettingsDestinationId;
  label: string;
  description: string;
  href: string;
}

export interface SettingsDestinationGroup {
  id: 'workspace' | 'system';
  label: string;
  items: SettingsDestination[];
}

const ACCOUNT_DESTINATION: SettingsDestination = {
  id: 'account',
  label: '帳號與同步',
  description: '登入帳號、同步狀態與登出',
  href: '/settings/account',
};

const OWNER_TEAM_DESTINATION: SettingsDestination = {
  id: 'team',
  label: '團隊與權限',
  description: '邀請成員並管理每位員工的角色',
  href: '/settings/team',
};

const STAFF_TEAM_DESTINATION: SettingsDestination = {
  id: 'team',
  label: '團隊與權限',
  description: '查看所屬團隊與目前可用功能',
  href: '/settings/team',
};

const SALES_DESTINATION: SettingsDestination = {
  id: 'sales',
  label: '銷售與照片',
  description: '品牌名稱、成交照片與互動記錄偏好',
  href: '/settings/sales',
};

const DATA_DESTINATION: SettingsDestination = {
  id: 'data',
  label: '資料與救援',
  description: '檢查資料健康、修復與清除資料',
  href: '/settings/data',
};

const APP_DESTINATION: SettingsDestination = {
  id: 'app',
  label: 'App 與版本',
  description: '安裝到主畫面、版本與關於 Féria',
  href: '/settings/app',
};

export function getSettingsDestinationGroups(isStaff: boolean): SettingsDestinationGroup[] {
  return [
    {
      id: 'workspace',
      label: isStaff ? '你的工作空間' : '營運設定',
      items: isStaff
        ? [ACCOUNT_DESTINATION, STAFF_TEAM_DESTINATION]
        : [ACCOUNT_DESTINATION, OWNER_TEAM_DESTINATION, SALES_DESTINATION],
    },
    {
      id: 'system',
      label: '系統',
      items: isStaff ? [APP_DESTINATION] : [DATA_DESTINATION, APP_DESTINATION],
    },
  ];
}

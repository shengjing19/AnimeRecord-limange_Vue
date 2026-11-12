/** 所有入口共用同一份导航定义，旧 /admin 链接也会回到此工作区。 */
export const WORKSPACE_TABS = Object.freeze([
  {
    key: 'finished',
    label: '已看完',
    icon: 'fa-solid fa-circle-check',
    description: '每一部看完的故事，都值得被记住。'
  },
  {
    key: 'favorite',
    label: '最喜欢',
    icon: 'fa-regular fa-heart',
    description: '收藏那些想要一看再看的心动瞬间。'
  },
  {
    key: 'watching',
    label: '正在追',
    icon: 'fa-solid fa-play',
    description: '故事还在继续，下一集见。'
  },
  {
    key: 'stats',
    label: '数据统计',
    icon: 'fa-solid fa-chart-simple',
    description: '用数字回看你的动漫时光。'
  },
  {
    key: 'admin',
    label: '数据管理',
    icon: 'fa-solid fa-database',
    description: '整理、添加和更新你的动漫档案。'
  },
  {
    key: 'settings',
    label: '设置',
    icon: 'fa-solid fa-sliders',
    description: '让 limange 更贴近你的习惯。'
  },
  {
    key: 'about',
    label: '关于应用',
    icon: 'fa-regular fa-circle-question',
    description: '为每一个好故事，留一个位置。'
  }
]);

export function getWorkspaceTab(key) {
  return WORKSPACE_TABS.find((item) => item.key === key) || WORKSPACE_TABS[0];
}

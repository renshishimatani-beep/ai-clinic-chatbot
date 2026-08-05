declare const chrome: any;
export {};

chrome.runtime.onInstalled.addListener(() => {
  // 常駐処理は行わない。表示はユーザーがポップアップを操作した時だけ注入する。
});

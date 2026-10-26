// 宿主半记账逻辑的单元验证：余额减少 → 累加；充值 → 只更新基线；跨天 → 清零
import { nextSpendState, beijingDateKey } from 'file:///E:/codex-files/projects/dsh-crt-theme/index.js';

let failures = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log('ok  -', label);
  } else {
    failures += 1;
    console.error('FAIL:', label, '\n  实际:', a, '\n  预期:', e);
  }
};

// 第一次取样：建立基线，不算消费
check('首日建立基线', nextSpendState(null, '2026-10-19', 74.5), { date: '2026-10-19', last: 74.5, spent: 0 });
// 余额下降 1.2 → 今日花 1.2
check('余额下降累加', nextSpendState({ date: '2026-10-19', last: 74.5, spent: 0 }, '2026-10-19', 73.3), { date: '2026-10-19', last: 73.3, spent: 1.2 });
// 余额继续下降 0.1 → 累加到 1.3
check('继续累加', nextSpendState({ date: '2026-10-19', last: 73.3, spent: 1.2 }, '2026-10-19', 73.2), { date: '2026-10-19', last: 73.2, spent: 1.3 });
// 充值：余额变多 → 只更新基线，消费不变
check('充值不算消费', nextSpendState({ date: '2026-10-19', last: 73.2, spent: 1.3 }, '2026-10-19', 173.2), { date: '2026-10-19', last: 173.2, spent: 1.3 });
// 同值重复取样 → 不变
check('重复取样不变', nextSpendState({ date: '2026-10-19', last: 173.2, spent: 1.3 }, '2026-10-19', 173.2), { date: '2026-10-19', last: 173.2, spent: 1.3 });
// 跨天 → 清零
check('跨天清零', nextSpendState({ date: '2026-10-19', last: 173.2, spent: 1.3 }, '2026-10-20', 173.0), { date: '2026-10-20', last: 173.0, spent: 0 });
// 北京时间日期键
check('日期键用北京时间', beijingDateKey(new Date('2026-10-19T16:30:00Z')), '2026-10-20');

console.log(failures === 0 ? '\n全部通过' : `\n有 ${failures} 项失败`);
process.exitCode = failures === 0 ? 0 : 1;

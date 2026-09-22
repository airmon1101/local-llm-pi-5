const test = require('node:test');
const assert = require('node:assert');

// Test utilities
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function groupConversationsByDate(conversations) {
  const grouped = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysAgoStart = todayStart - 7 * 86400000;

  for (const conv of conversations) {
    const updated = new Date(conv.updated_at).getTime();

    if (updated >= todayStart) {
      grouped.today.push(conv);
    } else if (updated >= yesterdayStart) {
      grouped.yesterday.push(conv);
    } else if (updated >= sevenDaysAgoStart) {
      grouped.previous7Days.push(conv);
    } else {
      grouped.older.push(conv);
    }
  }

  return grouped;
}

test('formatBytes formats binary bytes accurately', () => {
  assert.strictEqual(formatBytes(0), '0 B');
  assert.strictEqual(formatBytes(1024), '1 KB');
  assert.strictEqual(formatBytes(1048576), '1 MB');
  assert.strictEqual(formatBytes(1073741824 * 8), '8 GB');
});

test('formatUptime formats seconds into human-readable strings', () => {
  assert.strictEqual(formatUptime(null), 'N/A');
  assert.strictEqual(formatUptime(120), '2m');
  assert.strictEqual(formatUptime(7200), '2h 0m');
  assert.strictEqual(formatUptime(86400 * 3 + 3600), '3d 1h');
});

test('groupConversationsByDate correctly partitions chat history', () => {
  const now = new Date();
  const sample = [
    { id: '1', title: 'Today Chat', updated_at: now.toISOString() },
    { id: '2', title: 'Yesterday Chat', updated_at: new Date(now.getTime() - 86400000).toISOString() },
    { id: '3', title: 'Last Week Chat', updated_at: new Date(now.getTime() - 86400000 * 4).toISOString() },
    { id: '4', title: 'Old Chat', updated_at: new Date(now.getTime() - 86400000 * 30).toISOString() },
  ];

  const grouped = groupConversationsByDate(sample);
  assert.strictEqual(grouped.today.length, 1);
  assert.strictEqual(grouped.yesterday.length, 1);
  assert.strictEqual(grouped.previous7Days.length, 1);
  assert.strictEqual(grouped.older.length, 1);
});

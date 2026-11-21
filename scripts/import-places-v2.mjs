import fs from 'node:fs';
import path from 'node:path';

const categories = new Set(['tham_quan', 'nha_hang', 'mua_sam', 'khach_san', 'giai_tri', 'bai_bien']);
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const input = args.find(arg => !arg.startsWith('--')) || 'data/import/places.discovery.v2.json';
const root = process.cwd();
const target = path.join(root, 'src/data/places.json');
const incoming = JSON.parse(fs.readFileSync(path.resolve(root, input), 'utf8').replace(/^\uFEFF/, ''));
if (!fs.existsSync(path.join(root, 'package.json')) || !fs.existsSync(target)) {
  throw new Error('Chạy script ở gốc dự án Expo có src/data/places.json. Chưa ghi file nào.');
}
const oldText = fs.readFileSync(target, 'utf8');
const previous = JSON.parse(oldText.replace(/^\uFEFF/, ''));
if (!Array.isArray(incoming) || !Array.isArray(previous)) throw new Error('Cả hai file phải là mảng JSON.');

function sourceId(row) {
  if (typeof row.google_place_id === 'string' && row.google_place_id.trim()) return row.google_place_id.trim();
  if (typeof row.id === 'string' && row.id.startsWith('google:')) return row.id.slice(7);
  return null;
}
const oldById = new Map();
const oldByGoogle = new Map();
for (const row of previous) {
  if (typeof row.id !== 'string' || !row.id || oldById.has(row.id)) throw new Error('ID cũ thiếu hoặc trùng; giữ nguyên dữ liệu, cần rà lại trước khi nhập.');
  oldById.set(row.id, row);
  const google = sourceId(row);
  if (google) {
    const group = oldByGoogle.get(google) || [];
    group.push(row); oldByGoogle.set(google, group);
  }
}
const sourceIds = new Set();
const importedIds = new Set();
let reused = 0;
const next = incoming.map(row => {
  const google = sourceId(row);
  if (!google || sourceIds.has(google) || typeof row.id !== 'string' || !row.id || !categories.has(row.category) ||
      typeof row.name !== 'string' || !row.name.trim() || row.discovery_enabled !== true || row.catalog_status !== 'ready' ||
      row.coordinates_valid !== true || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) ||
      Math.abs(row.latitude) > 90 || Math.abs(row.longitude) > 180) {
    throw new Error('Dữ liệu mới thiếu, trùng hoặc chưa sẵn sàng. Hãy dùng places.discovery.v2.json.');
  }
  sourceIds.add(google);
  const matches = oldByGoogle.get(google) || [];
  const old = matches.length === 1 ? matches[0] : undefined;
  const id = old?.id || row.id;
  if (importedIds.has(id)) throw new Error('Trùng ID sau ánh xạ; chưa ghi dữ liệu.');
  const collision = oldById.get(id);
  if (collision && sourceId(collision) !== google) throw new Error(`Xung đột ID ${id}; chưa ghi dữ liệu.`);
  importedIds.add(id);
  if (old) reused++;
  return { ...old, ...row, id, legacy_only: false };
});
// Keep all unmatched old IDs for saved itineraries, but hide them from new discovery results.
const retained = previous.filter(row => !importedIds.has(row.id)).map(row => ({ ...row, legacy_only: true, discovery_enabled: false }));
next.push(...retained);
const finalIds = new Set(next.map(row => row.id));
if (finalIds.size !== next.length || previous.some(row => !finalIds.has(row.id))) throw new Error('Kiểm tra bảo toàn ID thất bại; chưa ghi dữ liệu.');
const report = {
  incoming: incoming.length, reused_existing_ids: reused, new_ids: incoming.length - reused,
  old_records_retained_for_itineraries: retained.length, total_stored: next.length,
  discovery_visible: incoming.length, all_previous_ids_preserved: true,
  old_google_ids_with_multiple_records: [...oldByGoogle.entries()].filter(([, rows]) => rows.length > 1).map(([id]) => id),
};
console.log(JSON.stringify(report, null, 2));
if (checkOnly) {
  console.log('CHECK ONLY: chưa ghi/thay file nào.');
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${target}.bak-${stamp}`;
  fs.copyFileSync(target, backup, fs.constants.COPYFILE_EXCL);
  const temporary = `${target}.importing`;
  fs.writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporary, target);
  const reportDir = path.join(root, 'data/import');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'places-import-report.json'), JSON.stringify({ ...report, backup }, null, 2) + '\n');
  console.log(`Đã cập nhật: ${target}`);
  console.log(`Bản sao lưu: ${backup}`);
}

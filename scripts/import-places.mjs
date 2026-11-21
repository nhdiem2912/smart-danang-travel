import {
    copyFile,
    mkdir,
    readFile,
    rename,
    writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet } from 'read-excel-file/node';

const categories = {
  tham_quan: 'Tham quan',
  nha_hang: 'Nhà hàng',
  mua_sam: 'Mua sắm',
  khach_san: 'Khách sạn',
  giai_tri: 'Giải trí',
  bai_bien: 'Bãi biển',
};

function text(value) {
  if (value === null || value === undefined) return null;
  return String(value).normalize('NFC').trim() || null;
}

function number(value) {
  if (text(value) === null) return null;

  const result = Number(String(value).trim().replace(',', '.'));

  if (!Number.isFinite(result)) {
    throw new Error(`Giá trị số không hợp lệ: ${value}`);
  }

  return result;
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const input = process.argv[2];

  if (!input) {
    throw new Error('Bạn chưa nhập đường dẫn file Excel.');
  }

  // Chỉ đọc sheet tổng để tránh nhập trùng các sheet danh mục.
  const rows = await readSheet(
    resolve(input),
    'Tat_ca_dia_diem',
  );

  const [headers, ...body] = rows;

  const required = [
    'ID',
    'Tên địa điểm',
    'Danh mục',
    'Địa chỉ',
    'Vĩ độ',
    'Kinh độ',
  ];

  for (const field of required) {
    if (!headers.includes(field)) {
      throw new Error(`Thiếu cột: ${field}`);
    }
  }

  const places = [];
  const ids = new Set();

  for (const row of body) {
    if (row.every(value => text(value) === null)) continue;

    const get = field =>
      row[headers.indexOf(field)] ?? null;

    const id = text(get('ID'));
    const name = text(get('Tên địa điểm'));
    const category = text(get('Danh mục'));

    if (!id || !name || !Object.hasOwn(categories, category)) {
      throw new Error(
        `Thiếu ID/tên hoặc sai danh mục tại dòng ${places.length + 2}`,
      );
    }

    if (ids.has(id)) {
      throw new Error(`Trùng ID trong sheet tổng: ${id}`);
    }

    const latitude = number(get('Vĩ độ'));
    const longitude = number(get('Kinh độ'));

    if (
      latitude === null ||
      longitude === null ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      throw new Error(`Tọa độ không hợp lệ: ${id}`);
    }

    const address = text(get('Địa chỉ'));
    const rating = number(get('Rating Google'));
    const ratingCount = number(get('Số đánh giá'));

    if (rating !== null && (rating < 0 || rating > 5)) {
      throw new Error(`Rating sai: ${id}`);
    }

    if (
      ratingCount !== null &&
      (!Number.isInteger(ratingCount) || ratingCount < 0)
    ) {
      throw new Error(`Số đánh giá sai: ${id}`);
    }

    places.push({
      id,
      name,
      category,
      address,
      latitude,
      longitude,

      description: null,
      image_url: null,
      rating,
      rating_count: ratingCount,

      google_place_id: text(get('Google Place ID')),
      google_maps_url: text(get('Link Google Maps')),
      osm_url: text(get('Link OSM')),
      website: text(get('Website')),
      phone: text(get('Điện thoại')),
      opening_hours_raw: text(get('Giờ mở cửa')),

      visit_duration_minutes: null,

      // Giữ riêng ảnh nguồn chưa được kiểm chứng.
      source_image_url: text(get('Ảnh OSM (chưa kiểm tra)')),
      source_image_status: text(get('Trạng thái ảnh')),

      image_status: 'pending',
      rating_source: rating === null ? null : 'Google',
      data_source: 'OpenStreetMap',

      coordinates_valid: true,
      location_verified: false,

      search_text: normalize(
        [name, address, categories[category]]
          .filter(Boolean)
          .join(' '),
      ),
    });

    ids.add(id);
  }

  if (places.length !== 650) {
    throw new Error(
      `Đọc được ${places.length} điểm, cần 650. Chưa ghi file; hãy kiểm tra sheet tổng.`,
    );
  }

  const order = Object.keys(categories);

  places.sort(
    (a, b) =>
      order.indexOf(a.category) - order.indexOf(b.category) ||
      a.name.localeCompare(b.name, 'vi') ||
      a.id.localeCompare(b.id),
  );

  const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
  );

  const output = resolve(root, 'src/data/places.json');

  await mkdir(dirname(output), { recursive: true });

  // Sao lưu nếu trước đó đã có dữ liệu.
  try {
    await readFile(output);

    const backup = `${output}.${Date.now()}.bak`;
    await copyFile(output, backup);

    console.log('Đã sao lưu dữ liệu cũ:', backup);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const temporary = `${output}.${Date.now()}.tmp`;

  await writeFile(
    temporary,
    JSON.stringify(places, null, 2) + '\n',
    'utf8',
  );

  await rename(temporary, output);

  console.log(
    `THÀNH CÔNG: ${places.length} địa điểm → ${output}`,
  );

  console.table(
    Object.entries(categories).map(([id, label]) => ({
      'Danh mục': label,
      'Số điểm': places.filter(
        place => place.category === id,
      ).length,
    })),
  );
}

main().catch(error => {
  console.error('DỪNG:', error.message);
  process.exitCode = 1;
});
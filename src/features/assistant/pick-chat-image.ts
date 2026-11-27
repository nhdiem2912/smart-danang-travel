import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { MAX_CHAT_IMAGE_BYTES, type ChatImage } from './chat-content';

export type SelectedChatImage = ChatImage & { uri: string };

export async function pickChatImage(): Promise<SelectedChatImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    allowsEditing: false,
    quality: 1,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    // Resize without cropping; retain the whole scene/menu for analysis.
    if (asset.width >= asset.height) {
      context.resize({ width: Math.min(asset.width || 1600, 1600), height: null });
    } else {
      context.resize({ width: null, height: Math.min(asset.height || 1600, 1600) });
    }
    const rendered = await context.renderAsync();
    try {
      const image = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.72,
        base64: true,
      });
      if (!image.base64) throw new Error('Chưa đọc được ảnh. Bạn hãy chọn ảnh khác.');
      const bytes = image.base64.length * 3 / 4 -
        (image.base64.endsWith('==') ? 2 : image.base64.endsWith('=') ? 1 : 0);
      if (bytes > MAX_CHAT_IMAGE_BYTES) {
        throw new Error('Ảnh vẫn lớn hơn 2 MB sau khi thu nhỏ. Bạn hãy chọn ảnh khác.');
      }
      return { uri: image.uri, mimeType: 'image/jpeg', data: image.base64 };
    } finally {
      rendered.release();
    }
  } finally {
    context.release();
  }
}

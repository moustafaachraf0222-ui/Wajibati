import type { ChangeEvent } from 'react';
import type { UploadedAttachment } from './types';

const MAX_ATTACHMENT_SIZE = 1_000_000;

export function readAttachmentFromInput(
  event: ChangeEvent<HTMLInputElement>,
  onReady: (attachment: UploadedAttachment) => void,
  onTooLarge: () => void
) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    event.target.value = '';
    onTooLarge();
    return;
  }

  const reader = new FileReader();
  reader.onload = () =>
    onReady({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result)
    });
  reader.readAsDataURL(file);
}

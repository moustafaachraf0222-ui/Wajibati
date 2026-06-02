import { Download } from 'lucide-react';
import type { Language, UploadedAttachment } from './types';
import { tr } from './i18n';

export function AttachmentPreview({ attachment, language }: { attachment: UploadedAttachment; language: Language }) {
  const isImage = attachment.type.startsWith('image/');

  return (
    <div className="attachment-preview">
      {isImage && <img src={attachment.dataUrl} alt={attachment.name || tr(language, 'imagePreview')} />}
      <a className="button ghost" href={attachment.dataUrl} download={attachment.name}>
        <Download size={16} aria-hidden="true" />
        <span>{isImage ? attachment.name : tr(language, 'downloadFile')}</span>
      </a>
    </div>
  );
}

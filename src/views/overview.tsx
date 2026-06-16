import { BookOpen, CalendarDays, CheckCircle2, CircleOff, Download, LockKeyhole, Users } from 'lucide-react';
import type { Language, PlatformData, PlatformUser } from '../types';
import { localeNames, stageNames, statusNames, subjectNames, tr } from '../i18n';
import {
  assignedClassGroups,
  assignedSchoolYears,
  classGroupsLabel,
  schoolYearsLabel,
  secondaryStreamLabel,
  teacherSubjectsLabel,
  yearClassGroupsLabel
} from '../education';
import { getSchool, scopedExercises, scopedUsers } from '../data';
import {
  reportLinesForDirector,
  todayIso,
  weekRangeLabel
} from '../homework';
import { RoleLabel } from '../ui';

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};
function drawWrappedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign
) {
  const words = text.split(/\s+/);
  let line = '';
  let nextY = y;

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, nextY);
      line = word;
      nextY += lineHeight;
      return;
    }

    line = candidate;
  });

  if (line) {
    context.fillText(line, x, nextY);
    nextY += lineHeight;
  }

  context.textAlign = align;
  return nextY;
}

function canvasToPdfBlob(canvas: HTMLCanvasElement) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
  const imageBinary = atob(imageBase64);
  const imageBytes = new Uint8Array(imageBinary.length);

  for (let index = 0; index < imageBinary.length; index += 1) {
    imageBytes[index] = imageBinary.charCodeAt(index);
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let offset = 0;

  const append = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    offset += bytes.length;
  };

  const addObject = (id: number, body: string) => {
    offsets[id] = offset;
    append(`${id} 0 obj\n${body}\nendobj\n`);
  };

  append('%PDF-1.4\n');
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );

  offsets[4] = offset;
  append(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  append(imageBytes);
  append('\nendstream\nendobj\n');

  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  addObject(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);

  const xrefOffset = offset;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id += 1) {
    append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdfBytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let position = 0;
  chunks.forEach((chunk) => {
    pdfBytes.set(chunk, position);
    position += chunk.length;
  });

  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

function createReportPdfBlob(title: string, lines: string[], language: Language) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;

  const context = canvas.getContext('2d');
  if (!context) {
    return new Blob([], { type: 'application/pdf' });
  }

  const isRtl = language === 'ar';
  const margin = 96;
  const contentWidth = canvas.width - margin * 2;
  const textX = isRtl ? canvas.width - margin : margin;
  const align: CanvasTextAlign = isRtl ? 'right' : 'left';

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#006233';
  context.fillRect(0, 0, canvas.width, 18);
  context.fillStyle = '#d21034';
  context.fillRect(0, 18, canvas.width, 7);
  context.direction = isRtl ? 'rtl' : 'ltr';
  context.textAlign = align;
  context.textBaseline = 'top';

  context.fillStyle = '#006233';
  context.font = '700 48px "Segoe UI", Tahoma, Arial, sans-serif';
  let y = drawWrappedCanvasText(context, title, textX, 86, contentWidth, 64, align);

  context.fillStyle = '#5f7168';
  context.font = '600 26px "Segoe UI", Tahoma, Arial, sans-serif';
  y = drawWrappedCanvasText(context, weekRangeLabel(language), textX, y + 12, contentWidth, 40, align);

  context.fillStyle = '#111f18';
  context.font = '600 31px "Segoe UI", Tahoma, Arial, sans-serif';
  y += 46;

  lines.forEach((line, index) => {
    const cardTop = y - 14;
    context.fillStyle = index % 2 === 0 ? '#f4f8f5' : '#ffffff';
    context.strokeStyle = '#dbe8df';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(margin, cardTop, contentWidth, 76, 12);
    context.fill();
    context.stroke();

    context.fillStyle = '#111f18';
    drawWrappedCanvasText(context, line, textX, y, contentWidth - 34, 40, align);
    y += 92;
  });

  context.fillStyle = '#006233';
  context.font = '700 24px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(new Date().toLocaleDateString(localeNames[language]), textX, canvas.height - 96);

  return canvasToPdfBlob(canvas);
}

export function OverviewView({ data, currentUser, language }: CommonViewProps) {
  const school = getSchool(data, currentUser);
  const users = scopedUsers(data, currentUser);
  const exercises = scopedExercises(data, currentUser);
  const activeCount = users.filter((user) => user.status === 'active').length;
  const disabledCount = users.filter((user) => user.status === 'disabled').length;
  const completed = currentUser.role === 'student' ? data.completions[currentUser.id]?.length ?? 0 : 0;
  const absenceCount =
    currentUser.role === 'student'
      ? data.absenceRecords.filter((record) => record.studentId === currentUser.id && record.sentAt && !record.deletedAt).length
      : 0;

  if (currentUser.role === 'director') {
    return (
      <section className="content-grid">
        <DirectorWeeklyReport data={data} currentUser={currentUser} language={language} />
      </section>
    );
  }

  return (
    <section className="ov-overview">
      <div className="ov-page-head">
        <div>
          <div className="ov-eyebrow">{tr(language, 'visibleScope')}</div>
          <h1 className="ov-h1">
            <RoleLabel role={currentUser.role} language={language} />
          </h1>
        </div>
      </div>

      <div className="ov-stats">
        <div className="ov-stat">
          <div className="ico">
            <Users size={15} aria-hidden="true" />
          </div>
          <div>
            <div className="lbl">{tr(language, 'activeUsers')}</div>
            <div className="val">{activeCount}</div>
          </div>
        </div>
        <div className="ov-stat">
          <div className="ico">
            <CircleOff size={15} aria-hidden="true" />
          </div>
          <div>
            <div className="lbl">{tr(language, 'disabledUsers')}</div>
            <div className="val">{disabledCount}</div>
          </div>
        </div>
        <div className="ov-stat pri">
          <div className="ico">
            <BookOpen size={15} aria-hidden="true" />
          </div>
          <div>
            <div className="lbl">{tr(language, 'totalExercises')}</div>
            <div className="val">{exercises.length}</div>
          </div>
        </div>
        {currentUser.role === 'student' && (
          <div className="ov-stat">
            <div className="ico">
              <CheckCircle2 size={15} aria-hidden="true" />
            </div>
            <div>
              <div className="lbl">{tr(language, 'completedExercises')}</div>
              <div className="val">{completed}</div>
            </div>
          </div>
        )}
        {currentUser.role === 'student' && (
          <div className="ov-stat">
            <div className="ico">
              <CalendarDays size={15} aria-hidden="true" />
            </div>
            <div>
              <div className="lbl">{tr(language, 'absentCount')}</div>
              <div className="val">{absenceCount}</div>
            </div>
          </div>
        )}
      </div>

      <div className="ov-panel">
        <div className="ov-panel-head">
          <h2>
            <LockKeyhole size={15} aria-hidden="true" />
            <span>{tr(language, 'visibleScope')}</span>
          </h2>
        </div>
        <dl className="ov-detail-list">
          {school && (
            <>
              <div>
                <dt>{tr(language, 'connectedSchool')}</dt>
                <dd>{school.name}</dd>
              </div>
              <div>
                <dt>{tr(language, 'connectedStage')}</dt>
                <dd>{stageNames[language][school.stage]}</dd>
              </div>
            </>
          )}
          {currentUser.subject && (
            <div>
              <dt>{tr(language, 'subject')}</dt>
              <dd>{currentUser.role === 'teacher' ? teacherSubjectsLabel(language, currentUser) : subjectNames[language][currentUser.subject]}</dd>
            </div>
          )}
          {currentUser.role === 'student' && (
            <div>
              <dt>{tr(language, 'guardianPhone')}</dt>
              <dd>{currentUser.guardianPhone?.trim() || '-'}</dd>
            </div>
          )}
          {assignedSchoolYears(currentUser).length > 0 && (
            <div>
              <dt>{currentUser.role === 'teacher' ? tr(language, 'schoolYears') : tr(language, 'schoolYear')}</dt>
              <dd>{schoolYearsLabel(language, currentUser)}</dd>
            </div>
          )}
          {assignedClassGroups(currentUser).length > 0 && (
            <div>
              <dt>{currentUser.role === 'teacher' ? tr(language, 'classGroups') : tr(language, 'classGroup')}</dt>
              <dd>{currentUser.role === 'teacher' ? yearClassGroupsLabel(language, currentUser) : classGroupsLabel(currentUser)}</dd>
            </div>
          )}
          {currentUser.stream && (
            <div>
              <dt>{tr(language, 'stream')}</dt>
              <dd>{secondaryStreamLabel(language, currentUser.stream, currentUser.schoolYear)}</dd>
            </div>
          )}
          <div>
            <dt>{tr(language, 'status')}</dt>
            <dd>{statusNames[language][currentUser.status]}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function DirectorWeeklyReport({ data, currentUser, language }: CommonViewProps) {
  const lines = reportLinesForDirector(data, currentUser, language);
  const reportTitle = `${tr(language, 'weeklyDirectorReport')} - ${weekRangeLabel(language)}`;
  const downloadReport = () => {
    const blob = createReportPdfBlob(reportTitle, lines, language);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-report-${todayIso()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel overview-context">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'weeklyReportReady')}</p>
          <h2>{tr(language, 'weeklyDirectorReport')}</h2>
        </div>
        <CalendarDays size={24} aria-hidden="true" />
      </div>
      <div className="weekly-report">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <button className="button primary" type="button" onClick={downloadReport}>
        <Download size={17} aria-hidden="true" />
        <span>{tr(language, 'sendWeeklyReport')}</span>
      </button>
    </div>
  );
}

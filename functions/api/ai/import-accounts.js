const MAX_INPUT_LENGTH = 12000;
const MAX_PDF_SIZE = 5_000_000;
const MODEL = '@cf/meta/llama-3.1-8b-instruct';

const subjects = [
  'math',
  'arabic',
  'science',
  'physics',
  'history',
  'primary_history',
  'geography',
  'french',
  'english',
  'islamic_education',
  'civic_education',
  'scientific_technology',
  'art_education',
  'music_education',
  'arabic_literature',
  'life_science',
  'physical_science_technology',
  'islamic_science',
  'philosophy',
  'computer_science',
  'physical_education',
  'tamazight',
  'civil_engineering_subject',
  'electrical_engineering_subject',
  'mechanical_engineering_subject',
  'process_engineering_subject',
  'physical_sciences',
  'technology',
  'spanish',
  'german',
  'italian'
];

const subjectHints = {
  math: ['الرياضيات', 'رياضيات', 'mathématiques', 'mathematics', 'math'],
  arabic: ['اللغة العربية', 'العربية', 'arabe', 'arabic'],
  science: ['العلوم الطبيعية', 'sciences naturelles', 'natural sciences'],
  physics: ['الفيزياء', 'physique', 'physics'],
  history: ['التاريخ والجغرافيا', 'histoire-géographie', 'history and geography'],
  primary_history: ['التاريخ', 'histoire', 'history'],
  geography: ['الجغرافيا', 'géographie', 'geography'],
  french: ['اللغة الفرنسية', 'français', 'french'],
  english: ['اللغة الإنجليزية', 'anglais', 'english'],
  islamic_education: ['التربية الإسلامية', 'éducation islamique', 'islamic education'],
  civic_education: ['التربية المدنية', 'éducation civique', 'civic education'],
  scientific_technology: ['التربية العلمية والتكنولوجية', 'éducation scientifique et technologique'],
  art_education: ['التربية الفنية', 'éducation artistique', 'art education'],
  music_education: ['التربية الموسيقية', 'éducation musicale', 'music education'],
  arabic_literature: ['اللغة العربية وآدابها', 'langue arabe et littérature'],
  life_science: ['علوم الطبيعة والحياة', 'sciences de la nature et de la vie'],
  physical_science_technology: ['العلوم الفيزيائية والتكنولوجيا', 'sciences physiques et technologie'],
  islamic_science: ['العلوم الإسلامية', 'sciences islamiques'],
  philosophy: ['الفلسفة', 'philosophie'],
  computer_science: ['الإعلام الآلي', 'informatique', 'computer science'],
  physical_education: ['التربية البدنية والرياضية', 'éducation physique et sportive'],
  tamazight: ['الأمازيغية', 'tamazight'],
  civil_engineering_subject: ['هندسة مدنية', 'génie civil', 'civil engineering'],
  electrical_engineering_subject: ['هندسة كهربائية', 'génie électrique', 'electrical engineering'],
  mechanical_engineering_subject: ['هندسة ميكانيكية', 'génie mécanique', 'mechanical engineering'],
  process_engineering_subject: ['هندسة الطرائق', 'génie des procédés', 'process engineering'],
  physical_sciences: ['العلوم الفيزيائية', 'sciences physiques'],
  technology: ['التكنولوجيا', 'technologie', 'technology'],
  spanish: ['اللغة الإسبانية', 'espagnol', 'spanish'],
  german: ['اللغة الألمانية', 'allemand', 'german'],
  italian: ['اللغة الإيطالية', 'italien', 'italian']
};

const streams = [
  'experimental_science',
  'mathematics',
  'civil_engineering',
  'electrical_engineering',
  'mechanical_engineering',
  'process_engineering',
  'management_economics',
  'literature_philosophy',
  'foreign_languages'
];

const streamHints = {
  experimental_science: ['علوم تجريبية', 'sciences expérimentales', 'experimental sciences'],
  mathematics: ['رياضيات', 'mathématiques', 'mathematics'],
  civil_engineering: ['تقني رياضي هندسة مدنية', 'génie civil', 'civil engineering'],
  electrical_engineering: ['تقني رياضي هندسة كهربائية', 'génie électrique', 'electrical engineering'],
  mechanical_engineering: ['تقني رياضي هندسة ميكانيكية', 'génie mécanique', 'mechanical engineering'],
  process_engineering: ['تقني رياضي هندسة الطرائق', 'génie des procédés', 'process engineering'],
  management_economics: ['تسيير واقتصاد', 'gestion et économie', 'management and economics'],
  literature_philosophy: ['آداب وفلسفة', 'آداب', 'lettres', 'literature and philosophy'],
  foreign_languages: ['لغات أجنبية', 'langues étrangères', 'foreign languages']
};

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers ?? {})
    }
  });
}

function normalizeStage(value) {
  return value === 'primary' || value === 'middle' || value === 'secondary' ? value : 'middle';
}

function normalizeLanguage(value) {
  return value === 'ar' || value === 'fr' || value === 'en' ? value : 'ar';
}

function parseJsonObject(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function parseAiJson(result) {
  const candidate = result?.response ?? result;
  if (typeof candidate === 'string') {
    try {
      return JSON.parse(candidate);
    } catch {
      const start = candidate.indexOf('{');
      const end = candidate.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(candidate.slice(start, end + 1));
        } catch {
          return { accounts: [] };
        }
      }

      return { accounts: [] };
    }
  }

  if (candidate && typeof candidate === 'object') {
    return candidate;
  }

  return { accounts: [] };
}

function cleanClassGroup(value) {
  return String(value ?? '')
    .trim()
    .replace(/^(class|classe|group|groupe|section|قسم)\s*/i, '')
    .replace(/\b(primary|middle|secondary|primaire|moyen|secondaire)\b/gi, '')
    .replace(/\b(first|second|third|fourth|fifth)\s+year\b/gi, '')
    .replace(/السنة\s+(الأولى|الاولى|الثانية|الثالثة|الرابعة|الخامسة)/g, '')
    .replace(/\b(ابتدائي|متوسط|ثانوي)\b/g, '')
    .trim();
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, '')
    .toLowerCase();
}

function findSubject(line) {
  const normalized = normalizeText(line);

  for (const [subject, hints] of Object.entries(subjectHints)) {
    if (hints.some((hint) => normalized.includes(normalizeText(hint)))) {
      return subject;
    }
  }

  return '';
}

function findStream(line) {
  const normalized = normalizeText(line);

  for (const [stream, hints] of Object.entries(streamHints)) {
    if (hints.some((hint) => normalized.includes(normalizeText(hint)))) {
      return stream;
    }
  }

  return '';
}

function findSchoolYear(line) {
  const normalized = normalizeText(line);
  const digitMatch = normalized.match(/(?:السنة|year|annee|année)\s*(\d)/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const yearWords = [
    ['الأولى', 'الاولى', 'اولى', 'premiere', 'première', 'first'],
    ['الثانية', 'ثانية', 'deuxieme', 'deuxième', 'second'],
    ['الثالثة', 'ثالثة', 'troisieme', 'troisième', 'third'],
    ['الرابعة', 'رابعة', 'quatrieme', 'quatrième', 'fourth'],
    ['الخامسة', 'خامسة', 'cinquieme', 'cinquième', 'fifth']
  ];

  const index = yearWords.findIndex((words) => words.some((word) => normalized.includes(normalizeText(word))));
  return index >= 0 ? index + 1 : 0;
}

function findClassGroup(line) {
  const match = String(line).match(/(?:قسم|class|classe|groupe|group|section)\s*[:\-]?\s*([A-Za-z0-9\u0621-\u064A]+)/i);
  return match ? cleanClassGroup(match[1]) : '';
}

function findRole(line) {
  const normalized = normalizeText(line);
  if (/(استاذ|أستاذ|teacher|enseignant|professeur|\bprof\b)/i.test(normalized)) {
    return 'teacher';
  }

  if (/(تلميذ|تلميذة|student|eleve|élève)/i.test(normalized)) {
    return 'student';
  }

  return '';
}

function findName(line, role) {
  const rolePattern =
    role === 'teacher'
      ? /(أستاذ|استاذ|teacher|enseignant|professeur|\bprof\b)/i
      : /(تلميذ|تلميذة|student|eleve|élève)/i;
  const beforeRole = String(line).split(rolePattern)[0]?.trim();
  if (beforeRole) {
    return beforeRole.replace(/^[\-\s:]+|[\-\s:]+$/g, '').trim();
  }

  return String(line)
    .replace(rolePattern, '')
    .replace(/(?:السنة|year|annee|année|قسم|class|classe).*/i, '')
    .trim();
}

function fallbackParseAccounts(text, stage) {
  return String(text)
    .split(/\r?\n|`n|[؛;]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const role = findRole(line);
      if (!role) {
        return null;
      }

      const schoolYear = findSchoolYear(line);
      const classGroup = findClassGroup(line);
      const stream = stage === 'secondary' ? findStream(line) : '';
      const subject = role === 'teacher' ? findSubject(line) : '';
      const name = findName(line, role);

      return {
        role,
        name,
        email: '',
        password: '',
        subject,
        schoolYear: schoolYear || undefined,
        classGroup,
        stream,
        assignments:
          role === 'teacher' && schoolYear && classGroup
            ? [
                {
                  schoolYear,
                  stream,
                  classGroups: [classGroup]
                }
              ]
            : [],
        confidence: 0.6,
        warnings: [],
        sourceText: line
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

function sanitizeAccounts(value) {
  const accounts = Array.isArray(value?.accounts) ? value.accounts : [];

  return accounts
    .map((account) => {
      if (!account || typeof account !== 'object') {
        return null;
      }

      const role = account.role === 'teacher' || account.role === 'student' ? account.role : '';
      if (!role) {
        return null;
      }

      let assignments = Array.isArray(account.assignments)
        ? account.assignments
            .map((assignment) => ({
              schoolYear: Number(assignment?.schoolYear) || 0,
              stream: streams.includes(assignment?.stream) ? assignment.stream : '',
              classGroups: Array.isArray(assignment?.classGroups)
                ? assignment.classGroups.map(cleanClassGroup).filter(Boolean).slice(0, 8)
                : []
            }))
            .filter((assignment) => assignment.schoolYear > 0 && assignment.classGroups.length > 0)
            .slice(0, 12)
        : [];
      const schoolYear = Number(account.schoolYear) || undefined;
      const classGroup = cleanClassGroup(account.classGroup);
      const stream = streams.includes(account.stream) ? account.stream : '';

      if (role === 'teacher' && assignments.length === 0 && schoolYear && classGroup) {
        assignments = [
          {
            schoolYear,
            stream,
            classGroups: [classGroup]
          }
        ];
      }

      return {
        role,
        name: String(account.name ?? '').trim(),
        email: String(account.email ?? '').trim(),
        password: String(account.password ?? '').trim(),
        subject: subjects.includes(account.subject) ? account.subject : '',
        schoolYear,
        classGroup,
        stream,
        assignments,
        confidence: typeof account.confidence === 'number' ? Math.max(0, Math.min(account.confidence, 1)) : undefined,
        warnings: Array.isArray(account.warnings) ? account.warnings.map(String).filter(Boolean).slice(0, 4) : [],
        sourceText: String(account.sourceText ?? '').trim()
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

async function markdownFromPdf(env, file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return '';
  }

  if (file.size > MAX_PDF_SIZE) {
    throw new Error('PDF file is too large.');
  }

  const type = file.type || 'application/pdf';
  const name = file.name || 'accounts.pdf';

  if (type !== 'application/pdf' && !name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are supported.');
  }

  const result = await env.AI.toMarkdown(
    {
      name,
      blob: new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
    },
    {
      conversionOptions: {
        pdf: { metadata: false }
      }
    }
  );

  if (Array.isArray(result)) {
    return result.map((item) => (item?.format === 'markdown' ? item.data ?? '' : '')).join('\n\n');
  }

  if (result?.format === 'error') {
    throw new Error(result.error || 'PDF conversion failed.');
  }

  return result?.data ?? '';
}

async function readPayload(request, env) {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('multipart/form-data')) {
    const payload = await request.json();
    return {
      text: String(payload.text ?? '').trim(),
      language: payload.language,
      school: parseJsonObject(payload.school)
    };
  }

  const formData = await request.formData();
  const text = String(formData.get('text') ?? '').trim();
  const language = String(formData.get('language') ?? '');
  const school = parseJsonObject(formData.get('school'));
  const file = formData.get('file');
  const pdfText = file && typeof file === 'object' && typeof file.arrayBuffer === 'function' ? await markdownFromPdf(env, file) : '';

  return {
    text: [text, pdfText].filter(Boolean).join('\n\n'),
    language,
    school
  };
}

export async function onRequestPost(context) {
  if (!context.env.AI) {
    return jsonResponse({ error: 'Workers AI binding AI is not configured.' }, { status: 503 });
  }

  let payload;
  try {
    payload = await readPayload(context.request, context.env);
  } catch {
    return jsonResponse({ error: 'Invalid import request.' }, { status: 400 });
  }

  const text = String(payload.text ?? '').trim().slice(0, MAX_INPUT_LENGTH);
  if (!text) {
    return jsonResponse({ accounts: [] });
  }

  const school = payload.school && typeof payload.school === 'object' ? payload.school : {};
  const stage = normalizeStage(school.stage);
  const language = normalizeLanguage(payload.language);
  const domain = String(school.domain ?? '').replace(/^@/, '').trim();
  const enabledStreams = Array.isArray(school.streams) ? school.streams.filter((stream) => streams.includes(stream)) : [];
  const maxYear = stage === 'primary' ? 5 : stage === 'middle' ? 4 : 3;

  const schema = {
    type: 'object',
    properties: {
      accounts: {
        type: 'array',
        maxItems: 40,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            role: { type: 'string', enum: ['teacher', 'student'] },
            name: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
            subject: { type: 'string', enum: ['', ...subjects] },
            schoolYear: { type: 'number' },
            classGroup: { type: 'string' },
            stream: { type: 'string', enum: ['', ...streams] },
            assignments: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  schoolYear: { type: 'number' },
                  stream: { type: 'string', enum: ['', ...streams] },
                  classGroups: { type: 'array', items: { type: 'string' } }
                },
                required: ['schoolYear', 'stream', 'classGroups']
              }
            },
            confidence: { type: 'number' },
            warnings: { type: 'array', items: { type: 'string' } },
            sourceText: { type: 'string' }
          },
          required: ['role', 'name', 'email', 'password', 'subject', 'schoolYear', 'classGroup', 'stream', 'assignments', 'confidence', 'warnings', 'sourceText']
        }
      }
    },
    required: ['accounts'],
    additionalProperties: false
  };

  const systemPrompt = [
    'You extract account drafts for an Algerian school management platform.',
    'Return only JSON matching the schema.',
    'Only create teacher and student accounts. Ignore directors, admins, parents, and unrelated lines.',
    `The current school stage is ${stage}, with years 1 to ${maxYear}.`,
    `The school email domain is @${domain}. If an email is missing, create a simple email on this domain.`,
    'If a password is missing, leave password empty; the app can generate one.',
    'For teachers: use exactly one subject code. Put year/class/stream targets in assignments. If one teacher has multiple years, streams, or classes, use multiple assignment objects.',
    'For students: use schoolYear, classGroup, and stream only when the school is secondary.',
    "Class groups must contain only the group number or letter, for example '1', '2', 'A'. Never include words like class, year, primary, middle, secondary, ابتدائي, متوسط, ثانوي in classGroups.",
    'Secondary first year only uses experimental_science or literature_philosophy when mentioned.',
    'For primary year 1 and 2, French and English should not be selected.',
    `Allowed subject codes and hints: ${JSON.stringify(subjectHints)}`,
    `Allowed stream codes and hints: ${JSON.stringify(streamHints)}`,
    `Enabled streams for this school: ${JSON.stringify(enabledStreams)}`
  ].join('\n');

  const userPrompt = [
    `Interface language: ${language}`,
    `School name: ${String(school.name ?? '')}`,
    'Raw list:',
    text
  ].join('\n\n');

  const aiRequest = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  try {
    let aiResult;

    try {
      aiResult = await context.env.AI.run(MODEL, {
        ...aiRequest,
        response_format: {
          type: 'json_schema',
          json_schema: schema
        }
      });
    } catch {
      aiResult = await context.env.AI.run(MODEL, {
        ...aiRequest,
        response_format: { type: 'json_object' }
      }).catch(() => context.env.AI.run(MODEL, aiRequest));
    }

    const accounts = sanitizeAccounts(parseAiJson(aiResult));
    const fallbackAccounts = fallbackParseAccounts(text, stage);
    return jsonResponse({ accounts: accounts.length >= fallbackAccounts.length ? accounts : fallbackAccounts });
  } catch (error) {
    return jsonResponse({ error: 'Workers AI request failed.' }, { status: 502 });
  }
}

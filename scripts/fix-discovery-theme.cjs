const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = process.cwd();
const uiFile = 'src/features/discovery/ui.tsx';

const files = [
  'src/app/explore.tsx',
  'src/app/itinerary.tsx',
  ...[
    'add-stop-sheet',
    'advanced-place-filters-sheet',
    'place-thumb',
    'trip-calendar-sheet',
    'trip-history-card',
    'trip-origin-picker',
    'trip-results-sheet',
    'trip-settings-sheet',
    'trip-stop-card',
    'trip-summary-sheet',
    'trip-guidance',
    'selected-places-map',
    'selected-places-map.native',
  ].map(name => `src/features/discovery/${name}.tsx`),
];

const marker = '// Discovery theme fix v1';
const originals = new Map();
const updates = new Map();

function read(file) {
  const text = fs.readFileSync(
    path.join(root, file),
    'utf8',
  );

  originals.set(file, text);

  return text.replace(/\r\n/g, '\n');
}

function parse(file, text) {
  const node = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  if (node.parseDiagnostics.length) {
    throw new Error(
      `File dang co loi cu phap: ${file}`,
    );
  }

  return node;
}

function walk(node, fn) {
  fn(node);

  ts.forEachChild(
    node,
    child => walk(child, fn),
  );
}

function edit(text, changes) {
  const ordered = changes.sort(
    (a, b) => b.start - a.start,
  );

  for (const change of ordered) {
    text =
      text.slice(0, change.start) +
      change.text +
      text.slice(change.end);
  }

  return text;
}

let ui = read(uiFile);

if (ui.includes(marker)) {
  throw new Error(
    'Da ap dung ban sua nay. Khong can chay lai.',
  );
}

const hook = ui.indexOf(
  'export function useDiscoveryUI()',
);

if (hook < 0) {
  throw new Error(
    'Khong tim thay useDiscoveryUI. Chua thay doi file nao.',
  );
}

ui = ui.slice(0, hook) + `${marker}
export function discoveryUIForColors(
  colors: ReturnType<typeof useSettingsColors>,
) {
  const dark = colors.background === '#0C1421';

  const palette = {
    ...C,
    isDark: dark,
    bg: colors.background,
    background: colors.background,
    card: colors.card,
    input: colors.input,
    ink: colors.text,
    text: colors.text,
    muted: colors.muted,
    green: colors.green,
    deep: colors.green,
    pale: colors.pale,
    line: colors.line,
    danger: colors.danger,
    overlay: colors.overlay,
    onAccent: dark ? '#09251B' : '#FFFFFF',
    warning: dark ? '#F5CC77' : '#9A6200',
    warningBg: dark ? '#392D19' : '#FFFBEE',
    successBg: dark ? '#15382D' : '#F1FCF6',
    dangerBg: dark ? '#40232D' : '#FFF1F2',
  };

  return {
    C: palette,
    s: {
      ...s,
      title: [s.title, { color: colors.text }],
      muted: [s.muted, { color: colors.muted }],
      label: [s.label, { color: colors.muted }],
      card: [
        s.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
        },
      ],
      input: [
        s.input,
        {
          backgroundColor: colors.input,
          color: colors.text,
          borderColor: colors.line,
        },
      ],
      button: [
        s.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
        },
      ],
      buttonText: [
        s.buttonText,
        { color: colors.green },
      ],
      error: [s.error, { color: colors.danger }],
      backdrop: [
        s.backdrop,
        { backgroundColor: colors.overlay },
      ],
      sheet: [
        s.sheet,
        { backgroundColor: colors.card },
      ],
      sheetHeader: [
        s.sheetHeader,
        { borderBottomColor: colors.line },
      ],
      sheetFooter: [
        s.sheetFooter,
        { borderTopColor: colors.line },
      ],
      close: [
        s.close,
        { backgroundColor: colors.input },
      ],
      titleIcon: [
        s.titleIcon,
        { backgroundColor: colors.pale },
      ],
      pill: [
        s.pill,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
        },
      ],
      pillActive: [
        s.pillActive,
        {
          backgroundColor: colors.pale,
          borderColor: colors.green,
        },
      ],
    },
  };
}

export function useDiscoveryUI() {
  const colors = useSettingsColors();

  return useMemo(
    () => discoveryUIForColors(colors),
    [colors],
  );
}
`;

ui = ui.replace(
  /const \{ s \} = useDiscoveryUI\(\);/,
  'const { C, s } = useDiscoveryUI();',
);

ui = ui.replace(
  /solid && \{\s*backgroundColor: '#087F61',\s*borderColor: '#087F61',\s*\}/,
  'solid && { backgroundColor: C.deep, borderColor: C.deep }',
);

ui = ui.replace(
  /danger && \{\s*backgroundColor: '#FFF1F2',\s*borderColor: '#FECDD3',\s*\}/,
  'danger && { backgroundColor: C.dangerBg, borderColor: C.danger }',
);

ui = ui.replace(
  "solid && { color: '#FFF' }",
  'solid && { color: C.onAccent }',
);

ui = ui.replace(
  "danger && { color: '#E65565' }",
  'danger && { color: C.danger }',
);

updates.set(uiFile, ui);

const colors = {
  '#F6F9FC': 'bg',
  '#F7FAFE': 'bg',
  '#F6F8FC': 'input',
  '#F8FAFC': 'input',
  '#F0F6F5': 'input',
  '#E4F3EC': 'pale',
  '#639581': 'muted',
  '#F1F5F9': 'input',
  '#E6EEF3': 'input',
  '#EAF2F4': 'input',
  '#253347': 'ink',
  '#334155': 'ink',
  '#536B83': 'muted',
  '#596579': 'muted',
  '#64748B': 'muted',
  '#7A899E': 'muted',
  '#718096': 'muted',
  '#94A3B8': 'muted',
  '#8593A4': 'muted',
  '#E1E9F1': 'line',
  '#E2E8F0': 'line',
  '#DFE8EF': 'line',
  '#DCE6EE': 'line',
  '#E1E8ED': 'line',
  '#087F61': 'deep',
  '#3E8E4F': 'deep',
  '#168267': 'deep',
  '#ECFDF5': 'pale',
  '#E8F5EF': 'pale',
  '#B91C1C': 'danger',
  '#DC2626': 'danger',
  '#B42318': 'danger',
  '#D58208': 'warning',
  '#D99A20': 'warning',
  '#F1BE51': 'warning',
  '#F6D389': 'warning',
  '#FFFBEE': 'warningBg',
  '#FFF0C7': 'warningBg',
  '#F1FCF6': 'successBg',
  '#0F172A88': 'overlay',
};

for (const file of files) {
  let text = read(file);

  if (
    file.endsWith(
      'advanced-place-filters-sheet.tsx',
    )
  ) {
    text = text.replace(
      /^const FILTER_COLORS = .*;\n/m,
      '',
    );

    text = text.replace(
      /const c = FILTER_COLORS;/g,
      'const { C: c } = useDiscoveryUI();',
    );
  }

  const map = file.includes(
    'selected-places-map',
  );

  const source = parse(file, text);
  const changes = [];

  walk(source, node => {
    if (!ts.isStringLiteral(node)) return;

    const hex = node.text.toUpperCase();
    let token = colors[hex];

    if (hex === '#FFFFFFF2') {
      token = 'card';
    }

    if (
      hex === '#FFF' ||
      hex === '#FFFFFF'
    ) {
      const parent = node.parent;

      token =
        ts.isPropertyAssignment(parent) &&
        /backgroundColor|border.*Color/.test(
          parent.name.getText(source),
        )
          ? 'card'
          : 'onAccent';
    }

    if (map) {
      const parent = node.parent;

      if (
        !ts.isPropertyAssignment(parent) ||
        !['backgroundColor', 'color'].includes(
          parent.name.getText(source),
        )
      ) {
        return;
      }

      if (
        ![
          '#EAF2F4',
          '#F0F6F5',
          '#64748B',
          '#718096',
        ].includes(hex)
      ) {
        return;
      }
    }

    if (token) {
      changes.push({
        start: node.getStart(source),
        end: node.end,
        text: ts.isJsxAttribute(node.parent)
          ? `{C.${token}}`
          : `C.${token}`,
      });
    }
  });

  text = edit(text, changes);

  let parsed = parse(file, text);
  const factories = [];
  const styleChanges = [];

  for (const statement of parsed.statements) {
    if (
      !ts.isVariableStatement(statement)
    ) {
      continue;
    }

    for (
      const decl of
      statement.declarationList.declarations
    ) {
      if (
        !decl.initializer ||
        !ts.isCallExpression(decl.initializer) ||
        decl.initializer.expression.getText(
          parsed,
        ) !== 'StyleSheet.create'
      ) {
        continue;
      }

      if (
        !/\bC\./.test(
          decl.initializer.getText(parsed),
        )
      ) {
        continue;
      }

      const name = decl.name.getText(parsed);

      const factory =
        'create' +
        name[0].toUpperCase() +
        name.slice(1);

      factories.push({ name, factory });

      styleChanges.push({
        start: decl.getStart(parsed),
        end: decl.initializer.getStart(parsed),
        text:
          `${factory} = ` +
          `(C: ReturnType<typeof useDiscoveryUI>['C']) => `,
      });
    }
  }

  text = edit(text, styleChanges);
  parsed = parse(file, text);

  const functionChanges = [];
  let needsHook =
    text.includes('useDiscoveryUI()');

  for (const node of parsed.statements) {
    if (
      !ts.isFunctionDeclaration(node) ||
      !node.name ||
      !/^[A-Z]/.test(node.name.text) ||
      !node.body
    ) {
      continue;
    }

    const body = node.body.getText(parsed);

    const localFactories = factories.filter(
      f =>
        new RegExp(
          `\\b${f.name}\\.`,
        ).test(body),
    );

    const wanted = [];

    if (
      /\bC\./.test(body) ||
      localFactories.length
    ) {
      wanted.push('C');
    }

    if (/\bs\./.test(body)) {
      wanted.push('s');
    }

    if (!wanted.length) continue;

    const bound = new Set();

    for (
      const statement of node.body.statements
    ) {
      if (
        !ts.isVariableStatement(statement)
      ) {
        continue;
      }

      for (
        const declaration of
        statement.declarationList.declarations
      ) {
        if (
          !declaration.initializer ||
          !ts.isCallExpression(
            declaration.initializer,
          ) ||
          declaration.initializer.expression.getText(
            parsed,
          ) !== 'useDiscoveryUI' ||
          !ts.isObjectBindingPattern(
            declaration.name,
          )
        ) {
          continue;
        }

        for (
          const binding of
          declaration.name.elements
        ) {
          bound.add(
            binding.name.getText(parsed),
          );
        }
      }
    }

    const missing = wanted.filter(
      name => !bound.has(name),
    );

    const addition =
      (
        missing.length
          ? `\n  const { ${missing.join(', ')} } = useDiscoveryUI();\n`
          : ''
      ) +
      localFactories.map(
        f =>
          `  const ${f.name} = ${f.factory}(C);\n`,
      ).join('');

    functionChanges.push({
      start: node.body.getStart(parsed) + 1,
      end: node.body.getStart(parsed) + 1,
      text: addition,
    });

    needsHook = true;
  }

  text = edit(text, functionChanges);

  if (needsHook) {
    parsed = parse(file, text);

    const imports = [];
    let added = false;

    for (const node of parsed.statements) {
      if (
        !ts.isImportDeclaration(node) ||
        ![
          './ui',
          '@/features/discovery/ui',
        ].includes(node.moduleSpecifier.text)
      ) {
        continue;
      }

      const bindings =
        node.importClause?.namedBindings;

      if (
        !bindings ||
        !ts.isNamedImports(bindings)
      ) {
        continue;
      }

      const names = bindings.elements
        .map(n => n.getText(parsed))
        .filter(
          n =>
            ![
              'C',
              's',
              'useDiscoveryUI',
            ].includes(n),
        );

      names.push('useDiscoveryUI');

      imports.push({
        start: bindings.getStart(parsed),
        end: bindings.end,
        text: `{ ${names.join(', ')} }`,
      });

      added = true;
    }

    text = edit(text, imports);

    if (!added) {
      text =
        "import { useDiscoveryUI } from '@/features/discovery/ui';\n" +
        text;
    }
  }

  if (file === 'src/app/explore.tsx') {
    const tree = parse(file, text);
    const callbacks = [];

    walk(tree, node => {
      if (
        !ts.isCallExpression(node) ||
        node.expression.getText(tree) !==
          'useCallback'
      ) {
        return;
      }

      const deps = node.arguments[1];

      if (
        !deps ||
        !ts.isArrayLiteralExpression(deps)
      ) {
        return;
      }

      const setters = [
        'setAddPlace',
        'setSummary',
        'setCategory',
        'setActiveFilters',
        'setQuery',
        'setLimit',
        'setDetails',
      ];

      const existing = deps.elements.map(
        item => item.getText(tree),
      );

      for (const name of setters) {
        if (
          new RegExp(
            `\\b${name}\\b`,
          ).test(
            node.arguments[0].getText(tree),
          ) &&
          !existing.includes(name)
        ) {
          existing.push(name);
        }
      }

      callbacks.push({
        start: deps.getStart(tree),
        end: deps.end,
        text: '[' + existing.join(', ') + ']',
      });
    });

    text = edit(text, callbacks);
  }

  if (
    file.endsWith(
      '/selected-places-map.tsx',
    )
  ) {
    text = text
      .replace(
        '<Text>',
        '<Text style={{ color: C.ink }}>',
      )
      .replace(
        '<Text key={`${place.id}-${i}`}>',
        '<Text key={`${place.id}-${i}`} style={{ color: C.ink }}>',
      );
  }

  if (
    map &&
    file.endsWith('.native.tsx')
  ) {
    text = text.replace(
      'mapStyle="https://tiles.openfreemap.org/styles/liberty"',
      "mapStyle={C.isDark ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/liberty'}",
    );
  }

  if (
    text !== originals.get(file).replace(
      /\r\n/g,
      '\n',
    )
  ) {
    updates.set(file, text);
  }
}

for (const [file, text] of updates) {
  parse(file, text);
}

const backup = path.join(
  path.dirname(root),
  'backup-discovery-theme-' + Date.now(),
);

for (const [file, text] of updates) {
  const saved = path.join(backup, file);

  fs.mkdirSync(
    path.dirname(saved),
    { recursive: true },
  );

  fs.writeFileSync(
    saved,
    originals.get(file),
  );

  fs.writeFileSync(
    path.join(root, file),
    text,
    'utf8',
  );

  console.log('Updated:', file);
}

console.log('Backup:', backup);
console.log('Next: npx tsc --noEmit');
console.log('Then: npx eslint .');
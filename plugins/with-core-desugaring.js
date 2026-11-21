const {
  withAppBuildGradle,
} = require('expo/config-plugins');

function patchGradle(source) {
  let next = source;

  const flag =
    /coreLibraryDesugaringEnabled\s*(?:=\s*)?(?:true|false)/;

  if (flag.test(next)) {
    next = next.replace(
      flag,
      'coreLibraryDesugaringEnabled true',
    );
  } else if (/compileOptions\s*\{/.test(next)) {
    next = next.replace(
      /compileOptions\s*\{/,
      '$&\n        coreLibraryDesugaringEnabled true',
    );
  } else {
    if (!/android\s*\{/.test(next)) {
      throw new Error(
        'Không tìm thấy android { trong app/build.gradle.',
      );
    }

    next = next.replace(
      /android\s*\{/,
      '$&\n    compileOptions {\n' +
        '        coreLibraryDesugaringEnabled true\n' +
        '    }\n',
    );
  }

  if (
    !next.includes(
      'com.android.tools:desugar_jdk_libs:',
    )
  ) {
    next +=
      '\n// Required by Google Navigation SDK.\n' +
      'dependencies {\n' +
      '    coreLibraryDesugaring(' +
      '"com.android.tools:desugar_jdk_libs:2.1.5")\n' +
      '}\n';
  }

  return next;
}

module.exports = function withCoreDesugaring(config) {
  return withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error(
        'Plugin này dùng cho app/build.gradle dạng Groovy.',
      );
    }

    mod.modResults.contents = patchGradle(
      mod.modResults.contents,
    );

    return mod;
  });
};

module.exports.patchGradle = patchGradle;
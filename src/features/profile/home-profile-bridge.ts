export function homeProfileBridge(
  displayName: string,
) {
  const data = JSON.stringify(displayName)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `
    (function () {
      var name = ${data};

      var el =
        document.getElementById('username');

      if (el) {
        el.textContent = name;
      }

      var button =
        document.getElementById('profile-prompt');

      if (button) {
        button.textContent = 'Hồ sơ';
      }
    })();

    true;
  `;
}
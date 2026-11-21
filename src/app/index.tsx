// import { StyleSheet, View } from 'react-native';
// import { WebView } from 'react-native-webview';
// import travelHtml from '../../data/sdt-html';
// export default function HomeScreen() {
//   return (
//     <View style={styles.container}>
//       <WebView
//         originWhitelist={['*']}
//         source={{ html: travelHtml, baseUrl: 'https://localhost/' }}
//         javaScriptEnabled
//         domStorageEnabled
//         mixedContentMode="compatibility"
//         scrollEnabled={false}
//         style={styles.webview}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#ffffff' },
//   webview: { flex: 1, backgroundColor: '#ffffff' },
// });
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import travelHtml from '../../data/sdt-html';

const homeStyles = `
<style>
  .bottom-nav,
  #bottom-main-nav {
    display: none !important;
  }

  .screen:not(#home),
  .app-screen-view:not(#screen-s1) {
    display: none !important;
  }

  #home,
  #screen-s1 {
    display: block !important;
    padding-bottom: 16px !important;
  }
</style>
`;

const homeHtml = travelHtml.replace(
  /<\/head>/i,
  `${homeStyles}</head>`,
);

const bridge = String.raw`
(function () {
  if (window.__SDT_NAV_BRIDGE__) return;
  window.__SDT_NAV_BRIDGE__ = true;

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var button = target.closest(
      '[data-action="nav"], [onclick]'
    );

    if (!button) return;

    var tab =
      button.getAttribute('data-action') === 'nav'
        ? button.getAttribute('data-tab')
        : null;

    var code = button.getAttribute('onclick') || '';

    var match = code.match(
      /switchTab\s*\(\s*([1-4])\s*\)/
    );

    if (!tab && match) {
      tab = {
        '1': 'home',
        '2': 'explore',
        '3': 'planner',
        '4': 'settings'
      }[match[1]];
    }

    if (!tab && /openChatbotScreen\s*\(/.test(code)) {
      tab = 'assistant';
    }

    var allowed = [
      'home',
      'explore',
      'planner',
      'itinerary',
      'assistant',
      'ai',
      'settings'
    ];

    if (allowed.indexOf(tab) < 0) return;
    if (!window.ReactNativeWebView) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'SDT_NAVIGATE',
        tab: tab
      })
    );
  }, true);
})();
true;
`;

const routes = {
  home: '/',
  explore: '/explore',
  planner: '/itinerary',
  itinerary: '/itinerary',
  assistant: '/assistant',
  ai: '/assistant',
  settings: '/settings',
} as const;

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{
          html: homeHtml,
          baseUrl: 'https://localhost/',
        }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        scrollEnabled={false}
        injectedJavaScript={bridge}
        onMessage={event => {
          try {
            const message = JSON.parse(
              event.nativeEvent.data,
            );

            if (
              message?.type !== 'SDT_NAVIGATE' ||
              typeof message.tab !== 'string'
            ) {
              return;
            }

            if (
              Object.prototype.hasOwnProperty.call(
                routes,
                message.tab,
              )
            ) {
              router.navigate(
                routes[
                  message.tab as keyof typeof routes
                ],
              );
            }
          } catch {
            // Bỏ qua thông điệp không thuộc điều hướng.
          }
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFF',
  },
});
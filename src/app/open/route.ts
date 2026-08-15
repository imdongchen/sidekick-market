const APP_SCHEME = 'sidekick://open'
const FALLBACK_URL = 'https://sidekickswim.com'

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening Sidekick</title>
  <style>
    :root { color-scheme: dark; }
    html, body {
      margin: 0;
      min-height: 100%;
      background: #07131f;
      color: #e8f2f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    main {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      text-align: center;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.03em;
    }
    p {
      margin: 0 0 28px;
      max-width: 22rem;
      color: rgba(232, 242, 248, 0.55);
      font-size: 16px;
      line-height: 1.5;
    }
    a {
      color: #7dd3fc;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <h1>Opening Sidekick</h1>
    <p>If the app doesn’t open, continue on the web.</p>
    <a href="${FALLBACK_URL}">Go to sidekickswim.com</a>
  </main>
  <script>
    (function () {
      var appUrl = ${JSON.stringify(APP_SCHEME)};
      var fallbackUrl = ${JSON.stringify(FALLBACK_URL)};
      var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

      if (!isMobile) {
        window.location.replace(fallbackUrl);
        return;
      }

      var left = false;
      function markLeft() { left = true; }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) markLeft();
      });
      window.addEventListener('pagehide', markLeft);
      window.addEventListener('blur', markLeft);

      window.location.href = appUrl;

      setTimeout(function () {
        if (!left && !document.hidden) {
          window.location.replace(fallbackUrl);
        }
      }, 1500);
    })();
  </script>
</body>
</html>`

export function GET() {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}

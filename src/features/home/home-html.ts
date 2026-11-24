export const HOME_HTML = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">

<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden}
body{font-family:system-ui,sans-serif;background:var(--background,#f6f9fc);color:var(--text,#253347);-webkit-text-size-adjust:100%}
button{font:inherit;border:0;cursor:pointer;color:inherit}
button:active{opacity:.8}
button:focus-visible{outline:3px solid #f59e0b;outline-offset:-3px}
h2,h3,p{margin:0}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.cut{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.muted{color:var(--muted,#718096)}

/* The WebView owns its scroll area. Short screens keep readable cards instead of shrinking them. */
.app{width:100%;height:100%;height:100dvh;max-width:1280px;margin:auto;padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"header" "hero" "weather" "night" "trip";grid-template-rows:48px repeat(3,minmax(184px,1fr)) minmax(52px,auto);gap:10px;overflow-y:auto;overflow-x:hidden;overscroll-behavior-y:contain;scrollbar-width:thin;scroll-padding:12px;-webkit-overflow-scrolling:touch}
.app>*{min-width:0}
.header{grid-area:header;display:flex;align-items:center;gap:10px;background:var(--card,#fff);border-radius:16px;padding:4px 8px}
.icon{width:40px;height:40px;flex-shrink:0;border-radius:12px;background:var(--pale,#ecfdf5);color:var(--green,#087f61);display:grid;place-items:center}
.header .icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.identity{flex:1;min-width:0}
.identity small{font-size:11px;display:block}
.identity strong{font-size:15px}
.account{display:none}
.avatar-button{padding:0;overflow:hidden;border-radius:50%}
.avatar-image{width:100%;height:100%;object-fit:cover;display:block}
.avatar-image[hidden]{display:none}

.hero{grid-area:hero;position:relative;overflow:hidden;border-radius:20px;background:#164e42;color:white;touch-action:pan-y;min-height:184px}
.hero img,.event img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,#041b1920,#071c2de8)}
.hero-top{position:absolute;left:12px;right:12px;top:12px}
.tag{background:#07825ce6;color:white;border-radius:20px;padding:5px 9px;font-size:11px;font-weight:750;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rating{font-size:12px;color:#ffd060;background:#0005;padding:5px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.rating:empty{display:none}
.hero-content{position:absolute;bottom:12px;left:14px;right:14px}
.hero h2{font-size:clamp(17px,3.6vw,23px);line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.subtitle{display:none}
.hero-bottom{margin-top:10px}
.banner-controls{display:flex;align-items:center;gap:10px;min-width:0}
.arrows{display:flex;gap:4px;flex-shrink:0}
.arrows button{width:36px;height:40px;border-radius:12px;background:#0005;color:white;font-size:23px}
.hero-open{min-height:40px;font-size:12px;color:white;background:#ffffff30;border-radius:20px;padding:8px 12px;white-space:nowrap;flex-shrink:0}
.dots{display:flex;gap:4px;align-items:center}
.dots button{padding:0;width:6px;height:6px;background:#ffffff66;border-radius:6px}
.dots button.active{width:16px;background:white}

.weather{grid-area:weather;min-height:184px;padding:10px;border-radius:20px;background:linear-gradient(120deg,#0085c5,#0bb1df);color:white;display:flex;flex-direction:column;gap:6px;justify-content:space-between;container:weather / size}
.weather h3{font-size:15px}
.condition{font-size:11px;line-height:15px;margin-top:3px}
.temperature{font-size:30px;line-height:34px;font-weight:800}
.weather-small{font-size:11px;text-align:right}
.stats{display:none;justify-content:space-around;gap:6px;background:#00486b40;border-radius:10px;padding:7px;font-size:12px}
.forecast-header{flex-wrap:wrap;gap:4px}
.switch{display:flex;background:#00486b40;padding:2px;border-radius:10px;flex-shrink:0}
.switch button{font-size:12px;min-height:32px;padding:5px 9px;background:none;color:#e8f6ff;border-radius:8px;white-space:nowrap}
.switch .active{background:white;color:#087fad}
.weather button.refresh{background:none;color:#e8f6ff;font-size:12px;min-height:32px;padding:5px 3px;white-space:nowrap}
.forecast-track{display:flex;gap:7px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;min-height:60px;flex-shrink:0;scroll-snap-type:x proximity}
.forecast-track::-webkit-scrollbar{display:none}
.forecast-card{flex:0 0 70px;scroll-snap-align:start;background:#ffffff20;border-radius:10px;padding:6px 4px;display:flex;flex-direction:column;justify-content:center;gap:3px;text-align:center;font-size:12px}
.forecast-card strong,.forecast-card small{font-size:11px;line-height:14px;white-space:nowrap}
.forecast-card b{font-size:14px;line-height:18px;white-space:nowrap}

.night{grid-area:night;display:flex;flex-direction:column;gap:8px;min-height:184px}
.night>.row{min-height:36px}
.night>.row>div{min-width:0}
.night h3{font-size:clamp(13px,2.6vw,17px);line-height:18px}
.night>.row small{display:none}
.link{background:none;color:var(--green,#087f61);font-weight:700;font-size:12px;min-height:36px;padding:5px 0 5px 8px;white-space:nowrap;flex-shrink:0}
.event-track{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;flex:1;min-height:132px}
.event-track::-webkit-scrollbar{display:none}
.event{flex:0 0 88%;position:relative;border-radius:18px;overflow:hidden;background:#163f4c;color:white;scroll-snap-align:start;min-width:0}
.event .tag{position:absolute;top:10px;left:10px;right:10px;width:fit-content;max-width:calc(100% - 20px);font-size:10px}
.event-hit{position:absolute;inset:0;background:transparent;width:100%;height:100%;border-radius:18px}
.event-content{position:absolute;bottom:10px;left:12px;right:12px;display:flex;align-items:flex-end;gap:8px;justify-content:space-between;pointer-events:none}
.event-content>div{flex:1;min-width:0}
.event-content strong{font-size:14px;line-height:18px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.event-content small{font-size:11px;display:block;margin-top:4px}
.event-content .navigate{pointer-events:auto}
.navigate{background:#f3a000;color:white;border-radius:22px;padding:8px 11px;min-height:40px;font-size:12px;font-weight:750;white-space:nowrap;flex-shrink:0}

.trip{grid-area:trip;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:18px;background:linear-gradient(110deg,#00946f,#3e8e4f);color:white;text-align:left;min-width:0}
.trip strong{font-size:14px;line-height:19px;overflow-wrap:anywhere}
.trip p{display:none}
.trip .cta{background:white;color:#087f61;padding:9px 11px;border-radius:22px;font-size:12px;white-space:nowrap;flex-shrink:0}

.overlay{position:fixed;inset:0;background:#10203199;z-index:10;display:flex;align-items:flex-end;justify-content:center;padding-top:12px}
.overlay[hidden]{display:none}
.sheet{background:var(--card,#fff);width:100%;max-width:760px;max-height:100%;border-radius:24px 24px 0 0;padding:18px 16px max(18px,env(safe-area-inset-bottom));overflow-y:auto;overscroll-behavior:contain}
.sheet h3{font-size:17px}
.sheet>.row small{font-size:12px}
.sheet-note{font-size:12px;line-height:1.5;margin:10px 0 14px}
.event-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line,#e1e9f1);border-radius:16px;padding:12px;margin-top:10px;min-width:0}
.event-row strong{display:block;font-size:14px;margin:6px 0;overflow-wrap:anywhere}
.event-row small{font-size:12px}
.event-row .tag{display:inline-block;font-size:10px;padding:4px 7px;white-space:normal}
.event-info{flex:1;min-width:0;background:transparent;text-align:left;padding:0}
.close{border-radius:50%;width:40px;height:40px;flex-shrink:0;background:var(--background,#f6f9fc);font-size:23px}

@container weather (min-height:210px){.stats{display:flex}
.forecast-card{flex-basis:78px;padding:9px 6px}
.forecast-card b{font-size:16px}
}

/* Unfolded phones and tablets get two columns within the same portrait-locked app. */
@media(min-width:700px){.app{padding:16px 20px;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"header header" "hero weather" "night night" "trip trip";grid-template-rows:52px repeat(2,minmax(230px,1fr)) minmax(58px,auto)}
.header{padding:6px 12px}
.identity strong{font-size:17px}
.hero,.weather{min-height:230px}
.hero h2{font-size:clamp(20px,2.4vw,28px)}
.night{min-height:230px}
.night h3{font-size:18px;line-height:23px}
.night>.row{min-height:40px}
.event-track{min-height:174px;gap:16px}
.event{flex-basis:calc((100% - 16px)/2)}
.event-content strong{font-size:16px;line-height:21px}
.trip strong{font-size:16px}
.trip .cta{font-size:14px}
.sheet{border-radius:24px 24px 0 0}
}

@media(max-width:359px){.app{padding:8px;gap:8px}
.header{gap:6px;padding-inline:5px}
.identity strong{font-size:14px}
.hero-content{left:10px;right:10px}
.hero h2{font-size:17px}
.banner-controls{gap:6px}
.arrows button{width:30px}
.hero-open{padding-inline:9px;font-size:11px}
.dots{gap:3px}
.dots button.active{width:12px}
.event{flex-basis:94%}
.event-content{left:10px;right:10px;gap:6px}
.navigate{padding-inline:9px;font-size:11px}
.trip{padding-inline:10px}
.trip strong{font-size:13px}
.trip .cta{padding-inline:9px;font-size:11px}
.event-row{padding:9px;gap:7px}
}

</style>
</head>

<body>
<main class="app" id="app">

  <header class="header">
    <button
  class="icon avatar-button"
  data-nav="settings"
  aria-label="Hồ sơ"
>
  <img
    id="avatar-image"
    class="avatar-image"
    alt=""
    hidden
  >
  <span id="avatar-fallback">D</span>
</button>

    <div class="identity">
      <small class="muted">Xin chào</small>
      <div class="cut">
        <strong id="name">Du khách</strong>
        <span class="account">Tài khoản</span>
      </div>
    </div>

    <button
  class="icon"
  data-action="notifications"
  aria-label="Thông báo"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>
  </svg>
</button>
<button
  class="icon"
  data-nav="settings"
  aria-label="Cài đặt"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m9 3-.6 2.2-2 .9-2-.6L2.8 9l1.5 1.6v2.8L2.8 15l1.6 3.5 2-.6 2 .9L9 21h6l.6-2.2 2-.9 2 .6 1.6-3.5-1.5-1.6v-2.8L21.2 9l-1.6-3.5-2 .6-2-.9L15 3Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
</button>
  </header>

  <section class="hero" id="hero">
    <img id="hero-img" alt="Điểm đến Đà Nẵng">
    <div class="shade"></div>

    <div class="hero-top row">
      <span class="tag" id="hero-tag"></span>
      <span class="rating" id="hero-rating"></span>
    </div>

<div class="hero-content">
      <h2 id="hero-name">Khám phá Đà Nẵng</h2>
      <p class="subtitle cut" id="hero-subtitle"></p>

      <div class="hero-bottom row">
        <div class="banner-controls"><div class="arrows"><button data-action="prev" aria-label="Banner trước">‹</button><button data-action="next" aria-label="Banner tiếp">›</button></div><div class="dots" id="dots"></div></div>
        <button class="hero-open" data-action="hero-open">
          Khám phá ngay →
        </button>
      </div>
    </div>
  </section>

  <section class="weather">
    <div class="row">
      <div>
        <h3><span id="weather-icon">⛅</span> Đà Nẵng</h3>
        <p class="condition" id="condition">Đang tải thời tiết…</p>
      </div>

      <div>
        <div class="temperature" id="temperature">—°</div>
        <div class="weather-small" id="today-range">— / —</div>
      </div>
    </div>

    <div class="stats">
      <span id="humidity">Độ ẩm —</span>
      <span id="uv">UV —</span>
      <span id="wind">Gió —</span>
    </div>

    <div class="row forecast-header">
      <button class="refresh" data-action="refresh" id="forecast-label">
        Dự báo theo giờ ↻
      </button>

      <div class="switch">
        <button data-mode="hour" id="mode-hour" class="active">
          Theo giờ
        </button>
        <button data-mode="week" id="mode-week">
          Theo tuần
        </button>
      </div>
    </div>

    <div id="forecast"></div>
  </section>

  <section class="night">
    <div class="row">
      <div>
        <h3>🔥 SỰ KIỆN ĐÊM ĐÀ NẴNG</h3>
        <small class="muted">Gợi ý trải nghiệm về đêm</small>
      </div>

      <button class="link" data-action="all-events" id="all-events">
        Xem tất cả
      </button>
    </div>

    <div class="event-track" id="event-track"></div>
  </section>

  <button class="trip" data-nav="itinerary">
    <div style="min-width:0">
      <strong id="trip-title">Chuyến đi của bạn</strong>
      <p class="cut" id="trip-note">
        Chọn ngày và địa điểm để bắt đầu
      </p>
    </div>

    <span class="cta" id="trip-cta">Tạo lịch trình →</span>
  </button>

</main>

<div class="overlay" id="events-overlay" hidden>
  <section
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby="events-title"
  >
    <div class="row">
      <div>
        <h3 id="events-title">🔥 Sự kiện đêm Đà Nẵng</h3>
        <small class="muted">
          Tất cả gợi ý hoạt động nổi bật về đêm
        </small>
      </div>

      <button
        class="close"
        data-action="close-events"
        aria-label="Đóng"
      >×</button>
    </div>

    <p class="sheet-note muted">
      Lịch dưới đây là thông tin tham khảo, chưa phải lịch sự kiện
      trực tiếp. Vui lòng xác nhận trước khi đến.
    </p>

    <div id="events-list"></div>
  </section>
</div>

<script>
(function () {
  var state = {};
  var slide = 0;
  var mode = 'hour';
  var auto = null;
  var focusBefore = null;

  function el(id) {
    return document.getElementById(id);
  }

  function send(action, value) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ action: action, value: value })
      );
    }
  }

  function text(tag, value, className) {
    var element = document.createElement(tag);
    element.textContent = value;

    if (className) {
      element.className = className;
    }

    return element;
  }

  function image(source) {
    var element = document.createElement('img');
    element.alt = '';

    if (source) {
      element.src = source;
    } else {
      element.hidden = true;
    }

    element.onerror = function () {
      this.hidden = true;
    };

    return element;
  }

  function hero() {
    var place = (state.featured || [])[slide];

    el('hero-name').textContent =
      place ? place.title : 'Khám phá Đà Nẵng';

    el('hero-subtitle').textContent =
      place ? place.subtitle : '';

    el('hero-tag').textContent =
      place ? place.tag : 'ĐIỂM NỔI BẬT';

    el('hero-rating').textContent =
      place && place.rating !== null
        ? '★ ' + place.rating
        : '';

    var photo = el('hero-img');
    photo.hidden = !(place && place.image);

    if (place && place.image) {
      photo.src = place.image;
    }

    el('dots').replaceChildren();

    (state.featured || []).forEach(function (_, index) {
      var button = text(
        'button',
        '',
        index === slide ? 'active' : ''
      );

      button.setAttribute(
        'aria-label',
        'Banner ' + (index + 1)
      );

      button.onclick = function () {
        slide = index;
        hero();
        restart();
      };

      el('dots').append(button);
    });
  }

  function advance(direction) {
    var count = (state.featured || []).length;

    if (count) {
      slide = (slide + direction + count) % count;
      hero();
    }
  }

  function restart() {
    clearInterval(auto);

    if (
      !document.hidden &&
      el('events-overlay').hidden
    ) {
      auto = setInterval(function () {
        advance(1);
      }, 5000);
    }
  }

 function renderWeather() {
  var w = state.weather;

  el('temperature').textContent =
    w ? w.temperature + '°' : '—°';

  el('weather-icon').textContent =
    w ? w.icon : '⛅';

  el('condition').textContent = w
    ? w.description + ' · ' + w.updated
    : state.weatherError || 'Đang tải thời tiết…';

  el('today-range').textContent =
    w && w.days[0]
      ? w.days[0].low + '° / ' + w.days[0].high + '°'
      : '— / —';

  el('humidity').textContent =
    'Độ ẩm ' + (w ? w.humidity + '%' : '—');

  el('uv').textContent =
    'UV ' +
    (
      w && w.uv !== null
        ? w.uv.toFixed(1)
        : '—'
    );

  el('wind').textContent =
    'Gió ' + (w ? w.wind + ' km/h' : '—');

  el('app').classList.toggle(
    'week',
    mode === 'week',
  );

  el('mode-hour').classList.toggle(
    'active',
    mode === 'hour',
  );

  el('mode-week').classList.toggle(
    'active',
    mode === 'week',
  );

  el('forecast-label').textContent = 'Dự báo ↻';

  var forecast = el('forecast');
  forecast.className = 'forecast-track';
  forecast.replaceChildren();

  if (!w) return;

  var rows =
    mode === 'hour' ? w.hours : w.days;

  rows.forEach(function (item, index) {
    var card = document.createElement('div');
    card.className = 'forecast-card';

    var label;

    if (mode === 'hour') {
      label = item.time;
    } else if (index === 0) {
      label = 'Hôm nay';
    } else {
      label = new Intl.DateTimeFormat(
        'vi-VN',
        {
          weekday: 'short',
          timeZone: 'Asia/Ho_Chi_Minh',
        },
      ).format(
        new Date(
          item.date + 'T12:00:00+07:00',
        ),
      );
    }

    var temperature =
      mode === 'hour'
        ? item.temperature
        : item.high;

    var rain =
      item.rain === null
        ? '—'
        : item.rain + '%';

    card.append(
      text('strong', label),
      text(
        'b',
        item.icon + ' ' + temperature + '°',
      ),
      text(
        'small',
        mode === 'hour'
          ? rain
          : item.low + '° · ' + rain,
      ),
    );

    card.title = item.description || label;
    forecast.append(card);
  });
}

  function navigateButton(event) {
    var button = text(
      'button',
      'Dẫn đường ›',
      'navigate'
    );

    button.onclick = function () {
      send('directions', event.id);
    };

    return button;
  }

  function renderEvents() {
  var track = el('event-track');
  var list = el('events-list');

  track.replaceChildren();
  list.replaceChildren();

  (state.events || []).forEach(function (event, index) {
    if (index < 3) {
      var card = document.createElement('article');
      card.className = 'event';

      var hit = text('button', '', 'event-hit');

      hit.setAttribute(
        'aria-label',
        'Xem chi tiết ' + event.title
      );

      hit.onclick = function () {
        send('event-detail', event.id);
      };

      card.append(
        image(event.image),
        text('div', '', 'shade'),
        text('span', event.when, 'tag'),
        hit
      );

      var content = document.createElement('div');
      content.className = 'event-content';

      var information = document.createElement('div');
      information.style.minWidth = '0';

      information.append(
        text('strong', event.title, 'cut'),
        text('small', event.where, 'cut')
      );

      content.append(
        information,
        navigateButton(event)
      );

      card.append(content);
      track.append(card);
    }

    var row = document.createElement('div');
    row.className = 'event-row';

    var details = text('button', '', 'event-info');

    details.append(
      text('span', event.when, 'tag'),
      text('strong', event.title),
      text('small', event.where, 'muted')
    );

    details.onclick = function () {
      send('event-detail', event.id);
    };

    row.append(
      details,
      navigateButton(event)
    );

    list.append(row);
  });

  el('all-events').textContent =
    'Xem tất cả (' + (state.events || []).length + ')';
}

  function closeEvents() {
    el('events-overlay').hidden = true;
    restart();

    if (focusBefore) {
      focusBefore.focus();
    }
  }

  window.updateHome = function(next) {
  state = next;

  var avatar = el('avatar-image');
  var fallback = el('avatar-fallback');

  fallback.textContent = (
    next.name || 'Du khách'
  ).trim().slice(0, 1).toUpperCase();

  var photo = '';

  if (
    typeof next.avatar === 'string' &&
    (
      next.avatar.indexOf('https://') === 0 ||
      next.avatar.indexOf('http://') === 0 ||
      next.avatar.indexOf('data:image/') === 0
    )
  ) {
    photo = next.avatar;
  }

  avatar.onerror = function() {
    avatar.hidden = true;
    fallback.hidden = false;
  };

  if (avatar.getAttribute('src') !== photo) {
    avatar.hidden = !photo;
    fallback.hidden = !!photo;

    if (photo) {
      avatar.src = photo;
    } else {
      avatar.removeAttribute('src');
    }
  }

  el('name').textContent =
    next.name || 'Du khách';

  Object.keys(
    next.colors || {}
  ).forEach(function(k) {
    document.body.style.setProperty(
      '--' + k,
      next.colors[k]
    );
  });

  slide = slide % Math.max(
    1,
    (next.featured || []).length
  );

  hero();
  renderWeather();
  renderEvents();

  el('trip-title').textContent =
    next.tripTitle;

  el('trip-note').textContent =
    next.tripNote;

  el('trip-cta').textContent =
    next.tripActive
      ? 'Xem lộ trình →'
      : 'Tạo lịch trình →';

  restart();
};

  document.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.nav) {
      send('nav', button.dataset.nav);
    }

    if (button.dataset.mode) {
      mode = button.dataset.mode;
      renderWeather();
    }

    var action = button.dataset.action;

    if (action === 'prev' || action === 'next') {
      advance(action === 'next' ? 1 : -1);
      restart();
    }

    if (action === 'hero-open') {
      var place = (state.featured || [])[slide];

      if (place && place.placeId) {
        send('place', place.placeId);
      } else {
        send('nav', 'explore');
      }
    }

    if (action === 'refresh') {
      send('refresh');
    }

    if (action === 'notifications') {
      send('notifications');
    }

    if (action === 'all-events') {
      focusBefore = button;
      el('events-overlay').hidden = false;
      clearInterval(auto);
      el('events-overlay').querySelector('.close').focus();
    }

    if (action === 'close-events') {
      closeEvents();
    }
  });

  el('events-overlay').onclick = function (event) {
    if (event.target === this) {
      closeEvents();
    }
  };

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeEvents();
    }

    if (
      event.key === 'Tab' &&
      !el('events-overlay').hidden
    ) {
      var buttons =
        el('events-overlay').querySelectorAll('button');

      var first = buttons[0];
      var last = buttons[buttons.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener('visibilitychange', restart);

  el('hero-img').onerror = function () {
    this.hidden = true;
  };

  var touchStart = 0;

  el('hero').addEventListener(
    'touchstart',
    function (event) {
      touchStart = event.changedTouches[0].screenX;
      clearInterval(auto);
    },
    { passive: true }
  );

  el('hero').addEventListener(
    'touchend',
    function (event) {
      var delta =
        event.changedTouches[0].screenX - touchStart;

      if (Math.abs(delta) > 45) {
        advance(delta < 0 ? 1 : -1);
      }

      restart();
    },
    { passive: true }
  );
})();
true;
</script>
</body>
</html>`;
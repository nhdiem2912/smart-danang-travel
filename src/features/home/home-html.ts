export const HOME_HTML = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">

<style>
*{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden}
body{font-family:system-ui,sans-serif;background:var(--background,#f6f9fc);color:var(--text,#253347)}
button{font:inherit;border:0;cursor:pointer;color:inherit}
button:active{opacity:.8}
button:focus-visible{outline:3px solid #f59e0b;outline-offset:-3px}
h2,h3,p{margin:0}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cut{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.muted{color:var(--muted,#718096)}

.app{
  height:100%;
  max-width:650px;
  margin:auto;
  padding:10px 12px;
  display:grid;
  grid-template-rows:44px minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,1fr) 50px;
  gap:8px
}

.app.week{
  grid-template-rows:44px minmax(0,.8fr) minmax(0,2.2fr) minmax(0,.8fr) 50px
}

.header{display:flex;align-items:center;gap:9px;background:var(--card,#fff);border-radius:15px;padding:5px 9px}
.icon{width:30px;height:30px;border-radius:50%;background:var(--pale,#ecfdf5);color:var(--green,#087f61);font-size:17px}
.identity{flex:1;min-width:0}
.identity small{font-size:9px;display:block}
.identity strong{font-size:12px}
.account{font-size:8px;color:var(--green,#087f61);margin-left:5px;background:var(--pale,#ecfdf5);padding:2px 5px;border-radius:8px}

.hero{position:relative;overflow:hidden;border-radius:18px;background:#164e42;min-height:0;color:white;touch-action:pan-y}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,#041b1920,#071c2dd9)}
.hero-top{position:absolute;left:10px;right:10px;top:9px}
.tag{background:#07825ce6;color:white;border-radius:20px;padding:4px 8px;font-size:9px;font-weight:800}
.rating{font-size:10px;color:#ffd060;background:#0005;padding:4px 8px;border-radius:20px}
.arrows{position:absolute;left:8px;right:8px;top:43%}
.arrows button{width:26px;height:26px;border-radius:50%;background:#0005;color:white;font-size:17px}
.hero-content{position:absolute;bottom:9px;left:12px;right:12px}
.hero h2{font-size:clamp(14px,4vw,19px);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.subtitle{font-size:10px;margin-top:4px}
.hero-bottom{margin-top:8px}
.hero-open{font-size:10px;color:white;background:#ffffff30;border-radius:20px;padding:6px 9px}
.dots{display:flex;gap:4px}
.dots button{padding:0;width:6px;height:5px;background:#ffffff66;border-radius:5px}
.dots button.active{width:18px;background:white}

.weather{min-height:0;padding:10px;border-radius:18px;background:linear-gradient(120deg,#0085c5,#0bb1df);color:white;display:flex;flex-direction:column;gap:6px;justify-content:space-between}
.weather h3{font-size:12px}
.condition{font-size:9px;margin-top:2px}
.temperature{font-size:26px;font-weight:800}
.weather-small{font-size:8px;text-align:right}
.stats{display:flex;justify-content:space-around;background:#00486b40;border-radius:8px;padding:5px;font-size:9px}
.forecast-header{font-size:9px}
.switch{display:flex;background:#00486b40;padding:2px;border-radius:7px}
.switch button{font-size:9px;padding:3px 7px;background:none;color:#e8f6ff;border-radius:5px}
.switch .active{background:white;color:#087fad}
.hourly{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}
.hour{background:#ffffff20;border-radius:8px;padding:5px 1px;text-align:center;display:flex;flex-direction:column;gap:3px;font-size:9px}
.hour b{font-size:12px}
.hour small{font-size:8px}
.weekly{display:grid;gap:3px}
.day{display:grid;grid-template-columns:50px 18px 1fr 37px 24px;gap:4px;align-items:center;font-size:9px;min-height:17px;background:#00699a40;padding:3px 6px;border-radius:6px}
.day .range{display:flex;align-items:center;gap:4px}
.bar{flex:1;height:4px;border-radius:8px;background:linear-gradient(90deg,#f9db58,#ff9e32)}
.weather button.refresh{background:none;color:#e8f6ff;font-size:8px;padding:0}

.night{display:flex;flex-direction:column;gap:6px;min-height:0}
.night h3{font-size:12px}
.night small{font-size:8px}
.link{background:none;color:var(--green,#087f61);font-weight:700;font-size:10px;padding:4px}
.event-track{display:flex;gap:9px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;flex:1;min-height:0}
.event-track::-webkit-scrollbar{display:none}
.event{flex:0 0 77%;position:relative;border-radius:16px;overflow:hidden;background:#163f4c;color:white;scroll-snap-align:start;min-width:0}
.event img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.event .tag{position:absolute;top:7px;left:8px;font-size:8px;padding:3px 6px}
.event-content{position:absolute;bottom:8px;left:9px;right:9px;display:flex;align-items:flex-end;gap:7px;justify-content:space-between}
.event-content strong{font-size:11px;display:block}
.event-content small{font-size:8px;display:block;margin-top:3px}
.navigate{background:#f3a000;color:white;border-radius:18px;padding:7px 9px;font-size:9px;font-weight:800;white-space:nowrap}

.trip{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;border-radius:16px;background:linear-gradient(110deg,#00946f,#3e8e4f);color:white;text-align:left}
.trip strong{font-size:11px}
.trip p{font-size:9px;margin-top:3px}
.trip .cta{background:white;color:#087f61;padding:7px 9px;border-radius:20px;font-size:9px;white-space:nowrap}

.overlay{position:fixed;inset:0;background:#10203199;z-index:10;display:flex;align-items:flex-end}
.overlay[hidden]{display:none}
.sheet{background:var(--card,#fff);width:100%;max-height:90%;border-radius:24px 24px 0 0;padding:17px 15px;overflow-y:auto}
.sheet h3{font-size:14px}
.sheet-note{font-size:10px;line-height:1.5;margin:8px 0 12px}
.event-row{display:flex;align-items:center;gap:9px;border:1px solid var(--line,#e1e9f1);border-radius:14px;padding:11px;margin-top:9px}
.event-row strong{display:block;font-size:12px;margin:4px 0}
.event-row small{font-size:10px}
.event-row .tag{font-size:8px;padding:3px 6px}
.close{border-radius:50%;width:28px;height:28px;background:var(--background,#f6f9fc);font-size:17px}

@media(max-height:560px){
  .app{padding:6px 10px;gap:6px;grid-template-rows:40px minmax(0,1.1fr) minmax(0,1.8fr) minmax(0,.9fr) 44px}
  .app.week{grid-template-rows:40px minmax(0,.8fr) minmax(0,2.4fr) minmax(0,.8fr) 44px}
  .weather{padding:7px;gap:3px}
  .temperature{font-size:22px}
  .stats{padding:3px;font-size:8px}
  .day{min-height:14px;padding:2px 4px;font-size:8px}
  .weekly{gap:2px}
  .hour{padding:4px 1px;gap:2px}
  .hero-content{bottom:7px}
  .hero-top{top:6px}
  .hero-bottom{margin-top:5px}
  .subtitle{display:none}
  .event .tag{top:5px;font-size:7px}
  .event-content{bottom:6px}
  .event-content small{display:none}
  .navigate{padding:6px 8px;font-size:8px}
  .night h3{font-size:11px}
  .night small{display:none}
  .trip{padding:6px 10px}
}

@media(max-height:470px){
  .hour{padding:2px 1px;gap:1px;line-height:10px}
  .hour b{font-size:11px;line-height:12px}
  .hour span{font-size:13px;line-height:14px}
  .weather{gap:2px}
  .condition{font-size:8px}
  .temperature{line-height:1}
  .weather-small{line-height:10px}
  .switch button{line-height:10px}
  .day{line-height:10px;height:13px;min-height:13px;padding:1px 4px}
  .hero h2{font-size:12px}
  .hero .tag{font-size:7px;padding:2px 5px}
  .hero .rating{font-size:8px;padding:2px 5px}
}
  .event-hit{
  position:absolute;
  inset:0;
  background:transparent;
  width:100%;
  height:100%;
  border-radius:16px
}

.event-content{pointer-events:none}
.event-content .navigate{pointer-events:auto}

.event-info{
  flex:1;
  min-width:0;
  background:transparent;
  text-align:left;
  padding:0
}
  .avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-image[hidden] {
  display: none;
}
.avatar-button {
  padding: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
  /* Cân ba khối chính */
.app,
.app.week {
  grid-template-rows:
    44px
    repeat(3, minmax(0, 1fr))
    48px;
  gap: 8px;
}

/* Bỏ những dòng phụ lặp lại */
.hero .subtitle,
.account,
.night > .row small,
.trip p {
  display: none;
}

.identity small {
  font-size: 11px;
}

.identity strong {
  font-size: 14px;
}

.weather {
  padding: 8px;
  gap: 4px;
}

.weather h3,
.night h3 {
  font-size: 14px;
}

.condition {
  font-size: 11px;
}

.stats,
.forecast-header,
.switch button {
  font-size: 11px;
}

.forecast-header .refresh {
  font-size: 11px;
  white-space: nowrap;
  padding: 3px 0;
}

/* Dự báo giờ và tuần đều vuốt ngang */
.forecast-track {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  min-height: 0;
  flex-shrink: 0;
}

.forecast-track::-webkit-scrollbar {
  display: none;
}

.forecast-card {
  flex: 0 0 68px;
  background: #ffffff20;
  border-radius: 9px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: center;
  font-size: 11px;
}

.forecast-card strong,
.forecast-card small {
  font-size: 11px;
  line-height: 14px;
}

.forecast-card b {
  font-size: 14px;
  line-height: 18px;
}

.event-content strong {
  font-size: 13px;
  line-height: 17px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-content small {
  font-size: 11px;
}

.event .tag {
  font-size: 10px;
}

.navigate,
.hero-open {
  font-size: 11px;
}

.trip strong {
  font-size: 13px;
}

.trip .cta {
  font-size: 11px;
}

/* Màn hình thấp: giảm nội dung phụ */
@media (max-height: 600px) {
  .weather {
    padding: 8px;
    gap: 4px;
  }

  .weather .stats {
    display: none;
  }

  .condition {
    font-size: 10px;
  }

  .forecast-card {
    padding: 4px;
    gap: 2px;
  }

  .temperature {
    font-size: 24px;
  }
}

@media (max-height: 500px) {
  .app,
  .app.week {
    padding: 6px 10px;
    gap: 6px;
    grid-template-rows:
      40px
      repeat(3, minmax(0, 1fr))
      40px;
  }

  .weather .condition,
  .weather-small {
    display: none;
  }

  .forecast-card {
    padding: 3px;
    gap: 1px;
  }

  .weather h3,
  .night h3 {
    font-size: 12px;
  }

  .forecast-header {
    font-size: 10px;
  }

  .weather {
    padding: 6px;
  }

  .temperature {
    font-size: 20px;
    line-height: 24px;
  }

  .switch button {
    line-height: 14px;
    padding: 2px 6px;
  }
}
  .header > .icon:not(.avatar-button) {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--pale, #ecfdf5);
}

.header .icon svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
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

    <div class="arrows row">
      <button data-action="prev" aria-label="Banner trước">‹</button>
      <button data-action="next" aria-label="Banner tiếp">›</button>
    </div>

    <div class="hero-content">
      <h2 id="hero-name">Khám phá Đà Nẵng</h2>
      <p class="subtitle cut" id="hero-subtitle"></p>

      <div class="hero-bottom row">
        <div class="dots" id="dots"></div>
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
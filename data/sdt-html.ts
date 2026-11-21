/**
 * SDT — Smart Da Nang Travel
 * HTML nhúng cho React Native WebView.
 * Sửa nội dung HTML trong chuỗi bên dưới khi cần thay đổi giao diện.
 */
export const SDT_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#3e8e4f">
  <title>SDT — Smart Da Nang Travel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <style>
    :root { --green:#3e8e4f; --dark:#165c35; --light:#e8f5e9; --ink:#172c25; --muted:#75827d; --line:#e7eeea; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; background:#e9f0ed; color:var(--ink); font-family:'Be Vietnam Pro',system-ui,sans-serif; font-size:13px; }
    button,input,select { font:inherit; }
    button { cursor:pointer; }
    button:focus-visible,input:focus-visible,select:focus-visible { outline:3px solid #9bdbac; outline-offset:2px; }
    .app { max-width:460px; min-height:100dvh; margin:0 auto; background:#f8faf9; position:relative; box-shadow:0 16px 80px #23483124; }
    .screen { display:none; padding:13px 15px 110px; animation:fade .18s ease-out; }
    .screen.active { display:block; }
    @keyframes fade { from {opacity:.4;transform:translateY(3px)} to {opacity:1;transform:translateY(0)} }
    .card { background:white; border:1px solid var(--line); border-radius:18px; box-shadow:0 5px 18px #173b2210; }
    .row { display:flex; align-items:center; }
    .between { display:flex; align-items:center; justify-content:space-between; }
    .muted { color:var(--muted); }
    .small { font-size:10px; }
    .tiny { font-size:9px; }
    .section-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:18px 3px 10px; }
    .section-head h2 { font-size:14px; margin:0; font-weight:900; }
    .section-head p { color:var(--muted); margin:4px 0 0; font-size:10px; line-height:1.55; }
    .link-btn { color:var(--green); border:0; background:none; font-size:11px; font-weight:800; white-space:nowrap; }
    .icon-btn { width:34px; height:34px; border:0; border-radius:12px; background:#f1f7f2; color:#335a41; font-size:14px; display:grid; place-items:center; }
    .pill { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:5px 9px; font-size:9px; font-weight:800; }
    .pill-green { background:var(--light); color:var(--green); }
    .btn { border:0; border-radius:12px; padding:12px 15px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
    .btn-main { background:var(--green); color:white; }
    .btn-ghost { background:#eff6f0; color:var(--dark); }
    .btn-white { background:white; color:var(--dark); }
    .full { width:100%; }
    .hidden { display:none !important; }
    .topbar { padding:11px 12px; display:flex; justify-content:space-between; align-items:center; }
    .avatar { width:37px; height:37px; border-radius:50%; background:var(--light); color:var(--green); display:grid; place-items:center; font-size:15px; }
    .hello { color:#9aa69f; font-size:10px; margin:0 0 3px; }
    .username { font-size:12px; font-weight:900; max-width:125px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .top-user { display:flex; align-items:center; gap:10px; }
    .top-user .identity { display:flex; gap:8px; align-items:center; }
    .head-actions { display:flex; gap:6px; }
    .hero { margin-top:12px; height:202px; border-radius:18px; overflow:hidden; position:relative; background:linear-gradient(135deg,#214a36,#7d9c8e); color:white; box-shadow:0 6px 20px #133b2a22; }
    .hero img,.event-card img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
    .shade { position:absolute; inset:0; background:linear-gradient(0deg,#061d18e8 0%,#0d34284d 63%,#071f184f 100%); }
    .hero-top,.hero-content { position:absolute; left:15px; right:15px; z-index:1; }
    .hero-top { top:14px; display:flex; justify-content:space-between; }
    .hero-content { bottom:14px; }
    .hero h1 { font-size:19px; font-weight:900; line-height:1.32; margin:0 0 5px; text-shadow:0 2px 8px #0008; }
    .hero p { font-size:11px; color:#f1f6ef; margin:0 0 13px; }
    .hero-foot { display:flex; align-items:center; justify-content:space-between; }
    .dots { display:flex; align-items:center; gap:5px; }
    .dot { width:7px; height:7px; border:0; border-radius:30px; background:#ffffff77; padding:0; }
    .dot.active { width:23px; background:white; }
    .hero-arrows { display:flex; gap:7px; }
    .round-arrow { width:26px; height:26px; border-radius:50%; background:#0005; border:1px solid #ffffff40; color:white; }
    .hero-cta { background:#ffffff37; backdrop-filter:blur(8px); color:white; border:1px solid #ffffff38; border-radius:22px; padding:8px 12px; font-size:10px; font-weight:800; }
    .weather { background:linear-gradient(140deg,#087fb5,#379ad2 70%,#5bb5df); color:white; border-radius:18px; padding:14px; margin-top:13px; box-shadow:0 6px 18px #087fb52b; }
    .weather h2 { font-size:13px; margin:0; }
    .weather-hero { display:flex; justify-content:space-between; align-items:center; }
    .weather-city { display:flex; align-items:center; gap:10px; }
    .weather-icon { background:#ffffff31; border:1px solid #ffffff55; width:35px; height:35px; border-radius:11px; display:grid; place-items:center; font-size:18px; }
    .weather-temp { font-size:25px; font-weight:900; line-height:1; }
    .weather-condition { margin:4px 0 0; font-size:10px; color:#e9f6ff; }
    .weather-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; background:#00446d46; border:1px solid #ffffff25; border-radius:12px; padding:9px 5px; margin:12px 0; text-align:center; }
    .weather-stats span { display:block; font-size:9px; color:#e0f3ff; }
    .weather-stats strong { display:block; font-size:11px; margin-top:3px; }
    .weather-bottom { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ffffff30; padding-bottom:8px; margin-bottom:9px; }
    .weather-bottom strong { font-size:10px; }
    .switcher { display:flex; background:#00507a6d; border-radius:9px; padding:3px; gap:2px; }
    .switcher button { background:none; border:0; color:#e5f4ff; border-radius:7px; font-size:9px; padding:6px 8px; }
    .switcher button.active { background:white; color:#117eb3; font-weight:900; }
    .hour-list { display:flex; gap:7px; overflow:auto; scrollbar-width:none; }
    .hour-item { min-width:57px; padding:8px 3px; text-align:center; background:#ffffff25; border-radius:10px; }
    .hour-item span { display:block; font-size:9px; margin-top:4px; }
    .hour-item i { font-size:15px; margin:7px auto 4px; color:#ffe7a2; }
    .day-item { display:grid; grid-template-columns:73px 24px 1fr 66px; align-items:center; gap:7px; background:#07517b49; padding:8px 9px; margin-top:5px; border-radius:9px; font-size:10px; }
    .day-item i { color:#ffde82; }
    .day-item small { color:#d5f0ff; text-align:right; }
    .weather-note { margin:9px 0 0; font-size:9px; color:#e0f2ff; }
    .event-scroll { display:flex; gap:12px; overflow-x:auto; padding:2px 2px 9px; scroll-snap-type:x mandatory; scrollbar-width:none; }
    .event-card { flex:0 0 265px; height:160px; border-radius:17px; overflow:hidden; position:relative; background:linear-gradient(135deg,#1c5347,#749c86); color:white; scroll-snap-align:start; box-shadow:0 6px 18px #25473122; }
    .event-card .event-tag { position:absolute; z-index:1; left:11px; top:11px; background:#15905b; font-size:9px; font-weight:900; border-radius:30px; padding:6px 9px; }
    .event-card .event-info { position:absolute; bottom:12px; left:12px; right:12px; display:flex; align-items:flex-end; gap:7px; z-index:1; }
    .event-card h3 { margin:0 0 6px; font-size:13px; font-weight:900; }
    .event-card p { margin:0; font-size:9px; color:#e9eeee; }
    .event-card .nav-short { border:0; background:#f7a928; color:white; padding:8px 11px; border-radius:23px; font-size:10px; font-weight:800; white-space:nowrap; }
    .event-click { border:0; background:transparent; position:absolute; inset:0; width:100%; z-index:1; }
    .event-card .event-tag,.event-card .event-info { pointer-events:none; }
    .event-card .nav-short { pointer-events:auto; position:relative; z-index:3; }
    .promo { margin-top:13px; background:linear-gradient(115deg,#238b55,#3e8e4f); color:white; border-radius:17px; padding:16px; display:flex; align-items:center; gap:8px; justify-content:space-between; }
    .promo h3 { margin:7px 0 5px; font-size:14px; }
    .promo p { margin:0; color:#e5f7e8; font-size:10px; line-height:1.5; }
    .promo .btn { border-radius:30px; padding:11px 12px; font-size:10px; white-space:nowrap; }
    .title-block { margin:6px 2px 16px; }
    .title-block h1 { margin:0; font-size:23px; font-weight:900; }
    .title-block p { font-size:11px; line-height:1.65; color:var(--muted); margin:7px 0 0; }
    .search { background:white; border:1px solid var(--line); border-radius:14px; padding:0 13px; display:flex; gap:8px; align-items:center; }
    .search input { width:100%; border:0; background:transparent; height:46px; outline:0; font-size:12px; }
    .chips { display:flex; gap:7px; overflow:auto; padding:13px 0 3px; scrollbar-width:none; }
    .chip { border:1px solid #d9e8dd; background:white; color:#57725f; border-radius:22px; white-space:nowrap; padding:9px 12px; font-weight:700; font-size:10px; }
    .chip.active { background:var(--green); border-color:var(--green); color:white; }
    .place-card { display:flex; align-items:center; gap:12px; padding:10px; margin-top:10px; }
    .place-thumb { flex-shrink:0; width:91px; height:90px; border-radius:12px; background:linear-gradient(130deg,#337850,#99c4a9); overflow:hidden; display:grid; place-items:center; font-size:30px; position:relative; }
    .place-thumb img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
    .place-card h3 { font-size:12px; margin:0 0 6px; font-weight:900; }
    .place-card p { font-size:10px; color:var(--muted); line-height:1.5; margin:0 0 10px; }
    .place-actions { display:flex; gap:7px; }
    .mini-btn { border:0; background:#edf6ef; color:var(--dark); border-radius:8px; font-size:10px; font-weight:800; padding:8px 10px; }
    .mini-btn.primary { background:var(--green); color:white; }
    .mini-btn.saved { background:#ffeff2; color:#d04d62; }
    .field { display:block; margin-top:14px; }
    .field label { display:block; font-weight:800; font-size:11px; margin-bottom:7px; }
    .field select,.field input { width:100%; border:1px solid #dfeae2; border-radius:12px; padding:12px; background:white; outline:none; color:var(--ink); }
    .plan-box { padding:15px; }
    .plan-output { margin-top:14px; }
    .plan-day { padding:14px; margin-top:12px; }
    .plan-day h3 { margin:0 0 13px; color:var(--dark); font-size:13px; }
    .stop { position:relative; border-left:2px solid #d7e8db; padding:0 0 14px 15px; margin-left:4px; }
    .stop:last-child { border-left-color:transparent; padding-bottom:0; }
    .stop:before { content:''; position:absolute; top:2px; left:-5px; width:8px; height:8px; border-radius:50%; background:var(--green); }
    .stop strong { font-size:11px; }
    .stop p { margin:5px 0; font-size:10px; color:var(--muted); }
    .stop a { color:var(--green); font-size:10px; font-weight:800; text-decoration:none; }
    .empty { border:1px dashed #c8decf; border-radius:18px; padding:26px 18px; margin-top:14px; text-align:center; background:#fff; }
    .empty .emoji { font-size:32px; margin-bottom:8px; }
    .empty p { color:var(--muted); font-size:11px; line-height:1.6; }
    .setting-row { background:white; border:1px solid var(--line); border-radius:14px; padding:14px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; }
    .setting-row strong { font-size:12px; }
    .setting-row small { display:block; margin-top:5px; color:var(--muted); font-size:10px; }
    .bottom-nav { position:fixed; left:50%; transform:translateX(-50%); bottom:0; width:min(100%,460px); background:#ffffffef; backdrop-filter:blur(14px); border-top:1px solid #e4ece5; padding:8px 6px max(9px,env(safe-area-inset-bottom)); display:flex; justify-content:space-around; box-shadow:0 -5px 25px #243f2515; z-index:20; }
    .nav-btn { flex:1; border:0; background:none; color:#98a69e; display:flex; flex-direction:column; align-items:center; gap:5px; padding:7px 0; font-size:9px; font-weight:700; }
    .nav-btn i { font-size:18px; }
    .nav-btn.active { color:var(--green); }
    .modal-cover { position:fixed; inset:0; background:#081b13a6; z-index:50; display:flex; justify-content:center; align-items:flex-end; padding:14px; }
    .modal { width:min(100%,430px); max-height:min(82dvh,700px); overflow:auto; background:white; border-radius:23px; padding:19px; box-shadow:0 12px 40px #071b1840; }
    .modal h2 { font-size:17px; margin:0 0 8px; }
    .modal p { color:#687a6d; font-size:11px; line-height:1.7; }
    .modal-top { display:flex; justify-content:space-between; gap:10px; align-items:start; }
    .modal .close { background:#edf3ee; border:0; border-radius:50%; width:30px; height:30px; flex-shrink:0; }
    .modal-img { height:172px; width:100%; object-fit:cover; border-radius:13px; margin:10px 0; background:#c8e0d0; }
    .modal-actions { display:flex; gap:9px; margin-top:15px; }
    .modal-actions .btn { flex:1; font-size:11px; }
    .toast { position:fixed; left:50%; bottom:82px; transform:translateX(-50%); max-width:min(92vw,405px); background:#173c2a; color:white; padding:12px 15px; font-size:11px; border-radius:12px; box-shadow:0 7px 22px #123b2a4d; z-index:70; text-align:center; }
    @media(min-width:620px) { .app { margin:18px auto; min-height:calc(100dvh - 36px); border-radius:26px; overflow:hidden; } .bottom-nav { bottom:0; border-radius:18px 18px 0 0; } }
    @media(max-width:355px) { .promo { flex-direction:column; align-items:flex-start; } .event-card { flex-basis:244px; } }
    @media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto !important; animation:none !important; transition:none !important; } }
  </style>
</head>
<body>
<div class="app">
  <!-- TRANG CHỦ -->
  <main class="screen active" id="home">
    <header class="card topbar">
      <div class="top-user">
        <div class="avatar"><i class="fa-solid fa-user"></i></div>
        <div>
          <p class="hello">Xin chào</p>
          <div class="identity"><span class="username" id="username">Du khách</span><button class="pill pill-green" data-action="profile" id="profile-prompt">Tạo hồ sơ</button></div>
        </div>
      </div>
      <div class="head-actions">
        <button class="icon-btn" aria-label="Thông báo" data-action="notifications"><i class="fa-regular fa-bell"></i></button>
        <button class="icon-btn" aria-label="Cài đặt" data-action="nav" data-tab="settings"><i class="fa-solid fa-gear"></i></button>
      </div>
    </header>

    <section class="hero" aria-label="Điểm đến nổi bật" id="hero">
      <img id="hero-image" src="" alt="Điểm đến Đà Nẵng">
      <div class="shade"></div>
      <div class="hero-top">
        <span class="pill" style="background:#15945fe0;color:white" id="hero-tag">Thiên nhiên</span>
        <div class="hero-arrows">
          <button class="round-arrow" data-action="hero-prev" aria-label="Ảnh trước"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="round-arrow" data-action="hero-next" aria-label="Ảnh sau"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </div>
      <div class="hero-content">
        <h1 id="hero-title">Khám phá Đà Nẵng</h1>
        <p id="hero-subtitle">Trải nghiệm những địa điểm thú vị</p>
        <div class="hero-foot">
          <div class="dots" id="hero-dots"></div>
          <button class="hero-cta" data-action="hero-detail">Khám phá ngay <i class="fa-solid fa-arrow-right"></i></button>
        </div>
      </div>
    </section>

    <section class="weather" aria-label="Thời tiết Đà Nẵng">
      <div class="weather-hero">
        <div class="weather-city">
          <div class="weather-icon" id="weather-icon"><i class="fa-solid fa-cloud-sun"></i></div>
          <div><h2>Thời tiết Đà Nẵng</h2><p class="weather-condition" id="weather-condition">Đang tải dữ liệu thực tế...</p></div>
        </div>
        <div class="weather-temp" id="weather-temp">--°</div>
      </div>
      <div class="weather-stats">
        <div><span>Độ ẩm</span><strong id="weather-humidity">--</strong></div>
        <div><span>UV</span><strong id="weather-uv">--</strong></div>
        <div><span>Gió</span><strong id="weather-wind">--</strong></div>
      </div>
      <div class="weather-bottom">
        <strong id="forecast-title">Dự báo 7 ngày tới</strong>
        <div class="switcher"><button id="wf-hour" data-action="forecast-hour">Theo giờ</button><button class="active" id="wf-week" data-action="forecast-week">Theo tuần</button></div>
      </div>
      <div id="weather-weekly"><div class="small">Đang tải dự báo...</div></div>
      <div id="weather-hourly" class="hour-list hidden"></div>
      <p class="weather-note" id="weather-note">Nguồn: Open-Meteo · Dữ liệu cập nhật qua Internet</p>
    </section>

    <section aria-label="Sự kiện Đà Nẵng">
      <div class="section-head">
        <div><h2>🔥 Sự kiện đêm Đà Nẵng</h2><p>Hoạt động tham khảo, hãy kiểm tra lịch trước khi đi</p></div>
        <button class="link-btn" data-action="all-events">Xem tất cả (3)</button>
      </div>
      <div class="event-scroll" id="event-list"></div>
    </section>

    <section class="promo">
      <div><span class="pill" style="background:#ffffff2b;color:white">✨ Lịch trình gợi ý</span><h3>Chưa biết đi đâu 3N2Đ?</h3><p>Tạo kế hoạch tham quan Đà Nẵng theo sở thích của bạn.</p></div>
      <button class="btn btn-white" data-action="nav" data-tab="planner">Tạo lịch trình <i class="fa-solid fa-arrow-right"></i></button>
    </section>
  </main>

  <!-- KHÁM PHÁ -->
  <main class="screen" id="explore">
    <div class="title-block"><h1>Khám phá Đà Nẵng 🌿</h1><p>Tìm địa điểm yêu thích, lưu lại và mở đường đi trên Google Maps.</p></div>
    <div class="search"><i class="fa-solid fa-magnifying-glass muted"></i><input id="search-input" type="search" placeholder="Tìm biển, cầu, chùa, khu tham quan..." aria-label="Tìm địa điểm"></div>
    <div class="chips" id="category-list"></div>
    <div id="places-list"></div>
  </main>

  <!-- LỊCH TRÌNH -->
  <main class="screen" id="planner">
    <div class="title-block"><h1>Lên lịch trình ✨</h1><p>Tạo lịch trình mẫu theo số ngày và loại hình trải nghiệm. Bạn có thể xem đường đi từng điểm.</p></div>
    <div class="card plan-box">
      <div class="field" style="margin-top:0"><label for="trip-days">Thời lượng chuyến đi</label><select id="trip-days"><option value="1">1 ngày</option><option value="2">2 ngày 1 đêm</option><option value="3" selected>3 ngày 2 đêm</option></select></div>
      <div class="field"><label for="trip-interest">Sở thích chính</label><select id="trip-interest"><option value="mixed">Khám phá tổng hợp</option><option value="nature">Thiên nhiên & biển</option><option value="culture">Văn hóa & tham quan</option><option value="night">Trải nghiệm về đêm</option></select></div>
      <button class="btn btn-main full" style="margin-top:16px" data-action="generate-trip"><i class="fa-solid fa-wand-magic-sparkles"></i> Tạo lịch trình mẫu</button>
    </div>
    <p class="muted small" style="line-height:1.7;margin:12px 3px">Lưu ý: Gợi ý được tạo từ danh sách địa điểm mẫu, chưa tính giao thông thực tế, thời tiết hay giờ mở cửa.</p>
    <div id="trip-result" class="plan-output"></div>
  </main>

  <!-- YÊU THÍCH -->
  <main class="screen" id="saved">
    <div class="title-block"><h1>Đã lưu ❤️</h1><p>Danh sách địa điểm yêu thích được giữ trên trình duyệt này.</p></div>
    <div id="saved-list"></div>
  </main>

  <!-- CÀI ĐẶT -->
  <main class="screen" id="settings">
    <div class="title-block"><h1>Cài đặt ⚙️</h1><p>Tùy chỉnh hồ sơ và dữ liệu bản xem thử SDT.</p></div>
    <div class="setting-row"><div><strong>Hồ sơ người dùng</strong><small id="setting-username">Bạn đang dùng chế độ khách.</small></div><button class="mini-btn primary" data-action="profile">Chỉnh sửa</button></div>
    <div class="setting-row"><div><strong>Địa điểm đã lưu</strong><small>Lưu trong localStorage của trình duyệt</small></div><button class="mini-btn" data-action="nav" data-tab="saved">Xem ngay</button></div>
    <div class="setting-row"><div><strong>Xóa dữ liệu bản xem thử</strong><small>Xóa tên hiển thị và danh sách yêu thích</small></div><button class="mini-btn" data-action="clear-data">Xóa</button></div>
    <div class="empty"><div class="emoji">🧭</div><strong>SDT — Smart Da Nang Travel</strong><p>Đây là bản HTML chạy độc lập để xem giao diện. Tài khoản, backend, GPS dẫn đường trong ứng dụng và AI lập lịch trình chưa được tích hợp.</p></div>
  </main>

  <nav class="bottom-nav" aria-label="Điều hướng chính">
    <button class="nav-btn active" data-action="nav" data-tab="home"><i class="fa-solid fa-house"></i><span>Trang chủ</span></button>
    <button class="nav-btn" data-action="nav" data-tab="explore"><i class="fa-solid fa-compass"></i><span>Khám phá</span></button>
    <button class="nav-btn" data-action="nav" data-tab="planner"><i class="fa-solid fa-route"></i><span>Lịch trình</span></button>
    <button class="nav-btn" data-action="nav" data-tab="saved"><i class="fa-solid fa-heart"></i><span>Đã lưu</span></button>
    <button class="nav-btn" data-action="nav" data-tab="settings"><i class="fa-solid fa-gear"></i><span>Cài đặt</span></button>
  </nav>
</div>

<div class="modal-cover hidden" id="modal-cover" role="presentation"><div class="modal" id="modal" role="dialog" aria-modal="true" aria-label="Thông tin"></div></div>
<div class="toast hidden" id="toast" role="status"></div>

<script>
  'use strict';
  // Ảnh mẫu trích từ HTML giao diện mà bạn đã gửi.
  const photos = {
    sontra: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQoZpu1KpIBhIn9CC0BR3N15U6BMpnQLWXNX3eKxpCrSyJCuDzfQSambdn3SMACWD94ffQokYRH3zGy2bQYQzBLtEYO5dUjZecZYeFN4okYjXM_KmehJZcom1z8Xi739EYVYu4HvIjcfuFh5CAMxyUP9zGJQ67xHSJ2u5-u5BKnTkMVEwQU2VJOz4CAg1W0kngwKE6D7r6x3L6JtglorcNhWOz6v9yNWuaAufYCHc',
    caurong: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6XeKPjDRvLV6NpJ1gxT59sbZ-HvRP1T-amMCkPLN4nR-UP0yBKCcAUqEeSnspcGUG3uqWEyOJGSI_0lAlNmC0pDvFISDqpqI89DKwB2x152vCAKs2dmEi0ol3tclEpgXsmigW1dBYAztPzUm2sM3M2ooY-OH7Ty0b-iAMCWqOogW-GZneGDPAjV3j-NSeeoVNU4WUhenQ1LFw4m11aYc4Z5_4rOr-4cohbzRUfuk',
    chodem: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEXY88vPFY8-13eDk-wqwfDBkFOvJOYH5L5sL8rAKxB6FOndsA3p6NCJ2epEnj1WkZ1Kbe8zCPRDcL_KLb0fD1de8MzPMWFeWHCBHAFwjZ_QqQxbu0aQ5WEDigZNWwdgCnLc0fNl65qhmiIgJ0euAcXO1Me_nFqQenu04OP6Fk6zVJRkcXsKm0noy-j-7umn26IFuxpU3OJg-hkRVCXJRGxeuJzM8XMssQqsk-lcc',
    duthuyen: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMBX9cyyMXFPc4uJnY5io8bbC94d_XyPlOrXgJB1wmSM5OGiGRG5T8Fhl0pPxne8vmgbVvGnyh_NaflAx06hXlXj59wqyBCVt3GrYYiYbNJfvNYXJjUetRTofGO7_SUQMjl4BMJqP6yW72Z2gva1p-sjwg3s5hGTswmQx6VffiM6uEPtdxGAq1By9VTlpgvjYbn5P2LQY8dMXcbZA7g9vagYAjxKXaQ8W7RTloy1w'
  };

  // Dữ liệu địa điểm để minh họa giao diện, chưa kết nối cơ sở dữ liệu.
  const places = [
    {id:'sontra',name:'Bán đảo Sơn Trà',category:'nature',emoji:'🌳',address:'Bán đảo Sơn Trà, Đà Nẵng',intro:'Rừng xanh, biển đẹp và những góc nhìn bao quát thành phố.',image:photos.sontra},
    {id:'mykhe',name:'Biển Mỹ Khê',category:'nature',emoji:'🏖️',address:'Biển Mỹ Khê, Đà Nẵng',intro:'Dạo biển, ngắm bình minh và tận hưởng không khí trong lành.'},
    {id:'linhung',name:'Chùa Linh Ứng Sơn Trà',category:'culture',emoji:'⛩️',address:'Chùa Linh Ứng Sơn Trà, Đà Nẵng',intro:'Không gian thanh tịnh trên bán đảo Sơn Trà.'},
    {id:'nguhanh',name:'Danh thắng Ngũ Hành Sơn',category:'culture',emoji:'⛰️',address:'Ngũ Hành Sơn, Đà Nẵng',intro:'Quần thể núi đá, hang động và điểm tham quan văn hóa.'},
    {id:'cham',name:'Bảo tàng Điêu khắc Chăm',category:'culture',emoji:'🏛️',address:'Bảo tàng Điêu khắc Chăm, Đà Nẵng',intro:'Tìm hiểu dấu ấn văn hóa và nghệ thuật Chăm.'},
    {id:'caurong',name:'Cầu Rồng',category:'night',emoji:'🐉',address:'Cầu Rồng, Đà Nẵng',intro:'Công trình biểu tượng bắc qua sông Hàn.',image:photos.caurong},
    {id:'chodem',name:'Chợ đêm Sơn Trà',category:'night',emoji:'🌙',address:'Chợ đêm Sơn Trà, Đà Nẵng',intro:'Không gian mua sắm và ẩm thực vào buổi tối.',image:photos.chodem},
    {id:'duthuyen',name:'Du thuyền sông Hàn',category:'night',emoji:'🚢',address:'Bến du thuyền sông Hàn, Đà Nẵng',intro:'Ngắm khung cảnh thành phố và những cây cầu về đêm.',image:photos.duthuyen},
    {id:'cautinhyeu',name:'Cầu Tình Yêu',category:'night',emoji:'💞',address:'Cầu Tình Yêu, Đà Nẵng',intro:'Điểm dạo chơi bên bờ sông Hàn, phù hợp tham quan buổi tối.'}
  ];
  const events = [
    {placeId:'caurong',name:'Cầu Rồng phun lửa',when:'21:00 · Thứ 7, CN',where:'Khu vực Cầu Rồng',image:photos.caurong},
    {placeId:'chodem',name:'Chợ đêm Sơn Trà',when:'18:00–24:00 · Tham khảo',where:'Mai Hắc Đế, Sơn Trà',image:photos.chodem},
    {placeId:'duthuyen',name:'Du thuyền sông Hàn',when:'Buổi tối · Tùy đơn vị',where:'Bến du thuyền sông Hàn',image:photos.duthuyen}
  ];
  const slides = [
    {placeId:'sontra',tag:'Thiên nhiên xanh',title:'Bán đảo Sơn Trà',subtitle:'Khám phá rừng xanh và góc nhìn ra biển Đà Nẵng',image:photos.sontra},
    {placeId:'caurong',tag:'Biểu tượng Đà Nẵng',title:'Cầu Rồng rực rỡ',subtitle:'Một trong những điểm nhấn của thành phố bên sông Hàn',image:photos.caurong},
    {placeId:'chodem',tag:'Vui chơi về đêm',title:'Chợ đêm Sơn Trà',subtitle:'Khám phá ẩm thực và không khí nhộn nhịp buổi tối',image:photos.chodem}
  ];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const safe = (str) => String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getSaved = () => {try{return JSON.parse(localStorage.getItem('sdt_saved')||'[]')}catch{return []}};
  const getName = () => localStorage.getItem('sdt_name') || '';
  const placeById = (id) => places.find(p=>p.id===id);
  let slideIndex=0, activeCategory='all', searchTerm='', toastTimer;

  function navigate(tab) {
    $$('.screen').forEach(el=>el.classList.toggle('active',el.id===tab));
    $$('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));
    if(tab==='explore') renderPlaces();
    if(tab==='saved') renderSaved();
    if(tab==='settings') updateProfile();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function updateProfile() {
    const name=getName();
    $('#username').textContent=name||'Du khách';
    $('#profile-prompt').textContent=name?'Sửa tên':'Tạo hồ sơ';
    $('#setting-username').textContent=name?\`Tên hiển thị: \${name}\`:'Bạn đang dùng chế độ khách.';
  }
  function toast(msg) {
    clearTimeout(toastTimer); $('#toast').textContent=msg; $('#toast').classList.remove('hidden');
    toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3000);
  }
  function openModal(html) {$('#modal').innerHTML=html;$('#modal-cover').classList.remove('hidden');}
  function closeModal() {$('#modal-cover').classList.add('hidden');$('#modal').innerHTML='';}
  function modalHeader(title) {return \`<div class="modal-top"><h2>\${title}</h2><button class="close" data-action="close-modal" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div>\`;}
  function openProfile() {
    openModal(\`\${modalHeader('Tên hiển thị')}<p>Nhập tên để cá nhân hóa giao diện bản xem thử. Đây chưa phải chức năng đăng nhập thật.</p><div class="field"><label for="name-field">Tên của bạn</label><input id="name-field" maxlength="35" placeholder="Ví dụ: Minh" value="\${safe(getName())}"></div><button class="btn btn-main full" style="margin-top:15px" data-action="save-name">Lưu tên hiển thị</button>\`);
    $('#name-field').focus();
  }
  function renderHero(index) {
    slideIndex=(index+slides.length)%slides.length;
    const s=slides[slideIndex];
    $('#hero-image').src=s.image; $('#hero-image').alt=s.title;
    $('#hero-tag').textContent=s.tag; $('#hero-title').textContent=s.title; $('#hero-subtitle').textContent=s.subtitle;
    $('#hero-dots').innerHTML=slides.map((_,i)=>\`<button class="dot \${i===slideIndex?'active':''}" data-action="hero-dot" data-index="\${i}" aria-label="Xem banner \${i+1}"></button>\`).join('');
  }
  function mapUrl(place) {return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.address);}
  function directionsUrl(place) {return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(place.address)+'&travelmode=driving';}
  function openDirections(id) {const p=placeById(id);if(p)window.open(directionsUrl(p),'_blank','noopener,noreferrer');}
  function openPlace(id) {
    const p=placeById(id);if(!p)return;
    const saved=getSaved().includes(id);
    openModal(\`\${modalHeader(safe(p.name))}\${p.image?\`<img class="modal-img" src="\${p.image}" alt="\${safe(p.name)}">\`:\`<div class="empty" style="font-size:42px">\${p.emoji}</div>\`}<p><i class="fa-solid fa-location-dot"></i> \${safe(p.address)}</p><p>\${safe(p.intro)}</p><div class="modal-actions"><button class="btn btn-ghost" data-action="toggle-save" data-id="\${p.id}">\${saved?'❤️ Đã lưu':'♡ Lưu địa điểm'}</button><button class="btn btn-main" data-action="directions" data-id="\${p.id}"><i class="fa-solid fa-diamond-turn-right"></i> Dẫn đường</button></div><p class="tiny">Dẫn đường mở Google Maps; chưa phải GPS tích hợp trong ứng dụng.</p>\`);
  }
  function renderEvents() {
    $('#event-list').innerHTML=events.map(e=>\`<article class="event-card"><img src="\${e.image}" alt="\${safe(e.name)}" loading="lazy"><div class="shade"></div><button class="event-click" data-action="detail" data-id="\${e.placeId}" aria-label="Chi tiết \${safe(e.name)}"></button><span class="event-tag">\${safe(e.when)}</span><div class="event-info"><div style="min-width:0;flex:1"><h3>\${safe(e.name)}</h3><p>📍 \${safe(e.where)}</p></div><button class="nav-short" data-action="directions" data-id="\${e.placeId}">Dẫn đường</button></div></article>\`).join('');
  }
  function renderCategories() {
    const cats=[['all','Tất cả'],['nature','🌿 Thiên nhiên'],['culture','🏛️ Văn hóa'],['night','🌙 Về đêm']];
    $('#category-list').innerHTML=cats.map(([id,label])=>\`<button class="chip \${activeCategory===id?'active':''}" data-action="category" data-id="\${id}">\${label}</button>\`).join('');
  }
  function placeCard(p) {
    const saved=getSaved().includes(p.id);
    return \`<article class="card place-card"><div class="place-thumb">\${p.emoji}\${p.image?\`<img src="\${p.image}" alt="" loading="lazy">\`:''}</div><div style="flex:1;min-width:0"><h3>\${safe(p.name)}</h3><p>\${safe(p.intro)}</p><div class="place-actions"><button class="mini-btn primary" data-action="detail" data-id="\${p.id}">Chi tiết</button><button class="mini-btn \${saved?'saved':''}" data-action="toggle-save" data-id="\${p.id}">\${saved?'♥ Đã lưu':'♡ Lưu'}</button></div></div></article>\`;
  }
  function renderPlaces() {
    renderCategories();
    const keyword=searchTerm.trim().toLocaleLowerCase('vi-VN');
    const list=places.filter(p=>(activeCategory==='all'||p.category===activeCategory) && (p.name+' '+p.intro+' '+p.address).toLocaleLowerCase('vi-VN').includes(keyword));
    $('#places-list').innerHTML=list.length?list.map(placeCard).join(''):'<div class="empty"><div class="emoji">🔎</div><strong>Không tìm thấy địa điểm</strong><p>Thử từ khóa hoặc danh mục khác nhé.</p></div>';
  }
  function renderSaved() {
    const list=getSaved().map(placeById).filter(Boolean);
    $('#saved-list').innerHTML=list.length?list.map(placeCard).join(''):'<div class="empty"><div class="emoji">🤍</div><strong>Chưa có địa điểm nào</strong><p>Vào mục Khám phá và bấm Lưu để tạo danh sách yêu thích.</p><button class="btn btn-main" data-action="nav" data-tab="explore">Đi khám phá</button></div>';
  }
  function toggleSave(id) {
    const saved=new Set(getSaved());
    if(saved.has(id)) {saved.delete(id);toast('Đã bỏ địa điểm khỏi danh sách lưu.')} else {saved.add(id);toast('Đã lưu địa điểm!')}
    localStorage.setItem('sdt_saved',JSON.stringify([...saved]));
    renderPlaces();renderSaved();
    if(!$('#modal-cover').classList.contains('hidden'))openPlace(id);
  }
  function generateTrip() {
    const days=Number($('#trip-days').value), interest=$('#trip-interest').value;
    const orders={
      mixed:['sontra','mykhe','caurong','nguhanh','cham','chodem','linhung','cautinhyeu','duthuyen'],
      nature:['sontra','mykhe','caurong','linhung','nguhanh','chodem','cham','cautinhyeu','duthuyen'],
      culture:['cham','nguhanh','caurong','linhung','sontra','chodem','mykhe','cautinhyeu','duthuyen'],
      night:['sontra','mykhe','caurong','nguhanh','cham','chodem','linhung','cautinhyeu','duthuyen']
    };
    // Mẫu minh họa: không có thuật toán tối ưu tuyến đường hoặc ETA thực tế.
    const ids=orders[interest];
    const hours=['08:30','14:00','19:00'];
    const html=Array.from({length:days},(_,d)=>{
      const stops=ids.slice(d*3,d*3+3).map((id,i)=>{
        const p=placeById(id);
        return \`<div class="stop"><strong>\${hours[i]} · \${safe(p.name)}</strong><p>\${safe(p.intro)}</p><a href="\${directionsUrl(p)}" target="_blank" rel="noopener noreferrer">Mở đường đi ↗</a></div>\`;
      }).join('');
      return \`<section class="card plan-day"><h3>📅 Ngày \${d+1}</h3>\${stops}</section>\`;
    }).join('');
    $('#trip-result').innerHTML=\`<div class="between"><strong>Gợi ý lịch trình \${days} ngày</strong><span class="pill pill-green">Bản mẫu</span></div>\${html}<p class="muted small" style="line-height:1.7">Thời gian là mốc gợi ý, cần tự kiểm tra khoảng cách, giờ mở cửa và điều kiện di chuyển trước khi đi.</p>\`;
    toast('Đã tạo lịch trình mẫu.');
  }

  // Open-Meteo: tải thời tiết thực tế, không sử dụng các số thời tiết giả cố định.
  const weatherUrl='https://api.open-meteo.com/v1/forecast?latitude=16.0544&longitude=108.2022&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FHo_Chi_Minh&forecast_days=7';
  const weatherDesc=(code)=>{
    if(code===0)return ['Trời quang','fa-sun'];
    if(code<=3)return ['Có mây','fa-cloud-sun'];
    if(code<=48)return ['Sương mù','fa-smog'];
    if(code<=67)return ['Có mưa','fa-cloud-rain'];
    if(code<=77)return ['Có tuyết/hạt băng','fa-cloud'];
    if(code<=82)return ['Mưa rào','fa-cloud-showers-heavy'];
    return ['Dông hoặc mưa lớn','fa-cloud-bolt'];
  };
  function formatDay(iso,index) {
    if(index===0)return 'Hôm nay';
    return new Intl.DateTimeFormat('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(iso+'T12:00:00+07:00'));
  }
  async function loadWeather() {
    try {
      const response=await fetch(weatherUrl);
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json(), c=data.current, d=data.daily, h=data.hourly;
      if(!c||!d||!h)throw new Error('Thiếu dữ liệu');
      const [desc,icon]=weatherDesc(c.weather_code);
      $('#weather-temp').textContent=Math.round(c.temperature_2m)+'°';
      $('#weather-icon').innerHTML=\`<i class="fa-solid \${icon}"></i>\`;
      $('#weather-condition').textContent=desc+' · Cập nhật '+c.time.slice(11,16);
      $('#weather-humidity').textContent=c.relative_humidity_2m+'%';
      $('#weather-uv').textContent=Number.isFinite(c.uv_index)?c.uv_index.toFixed(1):'--';
      $('#weather-wind').textContent=Math.round(c.wind_speed_10m)+' km/h';
      $('#weather-weekly').innerHTML=d.time.map((date,i)=>{
        const [label,ico]=weatherDesc(d.weather_code[i]);
        return \`<div class="day-item"><strong>\${formatDay(date,i)}</strong><i class="fa-solid \${ico}" aria-label="\${label}"></i><span>\${label}</span><small>\${Math.round(d.temperature_2m_min[i])}° / <strong>\${Math.round(d.temperature_2m_max[i])}°</strong></small></div>\`;
      }).join('');
      const start=h.time.findIndex(t=>t>=c.time.slice(0,13));
      const n=Math.max(0,start);
      $('#weather-hourly').innerHTML=h.time.slice(n,n+8).map((date,i)=>{
        const j=n+i,[,ico]=weatherDesc(h.weather_code[j]);
        return \`<div class="hour-item"><span>\${date.slice(11,16)}</span><i class="fa-solid \${ico}"></i><strong>\${Math.round(h.temperature_2m[j])}°</strong><span>☔ \${h.precipitation_probability[j]??'--'}%</span></div>\`;
      }).join('');
    } catch (err) {
      $('#weather-condition').textContent='Không thể tải thời tiết lúc này';
      $('#weather-weekly').innerHTML='<div class="small">Kiểm tra Internet rồi tải lại trang để xem dự báo.</div>';
      $('#weather-hourly').innerHTML='<div class="small">Chưa có dữ liệu dự báo.</div>';
      $('#weather-note').textContent='Không có dữ liệu trực tiếp · Các chỉ số chưa được xác minh.';
      console.warn('Lỗi tải thời tiết:',err);
    }
  }
  function selectForecast(type) {
    const hourly=type==='hour';
    $('#weather-hourly').classList.toggle('hidden',!hourly);
    $('#weather-weekly').classList.toggle('hidden',hourly);
    $('#wf-hour').classList.toggle('active',hourly);
    $('#wf-week').classList.toggle('active',!hourly);
    $('#forecast-title').textContent=hourly?'Dự báo theo giờ':'Dự báo 7 ngày tới';
  }

  // Một nơi xử lý các thao tác nhấn: nút nào cũng có hành động cụ thể.
  document.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-action]'); if(!btn)return;
    const a=btn.dataset.action,id=btn.dataset.id;
    if(a==='nav')navigate(btn.dataset.tab);
    if(a==='profile')openProfile();
    if(a==='close-modal')closeModal();
    if(a==='notifications')openModal(\`\${modalHeader('Thông báo')}<div class="empty"><div class="emoji">🔔</div><strong>Chưa có thông báo</strong><p>Khi kết nối backend, thông báo lịch trình sẽ xuất hiện tại đây.</p></div>\`);
    if(a==='save-name') {const name=$('#name-field').value.trim();if(!name)return toast('Hãy nhập tên hiển thị.');localStorage.setItem('sdt_name',name);updateProfile();closeModal();toast('Đã lưu tên hiển thị.');}
    if(a==='hero-prev')renderHero(slideIndex-1);
    if(a==='hero-next')renderHero(slideIndex+1);
    if(a==='hero-dot')renderHero(Number(btn.dataset.index));
    if(a==='hero-detail')openPlace(slides[slideIndex].placeId);
    if(a==='all-events')openModal(\`\${modalHeader('Sự kiện đêm Đà Nẵng')}<p>Khung giờ dưới đây chỉ để tham khảo từ bản thiết kế. Hãy xác nhận trước khi đến.</p>\${events.map(item=>\`<div class="setting-row"><div><strong>\${safe(item.name)}</strong><small>\${safe(item.when)}</small></div><button class="mini-btn primary" data-action="detail" data-id="\${item.placeId}">Chi tiết</button></div>\`).join('')}\`);
    if(a==='detail')openPlace(id);
    if(a==='directions')openDirections(id);
    if(a==='toggle-save')toggleSave(id);
    if(a==='category'){activeCategory=id;renderPlaces();}
    if(a==='generate-trip')generateTrip();
    if(a==='forecast-hour')selectForecast('hour');
    if(a==='forecast-week')selectForecast('week');
    if(a==='clear-data'){if(confirm('Xóa tên hiển thị và toàn bộ địa điểm đã lưu trên trình duyệt này?')){localStorage.removeItem('sdt_name');localStorage.removeItem('sdt_saved');updateProfile();renderPlaces();renderSaved();toast('Đã xóa dữ liệu bản xem thử.');}}
  });
  $('#search-input').addEventListener('input',(e)=>{searchTerm=e.target.value;renderPlaces();});
  $('#modal-cover').addEventListener('click',(e)=>{if(e.target===$('#modal-cover'))closeModal();});
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeModal();if(e.key==='Enter'&&e.target.id==='name-field'){$('[data-action="save-name"]').click();}});
  let touchStartX=0;
  $('#hero').addEventListener('touchstart',(e)=>{touchStartX=e.changedTouches[0].screenX;},{passive:true});
  $('#hero').addEventListener('touchend',(e)=>{const delta=e.changedTouches[0].screenX-touchStartX;if(Math.abs(delta)>55)renderHero(slideIndex+(delta<0?1:-1));},{passive:true});

  updateProfile(); renderHero(0); renderEvents(); renderPlaces(); renderSaved(); loadWeather();
</script>
</body>
</html>
`;

export const sdtHtml = SDT_HTML;
export default SDT_HTML;

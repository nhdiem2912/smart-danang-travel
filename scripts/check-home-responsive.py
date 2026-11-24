"""Browser regression check for portrait Home. Requires Python Playwright and Chromium."""
from pathlib import Path
import argparse, json, shutil, subprocess, tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Verify Home across portrait phone and foldable window sizes.')
parser.add_argument('--output',type=Path,default=Path(tempfile.gettempdir())/'sdt-home-responsive')
args=parser.parse_args();P=args.output;P.mkdir(parents=True,exist_ok=True)
# Evaluate the actual exported template, so tests cover the shipping HTML and JS.
compiled=subprocess.run(['node','-e',"const fs=require('fs'),vm=require('vm'),ts=require('typescript'),e={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/home/home-html.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:e});process.stdout.write(e.HOME_HTML);"],cwd=ROOT,check=True,capture_output=True,text=True,encoding='utf8')
html=compiled.stdout
config=json.loads((ROOT/'app.json').read_text(encoding='utf8'))
assert config['expo']['orientation']=='portrait','Home changes must retain portrait orientation'
(P/'home-preview.html').write_text(html,encoding='utf8')
svg='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"%3E%3Cdefs%3E%3ClinearGradient id="g"%3E%3Cstop stop-color="%23087570"/%3E%3Cstop offset="1" stop-color="%23295d9b"/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill="url(%23g)" d="M0 0h1000v700H0z"/%3E%3Cpath fill="%23ffffff22" d="M0 400Q250 180 500 420T1000 280V700H0"/%3E%3C/svg%3E'
fixture=dict(name='Người dùng với tên hiển thị rất dài trên màn hình nhỏ',avatar=None,featured=[dict(title='Cầu Rồng – Biểu tượng Đà Nẵng',subtitle='',tag='THÀNH PHỐ BÊN SÔNG HÀN',rating=4.5,image=svg,placeId='dragon'),dict(title='Khám phá biển Mỹ Khê',tag='ĐIỂM ĐẾN',rating=4.6,image=svg,placeId='beach')],events=[dict(id=str(i),title=t,when='Lịch tham khảo',where='Đà Nẵng',image=svg) for i,t in enumerate(['Cầu Rồng phun lửa và phun nước','Chợ đêm Sơn Trà và ẩm thực địa phương','Du thuyền sông Hàn ngắm Cầu Rồng','Cầu quay sông Hàn'])],weather=dict(temperature=27,icon='⛅',description='Có mây',updated='15:00',humidity=82,uv=3.5,wind=8,hours=[dict(time=f'{16+i}:00',temperature=27-i%3,icon='⛅',rain=20+i,description='Có mây') for i in range(6)],days=[dict(date=f'2026-11-{24+i}',high=28,low=23,icon='⛅',rain=30,description='Có mây') for i in range(7)]),weatherError='',tripActive=True,tripTitle='Chuyến đi 14 ngày · 30 địa điểm đã chọn',tripNote='',colors=dict(background='#f6f9fc',text='#253347',card='#ffffff',pale='#ecfdf5',green='#087f61',muted='#718096',line='#e1e9f1'))
viewports=[(280,600),(320,560),(344,740),(360,640),(375,700),(390,750),(430,820),(600,800),(700,800),(768,850),(840,1000),(1024,1200)]
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':750},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.evaluate('window.ReactNativeWebView={postMessage:function(s){(window.sent||(window.sent=[])).push(JSON.parse(s))}}')
 page.evaluate('(data)=>window.updateHome(data)',fixture)
 for width,height in viewports:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(50)
  for mode,count in [('hour',6),('week',7)]:
   page.locator(f'#mode-{mode}').click();page.locator('#app').evaluate('(e)=>e.scrollTop=0')
   dims=page.evaluate('''()=>{const a=document.getElementById('app'),w=document.querySelector('.weather'),b=w.getBoundingClientRect();return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,appWidth:a.clientWidth,appScrollWidth:a.scrollWidth,scrollHeight:a.scrollHeight,clientHeight:a.clientHeight,columns:getComputedStyle(a).gridTemplateColumns,weather:b.height,forecastBottom:document.getElementById('forecast').getBoundingClientRect().bottom,weatherBottom:b.bottom,cards:document.querySelectorAll('.forecast-card').length}}''')
   assert dims['documentWidth']<=width+1,('page overflow',width,height,dims)
   assert dims['appScrollWidth']<=dims['appWidth']+1,('main overflow',width,height,dims)
   assert dims['cards']==count,('forecast count',dims)
   assert dims['forecastBottom']<=dims['weatherBottom']+1,('weather clipped',width,height,mode,dims)
   page.locator('#app').evaluate('(e)=>e.scrollTop=e.scrollHeight')
   trip=page.locator('.trip').bounding_box();assert trip['y']>=0 and trip['y']+trip['height']<=height+1,('trip unreachable',width,height,trip)
   results.append(dict(width=width,height=height,mode=mode,**dims))
  page.locator('#app').evaluate('(e)=>e.scrollTop=0')
  if width in [320,390,768,840]:page.screenshot(path=str(P/f'home-{width}x{height}.png'),full_page=False)
 # Live fold/unfold without reloading state; test the same portrait app window.
 page.locator('#mode-week').click()
 for width,height in [(360,740),(768,900),(360,740)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(50)
  assert page.locator('#mode-week').evaluate('(e)=>e.classList.contains("active")')
  assert page.locator('#name').inner_text()==fixture['name']
  assert page.locator('.forecast-card').count()==7
 page.locator('[data-action="hero-open"]').click();assert page.evaluate('window.sent.at(-1).action')=='place'
 page.locator('[data-action="all-events"]').click();assert page.locator('.event-row').count()==4
 b=page.locator('.sheet').bounding_box();assert b['y']>=0 and b['y']+b['height']<=740+1
 page.locator('.close').click();assert page.locator('#events-overlay').is_hidden()
 # Horizontal carousels remain scrollable on cover displays.
 assert page.locator('#forecast').evaluate('(e)=>e.scrollWidth>e.clientWidth')
 page.locator('#forecast').evaluate('(e)=>e.scrollLeft=e.scrollWidth')
 assert page.locator('#forecast').evaluate('(e)=>e.scrollLeft>0')
 assert not errors,errors
 browser.close()
(P/'browser-results.json').write_text(json.dumps({'viewport_mode_checks':len(results),'cases':results,'live_fold_resize':'passed','preserves_weather_mode_and_profile':'passed','banner_bridge':'passed','events_dialog':'passed','forecast_horizontal_scroll':'passed','page_errors':errors,'scope':'Chromium browser verification of Home HTML; no physical foldable or native APK claimed.'},ensure_ascii=False,indent=2))
print('PASS',len(results),'viewport/mode checks; live resize, bridge, modal, carousel; no JS errors.')

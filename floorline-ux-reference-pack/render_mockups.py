from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
base=Path(__file__).resolve().parent
html=(base/'mockups/floorline-reference.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for page in ['landing','overview','treasury','loans','governance','activity']:
        pg=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
        pg.set_content(html.replace("const p=new URLSearchParams(location.search).get('page')||'landing';", f"const p='{page}';"),wait_until='load')
        pg.screenshot(path=str(base/'screenshots'/f'{page}_desktop.png'),full_page=False)
        pg.close()
    for page in ['landing','overview','treasury','loans']:
        pg=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
        pg.set_content(html.replace("const p=new URLSearchParams(location.search).get('page')||'landing';", f"const p='{page}';"),wait_until='load')
        pg.screenshot(path=str(base/'screenshots'/f'{page}_mobile.png'),full_page=False)
        pg.close()
    browser.close()
# contact sheet from desktop screenshots
thumbs=[]
for page in ['landing','overview','treasury','loans','governance','activity']:
    im=Image.open(base/'screenshots'/f'{page}_desktop.png').convert('RGB')
    im.thumbnail((650,406))
    tile=Image.new('RGB',(680,440),'#ECEAE7')
    tile.paste(im,((680-im.width)//2,15))
    d=ImageDraw.Draw(tile)
    d.text((18,415),page.upper(),fill='#312748')
    thumbs.append(tile)
sheet=Image.new('RGB',(1380,1350),'#ECEAE7')
for i,im in enumerate(thumbs):sheet.paste(im,(10+(i%2)*690,10+(i//2)*445))
sheet.save(base/'screenshots'/'00_all_pages_contact_sheet.png',quality=94)
print('rendered',len(list((base/'screenshots').glob('*.png'))),'screenshots')

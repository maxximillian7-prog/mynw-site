#!/usr/bin/env python3
"""Rebuild Portugal Ryadom Instagram JPEG covers and full-story carousel slides.
Uses only already editorial-approved original images. No generative AI calls.
Run by the dedicated GitHub Actions job; keep published posts untouched on Instagram.
"""
from __future__ import annotations
import io, json, os, sys, time, textwrap, urllib.parse
from pathlib import Path
import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "infra/portugalia-editor/instagram-retrofit-20261123.manifest.json"
OUTPUT = ROOT / "journalstudio/instagram-retrofit"
OUTPUT.mkdir(parents=True, exist_ok=True)
W, H = 1080, 1350
INK = "#163A3D"
TEAL = "#137A75"
SECTIONS = {"documents":"ДОКУМЕНТЫ","family":"СЕМЬЯ","life":"ЖИЗНЬ","work":"РАБОТА",
            "tips":"ПОЛЕЗНОЕ","travel":"ПУТЕШЕСТВИЯ","places":"МЕСТА",
            "events":"СОБЫТИЯ","news":"НОВОСТИ"}
FONT_REG = next((p for p in [
 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
 "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"] if Path(p).exists()),None)
FONT_BOLD = next((p for p in [
 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
 "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"] if Path(p).exists()), FONT_REG)
if not FONT_REG or not FONT_BOLD:
 raise RuntimeError("Required Cyrillic fonts unavailable on runner")
def font(size, bold=False): return ImageFont.truetype(FONT_BOLD if bold else FONT_REG,size)
def width(draw,txt,ft):return draw.textbbox((0,0),txt,font=ft)[2]
def wrap(draw,text,ft,max_width):
 words=str(text or "").strip().split()
 lines=[];current=""
 for word in words:
  possible=(current+" "+word).strip()
  if width(draw,possible,ft)<=max_width or not current:current=possible
  else:lines.append(current);current=word
 if current:lines.append(current)
 return lines

def load_photo(url):
 if not url or not url.startswith("https://"):raise ValueError("Missing HTTPS original image")
 host=urllib.parse.urlsplit(url).hostname or ""
 if host not in {"thumb.wikimedia.org","upload.wikimedia.org","commons.wikimedia.org","br-young-paper-b972wmgd.storage.c-7.eu-central-1.aws.neon.tech","images.unsplash.com","images.pexels.com","cdn.pixabay.com","live.staticflickr.com"}:
  raise ValueError("Original image host not approved: "+host)
 headers={"User-Agent":"Portugal-Ryadom-Editorial-Cover/2.0 (https://mynw.app); contact: editorial"}
 resp=requests.get(url,headers=headers,timeout=25)
 resp.raise_for_status()
 if len(resp.content)>16000000:raise ValueError("Large original image")
 img=Image.open(io.BytesIO(resp.content));img.load()
 if img.width<320 or img.height<320:raise ValueError("Original too small")
 return ImageOps.exif_transpose(img).convert("RGB")

def cover(entry):
 item_id=entry["item_id"]
 photo=load_photo(entry["original_image"])
 image=ImageOps.fit(photo,(W,H),method=Image.Resampling.LANCZOS,centering=(.5,.48))
 d=ImageDraw.Draw(image,"RGBA")
 d.rounded_rectangle((58,47,694,197),radius=17,fill=(255,255,255,226),outline=(18,67,68,36),width=2)
 d.rectangle((78,67,84,175),fill=TEAL)
 d.text((105,82),"ПОРТУГАЛИЯ / РЯДОМ",font=font(27,True),fill=INK)
 d.text((106,137),SECTIONS.get(entry.get("category"),"ПОРТУГАЛИЯ"),font=font(23,True),fill="#336A6A")
 title=str(entry["headline"]).strip().replace("\n"," ")
 for size in range(60,41,-2):
  ft=font(size,True);rows=wrap(d,title,ft,890)
  if len(rows)<=4 and len(rows)*(size*1.20)<=295:break
 if len(rows)>4:
  rows=rows[:4]
  while width(d,rows[-1].rstrip(" .,;:!?")+"…",ft)>890 and " " in rows[-1]:
   rows[-1]=rows[-1].rsplit(" ",1)[0]
  rows[-1]=rows[-1].rstrip(" .,;:!?")+"…"
 y=1053-(len(rows)-1)*int(size*1.16)
 top=y-size-25
 height=(len(rows)-1)*int(size*1.16)+size+77
 d.rounded_rectangle((70,top,1010,top+height),radius=19,fill=(255,255,255,224),outline=(20,72,73,46),width=2)
 for idx,line in enumerate(rows):
  d.text((92,y+idx*int(size*1.16)-size),line,font=ft,fill=INK,stroke_width=0)
 d.rounded_rectangle((56,1168,1024,1319),radius=18,fill=(255,255,255,222))
 d.rectangle((76,1192,148,1197),fill=TEAL)
 d.text((76,1209),"О ПОРТУГАЛИИ — ПОНЯТНО И ПО ДЕЛУ",font=font(23,True),fill=INK)
 d.text((76,1268),"instagram.com/pt_ryadom",font=font(19),fill="#466E6C")
 d.text((830,1268),"MYNOW",font=font(18,True),fill="#466E6C")
 dest=OUTPUT/f"{item_id}.jpg"
 image.save(dest,"JPEG",quality=82,optimize=True,progressive=True,subsampling=0)
 return dest

def split_pages(raw):
 """Pack complete original Russian paragraphs into readable pages, no truncation."""
 text=str(raw or "").strip()
 if not text:return []
 pages=[];offset=0
 while offset<len(text):
  # Each slide can display ~19 lines at 39 px, cap to 870 chars
  chunk=text[offset:offset+820]
  if len(chunk)<len(text)-offset:
   pos=max(chunk.rfind("\n\n"),chunk.rfind(". "),chunk.rfind("! "),chunk.rfind("? "))
   if pos>450:chunk=chunk[:pos+2]
   else:
    i=chunk.rfind(" ")
    if i>350:chunk=chunk[:i]
  page=chunk.strip()
  if page:pages.append(page)
  offset+=len(chunk)
  while offset<len(text) and text[offset].isspace():offset+=1
  if len(pages)>=9 and offset<len(text):
   # The caller reports this as a failure rather than silently truncating.
   raise ValueError("Article requires more than 9 continuation pages")
 return pages

def slide(item_id,page,idx,total):
 img=Image.new("RGB",(W,H),"#F5F7F3")
 d=ImageDraw.Draw(img)
 d.rounded_rectangle((44,43,1037,1314),radius=23,fill="white",outline="#D5E4DD",width=3)
 d.rectangle((86,90,94,157),fill=TEAL)
 d.text((111,97),"ПОРТУГАЛИЯ / РЯДОМ",font=font(30,True),fill=INK)
 d.text((86,178),f"ПОЛНЫЙ ТЕКСТ СТАТЬИ  ·  {idx}/{total}",font=font(22,True),fill=TEAL)
 # Fit text to available height and width, preserving every character.
 for fsize in range(40,27,-2):
  ft=font(fsize)
  paragraphs=page.split("\n")
  lines=[]
  for para in paragraphs:
   if not para.strip():lines.append("")
   else:lines.extend(wrap(d,para,ft,894))
  line_height=int(fsize*1.43)
  if len(lines)*line_height<=1020:break
 if len(lines)*line_height>1020:raise ValueError("Continuation slide overflow")
 y=241
 for line in lines:
  if line:d.text((89,y),line,font=ft,fill="#213A3B")
  y+=line_height
 d.line((89,1245,992,1245),fill="#D5E4DD",width=2)
 d.text((89,1262),"@pt_ryadom",font=font(21,True),fill=TEAL)
 dest=OUTPUT/f"{item_id}-text-{idx}.jpg"
 img.save(dest,"JPEG",quality=83,optimize=True,progressive=True)
 return dest

def main():
 records=json.loads(MANIFEST.read_text(encoding="utf8"))["records"]
 status=[]
 for n,rec in enumerate(records,1):
  try:
   main_image=cover(rec)
   story=str(rec.get("full_story") or "").strip()
   # When a full article exceeds the 2,200-character Instagram caption,
   # provide full original text in subsequent carousel slides.
   extra=[]
   if rec.get("needs_continuation") and story:
    paragraphs=split_pages(story)
    if len(paragraphs)>9:raise ValueError("Too many pages")
    extra=[slide(rec["item_id"],txt,i+1,len(paragraphs)) for i,txt in enumerate(paragraphs)]
   status.append({"item_id":rec["item_id"],"status":"ready","files":[str(z.relative_to(ROOT)) for z in [main_image,*extra]]})
   print(f"OK {n}/{len(records)} {rec['item_id']} covers={1+len(extra)}")
  except Exception as exc:
   status.append({"item_id":rec["item_id"],"status":"failed","error":str(exc)[:230]})
   print(f"FAILED {rec['item_id']}: {exc}",file=sys.stderr)
 out=ROOT/"infra/portugalia-editor/instagram-retrofit-result.json"
 out.write_text(json.dumps({"records":status},ensure_ascii=False,indent=2),encoding="utf8")
 failed=sum(x["status"]!="ready" for x in status)
 print(json.dumps({"total":len(records),"ready":len(records)-failed,"failed":failed}))
 if failed:sys.exit(2)

if __name__=="__main__":main()

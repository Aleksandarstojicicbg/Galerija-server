from fpdf import FPDF
from PIL import Image, ImageDraw, ImageFont
import json
import os

# Putanja do order.json
ORDER_FILE = "C:\\Users\\Marica\\Pictures\\galerija\\Server\\order.json"
# Putanja do foldera sa slikama
IMAGE_FOLDER = "C:\\Users\\Marica\\Pictures\\galerija\\slike"
# Putanja za folder gde će se čuvati PDF fajlovi
PDF_FOLDER = "C:\\Users\\Marica\\Pictures\\galerija\\PDFs"
# Putanja za generisanu sliku sa imenom
NAME_IMAGE = "C:\\Users\\Marica\\Pictures\\galerija\\PDFs\\name_image.jpg"

# Kreiraj folder za PDF ako ne postoji
os.makedirs(PDF_FOLDER, exist_ok=True)

# Učitaj podatke iz order.json
try:
    with open(ORDER_FILE, "r", encoding="utf-8") as file:
        order_data = json.load(file)
        name = order_data.get("name", "Nepoznato").replace(" ", "_")  # Zameni razmake donjom crtom
        selected_images = order_data.get("selectedImages", [])
        payment_method = order_data.get("paymentMethod", "Nije definisano")  # Način plaćanja
except FileNotFoundError:
    print("order.json nije pronađen.")
    exit(1)
except json.JSONDecodeError:
    print("Greška pri učitavanju JSON podataka.")
    exit(1)

# Izračunaj ukupnu cenu (2 EUR po slici)
total_price = len(selected_images) * 2

# Kreiraj sliku sa imenom, cenom, načinom plaćanja i listom slika
# Povećaj visinu slike da stane spisak u tri kolone
num_images = len(selected_images)
rows_needed = (num_images + 2) // 3  # Broj redova za tri kolone
image_height = 200 + rows_needed * 30 + 100  # Dodaj prostor za tekst i slike
img = Image.new('RGB', (800, image_height), color='white')
draw = ImageDraw.Draw(img)

try:
    font_large = ImageFont.truetype("arial.ttf", 40)  # Font za naslov
    font_small = ImageFont.truetype("arial.ttf", 20)  # Font za spisak i detalje
except IOError:
    print("Nije pronađen font arial.ttf, koristi se default font.")
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()

# Dodaj ime kupca
text = f"Kupac: {name}"
text_bbox = draw.textbbox((0, 0), text, font=font_large)
text_width = text_bbox[2] - text_bbox[0]
text_x = (800 - text_width) / 2
text_y = 20
draw.text((text_x, text_y), text, fill='black', font=font_large)

# Dodaj ukupnu cenu
price_text = f"Ukupna cena: {total_price} EUR"
price_bbox = draw.textbbox((0, 0), price_text, font=font_small)
price_width = price_bbox[2] - price_bbox[0]
price_x = (800 - price_width) / 2
price_y = text_y + 50
draw.text((price_x, price_y), price_text, fill='black', font=font_small)

# Dodaj način plaćanja
payment_text = f"Način plaćanja: {payment_method}"
payment_bbox = draw.textbbox((0, 0), payment_text, font=font_small)
payment_width = payment_bbox[2] - payment_bbox[0]
payment_x = (800 - payment_width) / 2
payment_y = price_y + 30
draw.text((payment_x, payment_y), payment_text, fill='black', font=font_small)

# Dodaj listu slika u tri kolone
column_width = 250  # Širina svake kolone
start_y = payment_y + 50  # Početna y pozicija za listu
for i, image_name in enumerate(selected_images):
    col = i % 3  # Kolona (0, 1, 2)
    row = i // 3  # Red
    x_pos = 20 + col * column_width  # X pozicija za svaku kolonu
    y_pos = start_y + row * 30  # Y pozicija za svaki red
    draw.text((x_pos, y_pos), image_name, fill='black', font=font_small)

# Sačuvaj sliku
img.save(NAME_IMAGE)

# Kreiranje PDF-a
pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=10)

# Dodaj sliku sa imenom kupca i detaljima
pdf.add_page()
pdf.image(NAME_IMAGE, x=10, y=10, w=180)

# Dodaj slike koje je korisnik izabrao
for image_name in selected_images:
    image_path = os.path.join(IMAGE_FOLDER, image_name)
    if os.path.exists(image_path):
        pdf.add_page()
        pdf.image(image_path, x=10, y=10, w=180)
    else:
        print(f"Slika nije pronađena: {image_path}")

# Definiši putanju za PDF
PDF_FILE = os.path.join(PDF_FOLDER, f"{name}.pdf")

# Sačuvaj PDF
pdf.output(PDF_FILE)
print(f"PDF generisan: {PDF_FILE}")
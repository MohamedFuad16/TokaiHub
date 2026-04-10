from PIL import Image

def remove_white(image_path):
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Check if the pixel is near-white
        # R, G, B channels
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0)) # transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(image_path)

remove_white('src/assets/mascots/mascot_1_1.png')
print("Done")

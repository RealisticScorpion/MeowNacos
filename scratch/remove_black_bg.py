import sys
from PIL import Image

def make_transparent(img_path, output_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        # 计算亮度
        brightness = (r + g + b) / 3.0
        
        if brightness < 8.0:
            # 纯黑背景设为完全透明
            new_data.append((0, 0, 0, 0))
        elif brightness < 110.0:
            # 阴影过渡区
            ratio = (brightness - 8.0) / (110.0 - 8.0)
            # 使用平方让投影的外边缘更淡、内边缘更实，过渡更柔和
            alpha = int((ratio ** 1.5) * 255)
            # 为了防止投影带颜色，我们将投影像素去色（灰色），这会让投影看起来极度自然干净
            gray = int(brightness * 0.5) # 稍微暗化的灰色投影
            new_data.append((gray, gray, gray, alpha))
        else:
            # 白卡片和主图形完全不透明
            new_data.append((r, g, b, 255))
            
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"已成功转换图标至: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_black_bg.py <input> <output>")
        sys.exit(1)
    make_transparent(sys.argv[1], sys.argv[2])

import os
import io
import cv2
import torch
import numpy as np
import torch.nn as nn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# -------------------- FastAPI App --------------------
app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow everything during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Model Classes --------------------

class ResBlock(nn.Module):
    def __init__(self, num_channel):
        super(ResBlock, self).__init__()
        self.conv_layer = nn.Sequential(
            nn.Conv2d(num_channel, num_channel, 3, 1, 1),
            nn.BatchNorm2d(num_channel),
            nn.ReLU(inplace=True),
            nn.Conv2d(num_channel, num_channel, 3, 1, 1),
            nn.BatchNorm2d(num_channel)
        )
        self.activation = nn.ReLU(inplace=True)

    def forward(self, inputs):
        output = self.conv_layer(inputs)
        output = self.activation(output + inputs)
        return output

class DownBlock(nn.Module):
    def __init__(self, in_channel, out_channel):
        super(DownBlock, self).__init__()
        self.conv_layer = nn.Sequential(
            nn.Conv2d(in_channel, out_channel, 3, 2, 1),
            nn.BatchNorm2d(out_channel),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channel, out_channel, 3, 1, 1),
            nn.BatchNorm2d(out_channel),
            nn.ReLU(inplace=True)
        )

    def forward(self, inputs):
        output = self.conv_layer(inputs)
        return output

class UpBlock(nn.Module):
    def __init__(self, in_channel, out_channel, is_last=False):
        super(UpBlock, self).__init__()
        self.is_last = is_last
        self.conv_layer = nn.Sequential(
            nn.Conv2d(in_channel, in_channel, 3, 1, 1),
            nn.BatchNorm2d(in_channel),
            nn.ReLU(inplace=True),
            nn.Upsample(scale_factor=2, mode='nearest'),
            nn.Conv2d(in_channel, out_channel, 3, 1, 1)
        )
        self.act = nn.Sequential(
            nn.BatchNorm2d(out_channel),
            nn.ReLU(inplace=True)
        )
        self.last_act = nn.Tanh()

    def forward(self, inputs):
        output = self.conv_layer(inputs)
        if self.is_last:
            output = self.last_act(output)
        else:
            output = self.act(output)
        return output

class SimpleGenerator(nn.Module):
    def __init__(self, num_channel=32, num_blocks=4):
        super(SimpleGenerator, self).__init__()
        self.down1 = DownBlock(3, num_channel)
        self.down2 = DownBlock(num_channel, num_channel * 2)
        self.down3 = DownBlock(num_channel * 2, num_channel * 3)
        self.down4 = DownBlock(num_channel * 3, num_channel * 4)
        self.res_blocks = nn.Sequential(*[ResBlock(num_channel * 4) for _ in range(num_blocks)])
        self.up1 = UpBlock(num_channel * 4, num_channel * 3)
        self.up2 = UpBlock(num_channel * 3, num_channel * 2)
        self.up3 = UpBlock(num_channel * 2, num_channel)
        self.up4 = UpBlock(num_channel, 3, is_last=True)

    def forward(self, inputs):
        down1 = self.down1(inputs)
        down2 = self.down2(down1)
        down3 = self.down3(down2)
        down4 = self.down4(down3)
        down4 = self.res_blocks(down4)
        up1 = self.up1(down4)

        # Handle mismatch in size due to rounding after downsampling
        if up1.shape[-1] != down3.shape[-1] or up1.shape[-2] != down3.shape[-2]:
            down3 = torch.nn.functional.interpolate(down3, size=up1.shape[-2:], mode="nearest")

        up2 = self.up2(up1 + down3)

        if up2.shape[-1] != down2.shape[-1] or up2.shape[-2] != down2.shape[-2]:
            down2 = torch.nn.functional.interpolate(down2, size=up2.shape[-2:], mode="nearest")

        up3 = self.up3(up2 + down2)

        if up3.shape[-1] != down1.shape[-1] or up3.shape[-2] != down1.shape[-2]:
            down1 = torch.nn.functional.interpolate(down1, size=up3.shape[-2:], mode="nearest")

        up4 = self.up4(up3 + down1)
        return up4

# -------------------- Load Model --------------------

weight_path = 'weight.pth'

if not os.path.exists(weight_path):
    raise FileNotFoundError(f"Weight file '{weight_path}' not found!")

model = SimpleGenerator()
weight = torch.load(weight_path, map_location='cpu')
model.load_state_dict(weight)
model.eval()

# -------------------- Helper Functions --------------------

def cartoonize_image(img):
    """Apply the cartoonizer model on the image."""
    image = img / 127.5 - 1
    image = image.transpose(2, 0, 1)
    image = torch.from_numpy(image).float().unsqueeze(0)

    with torch.no_grad():
        output = model(image)
    output = output.squeeze(0).detach().numpy()
    output = output.transpose(1, 2, 0)
    output = (output + 1) * 127.5
    output = np.clip(output, 0, 255).astype(np.uint8)
    return output

def apply_other_styles(img, style):
    """Apply OpenCV-based styles."""
    if style == "Black & White":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    elif style == "Oil Painting":
        img = cv2.xphoto.oilPainting(img, 7, 1)
    elif style == "Pencil Sketch":
        _, img = cv2.pencilSketch(img, sigma_s=60, sigma_r=0.07, shade_factor=0.05)
    elif style == "Stylized":
        img = cv2.stylization(img, sigma_s=150, sigma_r=0.25)
    elif style == "Sepia":
        sepia_filter = np.array([[0.272, 0.534, 0.131],
                                 [0.349, 0.686, 0.168],
                                 [0.393, 0.769, 0.189]])
        img = cv2.transform(img, sepia_filter)
        img = np.clip(img, 0, 255).astype(np.uint8)
    return img

# -------------------- API Endpoint --------------------

@app.post("/stylize/")
async def stylize_image(file: UploadFile = File(...), style: str = Form(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Could not read the uploaded image."}

    if style == "Cartoon":
        output = cartoonize_image(img)
    else:
        output = apply_other_styles(img, style)

    # Encode back to JPEG for sending
    _, encoded_img = cv2.imencode('.jpg', output)
    return StreamingResponse(io.BytesIO(encoded_img.tobytes()), media_type="image/jpeg")

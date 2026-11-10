import os
import cv2
import numpy as np
from PIL import Image

BRAIN_DIR = r"C:\Users\user\.gemini\antigravity\brain\814221ea-e71f-4050-9d3f-ba6a656a7a50"
OUT_DIR = r"d:\AAAA 게임\public\assets\images\chars"
os.makedirs(OUT_DIR, exist_ok=True)

SPRITES = [
    ("sera_normal_1794325915843.jpg", "sera_normal.png", "green"),
    ("sera_smile_1794325938980.jpg", "sera_smile.png", "green"),
    ("sera_sad_1794325957737.jpg", "sera_sad.png", "green"),
    ("harin_normal_1794325919116.jpg", "harin_normal.png", "green"),
    ("harin_combat_1794325936791.jpg", "harin_combat.png", "green"),
    ("harin_vulnerable_1794325953406.jpg", "harin_vulnerable.png", "green"),
    ("julius_normal_1794325918727.jpg", "julius_normal.png", "green"),
    ("julius_serious_1794325939551.jpg", "julius_serious.png", "green"),
    ("noel_normal_1794325921282.jpg", "noel_normal.png", "blue"),
    ("noel_serious_1794325944513.jpg", "noel_serious.png", "blue"),
]

def extract_green_key(img_rgba: np.ndarray) -> np.ndarray:
    rgb = img_rgba[:, :, :3].astype(np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # Sample pure background green from top corners
    bg_sample = np.median(np.concatenate([rgb[:20, :20].reshape(-1, 3), rgb[:20, -20:].reshape(-1, 3)]), axis=0)
    dist = np.linalg.norm(rgb - bg_sample, axis=2)
    # Green dominance metric: pure #00FF00 has huge G - max(R, B)
    green_excess = g - np.maximum(r, b)
    # Smooth alpha ramp based on green_excess and distance to bg_sample
    alpha_dist = np.clip((dist - 48.0) / 55.0, 0.0, 1.0)
    alpha_excess = np.clip(1.0 - (green_excess - 35.0) / 75.0, 0.0, 1.0)
    alpha = np.minimum(alpha_dist, alpha_excess)

    # Despill green fringe on semi-transparent & edge pixels
    spill = np.maximum(0.0, g - np.maximum(r, b))
    mask_edge = alpha < 0.99
    g_clean = np.where(mask_edge, g - spill * 0.92, g)
    # Also subtle global green fringe clamp on dark outlines adjacent to green
    dilated_bg = cv2.dilate((alpha < 0.5).astype(np.uint8), np.ones((5, 5), np.uint8), iterations=1) > 0
    g_clean = np.where(dilated_bg, np.minimum(g_clean, np.maximum(r, b) + 8.0), g_clean)

    # Light Gaussian feather on alpha after slight erosion to remove 1px JPEG halo
    alpha_u8 = (alpha * 255).astype(np.uint8)
    alpha_u8 = cv2.GaussianBlur(alpha_u8, (3, 3), 0.65)
    alpha_u8 = np.clip((alpha_u8.astype(np.float32) - 18.0) * (255.0 / 225.0), 0, 255).astype(np.uint8)

    out = np.zeros_like(img_rgba)
    out[:, :, 0] = np.clip(r, 0, 255).astype(np.uint8)
    out[:, :, 1] = np.clip(g_clean, 0, 255).astype(np.uint8)
    out[:, :, 2] = np.clip(b, 0, 255).astype(np.uint8)
    out[:, :, 3] = alpha_u8
    return out

def extract_blue_key(img_rgba: np.ndarray) -> np.ndarray:
    rgb = img_rgba[:, :, :3].astype(np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    borders = np.concatenate([
        rgb[:15, :].reshape(-1, 3),
        rgb[-15:, :].reshape(-1, 3),
        rgb[:, :15].reshape(-1, 3),
        rgb[:, -15:].reshape(-1, 3),
    ], axis=0)
    bg_sample = np.median(borders, axis=0)
    dist = np.linalg.norm(rgb - bg_sample, axis=2)
    # Candidate background mask: very close in color to the uniform royal-blue backdrop
    bg_candidate = (dist < 34.0).astype(np.uint8)
    # Flood-fill from borders + include enclosed gaps that are dead-on background color (dist < 22)
    h, w = bg_candidate.shape
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(bg_candidate, connectivity=8)
    border_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border_labels.discard(0)
    ext_bg = np.isin(labels, list(border_labels))
    enclosed_pure_bg = dist < 21.0
    is_bg = ext_bg | enclosed_pure_bg

    # Soften edges around background boundary
    alpha = (~is_bg).astype(np.float32)
    # Smooth ramp near boundary using dist
    boundary = cv2.dilate(is_bg.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=1) > 0
    ramp = np.clip((dist - 24.0) / 22.0, 0.0, 1.0)
    alpha = np.where(boundary & (~is_bg), np.minimum(alpha, ramp), alpha)

    # Despill blue halo on boundary
    b_clean = np.where(boundary, np.minimum(b, np.maximum(r, g) + 18.0), b)
    alpha_u8 = cv2.GaussianBlur((alpha * 255).astype(np.uint8), (3, 3), 0.6)
    alpha_u8 = np.clip((alpha_u8.astype(np.float32) - 16.0) * (255.0 / 228.0), 0, 255).astype(np.uint8)

    out = np.zeros_like(img_rgba)
    out[:, :, 0] = np.clip(r, 0, 255).astype(np.uint8)
    out[:, :, 1] = np.clip(g, 0, 255).astype(np.uint8)
    out[:, :, 2] = np.clip(b_clean, 0, 255).astype(np.uint8)
    out[:, :, 3] = alpha_u8
    return out

for src_name, dst_name, mode in SPRITES:
    src_path = os.path.join(BRAIN_DIR, src_name)
    im = Image.open(src_path).convert("RGBA")
    arr = np.array(im)
    if mode == "green":
        res = extract_green_key(arr)
    else:
        res = extract_blue_key(arr)
    out_im = Image.fromarray(res, mode="RGBA")
    # Resize height to crisp 1100px for fast GPU compositing while keeping razor-sharp retina detail
    w, h = out_im.size
    new_h = 1100
    new_w = int(w * (new_h / h))
    out_im = out_im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    out_im.save(os.path.join(OUT_DIR, dst_name), optimize=True)
    print(f"Extracted {dst_name} ({new_w}x{new_h})")

# fuse_emotion.py 

def map_image_emotion(label):
    """图像7类情绪映射为3类"""
    if label in ["happy", "surprised"]:
        return "positive"
    elif label in ["angry", "disgusted", "sad", "afraid"]:
        return "negative"
    else:
        return "neutral"

def fuse_emotions(text_label=None, text_conf=None, image_label=None, image_conf=None):
    """
    主融合函数，兼容 main.py 使用，返回 final_label（仅3类）
    """
    if image_label:
        image_label = map_image_emotion(image_label)

    if text_label and image_label:
        if abs(text_conf - image_conf) < 0.15:
            return text_label if text_label == image_label else "neutral"
        return text_label if text_conf > image_conf else image_label
    elif text_label:
        return text_label
    elif image_label:
        return image_label
    else:
        return "unknown"

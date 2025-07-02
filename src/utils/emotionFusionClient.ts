// utils/emotionFusionClient.ts

export async function fuseEmotionFromImageAndText(
  imageFile: File,
  text: string
): Promise<{
  final_emotion: string;
  text_emotion: string;
  image_emotion: string;
  final_confidence: number;
}> {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("text", text);

  try {
    const res = await fetch(
      "https://emotion-api-218860421161.us-central1.run.app/fuse-emotion",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) throw new Error("Emotion API 请求失败");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("❌ 情绪融合失败:", err);
    throw err;
  }
}

import { uploadBufferToR2 } from "../../lib/r2Upload";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "150mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, fileType, fileData } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ error: "Missing file data" });
    }

    const buffer = Buffer.from(fileData, "base64");
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const url = await uploadBufferToR2(buffer, {
      fileName: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
      contentType: fileType || "application/octet-stream",
    });
    return res.status(200).json({ url });
  } catch (err) {
    console.error("R2 upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
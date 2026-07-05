import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

function isR2Configured() {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

export async function uploadBufferToR2(buffer, { fileName, contentType, prefix = "" } = {}) {
  if (!isR2Configured()) {
    throw new Error("R2 not configured");
  }

  const ext = fileName?.includes(".") ? fileName.split(".").pop() : "bin";
  const name = fileName?.includes(".")
    ? fileName
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = prefix ? `${prefix}/${name}` : name;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

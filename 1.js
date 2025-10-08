require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Replicate = require("replicate");
const cloudinary = require("cloudinary").v2;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

// configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Hardcoded prompt
const prompt = "A cinematic video of a viking with two axes jumping off an icy mountain cliff into a lake";

async function generateAndUpload() {
  try {
    console.log("🎬 Generating video for prompt:", prompt);

    const output = await replicate.run("openai/sora-2-pro", {
      input: {
        prompt,
        resolution: "high",
        openai_api_key: process.env.OPENAI_API_KEY,
      },
    });

    // output is usually an array with file URL(s)
    const videoUrl = Array.isArray(output) ? output[0] : output;
    console.log("✅ Video generated at Replicate URL:", videoUrl);

    // Download video to local temp file
    const fileName = path.join(__dirname, "output.mp4");
    const res = await fetch(videoUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(fileName, buffer);
    console.log("💾 Video saved locally as output.mp4");

    // Upload to Cloudinary
    console.log("☁️ Uploading to Cloudinary...");
    const cloudRes = await cloudinary.uploader.upload(fileName, {
      resource_type: "video",
    });

    console.log("🚀 Uploaded to Cloudinary:", cloudRes.secure_url);
    return cloudRes.secure_url;
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

generateAndUpload();

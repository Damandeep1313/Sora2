require("dotenv").config();
const express = require("express");
const Replicate = require("replicate");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const app = express();
app.use(express.json());

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, resolution = "high", duration = 10 } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required in body" });

    const replicateKey = req.headers["x-replicate-key"];
    const openaiKey = req.headers["x-openai-key"];
    if (!replicateKey || !openaiKey)
      return res.status(400).json({ error: "x-replicate-key and x-openai-key headers are required" });

    console.log("🎬 Generating video for prompt:", prompt, "resolution:", resolution, "duration:", duration);

    const replicate = new Replicate({ auth: replicateKey });

    const output = await replicate.run("openai/sora-2-pro", {
      input: { prompt, resolution, duration, openai_api_key: openaiKey },
    });

    const videoUrl = Array.isArray(output) ? output[0] : output;
    console.log("✅ Video generated at Replicate URL:", videoUrl);

    console.log("☁️ Uploading video to Cloudinary...");
    const response = await fetch(videoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "video" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });

    const cloudRes = await streamUpload();
    console.log("🌐 Cloudinary URL:", cloudRes.secure_url);

    res.json({ cloudinary_url: cloudRes.secure_url });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "website-assets";

// Maximum image size: 10MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/avif",
];

async function ensureBucketExists(adminClient: ReturnType<typeof createAdminClient>) {
  try {
    const { data: buckets } = await adminClient.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === STORAGE_BUCKET || b.id === STORAGE_BUCKET);
    if (!exists) {
      await adminClient.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
    }
  } catch {
    // If bucket creation fails or exists already, proceed gracefully
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "No image file provided in request" } },
        { status: 400 }
      );
    }

    const blob = file as File;

    if (!ALLOWED_MIME_TYPES.includes(blob.type)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Unsupported file type: ${blob.type}. Please upload JPEG, PNG, WebP, SVG, AVIF, or GIF.`,
          },
        },
        { status: 400 }
      );
    }

    if (blob.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "File exceeds 10MB size limit.",
          },
        },
        { status: 400 }
      );
    }

    // Try resolving authenticated user
    let userId = "anon";
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch {
      // In demo or test mode, proceed with default userId
    }

    const admin = createAdminClient();
    await ensureBucketExists(admin);

    const fileExt = blob.name.split(".").pop() || "jpg";
    const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const fileName = `${userId}/${Date.now()}_${randomSuffix}.${cleanExt}`;

    const buffer = Buffer.from(await blob.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: blob.type,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload error, falling back to data URL:", uploadError.message);
      // Fallback: Return data URL so user upload continues working seamlessly
      const base64Data = buffer.toString("base64");
      const dataUrl = `data:${blob.type};base64,${base64Data}`;
      return NextResponse.json({
        data: {
          url: dataUrl,
          name: blob.name,
          size: blob.size,
          storage: "inline_fallback",
        },
      });
    }

    // Retrieve public URL from Supabase Storage
    const { data: publicUrlData } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

    return NextResponse.json({
      data: {
        url: publicUrlData.publicUrl,
        name: blob.name,
        size: blob.size,
        path: fileName,
        storage: "supabase",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

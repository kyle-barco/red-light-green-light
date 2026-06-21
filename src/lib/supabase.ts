import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadFile(
  file: File,
  bucket: string,
  folder: string = "uploads",
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("bucket")) {
      throw new Error(`Storage bucket "${bucket}" not found. Create it in your Supabase dashboard (Storage → Create bucket) and set it to public.`);
    }
    if (msg.includes("permission") || msg.includes("policy") || msg.includes("unauthorized") || msg.includes("row-level")) {
      throw new Error(`Permission denied. Enable anon upload in your Supabase bucket "${bucket}" policies. Go to Storage → Policies → Add INSERT policy for "anon" role.`);
    }
    throw new Error(error.message);
  }

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

export async function uploadFiles(
  files: File[],
  bucket: string,
  folder?: string,
): Promise<string[]> {
  const results = await Promise.allSettled(
    files.map((f) => uploadFile(f, bucket, folder)),
  );
  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length > 0) {
    const first = rejected[0] as PromiseRejectedResult;
    throw first.reason instanceof Error
      ? first.reason
      : new Error(String(first.reason));
  }
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<string>).value);
}

import { supabase } from "@/lib/supabase";

export async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Impossible de lire le fichier image"));
    };

    reader.onerror = () => reject(new Error("Impossible de lire le fichier image"));
    reader.readAsDataURL(file);
  });
}

export async function uploadPlantImage(file: File, userId: string) {
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("plant-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("plant-images").getPublicUrl(fileName);
  return data.publicUrl;
}

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// This trusted Node script may use a service-role key, but it must be supplied
// through a server-only environment variable, never a VITE_ browser variable.
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'product-images';
const IMAGES_DIR = path.resolve(__dirname, '../product-images');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadAndLinkImages() {
  const files = fs.readdirSync(IMAGES_DIR);
  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload image to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(file, fileBuffer, { upsert: true });

    if (uploadError) {
      console.error(`❌ Failed to upload ${file}:`, uploadError.message);
      continue;
    }

    // Construct public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file}`;
    console.log(`✅ Uploaded ${file}: ${publicUrl}`);

    // Try to update the product by matching filename (without extension) to product name or image_url
    const baseName = path.parse(file).name.toLowerCase();

    // Find product(s) whose name or image_url contains the baseName
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, image_url')
      .or(`name.ilike.%${baseName}%,image_url.ilike.%${baseName}%`);

    if (fetchError) {
      console.error(`❌ Failed to fetch product for ${file}:`, fetchError.message);
      continue;
    }

    if (products && products.length > 0) {
      for (const product of products) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Failed to update product ${product.name}:`, updateError.message);
        } else {
          console.log(`🔗 Linked image to product: ${product.name}`);
        }
      }
    } else {
      console.warn(`⚠️ No product found for image: ${file}`);
    }
  }
}

uploadAndLinkImages().then(() => {
  console.log('All done!');
});

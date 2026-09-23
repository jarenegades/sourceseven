/**
 * Supabase Edge Function for Downloading Images from External URLs
 * This bypasses CORS issues by fetching images server-side
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
import { createCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    'Access-Control-Max-Age': '86400',
  };
  if (!isAllowedOrigin(req)) return new Response('Forbidden origin', { status: 403 });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { imageUrl } = await req.json();

    // Validate input
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'imageUrl is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert Dropbox URLs to direct download format
    let downloadUrl = imageUrl;
    if (imageUrl.includes('dropbox.com')) {
      // Handle preview links (convert /preview/ to /s/) - This is a best-effort guess
      // Actually, preview links are usually private. We can't easily fix them without auth.
      // But if it's a public folder preview, maybe replacing /preview/ with /s/ works?
      // Often /preview/path/to/file works if we change it to direct download.
      // Let's try replacing '/preview/' with '/s/' if it exists, or just appending query params.
      
      // Dropbox strategy:
      // 1. If it's a share link (dropbox.com/s/...), adding ?dl=1 works.
      // 2. If it's a preview link (dropbox.com/preview/...), it likely requires auth.
      // However, some users might copy a link that *looks* like a preview but might work as a download if tweaked.
      // Let's rely on dl=1 and raw=1 which force download behavior on valid links.
      
      // Force dl=1 (download) instead of dl=0 (preview)
      if (downloadUrl.includes('dl=')) {
        downloadUrl = downloadUrl.replace(/dl=\d+/g, 'dl=1');
      } else {
        downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + 'dl=1';
      }
      
      // Add raw=1 for direct image serving
      // Note: for some dropbox links, raw=1 redirects to the actual image file
      if (!downloadUrl.includes('raw=1')) {
        downloadUrl += '&raw=1';
      }
    }

    console.log('Downloading image from:', downloadUrl);

    // Fetch the image server-side (no CORS restrictions)
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch image: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine content type and validate it is an image
    const contentType = response.headers.get('content-type') || imageBlob.type;
    
    if (!contentType || !contentType.startsWith('image/')) {
        console.error('URL returned non-image content type:', contentType);
        // Special error for Dropbox login pages
        if (imageUrl.includes('dropbox.com') && contentType?.includes('text/html')) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Dropbox URL returned HTML (login page) instead of an image. Use a public "Shared Link" (Copy Link) instead of a private Preview link.',
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }
        
        return new Response(
            JSON.stringify({
                success: false,
                error: `URL returned non-image content type: ${contentType}`,
            }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use Deno's built-in base64 encoder which handles large data efficiently
    const base64 = encodeBase64(uint8Array);

    // Determine content type
    const contentType = response.headers.get('content-type') || imageBlob.type || 'image/jpeg';

    // Return the image data as base64
    return new Response(
      JSON.stringify({
        success: true,
        data: base64,
        contentType: contentType,
        size: arrayBuffer.byteLength,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Download image Edge Function exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error during image download',
        details: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


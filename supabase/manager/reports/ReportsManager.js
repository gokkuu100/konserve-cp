import { supabase } from '../config/supabaseConfig';

class ReportsManager {
  async getAllReports(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching reports:', error);
        return { error };
      }

      return { data };
    } catch (error) {
      console.error('Exception in getAllReports:', error);
      return { error };
    }
  }

  async getReportById(reportId) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *
        `)
        .eq('id', reportId)
        .single();

      if (error) {
        console.error('Error fetching report:', error);
        return { error };
      }

      return { data };
    } catch (error) {
      console.error('Exception in getReportById:', error);
      return { error };
    }
  }

  async getReportsByCategory(category, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error(`Error fetching reports in category ${category}:`, error);
      return { data: null, error };
    }
  }

  async submitEnvironmentalCase(reportData) {
    try {
      console.log('Submitting environmental case with data:', reportData);
      
      // Create the record in the database with the schema-aligned fields
      const { data, error } = await supabase
        .from('environmental_reportcases')
        .insert([{
          incident_type: reportData.incident_type,
          description: reportData.description,
          location_lat: reportData.location_lat,
          location_lng: reportData.location_lng,
          address: reportData.address,
          severity: reportData.severity,
          user_id: reportData.user_id,
          status: reportData.status || 'pending',
          // Initialize empty arrays for images
          image_paths: [],
          image_urls: []
          // created_at is automatically set by Supabase
        }])
        .select()
        .single();

      if (error) {
        console.error('Error submitting environmental case:', error);
        return { error };
      }

      console.log('Successfully created environmental case record:', data);
      
      // If there are imagesData with base64 content, upload them
      if (reportData.imagesData && reportData.imagesData.length > 0) {
        try {
          console.log(`Processing ${reportData.imagesData.length} images for report ${data.id}`);
          const imagePaths = [];
          const imageUrls = [];
          
          // Upload each image using the buffer method
          for (let i = 0; i < reportData.imagesData.length; i++) {
            const imageAsset = reportData.imagesData[i];
            if (!imageAsset.base64) {
              console.warn(`Image ${i} has no base64 data, skipping`);
              continue;
            }
            
            // Process the image upload
            try {
              // Determine file type and extension
              const fileType = imageAsset.type || 'image/jpeg';
              const fileExt = fileType.split('/')[1] || 'jpg';
              
              // Create unique filename
              const fileName = `report-${data.id}-${Date.now()}-${i}.${fileExt}`;
              const filePath = `envreportimages/${fileName}`;
              
              console.log(`Uploading image ${i+1} to reportcaseimages/${filePath}`);
              
              // Convert base64 to buffer
              const base64Data = imageAsset.base64;
              const binaryString = this.atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j);
              }
              
              // Upload the buffer to Supabase storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('reportcaseimages')
                .upload(filePath, bytes.buffer, {
                  contentType: fileType,
                  cacheControl: '3600',
                  upsert: true
                });
              
              if (uploadError) {
                console.error(`Error uploading image ${i+1}:`, uploadError);
                continue; // Skip this image but continue with others
              }
              
              // Get public URL
              const { data: urlData } = supabase.storage
                .from('reportcaseimages')
                .getPublicUrl(filePath);
              
              imagePaths.push(filePath);
              imageUrls.push(urlData.publicUrl);
              
              console.log(`Image ${i+1} uploaded successfully:`, urlData.publicUrl);
            } catch (imageError) {
              console.error(`Error processing image ${i+1}:`, imageError);
              // Continue with other images
            }
          }
          
          // Only update the database if we have successfully uploaded images
          if (imagePaths.length > 0 && imageUrls.length > 0) {
            console.log('Updating environmental case with image data:', { imagePaths, imageUrls });
            
            // Update the report record with image paths and URLs
            const { error: updateError } = await supabase
              .from('environmental_reportcases')
              .update({ 
                image_paths: imagePaths,
                image_urls: imageUrls
              })
              .eq('id', data.id);
            
            if (updateError) {
              console.error('Error updating environmental case with images:', updateError);
            } else {
              console.log('Successfully updated environmental case with images');
              
              // Update the response data with image information
              data.image_paths = imagePaths;
              data.image_urls = imageUrls;
            }
          } else {
            console.log('No images were successfully uploaded');
          }
        } catch (imageError) {
          console.error('Exception processing images:', imageError);
        }
      }

      return { data };
    } catch (error) {
      console.error('Exception in submitEnvironmentalCase:', error);
      return { error };
    }
  }

  // Helper function to convert base64 to binary
  atob(input) {
    // For React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    
    while (i < input.length) {
      const enc1 = chars.indexOf(input.charAt(i++));
      const enc2 = chars.indexOf(input.charAt(i++));
      const enc3 = chars.indexOf(input.charAt(i++));
      const enc4 = chars.indexOf(input.charAt(i++));
      
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      
      output += String.fromCharCode(chr1);
      
      if (enc3 !== 64) {
        output += String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        output += String.fromCharCode(chr3);
      }
    }
    
    return output;
  }
}

export default new ReportsManager(); 
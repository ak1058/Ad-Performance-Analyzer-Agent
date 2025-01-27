const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const csv = require('csv-parser');
const { OpenAI } = require('langchain/llms/openai');
const { ConversationChain } = require('langchain/chains');

// initialised Supabase client
const supabaseUrl = 'https://pgubkzftcmrismlibrue.supabase.co'; // supabase project url
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndWJremZ0Y21yaXNtbGlicnVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzk2MjA3MiwiZXhwIjoyMDUzNTM4MDcyfQ.mtHo3BQB0xjBcirRapuVBQE16_SmcVufjVPcOEbNjx8'; //  Supabase key
const supabase = createClient(supabaseUrl, supabaseKey);

// initialised model open ai
const model = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY, // open ai key 
  temperature: 0.7,
});

const uploadFile = async (req, res) => {
  try {
    const file = req.files?.file; 

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (file.mimetype !== 'text/csv' && !file.name.endsWith('.csv')) {
      return res.status(400).json({ error: 'Only CSV files are allowed' });
    }

    const { name, data } = file;

    // Upload file to Supabase storage bucket
    const { data: uploadedData, error } = await supabase.storage
      .from('csv_uploads') // bucket name of supabase
      .upload(name, data, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    res.status(200).json({
      message: 'File uploaded successfully',
      fileUrl: `${supabaseUrl}/storage/v1/object/public/csv_uploads/${uploadedData.path}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

const analyzeFileFromUrl = async (req, res) => {
  try {
    const { fileUrl } = req.body; 

    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required' });
    }

    const response = await axios.get(fileUrl, { responseType: 'stream' });

    const adsData = [];
    response.data
      .pipe(csv())
      .on('data', (row) => adsData.push(row))
      .on('end', async () => {
        
        const analysisPrompt = `
        You are a data analyst specializing in digital marketing. Analyze the following ad performance data:

        ${JSON.stringify(adsData, null, 2)}

        Based on the data:
        - Identify keywords with high ROAS, low ACOS, high CTR, and strong conversion rates.
        - Summarize how the ads performed overall.
        - Provide 2-3 actionable suggestions to improve ad performance.

        Return a concise response in 5-7 sentences.
        `;

        const chain = new ConversationChain({ llm: model });
        const analysis = await chain.call({
          input: analysisPrompt,
        });

        
        res.status(200).json({
          message: 'Analysis complete',
          analysis: analysis.response,
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze the file', details: error.message });
  }
};



module.exports = { uploadFile, analyzeFileFromUrl };

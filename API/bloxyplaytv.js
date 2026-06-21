export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Get query params
  const { ch, date } = req.query;
  
  // Validate
  if (!ch || !date) {
    return res.status(400).json({ 
      error: 'Missing parameters. Use: ?ch=KCTV&date=2026-06-21' 
    });
  }
  
  // Build GitHub raw URL from your repo
  const githubUrl = `https://raw.githubusercontent.com/Bloxyplay/JucheTV-BloxyPlay/main/API/bloxyplaytv/${ch}/${date}.json`;
  
  try {
    const response = await fetch(githubUrl);
    
    if (!response.ok) {
      return res.status(404).json({ 
        error: 'EPG not found', 
        channel: ch, 
        date: date 
      });
    }
    
    const data = await response.json();
    
    // Return with proper JSON content-type
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch EPG', 
      details: error.message 
    });
  }
}


import axios from 'axios';
import { logger } from '../utils/logger.js';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour for 13-F filings

// Known manager name to CIK mappings (can be expanded)
const MANAGER_CIK_MAP: Record<string, string> = {
  'bill ackman': '1336528',
  'ackman': '1336528',
  'pershing square': '1336528',
  'pershing square capital': '1336528',
  'israel englander': '1058307',
  'englander': '1058307',
  'millennium management': '1058307',
  'millennium': '1058307',
  'ray dalio': '1350694',
  'dalio': '1350694',
  'bridgewater associates': '1350694',
  'bridgewater': '1350694',
  'david tepper': '1061768',
  'tepper': '1061768',
  'appaloosa management': '1061768',
  'appaloosa': '1061768',
  'ken griffin': '1167979',
  'griffin': '1167979',
  'citadel': '1167979',
  'citadel llc': '1167979',
  'steve cohen': '1067983',
  'cohen': '1067983',
  'point72': '1067983',
  'point72 asset management': '1067983',
  'sach point72': '1067983',
  'paul tudor jones': '1035675',
  'tudor jones': '1035675',
  'tudor investment': '1035675',
  'tudor': '1035675',
  'daniel loeb': '1084204',
  'loeb': '1084204',
  'third point': '1084204',
  'third point llc': '1084204',
  'david einhorn': '1059504',
  'einhorn': '1059504',
  'greenlight capital': '1059504',
  'greenlight': '1059504',
  'seth klarman': '1059863',
  'klarman': '1059863',
  'baupost group': '1059863',
  'baupost': '1059863',
  'bill miller': '1084265',
  'miller': '1084265',
  'miller value partners': '1084265',
  'warren buffett': '1067983',
  'buffett': '1067983',
  'berkshire hathaway': '1067983',
  'berkshire': '1067983',
};

/**
 * Search for a manager's CIK by name
 */
async function findManagerCIK(managerName: string): Promise<string | null> {
  const normalizedName = managerName.toLowerCase().trim();
  
  // Check our mapping first
  if (MANAGER_CIK_MAP[normalizedName]) {
    return MANAGER_CIK_MAP[normalizedName];
  }

  // Try partial matches
  for (const [key, cik] of Object.entries(MANAGER_CIK_MAP)) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return cik;
    }
  }

  // Try SEC company tickers API to search by name
    try {
      const response = await axios.get(
        'https://www.sec.gov/files/company_tickers.json',
        {
          headers: {
            'User-Agent': 'GM Terminal (contact@example.com)',
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      // Search through company names for partial match
      const normalizedSearch = managerName.toLowerCase();
      if (response.data) {
        for (const company of Object.values(response.data) as any[]) {
          const companyName = (company.title || '').toLowerCase();
          if (companyName.includes(normalizedSearch) || normalizedSearch.includes(companyName.split(' ')[0])) {
            return company.cik_str.toString().padStart(10, '0');
          }
        }
      }
      return null;
    } catch (error) {
      logger.error(`Error searching for manager CIK: ${managerName}`, error);
      return null;
    }
}

/**
 * Get manager name from CIK
 */
async function getManagerName(cik: string): Promise<string> {
  try {
    const response = await axios.get(
      `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`,
      {
        headers: {
          'User-Agent': 'GM Terminal (contact@example.com)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.name) {
      return response.data.name;
    }
  } catch (error) {
    logger.error(`Error fetching manager name for CIK ${cik}:`, error);
  }
  return 'Unknown Manager';
}

/**
 * Get 13-F filings for a manager
 */
export async function getForm13F(managerName: string, limit: number = 10): Promise<any> {
  const cacheKey = `13f:${managerName}:${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Find the CIK for the manager
    const cik = await findManagerCIK(managerName);
    
    if (!cik) {
      throw new Error(`Manager not found: ${managerName}`);
    }

    // Get manager name
    const managerDisplayName = await getManagerName(cik);

    // Get all filings for this CIK
    const response = await axios.get(
      `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`,
      {
        headers: {
          'User-Agent': 'GM Terminal (contact@example.com)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.filings?.recent) {
      const filings = response.data.filings.recent;
      const forms = filings.form || [];
      const dates = filings.filingDate || [];
      const descriptions = filings.description || [];
      const accessionNumbers = filings.accessionNumber || [];

      // Filter for 13-F filings
      const form13FFilings = [];
      for (let i = 0; i < forms.length && form13FFilings.length < limit; i++) {
        if (forms[i] === '13F-HR' || forms[i] === '13F-HR/A') {
          form13FFilings.push({
            id: `13f-${i}`,
            form: forms[i],
            date: dates[i],
            description: descriptions[i] || forms[i],
            accessionNumber: accessionNumbers[i],
            url: `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumbers[i]}&xbrl_type=v`,
            cik,
            managerName: managerDisplayName,
          });
        }
      }

      // Get holdings from the most recent 13-F filing
      let holdings: any[] = [];
      if (form13FFilings.length > 0) {
        const latestFiling = form13FFilings[0];
        try {
          holdings = await get13FHoldings(cik, latestFiling.accessionNumber);
        } catch (error) {
          logger.error('Error fetching holdings:', error);
        }
      }

      const result = {
        managerName: managerDisplayName,
        cik,
        filings: form13FFilings,
        latestHoldings: holdings,
        latestFilingDate: form13FFilings[0]?.date || null,
      };

      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    throw new Error('No filings found');
  } catch (error: any) {
    logger.error(`Error fetching 13-F for ${managerName}:`, {
      message: error.message,
      status: error.response?.status,
    });
    
    // Don't return mock data - throw error instead
    throw new Error(`Failed to fetch 13-F filings for ${managerName}: ${error.message}`);
  }
}

/**
 * Get holdings from a specific 13-F filing
 */
async function get13FHoldings(cik: string, accessionNumber: string): Promise<any[]> {
  try {
    logger.debug(`Fetching 13-F holdings for CIK ${cik}, accession ${accessionNumber}`);
    
    // SEC EDGAR stores 13-F data in XML format
    // The accession number format is: 0000000000-00-000000
    // We need to convert it to the file path format
    const parts = accessionNumber.split('-');
    if (parts.length !== 3) {
      logger.warn(`Invalid accession number format: ${accessionNumber}`);
      return [];
    }

    const cikPart = cik.replace(/^0+/, ''); // Remove leading zeros for URL
    const accessionNoDashes = accessionNumber.replace(/-/g, '');

    // First, get the index.json to find the XML file
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikPart}/${accessionNoDashes}/index.json`;
    
    let xmlFileName = '';
    try {
      const indexResponse = await axios.get(indexUrl, {
        headers: {
          'User-Agent': 'GM Terminal (contact@example.com)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      // Find the XML file in the directory listing
      const directory = indexResponse.data?.directory;
      if (directory?.item) {
        const items = Array.isArray(directory.item) ? directory.item : [directory.item];
        // Prefer infotable.xml as it contains structured holdings data
        const infotableFile = items.find((item: any) => 
          item.name && item.name.toLowerCase() === 'infotable.xml'
        );
        if (infotableFile) {
          xmlFileName = infotableFile.name;
        } else {
          // Fallback to other XML files
          const xmlFile = items.find((item: any) => 
            item.name && (item.name.endsWith('.xml') || item.name.includes('primary') || item.name.includes('13f'))
          );
          if (xmlFile) {
            xmlFileName = xmlFile.name;
          }
        }
      }
    } catch (indexError: any) {
      logger.warn(`Could not fetch index.json, trying default XML filename:`, indexError.message);
    }

    // If we didn't find a filename from index, try common patterns
    if (!xmlFileName) {
      // Try common XML file names (infotable.xml is preferred for 13-F)
      const possibleNames = [
        `infotable.xml`,
        `primary_doc.xml`,
        `${accessionNumber}-primary-document.xml`,
        `${accessionNumber}.xml`,
        `info.xml`,
      ];
      
      for (const name of possibleNames) {
        try {
          const testUrl = `https://www.sec.gov/Archives/edgar/data/${cikPart}/${accessionNoDashes}/${name}`;
          const testResponse = await axios.head(testUrl, {
            headers: {
              'User-Agent': 'GM Terminal (contact@example.com)',
            },
            timeout: 5000,
          });
          if (testResponse.status === 200) {
            xmlFileName = name;
            break;
          }
        } catch {
          // Continue to next filename
        }
      }
    }

    if (!xmlFileName) {
      logger.warn(`Could not find XML file for accession ${accessionNumber}`);
      return [];
    }

    // Fetch the XML file
    const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cikPart}/${accessionNoDashes}/${xmlFileName}`;
    logger.debug(`Fetching XML from: ${xmlUrl}`);
    
    const response = await axios.get(xmlUrl, {
      headers: {
        'User-Agent': 'GM Terminal (contact@example.com)',
        'Accept': 'application/xml, text/xml, */*',
      },
      timeout: 20000,
    });

    // Parse XML to extract holdings
    const xmlText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const holdings: any[] = [];

    // Extract holdings using regex - 13-F XML structure
    // Look for <infoTable> which contains holdings
    const infoTableMatches = xmlText.match(/<infoTable[^>]*>[\s\S]*?<\/infoTable>/gi);
    
    if (infoTableMatches) {
      logger.debug(`Found ${infoTableMatches.length} holdings in XML`);
      
      for (const match of infoTableMatches.slice(0, 100)) { // Limit to 100 holdings
        // Extract fields from infoTable
        const nameMatch = match.match(/<nameOfIssuer>([^<]+)<\/nameOfIssuer>/i) || 
                         match.match(/<nameOfIssuer[^>]*>([^<]+)<\/nameOfIssuer>/i);
        const cusipMatch = match.match(/<cusip>([^<]+)<\/cusip>/i) || 
                          match.match(/<cusip[^>]*>([^<]+)<\/cusip>/i);
        const valueMatch = match.match(/<value>([^<]+)<\/value>/i) || 
                          match.match(/<value[^>]*>([^<]+)<\/value>/i);
        
        // Shares can be in different formats - note: SEC uses sshPrnamt (lowercase 'a')
        const sharesMatch = match.match(/<sshPrnamt>([^<]+)<\/sshPrnamt>/i) || 
                           match.match(/<sshPrnamt[^>]*>([^<]+)<\/sshPrnamt>/i) ||
                           match.match(/<sshPrnAmt>([^<]+)<\/sshPrnAmt>/i) ||
                           match.match(/<sshPrnAmt[^>]*>([^<]+)<\/sshPrnAmt>/i) ||
                           match.match(/<shrsOrPrnAmt[^>]*>[\s\S]*?<sshPrnamt>([^<]+)<\/sshPrnamt>/i) ||
                           match.match(/<shrsOrPrnAmt[^>]*>[\s\S]*?<sshPrnAmt>([^<]+)<\/sshPrnAmt>/i);
        
        const titleMatch = match.match(/<titleOfClass>([^<]+)<\/titleOfClass>/i) || 
                          match.match(/<titleOfClass[^>]*>([^<]+)<\/titleOfClass>/i);

        if (nameMatch || cusipMatch) {
          const value = valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '').replace(/\$/g, '')) : 0;
          const shares = sharesMatch ? parseFloat(sharesMatch[1].replace(/,/g, '')) : 0;
          
          holdings.push({
            issuer: nameMatch ? nameMatch[1].trim() : 'Unknown',
            cusip: cusipMatch ? cusipMatch[1].trim() : '',
            value: value,
            shares: shares,
            title: titleMatch ? titleMatch[1].trim() : 'Common Stock',
          });
        }
      }
    } else {
      // Fallback: try to find <holding> tags (older format)
      const holdingMatches = xmlText.match(/<holding[^>]*>[\s\S]*?<\/holding>/gi);
      if (holdingMatches) {
        logger.debug(`Found ${holdingMatches.length} holdings using fallback pattern`);
        for (const match of holdingMatches.slice(0, 100)) {
          const nameMatch = match.match(/<nameOfIssuer>([^<]+)<\/nameOfIssuer>/i);
          const cusipMatch = match.match(/<cusip>([^<]+)<\/cusip>/i);
          const valueMatch = match.match(/<value>([^<]+)<\/value>/i);
          const sharesMatch = match.match(/<shrsOrPrnAmt[^>]*>[\s\S]*?<sshPrnAmt>([^<]+)<\/sshPrnAmt>/i);
          const titleMatch = match.match(/<titleOfClass>([^<]+)<\/titleOfClass>/i);

          if (nameMatch || cusipMatch) {
            holdings.push({
              issuer: nameMatch ? nameMatch[1].trim() : 'Unknown',
              cusip: cusipMatch ? cusipMatch[1].trim() : '',
              value: valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '').replace(/\$/g, '')) : 0,
              shares: sharesMatch ? parseFloat(sharesMatch[1].replace(/,/g, '')) : 0,
              title: titleMatch ? titleMatch[1].trim() : 'Common Stock',
            });
          }
        }
      }
    }

    // Sort by value descending
    holdings.sort((a, b) => b.value - a.value);

    logger.debug(`Successfully parsed ${holdings.length} holdings from 13-F filing`);
    return holdings;
  } catch (error: any) {
    logger.error(`Error fetching 13-F holdings for ${cik}:`, {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
    });
    // Return empty array if holdings can't be fetched (filings are still available)
    return [];
  }
}

/**
 * Get all tracked managers
 */
export function getAllManagers(): Array<{ name: string; cik: string; displayName: string }> {
  // Get unique CIKs and their primary display names
  const managerMap = new Map<string, { name: string; displayName: string }>();
  
  // Primary names for each CIK (the most recognizable name)
  const primaryNames: Record<string, string> = {
    '1336528': 'Bill Ackman',
    '1058307': 'Israel Englander',
    '1350694': 'Ray Dalio',
    '1061768': 'David Tepper',
    '1167979': 'Ken Griffin',
    '1067983': 'Steve Cohen',
    '1035675': 'Paul Tudor Jones',
    '1084204': 'Daniel Loeb',
    '1059504': 'David Einhorn',
    '1059863': 'Seth Klarman',
    '1084265': 'Bill Miller',
  };
  
  // Firm names for each CIK
  const firmNames: Record<string, string> = {
    '1336528': 'Pershing Square Capital Management',
    '1058307': 'Millennium Management',
    '1350694': 'Bridgewater Associates',
    '1061768': 'Appaloosa Management',
    '1167979': 'Citadel',
    '1067983': 'Point72 Asset Management',
    '1035675': 'Tudor Investment Corporation',
    '1084204': 'Third Point LLC',
    '1059504': 'Greenlight Capital',
    '1059863': 'Baupost Group',
    '1084265': 'Miller Value Partners',
  };

  for (const [key, cik] of Object.entries(MANAGER_CIK_MAP)) {
    if (!managerMap.has(cik)) {
      const primaryName = primaryNames[cik] || key;
      const firmName = firmNames[cik] || '';
      managerMap.set(cik, {
        name: key,
        displayName: firmName ? `${primaryName} (${firmName})` : primaryName,
      });
    }
  }

  return Array.from(managerMap.entries()).map(([cik, info]) => ({
    name: info.name,
    cik,
    displayName: info.displayName,
  })).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Search for managers by name
 */
export async function searchManagers(query: string): Promise<any[]> {
  const normalizedQuery = query.toLowerCase().trim();
  const results: any[] = [];

  // Search in our mapping
  for (const [name, cik] of Object.entries(MANAGER_CIK_MAP)) {
    if (name.includes(normalizedQuery) || normalizedQuery.includes(name)) {
      try {
        const managerName = await getManagerName(cik);
        results.push({
          name: managerName,
          cik,
          searchTerms: name,
        });
      } catch (error) {
        // Skip if we can't get the name
      }
    }
  }

  return results;
}


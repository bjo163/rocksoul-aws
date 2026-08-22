import fs from 'fs';

async function fetchCountries() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/mledoze/countries/master/countries.json');
    console.log(res.status, res.statusText);
    const data = await res.json();
    
    // Sort and format according to Moonwitness schema
    const countries = data
      .map(c => ({
        id: c.cca2,
        name: c.name.common,
        kind: 'COUNTRY',
        region: c.region
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
      
    // Always include Palestine as territory as defined previously
    const palestineIndex = countries.findIndex(c => c.id === 'PS');
    if (palestineIndex > -1) {
       countries[palestineIndex].kind = 'TERRITORY_OR_POLITICAL_ENTITY';
       countries[palestineIndex].sourceScoped = true;
       countries[palestineIndex].region = 'Middle East';
    } else {
       countries.push({
         id: 'PS',
         name: 'Palestine',
         kind: 'TERRITORY_OR_POLITICAL_ENTITY',
         region: 'Middle East',
         sourceScoped: true
       });
    }

    fs.writeFileSync('data/countries.json', JSON.stringify(countries, null, 2));
    console.log(`Saved ${countries.length} countries to data/countries.json.`);
  } catch (error) {
    console.error('Failed to fetch countries:', error);
  }
}

fetchCountries();

const fs = require('fs').promises;
const axios = require('axios');

const serviceTypes = [
    { name: "Home Health Aides", category: "Personal Care Services" },
    { name: "Respite Care", category: "Personal Care Services" },
    { name: "Companionship Services", category: "Personal Care Services" },
    { name: "Incontinence Supplies", category: "Personal Care Services" },
    { name: "Sleep Support Services", category: "Personal Care Services" },
    { name: "Skilled Nursing Care", category: "Medical and Nursing Care" },
    { name: "Hospice Care", category: "Medical and Nursing Care" },
    { name: "Palliative Care", category: "Medical and Nursing Care" },
    { name: "Wound Care Specialists", category: "Medical and Nursing Care" },
    { name: "Medication Management Programs", category: "Medical and Nursing Care" },
    { name: "Physical Therapy", category: "Therapy and Rehabilitation" },
    { name: "Occupational Therapy", category: "Therapy and Rehabilitation" },
    { name: "Speech Therapy", category: "Therapy and Rehabilitation" },
    { name: "Massage Therapy", category: "Therapy and Rehabilitation" },
    { name: "Exercise Programs", category: "Therapy and Rehabilitation" },
    { name: "Support Groups", category: "Mental and Emotional Support" },
    { name: "Counseling Services", category: "Mental and Emotional Support" },
    { name: "Grief Support Services", category: "Mental and Emotional Support" },
    { name: "Dementia Coaching", category: "Mental and Emotional Support" },
    { name: "Faith-Based Support", category: "Mental and Emotional Support" },
    { name: "Adaptive Equipment Providers", category: "Equipment and Home Modifications" },
    { name: "Medical Equipment Suppliers", category: "Equipment and Home Modifications" },
    { name: "Home Safety Assessments", category: "Equipment and Home Modifications" },
    { name: "Emergency Response Systems", category: "Equipment and Home Modifications" },
    { name: "Home-Delivered Meals", category: "Nutrition and Daily Needs" },
    { name: "Nutrition Counseling", category: "Nutrition and Daily Needs" },
    { name: "Grocery Delivery", category: "Nutrition and Daily Needs" },
    { name: "Housekeeping Services", category: "Nutrition and Daily Needs" },
    { name: "Pet Care Assistance", category: "Nutrition and Daily Needs" },
    { name: "Transportation Services", category: "Transportation and Mobility" },
    { name: "Adult Day Care", category: "Transportation and Mobility" },
    { name: "Legal Aid Services", category: "Financial and Legal Assistance" },
    { name: "Financial Counseling", category: "Financial and Legal Assistance" },
    { name: "Financial Aid Programs", category: "Financial and Legal Assistance" },
    { name: "Energy Assistance Programs", category: "Financial and Legal Assistance" },
    { name: "Advance Care Planning", category: "Financial and Legal Assistance" },
    { name: "Caregiver Training Programs", category: "Caregiver Education and Support" },
    { name: "Caregiver Wellness Programs", category: "Caregiver Education and Support" },
    { name: "Peer Mentoring", category: "Caregiver Education and Support" },
    { name: "Community Resource Centers", category: "Caregiver Education and Support" },
    { name: "Advocacy Services", category: "Caregiver Education and Support" },
    { name: "Hearing and Vision Services", category: "Specialized Health Services" },
    { name: "Dental Care at Home", category: "Specialized Health Services" },
    { name: "Mental Stimulation Programs", category: "Specialized Health Services" },
    { name: "Social Work Services", category: "Care Coordination and Technology" },
    { name: "Care Coordination Apps", category: "Care Coordination and Technology" },
    { name: "Telehealth Services", category: "Care Coordination and Technology" },
    { name: "Pharmacy Delivery", category: "Care Coordination and Technology" },
    { name: "Veteran Care Programs", category: "Care Coordination and Technology" }
];
const states = ['CA', 'NY', 'IL', 'TX', 'FL', 'PA', 'OH', 'MI', 'GA', 'NC'];
const zipCodes = ['90210', '10001', '60601', '77001', '33101', '19101', '44101', '48201', '30301', '28201'];
const zipToState = {
    '90210': 'CA',
    '90212': 'CA',
    '10001': 'NY',
    '60601': 'IL',
    '33101': 'FL',
    '77001': 'TX',
    '19101': 'PA',
    '44101': 'OH',
    '48201': 'MI',
    '30301': 'GA',
    '28201': 'NC'
};

async function updateServices() {
    const serpWowApiKey = process.env.SERPWOW_API_KEY;
    let services = [];
    try {
        services = JSON.parse(await fs.readFile('services.json'));
        console.log(`Loaded ${services.length} existing services`);
    } catch (err) {
        console.log('Starting with empty services.json');
    }
    const seenUrls = new Set(services.map(s => s.url));

    for (const type of serviceTypes) {
        // National search
        try {
            const query = encodeURIComponent(`${type.name} caregiving`);
            const response = await axios.get(`https://api.serpwow.com/search?api_key=${serpWowApiKey}&q=${query}`);
            const results = response.data.organic_results || [];
            console.log(`Fetched ${results.length} national results for ${type.name}`);
            for (const result of results.slice(0, 2)) {
                if (seenUrls.has(result.link)) continue;
                services.push({
                    name: result.title ? result.title.slice(0, 100) : type.name,
                    type: type.name,
                    category: type.category,
                    url: result.link,
                    level: 'national',
                    state: '',
                    zipCode: ''
                });
                seenUrls.add(result.link);
            }
        } catch (err) {
            console.warn(`National error for ${type.name}: ${err.message}`);
        }

        // Regional search
        for (const state of states) {
            try {
                const query = encodeURIComponent(`${type.name} near ${state}`);
                const response = await axios.get(`https://api.serpwow.com/search?api_key=${serpWowApiKey}&q=${query}`);
                const results = response.data.organic_results || [];
                console.log(`Fetched ${results.length} regional results for ${type.name} in ${state}`);
                for (const result of results.slice(0, 2)) {
                    if (seenUrls.has(result.link)) continue;
                    services.push({
                        name: result.title ? result.title.slice(0, 100) : type.name,
                        type: type.name,
                        category: type.category,
                        url: result.link,
                        level: 'regional',
                        state: state,
                        zipCode: ''
                    });
                    seenUrls.add(result.link);
                }
            } catch (err) {
                console.warn(`Regional error for ${type.name} in ${state}: ${err.message}`);
            }
        }

        // Local search
        for (const zip of zipCodes) {
            try {
                const query = encodeURIComponent(`${type.name} near ${zip}`);
                const response = await axios.get(`https://api.serpwow.com/search?api_key=${serpWowApiKey}&q=${query}`);
                const results = response.data.organic_results || [];
                console.log(`Fetched ${results.length} local results for ${type.name} in ${zip}`);
                for (const result of results.slice(0, 2)) {
                    if (seenUrls.has(result.link)) continue;
                    const zipMatch = (result.snippet || result.displayed_link || '').match(/\b\d{5}\b/) || [''];
                    services.push({
                        name: result.title ? result.title.slice(0, 100) : type.name,
                        type: type.name,
                        category: type.category,
                        url: result.link,
                        level: 'local',
                        state: zipToState[zip] || 'CA',
                        zipCode: zipMatch[0] || zip
                    });
                    seenUrls.add(result.link);
                }
            } catch (err) {
                console.warn(`Local error for ${type.name} in ${zip}: ${err.message}`);
            }
        }
    }

    console.log(`Saving ${services.length} services`);
    await fs.writeFile('services.json', JSON.stringify(services, null, 2));
}

updateServices().catch(err => {
    console.error('Update failed:', err);
    process.exit(1);
});
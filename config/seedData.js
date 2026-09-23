// Indian states and their major cities for seeding master tables
const STATES_CITIES = [
  { state: "Andhra Pradesh", cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Rajahmundry", "Kakinada", "Kadapa"] },
  { state: "Arunachal Pradesh", cities: ["Itanagar", "Tawang", "Pasighat", "Ziro", "Bomdila"] },
  { state: "Assam", cities: ["Guwahati", "Dispur", "Silchar", "Dibrugarh", "Jorhat", "Tezpur", "Nagaon"] },
  { state: "Bihar", cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Katihar"] },
  { state: "Chhattisgarh", cities: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Jagdalpur"] },
  { state: "Goa", cities: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"] },
  { state: "Gujarat", cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh"] },
  { state: "Haryana", cities: ["Faridabad", "Gurugram", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak"] },
  { state: "Himachal Pradesh", cities: ["Shimla", "Manali", "Dharamshala", "Solan", "Mandi", "Kullu"] },
  { state: "Jharkhand", cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Hazaribagh", "Deoghar"] },
  { state: "Karnataka", cities: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davanagere", "Ballari", "Shivamogga"] },
  { state: "Kerala", cities: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha"] },
  { state: "Madhya Pradesh", cities: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Rewa", "Satna"] },
  { state: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Thane", "Amravati", "Kolhapur"] },
  { state: "Manipur", cities: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"] },
  { state: "Meghalaya", cities: ["Shillong", "Tura", "Jowai", "Nongstoin"] },
  { state: "Mizoram", cities: ["Aizawl", "Lunglei", "Champhai", "Serchhip"] },
  { state: "Nagaland", cities: ["Kohima", "Dimapur", "Mokokchung", "Tuensang"] },
  { state: "Odisha", cities: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"] },
  { state: "Punjab", cities: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur"] },
  { state: "Rajasthan", cities: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Alwar", "Bharatpur"] },
  { state: "Sikkim", cities: ["Gangtok", "Namchi", "Gyalshing", "Mangan"] },
  { state: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode"] },
  { state: "Telangana", cities: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam"] },
  { state: "Tripura", cities: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar"] },
  { state: "Uttar Pradesh", cities: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Ghaziabad", "Noida", "Meerut", "Gorakhpur", "Aligarh"] },
  { state: "Uttarakhand", cities: ["Dehradun", "Haridwar", "Nainital", "Rishikesh", "Roorkee", "Haldwani"] },
  { state: "West Bengal", cities: ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol", "Bardhaman", "Malda"] },
  { state: "Delhi", cities: ["New Delhi", "Dwarka", "Rohini"] },
  { state: "Jammu and Kashmir", cities: ["Srinagar", "Jammu", "Anantnag", "Baramulla"] },
  { state: "Ladakh", cities: ["Leh", "Kargil"] },
  { state: "Chandigarh", cities: ["Chandigarh"] },
  { state: "Puducherry", cities: ["Puducherry", "Karaikal"] },
  { state: "Andaman and Nicobar Islands", cities: ["Port Blair"] },
  { state: "Dadra and Nagar Haveli and Daman and Diu", cities: ["Daman", "Diu", "Silvassa"] },
  { state: "Lakshadweep", cities: ["Kavaratti"] },
];

const INDUSTRIES = [
  'Pharma', 'IT', 'Steel', 'Healthcare', 'Finance & Accounts', 'Automotive',
  'Real Estate', 'FMCG', 'Manufacturing', 'Textiles', 'Energy & Power',
  'Retail', 'Logistics & Supply Chain', 'Construction', 'Telecommunications',
  'Media & Entertainment', 'Education', 'Agriculture', 'Hospitality', 'Aerospace',
];

// Department → roles mapping (only IT, Sales, Management)
const DEPARTMENT_ROLES = {
  IT: [
    'System Administrator', 'Network Engineer', 'Network Administrator', 'IT Support Specialist',
    'IT Project Manager', 'IT Manager', 'Cybersecurity Analyst', 'Information Security Manager',
    'Database Administrator', 'Cloud Engineer', 'Cloud Architect', 'Technical Support Specialist',
    'Help Desk Analyst', 'IT Consultant',
  ],
  Sales: [
    'Sales Executive', 'Sales Manager', 'Business Development Manager', 'Account Manager',
    'Sales Representative', 'Regional Sales Manager', 'Inside Sales Representative', 'Sales Analyst',
    'Sales Coordinator', 'Key Account Manager', 'Territory Sales Manager', 'Sales Engineer',
  ],
  Management: [
    'CEO', 'COO', 'CTO', 'CFO', 'General Manager', 'Director', 'Vice President', 'Senior Manager',
    'Team Lead', 'Assistant Vice President', 'Regional Head', 'Business Unit Head', 'Managing Director',
    'President', 'admin', 'manager', 'supervisor', 'executive',
  ],
  Accounts: [
    'Accountant', 'Senior Accountant', 'Accounts Executive', 'Accounts Manager', 'Accounts Payable Specialist',
    'Accounts Receivable Specialist', 'Finance Manager', 'Finance Executive', 'Financial Analyst',
    'Auditor', 'Internal Auditor', 'Tax Consultant', 'Payroll Executive', 'Bookkeeper', 'Cost Accountant',
  ],
};

module.exports = { STATES_CITIES, INDUSTRIES, DEPARTMENT_ROLES };


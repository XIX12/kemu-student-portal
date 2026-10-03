import http from 'node:http';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const dataDir = path.join(root, 'data');
const dbFile = path.join(dataDir, 'kemu-db.json');
const sourceDir = await fs.access(distDir).then(() => distDir).catch(() => publicDir);
const port = Number(process.env.PORT || 3000);
const adminEmail = String(process.env.KEMU_ADMIN_EMAIL || 'admin@kemu.ac.ke').trim().toLowerCase();
const ADMIN_USERNAME = String(process.env.KEMU_ADMIN_USERNAME || 'admin').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.KEMU_ADMIN_PASSWORD || '123456');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

let db = null;
let databaseReady = false;

function json(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}

function text(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure === true) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  return parts.join('; ');
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createId() {
  return crypto.randomUUID();
}

function safe(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeEmail(value) {
  return safe(value).toLowerCase();
}

const CURRICULUM = {
  "Bachelor of Science in Computer Information Systems": {
    "1": [
      ["THEO 111", "Christian Beliefs", 3],
      ["SOST 131", "Introduction to Sociology", 3],
      ["CISY 101", "Introduction to Computer Systems", 3],
      ["CISY 110", "Introduction to Programming", 3],
      ["MATH 102", "Foundation of Mathematics", 3],
      ["MATH 110", "Linear Algebra I", 3],
      ["COMM 111", "Communication Skills", 3],
      ["CISY 104", "Analog Electronics", 3],
      ["CISY 111", "Structured Programming", 3],
      ["CISY 131", "Introduction to Computer Networks", 3],
      ["MATH 103", "Calculus I", 3],
      ["MATH 132", "Probability and Statistics I", 3]
    ],
    "2": [
      ["HSCI 225", "HIV/AIDS", 3],
      ["CISY 210", "Object Oriented Programming", 3],
      ["CISY 221", "Database Systems", 3],
      ["CISY 222", "System Analysis and Design", 3],
      ["CISY 231", "Telecommunication Networks I", 3],
      ["MATH 104", "Calculus II", 3],
      ["ENVI 201", "Environmental Science", 3],
      ["CISY 201", "Computer Organization and Architecture", 3],
      ["CISY 212", "Data Structures and Algorithms", 3],
      ["MATH 211", "Discrete Structures", 3],
      ["MATH 230", "Probability and Statistics II", 3],
      ["PHYS 310", "Electrical Circuits", 3]
    ],
    "3": [
      ["BUSS 221", "Entrepreneurship", 3],
      ["CISY 303", "Computer Hardware and Maintenance", 3],
      ["CISY 204", "Digital Electronics", 3],
      ["CISY 300", "Computer Operating Systems I", 3],
      ["CISY 302", "Research Methodology", 3],
      ["CISY 310", "Advanced Programming", 3],
      ["BBIT 314", "Human Computer Interaction", 3],
      ["CISY 311", "Internet Applications and Programming", 3],
      ["CISY 321", "Software Engineering Principles", 3],
      ["MATH 330", "Operations Research for Computer Scientists", 3],
      ["CISY 331", "Network Administration I", 3],
      ["CISY 421", "Management Information Systems", 3],
      ["CISY 422", "Introduction to Artificial Intelligence", 3],
      ["CISY 431", "Information Systems Security", 3],
      ["CISY 404", "ICT Project Management", 3],
      ["CISY 403", "Simulation and Modeling", 3],
      ["CISY 432", "Distributed Systems", 3],
      ["BUSS 420", "Strategic Management", 3]
    ]
  },
  "Diploma in Computer Information Systems": {
    "1": [
      ["DCIS 101", "Introduction to Computer Systems", 3],
      ["MATH 102", "Foundation of Mathematics", 3],
      ["DCIS 120", "Introduction to Internet and Web Design", 3],
      ["BUSS 025", "Business Communication", 3],
      ["DCIS 102", "Basic Electronics", 3],
      ["DCIS 107", "Office Applications", 3],
      ["DCIS 103", "Computer Hardware and Maintenance", 3],
      ["DCIS 104", "System Analysis and Design", 3],
      ["DCIS 105", "Computer Organization and Architecture", 3],
      ["DCIS 106", "Database Design and Implementation", 3],
      ["DCIS 110", "Introduction to Programming", 3],
      ["DCIS 121", "Computer Networks", 3]
    ],
    "2": [
      ["DCIS 201", "Computer Operating Systems", 3],
      ["DCIS 211", "Event Driven Programming", 3],
      ["DCIS 202", "Statistical Data Analysis", 3],
      ["DCIS 220", "Network Design and Configuration", 3],
      ["DCIS 221", "Advanced Web Design", 3],
      ["DCIS 203", "I.T. Project Management", 3],
      ["DCIS 222", "Network Administration and Management", 3],
      ["DCIS 204", "Information System Management", 3],
      ["ENTR 032", "Entrepreneurship", 3],
      ["DCIS 205", "I.T User Support", 3],
      ["DCIS 206", "IS Project", 3],
      ["DCIS 207", "Emerging technologies in ICT", 3]
    ],
    "3": [
      ["DCIS 300", "Industrial Attachment", 3]
    ]
  },
  "Bachelor of Science in Health Systems Management": {
    "1": [
      ["THEO 111", "Christian Beliefs", 3],
      ["SOST 201", "Science, Society, & Ethics", 3],
      ["COMP 100", "Computer Science", 3],
      ["HSMU 114", "Scientific Techniques for Health Systems Managers", 3],
      ["HSMU 116", "Foundations of Health Systems Management", 3],
      ["HSMU 125", "Management for Health System Managers", 3],
      ["HSMU 127", "Managerial Psychology", 3],
      ["HSMU 128", "Leadership for Health Systems", 3],
      ["HSMU 129", "Management Communication in Health Systems", 3],
      ["MATH 130", "Basic Statistics", 3],
      ["HSMU 136", "Health Policy Development & Planning", 3],
      ["HSMU 137", "Epidemiology & Demography for Health Systems Management", 3]
    ],
    "2": [
      ["HSMU 138", "Health Management Information Systems", 3],
      ["HSMU 139", "Fundamentals of Health Economics", 3],
      ["HSCI 225", "HIV/AIDS", 3],
      ["HSMU 211", "Fundamentals of Healthcare Accounting", 3],
      ["HSMU 212", "Health Care Financing", 3],
      ["HSMU 213", "Health Risk & Insurance Management", 3],
      ["HSMU 214", "Information Technology Resource Management for Health", 3],
      ["HSMU 215", "Healthcare Entrepreneurship", 3],
      ["HSMU 221", "Managing Community Health Services", 3],
      ["HSMU 222", "Managing Healthcare Organizations", 3],
      ["HSMU 223", "Healthcare Infrastructure Management", 3],
      ["HSMU 224", "Health Workforce Management & Development", 3]
    ],
    "3": [
      ["HSMU 225", "Health Care Law & Ethics", 3],
      ["HSMU 231", "Management of District Health Services", 3]
    ]
  },
  "Bachelor of Arts in International Relations": {
    "1": [
      [
        "BIRS 110",
        "Introduction to International Relations",
        3
      ],
      [
        "BIRS 111",
        "Communication Skills",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "BIRS 112",
        "Introduction to Diplomacy",
        3
      ],
      [
        "BIRS 113",
        "Introduction to Political Science",
        3
      ],
      [
        "BIRS 114",
        "French I",
        3
      ]
    ],
    "2": [
      [
        "MISC 116",
        "Introduction to Management Information System",
        3
      ],
      [
        "BIRS 120",
        "Introduction to Economics",
        3
      ],
      [
        "BIRS 121",
        "Politics and Government in Africa",
        3
      ],
      [
        "BIRS 122",
        "World History and Transformation",
        3
      ],
      [
        "BIRS 125",
        "French II",
        3
      ],
      [
        "MATH 130",
        "Basic Statistics",
        3
      ]
    ],
    "3": [
      [
        "BIRS 210",
        "International Law",
        3
      ],
      [
        "BIRS 211",
        "Diplomatic Practice",
        3
      ],
      [
        "BIRS 212",
        "African Regional Organizations",
        3
      ],
      [
        "BIRS 213",
        "Conflict and Peace Studies",
        3
      ],
      [
        "BIRS 214",
        "Research Methods in IR",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ]
    ]
  },
  "Bachelor of Science in Hospitality Management": {
    "1": [
      [
        "HTM 200",
        "Principles of Economics",
        3
      ],
      [
        "HTM 201",
        "Principles of Accounting",
        3
      ],
      [
        "BHOM 210",
        "Hotel Information Systems Lab",
        3
      ],
      [
        "BHOM 201",
        "Advanced Food and Beverage Production Lab",
        3
      ],
      [
        "HTM 202",
        "Language (French or German)",
        3
      ],
      [
        "BHOM 204",
        "Housekeeping and Laundry Supervision",
        3
      ]
    ],
    "2": [
      [
        "BHOM 205",
        "Wine and Bar Operations",
        3
      ],
      [
        "HTM 205",
        "Principles of Marketing",
        3
      ],
      [
        "BHOM 206",
        "International Cuisine",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "BHOM 207",
        "Food and Beverage Supervision",
        3
      ],
      [
        "ENVI 201",
        "Environmental issues in Hospitality and Tourism",
        3
      ]
    ],
    "3": [
      [
        "BHOM 208",
        "Facilities Management in Hospitality",
        3
      ],
      [
        "BHOM 300",
        "Kitchen Operations Management",
        3
      ],
      [
        "BHOM 301",
        "Food and Beverage Management",
        3
      ],
      [
        "HTM 300",
        "Organization Behaviour in Hospitality and Tourism",
        3
      ],
      [
        "HTM 301",
        "Human Resource Management",
        3
      ],
      [
        "BHOM 302",
        "Menu Engineering and Costing",
        3
      ]
    ]
  },
  "Bachelor of Science in Environmental Health": {
    "1": [
      [
        "BEH 110",
        "Principles of Environmental Health",
        3
      ],
      [
        "BEH 111",
        "Introduction to Public Health",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "MATH 102",
        "Foundation of Mathematics",
        3
      ],
      [
        "COMP 100",
        "Computer Science",
        3
      ]
    ],
    "2": [
      [
        "BEH 121",
        "Epidemiology",
        3
      ],
      [
        "BEH 122",
        "Water and Sanitation",
        3
      ],
      [
        "BEH 123",
        "Occupational Health Basics",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "SOST 131",
        "Introduction to Sociology",
        3
      ],
      [
        "ENVI 201",
        "Environmental Science",
        3
      ]
    ],
    "3": [
      [
        "BEH 210",
        "Water & Sanitation Advanced",
        3
      ],
      [
        "BEH 220",
        "Occupational Health",
        3
      ],
      [
        "BEH 310",
        "Environmental Impact Assessment",
        3
      ],
      [
        "BEH 230",
        "Food Hygiene and Safety",
        3
      ],
      [
        "BEH 240",
        "Solid Waste Management",
        3
      ],
      [
        "BEH 250",
        "Health Promotion",
        3
      ]
    ]
  },
  "Diploma in Social Work and Community Development Level 6": {
    "1": [
      [
        "SWD 101",
        "Introduction to Social Work",
        3
      ],
      [
        "SWD 102",
        "Community Development Theory",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "SOST 131",
        "Introduction to Sociology",
        3
      ],
      [
        "COMP 100",
        "Computer Applications",
        3
      ]
    ],
    "2": [
      [
        "SWD 201",
        "Social Policy",
        3
      ],
      [
        "SWD 202",
        "Case Management",
        3
      ],
      [
        "SWD 203",
        "Human Behaviour and Social Environment",
        3
      ],
      [
        "SWD 204",
        "Counseling Skills",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "BUSS 025",
        "Business Communication",
        3
      ]
    ],
    "3": [
      [
        "SWD 301",
        "Project Planning",
        3
      ],
      [
        "SWD 302",
        "Community Mobilization",
        3
      ],
      [
        "SWD 303",
        "Social Research Methods",
        3
      ],
      [
        "SWD 304",
        "Child and Family Welfare",
        3
      ],
      [
        "SWD 305",
        "Gender and Development",
        3
      ],
      [
        "SWD 306",
        "Field Practicum Preparation",
        3
      ]
    ]
  },
  "Bachelor of Social Work and Community Development Level 6": {
    "1": [
      [
        "SWD 101",
        "Introduction to Social Work",
        3
      ],
      [
        "SWD 102",
        "Community Development Theory",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "SOST 131",
        "Introduction to Sociology",
        3
      ],
      [
        "COMP 100",
        "Computer Applications",
        3
      ]
    ],
    "2": [
      [
        "SWD 201",
        "Social Policy",
        3
      ],
      [
        "SWD 202",
        "Case Management",
        3
      ],
      [
        "SWD 203",
        "Human Behaviour and Social Environment",
        3
      ],
      [
        "SWD 204",
        "Counseling Skills",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "MATH 130",
        "Basic Statistics",
        3
      ]
    ],
    "3": [
      [
        "SWD 301",
        "Project Planning",
        3
      ],
      [
        "SWD 302",
        "Community Mobilization",
        3
      ],
      [
        "SWD 303",
        "Social Research Methods",
        3
      ],
      [
        "SWD 304",
        "Child and Family Welfare",
        3
      ],
      [
        "SWD 305",
        "Gender and Development",
        3
      ],
      [
        "SWD 310",
        "Advanced Case Management",
        3
      ]
    ]
  },
  "Bachelor of Business Information Technology": {
    "1": [
      ["COMM 111", "Communication Skills", 3],
      ["BBIT 111", "Introduction to Business Information Systems", 3],
      ["ECON 101", "Principles of Microeconomics", 3],
      ["BUSS 100", "Principles of Management", 3],
      ["MATH 102", "Foundation of Mathematics", 3],
      ["THEO 111", "Christian Beliefs", 3],
      ["BBIT 121", "Introduction to Programming", 3],
      ["BBIT 112", "Computer Organization and Architecture", 3],
      ["MATH 132", "Probability and Statistics I", 3],
      ["ACCT 112", "Principles of Accounting I", 3],
      ["HSCI 225", "HIV/AIDS", 3],
      ["ECON 102", "Principles of Macroeconomics", 3]
    ],
    "2": [
      ["MATH 110", "Linear Algebra I", 3],
      ["BBIT 222", "Structured Programming", 3],
      ["BBIT 231", "Systems Analysis and Design", 3],
      ["BBIT 232", "Database Systems", 3],
      ["BBIT 213", "Computer Operating Systems I", 3],
      ["BBIT 241", "Introduction to Computer Networks", 3],
      ["BBIT 223", "Object Oriented Programming", 3],
      ["SOST 131", "Introduction to Sociology", 3],
      ["BBIT 242", "Telecommunication Networks", 3],
      ["ACCT 219", "Cost Accounting", 3],
      ["BUSS 326", "Organizational Behaviour", 3],
      ["MKTG 218", "Principles of Marketing", 3]
    ],
    "3": [
      ["BUSS 212", "Business Law I", 3],
      ["ENVI 201", "Environmental Science", 3],
      ["MATH 330", "Operations Research for Business", 3],
      ["BBIT 333", "Introduction to Artificial Intelligence", 3],
      ["BBIT 324", "Data Structures and Algorithms", 3],
      ["BBIT 334", "Software Engineering Principles", 3],
      ["BBIT 314", "Human Computer Interaction", 3],
      ["BBIT 315", "Project Management in Business", 3],
      ["BBIT 335", "Object-Oriented Analysis and Design", 3],
      ["BBIT 316", "Research Methodology", 3],
      ["BBIT 325", "Application Programming for the Internet", 3],
      ["BBIT 436", "E-Commerce", 3],
      ["BBIT 417", "Computer Based Business Modeling", 3],
      ["BBIT 443", "Information Systems Security and Audit", 3],
      ["BBIT 437", "Accounting Information Systems", 3],
      ["BBIT 438", "Management Information Systems", 3],
      ["BUSS 420", "Strategic Management", 3],
      ["BUSS 221", "Fundamentals of Entrepreneurship", 3]
    ]
  },
  "Bachelor of Science in Computer Science": {
    "1": [
      ["COSC 101", "Introduction to Computer Science", 3],
      ["COSC 110", "Introduction to Programming", 3],
      ["MATH 102", "Foundation of Mathematics", 3],
      ["COSC 104", "Fundamentals of Internet and Web Design", 3],
      ["SOST 131", "Introduction to Sociology", 3],
      ["THEO 111", "Christian Beliefs", 3],
      ["COMM 111", "Communication Skills", 3],
      ["BUSS 114", "Entrepreneurship", 3],
      ["COSC 111", "Structured Programming", 3],
      ["COSC 131", "Introduction to Computer Networks", 3],
      ["MATH 103", "Calculus I", 3],
      ["MATH 132", "Probability and Statistics I", 3]
    ],
    "2": [
      ["COSC 201", "Computer Systems and Architecture", 3],
      ["COSC 210", "Object Oriented Programming", 3],
      ["COSC 212", "Data Structures and Algorithms", 3],
      ["COSC 221", "Database Systems", 3],
      ["COSC 222", "Systems Analysis and Design", 3],
      ["HSCI 225", "HIV/AIDS", 3],
      ["COSC 231", "Telecommunication Networks", 3],
      ["COSC 300", "Computer Operating Systems", 3],
      ["COSC 302", "Research Methodology", 3],
      ["COSC 303", "Computer Hardware and Maintenance", 3],
      ["COSC 310", "Advanced Programming", 3],
      ["COSC 311", "Advanced Web Development", 3]
    ],
    "3": [
      ["ENVI 201", "Environmental Science", 3],
      ["COSC 314", "Human Computer Interaction", 3],
      ["COSC 321", "Software Engineering Principles", 3],
      ["COSC 403", "Simulation and Modeling", 3],
      ["COSC 404", "Project Management", 3],
      ["COSC 432", "Distributed Systems", 3],
      ["COSC 330", "Introduction to Cybersecurity", 3],
      ["COSC 334", "Cryptography", 3],
      ["COSC 335", "Network Security", 3],
      ["COSC 313", "Ethical Hacking", 3],
      ["COSC 422", "Introduction to AI", 3],
      ["COSC 431", "Information Systems Security", 3],
      ["COSC 400", "Industrial Attachment", 3],
      ["COSC 401", "Research Project", 6]
    ]
  },
  "Bachelor of Science in Mathematics and Computer Science": {
    "1": [
      ["COMP 101", "Introduction to Computer Science", 3],
      ["COMP 110", "Introduction to Programming", 3],
      ["MATH 102", "Foundations of Mathematics", 3],
      ["MATH 103", "Calculus I", 3],
      ["SOST 131", "Introduction to Sociology", 3],
      ["THEO 111", "Christian Beliefs", 3],
      ["COMM 111", "Communication Skills", 3],
      ["COMP 104", "Analogue Electronics", 3],
      ["COMP 111", "Structured Programming", 3],
      ["MATH 104", "Calculus II", 3],
      ["MATH 110", "Linear Algebra I", 3],
      ["MATH 132", "Probability and Statistics I", 3]
    ],
    "2": [
      ["COMP 131", "Introduction to Computer Networks", 3],
      ["COMP 211", "Object Oriented Programming", 3],
      ["COMP 231", "Telecommunication Networks", 3],
      ["MATH 200", "Calculus III", 3],
      ["MATH 210", "Linear Algebra II", 3],
      ["MATH 230", "Probability and Statistics II", 3],
      ["COMP 201", "Computer Organization and Architecture", 3],
      ["COMP 210", "Data Structures", 3],
      ["COMP 220", "System Analysis and Design", 3],
      ["HSCI 225", "HIV/AIDS", 3],
      ["MATH 211", "Discrete Structures", 3],
      ["MATH 220", "Ordinary Differential Equations I", 3]
    ],
    "3": [
      ["COMP 300", "Operating Systems", 3],
      ["COMP 302", "Digital Electronics", 3],
      ["COMP 340", "Database Management System", 3],
      ["ENVI 201", "Environmental Science", 3],
      ["MATH 221", "Vector Analysis", 3],
      ["MATH 310", "Real Analysis I", 3],
      ["BUSS 114", "Fundamentals of Entrepreneurship", 3],
      ["COMP 303", "Computer Hardware and Maintenance", 3],
      ["COMP 304", "Research Methodology", 3],
      ["MATH 320", "Numerical Analysis I", 3],
      ["MATH 331", "Operation Research I", 3],
      ["PHYS 310", "Electrical Circuits", 3],
      ["COMP 400", "Internship", 3],
      ["COMP 422", "Automata and Formal Language", 3],
      ["MATH 410", "Complex Variable Theory I", 3],
      ["MATH 412", "Algebraic Structures", 3]
    ]
  },
  "Diploma in Business Information Technology": {
    "1": [
      ["DBIT 120", "Introduction to Computer Systems", 3],
      ["MATH 102", "Foundation of Mathematics", 3],
      ["ACCT 010", "Principles of Accounting 1", 3],
      ["BUSS 025", "Business Communication", 3],
      ["DBIT 122", "Introduction to Internet and Web Design", 3],
      ["DBIT 126", "Office Applications", 3],
      ["MKTG 022", "Marketing Fundamentals", 3],
      ["ECON 015", "Principles of Economics", 3],
      ["DBIT 121", "Introduction to Programming", 3],
      ["DBIT 123", "Computer Hardware and Maintenance", 3],
      ["DBIT 124", "System Analysis and Design", 3],
      ["DBIT 210", "Computer Organization and Architecture", 3]
    ],
    "2": [
      ["DBIT 125", "Operating Systems", 3],
      ["BUSS 012", "Principles of Management", 3],
      ["DBIT 220", "Statistical Data Analysis", 3],
      ["DBIT 221", "Database Management Systems", 3],
      ["DBIT 222", "I.T. Project Management", 3],
      ["DBIT 223", "Computer Networking", 3],
      ["ENTR 032", "Entrepreneurship", 3],
      ["BUSS 035", "Organization Behavior and Leadership", 3],
      ["DBIT 224", "Information System Management", 3],
      ["DBIT 225", "Event Driven Programming", 3],
      ["DBIT 226", "Research Project", 3],
      ["DBIT 227", "Emerging Technologies in ICT", 3]
    ],
    "3": [
      ["DBIT 300", "Industrial Attachment", 3]
    ]
  },
  "Bachelor of Science in Nursing": {
    "1": [
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "HSCI 105",
        "Human Anatomy I",
        3
      ],
      [
        "MLSC 101",
        "Organic Chemistry",
        3
      ],
      [
        "COMP 100",
        "Computer Application",
        3
      ],
      [
        "HSCI 103",
        "Nutrition & Health",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ]
    ],
    "2": [
      [
        "HSCI 106",
        "Human Anatomy II",
        3
      ],
      [
        "HSCI 108",
        "Human Physiology I",
        3
      ],
      [
        "MLSC 222",
        "Biochemistry",
        3
      ],
      [
        "PHYS 101",
        "Electricity and Magnetism I",
        3
      ],
      [
        "MLSC 103",
        "First Aid",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ]
    ],
    "3": [
      [
        "HSCI 109",
        "Human Physiology II",
        3
      ],
      [
        "NRSG 112",
        "Fundamentals of Nursing (Theory)",
        3
      ],
      [
        "NRSG 111",
        "Community Health Nursing I (Theory)",
        3
      ],
      [
        "NRSG 121",
        "Parasitology",
        3
      ],
      [
        "BUSS 221",
        "Entrepreneurship",
        3
      ],
      [
        "MATH 130",
        "Basic Statistics",
        3
      ]
    ]
  },
  "Diploma in Clinical Medicine, Surgery & Community Health": {
    "1": [
      [
        "CLMD 101",
        "Medicine",
        3
      ],
      [
        "CLMD 102",
        "Pediatrics",
        3
      ],
      [
        "CLMD 103",
        "Reproductive Health",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "COMP 100",
        "Computer Applications",
        3
      ]
    ],
    "2": [
      [
        "CLMD 104",
        "Surgery",
        3
      ],
      [
        "CLMD 105",
        "Community Health",
        3
      ],
      [
        "CLMD 106",
        "Health Services Management",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "CLMD 107",
        "Clinical Skills I",
        3
      ],
      [
        "CLMD 108",
        "Pathology Basics",
        3
      ]
    ],
    "3": [
      [
        "CLMD 201",
        "Clinical Skills II",
        3
      ],
      [
        "CLMD 202",
        "Pathology",
        3
      ],
      [
        "CLMD 203",
        "Pharmacology for Clinical Officers",
        3
      ],
      [
        "CLMD 204",
        "Emergency Medicine",
        3
      ],
      [
        "CLMD 205",
        "Research Methods",
        3
      ],
      [
        "CLMD 206",
        "Professional Ethics",
        3
      ]
    ]
  },
  "Bachelor of Pharmacy": {
    "1": [
      [
        "PHAR 101",
        "Basic Mathematics",
        3
      ],
      [
        "PHAR 102",
        "Social Psychology",
        3
      ],
      [
        "PHAR 103",
        "Computer Applications",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ]
    ],
    "2": [
      [
        "PHAR 201",
        "Human Anatomy",
        3
      ],
      [
        "PHAR 202",
        "Pharmaceutical Microbiology",
        3
      ],
      [
        "PHAR 203",
        "Medical Physiology",
        3
      ],
      [
        "PHAR 204",
        "Biochemistry",
        3
      ],
      [
        "PHAR 205",
        "Physical Chemistry",
        3
      ],
      [
        "PHAR 206",
        "Inorganic Chemistry",
        3
      ]
    ],
    "3": [
      [
        "PHAR 301",
        "Pharmacology",
        3
      ],
      [
        "PHAR 302",
        "Pharmaceutics",
        3
      ],
      [
        "PHAR 303",
        "Organic Chemistry",
        3
      ],
      [
        "PHAR 304",
        "Social & Administrative Pharmacy",
        3
      ],
      [
        "PHAR 305",
        "Pharmacy Practice Experience",
        3
      ],
      [
        "PHAR 306",
        "Pharmacognosy",
        3
      ]
    ]
  },
  "Bachelor of Science in Medical Laboratory Science": {
    "1": [
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "HSCI 105",
        "Human Anatomy I",
        3
      ],
      [
        "MLSC 101",
        "Organic Chemistry",
        3
      ],
      [
        "COMP 100",
        "Computer Application",
        3
      ],
      [
        "HSCI 103",
        "Nutrition & Health",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ]
    ],
    "2": [
      [
        "HSCI 106",
        "Human Anatomy II",
        3
      ],
      [
        "HSCI 108",
        "Human Physiology I",
        3
      ],
      [
        "MLSC 222",
        "Biochemistry",
        3
      ],
      [
        "PHYS 101",
        "Electricity and Magnetism I",
        3
      ],
      [
        "MLSC 103",
        "First Aid",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ]
    ],
    "3": [
      [
        "HSCI 109",
        "Human Physiology II",
        3
      ],
      [
        "MLSC 201",
        "Histology",
        3
      ],
      [
        "MLSC 202",
        "Immunology I",
        3
      ],
      [
        "MLSC 204",
        "Cellular & Molecular Biology",
        3
      ],
      [
        "MLSC 205",
        "Bio-Instrumentation",
        3
      ],
      [
        "MLSC 206",
        "Medical Bacteriology",
        3
      ]
    ]
  },
  "Bachelor of Business Administration": {
    "1": [
      [
        "BUSS 100",
        "Principles of Management",
        3
      ],
      [
        "ACCT 112",
        "Principles of Accounting I",
        3
      ],
      [
        "ECON 101",
        "Principles of Microeconomics",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "MATH 102",
        "Foundation of Mathematics",
        3
      ]
    ],
    "2": [
      [
        "MKTG 218",
        "Principles of Marketing",
        3
      ],
      [
        "ECON 102",
        "Principles of Macroeconomics",
        3
      ],
      [
        "ACCT 113",
        "Principles of Accounting II",
        3
      ],
      [
        "BUSS 212",
        "Business Law I",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "COMP 100",
        "Computer Applications",
        3
      ]
    ],
    "3": [
      [
        "FINA 213",
        "Financial Management I",
        3
      ],
      [
        "BUSS 326",
        "Organizational Behaviour",
        3
      ],
      [
        "HRMG 210",
        "Human Resource Management",
        3
      ],
      [
        "BUSS 221",
        "Entrepreneurship",
        3
      ],
      [
        "MATH 130",
        "Basic Statistics",
        3
      ],
      [
        "ENVI 201",
        "Environmental Science",
        3
      ]
    ]
  },
  "Diploma in Theology": {
    "1": [
      ["THEO 050", "Ministerial Mentorship", 3],
      ["THEO 051", "Introduction to Study of Theology", 3],
      ["THEO 052", "Introduction to Christian Education", 3],
      ["THEO 053", "Introduction to Study of Old Testament", 3],
      ["THEO 054", "Introduction to Study of New Testament", 3],
      ["THEO 055", "Early and Medieval Church History", 3],
      ["THEO 056", "Reformation and Modern Church History", 3],
      ["THEO 060", "Christian Doctrines", 3],
      ["THEO 061", "Principles of Church Management", 3],
      ["THEO 063", "Church Planting", 3],
      ["THEO 068", "Principles of Worship", 3],
      ["THEO 069", "Introduction to African Traditional Religion", 3]
    ],
    "2": [
      ["THEO 070", "Introduction to Biblical Interpretation", 3],
      ["THEO 071", "Pastoral Ministry", 3],
      ["THEO 074", "Introduction to African Church History", 3],
      ["THEO 076", "Introduction to Preaching", 3],
      ["THEO 082", "Introduction to Old Testament Texts in English", 3],
      ["THEO 083", "Introduction to New Testament Texts in English", 3],
      ["THEO 085", "Introduction to Methodism", 3],
      ["THEO 089", "Introduction to World Major Religions", 3],
      ["THEO 091", "Introduction to Christian Ethics", 3],
      ["THEO 099", "Circuit/Parish Attachment", 3]
    ],
    "3": []
  },
  "Bachelor of Theology": {
    "1": [
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "THEO 112",
        "Introduction to Old Testament",
        3
      ],
      [
        "THEO 113",
        "Introduction to New Testament",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "SOST 131",
        "Introduction to Sociology",
        3
      ],
      [
        "COMP 100",
        "Computer Applications",
        3
      ]
    ],
    "2": [
      [
        "THEO 121",
        "Church History I",
        3
      ],
      [
        "THEO 122",
        "Christian Education",
        3
      ],
      [
        "THEO 123",
        "African Spirituality",
        3
      ],
      [
        "THEO 124",
        "Family Life Education",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "THEO 125",
        "Methodism and Wesley Studies",
        3
      ]
    ],
    "3": [
      [
        "THEO 211",
        "Church History II",
        3
      ],
      [
        "THEO 212",
        "Homiletics",
        3
      ],
      [
        "THEO 213",
        "Church Planting and Growth",
        3
      ],
      [
        "THEO 214",
        "Pastoral Counseling",
        3
      ],
      [
        "THEO 215",
        "Christian Ethics",
        3
      ],
      [
        "THEO 216",
        "Worship and Liturgy",
        3
      ]
    ]
  },
  "Bachelor of Science in Artificial Intelligence and Robotics": {
    "1": [
      ["THEO 111", "Christian Beliefs", 3],
      ["SOST 131", "Introduction to Sociology", 3],
      ["AIRS 101", "Introduction to Computer Science", 3],
      ["AIRS 102", "Introduction to Artificial Intelligence", 3],
      ["AIRS 103", "Introduction to Programming in Python", 3],
      ["MATH 110", "Linear Algebra I", 3],
      ["COMM 111", "Communication Skills", 3],
      ["ELEC 104", "Analog Electronics", 3],
      ["AIRS 105", "Introduction to Robotics", 3],
      ["AIRS 106", "Introduction to Ethics in AI", 3],
      ["AIRS 210", "Object Oriented Programming", 3],
      ["MATH 103", "Calculus I", 3]
    ],
    "2": [
      ["HSCI 225", "HIV/AIDS", 3],
      ["BUSS 221", "Fundamentals of Entrepreneurship", 3],
      ["AIRS 201", "Machine Learning I", 3],
      ["AIRS 212", "Data Structures and Algorithms", 3],
      ["ELEC 204", "Digital Electronics", 3],
      ["MATH 104", "Calculus II", 3],
      ["ENVI 201", "Environmental Science", 3],
      ["AIRS 202", "Natural Language Processing", 3],
      ["AIRS 203", "Computer Networks for AI and Robotics", 3],
      ["AIRS 205", "Problem Solving in AI and Robotics", 3],
      ["AIRS 221", "Database Systems", 3],
      ["MATH 132", "Probability and Statistics I", 3]
    ],
    "3": [
      ["AIRS 300", "Computer Operating Systems", 3],
      ["AIRS 301", "Machine Learning II", 3],
      ["AIRS 302", "Research Methodology", 3],
      ["AIRS 303", "Computer Vision", 3],
      ["AIRS 304", "Human – Robot Interaction", 3],
      ["AIRS 305", "Control Systems Principles", 3],
      ["AIRS 306", "Deep Learning Applications", 3],
      ["AIRS 307", "Reinforcement Learning", 3],
      ["AIRS 311", "Robotics Kinematics", 3],
      ["AIRS 312", "Perception in Robots", 3],
      ["AIRS 400", "Industrial Attachment", 3],
      ["AIRS 401", "AI Research Project", 6]
    ]
  },
  "Bachelor of Science in Blockchain Technology": {
    "1": [
      ["THEO 111", "Christian Beliefs", 3],
      ["SOST 131", "Introduction to Sociology", 3],
      ["MATH 110", "Linear Algebra I", 3],
      ["CSBT 101", "Introduction to Computer Science", 3],
      ["CSBT 102", "Introduction to Blockchain Technology", 3],
      ["CSBT 103", "Introduction to Programming in Python", 3],
      ["COMM 111", "Communication Skills", 3],
      ["MATH 103", "Calculus I", 3],
      ["ECON 101", "Principles of Economics", 3],
      ["CSBT 104", "Introduction to Cryptography", 3],
      ["CSBT 105", "Introduction to Artificial Intelligence", 3],
      ["CSBT 106", "Object Oriented Programming", 3]
    ],
    "2": [
      ["BUSS 100", "Principles and Practices of Management", 3],
      ["MATH 132", "Probability and Statistics I", 3],
      ["CSBT 201", "Computer Organization and Architecture", 3],
      ["CSBT 202", "Computer Networks", 3],
      ["CSBT 203", "Data Structures and Algorithms", 3],
      ["CSBT 204", "Database Systems", 3],
      ["ENVI 201", "Environmental Science", 3],
      ["MATH 211", "Discrete Structures", 3],
      ["FINA 213", "Financial Accounting I", 3],
      ["CSBT 205", "Operating Systems", 3],
      ["CSBT 206", "Software Engineering", 3],
      ["CSBT 207", "Introduction to Smart Contracts", 3]
    ],
    "3": [
      ["HSCI 225", "HIV/AIDS", 3],
      ["CSBT 300", "Corporate Finance", 3],
      ["CSBT 301", "Legal Aspects of Blockchain", 3],
      ["CSBT 302", "Cybersecurity Principles", 3],
      ["CSBT 303", "Project Management", 3],
      ["CSBT 304", "Ethical Hacking", 3],
      ["CSBT 305", "Advanced Blockchain Development", 3],
      ["CSBT 306", "Decentralized Applications", 3],
      ["CSBT 307", "Decentralized Finance", 3],
      ["CSBT 308", "Consensus Algorithms", 3],
      ["CSBT 309", "Blockchain Security", 3],
      ["CSBT 400", "Industrial Attachment", 3],
      ["CSBT 401", "Blockchain Research Project", 6]
    ]
  },
  "Bachelor of Science in Software Engineering and Mobile Applications": {
    "1": [
      ["THEO 111", "Christian Beliefs", 3],
      ["SOST 131", "Introduction to Sociology", 3],
      ["SEMA 101", "Introduction to Computer Systems", 3],
      ["SEMA 102", "Fundamentals of Internet and Web Design", 3],
      ["SEMA 103", "Introduction to Python Programming", 3],
      ["MATH 102", "Foundation of Mathematics", 3],
      ["COMM 111", "Communication Skills", 3],
      ["SEMA 105", "Fundamentals of Software Engineering", 3],
      ["SEMA 116", "Fundamentals of Mobile Development", 3],
      ["SEMA 111", "Structured Programming in Python", 3],
      ["MATH 103", "Calculus I", 3],
      ["BUSS 114", "Entrepreneurship", 3]
    ],
    "2": [
      ["HSCI 225", "HIV/AIDS", 3],
      ["SEMA 223", "Mobile UI/UX Design basic Principles", 3],
      ["SEMA 221", "Database Systems", 3],
      ["SEMA 203", "Software Engineering Ethics", 3],
      ["SEMA 204", "Mobile Application Design & Prototyping", 3],
      ["MATH 104", "Calculus II", 3],
      ["ENVI 201", "Environmental Science", 3],
      ["MATH 211", "Discrete Structures", 3],
      ["SEMA 210", "Mobile Application Architecture", 3],
      ["SEMA 212", "Data Structures and Algorithms in Python", 3],
      ["SEMA 205", "Cross platform Front End Mobile Application Development- React Native", 3],
      ["SEMA 206", "Object-Oriented Programming in Java", 3]
    ],
    "3": [
      ["SEMA 306", "Mobile Application Security", 3],
      ["SEMA 301", "Advanced Programming in Python", 3],
      ["SEMA 310", "Mobile Application Testing and Debugging", 3],
      ["SEMA 304", "Mobile Application Monetization", 3],
      ["SEMA 300", "Operating Systems", 3],
      ["SEMA 302", "Research Methodology", 3],
      ["SEMA 303", "Mobile Application Deployment", 3],
      ["SEMA 314", "Human-Computer Interaction", 3],
      ["MATH 330", "Operation Research for Computer Science", 3],
      ["SEMA 321", "Advanced Software Engineering", 3],
      ["SEMA 311", "Advanced Web Development", 3],
      ["SEMA 400", "Industrial Attachment", 3],
      ["SEMA 401", "Research Project", 6]
    ]
  },
  "Diploma in Information Science": {
    "1": [
      ["DISC 112", "Introduction to library and Information science", 3],
      ["DISC 113", "Introduction to computers", 3],
      ["DISC 115", "Introduction to database systems", 3],
      ["DISC 116", "Introduction to multimedia information sources & services", 3],
      ["DISC 117", "Introduction to Records and Archives", 3],
      ["DISC 119", "Introduction to organization of knowledge", 3],
      ["DISC 118", "Internet and information services", 3],
      ["DISC 120", "Introduction to Management of Library and Information Centres", 3],
      ["DISC 121", "Records Management", 3],
      ["DISC 122", "Organization of knowledge: classification", 3],
      ["DISC 123", "Organization of knowledge: cataloguing", 3],
      ["DISC 124", "Information communication & mass media", 3]
    ],
    "2": [
      ["DISC 201", "User studies and information needs", 3],
      ["DISC 202", "Reference and information services", 3],
      ["DISC 204", "Conservation and Restoration of Information materials", 3],
      ["DISC 206", "Automation of Libraries and Information Centres", 3],
      ["DISC 205", "Research methods in information science", 3],
      ["DISC 214", "Entrepreneurship", 3],
      ["DISC 215", "Project", 6],
      ["DISC 216", "Practicum", 6],
      ["DISC 217", "Information Communication Technologies", 3],
      ["DISC 219", "Archives management", 3]
    ],
    "3": []
  },
  "Bachelor of Arts in Communication and Journalism": {
    "1": [
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "BACJ 110",
        "Introduction to Mass Communication",
        3
      ],
      [
        "BACJ 111",
        "News Writing",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "SOST 131",
        "Introduction to Sociology",
        3
      ],
      [
        "COMP 100",
        "Computer Applications",
        3
      ]
    ],
    "2": [
      [
        "BACJ 120",
        "Media Law and Ethics",
        3
      ],
      [
        "BACJ 121",
        "Reporting Techniques",
        3
      ],
      [
        "BACJ 122",
        "Public Relations Fundamentals",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "BACJ 123",
        "Photojournalism",
        3
      ],
      [
        "MATH 130",
        "Basic Statistics",
        3
      ]
    ],
    "3": [
      [
        "BACJ 210",
        "Broadcast Journalism",
        3
      ],
      [
        "BACJ 211",
        "Feature Writing",
        3
      ],
      [
        "BACJ 212",
        "Media and Society",
        3
      ],
      [
        "BACJ 213",
        "Editing and Design",
        3
      ],
      [
        "BACJ 214",
        "Digital Media",
        3
      ],
      [
        "BACJ 215",
        "Research Methods in Communication",
        3
      ]
    ]
  },
  "Bachelor of Criminology and Security Management": {
    "1": [
      [
        "BCSM 101",
        "Introduction to Criminology",
        3
      ],
      [
        "BCSM 102",
        "Security Management",
        3
      ],
      [
        "COMM 111",
        "Communication Skills",
        3
      ],
      [
        "THEO 111",
        "Christian Beliefs",
        3
      ],
      [
        "SOST 131",
        "Introduction to Sociology",
        3
      ],
      [
        "COMP 100",
        "Computer Applications",
        3
      ]
    ],
    "2": [
      [
        "BCSM 201",
        "Criminal Law",
        3
      ],
      [
        "BCSM 202",
        "Crime Prevention",
        3
      ],
      [
        "BCSM 203",
        "Policing and Society",
        3
      ],
      [
        "HSCI 225",
        "HIV/AIDS",
        3
      ],
      [
        "BCSM 204",
        "Victimology",
        3
      ],
      [
        "MATH 130",
        "Basic Statistics",
        3
      ]
    ],
    "3": [
      [
        "BCSM 301",
        "Forensic Investigation",
        3
      ],
      [
        "BCSM 302",
        "Private Security Operations",
        3
      ],
      [
        "BCSM 303",
        "Cybercrime",
        3
      ],
      [
        "BCSM 304",
        "Correctional Administration",
        3
      ],
      [
        "BCSM 305",
        "Research Methods in Criminology",
        3
      ],
      [
        "BCSM 306",
        "Terrorism and Counter-Terrorism",
        3
      ]
    ]
  }
};

const PROGRAMME_LIST = Object.keys(CURRICULUM).sort();

// Shared electives / general education pool used to pad each programme to ≥65 unique units
const SHARED_UNIT_POOL = [
  ["COMM 111", "Communication Skills", 3],
  ["THEO 111", "Christian Beliefs", 3],
  ["HSCI 225", "HIV/AIDS", 3],
  ["ENVI 201", "Environmental Science", 3],
  ["SOST 131", "Introduction to Sociology", 3],
  ["MATH 102", "Foundation of Mathematics", 3],
  ["MATH 103", "Calculus I", 3],
  ["MATH 104", "Calculus II", 3],
  ["MATH 110", "Linear Algebra I", 3],
  ["MATH 132", "Probability and Statistics I", 3],
  ["MATH 211", "Discrete Structures", 3],
  ["MATH 230", "Probability and Statistics II", 3],
  ["MATH 330", "Operations Research", 3],
  ["BUSS 100", "Principles of Management", 3],
  ["BUSS 114", "Entrepreneurship", 3],
  ["BUSS 221", "Fundamentals of Entrepreneurship", 3],
  ["BUSS 212", "Business Law I", 3],
  ["BUSS 326", "Organizational Behaviour", 3],
  ["BUSS 420", "Strategic Management", 3],
  ["ECON 101", "Principles of Microeconomics", 3],
  ["ECON 102", "Principles of Macroeconomics", 3],
  ["ACCT 112", "Principles of Accounting I", 3],
  ["MKTG 218", "Principles of Marketing", 3],
  ["FINA 213", "Financial Management I", 3],
  ["COMP 100", "Computer Applications", 3],
  ["COMP 101", "Introduction to Computer Science", 3],
  ["COMP 110", "Introduction to Programming", 3],
  ["COMP 111", "Structured Programming", 3],
  ["COMP 131", "Introduction to Computer Networks", 3],
  ["COMP 210", "Data Structures", 3],
  ["COMP 220", "System Analysis and Design", 3],
  ["COMP 300", "Operating Systems", 3],
  ["COMP 340", "Database Management System", 3],
  ["PHYS 310", "Electrical Circuits", 3],
  ["ELEC 104", "Analog Electronics", 3],
  ["ELEC 204", "Digital Electronics", 3],
  ["RESE 301", "Research Methods", 3],
  ["RESE 401", "Research Project", 6],
  ["INDS 400", "Industrial Attachment", 3],
  ["LEAD 210", "Leadership and Ethics", 3],
  ["COMM 210", "Professional Communication", 3],
  ["STAT 210", "Applied Statistics", 3],
  ["PHIL 110", "Critical Thinking", 3],
  ["HIST 110", "History of Kenya", 3],
  ["GEOG 110", "Introduction to Geography", 3],
  ["PSYC 110", "Introduction to Psychology", 3],
  ["LAWS 110", "Introduction to Law", 3],
  ["ENTR 032", "Entrepreneurship Skills", 3],
  ["PROJ 310", "Project Planning and Management", 3],
  ["QUAL 320", "Quality Assurance", 3],
  ["INNO 330", "Innovation and Design Thinking", 3],
  ["DATA 340", "Introduction to Data Analytics", 3],
  ["CYBR 350", "Cybersecurity Fundamentals", 3],
  ["CLD 360", "Cloud Computing Basics", 3],
  ["WEB 370", "Web Technologies", 3],
  ["MOB 380", "Mobile Computing", 3],
  ["AI 390", "Introduction to Artificial Intelligence", 3],
  ["ETH 200", "Professional Ethics", 3],
  ["DEV 220", "Development Studies", 3],
  ["HLTH 240", "Community Health", 3],
  ["NUTR 250", "Nutrition and Wellness", 3],
  ["AGRI 260", "Agriculture and Society", 3],
  ["TOUR 270", "Tourism and Hospitality Fundamentals", 3],
  ["MEDA 280", "Media and Society", 3],
  ["PEAC 290", "Peace and Conflict Studies", 3],
  ["ANTH 110", "Introduction to Anthropology", 3],
  ["SOCI 210", "Social Research Methods", 3],
  ["SOCI 220", "Gender and Development", 3],
  ["POLI 110", "Introduction to Political Science", 3],
  ["POLI 210", "Comparative Politics", 3],
  ["IR 220", "International Relations Theory", 3],
  ["DIPL 230", "Diplomatic Practice", 3],
  ["LANG 110", "Academic Writing", 3],
  ["LANG 120", "Kiswahili Communication", 3],
  ["FREN 110", "French for Beginners", 3],
  ["BIOL 110", "General Biology", 3],
  ["CHEM 110", "General Chemistry", 3],
  ["PHYS 110", "General Physics", 3],
  ["MATH 200", "Calculus III", 3],
  ["MATH 210", "Linear Algebra II", 3],
  ["MATH 220", "Ordinary Differential Equations", 3],
  ["MATH 310", "Real Analysis", 3],
  ["STAT 310", "Inferential Statistics", 3],
  ["ACCT 219", "Cost Accounting", 3],
  ["ACCT 301", "Financial Accounting II", 3],
  ["FINA 301", "Corporate Finance", 3],
  ["HRM 210", "Human Resource Management", 3],
  ["HRM 320", "Performance Management", 3],
  ["MKTG 320", "Digital Marketing", 3],
  ["MKTG 330", "Consumer Behaviour", 3],
  ["SUPP 210", "Supply Chain Management", 3],
  ["OPER 220", "Operations Management", 3],
  ["ENTR 310", "Business Planning", 3],
  ["ENTR 320", "Social Entrepreneurship", 3],
  ["HSMU 116", "Foundations of Health Systems Management", 3],
  ["HSMU 137", "Epidemiology and Demography", 3],
  ["NURS 110", "Foundations of Nursing", 3],
  ["PHAR 110", "Introduction to Pharmacy", 3],
  ["MLAB 110", "Laboratory Techniques", 3],
  ["CLIN 110", "Clinical Methods", 3],
  ["PUBH 210", "Public Health Principles", 3],
  ["NUTR 210", "Human Nutrition", 3],
  ["HOSP 110", "Introduction to Hospitality", 3],
  ["TOUR 110", "Tourism Principles", 3],
  ["THEO 051", "Introduction to Study of Theology", 3],
  ["THEO 060", "Christian Doctrines", 3],
  ["CRIM 110", "Introduction to Criminology", 3],
  ["CRIM 210", "Security Management", 3],
  ["JOUR 110", "Introduction to Journalism", 3],
  ["JOUR 210", "Media Ethics", 3],
  ["EDUC 110", "Foundations of Education", 3],
  ["EDUC 210", "Curriculum Studies", 3],
  ["AGRI 110", "Principles of Agriculture", 3],
  ["ENVS 210", "Environmental Management", 3],
  ["GIS 220", "Geographic Information Systems", 3],
  ["SOFT 410", "Software Testing", 3],
  ["SOFT 420", "DevOps Fundamentals", 3],
  ["NETW 410", "Network Administration", 3],
  ["NETW 420", "Wireless Networks", 3],
  ["DBMS 410", "Advanced Databases", 3],
  ["DBMS 420", "Big Data Technologies", 3],
  ["AI 410", "Machine Learning Basics", 3],
  ["AI 420", "Neural Networks", 3],
  ["SEC 410", "Ethical Hacking Fundamentals", 3],
  ["SEC 420", "Digital Forensics", 3],
  ["UX 310", "User Experience Design", 3],
  ["UX 320", "Interface Prototyping", 3],
  ["IOT 330", "Internet of Things", 3],
  ["BC 340", "Blockchain Fundamentals", 3],
  ["BC 350", "Smart Contracts", 3]
];

function expandAllCurricula(minUnits = 95) {
  for (const progName of Object.keys(CURRICULUM)) {
    const terms = CURRICULUM[progName];
    const seen = new Set();
    const ordered = [];
    for (const t of ['1', '2', '3']) {
      for (const row of (terms[t] || [])) {
        const code = String(row[0] || '').trim();
        const key = code.toUpperCase();
        if (!code || seen.has(key)) continue;
        seen.add(key);
        ordered.push([code, row[1] || code, row[2] || 3]);
      }
    }
    // Pad from shared pool
    for (const row of SHARED_UNIT_POOL) {
      if (ordered.length >= minUnits) break;
      const key = String(row[0]).toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push([row[0], row[1], row[2] || 3]);
    }
    // Pad with programme-specific electives if still short
    let n = 1;
    const prefix = progName.replace(/[^A-Za-z]/g, ' ').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 4).toUpperCase() || 'ELCT';
    while (ordered.length < minUnits) {
      const code = `${prefix} ${500 + n}`;
      const key = code.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push([code, `Programme Elective ${n}`, 3]);
      }
      n += 1;
      if (n > 200) break;
    }
    // Redistribute evenly across trimesters 1/2/3 for catalogue grouping
    const chunk = Math.ceil(ordered.length / 3);
    CURRICULUM[progName] = {
      '1': ordered.slice(0, chunk),
      '2': ordered.slice(chunk, chunk * 2),
      '3': ordered.slice(chunk * 2)
    };
  }
}
expandAllCurricula(95);


const LECTURERS = ["Mr. Evanson Nyairo", "Mr. Robert M. Murungi", "Ms. Catherine Mueni", "Mr. Timothy Anondo", "Mr. Patrick Kinoti", "Mr. Daniel Muendo", "Dr. Jecton Tocho", "Dr. Lawrence Mwenda", "Dr. Nicholas Mwenda", "Dr. Josephat Kigo", "Dr. Nicholas Riungu", "Mr. Omwando Nyakoni", "Miss Florence Adhiambo", "Miss Faith Mwangi", "Mr. George Okello", "Mr. Vincent Mbandu", "Ms. Grace Mwangi", "Mr. Geoffrey Vundi", "Prof. Paul Maku", "Mr. Edgar Mwangi", "Madam Ann Mukiri", "Ms. Jenu John", "Mr. Peter Waweru", "Dr. David Mushimiyimana", "Mr. David Kaje", "Mr. Joel Charo", "Ms. Julie Kiarie", "Ms. Edith Murugi", "Ms. Winnie Kirimi", "Mr. Kimathi Murungi", "Mr. James Mawira", "Mr. John Mwabu Kirimi", "Mr. Patrick Mudambi", "Mr. Kelvin Kimathi", "Mr. Boaz Wamwai"];

function nowIso() {
  return new Date().toISOString();
}

async function loadDb() {
  try {
    const raw = await fs.readFile(dbFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { students: [], courses: [], registrations: [], sessions: [], settings: {} };
  }
}

async function saveDb() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbFile, JSON.stringify(db, null, 2), 'utf8');
}

const DEFAULT_PASSWORD = '123456';
const defaultPasswordHash = hash(DEFAULT_PASSWORD);

const SEED_STUDENTS = [
  { number: 'CIS-1-3170-3/2024', name: 'Jonkuch Sabit Mer', programme: 'Bachelor of Science in Computer Information Systems', year: 3, issue: '2024-09-01', expiry: '2027-12-31' },
  { number: 'CIS-0-1403-3/2024', name: 'Peris Muthoni', programme: 'Diploma in Computer Information Systems', year: 3, issue: '2024-09-01', expiry: '2028-12-31' },
  { number: 'SWD-0-2280-2/2024', name: 'Agnes Malayeki', programme: 'Diploma in Social Work and Community Development Level 6', year: 3, issue: '2024-05-01', expiry: '2028-12-31' },
  { number: 'HSM-1-3016-3/2024', name: 'Molly Auma', programme: 'Bachelor of Science in Health Systems Management', year: 3, issue: '2024-09-01', expiry: '2028-12-31' },
  { number: 'CIS-1-7192-3/2024', name: 'Mariangel Achieng', programme: 'Bachelor of Science in Computer Information Systems', year: 3, issue: '2024-09-01', expiry: '2028-12-31' },
  { number: 'CIS-1-9041-2/2024', name: 'Veronicah Achieng', programme: 'Bachelor of Science in Computer Information Systems', year: 3, issue: '2024-05-01', expiry: '2028-12-31' },
  { number: 'BIR-1-8536-3/2025', name: 'Jasmine Awan', programme: 'Bachelor of Arts in International Relations', year: 2, issue: '2025-09-01', expiry: '2028-12-31' },
  { number: 'BHM-1-5631-3/2024', name: 'Teresia Wambui', programme: 'Bachelor of Science in Hospitality Management', year: 3, issue: '2024-05-01', expiry: '2028-12-31' },
  { number: 'CIS-0-2397-1/2025', name: 'Jesica Jepleting', programme: 'Diploma in Computer Information Systems', year: 2, issue: '2025-05-01', expiry: '2028-12-31' },
  { number: 'BIR-1-8545-3/2025', name: 'Mayer Daphine', programme: 'Bachelor of Arts in International Relations', year: 2, issue: '2025-09-01', expiry: '2028-12-31' },
  { number: 'BEH-1-3631-3/2024', name: 'Sharley Nyumu', programme: 'Bachelor of Science in Environmental Health', year: 3, issue: '2024-09-01', expiry: '2028-12-31' },
  { number: 'SWD-0-1983-1/2025', name: 'Faith Kwamboka', programme: 'Bachelor of Social Work and Community Development Level 6', year: 2, issue: '2025-09-01', expiry: '2028-12-31' }
];

function emailForReg(reg) {
  return `${reg.replace(/[^a-zA-Z0-9]/g, '.').toLowerCase()}@students.kemu.ac.ke`;
}

function entryYearFromIssue(issue) {
  if (!issue) return 2024;
  return Number(String(issue).slice(0, 4)) || 2024;
}

function entryMeta(issueDate) {
  const issue = String(issueDate || '2024-09-01');
  const year = Number(issue.slice(0, 4)) || 2024;
  const month = Number(issue.slice(5, 7)) || 9;
  // Trimester 1: Jan–Apr, 2: May–Aug, 3: Sep–Dec
  let tri = 3;
  if (month <= 4) tri = 1;
  else if (month <= 8) tri = 2;
  return { year, tri };
}

/** Build trimester list from entry through Trimester 3, 2026 (current). */
function semestersForStudent(issueDate) {
  const { year: startYear, tri: startTri } = entryMeta(issueDate);
  const list = [];
  const endYear = 2026;
  const endTri = 3;
  for (let y = startYear; y <= endYear; y++) {
    for (let t = 1; t <= 3; t++) {
      if (y === startYear && t < startTri) continue;
      if (y === endYear && t > endTri) continue;
      list.push({
        key: `T${t}-${y}`,
        label: `Trimester ${t}, ${y}`,
        academicYear: String(y),
        trimester: t
      });
    }
  }
  return list;
}

function feeRates(programme) {
  // tuitionPerUnit: charged per registered unit; other lines are fixed per trimester
  const p = (programme || '').toLowerCase();
  if (p.includes('phd') || p.includes('doctor')) {
    return { tuitionPerUnit: 12000, registration: 5000, library: 3000, medical: 2500, activity: 1500, exam: 5000 };
  }
  if (p.includes('master') || p.includes('msc') || p.includes('m.ed') || p.includes('m.a') || p.includes('mph')) {
    return { tuitionPerUnit: 10000, registration: 4000, library: 2500, medical: 2000, activity: 1500, exam: 4000 };
  }
  if (p.includes('diploma') || p.includes('certificate')) {
    return { tuitionPerUnit: 4500, registration: 2500, library: 1500, medical: 1500, activity: 1000, exam: 2000 };
  }
  if (p.includes('pharmacy') || p.includes('medicine') || p.includes('mbchb') || p.includes('nursing') || p.includes('clinical') || p.includes('medical laboratory')) {
    return { tuitionPerUnit: 11000, registration: 4500, library: 2500, medical: 3000, activity: 1500, exam: 5000 };
  }
  if (p.includes('computer') || p.includes('information systems') || p.includes('software') || p.includes('cyber') || p.includes('blockchain') || p.includes('artificial') || p.includes('data science') || p.includes('bbit') || p.includes('robotics')) {
    return { tuitionPerUnit: 8500, registration: 3000, library: 2000, medical: 2000, activity: 1500, exam: 3000 };
  }
  if (p.includes('business') || p.includes('commerce') || p.includes('hospitality') || p.includes('tourism') || p.includes('economics')) {
    return { tuitionPerUnit: 7500, registration: 3000, library: 2000, medical: 2000, activity: 1500, exam: 2500 };
  }
  if (p.includes('health systems')) {
    return { tuitionPerUnit: 9000, registration: 3500, library: 2000, medical: 2500, activity: 1500, exam: 3500 };
  }
  return { tuitionPerUnit: 8000, registration: 3000, library: 2000, medical: 2000, activity: 1500, exam: 3000 };
}

function unitsForFeeTerm(student, sem, isCurrent) {
  // Current trimester: bill only units the student has registered
  if (isCurrent) {
    const regs = (db.registrations || []).filter(r => r.student_id === student.id && r.status === 'registered');
    return regs.length;
  }
  // Past trimesters: use units recorded on provisional results for that semester, else default 6
  try {
    const results = buildResults(student);
    const match = (results.semesters || []).find(s => s.semester === sem.label);
    if (match && Array.isArray(match.units) && match.units.length) return match.units.length;
  } catch (_) { /* ignore */ }
  return 6;
}

function buildFeeStatement(student) {
  const rates = feeRates(student.programme);
  const trimesters = semestersForStudent(student.issue_date);
  const payments = student.fee_payments || {};
  const fixed = rates.registration + rates.library + rates.medical + rates.activity + rates.exam;
  const items = trimesters.map((sem, i) => {
    const isCurrent = i === trimesters.length - 1;
    const unitCount = unitsForFeeTerm(student, sem, isCurrent);
    const tuition = unitCount * rates.tuitionPerUnit;
    // Current term with 0 units registered: only fixed charges (or 0 total if you prefer — we still show fixed)
    const amount = tuition + (unitCount > 0 || !isCurrent ? fixed : 0);
    const payment = payments[sem.key] || {};
    let amountPaid = 0;
    if (typeof payment.amount_paid === 'number' && payment.amount_paid > 0) {
      amountPaid = Math.min(amount, payment.amount_paid);
    } else if (payment.paid === true) {
      amountPaid = amount;
    } else if (payment.paid !== false && !isCurrent) {
      amountPaid = amount; // past terms default cleared
    }
    const balance = Math.max(0, amount - amountPaid);
    const termPaid = amount <= 0 || balance <= 0;
    let status;
    if (amount <= 0) status = 'No units registered';
    else if (termPaid) status = payment.method ? `Cleared (${payment.method})` : 'Cleared';
    else if (amountPaid > 0) status = `Partial (${payment.method || '—'})`;
    else status = 'Outstanding';
    return {
      key: sem.key,
      semester: sem.label,
      academicYear: sem.academicYear,
      units: unitCount,
      tuition_per_unit: rates.tuitionPerUnit,
      tuition,
      registration: unitCount > 0 || !isCurrent ? rates.registration : 0,
      library: unitCount > 0 || !isCurrent ? rates.library : 0,
      medical: unitCount > 0 || !isCurrent ? rates.medical : 0,
      activity: unitCount > 0 || !isCurrent ? rates.activity : 0,
      examination: unitCount > 0 || !isCurrent ? rates.exam : 0,
      total: amount,
      amount_paid: amountPaid,
      paid: termPaid,
      balance,
      status,
      payment_method: payment.method || null,
      paid_at: payment.paid_at || null
    };
  });
  const totalBilled = items.reduce((s, x) => s + x.total, 0);
  const totalPaid = items.reduce((s, x) => s + (x.amount_paid || 0), 0);
  const balance = Math.max(0, totalBilled - totalPaid);
  const current = items[items.length - 1];
  return {
    currency: 'KES',
    generatedAt: nowIso(),
    periodNote: `Fees are charged per registered unit (KES ${rates.tuitionPerUnit.toLocaleString()} tuition/unit) plus fixed trimester charges. Current term is billed for the units you select in Course Registration.`,
    items,
    summary: {
      totalBilled,
      totalPaid,
      balance,
      semesters: items.length,
      tuitionPerUnit: rates.tuitionPerUnit,
      currentUnits: current?.units || 0,
      currentTotal: current?.total || 0
    }
  };
}

const GRADE_POOL = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
function pickGrade(seed) {
  const n = Math.abs(Number(seed) || 0);
  return GRADE_POOL[n % GRADE_POOL.length];
}

function courseCodesForProgramme(programme) {
  const p = (programme || '').trim();
  const collect = (key) => {
    const all = [];
    for (const t of ['1', '2', '3']) {
      for (const row of (CURRICULUM[key][t] || [])) all.push([row[0], row[1]]);
    }
    return all;
  };
  if (CURRICULUM[p]) return collect(p);
  const pl = p.toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  // exact case-insensitive
  let key = PROGRAMME_LIST.find(k => k.toLowerCase() === pl || k.toLowerCase() === p.toLowerCase());
  // includes either way
  if (!key) key = PROGRAMME_LIST.find(k => pl.includes(k.toLowerCase()) || k.toLowerCase().includes(pl));
  // token overlap (handles "BSc. Information Science" vs "Diploma in Information Science")
  if (!key) {
    const tokens = pl.split(' ').filter(t => t.length > 3 && !['bachelor','science','diploma','degree','master'].includes(t));
    let best = null, bestScore = 0;
    for (const k of PROGRAMME_LIST) {
      const kl = k.toLowerCase();
      const score = tokens.filter(t => kl.includes(t)).length;
      if (score > bestScore) { bestScore = score; best = k; }
    }
    if (bestScore >= 2) key = best;
  }
  if (key) return collect(key);
  return [
    ['COMM 111', 'Communication Skills'], ['THEO 111', 'Christian Beliefs'],
    ['HSCI 225', 'HIV/AIDS'], ['ENVI 201', 'Environmental Science'],
    ['SOST 131', 'Introduction to Sociology'], ['MATH 102', 'Foundation of Mathematics']
  ];
}

function isDiplomaProgramme(programme) {
  const p = String(programme || '').toLowerCase();
  return p.includes('diploma') || p.includes('certificate') || p.includes('level 6') && p.includes('diploma');
}

function targetCompletedUnits(programme) {
  // Degree programmes: 52 units expected completed; diploma: 45
  return isDiplomaProgramme(programme) ? 45 : 52;
}

function minGraduationUnits(programme) {
  // Minimum completed units required before graduation can be considered
  return 32;
}

function buildResults(student) {
  const PER_SEM = 6; // HARD CAP — never show more than 6 units on a result slip semester
  const semesters = semestersForStudent(student.issue_date);
  const rawCodes = courseCodesForProgramme(student.programme) || [];
  // Unique codes only (preserve order)
  const seen = new Set();
  const codes = [];
  for (const row of rawCodes) {
    const code = String(row[0] || '').trim();
    const key = code.toUpperCase();
    if (!code || seen.has(key)) continue;
    seen.add(key);
    codes.push([code, row[1] || code, Number(row[2]) || 3]);
  }
  const past = semesters.slice(0, -1); // exclude current trimester
  const TARGET = targetCompletedUnits(student.programme);

  let remaining = TARGET;
  let codeIdx = 0;
  const completedMap = new Map();
  const results = [];

  for (let si = 0; si < past.length; si++) {
    if (remaining <= 0 || codeIdx >= codes.length) break;
    const sem = past[si];
    const count = Math.min(PER_SEM, remaining, codes.length - codeIdx);
    if (count < 1) break;

    const units = [];
    for (let ci = 0; ci < count; ci++) {
      const pair = codes[codeIdx++];
      const sn = student.student_number || 'x';
      const grade = pickGrade(sn.charCodeAt(ci % sn.length) + si * 7 + ci * 13 + codeIdx);
      const points = { A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0 }[grade] || 2.0;
      const unit = {
        code: pair[0],
        title: pair[1],
        credits: pair[2] || 3,
        grade,
        points
      };
      units.push(unit);
      const key = String(unit.code).toUpperCase();
      if (!completedMap.has(key)) {
        completedMap.set(key, { code: unit.code, title: unit.title, credits: unit.credits });
      }
    }

    // Absolute safety: never more than 6 rows on the slip
    const slipUnits = units.slice(0, PER_SEM);
    remaining -= slipUnits.length;
    const totalCredits = slipUnits.reduce((s, u) => s + u.credits, 0);
    const gpa = totalCredits
      ? Math.round((slipUnits.reduce((s, u) => s + u.points * u.credits, 0) / totalCredits) * 100) / 100
      : 0;
    results.push({
      semester: sem.label,
      academicYear: sem.academicYear,
      units: slipUnits,
      gpa,
      credits: totalCredits
    });
  }

  const allCredits = results.reduce((s, r) => s + r.credits, 0);
  const totalUnits = results.reduce((s, r) => s + (r.units?.length || 0), 0);
  const cgpa = allCredits
    ? Math.round((results.reduce((s, r) => s + r.gpa * r.credits, 0) / allCredits) * 100) / 100
    : 0;
  const completedUnits = Array.from(completedMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  const programmeType = isDiplomaProgramme(student.programme) ? 'diploma' : 'degree';
  const finishTarget = TARGET;
  const gradMin = minGraduationUnits(student.programme);

  return {
    generatedAt: nowIso(),
    note: `Provisional results: ${totalUnits} of ${finishTarget} units for this ${programmeType} (minimum ${gradMin} for graduation consideration). Each semester shows exactly ${PER_SEM} units (or fewer on the final term). Completed units cannot be selected again.`,
    semesters: results,
    completedUnits,
    completedCodes: completedUnits.map(u => u.code),
    summary: {
      cgpa,
      totalCredits: allCredits,
      totalUnits,
      unitsRequired: finishTarget,
      unitsRemaining: Math.max(0, finishTarget - totalUnits),
      minGraduationUnits: gradMin,
      eligibleToGraduate: totalUnits >= finishTarget,
      programmeType,
      semestersCompleted: results.length,
      catalogueSize: codes.length,
      unitsPerSemester: PER_SEM
    }
  };
}


async function initializeDatabase() {
  await fs.mkdir(dataDir, { recursive: true });
  db = await loadDb();
  if (!db.settings) db.settings = {};
  if (!db.settings.admin_password_hash) {
    db.settings.admin_password_hash = hash(ADMIN_PASSWORD);
  }

  // Seed curriculum units — one catalogue entry per unique course CODE (no programme duplicates)
  let lectIdx = 0;
  const seenCodes = new Set();
  for (const [progName, trimesters] of Object.entries(CURRICULUM)) {
    for (const t of ['1', '2', '3']) {
      for (const row of (trimesters[t] || [])) {
        const [code, title, credits] = row;
        const codeKey = String(code || '').trim().toUpperCase();
        if (!codeKey || seenCodes.has(codeKey)) continue;
        seenCodes.add(codeKey);
        const lecturer = LECTURERS[lectIdx % LECTURERS.length];
        lectIdx += 1;
        let course = db.courses.find(c => String(c.code || '').toUpperCase() === codeKey);
        if (!course) {
          db.courses.push({
            id: createId(),
            code: String(code).trim(),
            title,
            lecturer,
            credits: credits || 3,
            capacity: 60,
            semester: `Trimester ${t}`,
            trimester: Number(t),
            programme: null, // shared unit — not tied to one programme
            is_active: true,
            created_at: nowIso()
          });
        } else {
          course.title = title || course.title;
          course.lecturer = course.lecturer || lecturer;
          course.credits = credits || course.credits || 3;
          course.is_active = true;
          // clear programme lock so unit is available across programmes
          course.programme = null;
        }
      }
    }
  }

  // Collapse any leftover duplicate codes (keep earliest, re-point registrations)
  const byCode = new Map();
  const removeIds = new Set();
  for (const c of db.courses) {
    const key = String(c.code || '').toUpperCase();
    if (!key) continue;
    if (!byCode.has(key)) {
      byCode.set(key, c);
      c.programme = null;
    } else {
      const keep = byCode.get(key);
      for (const r of db.registrations || []) {
        if (r.course_id === c.id) r.course_id = keep.id;
      }
      removeIds.add(c.id);
    }
  }
  if (removeIds.size) {
    db.courses = db.courses.filter(c => !removeIds.has(c.id));
  }



  if (!db.students.find(s => s.email === 'amara.njeri@students.kemu.ac.ke')) {
    db.students.push({
      id: createId(),
      student_number: 'KEMU/IS/2024/0142',
      full_name: 'Amara Njeri',
      email: 'amara.njeri@students.kemu.ac.ke',
      programme: 'Diploma in Information Science',
      year_level: 3,
      campus: 'Main Campus',
      password_hash: defaultPasswordHash,
      issue_date: '2024-09-01',
      expiry_date: '2027-12-31',
      created_at: nowIso()
    });
  }

  for (const s of SEED_STUDENTS) {
    const email = emailForReg(s.number);
    let student = db.students.find(x => x.student_number === s.number || x.email === email);
    if (student) {
      student.full_name = s.name;
      student.programme = s.programme;
      student.year_level = s.year;
      student.password_hash = defaultPasswordHash;
      student.issue_date = s.issue;
      student.expiry_date = s.expiry;
      student.campus = 'Main Campus';
    } else {
      db.students.push({
        id: createId(),
        student_number: s.number,
        full_name: s.name,
        email,
        programme: s.programme,
        year_level: s.year,
        campus: 'Main Campus',
        password_hash: defaultPasswordHash,
        issue_date: s.issue,
        expiry_date: s.expiry,
        created_at: nowIso()
      });
    }
  }

  const jon = db.students.find(s => s.student_number === 'CIS-1-3170-3/2024');
  if (jon) {
    const hasReg = db.registrations.some(r => r.student_id === jon.id && r.status === 'registered');
    if (!hasReg) {
      for (const code of ['BIS 312', 'BIS 315', 'BIS 321', 'COM 304']) {
        const course = db.courses.find(c => c.code === code);
        if (course && !db.registrations.some(r => r.student_id === jon.id && r.course_id === course.id)) {
          db.registrations.push({
            id: createId(),
            student_id: jon.id,
            course_id: course.id,
            status: 'registered',
            registered_at: nowIso(),
            withdrawn_at: null
          });
        }
      }
    }
  }

  for (const s of db.students) {
    if (!s.password_hash) s.password_hash = defaultPasswordHash;
  }

  await saveDb();
  databaseReady = true;
  console.log(`Local database ready at ${dbFile} (${db.students.length} students, ${db.courses.length} courses)`);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('Request body must be valid JSON'), { httpStatus: 400 }); }
}

function identityForRequest(req) {
  const token = parseCookies(req).webdev_app_session;
  if (!token || !databaseReady) return null;
  const session = db.sessions.find(s => s.token_hash === hash(token) && new Date(s.expires_at) > new Date());
  if (!session) return null;
  const identity = { openId: session.open_id, name: session.name, email: normalizeEmail(session.email) };
  const isAdmin =
    identity.openId === 'admin' ||
    (adminEmail && identity.email === adminEmail) ||
    identity.email === 'admin@kemu.ac.ke';
  if (isAdmin) {
    return { ...identity, role: 'admin', studentId: null, studentNumber: null };
  }
  let student = db.students.find(s => normalizeEmail(s.email) === identity.email);
  if (!student && identity.openId) {
    student = db.students.find(s => s.student_number === identity.openId);
  }
  const role = student ? 'student' : 'guest';
  return {
    ...identity,
    role,
    studentId: student?.id || null,
    studentNumber: student?.student_number || null
  };
}

function requireIdentity(req, res) {
  const identity = identityForRequest(req);
  if (!identity) {
    json(res, 401, { error: 'authentication_required', loginUrl: '/api/auth/login' });
    return null;
  }
  if (identity.role === 'guest') {
    json(res, 403, { error: 'account_not_registered', message: 'Your account is not linked to a KeMU student or administrator record yet.' });
    return null;
  }
  return identity;
}

function requireAdmin(req, res) {
  const identity = requireIdentity(req, res);
  if (!identity) return null;
  if (identity.role !== 'admin') {
    json(res, 403, { error: 'admin_required', message: 'Administrator access is restricted.' });
    return null;
  }
  return identity;
}

async function handleLocalLogin(req, res) {
  if (!databaseReady) {
    json(res, 503, { error: 'database_starting' });
    return;
  }
  const body = await readBody(req);
  const studentNumber = safe(body.student_number || body.username || body.reg_no);
  const password = String(body.password ?? '');
  if (!studentNumber || !password) {
    json(res, 400, { error: 'missing_credentials', message: 'Registration number (or admin) and password are required.' });
    return;
  }

  // Admin login: username "admin" (or admin email) + admin password
  const loginKey = studentNumber.toLowerCase();
  const adminHash = db.settings?.admin_password_hash || hash(ADMIN_PASSWORD);
  const isAdminLogin =
    (loginKey === ADMIN_USERNAME || loginKey === adminEmail || loginKey === 'admin@kemu.ac.ke') &&
    hash(password) === adminHash;

  if (isAdminLogin) {
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.sessions = db.sessions.filter(s => new Date(s.expires_at) > new Date());
    db.sessions.push({
      token_hash: hash(sessionToken),
      open_id: 'admin',
      name: 'Portal Administrator',
      email: adminEmail,
      expires_at: expires,
      created_at: nowIso()
    });
    await saveDb();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': cookie('webdev_app_session', sessionToken, { maxAge: 2592000, secure: false, sameSite: 'Lax' })
    });
    res.end(JSON.stringify({ ok: true, role: 'admin', name: 'Portal Administrator' }));
    return;
  }

  const student = db.students.find(s => s.student_number === studentNumber);
  if (!student || !student.password_hash || student.password_hash !== hash(password)) {
    json(res, 401, { error: 'invalid_credentials', message: 'Invalid registration number or password.' });
    return;
  }
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions = db.sessions.filter(s => new Date(s.expires_at) > new Date());
  db.sessions.push({
    token_hash: hash(sessionToken),
    open_id: student.student_number,
    name: student.full_name,
    email: normalizeEmail(student.email),
    expires_at: expires,
    created_at: nowIso()
  });
  await saveDb();
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': cookie('webdev_app_session', sessionToken, { maxAge: 2592000, secure: false, sameSite: 'Lax' })
  });
  res.end(JSON.stringify({ ok: true, student_number: student.student_number, name: student.full_name }));
}

async function handleLogout(req, res) {
  const token = parseCookies(req).webdev_app_session;
  if (token && databaseReady) {
    db.sessions = db.sessions.filter(s => s.token_hash !== hash(token));
    await saveDb();
  }
  const headers = { 'Set-Cookie': cookie('webdev_app_session', '', { maxAge: 0, secure: false, sameSite: 'Lax' }) };
  if (req.method === 'GET') {
    res.writeHead(302, { ...headers, Location: '/' });
    res.end();
    return;
  }
  res.writeHead(204, headers);
  res.end();
}

function courseRowsForStudent(studentId) {
  const student = db.students.find(s => s.id === studentId);
  const progCodes = new Set(
    (student ? courseCodesForProgramme(student.programme) : []).map(x => String(x[0]).toUpperCase())
  );
  const common = new Set(['COMM 111', 'THEO 111', 'HSCI 225', 'ENVI 201', 'SOST 131', 'MATH 102']);
  return db.courses
    .filter(c => c.is_active)
    .map(c => {
      const enrolled = db.registrations.filter(r => r.course_id === c.id && r.status === 'registered').length;
      const own = db.registrations.find(r => r.course_id === c.id && r.student_id === studentId && r.status === 'registered');
      const codeKey = String(c.code || '').toUpperCase();
      const forProgramme = progCodes.size === 0 || progCodes.has(codeKey) || common.has(codeKey);
      return {
        id: c.id,
        code: c.code,
        title: c.title,
        lecturer: c.lecturer,
        credits: c.credits,
        capacity: c.capacity,
        semester: c.semester,
        enrolled_count: enrolled,
        registration_id: own?.id || null,
        registered: Boolean(own),
        seats_remaining: Math.max(0, c.capacity - enrolled),
        for_programme: forProgramme
      };
    })
    .filter(c => c.registered || c.for_programme)
    .sort((a, b) => a.code.localeCompare(b.code));
}

function adminSnapshot() {
  const students = [...db.students].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  // One row per unique course code (no duplicates on admin portal)
  const seenCodes = new Set();
  const courses = db.courses
    .filter(c => {
      const key = String(c.code || '').toUpperCase();
      if (!key || seenCodes.has(key)) return false;
      seenCodes.add(key);
      return true;
    })
    .map(c => {
      const enrolled = db.registrations.filter(r => r.course_id === c.id && r.status === 'registered').length;
      return { ...c, enrolled_count: enrolled, seats_remaining: Math.max(0, c.capacity - enrolled) };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
  const registrations = db.registrations
    .filter(r => r.status === 'registered')
    .map(r => {
      const s = db.students.find(x => x.id === r.student_id);
      const c = db.courses.find(x => x.id === r.course_id);
      return {
        id: r.id,
        registered_at: r.registered_at,
        student_id: r.student_id,
        student_name: s?.full_name,
        student_number: s?.student_number,
        course_id: r.course_id,
        code: c?.code,
        title: c?.title
      };
    })
    .sort((a, b) => (b.registered_at || '').localeCompare(a.registered_at || ''));
  return {
    students,
    courses,
    lecturers: LECTURERS,
    programmes: PROGRAMME_LIST,
    curriculum: CURRICULUM,
    registrations,
    summary: { students: students.length, courses: courses.length, registrations: registrations.length }
  };
}

function studentSnapshot(identity) {
  const student = db.students.find(s => s.id === identity.studentId);
  if (!student) throw Object.assign(new Error('Student profile was not found'), { httpStatus: 404 });
  const registrations = db.registrations
    .filter(r => r.student_id === identity.studentId && r.status === 'registered')
    .map(r => {
      const c = db.courses.find(x => x.id === r.course_id);
      return {
        id: r.id,
        registered_at: r.registered_at,
        course_id: r.course_id,
        code: c?.code,
        title: c?.title,
        lecturer: c?.lecturer,
        credits: c?.credits,
        capacity: c?.capacity
      };
    })
    .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  return {
    student: {
      id: student.id,
      student_number: student.student_number,
      full_name: student.full_name,
      email: student.email,
      programme: student.programme,
      year_level: student.year_level,
      campus: student.campus,
      issue_date: student.issue_date,
      expiry_date: student.expiry_date,
      date_of_birth: student.date_of_birth ?? null,
      age: student.age ?? null
    },
    registrations,
    courses: courseRowsForStudent(identity.studentId),
    fees: buildFeeStatement(student),
    results: buildResults(student)
  };
}

async function registerStudent(studentId, courseId) {
  const course = db.courses.find(c => c.id === courseId && c.is_active);
  if (!course) throw Object.assign(new Error('Course not found'), { httpStatus: 404 });
  const student = db.students.find(s => s.id === studentId);
  if (student) {
    const results = buildResults(student);
    const done = new Set((results.completedCodes || []).map(c => String(c).toUpperCase()));
    if (done.has(String(course.code || '').toUpperCase())) {
      throw Object.assign(new Error('This unit has already been completed and cannot be registered again'), { httpStatus: 409 });
    }
  }
  const enrolled = db.registrations.filter(r => r.course_id === courseId && r.status === 'registered').length;
  let existing = db.registrations.find(r => r.student_id === studentId && r.course_id === courseId);
  if (enrolled >= course.capacity && (!existing || existing.status !== 'registered')) {
    throw Object.assign(new Error('Course is full'), { httpStatus: 409 });
  }
  if (existing) {
    existing.status = 'registered';
    existing.registered_at = nowIso();
    existing.withdrawn_at = null;
  } else {
    db.registrations.push({
      id: createId(),
      student_id: studentId,
      course_id: courseId,
      status: 'registered',
      registered_at: nowIso(),
      withdrawn_at: null
    });
  }
  await saveDb();
}

async function withdrawRegistration(studentId, courseId) {
  const reg = db.registrations.find(r => r.student_id === studentId && r.course_id === courseId && r.status === 'registered');
  if (!reg) throw Object.assign(new Error('Active registration not found'), { httpStatus: 404 });
  reg.status = 'withdrawn';
  reg.withdrawn_at = nowIso();
  await saveDb();
}

async function api(req, res, url) {
  const pathname = url.pathname;
  if (pathname === '/api/health') {
    json(res, databaseReady ? 200 : 503, { ok: databaseReady, database: databaseReady ? 'ready' : 'starting', storage: 'local-file' });
    return;
  }
  if (pathname === '/api/auth/local-login' && req.method === 'POST') return handleLocalLogin(req, res);
  if (pathname === '/api/auth/login' && req.method === 'GET') {
    json(res, 503, { error: 'oauth_not_configured', message: 'Use registration number login on the portal page.' });
    return;
  }
  if (pathname === '/api/auth/logout' && ['GET', 'POST'].includes(req.method)) return handleLogout(req, res);
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const identity = identityForRequest(req);
    json(res, 200, { authenticated: Boolean(identity), identity });
    return;
  }
  if (!databaseReady) { json(res, 503, { error: 'database_starting' }); return; }
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    json(res, 200, identity.role === 'admin' ? { role: 'admin', identity, ...adminSnapshot() } : { role: 'student', identity, ...studentSnapshot(identity) });
    return;
  }
  if (pathname === '/api/registrations' && req.method === 'POST') {
    const identity = requireIdentity(req, res);
    if (!identity || identity.role !== 'student') { if (identity) json(res, 403, { error: 'student_required' }); return; }
    const body = await readBody(req);
    await registerStudent(identity.studentId, safe(body.course_id));
    json(res, 201, { ok: true, ...studentSnapshot(identity) });
    return;
  }
  if (pathname.startsWith('/api/registrations/') && req.method === 'DELETE') {
    const identity = requireIdentity(req, res);
    if (!identity || identity.role !== 'student') { if (identity) json(res, 403, { error: 'student_required' }); return; }
    await withdrawRegistration(identity.studentId, pathname.split('/').pop());
    json(res, 200, { ok: true, ...studentSnapshot(identity) });
    return;
  }
  if (pathname === '/api/admin/students' && req.method === 'POST') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    const fullName = safe(body.full_name);
    const email = normalizeEmail(body.email);
    const programme = safe(body.programme);
    const campus = safe(body.campus, 'Main Campus');
    const yearLevel = Math.min(6, Math.max(1, Number(body.year_level) || 1));
    const studentNumber = safe(body.student_number);
    const password = safe(body.password, DEFAULT_PASSWORD);
    if (!fullName || !email || !programme || !studentNumber) throw Object.assign(new Error('full_name, email, programme and student_number are required'), { httpStatus: 400 });
    if (db.students.some(s => s.student_number === studentNumber || s.email === email)) {
      throw Object.assign(new Error('Student number or email already exists'), { httpStatus: 409 });
    }
    const age = body.age !== undefined && body.age !== '' ? Math.min(100, Math.max(1, Number(body.age) || 0)) || null : null;
    const dateOfBirth = body.date_of_birth ? safe(body.date_of_birth) || null : null;
    db.students.push({
      id: createId(),
      student_number: studentNumber,
      full_name: fullName,
      email,
      programme,
      year_level: yearLevel,
      campus,
      password_hash: hash(password),
      issue_date: body.issue_date || null,
      expiry_date: body.expiry_date || null,
      date_of_birth: dateOfBirth,
      age,
      fee_payments: {},
      created_at: nowIso()
    });
    await saveDb();
    json(res, 201, { ok: true, ...adminSnapshot() });
    return;
  }
  if (pathname === '/api/admin/courses' && req.method === 'POST') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    const code = safe(body.code);
    const title = safe(body.title);
    const lecturer = safe(body.lecturer);
    let trimester = Number(body.trimester) || 0;
    if (![1,2,3].includes(trimester)) {
      const m = String(body.semester || '').match(/([123])/);
      trimester = m ? Number(m[1]) : 3;
    }
    const semester = `Trimester ${trimester}`;
    const programme = safe(body.programme, '') || null;
    const credits = Math.min(12, Math.max(1, Number(body.credits) || 3));
    const capacity = Math.min(500, Math.max(1, Number(body.capacity) || 60));
    if (!code || !title || !lecturer) throw Object.assign(new Error('code, title and lecturer are required'), { httpStatus: 400 });
    if (db.courses.some(c => c.code === code && String(c.programme || '') === String(programme || ''))) {
      throw Object.assign(new Error('This unit code already exists for the selected programme'), { httpStatus: 409 });
    }
    db.courses.push({
      id: createId(), code, title, lecturer, credits, capacity, semester, trimester, programme, is_active: true, created_at: nowIso()
    });
    await saveDb();
    json(res, 201, { ok: true, ...adminSnapshot() });
    return;
  }

  if (pathname.startsWith('/api/admin/courses/') && req.method === 'PATCH') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const courseId = pathname.split('/').pop();
    const course = db.courses.find(c => c.id === courseId);
    if (!course) throw Object.assign(new Error('Course not found'), { httpStatus: 404 });
    const body = await readBody(req);
    if (body.programme !== undefined) course.programme = safe(body.programme, '') || null;
    if (body.code !== undefined) {
      const code = safe(body.code);
      const prog = course.programme || '';
      if (code && db.courses.some(c => c.id !== courseId && c.code === code && String(c.programme || '') === String(prog))) {
        throw Object.assign(new Error('This unit code already exists for the selected programme'), { httpStatus: 409 });
      }
      if (code) course.code = code;
    }
    if (body.title !== undefined) course.title = safe(body.title) || course.title;
    if (body.lecturer !== undefined) course.lecturer = safe(body.lecturer) || course.lecturer;
    if (body.trimester !== undefined || body.semester !== undefined) {
      let tr = Number(body.trimester);
      if (![1, 2, 3].includes(tr)) {
        const m = String(body.semester || course.semester || '').match(/([123])/);
        tr = m ? Number(m[1]) : (course.trimester || 3);
      }
      course.trimester = tr;
      course.semester = `Trimester ${tr}`;
    }
    if (body.credits !== undefined) course.credits = Math.min(12, Math.max(1, Number(body.credits) || course.credits));
    if (body.capacity !== undefined) course.capacity = Math.min(500, Math.max(1, Number(body.capacity) || course.capacity));
    if (body.is_active !== undefined) course.is_active = Boolean(body.is_active);
    await saveDb();
    json(res, 200, { ok: true, ...adminSnapshot() });
    return;
  }

  if (pathname.startsWith('/api/admin/courses/') && req.method === 'DELETE') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const courseId = pathname.split('/').pop();
    const idx = db.courses.findIndex(c => c.id === courseId);
    if (idx < 0) throw Object.assign(new Error('Course not found'), { httpStatus: 404 });
    db.courses.splice(idx, 1);
    db.registrations = db.registrations.filter(r => r.course_id !== courseId);
    await saveDb();
    json(res, 200, { ok: true, ...adminSnapshot() });
    return;
  }
  if (pathname === '/api/admin/registrations' && req.method === 'POST') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    await registerStudent(safe(body.student_id), safe(body.course_id));
    json(res, 201, { ok: true, ...adminSnapshot() });
    return;
  }
  if (pathname.startsWith('/api/admin/registrations/') && req.method === 'DELETE') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const registrationId = pathname.split('/').pop();
    const reg = db.registrations.find(r => r.id === registrationId && r.status === 'registered');
    if (!reg) throw Object.assign(new Error('Registration not found'), { httpStatus: 404 });
    reg.status = 'withdrawn';
    reg.withdrawn_at = nowIso();
    await saveDb();
    json(res, 200, { ok: true, ...adminSnapshot() });
    return;
  }

  // Change admin password
  if (pathname === '/api/admin/password' && req.method === 'POST') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    const currentPassword = String(body.current_password ?? '');
    const newPassword = String(body.new_password ?? '');
    if (!currentPassword || !newPassword) {
      throw Object.assign(new Error('current_password and new_password are required'), { httpStatus: 400 });
    }
    if (newPassword.length < 4) {
      throw Object.assign(new Error('New password must be at least 4 characters'), { httpStatus: 400 });
    }
    const adminHash = db.settings?.admin_password_hash || hash(ADMIN_PASSWORD);
    if (hash(currentPassword) !== adminHash) {
      throw Object.assign(new Error('Current password is incorrect'), { httpStatus: 401 });
    }
    if (!db.settings) db.settings = {};
    db.settings.admin_password_hash = hash(newPassword);
    await saveDb();
    json(res, 200, { ok: true, message: 'Admin password updated.' });
    return;
  }

  // Update student
  if (pathname.startsWith('/api/admin/students/') && req.method === 'PATCH') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const studentId = pathname.split('/').pop();
    const student = db.students.find(s => s.id === studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { httpStatus: 404 });
    const body = await readBody(req);
    if (body.full_name !== undefined) student.full_name = safe(body.full_name) || student.full_name;
    if (body.programme !== undefined) student.programme = safe(body.programme) || student.programme;
    if (body.campus !== undefined) student.campus = safe(body.campus, student.campus);
    if (body.year_level !== undefined) student.year_level = Math.min(6, Math.max(1, Number(body.year_level) || student.year_level));
    if (body.issue_date !== undefined) student.issue_date = body.issue_date || null;
    if (body.expiry_date !== undefined) student.expiry_date = body.expiry_date || null;
    if (body.age !== undefined) {
      student.age = body.age === '' || body.age === null ? null : Math.min(100, Math.max(1, Number(body.age) || 0)) || null;
    }
    if (body.date_of_birth !== undefined) {
      student.date_of_birth = body.date_of_birth ? safe(body.date_of_birth) || null : null;
    }
    if (body.email !== undefined) {
      const email = normalizeEmail(body.email);
      if (email && db.students.some(s => s.id !== studentId && s.email === email)) {
        throw Object.assign(new Error('Email already in use'), { httpStatus: 409 });
      }
      if (email) student.email = email;
    }
    if (body.student_number !== undefined) {
      const num = safe(body.student_number);
      if (num && db.students.some(s => s.id !== studentId && s.student_number === num)) {
        throw Object.assign(new Error('Registration number already in use'), { httpStatus: 409 });
      }
      if (num) student.student_number = num;
    }
    await saveDb();
    json(res, 200, { ok: true, ...adminSnapshot() });
    return;
  }

  // Delete student
  if (pathname.startsWith('/api/admin/students/') && req.method === 'DELETE') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const studentId = pathname.split('/').pop();
    const idx = db.students.findIndex(s => s.id === studentId);
    if (idx < 0) throw Object.assign(new Error('Student not found'), { httpStatus: 404 });
    db.students.splice(idx, 1);
    db.registrations = db.registrations.filter(r => r.student_id !== studentId);
    await saveDb();
    json(res, 200, { ok: true, ...adminSnapshot() });
    return;
  }

  // Reset student password
  if (pathname.match(/^\/api\/admin\/students\/[^/]+\/reset-password$/) && req.method === 'POST') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const parts = pathname.split('/');
    const studentId = parts[parts.length - 2];
    const student = db.students.find(s => s.id === studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { httpStatus: 404 });
    const body = await readBody(req);
    const newPassword = safe(body.password, DEFAULT_PASSWORD) || DEFAULT_PASSWORD;
    student.password_hash = hash(newPassword);
    await saveDb();
    json(res, 200, { ok: true, message: `Password reset for ${student.student_number}`, ...adminSnapshot() });
    return;
  }


  // Student: record payment for a trimester fee item
  if (pathname === '/api/fees/pay' && req.method === 'POST') {
    const identity = requireIdentity(req, res);
    if (!identity || identity.role !== 'student') { if (identity) json(res, 403, { error: 'student_required' }); return; }
    const body = await readBody(req);
    const termKey = safe(body.term_key || body.key);
    const method = safe(body.method || body.payment_method, 'M-Pesa');
    const allowed = ['M-Pesa', 'Bank transfer', 'Cash', 'Card'];
    if (!termKey) throw Object.assign(new Error('term_key is required'), { httpStatus: 400 });
    if (!allowed.includes(method)) throw Object.assign(new Error('Invalid payment method'), { httpStatus: 400 });
    const student = db.students.find(s => s.id === identity.studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { httpStatus: 404 });

    // Work out term total from current fee schedule
    const statement = buildFeeStatement(student);
    const item = (statement.items || []).find(x => x.key === termKey);
    if (!item) throw Object.assign(new Error('Fee item not found for that trimester'), { httpStatus: 404 });
    const termTotal = Number(item.total) || 0;
    const alreadyPaid = Number(item.amount_paid) || 0;
    const outstanding = Math.max(0, termTotal - alreadyPaid);
    if (outstanding <= 0) throw Object.assign(new Error('This trimester is already fully paid'), { httpStatus: 400 });

    // Amount: optional. If omitted or >= outstanding → full payment; else partial.
    let payAmount = Number(body.amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      payAmount = outstanding; // full remaining
    }
    payAmount = Math.round(payAmount * 100) / 100;
    if (payAmount > outstanding) payAmount = outstanding;

    if (!student.fee_payments) student.fee_payments = {};
    const prev = student.fee_payments[termKey] || {};
    const newPaid = Math.min(termTotal, alreadyPaid + payAmount);
    const fullyPaid = newPaid >= termTotal;
    student.fee_payments[termKey] = {
      paid: fullyPaid,
      amount_paid: newPaid,
      method,
      paid_at: nowIso(),
      recorded_by: 'student',
      last_payment_amount: payAmount,
      history: [...(prev.history || []), { amount: payAmount, method, at: nowIso() }]
    };
    await saveDb();
    const label = fullyPaid ? 'Full payment' : 'Partial payment';
    json(res, 200, {
      ok: true,
      message: `${label} of KES ${payAmount.toLocaleString()} recorded via ${method}`,
      ...studentSnapshot(identity)
    });
    return;
  }

  // Admin: clear / set fee balance for a student term (or all outstanding)
  if (pathname === '/api/admin/fees/clear' && req.method === 'POST') {
    const identity = requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    const studentId = safe(body.student_id);
    const termKey = safe(body.term_key || body.key); // optional — if empty, clear all outstanding
    const method = safe(body.method, 'Admin clearance');
    const student = db.students.find(s => s.id === studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { httpStatus: 404 });
    if (!student.fee_payments) student.fee_payments = {};
    const statement = buildFeeStatement(student);
    const targets = termKey
      ? statement.items.filter(i => i.key === termKey)
      : statement.items.filter(i => !i.paid);
    if (!targets.length) throw Object.assign(new Error('No outstanding fees to clear'), { httpStatus: 400 });
    for (const item of targets) {
      student.fee_payments[item.key] = { paid: true, method, paid_at: nowIso(), recorded_by: 'admin' };
    }
    await saveDb();
    json(res, 200, { ok: true, message: `Cleared ${targets.length} trimester(s)`, ...adminSnapshot() });
    return;
  }

  json(res, 404, { error: 'not_found' });
}

async function serveStatic(req, res, url) {
  const requestedPath = decodeURIComponent(url.pathname);
  const candidate = path.resolve(sourceDir, `.${requestedPath === '/' ? '/index.html' : requestedPath}`);
  if (!candidate.startsWith(`${sourceDir}${path.sep}`)) { text(res, 403, 'Forbidden'); return; }
  let filePath = candidate;
  try { await fs.access(filePath); } catch { filePath = path.join(sourceDir, 'index.html'); }
  try {
    const data = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (error) {
    text(res, 500, `Portal server error: ${error.message}`);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    const status = Number(error.httpStatus || 500);
    json(res, status, { error: 'request_failed', message: error.message });
  }
});

try {
  await initializeDatabase();
  server.listen(port, '0.0.0.0', () => console.log(`KeMU Student Portal listening on http://localhost:${port}`));
} catch (error) {
  console.error(`Database initialization failed: ${error.message}`);
  process.exitCode = 1;
}

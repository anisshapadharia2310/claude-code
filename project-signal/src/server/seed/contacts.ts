/**
 * Seed contacts.
 *
 * The list is built the way a real target account list arrives: a minority of
 * genuinely accountable owners, a larger group of operational and adjacent
 * people, and a tail of records that look right on a keyword and are not.
 *
 * Quality tiers control reachability and verification:
 *   A  verified email and phone, verified recently, consent captured
 *   B  valid email and phone, verified within the freshness window
 *   C  email only, no phone - proves the system still works without a number
 *   D  unverified contact details, no verification date
 *   E  outdated: last verified beyond the rejection threshold
 *
 * Flags:
 *   D  researcher-confirmed direct responsibility for the problem
 *   B  owns budget
 *   I  influences the decision
 *   W  WhatsApp opted in
 *   O  opted out of electronic outreach
 *   N  do not contact
 *   H  compliance record deliberately incomplete (produces a hold)
 *   X  duplicate of an earlier record
 */

export type QualityTier = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ContactSeedSpec {
  id: string;
  account: string;
  first: string;
  last: string;
  title: string;
  dept?: string | null;
  tier: QualityTier;
  flags?: string;
  tenureMonths?: number;
  /** Campaign ids this contact belongs to. Defaults to the account's campaigns. */
  campaigns?: string[];
  duplicateOf?: string;
  notes?: string;
}

export const CONTACT_SEEDS: ContactSeedSpec[] = [
  // ---------------- Meridian Trust Bank (Canada) - strong CX + service ----
  { id: 'ct-0001', account: 'acc-ca-meridian', first: 'Elena', last: 'Marchetti', title: 'Chief Customer Officer', dept: 'Customer Experience', tier: 'A', flags: 'DBIW', tenureMonths: 41 },
  { id: 'ct-0002', account: 'acc-ca-meridian', first: 'Daniel', last: 'Okonkwo', title: 'VP, Customer Experience Transformation', dept: 'Customer Experience', tier: 'A', flags: 'DBI', tenureMonths: 28 },
  { id: 'ct-0003', account: 'acc-ca-meridian', first: 'Sarah', last: 'Whitfield', title: 'Director, Contact Centre Operations', dept: 'Customer Service', tier: 'A', flags: 'DI', tenureMonths: 63 },
  { id: 'ct-0004', account: 'acc-ca-meridian', first: 'Marcus', last: 'Dube', title: 'Senior Customer Account Executive', dept: 'Sales', tier: 'B', notes: 'Keyword trap: contains "customer" but sells.' },
  { id: 'ct-0005', account: 'acc-ca-meridian', first: 'Priya', last: 'Nadarajah', title: 'Customer Insights Analyst', dept: 'Marketing', tier: 'B', notes: 'Keyword trap: research, not ownership.' },
  { id: 'ct-0006', account: 'acc-ca-meridian', first: 'Tom', last: 'Beaulieu', title: 'Head of Service Design', dept: 'Customer Experience', tier: 'B', flags: 'I', tenureMonths: 19 },

  // ---------------- Northline Utilities (Canada) - energy ----------------
  { id: 'ct-0010', account: 'acc-ca-northline', first: 'Gordon', last: 'Fraser', title: 'VP, Asset Management', dept: 'Asset Management', tier: 'A', flags: 'DBI', tenureMonths: 74 },
  { id: 'ct-0011', account: 'acc-ca-northline', first: 'Amrita', last: 'Sandhu', title: 'Director, Field Operations', dept: 'Operations', tier: 'A', flags: 'DI', tenureMonths: 35 },
  { id: 'ct-0012', account: 'acc-ca-northline', first: 'Kyle', last: 'Robichaud', title: 'Reliability Engineering Manager', dept: 'Maintenance', tier: 'B', flags: 'I', tenureMonths: 22 },
  { id: 'ct-0013', account: 'acc-ca-northline', first: 'Nadia', last: 'Petrov', title: 'Procurement Category Manager, Technology', dept: 'Procurement', tier: 'B', flags: 'B' },
  { id: 'ct-0014', account: 'acc-ca-northline', first: 'Simon', last: 'Lachance', title: 'Human Resources Business Partner', dept: 'Human Resources', tier: 'C' },

  // ---------------- Lakeshore Insurance (Canada) --------------------------
  { id: 'ct-0020', account: 'acc-ca-lakeshore', first: 'Camille', last: 'Bouchard', title: 'Directrice, Service Client', dept: 'Customer Service', tier: 'B', flags: 'DI', tenureMonths: 47 },
  { id: 'ct-0021', account: 'acc-ca-lakeshore', first: 'Yves', last: 'Tremblay', title: 'Head of Claims Operations', dept: 'Service Operations', tier: 'B', flags: 'I', tenureMonths: 31 },
  { id: 'ct-0022', account: 'acc-ca-lakeshore', first: 'Renee', last: 'Gagnon', title: 'Key Account Manager', dept: 'Sales', tier: 'C' },
  { id: 'ct-0023', account: 'acc-ca-lakeshore', first: 'Philippe', last: 'Roy', title: 'Customer Service Team Leader', dept: 'Customer Service', tier: 'D' },

  // ---------------- Portage Logistics (Canada) - no trigger ---------------
  { id: 'ct-0030', account: 'acc-ca-portage', first: 'Grace', last: 'Ferreira', title: 'Director of Operations', dept: 'Operations', tier: 'B', flags: 'DI', tenureMonths: 55 },
  { id: 'ct-0031', account: 'acc-ca-portage', first: 'Ben', last: 'Kowalski', title: 'Maintenance Supervisor', dept: 'Maintenance', tier: 'C', flags: 'I' },
  { id: 'ct-0032', account: 'acc-ca-portage', first: 'Ada', last: 'Nwosu', title: 'Business Development Manager', dept: 'Sales', tier: 'B' },

  // ---------------- Banco Azteca del Norte (Mexico) -----------------------
  { id: 'ct-0040', account: 'acc-mx-banorte', first: 'Ricardo', last: 'Salazar', title: 'Director de Experiencia del Cliente', dept: 'Customer Experience', tier: 'A', flags: 'DBIW', tenureMonths: 38 },
  { id: 'ct-0041', account: 'acc-mx-banorte', first: 'Lucia', last: 'Fernandez', title: 'VP Customer Operations', dept: 'Customer Operations', tier: 'A', flags: 'DBI', tenureMonths: 26 },
  { id: 'ct-0042', account: 'acc-mx-banorte', first: 'Miguel', last: 'Ortiz', title: 'Head of Contact Centre', dept: 'Contact Centre', tier: 'A', flags: 'DIW', tenureMonths: 44 },
  { id: 'ct-0043', account: 'acc-mx-banorte', first: 'Sofia', last: 'Ramirez', title: 'Gerente de Servicio al Cliente', dept: 'Customer Service', tier: 'B', flags: 'I', tenureMonths: 17 },
  { id: 'ct-0044', account: 'acc-mx-banorte', first: 'Javier', last: 'Mendoza', title: 'Customer Acquisition Marketing Manager', dept: 'Marketing', tier: 'B', notes: 'Keyword trap.' },
  { id: 'ct-0045', account: 'acc-mx-banorte', first: 'Ana', last: 'Castillo', title: 'Chief Information Officer', dept: 'Information Technology', tier: 'A', flags: 'BI', tenureMonths: 52 },
  { id: 'ct-0046', account: 'acc-mx-banorte', first: 'Ricardo', last: 'Salazar', title: 'Director, Customer Experience', dept: 'Customer Experience', tier: 'D', flags: 'X', duplicateOf: 'ct-0040', notes: 'Same person, second source.' },

  // ---------------- Cementos del Bajio (Mexico) ---------------------------
  { id: 'ct-0050', account: 'acc-mx-cemento', first: 'Hector', last: 'Villalobos', title: 'Gerente de Mantenimiento', dept: 'Maintenance', tier: 'B', flags: 'DI', tenureMonths: 61 },
  { id: 'ct-0051', account: 'acc-mx-cemento', first: 'Isabel', last: 'Duarte', title: 'Plant Operations Director', dept: 'Operations', tier: 'B', flags: 'DBI', tenureMonths: 40 },
  { id: 'ct-0052', account: 'acc-mx-cemento', first: 'Raul', last: 'Espinoza', title: 'Reliability Technician', dept: 'Maintenance', tier: 'C' },
  { id: 'ct-0053', account: 'acc-mx-cemento', first: 'Paula', last: 'Guzman', title: 'Finance Controller', dept: 'Finance', tier: 'B' },

  // ---------------- TelSur Communications (Mexico) ------------------------
  { id: 'ct-0060', account: 'acc-mx-telsur', first: 'Andres', last: 'Cordoba', title: 'Chief Customer Experience Officer', dept: 'Customer Experience', tier: 'A', flags: 'DBIW', tenureMonths: 23 },
  { id: 'ct-0061', account: 'acc-mx-telsur', first: 'Valeria', last: 'Nunez', title: 'Director, Customer Service Operations', dept: 'Customer Service', tier: 'A', flags: 'DBI', tenureMonths: 33 },
  { id: 'ct-0062', account: 'acc-mx-telsur', first: 'Emilio', last: 'Vargas', title: 'Head of Contact Centre Technology', dept: 'Contact Centre', tier: 'B', flags: 'DI', tenureMonths: 29 },
  { id: 'ct-0063', account: 'acc-mx-telsur', first: 'Carmen', last: 'Delgado', title: 'Customer Retention Manager', dept: 'Customer Success', tier: 'B', flags: 'I' },
  { id: 'ct-0064', account: 'acc-mx-telsur', first: 'Pablo', last: 'Serrano', title: 'Enterprise Sales Director', dept: 'Sales', tier: 'B' },
  { id: 'ct-0065', account: 'acc-mx-telsur', first: 'Nora', last: 'Aguilar', title: 'Customer Service Advisor', dept: 'Customer Service', tier: 'D' },

  // ---------------- Assurance Rhone Mutuelle (France) ---------------------
  { id: 'ct-0070', account: 'acc-fr-assurance', first: 'Claire', last: 'Moreau', title: 'Directrice de la Relation Client', dept: 'Customer Experience', tier: 'A', flags: 'DBI', tenureMonths: 11 },
  { id: 'ct-0071', account: 'acc-fr-assurance', first: 'Julien', last: 'Lefevre', title: 'Head of Customer Operations', dept: 'Customer Operations', tier: 'A', flags: 'DI', tenureMonths: 36 },
  { id: 'ct-0072', account: 'acc-fr-assurance', first: 'Amelie', last: 'Girard', title: 'Responsable Service Client', dept: 'Customer Service', tier: 'B', flags: 'I', tenureMonths: 25 },
  { id: 'ct-0073', account: 'acc-fr-assurance', first: 'Nicolas', last: 'Perrin', title: 'Directeur Commercial', dept: 'Sales', tier: 'B' },
  { id: 'ct-0074', account: 'acc-fr-assurance', first: 'Sophie', last: 'Bernard', title: 'Chef de Projet Transformation Digitale', dept: 'Transformation', tier: 'B', flags: 'I', tenureMonths: 14 },

  // ---------------- Energie Atlantique (France) ---------------------------
  { id: 'ct-0080', account: 'acc-fr-energie', first: 'Laurent', last: 'Dubois', title: 'Directeur Asset Management', dept: 'Asset Management', tier: 'A', flags: 'DBI', tenureMonths: 67 },
  { id: 'ct-0081', account: 'acc-fr-energie', first: 'Margaux', last: 'Leroy', title: 'Head of Maintenance Engineering', dept: 'Maintenance', tier: 'A', flags: 'DI', tenureMonths: 48 },
  { id: 'ct-0082', account: 'acc-fr-energie', first: 'Etienne', last: 'Caron', title: 'Responsable Exploitation Reseau', dept: 'Operations', tier: 'B', flags: 'DI', tenureMonths: 39 },
  { id: 'ct-0083', account: 'acc-fr-energie', first: 'Ines', last: 'Marchand', title: 'Digital Transformation Programme Director', dept: 'Transformation', tier: 'A', flags: 'DBI', tenureMonths: 18 },
  { id: 'ct-0084', account: 'acc-fr-energie', first: 'Guillaume', last: 'Rousseau', title: 'Investment Portfolio Manager', dept: 'Finance', tier: 'B', notes: 'Keyword trap on "asset".' },
  { id: 'ct-0085', account: 'acc-fr-energie', first: 'Chloe', last: 'Fontaine', title: 'Field Technician', dept: 'Operations', tier: 'D' },

  // ---------------- Maison Verte Retail (France) - weak -------------------
  { id: 'ct-0090', account: 'acc-fr-retail', first: 'Antoine', last: 'Lemaire', title: 'Head of Customer Service', dept: 'Customer Service', tier: 'B', flags: 'DI', tenureMonths: 30 },
  { id: 'ct-0091', account: 'acc-fr-retail', first: 'Manon', last: 'Petit', title: 'Customer Care Team Leader', dept: 'Customer Service', tier: 'C', flags: 'I' },
  { id: 'ct-0092', account: 'acc-fr-retail', first: 'Hugo', last: 'Blanc', title: 'Store Operations Manager', dept: 'Operations', tier: 'C' },

  // ---------------- Banco de los Andes (Colombia) -------------------------
  { id: 'ct-0100', account: 'acc-co-andes', first: 'Diego', last: 'Restrepo', title: 'Vicepresidente de Experiencia del Cliente', dept: 'Customer Experience', tier: 'A', flags: 'DBIW', tenureMonths: 34 },
  { id: 'ct-0101', account: 'acc-co-andes', first: 'Catalina', last: 'Herrera', title: 'Director, Customer Service Operations', dept: 'Customer Service', tier: 'A', flags: 'DBI', tenureMonths: 27 },
  { id: 'ct-0102', account: 'acc-co-andes', first: 'Mateo', last: 'Rojas', title: 'Head of Digital Channels', dept: 'Transformation', tier: 'B', flags: 'DI', tenureMonths: 21 },
  { id: 'ct-0103', account: 'acc-co-andes', first: 'Laura', last: 'Gomez', title: 'Customer Journey Manager', dept: 'Customer Experience', tier: 'B', flags: 'I', tenureMonths: 15 },
  { id: 'ct-0104', account: 'acc-co-andes', first: 'Santiago', last: 'Bermudez', title: 'Customer Account Manager', dept: 'Sales', tier: 'B', notes: 'Keyword trap.' },
  { id: 'ct-0105', account: 'acc-co-andes', first: 'Juliana', last: 'Cardenas', title: 'Contact Centre Workforce Analyst', dept: 'Contact Centre', tier: 'C' },

  // ---------------- Petrolera Magdalena (Colombia) ------------------------
  { id: 'ct-0110', account: 'acc-co-petrol', first: 'Fernando', last: 'Quintero', title: 'Director de Operaciones de Campo', dept: 'Operations', tier: 'A', flags: 'DBI', tenureMonths: 58 },
  { id: 'ct-0111', account: 'acc-co-petrol', first: 'Adriana', last: 'Munoz', title: 'Asset Integrity Manager', dept: 'Asset Management', tier: 'A', flags: 'DI', tenureMonths: 42 },
  { id: 'ct-0112', account: 'acc-co-petrol', first: 'Carlos', last: 'Beltran', title: 'Maintenance Planning Superintendent', dept: 'Maintenance', tier: 'B', flags: 'DI', tenureMonths: 36 },
  { id: 'ct-0113', account: 'acc-co-petrol', first: 'Marcela', last: 'Osorio', title: 'HSE Coordinator', dept: 'Legal and Compliance', tier: 'C' },
  { id: 'ct-0114', account: 'acc-co-petrol', first: 'Andres', last: 'Pineda', title: 'Digital Transformation Lead', dept: 'Transformation', tier: 'B', flags: 'DI', tenureMonths: 13 },

  // ---------------- Aguas del Valle (Colombia) - weak ---------------------
  { id: 'ct-0120', account: 'acc-co-aguas', first: 'Natalia', last: 'Vega', title: 'Jefe de Operaciones', dept: 'Operations', tier: 'B', flags: 'DI', tenureMonths: 44 },
  { id: 'ct-0121', account: 'acc-co-aguas', first: 'Oscar', last: 'Trujillo', title: 'Network Maintenance Supervisor', dept: 'Maintenance', tier: 'D', flags: 'I' },
  { id: 'ct-0122', account: 'acc-co-aguas', first: 'Liliana', last: 'Suarez', title: 'Administrative Assistant', dept: 'Operations', tier: 'D' },

  // ---------------- Emirates Power and Water (UAE) ------------------------
  { id: 'ct-0130', account: 'acc-ae-emirates-power', first: 'Khalid', last: 'Al Mazrouei', title: 'Executive Director, Asset Management', dept: 'Asset Management', tier: 'A', flags: 'DBIW', tenureMonths: 71 },
  { id: 'ct-0131', account: 'acc-ae-emirates-power', first: 'Fatima', last: 'Al Suwaidi', title: 'VP Network Operations', dept: 'Operations', tier: 'A', flags: 'DBI', tenureMonths: 49 },
  { id: 'ct-0132', account: 'acc-ae-emirates-power', first: 'Rajesh', last: 'Menon', title: 'Head of Reliability and Maintenance', dept: 'Maintenance', tier: 'A', flags: 'DI', tenureMonths: 55 },
  { id: 'ct-0133', account: 'acc-ae-emirates-power', first: 'Noura', last: 'Al Hashimi', title: 'Director, Digital Transformation', dept: 'Transformation', tier: 'A', flags: 'DBIW', tenureMonths: 24 },
  { id: 'ct-0134', account: 'acc-ae-emirates-power', first: 'James', last: 'Whittaker', title: 'Enterprise Architect', dept: 'Information Technology', tier: 'B', flags: 'I', tenureMonths: 32 },
  { id: 'ct-0135', account: 'acc-ae-emirates-power', first: 'Salma', last: 'Ibrahim', title: 'Procurement Manager, Digital Services', dept: 'Procurement', tier: 'B', flags: 'B' },
  { id: 'ct-0136', account: 'acc-ae-emirates-power', first: 'Yousef', last: 'Al Naqbi', title: 'SCADA Systems Engineer', dept: 'Engineering', tier: 'B', flags: 'I' },

  // ---------------- Gulf Horizon Airways (UAE) ----------------------------
  { id: 'ct-0140', account: 'acc-ae-gulfair', first: 'Aisha', last: 'Rahman', title: 'VP Customer Experience', dept: 'Customer Experience', tier: 'A', flags: 'DBIW', tenureMonths: 30 },
  { id: 'ct-0141', account: 'acc-ae-gulfair', first: 'Peter', last: 'Nkemdirim', title: 'Head of Contact Centre Operations', dept: 'Contact Centre', tier: 'A', flags: 'DIW', tenureMonths: 45 },
  { id: 'ct-0142', account: 'acc-ae-gulfair', first: 'Hana', last: 'Farouk', title: 'Director, Guest Services', dept: 'Customer Service', tier: 'B', flags: 'DI', tenureMonths: 37 },
  { id: 'ct-0143', account: 'acc-ae-gulfair', first: 'Vikram', last: 'Sethi', title: 'Cargo Sales Manager', dept: 'Sales', tier: 'B' },
  { id: 'ct-0144', account: 'acc-ae-gulfair', first: 'Leila', last: 'Haddad', title: 'Customer Experience Analyst', dept: 'Customer Experience', tier: 'C', flags: 'I' },

  // ---------------- Dune Properties (UAE) - out of industry ---------------
  { id: 'ct-0150', account: 'acc-ae-property', first: 'Omar', last: 'Bin Sulayem', title: 'Head of Customer Experience', dept: 'Customer Experience', tier: 'B', flags: 'DI', tenureMonths: 20 },
  { id: 'ct-0151', account: 'acc-ae-property', first: 'Zara', last: 'Khan', title: 'Client Relations Manager', dept: 'Customer Service', tier: 'C' },

  // ---------------- Najd Refining (Saudi Arabia) --------------------------
  { id: 'ct-0160', account: 'acc-sa-refining', first: 'Abdulaziz', last: 'Al Qahtani', title: 'General Manager, Operations and Maintenance', dept: 'Operations', tier: 'A', flags: 'DBI', tenureMonths: 88 },
  { id: 'ct-0161', account: 'acc-sa-refining', first: 'Mona', last: 'Al Zahrani', title: 'Director, Asset Reliability', dept: 'Asset Management', tier: 'A', flags: 'DBI', tenureMonths: 46 },
  { id: 'ct-0162', account: 'acc-sa-refining', first: 'Tariq', last: 'Al Otaibi', title: 'Turnaround Planning Manager', dept: 'Maintenance', tier: 'B', flags: 'DI', tenureMonths: 33 },
  { id: 'ct-0163', account: 'acc-sa-refining', first: 'Hussain', last: 'Al Dosari', title: 'Head of Digital and Data', dept: 'Transformation', tier: 'A', flags: 'DBI', tenureMonths: 16 },
  { id: 'ct-0164', account: 'acc-sa-refining', first: 'Reem', last: 'Al Ghamdi', title: 'Contracts Administrator', dept: 'Procurement', tier: 'C' },
  { id: 'ct-0165', account: 'acc-sa-refining', first: 'Faisal', last: 'Al Harbi', title: 'Process Engineer', dept: 'Engineering', tier: 'B', flags: 'I' },

  // ---------------- Riyadh Digital Telecom (Saudi Arabia) -----------------
  { id: 'ct-0170', account: 'acc-sa-telecom', first: 'Sultan', last: 'Al Rashid', title: 'VP Customer Service', dept: 'Customer Service', tier: 'A', flags: 'DBIW', tenureMonths: 29 },
  { id: 'ct-0171', account: 'acc-sa-telecom', first: 'Layla', last: 'Al Mutairi', title: 'Director, Contact Centre Transformation', dept: 'Contact Centre', tier: 'A', flags: 'DBI', tenureMonths: 22 },
  { id: 'ct-0172', account: 'acc-sa-telecom', first: 'Bandar', last: 'Al Shammari', title: 'Head of Customer Care Operations', dept: 'Customer Service', tier: 'B', flags: 'DI', tenureMonths: 41 },
  { id: 'ct-0173', account: 'acc-sa-telecom', first: 'Huda', last: 'Al Anazi', title: 'Customer Experience Manager', dept: 'Customer Experience', tier: 'B', flags: 'I', tenureMonths: 18 },
  { id: 'ct-0174', account: 'acc-sa-telecom', first: 'Nasser', last: 'Al Juhani', title: 'B2B Account Executive', dept: 'Sales', tier: 'B' },
  { id: 'ct-0175', account: 'acc-sa-telecom', first: 'Wael', last: 'Al Subaie', title: 'Service Desk Team Leader', dept: 'Customer Service', tier: 'D', flags: 'I' },

  // ---------------- Red Sea Logistics (Saudi Arabia) ----------------------
  { id: 'ct-0180', account: 'acc-sa-logistics', first: 'Ahmed', last: 'Bakr', title: 'Terminal Operations Manager', dept: 'Operations', tier: 'B', flags: 'DI', tenureMonths: 52 },
  { id: 'ct-0181', account: 'acc-sa-logistics', first: 'Salwa', last: 'Nasser', title: 'Maintenance Planner', dept: 'Maintenance', tier: 'C', flags: 'I' },
  { id: 'ct-0182', account: 'acc-sa-logistics', first: 'Ibrahim', last: 'Al Amoudi', title: 'Head of Engineering', dept: 'Engineering', tier: 'B', flags: 'DBI', tenureMonths: 39 },

  // ---------------- Sultanate Petroleum (Oman) ----------------------------
  { id: 'ct-0190', account: 'acc-om-petroleum', first: 'Said', last: 'Al Balushi', title: 'Operations and Maintenance Director', dept: 'Operations', tier: 'A', flags: 'DBI', tenureMonths: 64 },
  { id: 'ct-0191', account: 'acc-om-petroleum', first: 'Maryam', last: 'Al Habsi', title: 'Asset Management Lead', dept: 'Asset Management', tier: 'B', flags: 'DI', tenureMonths: 28 },
  { id: 'ct-0192', account: 'acc-om-petroleum', first: 'Hamad', last: 'Al Rawahi', title: 'Field Operations Supervisor', dept: 'Operations', tier: 'C', flags: 'I' },
  { id: 'ct-0193', account: 'acc-om-petroleum', first: 'Aliya', last: 'Al Kindi', title: 'Learning and Development Manager', dept: 'Human Resources', tier: 'C' },

  // ---------------- Muscat Commercial Bank (Oman) -------------------------
  { id: 'ct-0200', account: 'acc-om-bank', first: 'Nabil', last: 'Al Lawati', title: 'Head of Customer Service', dept: 'Customer Service', tier: 'B', flags: 'DI', tenureMonths: 43 },
  { id: 'ct-0201', account: 'acc-om-bank', first: 'Shaima', last: 'Al Zadjali', title: 'Customer Experience Officer', dept: 'Customer Experience', tier: 'C', flags: 'I' },
  { id: 'ct-0202', account: 'acc-om-bank', first: 'Talal', last: 'Al Maskari', title: 'Branch Sales Manager', dept: 'Sales', tier: 'C' },
  { id: 'ct-0203', account: 'acc-om-bank', first: 'Iman', last: 'Al Saadi', title: 'Call Centre Operations Manager', dept: 'Contact Centre', tier: 'B', flags: 'DI', tenureMonths: 26 },

  // ---------------- Nile Delta Electricity (Egypt) ------------------------
  { id: 'ct-0210', account: 'acc-eg-electricity', first: 'Mostafa', last: 'El Sayed', title: 'Director of Network Operations', dept: 'Operations', tier: 'A', flags: 'DBI', tenureMonths: 77 },
  { id: 'ct-0211', account: 'acc-eg-electricity', first: 'Dalia', last: 'Fahmy', title: 'Head of Asset Performance', dept: 'Asset Management', tier: 'A', flags: 'DI', tenureMonths: 38 },
  { id: 'ct-0212', account: 'acc-eg-electricity', first: 'Karim', last: 'Abdelrahman', title: 'Distribution Maintenance Manager', dept: 'Maintenance', tier: 'B', flags: 'DI', tenureMonths: 45 },
  { id: 'ct-0213', account: 'acc-eg-electricity', first: 'Yasmine', last: 'Hassan', title: 'Smart Metering Programme Manager', dept: 'Transformation', tier: 'B', flags: 'DI', tenureMonths: 19 },
  { id: 'ct-0214', account: 'acc-eg-electricity', first: 'Sherif', last: 'Mansour', title: 'Facilities Management Coordinator', dept: 'Operations', tier: 'C', notes: 'Excluded term on the energy campaign.' },

  // ---------------- Cairo Connect Telecom (Egypt) -------------------------
  { id: 'ct-0220', account: 'acc-eg-telecom', first: 'Rania', last: 'Ibrahim', title: 'Head of Customer Operations', dept: 'Customer Operations', tier: 'A', flags: 'DBI', tenureMonths: 31 },
  { id: 'ct-0221', account: 'acc-eg-telecom', first: 'Amr', last: 'Zaki', title: 'Customer Care Director', dept: 'Customer Service', tier: 'B', flags: 'DI', tenureMonths: 40 },
  { id: 'ct-0222', account: 'acc-eg-telecom', first: 'Nourhan', last: 'Adel', title: 'Contact Centre Quality Manager', dept: 'Contact Centre', tier: 'B', flags: 'I', tenureMonths: 23 },
  { id: 'ct-0223', account: 'acc-eg-telecom', first: 'Hossam', last: 'Nabil', title: 'Enterprise Sales Lead', dept: 'Sales', tier: 'C' },
  { id: 'ct-0224', account: 'acc-eg-telecom', first: 'Mai', last: 'Shaker', title: 'Customer Service Representative', dept: 'Customer Service', tier: 'E', notes: 'Outdated record.' },

  // ---------------- Clearwater Health (United States) - geography test ----
  { id: 'ct-0230', account: 'acc-us-clearwater', first: 'Rebecca', last: 'Lindqvist', title: 'VP Patient Access and Service', dept: 'Customer Service', tier: 'A', flags: 'DBI', tenureMonths: 35 },
  { id: 'ct-0231', account: 'acc-us-clearwater', first: 'Marcus', last: 'Tran', title: 'Director, Contact Centre', dept: 'Contact Centre', tier: 'B', flags: 'DI', tenureMonths: 27 },

  // ---------------- Mobilite Grand Est (France) ---------------------------
  { id: 'ct-0240', account: 'acc-fr-mobilite', first: 'Thibault', last: 'Mercier', title: 'Directeur Maintenance Infrastructure', dept: 'Maintenance', tier: 'A', flags: 'DBI', tenureMonths: 59 },
  { id: 'ct-0241', account: 'acc-fr-mobilite', first: 'Elodie', last: 'Barbier', title: 'Head of Asset Management', dept: 'Asset Management', tier: 'A', flags: 'DI', tenureMonths: 41 },
  { id: 'ct-0242', account: 'acc-fr-mobilite', first: 'Farid', last: 'Benali', title: 'Responsable Operations Reseau', dept: 'Operations', tier: 'B', flags: 'DI', tenureMonths: 34 },
  { id: 'ct-0243', account: 'acc-fr-mobilite', first: 'Camille', last: 'Rey', title: 'Rolling Stock Engineer', dept: 'Engineering', tier: 'B', flags: 'I' },

  // ---------------- Compliance edge cases ---------------------------------
  { id: 'ct-0250', account: 'acc-mx-banorte', first: 'Gabriela', last: 'Ponce', title: 'Director, Customer Experience Programmes', dept: 'Customer Experience', tier: 'A', flags: 'DBIO', notes: 'Opted out of electronic outreach despite a strong profile.' },
  { id: 'ct-0251', account: 'acc-fr-assurance', first: 'Olivier', last: 'Dupont', title: 'Head of Customer Relations', dept: 'Customer Experience', tier: 'A', flags: 'DBIH', notes: 'Compliance record deliberately incomplete: France requires an explicit opt-in.' },
  { id: 'ct-0252', account: 'acc-ae-gulfair', first: 'Ravi', last: 'Chandrasekaran', title: 'Director, Customer Service Delivery', dept: 'Customer Service', tier: 'A', flags: 'DBIN', notes: 'Marked do-not-contact after a complaint.' },
  { id: 'ct-0253', account: 'acc-sa-refining', first: 'Majed', last: 'Al Sulaiman', title: 'Head of Operations Technology', dept: 'Operations', tier: 'A', flags: 'DBIH', notes: 'Missing lawful basis.' },
  { id: 'ct-0254', account: 'acc-ca-meridian', first: 'Helen', last: 'Osei', title: 'Group Director, Customer Experience', dept: 'Customer Experience', tier: 'E', flags: 'DBI', notes: 'Outdated: strong on paper, last verified two years ago.' },
  { id: 'ct-0255', account: 'acc-co-andes', first: 'Esteban', last: 'Morales', title: 'Customer Experience Director', dept: 'Customer Experience', tier: 'D', flags: 'DI', notes: 'Unverified contact details keep this below the P1 data-quality floor.' },
  // ---------------- Nurture band: relevant people, no live trigger --------
  // These records exist to prove the difference between fit and intent. Each
  // one genuinely runs the relevant function, so the relevance gate passes -
  // but with no business trigger and no engagement they belong in nurture, not
  // in a caller's queue.
  { id: 'ct-0300', account: 'acc-fr-retail', first: 'Sylvie', last: 'Marchal', title: 'Directrice Service Client', dept: 'Customer Service', tier: 'B', flags: 'I', tenureMonths: 52 },
  { id: 'ct-0301', account: 'acc-fr-retail', first: 'Bruno', last: 'Delacroix', title: 'Head of Customer Operations', dept: 'Customer Operations', tier: 'B', flags: 'I', tenureMonths: 38 },
  { id: 'ct-0302', account: 'acc-fr-retail', first: 'Nadia', last: 'Ben Amar', title: 'Contact Centre Manager', dept: 'Contact Centre', tier: 'C', flags: 'I', tenureMonths: 29 },
  { id: 'ct-0303', account: 'acc-fr-retail', first: 'Luc', last: 'Vasseur', title: 'Customer Experience Manager', dept: 'Customer Experience', tier: 'B', flags: 'I', tenureMonths: 24 },
  { id: 'ct-0304', account: 'acc-ca-portage', first: 'Marie', last: 'Chevalier', title: 'Head of Asset Management', dept: 'Asset Management', tier: 'B', flags: 'I', tenureMonths: 46 },
  { id: 'ct-0305', account: 'acc-ca-portage', first: 'Devon', last: 'Clarke', title: 'Fleet Maintenance Manager', dept: 'Maintenance', tier: 'B', flags: 'I', tenureMonths: 33 },
  { id: 'ct-0306', account: 'acc-ca-portage', first: 'Anita', last: 'Bhatt', title: 'Network Operations Manager', dept: 'Operations', tier: 'C', flags: 'I', tenureMonths: 27 },
  { id: 'ct-0307', account: 'acc-co-aguas', first: 'Julian', last: 'Castano', title: 'Asset Management Coordinator', dept: 'Asset Management', tier: 'B', flags: 'I', tenureMonths: 31 },
  { id: 'ct-0308', account: 'acc-co-aguas', first: 'Paola', last: 'Rincon', title: 'Head of Field Operations', dept: 'Operations', tier: 'B', flags: 'I', tenureMonths: 40 },
  { id: 'ct-0309', account: 'acc-om-bank', first: 'Zayd', last: 'Al Harthy', title: 'Customer Service Operations Manager', dept: 'Customer Service', tier: 'B', flags: 'I', tenureMonths: 35 },
  { id: 'ct-0310', account: 'acc-om-bank', first: 'Amal', last: 'Al Riyami', title: 'Head of Service Quality', dept: 'Customer Service', tier: 'C', flags: 'I', tenureMonths: 22 },
  { id: 'ct-0311', account: 'acc-ca-lakeshore', first: 'Denis', last: 'Fortin', title: 'Customer Operations Manager', dept: 'Customer Operations', tier: 'B', flags: 'I', tenureMonths: 41 },
  { id: 'ct-0312', account: 'acc-ca-lakeshore', first: 'Sandrine', last: 'Cote', title: 'Manager, Client Experience', dept: 'Customer Experience', tier: 'C', flags: 'I', tenureMonths: 18 },
  { id: 'ct-0313', account: 'acc-sa-logistics', first: 'Nawaf', last: 'Al Zahrani', title: 'Asset Reliability Manager', dept: 'Asset Management', tier: 'B', flags: 'I', tenureMonths: 37 },
  { id: 'ct-0314', account: 'acc-sa-logistics', first: 'Ghada', last: 'Al Faisal', title: 'Operations Planning Manager', dept: 'Operations', tier: 'C', flags: 'I', tenureMonths: 26 },
  { id: 'ct-0315', account: 'acc-om-petroleum', first: 'Khalfan', last: 'Al Hinai', title: 'Maintenance Operations Manager', dept: 'Maintenance', tier: 'B', flags: 'I', tenureMonths: 48 },
  { id: 'ct-0316', account: 'acc-om-petroleum', first: 'Buthaina', last: 'Al Farsi', title: 'Head of Asset Data', dept: 'Asset Management', tier: 'C', flags: 'I', tenureMonths: 20 },
  { id: 'ct-0317', account: 'acc-mx-cemento', first: 'Lorena', last: 'Aguirre', title: 'Head of Plant Operations', dept: 'Operations', tier: 'C', flags: 'I', tenureMonths: 34 },
  { id: 'ct-0318', account: 'acc-mx-cemento', first: 'Emiliano', last: 'Ruiz', title: 'Asset Maintenance Manager', dept: 'Maintenance', tier: 'C', flags: 'I', tenureMonths: 28 },
  { id: 'ct-0319', account: 'acc-eg-telecom', first: 'Salma', last: 'Wahba', title: 'Service Operations Manager', dept: 'Service Operations', tier: 'C', flags: 'I', tenureMonths: 25 },
  { id: 'ct-0320', account: 'acc-eg-telecom', first: 'Tamer', last: 'Reda', title: 'Head of Customer Support', dept: 'Customer Service', tier: 'C', flags: 'I', tenureMonths: 30 },
  { id: 'ct-0321', account: 'acc-co-andes', first: 'Ximena', last: 'Lopez', title: 'Contact Centre Operations Manager', dept: 'Contact Centre', tier: 'C', flags: 'I', tenureMonths: 23 },
  { id: 'ct-0322', account: 'acc-fr-mobilite', first: 'Pascal', last: 'Noel', title: 'Maintenance Operations Manager', dept: 'Maintenance', tier: 'C', flags: 'I', tenureMonths: 44 },
  { id: 'ct-0323', account: 'acc-ca-northline', first: 'Trevor', last: 'Ash', title: 'Field Maintenance Manager', dept: 'Maintenance', tier: 'C', flags: 'I', tenureMonths: 39 },
  { id: 'ct-0324', account: 'acc-fr-retail', first: 'Ophelie', last: 'Roux', title: 'Head of Service Delivery', dept: 'Service Operations', tier: 'C', flags: 'I', tenureMonths: 36 },
  { id: 'ct-0325', account: 'acc-ca-portage', first: 'Sean', last: 'Mullins', title: 'Head of Reliability', dept: 'Maintenance', tier: 'C', flags: 'I', tenureMonths: 30 },
  { id: 'ct-0326', account: 'acc-co-aguas', first: 'Esteban', last: 'Marin', title: 'Network Maintenance Manager', dept: 'Maintenance', tier: 'B', flags: 'I', tenureMonths: 25 },
  { id: 'ct-0327', account: 'acc-om-bank', first: 'Rashid', last: 'Al Busaidi', title: 'Customer Experience Manager', dept: 'Customer Experience', tier: 'B', flags: 'I', tenureMonths: 19 },
  { id: 'ct-0328', account: 'acc-ca-lakeshore', first: 'Marc', last: 'Thibodeau', title: 'Head of Contact Centre', dept: 'Contact Centre', tier: 'C', flags: 'I', tenureMonths: 32 },
  { id: 'ct-0329', account: 'acc-mx-telsur', first: 'Renata', last: 'Bustos', title: 'Head of Customer Service Quality', dept: 'Customer Service', tier: 'A', flags: 'DBIH', notes: 'Compliance record incomplete: lawful basis not determined.' },
];

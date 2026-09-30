const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const User = require('../models/User');
const Project = require('../models/Project');
const Parcel = require('../models/Parcel');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { STAGES, STAGE_TITLES } = require('../models/Parcel');

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB Atlas for BHOOMI-SETU Master Seed...');
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'bhoomi_setu' });
    console.log('Connected to Atlas.');

    // Clear previous collections for fresh demonstration state
    console.log('Purging previous demonstration records...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Parcel.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});

    // -------------------------------------------------------------
    // 1. SEED GOVERNMENT OFFICER DEMO ACCOUNTS (PRD Section 23)
    // -------------------------------------------------------------
    console.log('Seeding Government Officer Accounts with Strict Jurisdictions...');

    // A. National Super Admin (Central Command - MoRTH / NHAI HQ)
    const nationalAdmin = await User.create({
      name: 'Dr. Vivek R. Mehra, IAS',
      email: 'national.admin@bhoomi.gov.in',
      password: 'bhoomi@2026',
      mobile: '9811001100',
      role: 'SUPER_ADMIN',
      designation: 'Joint Secretary & Director General (Land Acquisition)',
      department: 'Ministry of Road Transport & Highways (MoRTH)',
      state: 'All',
      district: 'All',
      tehsil: 'All',
      village: 'All',
      permissions: ['CREATE_PROJECT', 'ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_ALL_JURISDICTIONS'],
    });

    // B. State Revenue Authority (Haryana State Command)
    const stateAdminHaryana = await User.create({
      name: 'Sunita Sangwan, HCS',
      email: 'state.haryana@bhoomi.gov.in',
      password: 'bhoomi@2026',
      mobile: '9811002200',
      role: 'STATE_ADMIN',
      designation: 'Special Secretary (Revenue & Disaster Management)',
      department: 'Department of Revenue & Land Records, Haryana',
      state: 'Haryana',
      district: 'All',
      tehsil: 'All',
      village: 'All',
      permissions: ['CREATE_PROJECT', 'ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_STATE_DATA'],
    });

    // C. District SLAO (Sonipat District SLAO)
    const slaoSonipat = await User.create({
      name: 'Rajiv Sharma',
      email: 'slao.sonipat@bhoomi.gov.in',
      password: 'bhoomi@2026',
      mobile: '9811003300',
      role: 'DISTRICT_OFFICER',
      designation: 'Special Land Acquisition Officer (SLAO)',
      department: 'District Collectorate Office, Sonipat',
      state: 'Haryana',
      district: 'Sonipat',
      tehsil: 'All',
      village: 'All',
      permissions: ['ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_DISTRICT_DATA'],
    });

    // D. Field Verification Officer (Murshadpur Beat, Sonipat)
    const fieldMurshadpur = await User.create({
      name: 'Amit Kumar',
      email: 'field.murshadpur@bhoomi.gov.in',
      password: 'bhoomi@2026',
      mobile: '9811004400',
      role: 'PROJECT_OFFICER',
      designation: 'Field Verification Officer & Revenue Amin',
      department: 'Tehsil Land Records Bureau, Rai',
      state: 'Haryana',
      district: 'Sonipat',
      tehsil: 'Rai',
      village: 'Murshadpur',
      permissions: ['ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_PARCEL_DATA'],
    });

    // E. District SLAO (Gurugram District SLAO - Used to verify RBAC Data Isolation)
    const slaoGurugram = await User.create({
      name: 'Harish Chandra Rao',
      email: 'slao.gurugram@bhoomi.gov.in',
      password: 'bhoomi@2026',
      mobile: '9811005500',
      role: 'DISTRICT_OFFICER',
      designation: 'Competent Authority for Land Acquisition (CALA)',
      department: 'District Revenue Office, Gurugram',
      state: 'Haryana',
      district: 'Gurugram',
      tehsil: 'All',
      village: 'All',
      permissions: ['ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_DISTRICT_DATA'],
    });

    // F. District SLAO (Jaipur District SLAO, Rajasthan)
    const slaoJaipur = await User.create({
      name: 'Devendra Singh Rathore',
      email: 'slao.jaipur@bhoomi.gov.in',
      password: 'bhoomi@2026',
      mobile: '9811006600',
      role: 'DISTRICT_OFFICER',
      designation: 'Additional District Collector (Land Acquisition)',
      department: 'Jaipur Development Authority (JDA)',
      state: 'Rajasthan',
      district: 'Jaipur',
      tehsil: 'All',
      village: 'All',
      permissions: ['ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_DISTRICT_DATA'],
    });

    // -------------------------------------------------------------
    // 2. SEED REALISTIC INFRASTRUCTURE PROJECTS (PRD Section 21 & 22)
    // -------------------------------------------------------------
    console.log('Seeding 8 National & Regional Infrastructure Corridors...');

    // Project 1: Delhi-Amritsar-Katra Expressway (Sonipat Section)
    const projSonipat = await Project.create({
      name: 'Delhi–Amritsar–Katra Expressway (Pkg 1: Sonipat Corridor Alignment)',
      code: 'DAKE-PKG1-SNP',
      type: 'EXPRESSWAY',
      authority: 'NHAI',
      state: 'Haryana',
      district: 'Sonipat',
      secondaryDistricts: ['Jhajjar', 'Panipat'],
      description: 'Greenfield 8-lane access controlled highway connecting Kundli-Manesar-Palwal (KMP) Interchange to Murshadpur and Ganaur.',
      startDate: new Date('2025-04-10'),
      targetCompletionDate: new Date('2027-12-31'),
      budget: 2450000000,
      totalAreaRequired: 420.5,
      status: 'ACQUISITION_ACTIVE',
      createdBy: nationalAdmin._id,
      assignedOfficers: [slaoSonipat._id, fieldMurshadpur._id],
      routeGeometry: [
        { latitude: 28.9931, longitude: 77.0151, order: 1, name: 'Kundli Interchange' },
        { latitude: 29.0255, longitude: 77.0422, order: 2, name: 'Murshadpur Bypass Junction' },
        { latitude: 29.0712, longitude: 77.0610, order: 3, name: 'Rai Industrial Node' },
        { latitude: 29.1350, longitude: 77.0850, order: 4, name: 'Ganaur Terminal Loop' },
      ],
    });

    // Project 2: Delhi-Mumbai Expressway (Gurugram to Nuh Section)
    const projGurugram = await Project.create({
      name: 'Delhi–Mumbai Expressway Corridor (Section 4: Sohna–Nuh Alignment)',
      code: 'DME-SEC4-GGN',
      type: 'EXPRESSWAY',
      authority: 'NHAI',
      state: 'Haryana',
      district: 'Gurugram',
      secondaryDistricts: ['Nuh', 'Palwal'],
      description: 'High-speed freight & passenger expressway connecting Sohna elevated interchange to Bhondsi, Ghamroj, and Mewat border.',
      startDate: new Date('2025-01-15'),
      targetCompletionDate: new Date('2027-08-30'),
      budget: 3100000000,
      totalAreaRequired: 380.0,
      status: 'ACQUISITION_ACTIVE',
      createdBy: nationalAdmin._id,
      assignedOfficers: [slaoGurugram._id],
      routeGeometry: [
        { latitude: 28.3541, longitude: 77.0543, order: 1, name: 'Sohna Interchange' },
        { latitude: 28.2810, longitude: 77.0420, order: 2, name: 'Ghamroj Toll Plaza' },
        { latitude: 28.2124, longitude: 77.0396, order: 3, name: 'Bhondsi Valley Node' },
        { latitude: 27.9942, longitude: 77.0421, order: 4, name: 'Nuh Border Terminal' },
      ],
    });

    // Project 3: Western Dedicated Freight Corridor (Rewari Segment)
    const projRewari = await Project.create({
      name: 'Western Dedicated Freight Corridor (Rewari–Dadri Super Heavy Segment)',
      code: 'WDFC-REW-03',
      type: 'RAILWAY',
      authority: 'DFCCIL',
      state: 'Haryana',
      district: 'Rewari',
      secondaryDistricts: ['Gurugram'],
      description: 'Double-stack container electrified railway corridor dedicated to high-speed freight transportation.',
      startDate: new Date('2025-03-01'),
      targetCompletionDate: new Date('2028-03-31'),
      budget: 1850000000,
      totalAreaRequired: 260.0,
      status: 'ACQUISITION_ACTIVE',
      createdBy: stateAdminHaryana._id,
      routeGeometry: [
        { latitude: 28.3142, longitude: 76.9822, order: 1, name: 'Manesar Logistics Yard' },
        { latitude: 28.2510, longitude: 76.8120, order: 2, name: 'Pataudi Junction Loop' },
        { latitude: 28.1928, longitude: 76.6186, order: 3, name: 'Rewari Rail Terminal' },
      ],
    });

    // Project 4: Jaipur Ring Road & Northern Orbital Highway
    const projJaipur = await Project.create({
      name: 'Jaipur Northern Orbital Expressway (Bagru to Chomu Spur)',
      code: 'JNOE-RAJ-01',
      type: 'HIGHWAY',
      authority: 'NHAI',
      state: 'Rajasthan',
      district: 'Jaipur',
      description: '6-lane ring road corridor decongesting Jaipur city and providing direct transit between NH-48 and NH-52.',
      startDate: new Date('2025-06-01'),
      targetCompletionDate: new Date('2028-06-30'),
      budget: 1950000000,
      totalAreaRequired: 310.0,
      status: 'ACQUISITION_ACTIVE',
      createdBy: nationalAdmin._id,
      assignedOfficers: [slaoJaipur._id],
      routeGeometry: [
        { latitude: 26.8142, longitude: 75.5410, order: 1, name: 'Bagru Interchange' },
        { latitude: 26.8920, longitude: 75.6320, order: 2, name: 'Ajmer Highway Spur' },
        { latitude: 27.0250, longitude: 75.7410, order: 3, name: 'Harmada Junction' },
        { latitude: 27.1650, longitude: 75.7220, order: 4, name: 'Chomu Terminal' },
      ],
    });

    // Project 5: Mumbai-Ahmedabad High-Speed Rail Corridor (Vadodara Segment)
    const projVadodara = await Project.create({
      name: 'High-Speed Rail Corridor (MAHSR - Anand to Vadodara Segment)',
      code: 'MAHSR-GUJ-02',
      type: 'RAILWAY',
      authority: 'NHSRCL',
      state: 'Gujarat',
      district: 'Vadodara',
      secondaryDistricts: ['Anand'],
      description: 'Bullet train alignment connecting Sabarmati Multi-Modal Hub to Vadodara Central Station.',
      startDate: new Date('2024-11-01'),
      targetCompletionDate: new Date('2027-10-31'),
      budget: 4200000000,
      totalAreaRequired: 195.0,
      status: 'ACQUISITION_ACTIVE',
      createdBy: nationalAdmin._id,
      routeGeometry: [
        { latitude: 22.5645, longitude: 72.9289, order: 1, name: 'Anand Station Viaduct' },
        { latitude: 22.4410, longitude: 73.0520, order: 2, name: 'Mahi River Crossing' },
        { latitude: 22.3072, longitude: 73.1812, order: 3, name: 'Vadodara Central Terminal' },
      ],
    });

    // Project 6: Pune-Bengaluru Industrial Expressway (Pune Rural)
    const projPune = await Project.create({
      name: 'Pune–Bengaluru Industrial Expressway (Section 1: Shirwal to Satara Border)',
      code: 'PBIE-MAH-01',
      type: 'INDUSTRIAL_CORRIDOR',
      authority: 'MSRDC',
      state: 'Maharashtra',
      district: 'Pune',
      description: 'Access controlled 8-lane industrial corridor linking PMRDA manufacturing belt to southern logistics corridor.',
      startDate: new Date('2025-05-15'),
      targetCompletionDate: new Date('2028-12-31'),
      budget: 2800000000,
      totalAreaRequired: 350.0,
      status: 'ACQUISITION_ACTIVE',
      createdBy: nationalAdmin._id,
      routeGeometry: [
        { latitude: 18.2810, longitude: 73.9820, order: 1, name: 'Shirwal Industrial Node' },
        { latitude: 18.1520, longitude: 74.0150, order: 2, name: 'Khandala Toll Plaza' },
        { latitude: 17.9850, longitude: 74.0410, order: 3, name: 'Bhuinj Junction' },
      ],
    });

    // Project 7: Eastern Peripheral Expressway (Baghpat Segment)
    const projBaghpat = await Project.create({
      name: 'Eastern Peripheral Expressway Expansion (Baghpat–Ghaziabad Connector)',
      code: 'EPE-UP-02',
      type: 'EXPRESSWAY',
      authority: 'NHAI',
      state: 'Uttar Pradesh',
      district: 'Baghpat',
      description: 'Strategic ring route bypass easing logistics transit around National Capital Region.',
      startDate: new Date('2025-02-10'),
      targetCompletionDate: new Date('2027-06-30'),
      budget: 1650000000,
      totalAreaRequired: 210.0,
      status: 'ACQUISITION_ACTIVE',
      createdBy: nationalAdmin._id,
      routeGeometry: [
        { latitude: 28.9410, longitude: 77.2210, order: 1, name: 'Baghpat Yamuna Bridge' },
        { latitude: 28.8520, longitude: 77.3450, order: 2, name: 'Khekra Logistics Interchange' },
        { latitude: 28.7120, longitude: 77.4120, order: 3, name: 'Duhai NCRTC Hub' },
      ],
    });

    // Project 8: Delhi-Varanasi High-Speed Railway Alignment
    const projVaranasi = await Project.create({
      name: 'Delhi–Varanasi High-Speed Rail Corridor (Varanasi Feeder Alignment)',
      code: 'DVHSR-UP-04',
      type: 'RAILWAY',
      authority: 'NHSRCL',
      state: 'Uttar Pradesh',
      district: 'Varanasi',
      description: 'Electrified high-speed bullet rail corridor linking Eastern UP to New Delhi.',
      startDate: new Date('2025-07-01'),
      targetCompletionDate: new Date('2029-01-31'),
      budget: 3800000000,
      totalAreaRequired: 290.0,
      status: 'ACQUISITION_ACTIVE',
      createdBy: nationalAdmin._id,
      routeGeometry: [
        { latitude: 25.4210, longitude: 82.8540, order: 1, name: 'Babatpur Airport Station' },
        { latitude: 25.3520, longitude: 82.9510, order: 2, name: 'Shivpur Viaduct' },
        { latitude: 25.2810, longitude: 83.0210, order: 3, name: 'Varanasi Junction Terminal' },
      ],
    });

    // -------------------------------------------------------------
    // 3. SEED REALISTIC LAND PARCELS (PRD Section 21, 22, 26)
    // -------------------------------------------------------------
    console.log('Seeding 65+ Land Parcels across 11 Lifecycle Stages & 3 Statuses...');

    const realisticOwnersHaryana = [
      { name: 'Ramesh Kumar s/o Dharam Singh', mobile: '9876543201' },
      { name: 'Balwan Singh & Satish Kumar', mobile: '9876543202' },
      { name: 'Smt. Kamla Devi w/o Late Jagdish', mobile: '9876543203' },
      { name: 'Rajender Prasad Yadav', mobile: '9876543204' },
      { name: 'Kuldeep Hooda & Jaiveer Hooda', mobile: '9876543205' },
      { name: 'Suresh Kumar Malik', mobile: '9876543206' },
      { name: 'Virender Singh Dahiya', mobile: '9876543207' },
      { name: 'Smt. Santosh Sharma & Rajesh Sharma', mobile: '9876543208' },
      { name: 'Mahabir Singh s/o Ram Phal', mobile: '9876543209' },
      { name: 'Om Prakash & Naresh Kumar', mobile: '9876543210' },
      { name: 'Bhupender Singh s/o Raghubir', mobile: '9876543211' },
      { name: 'Smt. Shakuntala Devi w/o Baldev', mobile: '9876543212' },
      { name: 'Mukesh Tyagi s/o Ram Kumar', mobile: '9876543213' },
      { name: 'Devender Kumar Panchal', mobile: '9876543214' },
      { name: 'Hawa Singh s/o Risal Singh', mobile: '9876543215' },
    ];

    const realisticOwnersRajasthan = [
      { name: 'Ratan Singh Shekhawat', mobile: '9876543301' },
      { name: 'Gopal Lal Meena & Ramji Lal', mobile: '9876543302' },
      { name: 'Smt. Prem Kanwar w/o Shivraj', mobile: '9876543303' },
      { name: 'Kailash Chand Sharma', mobile: '9876543304' },
      { name: 'Hanuman Prasad Choudhary', mobile: '9876543305' },
      { name: 'Bhanwar Lal Saini', mobile: '9876543306' },
      { name: 'Smt. Geeta Devi Gurjar', mobile: '9876543307' },
      { name: 'Mohan Singh Rathore', mobile: '9876543308' },
    ];

    const realisticOwnersGurugram = [
      { name: 'Subhash Chandra Yadav', mobile: '9876543401' },
      { name: 'Narayan Rao & Satpal Rao', mobile: '9876543402' },
      { name: 'Smt. Vidya Devi w/o Hoshiar Singh', mobile: '9876543403' },
      { name: 'Gajender Singh Raghav', mobile: '9876543404' },
      { name: 'Bijender Yadav s/o Tek Ram', mobile: '9876543405' },
      { name: 'Dharambir Khatana', mobile: '9876543406' },
      { name: 'Smt. Murti Devi w/o Rattan Singh', mobile: '9876543407' },
      { name: 'Jagdish Chand Sharma', mobile: '9876543408' },
    ];

    // Helper to generate parcels
    const createParcelData = ({
      parcelId,
      projectId,
      ownerName,
      ownerMobile,
      surveyNumber,
      village,
      tehsil,
      district,
      state,
      area,
      latitude,
      longitude,
      stage,
      zone,
      statusText,
      zoneReason,
      assignedOfficer,
      governmentIssue,
      compensationDetails,
      officialNotices,
    }) => {
      const stageIdx = STAGES.indexOf(stage);

      // Build workflow history up to current stage
      const workflowHistory = [];
      for (let i = 0; i <= stageIdx; i++) {
        const sKey = STAGES[i];
        const isCurrent = i === stageIdx;
        workflowHistory.push({
          stage: sKey,
          stageTitle: STAGE_TITLES[sKey] || sKey,
          status: isCurrent ? (zone === 'RED' ? 'GOVERNMENT_ISSUE' : (zone === 'GREEN' ? 'COMPLETED' : 'IN_PROGRESS')) : 'COMPLETED',
          startedAt: new Date(Date.now() - (stageIdx - i) * 7 * 24 * 60 * 60 * 1000),
          completedAt: isCurrent && zone !== 'GREEN' ? undefined : new Date(Date.now() - Math.max(0, (stageIdx - i - 1)) * 7 * 24 * 60 * 60 * 1000),
          completedBy: assignedOfficer ? 'Rajiv Sharma (SLAO)' : 'Competent Authority Desk',
          officerRole: 'DISTRICT_OFFICER',
          notes: isCurrent && zone === 'RED' ? `Government delay: ${zoneReason}` : `Stage ${i + 1} official procedures verified offline.`,
          issueFlagged: isCurrent && zone === 'RED',
          issueReason: isCurrent && zone === 'RED' ? zoneReason : undefined,
        });
      }

      return {
        parcelId,
        ownerReferenceId: `REF-${district.substring(0, 3).toUpperCase()}-${parcelId.replace(/[^0-9]/g, '') || Math.floor(10000 + Math.random() * 90000)}`,
        projectId,
        ownerName,
        ownerMobile,
        surveyNumber,
        village,
        tehsil: tehsil || 'Rai',
        district,
        state,
        area,
        areaUnit: 'Acres',
        latitude,
        longitude,
        stage,
        zone,
        statusText: statusText || (zone === 'GREEN' ? 'Completed' : (zone === 'RED' ? 'Government Issue' : 'In Progress')),
        zoneReason: zoneReason || 'Standard government acquisition workflow actively progressing',
        assignedOfficer,
        governmentIssue: governmentIssue || { isFlagged: zone === 'RED' },
        compensationDetails: compensationDetails || {
          circleRatePerUnit: 4200000,
          baseLandValue: area * 4200000,
          solatiumAmount: area * 4200000, // 100% Solatium
          additionalAssetsValue: 150000,
          totalCompensationAward: (area * 4200000 * 2) + 150000,
          awardNumber: `AWD/LA/${district.substring(0, 3).toUpperCase()}/2026/${Math.floor(100 + Math.random() * 900)}`,
          awardDate: new Date('2026-02-14'),
          disbursementStatus: zone === 'GREEN' ? 'DISBURSED' : 'SANCTIONED',
        },
        officialNotices: officialNotices || [
          {
            noticeType: 'Section 11(1) Preliminary Notification',
            gazetteRef: `HR-GZT-LA-2025/${district.substring(0, 3).toUpperCase()}-991`,
            issuedDate: new Date('2025-05-12'),
            description: 'Notification of intended land acquisition for expressway corridor published in Haryana State Gazette.',
          },
          {
            noticeType: 'Section 19 Declaration of Acquisition',
            gazetteRef: `HR-GZT-LA-2025/${district.substring(0, 3).toUpperCase()}-1420`,
            issuedDate: new Date('2025-11-20'),
            description: 'Official declaration that designated cadastral parcels are required for public infrastructure utility.',
          },
        ],
        workflowHistory,
      };
    };

    const parcelDocs = [];

    // -------------------------------------------------------------
    // PARCELS FOR SONIPAT CORRIDOR (Assigned to Rajiv Sharma SLAO & Amit Kumar Field)
    // -------------------------------------------------------------
    console.log('Generating parcels for Sonipat Project (DAKE-PKG1-SNP)...');

    // 1. Completed Parcels (🟢 Green)
    parcelDocs.push(
      createParcelData({
        parcelId: 'HR-SNP-00101',
        projectId: projSonipat._id,
        ownerName: 'Ramesh Kumar s/o Dharam Singh',
        ownerMobile: '9876543201',
        surveyNumber: 'Khasra 312/1/1',
        village: 'Murshadpur',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 2.4,
        latitude: 29.0255,
        longitude: 77.0422,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'Land acquisition finalized, award disbursed via PFMS, land possession and revenue mutation entered.',
        assignedOfficer: fieldMurshadpur._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00102',
        projectId: projSonipat._id,
        ownerName: 'Balwan Singh & Satish Kumar',
        ownerMobile: '9876543202',
        surveyNumber: 'Khasra 312/2',
        village: 'Murshadpur',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 3.1,
        latitude: 29.0270,
        longitude: 77.0440,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'Possession taken over by NHAI and title transferred in state revenue registry.',
        assignedOfficer: fieldMurshadpur._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00103',
        projectId: projSonipat._id,
        ownerName: 'Smt. Kamla Devi w/o Late Jagdish',
        ownerMobile: '9876543203',
        surveyNumber: 'Khasra 405/1',
        village: 'Murshadpur',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 1.8,
        latitude: 29.0290,
        longitude: 77.0465,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'Full compensation payout disbursed, physical demarcation complete.',
        assignedOfficer: fieldMurshadpur._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00104',
        projectId: projSonipat._id,
        ownerName: 'Kuldeep Hooda & Jaiveer Hooda',
        ownerMobile: '9876543205',
        surveyNumber: 'Khasra 512/1',
        village: 'Rai',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 4.2,
        latitude: 29.0712,
        longitude: 77.0610,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'Acquisition proceedings and physical land transfer completed.',
        assignedOfficer: slaoSonipat._id,
      })
    );

    // 2. Active In-Progress Parcels (🟡 Yellow)
    parcelDocs.push(
      createParcelData({
        parcelId: 'HR-SNP-00105',
        projectId: projSonipat._id,
        ownerName: 'Rajender Prasad Yadav',
        ownerMobile: '9876543204',
        surveyNumber: 'Khasra 315/4',
        village: 'Murshadpur',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 2.1,
        latitude: 29.0310,
        longitude: 77.0490,
        stage: 'STAGE_4_PHYSICAL_VERIFICATION',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Field Officer conducting offline ground truth verification of crop/structure assets',
        assignedOfficer: fieldMurshadpur._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00106',
        projectId: projSonipat._id,
        ownerName: 'Suresh Kumar Malik',
        ownerMobile: '9876543206',
        surveyNumber: 'Khasra 318/2',
        village: 'Murshadpur',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 1.5,
        latitude: 29.0335,
        longitude: 77.0515,
        stage: 'STAGE_7_COMPENSATION_ASSESSMENT',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Competent Authority assessing circle rates and solatium calculation per RFCTLARR Act',
        assignedOfficer: slaoSonipat._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00107',
        projectId: projSonipat._id,
        ownerName: 'Virender Singh Dahiya',
        ownerMobile: '9876543207',
        surveyNumber: 'Khasra 420/1/2',
        village: 'Ganaur',
        tehsil: 'Ganaur',
        district: 'Sonipat',
        state: 'Haryana',
        area: 3.6,
        latitude: 29.1350,
        longitude: 77.0850,
        stage: 'STAGE_3_LAND_SURVEY',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Survey of India team executing DGPS boundary demarcation',
        assignedOfficer: slaoSonipat._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00108',
        projectId: projSonipat._id,
        ownerName: 'Smt. Santosh Sharma & Rajesh Sharma',
        ownerMobile: '9876543208',
        surveyNumber: 'Khasra 422/3',
        village: 'Ganaur',
        tehsil: 'Ganaur',
        district: 'Sonipat',
        state: 'Haryana',
        area: 2.8,
        latitude: 29.1375,
        longitude: 77.0880,
        stage: 'STAGE_8_AWARD_APPROVAL',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Award determination submitted to District Collector for administrative approval',
        assignedOfficer: slaoSonipat._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00109',
        projectId: projSonipat._id,
        ownerName: 'Mahabir Singh s/o Ram Phal',
        ownerMobile: '9876543209',
        surveyNumber: 'Khasra 325/1',
        village: 'Murshadpur',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 1.9,
        latitude: 29.0360,
        longitude: 77.0540,
        stage: 'STAGE_9_COMPENSATION_PROCESSING',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'PFMS treasury sanction generated, scheduled for direct benefit transfer',
        assignedOfficer: slaoSonipat._id,
      }),
      createParcelData({
        parcelId: 'HR-SNP-00110',
        projectId: projSonipat._id,
        ownerName: 'Om Prakash & Naresh Kumar',
        ownerMobile: '9876543210',
        surveyNumber: 'Khasra 510/2',
        village: 'Kundli',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 5.0,
        latitude: 28.9931,
        longitude: 77.0151,
        stage: 'STAGE_5_ADMINISTRATIVE_PROCESSING',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Revenue records scrutiny underway with SDM Rai office',
        assignedOfficer: slaoSonipat._id,
      })
    );

    // 3. Government-Side Issues / Bottlenecks (🔴 Red - PRD Section 8: NOT citizen fault)
    parcelDocs.push(
      createParcelData({
        parcelId: 'HR-SNP-00111',
        projectId: projSonipat._id,
        ownerName: 'Bhupender Singh s/o Raghubir',
        ownerMobile: '9876543211',
        surveyNumber: 'Khasra 330/4/1',
        village: 'Murshadpur',
        tehsil: 'Rai',
        district: 'Sonipat',
        state: 'Haryana',
        area: 3.4,
        latitude: 29.0390,
        longitude: 77.0570,
        stage: 'STAGE_5_ADMINISTRATIVE_PROCESSING',
        zone: 'RED',
        statusText: 'Government Issue',
        zoneReason: 'Government-Side Delay: Forest clearance NOC pending from State Wildlife Department.',
        assignedOfficer: slaoSonipat._id,
        governmentIssue: {
          isFlagged: true,
          category: 'INTER_DEPARTMENTAL_DELAY',
          description: 'Forest Department clearance pending for protected tree corridor on northern boundary. Case referred to Divisional Forest Officer.',
          flaggedAt: new Date('2026-02-18'),
          flaggedBy: slaoSonipat._id,
          flaggedByName: 'Rajiv Sharma (SLAO Sonipat)',
        },
      }),
      createParcelData({
        parcelId: 'HR-SNP-00112',
        projectId: projSonipat._id,
        ownerName: 'Mukesh Tyagi s/o Ram Kumar',
        ownerMobile: '9876543213',
        surveyNumber: 'Khasra 435/1',
        village: 'Ganaur',
        tehsil: 'Ganaur',
        district: 'Sonipat',
        state: 'Haryana',
        area: 2.7,
        latitude: 29.1410,
        longitude: 77.0910,
        stage: 'STAGE_7_COMPENSATION_ASSESSMENT',
        zone: 'RED',
        statusText: 'Government Issue',
        zoneReason: 'Government-Side Delay: Circle rate re-scrutiny ordered by Divisional Commissioner.',
        assignedOfficer: slaoSonipat._id,
        governmentIssue: {
          isFlagged: true,
          category: 'VALUATION_REASSESSMENT_PENDING',
          description: 'Commercial vs Agricultural categorization discrepancy identified during Collector review. Reassessment committee constituted.',
          flaggedAt: new Date('2026-02-22'),
          flaggedBy: slaoSonipat._id,
          flaggedByName: 'Rajiv Sharma (SLAO Sonipat)',
        },
      })
    );

    // -------------------------------------------------------------
    // PARCELS FOR GURUGRAM CORRIDOR (DME-SEC4-GGN)
    // -------------------------------------------------------------
    console.log('Generating parcels for Gurugram Project (DME-SEC4-GGN)...');

    parcelDocs.push(
      createParcelData({
        parcelId: 'HR-GGN-00201',
        projectId: projGurugram._id,
        ownerName: 'Subhash Chandra Yadav',
        ownerMobile: '9876543401',
        surveyNumber: 'Khasra 112/1',
        village: 'Bhondsi',
        tehsil: 'Sohna',
        district: 'Gurugram',
        state: 'Haryana',
        area: 3.8,
        latitude: 28.2124,
        longitude: 77.0396,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'Acquisition finalized, award disbursed, land handed over to NHAI project director.',
        assignedOfficer: slaoGurugram._id,
      }),
      createParcelData({
        parcelId: 'HR-GGN-00202',
        projectId: projGurugram._id,
        ownerName: 'Narayan Rao & Satpal Rao',
        ownerMobile: '9876543402',
        surveyNumber: 'Khasra 115/3',
        village: 'Bhondsi',
        tehsil: 'Sohna',
        district: 'Gurugram',
        state: 'Haryana',
        area: 2.9,
        latitude: 28.2150,
        longitude: 77.0420,
        stage: 'STAGE_8_AWARD_APPROVAL',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Sec 23/30 Award inquiry completed; approval from District Collector awaiting final signature.',
        assignedOfficer: slaoGurugram._id,
      }),
      createParcelData({
        parcelId: 'HR-GGN-00203',
        projectId: projGurugram._id,
        ownerName: 'Gajender Singh Raghav',
        ownerMobile: '9876543404',
        surveyNumber: 'Khasra 89/1',
        village: 'Ghamroj',
        tehsil: 'Sohna',
        district: 'Gurugram',
        state: 'Haryana',
        area: 4.5,
        latitude: 28.2810,
        longitude: 77.0420,
        stage: 'STAGE_6_ACQUISITION_PROCEEDINGS',
        zone: 'RED',
        statusText: 'Government Issue',
        zoneReason: 'Government-Side Delay: High Court interim stay on administrative notification pending Advocate General hearing.',
        assignedOfficer: slaoGurugram._id,
        governmentIssue: {
          isFlagged: true,
          category: 'HIGH_COURT_STAY_INQUIRY',
          description: 'Notice of Motion pending in Punjab & Haryana High Court regarding alignment geometry. State legal team preparing counter affidavit.',
          flaggedAt: new Date('2026-02-10'),
          flaggedBy: slaoGurugram._id,
          flaggedByName: 'Harish Chandra Rao (CALA Gurugram)',
        },
      }),
      createParcelData({
        parcelId: 'HR-GGN-00204',
        projectId: projGurugram._id,
        ownerName: 'Bijender Yadav s/o Tek Ram',
        ownerMobile: '9876543405',
        surveyNumber: 'Khasra 92/4',
        village: 'Ghamroj',
        tehsil: 'Sohna',
        district: 'Gurugram',
        state: 'Haryana',
        area: 1.7,
        latitude: 28.2840,
        longitude: 77.0450,
        stage: 'STAGE_4_PHYSICAL_VERIFICATION',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Joint survey team auditing bore-well and standing horticultural assets',
        assignedOfficer: slaoGurugram._id,
      })
    );

    // -------------------------------------------------------------
    // PARCELS FOR JAIPUR ORBITAL HIGHWAY (JNOE-RAJ-01)
    // -------------------------------------------------------------
    console.log('Generating parcels for Jaipur Project (JNOE-RAJ-01)...');

    parcelDocs.push(
      createParcelData({
        parcelId: 'RJ-JAI-00301',
        projectId: projJaipur._id,
        ownerName: 'Ratan Singh Shekhawat',
        ownerMobile: '9876543301',
        surveyNumber: 'Khasra 512/9',
        village: 'Bagru',
        tehsil: 'Sanganer',
        district: 'Jaipur',
        state: 'Rajasthan',
        area: 5.4,
        latitude: 26.8142,
        longitude: 75.5410,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'Land acquisition finalized, compensation credited via Rajasthan Treasury, mutation entered in JDA records.',
        assignedOfficer: slaoJaipur._id,
      }),
      createParcelData({
        parcelId: 'RJ-JAI-00302',
        projectId: projJaipur._id,
        ownerName: 'Gopal Lal Meena & Ramji Lal',
        ownerMobile: '9876543302',
        surveyNumber: 'Khasra 516/1',
        village: 'Bagru',
        tehsil: 'Sanganer',
        district: 'Jaipur',
        state: 'Rajasthan',
        area: 3.2,
        latitude: 26.8180,
        longitude: 75.5450,
        stage: 'STAGE_9_COMPENSATION_PROCESSING',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Treasury bill forwarded to Jaipur SLAO bank clearing portal',
        assignedOfficer: slaoJaipur._id,
      }),
      createParcelData({
        parcelId: 'RJ-JAI-00303',
        projectId: projJaipur._id,
        ownerName: 'Kailash Chand Sharma',
        ownerMobile: '9876543304',
        surveyNumber: 'Khasra 218/3',
        village: 'Harmada',
        tehsil: 'Amer',
        district: 'Jaipur',
        state: 'Rajasthan',
        area: 4.1,
        latitude: 27.0250,
        longitude: 75.7410,
        stage: 'STAGE_5_ADMINISTRATIVE_PROCESSING',
        zone: 'RED',
        statusText: 'Government Issue',
        zoneReason: 'Government-Side Delay: Revenue boundary discrepancy between Amer and Sanganer sub-divisions.',
        assignedOfficer: slaoJaipur._id,
        governmentIssue: {
          isFlagged: true,
          category: 'REVENUE_RECORD_DISCREPANCY',
          description: 'Inter-tehsil border demarcation mismatch between Jamabandi and DGPS cadastral layer. Joint demarcation ordered.',
          flaggedAt: new Date('2026-02-15'),
          flaggedBy: slaoJaipur._id,
          flaggedByName: 'Devendra Singh Rathore (ADC Land Acquisition Jaipur)',
        },
      })
    );

    // -------------------------------------------------------------
    // PARCELS FOR VADODARA HIGH-SPEED RAIL (MAHSR-GUJ-02)
    // -------------------------------------------------------------
    console.log('Generating parcels for Vadodara Bullet Train Corridor...');

    parcelDocs.push(
      createParcelData({
        parcelId: 'GJ-VAD-00401',
        projectId: projVadodara._id,
        ownerName: 'Patel Bharatbhai Somabhai',
        ownerMobile: '9876543501',
        surveyNumber: 'Survey 204/P1',
        village: 'Anand Viaduct Beat',
        tehsil: 'Anand',
        district: 'Vadodara',
        state: 'Gujarat',
        area: 2.6,
        latitude: 22.5645,
        longitude: 72.9289,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'High-speed rail pier foundation boundary acquired and possession given to NHSRCL.',
      }),
      createParcelData({
        parcelId: 'GJ-VAD-00402',
        projectId: projVadodara._id,
        ownerName: 'Desai Jagdishchandra K.',
        ownerMobile: '9876543502',
        surveyNumber: 'Survey 209/2',
        village: 'Mahi River Crossing',
        tehsil: 'Savli',
        district: 'Vadodara',
        state: 'Gujarat',
        area: 3.5,
        latitude: 22.4410,
        longitude: 73.0520,
        stage: 'STAGE_7_COMPENSATION_ASSESSMENT',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Multiplication factor assessment per Gujarat Land Acquisition Rules 2016 in progress',
      })
    );

    // -------------------------------------------------------------
    // PARCELS FOR PUNE-BENGALURU INDUSTRIAL EXPRESSWAY (PBIE-MAH-01)
    // -------------------------------------------------------------
    console.log('Generating parcels for Pune Industrial Corridor...');

    parcelDocs.push(
      createParcelData({
        parcelId: 'MH-PUN-00501',
        projectId: projPune._id,
        ownerName: 'Jadhav Dnyaneshwar Bapu',
        ownerMobile: '9876543601',
        surveyNumber: 'Gat No. 142/1',
        village: 'Shirwal',
        tehsil: 'Khandala',
        district: 'Pune',
        state: 'Maharashtra',
        area: 4.8,
        latitude: 18.2810,
        longitude: 73.9820,
        stage: 'STAGE_11_COMPLETED',
        zone: 'GREEN',
        statusText: 'Completed',
        zoneReason: 'Direct purchase award completed per Maharashtra Govt Resolution.',
      }),
      createParcelData({
        parcelId: 'MH-PUN-00502',
        projectId: projPune._id,
        ownerName: 'Chavan Pandurang R.',
        ownerMobile: '9876543602',
        surveyNumber: 'Gat No. 148/3',
        village: 'Shirwal',
        tehsil: 'Khandala',
        district: 'Pune',
        state: 'Maharashtra',
        area: 3.9,
        latitude: 18.2850,
        longitude: 73.9860,
        stage: 'STAGE_6_ACQUISITION_PROCEEDINGS',
        zone: 'YELLOW',
        statusText: 'In Progress',
        zoneReason: 'Public hearing and objections scrutiny under Sec 15 RFCTLARR underway at PMRDA office',
      })
    );

    // Insert all parcels into database
    console.log(`Writing ${parcelDocs.length} master parcels to MongoDB...`);
    const insertedParcels = await Parcel.insertMany(parcelDocs);

    // -------------------------------------------------------------
    // 4. SEED SAMPLE AUDIT TRAIL LOGS (PRD Section 29)
    // -------------------------------------------------------------
    console.log('Seeding Immutable Government Audit Trail...');
    const sampleLogs = [
      {
        actorId: nationalAdmin._id,
        actorName: 'Dr. Vivek R. Mehra, IAS (MoRTH)',
        actorRole: 'SUPER_ADMIN',
        action: 'PROJECT_CREATED',
        entityType: 'Project',
        entityId: projSonipat._id.toString(),
        newValue: { name: projSonipat.name, code: projSonipat.code },
        note: 'National project DAKE-PKG1-SNP registered in central acquisition ledger.',
        timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      {
        actorId: slaoSonipat._id,
        actorName: 'Rajiv Sharma (SLAO Sonipat)',
        actorRole: 'DISTRICT_OFFICER',
        action: 'WORKFLOW_STAGE_ADVANCED',
        entityType: 'Parcel',
        entityId: insertedParcels[0]._id.toString(),
        oldValue: { stage: 'STAGE_10_POSSESSION_ACQUISITION' },
        newValue: { stage: 'STAGE_11_COMPLETED', zone: 'GREEN' },
        note: 'Physical possession recorded and mutation entry finalized in Sonipat Tehsil registry.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        actorId: slaoSonipat._id,
        actorName: 'Rajiv Sharma (SLAO Sonipat)',
        actorRole: 'DISTRICT_OFFICER',
        action: 'GOVERNMENT_ISSUE_FLAGGED',
        entityType: 'Parcel',
        entityId: insertedParcels[10]._id.toString(),
        newValue: { category: 'INTER_DEPARTMENTAL_DELAY', description: 'Wildlife NOC clearance pending.' },
        note: 'Government bottleneck flagged on HR-SNP-00111. Case referred to DFO Sonipat.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        actorId: fieldMurshadpur._id,
        actorName: 'Amit Kumar (Field Officer)',
        actorRole: 'PROJECT_OFFICER',
        action: 'WORKFLOW_STAGE_ADVANCED',
        entityType: 'Parcel',
        entityId: insertedParcels[4]._id.toString(),
        oldValue: { stage: 'STAGE_3_LAND_SURVEY' },
        newValue: { stage: 'STAGE_4_PHYSICAL_VERIFICATION' },
        note: 'Ground audit completed for Khasra 315/4 Murshadpur. Tree inventory verified.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ];

    await AuditLog.insertMany(sampleLogs);

    console.log('================================================================');
    console.log(' BHOOMI-SETU MASTER SEED COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    console.log('Demo Accounts Available:');
    console.log(' 1. National Command:  national.admin@bhoomi.gov.in  | Pass: bhoomi@2026');
    console.log(' 2. State Authority:   state.haryana@bhoomi.gov.in   | Pass: bhoomi@2026');
    console.log(' 3. SLAO Sonipat:      slao.sonipat@bhoomi.gov.in    | Pass: bhoomi@2026 (Sonipat Only)');
    console.log(' 4. Field Murshadpur:  field.murshadpur@bhoomi.gov.in| Pass: bhoomi@2026 (Murshadpur Beat)');
    console.log(' 5. SLAO Gurugram:     slao.gurugram@bhoomi.gov.in   | Pass: bhoomi@2026 (Gurugram Only)');
    console.log(' 6. SLAO Jaipur:       slao.jaipur@bhoomi.gov.in     | Pass: bhoomi@2026 (Jaipur Only)');
    console.log('================================================================');

    process.exit(0);
  } catch (error) {
    console.error('Master Seed Error:', error);
    process.exit(1);
  }
};

seedData();

const Parcel = require('../models/Parcel');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Document = require('../models/Document');

/**
 * AI Decision Support & Bottleneck Advisory Engine
 * PRD Section 24: Deterministic risk and bottleneck scoring engine
 */
const generateAIAdvisory = async () => {
  const [projects, parcels, openIssues, pendingDocs] = await Promise.all([
    Project.find().lean(),
    Parcel.find().populate('projectId').lean(),
    Issue.find({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } }).populate('parcelId').populate('projectId').lean(),
    Document.find({ status: { $in: ['UPLOADED', 'UNDER_REVIEW'] } }).populate('parcelId').lean(),
  ]);

  const totalParcels = parcels.length;
  const redParcels = parcels.filter((p) => p.zone === 'RED');
  const orangeParcels = parcels.filter((p) => p.zone === 'ORANGE');
  const greenParcels = parcels.filter((p) => p.zone === 'GREEN');
  const yellowParcels = parcels.filter((p) => p.zone === 'YELLOW');

  // Overall National Acquisition Velocity Risk Index (0 - 100)
  const nationalRiskScore = totalParcels > 0
    ? Math.min(100, Math.round(((redParcels.length * 3 + orangeParcels.length * 1.5) / totalParcels) * 100))
    : 0;

  // Project-level Risk Heatmap
  const projectRisks = projects.map((proj) => {
    const projParcels = parcels.filter((p) => (p.projectId?._id || p.projectId)?.toString() === proj._id.toString());
    const pTotal = projParcels.length;
    const pRed = projParcels.filter((p) => p.zone === 'RED').length;
    const pOrange = projParcels.filter((p) => p.zone === 'ORANGE').length;
    const pGreen = projParcels.filter((p) => p.zone === 'GREEN').length;

    const score = pTotal > 0
      ? Math.min(100, Math.round(((pRed * 4 + pOrange * 2) / pTotal) * 100))
      : 0;

    let riskLevel = 'LOW';
    if (score >= 60) riskLevel = 'CRITICAL';
    else if (score >= 35) riskLevel = 'MODERATE';

    return {
      projectId: proj._id,
      projectName: proj.name,
      projectCode: proj.code,
      totalParcels: pTotal,
      greenCount: pGreen,
      orangeCount: pOrange,
      redCount: pRed,
      riskScore: score,
      riskLevel,
    };
  });

  // Actionable AI Bottleneck Insights
  const recommendations = [];

  // Insight 1: Red Zone Critical Disputes
  if (redParcels.length > 0) {
    redParcels.forEach((rp) => {
      recommendations.push({
        id: `rec-red-${rp._id}`,
        severity: 'HIGH',
        category: 'Legal / Cadastral Dispute',
        title: `Critical Dispute on Parcel ${rp.parcelId} (${rp.surveyNumber})`,
        affectedParcel: rp.parcelId,
        owner: rp.ownerName,
        district: rp.district,
        project: rp.projectId?.name || 'Corridor',
        description: rp.zoneReason || 'Title ownership or boundary overlap conflict recorded.',
        action: 'Convene joint demarcation tribunal with Tehsildar & SLAO to reconcile cadastral boundaries.',
        impact: `Releases ${rp.area} ${rp.areaUnit} from Red Zone to accelerate project acquisition.`,
      });
    });
  }

  // Insight 2: Orange Zone Rate Objections
  const objections = openIssues.filter((i) => i.type === 'COMPENSATION_OBJECTION');
  if (objections.length > 0) {
    objections.forEach((obj) => {
      recommendations.push({
        id: `rec-obj-${obj._id}`,
        severity: 'MEDIUM',
        category: 'Compensation Rate Discrepancy',
        title: `Compensation Objection on ${obj.parcelId?.parcelId || 'Parcel'}`,
        affectedParcel: obj.parcelId?.parcelId,
        owner: obj.parcelId?.ownerName,
        district: obj.projectId?.district,
        project: obj.projectId?.name,
        description: obj.description,
        action: 'Review commercial circle rate multiplying factor under Section 26 of RFCTLARR Act.',
        impact: 'Resolves objection and unlocks landowner bank details submission.',
      });
    });
  }

  // Insight 3: Document Verification Backlog
  if (pendingDocs.length > 0) {
    recommendations.push({
      id: 'rec-docs-backlog',
      severity: 'LOW',
      category: 'Verification Backlog',
      title: `${pendingDocs.length} Deeds & Records Awaiting SLAO Verification`,
      description: 'Submitted title deeds and Aadhaar verification proofs are pending officer sign-off.',
      action: 'Execute batch document verification to immediately advance cases to Compensation Review.',
      impact: 'Advances landowner portal journey to statutory offer presentation.',
    });
  }

  return {
    timestamp: new Date(),
    nationalRiskScore,
    riskLevel: nationalRiskScore >= 50 ? 'ELEVATED' : nationalRiskScore >= 25 ? 'MODERATE' : 'OPTIMAL',
    zoneDistribution: {
      GREEN: greenParcels.length,
      YELLOW: yellowParcels.length,
      ORANGE: orangeParcels.length,
      RED: redParcels.length,
    },
    projectRisks,
    recommendations,
  };
};

/**
 * Simulated AI OCR Document Inspector
 * PRD Section 36 (P2 Feature): Automated cadastral record extractor
 */
const analyzeDocumentWithOCR = (docType, originalFileName) => {
  const isIdentity = docType === 'IDENTITY_PROOF';
  const isDeed = docType === 'OWNERSHIP_DEED';

  return {
    fileName: originalFileName,
    documentType: docType,
    ocrEngine: 'BHOOMI-SETU Cadastral AI Vision v2.4',
    extractedFields: {
      documentClassification: isIdentity ? 'Government Identity (UIDAI / Election Commission)' : 'Registered Conveyance / Revenue Khatoni',
      detectedKhasraNumber: isDeed ? 'Khasra 412/1 (Verified in Jamabandi 2024-25)' : 'N/A',
      detectedOwnerName: 'Subhash Chandra Yadav',
      detectedFatherName: 'Late Sh. Ram Prasad Yadav',
      detectedArea: isDeed ? '2.40 Acres (11,616 Sq. Yards)' : 'N/A',
      detectedSubRegistrarSeal: 'SRO Gurugram Tehsil (Registered & Stamped)',
    },
    matchConfidenceScore: isDeed ? 97.8 : 99.2,
    cadastralCrossCheck: 'PASSED — Records match District Revenue Server',
    status: 'AUTO_RECOMMENDED_FOR_APPROVAL',
  };
};

module.exports = {
  generateAIAdvisory,
  analyzeDocumentWithOCR,
};

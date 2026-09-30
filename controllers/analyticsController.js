const Parcel = require('../models/Parcel');
const Project = require('../models/Project');
const { generateAIAdvisory, analyzeDocumentWithOCR } = require('../services/aiAdvisorService');

// @desc    Get executive analytics and AI bottleneck advisory summary
// @route   GET /api/analytics/executive-summary
// @access  Private (Officer / Admin)
const getExecutiveSummary = async (req, res, next) => {
  try {
    const [aiAdvisory, parcels, projects] = await Promise.all([
      generateAIAdvisory(),
      Parcel.find().populate('projectId').lean(),
      Project.find().lean(),
    ]);

    // 1. Stage Conversion Funnel Metrics
    const stageFunnel = [
      {
        stageName: '1. Citizen Onboarding & Review',
        count: parcels.filter((p) => ['INVITED', 'PARCEL_DETAILS_REVIEW'].includes(p.stage)).length,
        percentage: 0,
      },
      {
        stageName: '2. Title Deeds & Doc Verification',
        count: parcels.filter((p) => ['DOCUMENT_UPLOAD', 'DOCUMENT_VERIFICATION'].includes(p.stage)).length,
        percentage: 0,
      },
      {
        stageName: '3. Compensation Offer & Objections',
        count: parcels.filter((p) => ['COMPENSATION_REVIEW', 'COMPENSATION_OBJECTION'].includes(p.stage)).length,
        percentage: 0,
      },
      {
        stageName: '4. Bank Account Verification',
        count: parcels.filter((p) => ['BANK_DETAILS', 'BANK_VERIFICATION'].includes(p.stage)).length,
        percentage: 0,
      },
      {
        stageName: '5. PFMS Disbursement / Completed',
        count: parcels.filter((p) => ['PAYMENT_PROCESSING', 'COMPLETED'].includes(p.stage)).length,
        percentage: 0,
      },
    ];

    const total = parcels.length || 1;
    stageFunnel.forEach((step) => {
      step.percentage = Math.round((step.count / total) * 100);
    });

    // 2. District Leaderboard / Bottleneck Analysis
    const districtMap = {};
    parcels.forEach((p) => {
      const dist = p.district || 'Unassigned';
      if (!districtMap[dist]) {
        districtMap[dist] = { district: dist, total: 0, green: 0, yellow: 0, orange: 0, red: 0, acquiredArea: 0 };
      }
      districtMap[dist].total++;
      if (p.zone === 'GREEN') {
        districtMap[dist].green++;
        districtMap[dist].acquiredArea += p.area || 0;
      } else if (p.zone === 'YELLOW') districtMap[dist].yellow++;
      else if (p.zone === 'ORANGE') districtMap[dist].orange++;
      else if (p.zone === 'RED') districtMap[dist].red++;
    });

    const districtLeaderboard = Object.values(districtMap).map((d) => ({
      ...d,
      acquiredArea: Number(d.acquiredArea.toFixed(2)),
      clearanceRate: d.total > 0 ? Math.round((d.green / d.total) * 100) : 0,
    }));

    res.status(200).json({
      success: true,
      aiAdvisory,
      stageFunnel,
      districtLeaderboard,
      totalCorridors: projects.length,
      totalParcels: parcels.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export national parcel registry as downloadable CSV
// @route   GET /api/analytics/export-csv
// @access  Private (Officer / Admin)
const exportCSVReport = async (req, res, next) => {
  try {
    const parcels = await Parcel.find().populate('projectId').sort({ createdAt: -1 }).lean();

    const headers = [
      'Parcel ID',
      'Corridor Code',
      'Corridor Name',
      'Owner Name',
      'Mobile Number',
      'Survey/Khasra',
      'Village',
      'District',
      'State',
      'Area (Acres)',
      'Current Stage',
      'Calculated Zone',
      'Zone Condition Reason',
      'Compensation Offer (INR)',
      'Compensation Status',
      'Bank Status',
      'Payment Status',
      'PFMS UTR Number',
    ];

    const rows = parcels.map((p) => [
      `"${p.parcelId || ''}"`,
      `"${p.projectId?.code || ''}"`,
      `"${(p.projectId?.name || '').replace(/"/g, '""')}"`,
      `"${(p.ownerName || '').replace(/"/g, '""')}"`,
      `"${p.ownerMobile || ''}"`,
      `"${p.surveyNumber || ''}"`,
      `"${p.village || ''}"`,
      `"${p.district || ''}"`,
      `"${p.state || ''}"`,
      p.area || 0,
      `"${p.stage || ''}"`,
      `"${p.zone || ''}"`,
      `"${(p.zoneReason || '').replace(/"/g, '""')}"`,
      p.compensationOffer?.totalOffer || 0,
      `"${p.compensationOffer?.status || ''}"`,
      `"${p.bankDetails?.status || ''}"`,
      `"${p.payment?.status || ''}"`,
      `"${p.payment?.transactionId || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=bhoomi_setu_national_registry_${Date.now()}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze uploaded document with AI OCR Inspector
// @route   POST /api/analytics/ocr-inspect
// @access  Private
const analyzeDocumentOCR = async (req, res, next) => {
  try {
    const { documentType, fileName } = req.body;
    const result = analyzeDocumentWithOCR(documentType || 'OWNERSHIP_DEED', fileName || 'Document.pdf');

    res.status(200).json({
      success: true,
      ocrAnalysis: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExecutiveSummary,
  exportCSVReport,
  analyzeDocumentOCR,
};
